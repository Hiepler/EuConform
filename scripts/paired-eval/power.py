#!/usr/bin/env python3
"""Paired decision eval: power simulation (AP7) for the pre-registered H1, H3 and H3-P tests.

    python3 -I scripts/paired-eval/power.py --items <pilot items.jsonl> --scores <dir> [<dir>...] \
        --out <dir> [--seed 20261115] [--sims 2000] [--boot 2000] [--full]

Without `--full` the run uses a small test mode (200 simulations, 400 bootstrap draws); the
pre-registered size is 2000 x 2000 and needs `--full`.

Method (messplan v2.1, AP7)
- Case-bootstrap from the pilot (stratified by family x stratum, so every simulated sample has
  the pilot's cell proportions), then rewrite outcomes of random cases so the simulated model Y
  differs from X by exactly +delta in Acc and -delta in GA. The rate of discordant units
  between X and Y is taken from the two pilot models.
- The test per simulation is the H1 test of analyze.py (`iut_boot`, same stratified bootstrap
  construction). One pair carries the effect, the other k-1 pairs are null, so the effect is
  rejected under Holm when p <= alpha / k (conservative: ignores that a null pair could reject
  first). The bootstrap weights are drawn once per sample size and shared by all simulations of
  that size; the simulated data are independent.
- H3 / H3-P: one axis carries the excess, three are null, Holm over the 4 axes, the same tests
  as analyze.py (`mcnemar_one_sided`, `boot_means` on d = flip - mean(para)).
"""

from __future__ import annotations

import argparse
import importlib.util
import os
import sys

import numpy as np
from scipy import stats
from scipy.stats import multivariate_normal

_HERE = os.path.dirname(os.path.abspath(__file__))


def _load_analyze():
    spec = importlib.util.spec_from_file_location("paired_eval_analyze", os.path.join(_HERE, "analyze.py"))
    mod = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = mod
    spec.loader.exec_module(mod)
    return mod


A = _load_analyze()

NS = (192, 384, 576)
DELTAS = (4, 6, 8, 10, 12, 15)  # percentage points
EXCESS = (3, 5, 8)  # percentage points
KS = (1, 5, 15)
ALPHA = A.ALPHA
TARGET_POWER = 0.80
FULL_SIMS, FULL_BOOT = 2000, 2000
QUICK_SIMS, QUICK_BOOT = 200, 400
FALLBACK_DISC = None  # computed from the pilot; with one pilot model: independence

PAIRS_K5 = [
    "Qwen2.5-0.5B vs Qwen2.5-1.5B (size)",
    "Qwen2.5-1.5B vs Qwen3-1.7B (generation)",
    "Qwen3-1.7B vs SmolLM2-1.7B (same size, open data)",
    "Llama-3.2-1B vs Gemma (different families, ~1B)",
    "Qwen2.5-0.5B vs Llama-3.2-1B (smallest models)",
]


# --------------------------------------------------------------------------- pilot


def load_pilot(items_path, score_paths):
    """Pilot arrays per model on the cases that every pilot model has completely."""
    inst = A.build_instrument(A.load_items(items_path))
    scores = A.load_scores(score_paths)
    models = [m for m in A.build_models(inst, scores) if m.complete.any() and not m.is_baseline]
    if not models:
        raise SystemExit("no usable pilot model")
    common = np.ones(inst.n, dtype=bool)
    for m in models:
        common &= m.complete
    if not common.all():
        inst, models = A.restrict(inst, models, common)
    out = []
    for m in models:
        pc = A.per_case(m, inst)
        out.append(
            {
                "name": m.key,
                "base_ok": pc["base_ok"].astype(bool),
                "dec_ok": pc["dec_ok"].astype(bool),
                "irr_all_same": pc["flip_irr"].sum(axis=1) == 0,
                "flip_irr": pc["flip_irr"].astype(bool),
                "flip_plc": pc["flip_plc"].astype(bool),
                "flip_para": pc["flip_para"].astype(bool),
            }
        )
    return {"cell": inst.cell, "models": out, "n_cases": inst.n}


# --------------------------------------------------------------------------- helpers


def cell_layout(cell, n):
    """Positions of a sample of size n: per pilot cell a share proportional to its size."""
    cells = np.unique(cell)
    sizes = np.array([np.sum(cell == c) for c in cells], dtype=float)
    raw = n * sizes / sizes.sum()
    cnt = np.floor(raw).astype(int)
    for i in np.argsort(-(raw - cnt), kind="stable")[: n - cnt.sum()]:
        cnt[i] += 1
    pos_cell = np.repeat(np.arange(len(cells)), cnt)
    pools = [np.flatnonzero(cell == c) for c in cells]
    return pos_cell, pools


def sample_cases(pos_cell, pools, S, rng):
    """(N, S) pilot case indices, drawn within each position's cell."""
    N = len(pos_cell)
    out = np.empty((N, S), dtype=np.int64)
    for c, pool in enumerate(pools):
        pos = np.flatnonzero(pos_cell == c)
        if len(pos):
            out[pos] = pool[rng.integers(0, len(pool), size=(len(pos), S))]
    return out


def pick(elig, counts, rng):
    """Boolean (R, S): per column `counts[s]` random eligible entries (fewer if not enough)."""
    R, S = elig.shape
    keys = np.where(elig, rng.random((R, S)), 2.0)
    order = np.argsort(keys, axis=0)
    ranks = np.empty_like(order)
    np.put_along_axis(ranks, order, np.broadcast_to(np.arange(R)[:, None], (R, S)), axis=0)
    return elig & (ranks < np.asarray(counts)[None, :])


def disc_rate(models):
    """Share of discordant units (base/decisive correctness) between the two pilot models."""
    if len(models) >= 2:
        a, b = models[0], models[1]
        xa = np.concatenate([a["base_ok"], a["dec_ok"]])
        xb = np.concatenate([b["base_ok"], b["dec_ok"]])
        return float(np.mean(xa != xb))
    r = float(np.mean(np.concatenate([models[0]["base_ok"], models[0]["dec_ok"]])))
    return 2 * r * (1 - r)


# --------------------------------------------------------------------------- H1


def simulate_h1(pilot, N, delta, S, B, rng, models=None):
    """p_iut per simulation. delta in proportion points (0.08 = 8 pp).

    Returns dict with p (S,), mean d_acc, mean d_ga per simulation, shortfall (mean achieved
    - target of d_acc) and the per-case differences' SDs for the normal approximation.
    """
    models = models or pilot["models"]
    pos_cell, pools = cell_layout(pilot["cell"], N)
    D = disc_rate(pilot["models"])
    cells_for_w = np.array(pos_cell)
    _, W = A.boot_weights(cells_for_w, B, rng)
    p_all, dacc_all, dga_all = [], [], []
    short_all = []
    S_x = S // len(models) + (S % len(models) > 0)
    for mi, mdl in enumerate(models):
        s_here = min(S_x, S - mi * S_x) if mi < len(models) else 0
        if s_here <= 0:
            continue
        ci = sample_cases(pos_cell, pools, s_here, rng)
        bc, dc, irr = mdl["base_ok"][ci], mdl["dec_ok"][ci], mdl["irr_all_same"][ci]
        units = np.concatenate([bc, dc], axis=0)  # (2N, s)
        n_net = int(round(2 * N * delta))
        disc = max(D * 2 * N, n_net)
        n_up = int(round((disc + n_net) / 2))
        n_down = int(round((disc - n_net) / 2))
        up = pick(~units, np.full(s_here, n_up), rng)
        down = pick(units, np.full(s_here, n_down), rng)
        units_y = (units | up) & ~down
        bcy, dcy = units_y[:N], units_y[N:]
        acc_x = (bc.astype(float) + dc) / 2
        acc_y = (bcy.astype(float) + dcy) / 2
        ga_x = bc & dc & irr
        irr_y = irr.copy()
        ga_y = bcy & dcy & irr_y
        target = -int(round(N * delta))
        t = target - (ga_y.sum(axis=0) - ga_x.sum(axis=0))  # needed change in GA count
        brk = pick(ga_y, np.maximum(-t, 0), rng)
        irr_y = irr_y & ~brk
        fix = pick(bcy & dcy & ~irr_y, np.maximum(t, 0), rng)
        irr_y = irr_y | fix
        ga_y = bcy & dcy & irr_y
        d_acc = acc_y - acc_x
        d_ga = ga_y.astype(float) - ga_x
        _, _, p, _, _ = A.iut_boot(d_acc, d_ga, W)
        p_all.append(p)
        dacc_all.append(d_acc.mean(axis=0))
        dga_all.append(d_ga.mean(axis=0))
        short_all.append(d_acc.mean(axis=0) - delta)
    return {
        "p": np.concatenate(p_all),
        "d_acc": np.concatenate(dacc_all),
        "d_ga": np.concatenate(dga_all),
        "shortfall": float(np.mean(np.concatenate(short_all))),
    }


def power_at(p, k):
    return float(np.mean(p <= ALPHA / k))


def normal_power(delta_acc, delta_ga, se_acc, se_ga, rho, k=1, alpha=ALPHA):
    """Normal approximation of the IUT power (both legs one-sided at alpha / k).

    Leg 1: acc difference > 0. Leg 2: ga difference < 0. rho = corr(acc diff, -ga diff).
    """
    z = stats.norm.ppf(1 - alpha / k)
    u1 = delta_acc / se_acc - z
    u2 = -delta_ga / se_ga - z
    return float(multivariate_normal(mean=[0, 0], cov=[[1, rho], [rho, 1]]).cdf([u1, u2]))


# --------------------------------------------------------------------------- H3 and H3-P


def unit_pool(pilot):
    """Pooled (model, case, axis) units with cell label: irr flip, placebo flip, para mean."""
    irr, plc, para, cell = [], [], [], []
    for m in pilot["models"]:
        n = len(pilot["cell"])
        for a in range(4):
            irr.append(m["flip_irr"][:, a])
            plc.append(m["flip_plc"][:, a])
            para.append(m["flip_para"].mean(axis=1))
            cell.append(pilot["cell"])
    return np.concatenate(irr), np.concatenate(plc), np.concatenate(para), np.concatenate(cell)


def _rewrite_to_rate(x, target_count, rng):
    """Add or remove flips so every column has exactly target_count (or as many as possible)."""
    cur = x.sum(axis=0)
    add = pick(~x, np.maximum(target_count - cur, 0), rng)
    rem = pick(x, np.maximum(cur - target_count, 0), rng)
    return (x | add) & ~rem


def simulate_axis_tests(pilot, N, excess, S, B, rng, chunk=250):
    """Power of H3 (exact McNemar) and H3-P (bootstrap) with Holm over 4 axes (1 alt, 3 null)."""
    irr, plc, para, cell = unit_pool(pilot)
    r_plc, r_para = float(plc.mean()), float(para.mean())
    pos_cell, pools = cell_layout(cell, N)
    _, W = A.boot_weights(np.array(pos_cell), B, rng)
    rej3 = rej3p = 0
    done = 0
    while done < S:
        s = min(chunk, S - done)
        cols = s * 4
        ci = sample_cases(pos_cell, pools, cols, rng)  # (N, cols) unit indices
        fi, fp, fq = irr[ci], plc[ci], para[ci]
        alt = np.zeros(cols, dtype=bool)
        alt[0::4] = True
        t3 = np.where(alt, round(N * (r_plc + excess)), round(N * r_plc)).astype(int)
        t3p = np.where(alt, round(N * (r_para + excess)), round(N * r_para)).astype(int)
        fi3 = _rewrite_to_rate(fi, t3, rng)
        b = (fi3 & ~fp).sum(axis=0)
        c = (~fi3 & fp).sum(axis=0)
        p3 = A.mcnemar_one_sided(b, c).reshape(s, 4)
        rej3 += int(np.sum(A.holm_matrix(p3)[:, 0] <= ALPHA))
        fi3p = _rewrite_to_rate(fi, t3p, rng)
        d = fi3p.astype(float) - fq
        p3p = A.p_le0(A.boot_means(W, d)).reshape(s, 4)
        rej3p += int(np.sum(A.holm_matrix(p3p)[:, 0] <= ALPHA))
        done += s
    return rej3 / S, rej3p / S


# --------------------------------------------------------------------------- driver


def delta80(table, N, k):
    """Smallest delta (pp) with power >= 0.8 at (N, k), or None."""
    for d in DELTAS:
        if table[(N, d, k)] >= TARGET_POWER:
            return d
    return None


def decide(table):
    for N in NS:
        d = delta80(table, N, 15)
        if d is not None and d <= 10:
            return {"N": N, "k": 15, "delta80": d, "rule": "1"}
    for N in NS:
        d = delta80(table, N, 5)
        if d is not None and d <= 10:
            return {"N": N, "k": 5, "delta80": d, "rule": "2"}
    return {"N": 576, "k": 5, "delta80": delta80(table, 576, 5), "rule": "3"}


def run_power(items, scores, out_dir, seed, sims, boot, ns=NS, deltas=DELTAS, excess=EXCESS):
    pilot = load_pilot(items, scores)
    rng = np.random.default_rng([seed, 7])
    rows = []
    table = {}
    notes = []
    for N in ns:
        for d in deltas:
            sim = simulate_h1(pilot, N, d / 100, sims, boot, rng)
            if abs(sim["shortfall"]) > 0.005:
                notes.append(f"N={N}, δ={d} pp: achieved ΔAcc deviates from the target by {100 * sim['shortfall']:+.1f} pp on average (too few pilot errors to rewrite).")
            for k in KS:
                pw = power_at(sim["p"], k)
                table[(N, d, k)] = pw
                rows.append({"test": "h1", "N": N, "k": k, "effect_pp": d, "power": pw, "sims": sims, "boot": boot})
        for e in excess:
            p3, p3p = simulate_axis_tests(pilot, N, e / 100, sims, boot, rng)
            rows.append({"test": "h3", "N": N, "k": 4, "effect_pp": e, "power": p3, "sims": sims, "boot": boot})
            rows.append({"test": "h3p", "N": N, "k": 4, "effect_pp": e, "power": p3p, "sims": sims, "boot": boot})
    os.makedirs(out_dir, exist_ok=True)
    lines = ["test,N,k,effect_pp,power,sims,boot"]
    for r in rows:
        lines.append(f"{r['test']},{r['N']},{r['k']},{r['effect_pp']},{A.fmt(float(r['power']))},{r['sims']},{r['boot']}")
    with open(os.path.join(out_dir, "power.csv"), "w", encoding="utf-8", newline="") as fh:
        fh.write("\n".join(lines) + "\n")
    dec = decide(table) if set(ns) == set(NS) and set(deltas) == set(DELTAS) else None
    with open(os.path.join(out_dir, "power.md"), "w", encoding="utf-8") as fh:
        fh.write(render_md(table, rows, dec, sims, boot, pilot, notes, ns, deltas, excess))
    return {"table": table, "rows": rows, "decision": dec, "pilot": pilot, "notes": notes}


def render_md(table, rows, dec, sims, boot, pilot, notes, ns, deltas, excess):
    L = []
    w = L.append
    w("# Power simulation (AP7)")
    w("")
    w(f"Pilot: {len(pilot['models'])} model(s) ({', '.join(m['name'] for m in pilot['models'])}), {pilot['n_cases']} base cases.")
    w(f"Simulations: {sims}, bootstrap draws per simulation: {boot}."
      + (" **Test mode**: fewer than the pre-registered 2,000 × 2,000." if (sims, boot) != (FULL_SIMS, FULL_BOOT) else " Deviation from the 10,000 draws of the main run: 2,000 draws per simulation (compute time)."))
    w("The H1 test is `iut_boot` from `analyze.py`. One pair carries the effect (ΔAcc = +δ, ΔGA = −δ), the other k−1 pairs are null; reject at p ≤ α/k (conservative Holm approximation).")
    w("")
    w("## H1: power by N, δ and k")
    for k in KS:
        w("")
        w(f"k = {k}")
        w("")
        w("| N | " + " | ".join(f"δ = {d} pp" for d in deltas) + " | δ₈₀ |")
        w("|---|" + "---|" * (len(deltas) + 1))
        for N in ns:
            d80 = None
            for d in deltas:
                if table[(N, d, k)] >= TARGET_POWER:
                    d80 = d
                    break
            w(f"| {N} | " + " | ".join(f"{100 * table[(N, d, k)]:.1f} %" for d in deltas) + f" | {'> ' + str(deltas[-1]) + ' pp' if d80 is None else str(d80) + ' pp'} |")
    w("")
    w("## H3 and H3-P: power (Holm over 4 axes, one axis with excess)")
    w("")
    w("| Test | N | " + " | ".join(f"Excess {e} pp" for e in excess) + " |")
    w("|---|---|" + "---|" * len(excess))
    for test, label in (("h3", "H3"), ("h3p", "H3-P (not part of the decision rule)")):
        for N in ns:
            vals = {r["effect_pp"]: r["power"] for r in rows if r["test"] == test and r["N"] == N}
            w(f"| {label} | {N} | " + " | ".join(f"{100 * vals[e]:.1f} %" for e in excess) + " |")
    w("")
    w("## Decision")
    w("")
    if dec is None:
        w("Decision: not computed (the N or δ grid differs from the pre-specified grid).")
    else:
        if dec["rule"] == "1":
            w(f"Decision: N = {dec['N']}, k = 15 (all 15 pairs), δ₈₀ = {dec['delta80']} pp (rule 1: smallest N with δ₈₀ ≤ 10 pp at k = 15).")
        elif dec["rule"] == "2":
            w(f"Decision: N = {dec['N']}, k = 5 (the 5 pre-specified pairs), δ₈₀ = {dec['delta80']} pp (rule 2: no N reaches δ₈₀ ≤ 10 pp at k = 15).")
            for p in PAIRS_K5:
                w(f"- {p}")
        else:
            d = dec["delta80"]
            w(f"Decision: N = 576, k = 5, δ₈₀ = {'> ' + str(DELTAS[-1]) + ' pp' if d is None else str(d) + ' pp'} (rule 3: neither k = 15 nor k = 5 reaches δ₈₀ ≤ 10 pp; δ₈₀ is stated as a limit in the pre-registration).")
    w("")
    w("The runtime abort rule from §7 of the measurement plan takes precedence: above 10 s per run, N falls back to 192 and the power is reported again.")
    if notes:
        w("")
        w("## Notes")
        for n in notes:
            w(f"- {n}")
    w("")
    w("## Assumptions")
    w("- The pilot supplies the error structure (case bootstrap); the rate of discordant units between X and Y is the one between the two pilot models (with one model: 2·r·(1−r) from its hit rate).")
    w("- After rewriting the Acc units, GA is set to −δ by breaking or healing the irr invariance of individual cases.")
    w("- H3 and H3-P: the excess is added on top of the pooled pilot placebo or paraphrase rate (adding or removing flips), pooled over models and axes.")
    return "\n".join(L) + "\n"


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--items", required=True)
    ap.add_argument("--scores", required=True, nargs="+")
    ap.add_argument("--out", required=True)
    ap.add_argument("--seed", type=int, default=A.DEFAULT_SEED)
    ap.add_argument("--full", action="store_true", help="pre-registered size: 2000 simulations x 2000 bootstrap draws")
    ap.add_argument("--sims", type=int)
    ap.add_argument("--boot", type=int)
    a = ap.parse_args(argv)
    sims = a.sims or (FULL_SIMS if a.full else QUICK_SIMS)
    boot = a.boot or (FULL_BOOT if a.full else QUICK_BOOT)
    res = run_power(a.items, a.scores, a.out, a.seed, sims, boot)
    print(f"wrote {a.out}/power.csv and power.md; decision: {res['decision']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
