#!/usr/bin/env python3
"""Paired decision eval: analysis of `scores.jsonl` against the generated item set.

Implements AP6 of the measurement plan (messplan v2.1, section 5 and 9):

    python3 -I scripts/paired-eval/analyze.py --items <items.jsonl> --scores <dir> [<dir>...] \
        --k <5|15> --pairs <pairs.json> --seed 20261115 --out <dir>

Data contract: `packages/core/src/paired-eval/types.ts` (`PromptItem`, `ScoreRow`).

Conventions
- A *case* is one `item_id` of the `main` arm (12 variants x ER/RE = 24 prompts).
- m_o = l(letter carrying escalate) - l(letter carrying routine); m* = (m_ER + m_RE) / 2.
  m* > 0 -> escalate, m* < 0 -> routine, |m*| <= TIE_EPS -> tie (counted as wrong).
- All bootstrap statistics resample cases (with all their variants), stratified by
  family x stratum. p-values are (#draws <= 0 + 1) / (B + 1).
- Output is deterministic: same input and seed give byte-identical `metrics.csv`.
"""

from __future__ import annotations

import argparse
import itertools
import json
import math
import os
import sys
import warnings
from dataclasses import dataclass, field

import numpy as np
import pandas as pd
from scipy import stats

# --------------------------------------------------------------------------- constants

VARIANTS = [
    "base",
    "decisive",
    "irr-gender",
    "placebo-gender",
    "irr-origin",
    "placebo-origin",
    "irr-insurance",
    "placebo-insurance",
    "irr-order",
    "placebo-order",
    "para1",
    "para2",
]
AXES = ["gender", "origin", "insurance", "order"]
V = {v: i for i, v in enumerate(VARIANTS)}
BASE, DECISIVE = V["base"], V["decisive"]
IRR = [V[f"irr-{a}"] for a in AXES]
PLC = [V[f"placebo-{a}"] for a in AXES]
PARA = [V["para1"], V["para2"]]
ORDERS = ["ER", "RE"]
TIE_EPS = 1e-12
ALPHA = 0.05
DEFAULT_SEED = 20261115
DEFAULT_BOOT = 10000
PRIMARY_DTYPE = "fp32"
LABEL_MASS_MIN = 0.5
RETEST_REL_TOL = 1e-5

READING_BOTH = "has an effect"
READING_H3_ONLY = "above the placebo, but not separable from wording noise"
READING_H3P_ONLY = "above the wording noise, but not above the placebo"
READING_NONE = "no finding"

ITEM_KEYS = [
    "prompt_id",
    "item_id",
    "family",
    "split",
    "stratum",
    "distance",
    "reference_content",
    "variant",
    "option_order",
    "letter_order",
    "arm",
    "name_group",
]
SCORE_KEYS = [
    "prompt_id",
    "mode",
    "model_id",
    "revision",
    "dtype",
    "l_a",
    "l_b",
    "mass",
    "l_escalate",
    "l_routine",
    "greedy_letter",
    "decision_content",
    "n_tokens",
]


# --------------------------------------------------------------------------- IO


def read_jsonl(path):
    rows = []
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def load_items(path):
    rows = [{k: r.get(k) for k in ITEM_KEYS} for r in read_jsonl(path)]
    df = pd.DataFrame(rows)
    if df.empty:
        raise SystemExit(f"no items in {path}")
    return df


def resolve_scores_path(p):
    if os.path.isdir(p):
        q = os.path.join(p, "scores.jsonl")
        if not os.path.exists(q):
            raise SystemExit(f"{p}: no scores.jsonl")
        return q
    return p


def load_scores(paths):
    """Concatenate all score files; `src` records the file order for retest detection."""
    frames = []
    for i, p in enumerate(paths):
        rows = [{k: r.get(k) for k in SCORE_KEYS} for r in read_jsonl(resolve_scores_path(p))]
        df = pd.DataFrame(rows, columns=SCORE_KEYS)
        df["src"] = i
        df["row"] = np.arange(len(df))
        frames.append(df)
    out = pd.concat(frames, ignore_index=True)
    out["dtype"] = out["dtype"].where(out["dtype"].notna(), None)
    return out


def num(x):
    """Float from a possibly missing JSON number."""
    return np.nan if x is None or (isinstance(x, float) and math.isnan(x)) else float(x)


def fmt(x):
    if x is None:
        return ""
    if isinstance(x, (bool, np.bool_)):
        return "1" if x else "0"
    if isinstance(x, (int, np.integer)):
        return str(int(x))
    if isinstance(x, float) or isinstance(x, np.floating):
        return "" if not math.isfinite(x) else format(float(x), ".10g")
    return str(x)


# --------------------------------------------------------------------------- case structure


@dataclass
class Instrument:
    """The item set arranged as arrays; all model data is aligned to it."""

    items: pd.DataFrame  # one row per prompt, with helper columns
    case_ids: list
    family: np.ndarray
    stratum: np.ndarray
    name_group: np.ndarray
    ref: np.ndarray  # (N, 12) +1 escalate / -1 routine
    cell: np.ndarray  # (N,) int code of family x stratum
    dropped: list = field(default_factory=list)
    h0b: dict = field(default_factory=dict)

    @property
    def n(self):
        return len(self.case_ids)


def build_instrument(items_df):
    df = items_df.copy().reset_index(drop=True)
    df["ord"] = df["option_order"].map({"ER": 0, "RE": 1})
    df["var"] = df["variant"].map(V)
    df["lo"] = df["letter_order"].map({"AB": 0, "BA": 1})
    line1_is_a = df["letter_order"] == "AB"
    esc_on_line1 = df["option_order"] == "ER"
    df["esc_is_a"] = (line1_is_a == esc_on_line1).to_numpy()
    df["ref_int"] = df["reference_content"].map({"escalate": 1, "routine": -1})
    main = df[df["arm"] == "main"]
    counts = main.groupby("item_id").size()
    complete = sorted(counts[counts == 2 * len(VARIANTS)].index)
    dropped = sorted(set(counts.index) - set(complete))
    cid = {c: i for i, c in enumerate(complete)}
    df["case"] = df["item_id"].map(cid)
    n = len(complete)
    ref = np.zeros((n, len(VARIANTS)), dtype=np.int8)
    fam = np.empty(n, dtype=object)
    stra = np.empty(n, dtype=object)
    grp = np.empty(n, dtype=object)
    base_rows = main[(main["variant"] == "base") & (main["option_order"] == "ER")]
    for _, r in base_rows.iterrows():
        if r["item_id"] in cid:
            i = cid[r["item_id"]]
            fam[i], stra[i], grp[i] = r["family"], r["stratum"], r["name_group"]
    for _, r in main[main["option_order"] == "ER"].iterrows():
        if r["item_id"] in cid:
            ref[cid[r["item_id"]], int(r["var"])] = int(r["ref_int"])
    cells = sorted({f"{a}|{b}" for a, b in zip(fam, stra)})
    cell = np.array([cells.index(f"{a}|{b}") for a, b in zip(fam, stra)], dtype=np.int64)
    inst = Instrument(df, complete, fam, stra, grp, ref, cell, dropped)
    # H0b (items only): decisive flips the reference, every other variant keeps it.
    bad_dec = int(np.sum(ref[:, DECISIVE] == ref[:, BASE]))
    others = [i for i in range(len(VARIANTS)) if i not in (BASE, DECISIVE)]
    bad_oth = int(np.sum(ref[:, others] != ref[:, [BASE]]))
    inst.h0b = {"decisive_not_flipped": bad_dec, "others_changed": bad_oth, "pass": bad_dec == 0 and bad_oth == 0}
    return inst


# --------------------------------------------------------------------------- model data


@dataclass
class ModelData:
    key: str  # unique run key: model_id or model_id|dtype
    model_id: str
    dtype: str | None
    is_baseline: bool
    M3: np.ndarray  # (N, 12, 2) m_o, NaN when missing
    D3: np.ndarray  # (N, 12, 2) l_a - l_b
    mass3: np.ndarray  # (N, 12, 2)
    nt3: np.ndarray  # (N, 12, 2) n_tokens
    Zm: np.ndarray  # (N, 2 var, 2 ord, 2 letter order) m_o, decomp arm
    Zd: np.ndarray  # same shape, l_a - l_b
    complete: np.ndarray  # (N,) bool: full 24 main prompts present
    decomp_ok: np.ndarray  # (N,) bool: all 8 decomp prompts present
    word: dict  # item_id/variant -> l_escalate - l_routine (word arm, ER)
    greedy: dict  # prompt_id -> greedy_letter (mode greedy)
    retest: dict  # {"n": int, "max_rel": float, "decisions_equal": bool}
    n_rows: int = 0


def run_key(model_id, dtype):
    return f"{model_id}|{dtype}" if dtype else str(model_id)


def build_model(inst, sdf, model_id, dtype):
    """sdf: all score rows of one (model_id, dtype)."""
    items = inst.items
    pos = pd.Series(np.arange(len(items)), index=items["prompt_id"].to_numpy())
    n = inst.n
    nv = len(VARIANTS)
    M3 = np.full((n, nv, 2), np.nan)
    D3 = np.full((n, nv, 2), np.nan)
    mass3 = np.full((n, nv, 2), np.nan)
    nt3 = np.full((n, nv, 2), np.nan)
    Zm = np.full((n, 2, 2, 2), np.nan)
    Zd = np.full((n, 2, 2, 2), np.nan)
    word, greedy = {}, {}
    retest = {"n": 0, "max_rel": 0.0, "decisions_equal": True}

    letter = sdf[sdf["mode"].isin(["logprob", "baseline"])]
    # duplicates of one prompt = retest; the first occurrence is the measurement
    letter = letter.sort_values(["src", "row"])
    dup = letter.duplicated("prompt_id", keep="first")
    first, later = letter[~dup], letter[dup]
    if len(later):
        merged = later.merge(first, on="prompt_id", suffixes=("_r", ""))
        for col in ("l_a", "l_b"):
            a = merged[col].to_numpy(dtype=float)
            b = merged[col + "_r"].to_numpy(dtype=float)
            rel = np.abs(a - b) / np.maximum(np.maximum(np.abs(a), np.abs(b)), 1.0)
            retest["max_rel"] = max(retest["max_rel"], float(np.nanmax(rel)) if len(rel) else 0.0)
        retest["n"] = int(len(merged))
        retest["decisions_equal"] = bool((merged["decision_content_r"] == merged["decision_content"]).all())
    first = first[first["prompt_id"].isin(pos.index)]
    p = pos.loc[first["prompt_id"]].to_numpy()
    sub = items.iloc[p]
    la = first["l_a"].to_numpy(dtype=float)
    lb = first["l_b"].to_numpy(dtype=float)
    d = la - lb
    m = np.where(sub["esc_is_a"].to_numpy(), d, -d)
    mass = first["mass"].to_numpy(dtype=float)
    mass = np.where(np.isnan(mass), np.exp(la) + np.exp(lb), mass)
    nt = first["n_tokens"].to_numpy(dtype=float)
    case = sub["case"].to_numpy()
    var = sub["var"].to_numpy()
    o = sub["ord"].to_numpy()
    lo = sub["lo"].to_numpy()
    arm = sub["arm"].to_numpy()
    ok = ~np.isnan(case)
    mm = (arm == "main") & ok
    ci = case[mm].astype(int)
    M3[ci, var[mm].astype(int), o[mm].astype(int)] = m[mm]
    D3[ci, var[mm].astype(int), o[mm].astype(int)] = d[mm]
    mass3[ci, var[mm].astype(int), o[mm].astype(int)] = mass[mm]
    nt3[ci, var[mm].astype(int), o[mm].astype(int)] = nt[mm]
    # placement decomposition: AB partners come from the main arm
    zsel = ok & (var <= 1) & (((arm == "main") & (lo == 0)) | ((arm == "decomp") & (lo == 1)))
    zi = case[zsel].astype(int)
    Zm[zi, var[zsel].astype(int), o[zsel].astype(int), lo[zsel].astype(int)] = m[zsel]
    Zd[zi, var[zsel].astype(int), o[zsel].astype(int), lo[zsel].astype(int)] = d[zsel]

    for _, r in sdf[sdf["mode"] == "seqlogprob"].iterrows():
        if r["prompt_id"] in pos.index:
            it = items.iloc[pos[r["prompt_id"]]]
            word[(it["item_id"], it["variant"])] = num(r["l_escalate"]) - num(r["l_routine"])
    for _, r in sdf[sdf["mode"] == "greedy"].iterrows():
        greedy[r["prompt_id"]] = r["greedy_letter"]

    complete = ~np.isnan(M3).any(axis=(1, 2))
    decomp_ok = ~np.isnan(Zm).any(axis=(1, 2, 3))
    return ModelData(
        key=run_key(model_id, dtype),
        model_id=model_id,
        dtype=dtype,
        is_baseline=str(model_id).startswith("baseline:"),
        M3=M3,
        D3=D3,
        mass3=mass3,
        nt3=nt3,
        Zm=Zm,
        Zd=Zd,
        complete=complete,
        decomp_ok=decomp_ok,
        word=word,
        greedy=greedy,
        retest=retest,
        n_rows=len(sdf),
    )


def build_models(inst, scores):
    models = []
    for (mid, dt), sdf in scores.groupby(["model_id", scores["dtype"].fillna("")], sort=True):
        models.append(build_model(inst, sdf, mid, dt or None))
    return models


# --------------------------------------------------------------------------- decisions


def sign_dec(x):
    return np.where(np.abs(x) <= TIE_EPS, 0, np.sign(x)).astype(np.int8)


def legacy_mstar(md):
    """v2 averaging (letter swap at fixed content order): ER with AB and BA, base and decisive."""
    return 0.5 * (md.Zm[:, :, 0, 0] + md.Zm[:, :, 0, 1])


def per_case(md, inst):
    """Per-case metric arrays for one model, restricted to nothing (full N, NaN-free by caller)."""
    ref = inst.ref
    mstar = md.M3.mean(axis=2)  # (N, 12)
    dec = sign_dec(mstar)
    ok = dec == ref
    base_ok, dec_ok = ok[:, BASE], ok[:, DECISIVE]
    irr_same = np.stack([dec[:, i] == dec[:, BASE] for i in IRR], axis=1)
    plc_same = np.stack([dec[:, i] == dec[:, BASE] for i in PLC], axis=1)
    para_same = np.stack([dec[:, i] == dec[:, BASE] for i in PARA], axis=1)
    ga_inv = base_ok & irr_same.all(axis=1)
    ga_sens = base_ok & dec_ok
    ga = ga_inv & dec_ok
    ga_strict = ga & para_same.all(axis=1)
    pc = {
        "mstar": mstar,
        "dec": dec,
        "acc": (base_ok.astype(float) + dec_ok) / 2,
        "ga": ga.astype(float),
        "ga_inv": ga_inv.astype(float),
        "ga_sens": ga_sens.astype(float),
        "ga_strict": ga_strict.astype(float),
        "sfr": (~dec_ok).astype(float),
        "flip_irr": (~irr_same).astype(float),  # (N, 4)
        "flip_plc": (~plc_same).astype(float),  # (N, 4)
        "flip_para": (~para_same).astype(float),  # (N, 2)
        "base_ok": base_ok,
        "dec_ok": dec_ok,
        "violated": dec[:, BASE] == dec[:, DECISIVE],
    }
    pc["flip_para_mean"] = pc["flip_para"].mean(axis=1)
    pc["exc_irr"] = pc["flip_irr"] - pc["flip_plc"]
    pc["d_para"] = pc["flip_irr"] - pc["flip_para_mean"][:, None]
    # raw decisions: ER only; RE as invariance variant
    decR = sign_dec(md.M3[:, :, 0])
    decRE = sign_dec(md.M3[:, :, 1])
    okR = decR == ref
    irrR = np.stack([decR[:, i] == decR[:, BASE] for i in IRR], axis=1)
    ga_raw = okR[:, BASE] & irrR.all(axis=1) & okR[:, DECISIVE]
    swap_same = decRE[:, BASE] == decR[:, BASE]
    pc["acc_raw"] = (okR[:, BASE].astype(float) + okR[:, DECISIVE]) / 2
    pc["ga_raw"] = ga_raw.astype(float)
    pc["ga_raw_swap"] = (ga_raw & swap_same).astype(float)
    pc["acc_raw_re"] = ((decRE[:, BASE] == ref[:, BASE]).astype(float) + (decRE[:, DECISIVE] == ref[:, DECISIVE])) / 2
    pc["raw_swap_only"] = (ga_raw & ~swap_same).astype(float)
    pc["raw_viol"] = (~(ga_raw & swap_same)).astype(float)
    pc["tie_share"] = ((dec[:, BASE] == 0).astype(float) + (dec[:, DECISIVE] == 0)) / 2
    d_ER_RE = md.D3  # (N,12,2)
    sigma = 0.5 * (d_ER_RE[:, :, 0] + d_ER_RE[:, :, 1])
    pc["sigma"] = sigma.mean(axis=1)
    pc["raw_diff"] = (decR != dec).mean(axis=1).astype(float)
    return pc


# --------------------------------------------------------------------------- bootstrap


def boot_weights(cell, B, rng):
    """Stratified case bootstrap. Returns (idx[B,N] int32, W[B,N] float64 draw counts)."""
    n = len(cell)
    idx = np.empty((B, n), dtype=np.int32)
    for c in np.unique(cell):
        pos = np.flatnonzero(cell == c)
        idx[:, pos] = pos[rng.integers(0, len(pos), size=(B, len(pos)))]
    flat = (np.arange(B, dtype=np.int64)[:, None] * n + idx).ravel()
    W = np.bincount(flat, minlength=B * n).reshape(B, n).astype(np.float64)
    return idx, W


def boot_means(W, x):
    """Bootstrap means of per-case values x (N,) or (N, S) -> (B,) or (B, S)."""
    return (W @ x) / W.shape[1]


def pct_ci(vals, level):
    a = (1 - level) / 2
    return float(np.quantile(vals, a)), float(np.quantile(vals, 1 - a))


def p_le0(boot):
    """(#draws <= 0 + 1) / (B + 1) along axis 0."""
    return (np.sum(boot <= 0, axis=0) + 1.0) / (boot.shape[0] + 1.0)


def holm(pvals, m=None):
    """Holm-adjusted p-values for a list of p's; m = family size (>= len, missing p count as 1)."""
    p = np.asarray(pvals, dtype=float)
    k = len(p)
    m = max(m or k, k)
    order = np.argsort(p, kind="stable")
    adj = np.empty(k)
    run = 0.0
    for rank, i in enumerate(order):
        run = max(run, min(1.0, (m - rank) * p[i]))
        adj[i] = run
    return adj


def holm_matrix(P):
    """Row-wise Holm over columns of P (S, m) -> adjusted (S, m)."""
    S, m = P.shape
    order = np.argsort(P, axis=1, kind="stable")
    sp = np.take_along_axis(P, order, axis=1)
    adj_sorted = np.minimum(1.0, sp * (m - np.arange(m))[None, :])
    adj_sorted = np.maximum.accumulate(adj_sorted, axis=1)
    out = np.empty_like(adj_sorted)
    np.put_along_axis(out, order, adj_sorted, axis=1)
    return out


def iut_boot(d_acc, d_other, W):
    """Intersection-union reversal test for one or many columns.

    d_acc, d_other: per-case differences X - Y (N,) or (N, S), oriented so that the
    Acc difference is > 0. Reversal = Acc up and the other metric down.
    Returns (p1, p2, p, boot_acc, boot_other).
    """
    ba = boot_means(W, d_acc)
    bo = boot_means(W, d_other)
    p1 = p_le0(ba)
    p2 = p_le0(-bo)
    return p1, p2, np.maximum(p1, p2), ba, bo


def mcnemar_one_sided(b, c):
    """Exact one-sided McNemar: P(X >= b) for X ~ Bin(b + c, 1/2). Works on arrays."""
    b = np.asarray(b)
    c = np.asarray(c)
    n = b + c
    p = stats.binom.sf(b - 1, n, 0.5)
    return np.where(n == 0, 1.0, p)


def mcnemar_two_sided(b, c):
    """Exact two-sided McNemar via statsmodels (table [[0, b], [c, 0]])."""
    from statsmodels.stats.contingency_tables import mcnemar

    return float(mcnemar([[0, int(b)], [int(c), 0]], exact=True).pvalue)


# --------------------------------------------------------------------------- analysis of one model


def label_mass(md):
    out = {}
    for oi, name in enumerate(ORDERS):
        x = md.mass3[:, :, oi].ravel()
        x = x[~np.isnan(x)]
        if len(x) == 0:
            out[name] = (np.nan, np.nan, np.nan)
        else:
            out[name] = (float(np.median(x)), float(np.quantile(x, 0.10)), float(np.mean(x < 0.1)))
    return out


def format_ok(md):
    lm = label_mass(md)
    return all(np.isfinite(lm[o][0]) and lm[o][0] >= LABEL_MASS_MIN for o in ORDERS)


def place_decomposition(md, idxb_W, mask):
    """pi_ID, pi_pos per decomp case, agreement of 4-fold and 2-fold decisions."""
    Zd, Zm = md.Zd, md.Zm
    sign = np.array([1.0, -1.0])  # line-1 letter is A for AB, B for BA
    pi_id = Zd.mean(axis=(1, 2, 3))
    pi_pos = (Zd * sign[None, None, None, :]).mean(axis=(1, 2, 3))
    two = sign_dec(0.5 * (Zm[:, :, 0, 0] + Zm[:, :, 1, 0]))  # AB, ER/RE average (v2.1 primary)
    four = sign_dec(Zm.mean(axis=(2, 3)))
    agree = (two == four).mean(axis=1)
    return pi_id, pi_pos, agree


def ratio_ci(W, x, g, level):
    """Bootstrap CI of the mean of x over the subset g (0/1 per case)."""
    num_ = W @ (x * g)
    den = W @ g
    with np.errstate(invalid="ignore", divide="ignore"):
        r = num_ / den
    r = r[np.isfinite(r)]
    return pct_ci(r, level) if len(r) else (np.nan, np.nan)


def analyse_model(md, inst, W, idx, level=0.95):
    """Return dict with per-case arrays and summary numbers for one model."""
    pc = per_case(md, inst)
    out = {"pc": pc, "name": md.key}
    n = inst.n

    def mean_ci(x):
        b = boot_means(W, x)
        lo, hi = pct_ci(b, level)
        return float(np.mean(x)), lo, hi

    out["summ"] = {k: mean_ci(pc[k]) for k in ("acc", "ga", "ga_inv", "ga_sens", "ga_strict", "sfr")}
    gap = pc["acc"] - pc["ga"]
    out["summ"]["gap"] = mean_ci(gap)
    out["summ"]["gap_inv"] = mean_ci(pc["acc"] - pc["ga_inv"])
    out["summ"]["gap_sens"] = mean_ci(pc["acc"] - pc["ga_sens"])
    for k in ("acc_raw", "ga_raw", "ga_raw_swap", "acc_raw_re", "tie_share", "sigma", "raw_diff"):
        out["summ"][k] = mean_ci(pc[k])
    viol = float(np.sum(pc["raw_viol"]))
    out["raw_swap_only_share"] = float(np.sum(pc["raw_swap_only"]) / viol) if viol > 0 else np.nan
    # Bound check: accuracy <= 1 - v / (2N), v = cases where base and decisive get the same decision
    v = int(np.sum(pc["violated"]))
    out["bound"] = {"v": v, "bound": 1 - v / (2 * n), "acc": float(np.mean(pc["acc"]))}
    out["bound"]["ok"] = out["bound"]["acc"] <= out["bound"]["bound"] + 1e-12
    # calibration
    sel = np.concatenate([pc["mstar"][:, BASE], pc["mstar"][:, DECISIVE]])
    y = np.concatenate([(inst.ref[:, BASE] == 1), (inst.ref[:, DECISIVE] == 1)]).astype(float)
    p = 1.0 / (1.0 + np.exp(-sel))
    bins = np.minimum((p * 10).astype(int), 9)
    ece = 0.0
    for b in range(10):
        s = bins == b
        if s.any():
            ece += s.mean() * abs(y[s].mean() - p[s].mean())
    flipped = pc["flip_irr"] > 0
    pi = 1.0 / (1.0 + np.exp(-pc["mstar"][:, IRR]))
    out["ece"] = float(ece)
    out["flipped_conf"] = float(np.mean(np.abs(pi[flipped] - 0.5))) if flipped.any() else np.nan
    out["mass"] = label_mass(md)
    out["format_ok"] = format_ok(md)
    # place bias decomposition
    if md.decomp_ok.any():
        pi_id, pi_pos, agree = place_decomposition(md, W, md.decomp_ok)
        g = md.decomp_ok.astype(float)
        out["pi"] = {
            "n": int(md.decomp_ok.sum()),
            "pi_id": (float(pi_id[md.decomp_ok].mean()),) + ratio_ci(W, np.nan_to_num(pi_id), g, level),
            "pi_pos": (float(pi_pos[md.decomp_ok].mean()),) + ratio_ci(W, np.nan_to_num(pi_pos), g, level),
            "agree": (float(agree[md.decomp_ok].mean()),) + ratio_ci(W, np.nan_to_num(agree), g, level),
            "mstar_shift_v2": float(np.mean((legacy_mstar(md) - md.Zm.mean(axis=2)[:, :, 0])[md.decomp_ok])),
        }
    else:
        out["pi"] = None
    # H2
    out["h2"] = h2_model(pc, idx)
    return out


def h2_model(pc, idx, n_boot=2000):
    """d_a = (median|dm_a| - median|dm_plc_a|) / MAD(dm_plc_a); bootstrap CI."""
    mstar = pc["mstar"]
    res = {}
    base = mstar[:, BASE]
    ib = idx[: min(n_boot, idx.shape[0])]

    def d_stat(x, y):
        # x, y: signed deltas (N,) or resampled (B, N)
        mx = np.median(np.abs(x), axis=-1)
        my = np.median(np.abs(y), axis=-1)
        med = np.median(y, axis=-1, keepdims=True)
        mad = np.median(np.abs(y - med), axis=-1)
        with np.errstate(invalid="ignore", divide="ignore"):
            return (mx - my) / mad

    pooled_plc = np.stack([mstar[:, p] - base for p in PLC], axis=1)
    for a, (i, p) in enumerate(zip(IRR, PLC)):
        x = mstar[:, i] - base
        y = mstar[:, p] - base
        pt = d_stat(x, y)
        bt = d_stat(x[ib], y[ib])
        bt = bt[np.isfinite(bt)]
        res[AXES[a]] = (float(pt), *(pct_ci(bt, 0.95) if len(bt) else (np.nan, np.nan)))
    # decisive vs pooled placebo
    x = mstar[:, DECISIVE] - base
    y = pooled_plc.reshape(-1)
    pt = d_stat(x, y)
    pooled_b = pooled_plc[ib]  # (B, N, 4)
    xb = x[ib]
    my = np.median(np.abs(pooled_b.reshape(len(ib), -1)), axis=1)
    med = np.median(pooled_b.reshape(len(ib), -1), axis=1, keepdims=True)
    mad = np.median(np.abs(pooled_b.reshape(len(ib), -1) - med), axis=1)
    with np.errstate(invalid="ignore", divide="ignore"):
        bt = (np.median(np.abs(xb), axis=1) - my) / mad
    bt = bt[np.isfinite(bt)]
    res["decisive"] = (float(pt), *(pct_ci(bt, 0.95) if len(bt) else (np.nan, np.nan)))
    return res


def covariate_model(md, inst, pc):
    """flip ~ axis + axis:kind_irr + |dtok| + |m*_base| + stratum, cluster-robust by case.

    Returns {axis: (beta, lo, hi, p) | None} and a status string.
    """
    import statsmodels.formula.api as smf

    if np.isnan(md.nt3).any():
        return {}, "no n_tokens"
    nt = md.nt3
    dtok = np.mean(np.abs(nt[:, :, :] - nt[:, [BASE], :]), axis=2)  # (N, 12)
    rows = []
    absm = np.abs(pc["mstar"][:, BASE])
    for a in range(4):
        for kind, vi, fl in (("irr", IRR[a], pc["flip_irr"]), ("placebo", PLC[a], pc["flip_plc"])):
            rows.append(
                pd.DataFrame(
                    {
                        "flip": fl[:, a],
                        "axis": AXES[a],
                        "kind_irr": 1.0 if kind == "irr" else 0.0,
                        "dtok": dtok[:, vi],
                        "absm": absm,
                        "stratum": inst.stratum,
                        "case": np.arange(inst.n),
                    }
                )
            )
    df = pd.concat(rows, ignore_index=True)
    if df["flip"].nunique() < 2:
        return {}, "no flips (constant)"
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            fit = smf.logit("flip ~ C(axis) + C(axis):kind_irr + dtok + absm + C(stratum)", data=df).fit(
                disp=0, maxiter=200, cov_type="cluster", cov_kwds={"groups": df["case"].to_numpy()}
            )
        if not fit.mle_retvals.get("converged", True) or (np.abs(fit.params) > 25).any():
            return {}, "not estimable (separation)"
        ci = fit.conf_int()
        out = {}
        for a in AXES:
            name = f"C(axis)[{a}]:kind_irr"
            out[a] = (float(fit.params[name]), float(ci.loc[name, 0]), float(ci.loc[name, 1]), float(fit.pvalues[name]))
        return out, "ok"
    except Exception as e:  # noqa: BLE001 - report instead of crashing the whole analysis
        return {}, f"not estimable ({type(e).__name__})"


# --------------------------------------------------------------------------- hypotheses


def axis_tests(pc, W, inst):
    """H3 (exact McNemar, Holm over 4) and H3-P (bootstrap, Holm over 4) for one model."""
    rows = []
    n = inst.n
    p3, p3p = [], []
    for a in range(4):
        fi, fp = pc["flip_irr"][:, a], pc["flip_plc"][:, a]
        b = int(np.sum((fi == 1) & (fp == 0)))
        c = int(np.sum((fi == 0) & (fp == 1)))
        p3.append(float(mcnemar_one_sided(b, c)))
        d = pc["d_para"][:, a]
        bd = boot_means(W, d)
        p3p.append(float(p_le0(bd)))
        rows.append({"axis": AXES[a], "b": b, "c": c, "d_boot": bd})
    h3 = holm(p3)
    h3p = holm(p3p)
    out = []
    for a, r in enumerate(rows):
        fi, fp = pc["flip_irr"][:, a], pc["flip_plc"][:, a]
        ex = fi - fp
        exp_ = pc["d_para"][:, a]
        sig3, sig3p = h3[a] <= ALPHA, h3p[a] <= ALPHA
        reading = READING_BOTH if sig3 and sig3p else READING_H3_ONLY if sig3 else READING_H3P_ONLY if sig3p else READING_NONE
        out.append(
            {
                "axis": AXES[a],
                "n": n,
                "flip_irr": float(fi.mean()),
                "flip_placebo": float(fp.mean()),
                "excess": float(ex.mean()),
                "excess_ci": pct_ci(boot_means(W, ex), 0.95),
                "b": r["b"],
                "c": r["c"],
                "p_mcnemar_two_sided": mcnemar_two_sided(r["b"], r["c"]),
                "p_h3": p3[a],
                "p_h3_holm": float(h3[a]),
                "flip_para": float(pc["flip_para_mean"].mean()),
                "excess_para": float(exp_.mean()),
                "excess_para_ci": pct_ci(r["d_boot"], 0.95),
                "p_h3p": p3p[a],
                "p_h3p_holm": float(h3p[a]),
                "h3_sig": bool(sig3),
                "h3p_sig": bool(sig3p),
                "reading": reading,
            }
        )
    return out


def origin_check(pc, W, inst):
    """H3 check: placebo flip rate of the origin axis for de vs tr coded cases."""
    x = pc["flip_plc"][:, AXES.index("origin")]
    de = (inst.name_group == "de").astype(float)
    tr = (inst.name_group == "tr").astype(float)
    if de.sum() == 0 or tr.sum() == 0:
        return None
    with np.errstate(invalid="ignore", divide="ignore"):
        bde = (W @ (x * de)) / (W @ de)
        btr = (W @ (x * tr)) / (W @ tr)
    diff = btr - bde
    diff = diff[np.isfinite(diff)]
    return {
        "de": float(x[de == 1].mean()),
        "tr": float(x[tr == 1].mean()),
        "diff": float(x[tr == 1].mean() - x[de == 1].mean()),
        "ci": pct_ci(diff, 0.95),
        "p": float((np.sum(diff <= 0) + 1) / (len(diff) + 1)),
    }


def ranked_models(results, models_by_key):
    return [k for k, r in results.items() if not models_by_key[k].is_baseline and r["format_ok"]]


def resolve_pair_names(pairs_cfg, names):
    """Map pairs.json short names to run keys (exact model_id, configured id, or unique substring)."""
    mapping = {}
    for short, cfg in (pairs_cfg.get("models") or {}).items():
        want = cfg.get("model_id") or short
        hit = [n for n in names if n == want or n.split("|")[0] == want]
        if not hit:
            hit = [n for n in names if short.lower() in n.lower()]
        mapping[short] = hit[0] if len(hit) == 1 else None
    return mapping


def pair_table(keys, results, inst, W, k, level_k, pair_list, pair_roles):
    """H1 + decomposition + raw for the given (x, y) key pairs. Holm over family size k."""
    rows = []
    for (a, b), role in zip(pair_list, pair_roles):
        pa, pb = results[a]["pc"], results[b]["pc"]
        dacc = pa["acc"] - pb["acc"]
        if dacc.mean() < 0 or (dacc.mean() == 0 and a > b):
            a, b, pa, pb, dacc = b, a, pb, pa, -dacc
        row = {"model_x": a, "model_y": b, "role": role, "k": k, "n": inst.n, "acc_x": pa["acc"].mean(), "acc_y": pb["acc"].mean()}
        legs = {"ga": "ga", "inv": "ga_inv", "sens": "ga_sens"}
        for name, key in legs.items():
            d = pa[key] - pb[key]
            p1, p2, p, ba, bo = iut_boot(dacc, d, W)
            row[f"{key}_x"] = pa[key].mean()
            row[f"{key}_y"] = pb[key].mean()
            row[f"d_{key}"] = d.mean()
            row[f"p_{name}"] = float(p)
            if name == "ga":
                row["d_acc"] = dacc.mean()
                row["p_acc"] = float(p1)
                row["d_acc_lo"], row["d_acc_hi"] = pct_ci(ba, level_k)
                row["d_ga_lo"], row["d_ga_hi"] = pct_ci(bo, level_k)
                row["reversal_ub_pp"] = 100 * float(np.quantile(-bo, 1 - ALPHA / k))
        # raw ranking (ER only, RE swap as invariance variant)
        da_raw = pa["acc_raw"] - pb["acc_raw"]
        dg_raw = pa["ga_raw_swap"] - pb["ga_raw_swap"]
        rowsign = 1.0
        if da_raw.mean() < 0:
            rowsign = -1.0
        _, _, p_raw, _, _ = iut_boot(rowsign * da_raw, rowsign * dg_raw, W)
        row["d_acc_raw"] = da_raw.mean()
        row["d_ga_raw"] = dg_raw.mean()
        row["p_raw"] = float(p_raw)
        rows.append(row)
    for col in ("ga", "inv", "sens", "raw"):
        if rows:
            adj = holm([r[f"p_{col}"] for r in rows], m=k)
            for r, v in zip(rows, adj):
                r[f"p_holm_{col}"] = float(v)
    for r in rows:
        r["reversal"] = bool(r["p_holm_ga"] <= ALPHA)
        r["reversal_inv"] = bool(r["p_holm_inv"] <= ALPHA)
        r["reversal_sens"] = bool(r["p_holm_sens"] <= ALPHA)
        r["reversal_raw"] = bool(r["p_holm_raw"] <= ALPHA)
        r["h1b"] = bool(r["p_acc"] <= ALPHA and r["p_ga"] > 0 and (r["d_ga"] >= 0 or r["p_holm_ga"] > ALPHA) and abs(r["d_ga"]) < abs(r["d_acc"]))
    return rows


def h4_tests(models, inst, results, W):
    """Replication: fp32 -> q8 flip rate on base and decisive vs pooled fp32 placebo flip rate."""
    by_id = {}
    for m in models:
        by_id.setdefault(m.model_id, {})[m.dtype] = m
    rows = []
    for mid, runs in sorted(by_id.items()):
        if "fp32" not in runs or "q8" not in runs:
            continue
        f, q = runs["fp32"], runs["q8"]
        if not (f.complete.all() and q.complete.all()):
            continue
        df_, dq = results[f.key]["pc"]["dec"], results[q.key]["pc"]["dec"]
        flipq = np.stack([df_[:, BASE] != dq[:, BASE], df_[:, DECISIVE] != dq[:, DECISIVE]], axis=1).astype(float)
        plc = results[f.key]["pc"]["flip_plc"]
        n = inst.n
        ii = np.arange(n)
        a_units = flipq.ravel(order="F")  # slot 0 for all cases, then slot 1
        axis_idx = np.concatenate([ii % 4, (ii + 2) % 4])
        b_units = plc[np.concatenate([ii, ii]), axis_idx]
        b = int(np.sum((a_units == 1) & (b_units == 0)))
        c = int(np.sum((a_units == 0) & (b_units == 1)))
        diff_case = flipq.mean(axis=1) - plc.mean(axis=1)
        bd = boot_means(W, diff_case)
        accd = results[q.key]["pc"]["acc"] - results[f.key]["pc"]["acc"]
        rows.append(
            {
                "model": mid,
                "flip_q8": float(flipq.mean()),
                "flip_placebo": float(plc.mean()),
                "b": b,
                "c": c,
                "p_mcnemar": float(mcnemar_one_sided(b, c)),
                "p_mcnemar_two_sided": mcnemar_two_sided(b, c),
                "diff": float(diff_case.mean()),
                "diff_ci": pct_ci(bd, 0.95),
                "p_boot": float(p_le0(bd)),
                "d_acc": float(accd.mean()),
                "d_acc_ci": pct_ci(boot_means(W, accd), 0.95),
            }
        )
    if rows:
        adj = holm([r["p_mcnemar"] for r in rows], m=max(2, len(rows)))
        for r, v in zip(rows, adj):
            r["p_holm"] = float(v)
            r["holds"] = bool(r["flip_q8"] > r["flip_placebo"] and v <= ALPHA)
    return rows


def robustness_arm(md, inst, pc):
    """Agreement of word (seqlogprob) and greedy decisions with the logprob raw decision."""
    out = {}
    decR = sign_dec(md.M3[:, :, 0])
    ids = inst.case_ids
    # word arm
    if md.word:
        agree, tot = 0, 0
        for i, cid in enumerate(ids):
            for v, name in ((BASE, "base"), (DECISIVE, "decisive")):
                w = md.word.get((cid, name))
                if w is None or np.isnan(w):
                    continue
                tot += 1
                agree += int(sign_dec(np.array([w]))[0] == decR[i, v])
        out["word"] = (agree / tot if tot else np.nan, tot)
    if md.greedy:
        items = inst.items
        main_er = items[(items["arm"] == "main") & (items["option_order"] == "ER") & items["variant"].isin(["base", "decisive"])]
        agree, tot = 0, 0
        for _, r in main_er.iterrows():
            g = md.greedy.get(r["prompt_id"])
            if g is None or pd.isna(r["case"]):
                continue
            tot += 1
            c = int(r["case"])
            v = int(r["var"])
            content = 0
            if g in ("A", "B"):
                content = 1 if (g == "A") == bool(r["esc_is_a"]) else -1
            agree += int(content == decR[c, v] and g != "invalid")
        out["greedy"] = (agree / tot if tot else np.nan, tot)
    return out


# --------------------------------------------------------------------------- pipeline


def analyse(items_path, score_paths, k, pairs_path, seed, out_dir, n_boot=DEFAULT_BOOT):
    items_df = load_items(items_path)
    inst = build_instrument(items_df)
    scores = load_scores(score_paths)
    models_all = build_models(inst, scores)
    pairs_cfg = {}
    if pairs_path:
        with open(pairs_path, encoding="utf-8") as fh:
            pairs_cfg = json.load(fh)
    notes = []
    if inst.dropped:
        notes.append(f"{len(inst.dropped)} base cases without the complete 24 prompts in the items excluded.")
    usable = []
    for m in models_all:
        if m.complete.sum() == 0:
            notes.append(f"{m.key}: no complete base cases, skipped.")
        else:
            usable.append(m)
    # common case set: cases complete for every model
    common = np.ones(inst.n, dtype=bool)
    for m in usable:
        common &= m.complete
    if not common.all():
        notes.append(f"Common case set: {int(common.sum())} of {inst.n} base cases (not every model is complete).")
        inst, usable = restrict(inst, usable, common)
    if inst.n == 0:
        raise SystemExit("no common complete cases")
    rng = np.random.default_rng([seed, 1])
    idx, W = boot_weights(inst.cell, n_boot, rng)
    mbk = {m.key: m for m in usable}
    results = {m.key: analyse_model(m, inst, W, idx) for m in usable}
    for m in usable:
        r = results[m.key]
        r["cov"], r["cov_status"] = ({}, "Baseline") if m.is_baseline else covariate_model(m, inst, r["pc"])
        r["axis"] = axis_tests(r["pc"], W, inst)
        r["origin"] = origin_check(r["pc"], W, inst)
        r["robust"] = robustness_arm(m, inst, r["pc"])
    # primary run per model_id
    primary = {}
    for m in usable:
        cur = primary.get(m.model_id)
        if cur is None or (m.dtype == PRIMARY_DTYPE and cur.dtype != PRIMARY_DTYPE):
            primary[m.model_id] = m
    ranked = [m.key for m in primary.values() if not m.is_baseline and results[m.key]["format_ok"]]
    unranked = [m.key for m in primary.values() if not m.is_baseline and not results[m.key]["format_ok"]]
    level_k = 1 - ALPHA / k
    mapping = resolve_pair_names(pairs_cfg, ranked) if pairs_cfg else {}
    if k == 15 or not pairs_cfg.get("pairs_k5"):
        plist = list(itertools.combinations(sorted(ranked), 2))
        roles = [""] * len(plist)
    else:
        plist, roles = [], []
        for pr in pairs_cfg.get("pairs_k5", []):
            ka, kb = mapping.get(pr["a"]), mapping.get(pr["b"])
            if ka and kb and ka in ranked and kb in ranked:
                plist.append((ka, kb))
                roles.append(pr.get("role", ""))
            else:
                notes.append(f"Pair {pr['a']} vs {pr['b']}: model missing or not ranked, not computed.")
    pairs = pair_table(ranked, results, inst, W, k, level_k, plist, roles)
    h4 = h4_tests(usable, inst, results, W)
    # Kendall tau between Acc and GA ranking (descriptive)
    tau = None
    if len(ranked) >= 3:
        acc = [results[r]["summ"]["acc"][0] for r in ranked]
        ga = [results[r]["summ"]["ga"][0] for r in ranked]
        tau = float(stats.kendalltau(acc, ga).statistic)
    tau_raw = None
    if len(ranked) >= 3:
        a1 = [results[r]["summ"]["acc"][0] for r in ranked]
        a2 = [results[r]["summ"]["acc_raw"][0] for r in ranked]
        tau_raw = float(stats.kendalltau(a1, a2).statistic)
    # H0
    h0 = h0_checks(inst, usable, results)
    ctx = dict(
        inst=inst, models=usable, results=results, pairs=pairs, h4=h4, tau=tau, tau_raw=tau_raw, h0=h0,
        ranked=ranked, unranked=unranked, k=k, notes=notes, seed=seed, n_boot=n_boot, mapping=mapping,
        primary=primary,
    )
    write_outputs(ctx, out_dir)
    return ctx


def restrict(inst, models, mask):
    """Keep only the cases in mask."""
    keep = np.flatnonzero(mask)
    new = Instrument(
        items=inst.items,
        case_ids=[inst.case_ids[i] for i in keep],
        family=inst.family[keep],
        stratum=inst.stratum[keep],
        name_group=inst.name_group[keep],
        ref=inst.ref[keep],
        cell=inst.cell[keep],
        dropped=inst.dropped,
        h0b=inst.h0b,
    )
    # re-map the case index of the items so lookups by case stay valid
    remap = {int(old): new_i for new_i, old in enumerate(keep)}
    it = inst.items.copy()
    it["case"] = it["case"].map(lambda c: remap.get(int(c)) if pd.notna(c) else np.nan)
    new.items = it
    for m in models:
        m.M3, m.D3, m.mass3, m.nt3 = m.M3[keep], m.D3[keep], m.mass3[keep], m.nt3[keep]
        m.Zm, m.Zd = m.Zm[keep], m.Zd[keep]
        m.complete, m.decomp_ok = m.complete[keep], m.decomp_ok[keep]
    return new, models


def h0_checks(inst, models, results):
    out = {"b": inst.h0b}
    # (a) oracle
    oracle = [m for m in models if m.model_id == "baseline:oracle"]
    if oracle:
        pc = results[oracle[0].key]["pc"]
        vals = {k: float(pc[k].mean()) for k in ("acc", "ga", "ga_strict", "ga_inv", "ga_sens")}
        flips = float(pc["flip_irr"].sum() + pc["flip_plc"].sum() + pc["flip_para"].sum())
        ok = all(abs(v - 1.0) < 1e-12 for v in vals.values()) and flips == 0
        out["a"] = {"pass": ok, "values": vals, "flips": flips}
    else:
        out["a"] = None
    # (c) retest
    rts = [(m.key, m.retest) for m in models if m.retest["n"] > 0]
    if rts:
        ok = all(r["max_rel"] <= RETEST_REL_TOL and r["decisions_equal"] for _, r in rts)
        out["c"] = {"pass": ok, "models": rts}
    else:
        out["c"] = None
    # (d) label mass
    out["d"] = {m.key: results[m.key]["format_ok"] for m in models if not m.is_baseline}
    parts = [out["a"] and out["a"]["pass"], out["b"]["pass"], out["c"] and out["c"]["pass"]]
    failed = [n for n, v in zip("abc", [out["a"], out["b"], out["c"]]) if v is not None and not v["pass"]]
    not_run = [n for n, v in zip("abc", [out["a"], out["b"], out["c"]]) if v is None]
    out["failed"] = failed
    out["not_run"] = not_run
    out["verdict"] = "refuted" if failed else ("holds" if not not_run else "untested")
    return out


# --------------------------------------------------------------------------- output


def metric_rows(ctx):
    inst, results = ctx["inst"], ctx["results"]
    rows = []

    def add(model, subset, metric, value, lo=None, hi=None, n=None):
        rows.append(
            {"model": model, "subset": subset, "metric": metric, "value": fmt(value), "ci_lo": fmt(lo), "ci_hi": fmt(hi), "n": fmt(n)}
        )

    for m in ctx["models"]:
        r = results[m.key]
        pc = r["pc"]
        for name in ("acc", "ga", "ga_inv", "ga_sens", "ga_strict", "sfr", "gap", "gap_inv", "gap_sens",
                     "acc_raw", "acc_raw_re", "ga_raw", "ga_raw_swap", "tie_share", "sigma", "raw_diff"):
            v, lo, hi = r["summ"][name]
            add(m.key, "all", name, v, lo, hi, inst.n)
        for name in ("acc", "ga", "ga_inv", "ga_sens", "ga_strict", "sfr"):
            for col, arr in (("family", inst.family), ("stratum", inst.stratum), ("name_group", inst.name_group)):
                for val in sorted(set(arr)):
                    s = arr == val
                    add(m.key, f"{col}={val}", name, pc[name][s].mean(), n=int(s.sum()))
        for a in range(4):
            add(m.key, f"axis={AXES[a]}", "flip", pc["flip_irr"][:, a].mean(), n=inst.n)
            add(m.key, f"axis={AXES[a]}", "flip_placebo", pc["flip_plc"][:, a].mean(), n=inst.n)
        for pi_, nm in enumerate(("para1", "para2")):
            add(m.key, f"variant={nm}", "flip_para", pc["flip_para"][:, pi_].mean(), n=inst.n)
        add(m.key, "all", "flip_para_mean", pc["flip_para_mean"].mean(), n=inst.n)
        add(m.key, "all", "para_agreement", float(np.mean(pc["dec"][:, PARA[0]] == pc["dec"][:, PARA[1]])), n=inst.n)
        add(m.key, "all", "raw_swap_only_share", r["raw_swap_only_share"])
        add(m.key, "all", "ece", r["ece"])
        add(m.key, "all", "flipped_conf", r["flipped_conf"])
        add(m.key, "all", "bound_v", r["bound"]["v"])
        add(m.key, "all", "bound", r["bound"]["bound"])
        add(m.key, "all", "bound_ok", r["bound"]["ok"])
        for oi, o in enumerate(ORDERS):
            med, p10, lt = r["mass"][o]
            add(m.key, f"order={o}", "mass_median", med)
            add(m.key, f"order={o}", "mass_p10", p10)
            add(m.key, f"order={o}", "mass_lt_0.1", lt)
        add(m.key, "all", "format_ok", r["format_ok"])
        if r["pi"]:
            for nm in ("pi_id", "pi_pos", "agree"):
                v, lo, hi = r["pi"][nm]
                add(m.key, "decomp", nm if nm != "agree" else "decomp_agree", v, lo, hi, r["pi"]["n"])
            add(m.key, "decomp", "mstar_v2_shift", r["pi"]["mstar_shift_v2"], n=r["pi"]["n"])
        for axn, (pt, lo, hi) in r["h2"].items():
            add(m.key, f"axis={axn}", "h2_d", pt, lo, hi)
        for kind, (val, n_) in r["robust"].items():
            add(m.key, "robust", f"agree_{kind}", val, n=n_)
    return rows


def write_csv(path, rows, cols):
    lines = [",".join(cols)]
    for r in rows:
        vals = []
        for c in cols:
            v = fmt(r.get(c)) if not isinstance(r.get(c), str) else r.get(c)
            if "," in v or '"' in v or "\n" in v:
                v = '"' + v.replace('"', '""') + '"'
            vals.append(v)
        lines.append(",".join(vals))
    with open(path, "w", encoding="utf-8", newline="") as fh:
        fh.write("\n".join(lines) + "\n")


def write_outputs(ctx, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    mrows = metric_rows(ctx)
    write_csv(os.path.join(out_dir, "metrics.csv"), mrows, ["model", "subset", "metric", "value", "ci_lo", "ci_hi", "n"])
    pcols = [
        "model_x", "model_y", "role", "k", "n", "acc_x", "acc_y", "d_acc", "d_acc_lo", "d_acc_hi", "ga_x", "ga_y",
        "d_ga", "d_ga_lo", "d_ga_hi", "p_acc", "p_ga", "p_holm_ga", "reversal", "reversal_ub_pp",
        "ga_inv_x", "ga_inv_y", "d_ga_inv", "p_inv", "p_holm_inv", "reversal_inv",
        "ga_sens_x", "ga_sens_y", "d_ga_sens", "p_sens", "p_holm_sens", "reversal_sens",
        "d_acc_raw", "d_ga_raw", "p_raw", "p_holm_raw", "reversal_raw", "h1b",
    ]
    prow = []
    for r in ctx["pairs"]:
        rr = dict(r)
        rr["d_ga_inv"] = r["d_ga_inv"]
        rr["d_ga_sens"] = r["d_ga_sens"]
        rr["ga_inv_x"], rr["ga_inv_y"] = r["ga_inv_x"], r["ga_inv_y"]
        prow.append(rr)
    write_csv(os.path.join(out_dir, "pairs.csv"), prow, pcols)
    frows = []
    for m in ctx["models"]:
        r = ctx["results"][m.key]
        for a in r["axis"]:
            row = dict(a)
            row["model"] = m.key
            row["excess_lo"], row["excess_hi"] = a["excess_ci"]
            row["excess_para_lo"], row["excess_para_hi"] = a["excess_para_ci"]
            cv = r["cov"].get(a["axis"])
            row["cov_beta"], row["cov_lo"], row["cov_hi"], row["cov_p"] = cv if cv else (None,) * 4
            row["cov_status"] = r["cov_status"]
            frows.append(row)
    fcols = [
        "model", "axis", "n", "flip_irr", "flip_placebo", "excess", "excess_lo", "excess_hi", "b", "c",
        "p_mcnemar_two_sided", "p_h3", "p_h3_holm", "flip_para", "excess_para", "excess_para_lo", "excess_para_hi",
        "p_h3p", "p_h3p_holm", "h3_sig", "h3p_sig", "reading", "cov_beta", "cov_lo", "cov_hi", "cov_p", "cov_status",
    ]
    write_csv(os.path.join(out_dir, "flips.csv"), frows, fcols)
    with open(os.path.join(out_dir, "report.md"), "w", encoding="utf-8") as fh:
        fh.write(render_report(ctx))


def pp(x):
    return "–" if x is None or not math.isfinite(x) else f"{100 * x:.1f} pp"


def f3(x):
    return "–" if x is None or not math.isfinite(x) else f"{x:.3f}"


def yn(b, yes="holds", no="refuted"):
    return yes if b else no


def render_report(ctx):
    inst, results, k = ctx["inst"], ctx["results"], ctx["k"]
    L = []
    w = L.append
    w("# Paired decision eval: analysis")
    w("")
    w(f"Base cases N = {inst.n}, bootstrap B = {ctx['n_boot']}, seed {ctx['seed']}, k = {k}. "
      f"Models ranked: {len(ctx['ranked'])}, not ranked: {len(ctx['unranked'])}.")
    w("Aussagegrenze: for six open 0.5–2B models on a synthetic rule-following task with eight rule families.")
    for n in ctx["notes"]:
        w(f"- Note: {n}")
    w("")
    w("| Model | Acc | GA | Gap Acc−GA | GA_inv | GA_sens | SFR | σ (nats) | Status |")
    w("|---|---|---|---|---|---|---|---|---|")
    for m in ctx["models"]:
        r = results[m.key]
        s = r["summ"]
        status = "Baseline" if m.is_baseline else ("ranked" if m.key in ctx["ranked"] else ("format not met" if not r["format_ok"] else "not primary (dtype)"))
        w(f"| {m.key} | {f3(s['acc'][0])} | {f3(s['ga'][0])} | {f3(s['gap'][0])} | {f3(s['ga_inv'][0])} | {f3(s['ga_sens'][0])} | {f3(s['sfr'][0])} | {f3(s['sigma'][0])} | {status} |")
    w("")
    # H0
    h0 = ctx["h0"]
    w("## H0 (instrument)")
    w("Criterion: (a) rule reference Acc = GA = 1, all flip rates 0; (b) every decisive variant flips the reference, no irr, placebo or paraphrase variant does; (c) retest |ΔlogP| ≤ 1e-5 relative and identical decisions; (d) median label mass ≥ 0.5 per model and option order. (a)–(c) missed: no model run counts. (d) missed: not ranked.")
    w("")
    a = h0["a"]
    w(f"- (a) Oracle: {'not checked (no baseline:oracle in the scores)' if a is None else yn(a['pass'], 'holds', 'missed')}")
    w(f"- (b) Items: {yn(h0['b']['pass'], 'holds', 'missed')} (decisive without flip: {h0['b']['decisive_not_flipped']}, other variants with changed reference: {h0['b']['others_changed']})")
    c = h0["c"]
    if c is None:
        w("- (c) Retest: not checked (no duplicate prompt_id in the scores)")
    else:
        worst = max(r["max_rel"] for _, r in c["models"])
        w(f"- (c) Retest: {yn(c['pass'], 'holds', 'missed')} (largest relative deviation {worst:.2e})")
    for key, ok in h0["d"].items():
        med = {o: results[key]["mass"][o][0] for o in ORDERS}
        w(f"- (d) {key}: {yn(ok, 'holds', 'format not met')} (median label mass ER {f3(med['ER'])}, RE {f3(med['RE'])})")
    w(f"- Verdict H0: **{h0['verdict']}**" + ("; no model run counts." if h0["verdict"] == "refuted" else ""))
    w("")
    # H1
    w("## H1 (core): reversal of the ranking by Acc and GA")
    w("Criterion: reversal means one-sided ΔAcc > 0 and ΔGA < 0 (oriented by ΔAcc), intersection-union p = max(p₁, p₂), Holm over k pairs. Refuted if no pair shows a reversal after Holm.")
    w("")
    pairs = ctx["pairs"]
    if pairs:
        w(f"| Pair (x ≥ y by Acc) | ΔAcc | ΔGA | CI ΔGA (1−α/k) | p (IUT) | p Holm | Reversal |")
        w("|---|---|---|---|---|---|---|")
        for r in pairs:
            w(f"| {r['model_x']} vs {r['model_y']} | {pp(r['d_acc'])} | {pp(r['d_ga'])} | [{pp(r['d_ga_lo'])}, {pp(r['d_ga_hi'])}] | {f3(r['p_ga'])} | {f3(r['p_holm_ga'])} | {'yes' if r['reversal'] else 'no'} |")
        any_rev = any(r["reversal"] for r in pairs)
        w("")
        w(f"Verdict H1: **{yn(any_rev)}** ({sum(r['reversal'] for r in pairs)} of {len(pairs)} pairs with a reversal).")
        if not any_rev:
            X = max(r["reversal_ub_pp"] for r in pairs)
            w(f"Reading: \"No reversal detectable. We rule out reversals of more than {X:.1f} percentage points GA for these models and this task.\" (X = largest upper bound of −ΔGA, level 1−α/k one-sided.)")
    else:
        w("No pairs can be evaluated (fewer than two ranked models, or pairs not resolvable). Verdict H1: **untested**.")
    w("")
    w("### H1 decomposition (reported)")
    w("| Pair | ΔGA_inv | p Holm | Reversal (inv) | ΔGA_sens | p Holm | Reversal (sens) |")
    w("|---|---|---|---|---|---|---|")
    for r in pairs:
        w(f"| {r['model_x']} vs {r['model_y']} | {pp(r['d_ga_inv'])} | {f3(r['p_holm_inv'])} | {'yes' if r['reversal_inv'] else 'no'} | {pp(r['d_ga_sens'])} | {f3(r['p_holm_sens'])} | {'yes' if r['reversal_sens'] else 'no'} |")
    w("")
    w("### H1 check (reported): raw decision (ER only), option swap RE as an invariance variant")
    w("| Pair | ΔAcc raw | ΔGA raw | p Holm | Reversal raw |")
    w("|---|---|---|---|---|")
    for r in pairs:
        w(f"| {r['model_x']} vs {r['model_y']} | {pp(r['d_acc_raw'])} | {pp(r['d_ga_raw'])} | {f3(r['p_holm_raw'])} | {'yes' if r['reversal_raw'] else 'no'} |")
    if ctx["tau"] is not None:
        w("")
        w(f"Kendall τ Acc rank vs GA rank (descriptive): {ctx['tau']:.3f}; averaged vs raw Acc ranking: {ctx['tau_raw']:.3f}. If the averaged and the raw ranking differ, that is the measurement-chain finding.")
    w("")
    w("### H1b (reported): ΔAcc significant, ΔGA not")
    for r in pairs:
        w(f"- {r['model_x']} vs {r['model_y']}: {'yes' if r['h1b'] else 'no'} (p Acc {f3(r['p_acc'])}, p GA {f3(r['p_ga'])})")
    w("")
    # H2
    w("## H2 (descriptive): the margin reacts more strongly to decisive than to irrelevant changes")
    w("No refutation criterion. d_a = (median|Δm*_a| − median|Δm*_placebo_a|) / MAD(Δm*_placebo_a), bootstrap CI (95 %).")
    w("")
    w("| Model | " + " | ".join(AXES + ["decisive"]) + " |")
    w("|---|" + "---|" * (len(AXES) + 1))
    for m in ctx["models"]:
        h = results[m.key]["h2"]
        w(f"| {m.key} | " + " | ".join(f"{f3(h[x][0])} [{f3(h[x][1])}, {f3(h[x][2])}]" for x in AXES + ["decisive"]) + " |")
    w("")
    # H3
    w("## H3 (invariance per axis) and H3-P (against wording noise)")
    w("Criterion H3: exact McNemar (one-sided, irr flips more often than placebo), Holm over 4 axes per model, α = 0.05. Criterion H3-P: one-sided bootstrap test of mean d = flip_a − ½(flip_para1 + flip_para2) > 0, Holm over 4 axes per model. Stage rule: an axis \"has an effect\" only if both H3 and H3-P hold.")
    w("")
    w("| Model | Axis | flip | Placebo | Paraphrase | Excess | p H3 (Holm) | Excess para | p H3-P (Holm) | Reading |")
    w("|---|---|---|---|---|---|---|---|---|---|")
    h3_any = h3p_any = False
    for m in ctx["models"]:
        if m.is_baseline:
            continue
        for a in results[m.key]["axis"]:
            h3_any |= a["h3_sig"]
            h3p_any |= a["h3p_sig"]
            w(f"| {m.key} | {a['axis']} | {pp(a['flip_irr'])} | {pp(a['flip_placebo'])} | {pp(a['flip_para'])} | {pp(a['excess'])} | {f3(a['p_h3_holm'])} | {pp(a['excess_para'])} | {f3(a['p_h3p_holm'])} | {a['reading']} |")
    w("")
    w(f"Verdict H3: **{yn(h3_any)}**. Verdict H3-P: **{yn(h3p_any)}**.")
    w("")
    for m in ctx["models"]:
        if m.is_baseline:
            continue
        for a in results[m.key]["axis"]:
            cv = results[m.key]["cov"].get(a["axis"])
            if a["h3_sig"] and cv and cv[1] <= 0:
                w(f"- {m.key}, axis {a['axis']}: H3 holds, but not under covariates (CI of the irr effect contains 0): explainable by token length or boundary proximity.")
    w("")
    w("### H3 check (reported): origin or rarity")
    for m in ctx["models"]:
        if m.is_baseline:
            continue
        o = results[m.key]["origin"]
        if o is None:
            w(f"- {m.key}: not computable.")
            continue
        w(f"- {m.key}: placebo flip rate of the origin axis de {pp(o['de'])}, tr {pp(o['tr'])}, difference {pp(o['diff'])} [{pp(o['ci'][0])}, {pp(o['ci'][1])}]"
          + ("; **origin or rarity, not separated**." if o["p"] <= ALPHA else "."))
    w("")
    # H4
    w("## H4 (replication): fp32 → q8 flips more than the placebo")
    w("Criterion: flip rate fp32 → q8 on base and decisive against the pooled placebo flip rate (fp32), exact one-sided McNemar (paired per case and slot with a fixed placebo axis), Holm over the models. Refuted if flip rate ≤ placebo flip rate.")
    w("")
    if ctx["h4"]:
        w("| Model | Flip rate q8 | Placebo flip rate | p (Holm) | ΔAcc q8−fp32 | Verdict |")
        w("|---|---|---|---|---|---|")
        for r in ctx["h4"]:
            w(f"| {r['model']} | {pp(r['flip_q8'])} | {pp(r['flip_placebo'])} | {f3(r['p_holm'])} | {pp(r['d_acc'])} | {yn(r['holds'])} |")
    else:
        w("No model with an fp32 and a q8 run: **untested**.")
    w("")
    # sections for the reported measures
    w("## Place bias, label mass, robustness arm, calibration, bound (reported)")
    w("| Model | σ | Raw decision ≠ averaged | π_ID | π_pos | 4-fold = 2-fold | Mass median ER/RE | Word ≙ logprob | Greedy ≙ logprob | ECE | Bound |")
    w("|---|---|---|---|---|---|---|---|---|---|---|")
    for m in ctx["models"]:
        r = results[m.key]
        pi_ = r["pi"]
        rb = r["robust"]
        w("| " + " | ".join([
            m.key, f3(r["summ"]["sigma"][0]), pp(r["summ"]["raw_diff"][0]),
            f3(pi_["pi_id"][0]) if pi_ else "–", f3(pi_["pi_pos"][0]) if pi_ else "–", pp(pi_["agree"][0]) if pi_ else "–",
            f"{f3(r['mass']['ER'][0])}/{f3(r['mass']['RE'][0])}",
            pp(rb["word"][0]) if "word" in rb else "–", pp(rb["greedy"][0]) if "greedy" in rb else "–",
            f3(r["ece"]), ("ok" if r["bound"]["ok"] else "VIOLATED") + f" (≤ {f3(r['bound']['bound'])})",
        ]) + " |")
    w("")
    low = [(m.key, kind, results[m.key]["robust"][kind][0]) for m in ctx["models"] for kind in results[m.key]["robust"] if results[m.key]["robust"][kind][0] < 0.9]
    for key, kind, v in low:
        w(f"- {key}: agreement ({kind}) {pp(v)} below 90 %: here the logprob decision is called \"the logprob preference\", not \"the model's decision\".")
    for m in ctx["models"]:
        pi_ = results[m.key]["pi"]
        if pi_ and pi_["agree"][0] < 0.99:
            w(f"- {m.key}: the 4-fold averaged and the 2-fold averaged decision agree only {pp(pi_['agree'][0])} (expected ≥ 99 %): hint of a non-additive place effect.")
    w("")
    w("## Assumptions")
    w("- Retest (H0c): duplicate `prompt_id` of the same model in the given score directories count as a retest, the first row is the measurement. Relative deviation = |Δ| / max(|l|, 1).")
    w("- H3 uses the one-sided exact McNemar (P(X ≥ b), X ~ Bin(b+c, ½)); the two-sided statsmodels value is in `flips.csv`.")
    w("- Bound check: v = number of base cases in which base and decisive get the same decision (a tie counts as a decision).")
    w(f"- Tie: |m*| ≤ {TIE_EPS:g} counts as a tie and as wrong.")
    w("- CIs shown in `metrics.csv` and H2/H3 are 95 %; in `pairs.csv` they have level 1−α/k (Bonferroni).")
    return "\n".join(L) + "\n"


# --------------------------------------------------------------------------- CLI


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--items", required=True, help="generate output (items.jsonl)")
    ap.add_argument("--scores", required=True, nargs="+", help="score directories (or scores.jsonl files)")
    ap.add_argument("--k", type=int, choices=(5, 15), required=True)
    ap.add_argument("--pairs", help="pairs.json (the pre-registered k=5 pairs)")
    ap.add_argument("--seed", type=int, default=DEFAULT_SEED)
    ap.add_argument("--out", required=True)
    ap.add_argument("--n-boot", type=int, default=DEFAULT_BOOT, help="bootstrap draws (main run: 10000)")
    args = ap.parse_args(argv)
    analyse(args.items, args.scores, args.k, args.pairs, args.seed, args.out, args.n_boot)
    print(f"wrote {args.out}/report.md, metrics.csv, pairs.csv, flips.csv")
    return 0


if __name__ == "__main__":
    sys.exit(main())
