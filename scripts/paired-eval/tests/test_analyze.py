"""AP6 acceptance (messplan v2.1): reversal, place bias, paraphrase control, McNemar, determinism."""

import csv
import hashlib
import math

import numpy as np
import pytest

import synth as S

B = 2000  # bootstrap draws in tests (main run: 10000)
N = 384


def no_flips(n):
    return np.zeros((n, 4), dtype=bool), np.zeros((n, 4), dtype=bool), np.zeros((n, 2), dtype=bool)


def run(analyze, tmp_path, name, items, models, k=1, n_boot=B, pairs=None, seed=20261115):
    ip, dirs = S.write_dataset(str(tmp_path), items, models, name)
    out = str(tmp_path / name / "out")
    ctx = analyze.analyse(ip, dirs, k, pairs, seed, out, n_boot)
    return ctx, out


def model_rows(items, ref, flags, model_id, **kw):
    base_ok, dec_ok, irr, plc, para = flags
    dec = S.decisions_from_flags(ref, base_ok, dec_ok, irr, plc, para)
    return S.make_scores(items, dec, model_id, **kw)


def read_csv(path):
    with open(path, encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def metric(out, model, subset, name):
    for r in read_csv(out + "/metrics.csv"):
        if r["model"] == model and r["subset"] == subset and r["metric"] == name:
            return float(r["value"]) if r["value"] != "" else math.nan
    raise KeyError((model, subset, name))


def reversal_models(items, ref, rng, x, y):
    out = {}
    for mid, (n_ga, n_both, n_one) in (("X", x), ("Y", y)):
        base_ok, dec_ok, irr = S.outcome_flags(rng, N, n_ga, n_both, n_one)
        _, plc, para = no_flips(N)
        out[mid] = model_rows(items, ref, (base_ok, dec_ok, irr, plc, para), mid)
    return out


# --- AP6.2 ---------------------------------------------------------------------------------


def test_ap6_2_built_in_reversal_detected(analyze, tmp_path):
    """X: Acc 0.80, GA 0.30; Y: Acc 0.70, GA 0.50 (N = 384): reversal after Holm."""
    items, ref = S.make_items(N)
    rng = np.random.default_rng(1)
    models = reversal_models(items, ref, rng, (115, 150, 84), (192, 50, 54))
    ctx, out = run(analyze, tmp_path, "rev", items, models)
    px = ctx["results"]["X|fp32"]["summ"]
    py = ctx["results"]["Y|fp32"]["summ"]
    assert px["acc"][0] == pytest.approx(0.80, abs=0.002) and px["ga"][0] == pytest.approx(0.30, abs=0.003)
    assert py["acc"][0] == pytest.approx(0.70, abs=0.002) and py["ga"][0] == pytest.approx(0.50, abs=0.003)
    (pair,) = [r for r in read_csv(out + "/pairs.csv")]
    assert pair["model_x"] == "X|fp32" and pair["reversal"] == "1"
    assert float(pair["p_holm_ga"]) <= 0.05
    report = open(out + "/report.md", encoding="utf-8").read()
    assert "Verdict H1: **holds**" in report


def test_ap6_2_no_reversal_gives_finite_x(analyze, tmp_path):
    """Same Acc ordering, GA ordering agrees: no reversal, finite X."""
    items, ref = S.make_items(N)
    rng = np.random.default_rng(2)
    models = reversal_models(items, ref, rng, (192, 50, 54), (115, 150, 84))  # X: GA .5 / Acc .7, Y: GA .3 / Acc .8
    # rename so that the higher-Acc model has the higher GA: swap roles
    models = {"X": models["X"], "Y": models["Y"]}
    base_ok, dec_ok, irr = S.outcome_flags(rng, N, 192, 100, 40)  # Acc 0.8333, GA 0.5
    _, plc, para = no_flips(N)
    models["X"] = model_rows(items, ref, (base_ok, dec_ok, irr, plc, para), "X")
    base_ok, dec_ok, irr = S.outcome_flags(rng, N, 115, 100, 84)  # Acc 0.70, GA 0.30
    models["Y"] = model_rows(items, ref, (base_ok, dec_ok, irr, plc, para), "Y")
    ctx, out = run(analyze, tmp_path, "norev", items, models)
    (pair,) = read_csv(out + "/pairs.csv")
    assert pair["reversal"] == "0"
    x = float(pair["reversal_ub_pp"])
    assert math.isfinite(x)
    report = open(out + "/report.md", encoding="utf-8").read()
    assert "Verdict H1: **refuted**" in report and "No reversal detectable" in report


def test_ap6_2_k15_uses_all_pairs(analyze, tmp_path):
    items, ref = S.make_items(N)
    rng = np.random.default_rng(3)
    models = {}
    for mid, n_ga in (("A", 100), ("B", 140), ("C", 180)):
        base_ok, dec_ok, irr = S.outcome_flags(rng, N, n_ga, 100, 60)
        _, plc, para = no_flips(N)
        models[mid] = model_rows(items, ref, (base_ok, dec_ok, irr, plc, para), mid)
    ctx, out = run(analyze, tmp_path, "k15", items, models, k=15)
    rows = read_csv(out + "/pairs.csv")
    assert len(rows) == 3 and all(r["k"] == "15" for r in rows)


# --- AP6.3 ---------------------------------------------------------------------------------


def test_ap6_3_pure_a_preference_changes_raw_but_not_averaged_ranking(analyze, tmp_path):
    items, ref = S.make_items(N)
    rng = np.random.default_rng(4)
    _, plc, para = no_flips(N)
    bx, dx, ix = S.outcome_flags(rng, N, 150, 80, 80)  # weaker
    by, dy, iy = S.outcome_flags(rng, N, 300, 40, 20)  # stronger
    base = {
        "X": model_rows(items, ref, (bx, dx, ix, plc, para), "X"),
        "Y": model_rows(items, ref, (by, dy, iy, plc, para), "Y"),
    }
    biased = {
        "X": base["X"],
        "Y": model_rows(items, ref, (by, dy, iy, plc, para), "Y", bias=(10.0, 0.0, 0.0)),
    }
    _, out0 = run(analyze, tmp_path, "nobias", items, base)
    _, out1 = run(analyze, tmp_path, "abias", items, biased)
    for name in ("acc", "ga", "ga_inv", "ga_sens"):
        for m in ("X|fp32", "Y|fp32"):
            assert metric(out1, m, "all", name) == pytest.approx(metric(out0, m, "all", name), abs=1e-12)
    avg = metric(out1, "Y|fp32", "all", "acc") > metric(out1, "X|fp32", "all", "acc")
    raw_y = metric(out1, "Y|fp32", "all", "acc_raw")
    raw_x = metric(out1, "X|fp32", "all", "acc_raw")
    raw_y0 = metric(out0, "Y|fp32", "all", "acc_raw")
    assert avg and raw_y0 > metric(out0, "X|fp32", "all", "acc_raw")  # same order without bias
    assert raw_y < raw_x  # raw ranking reversed by the A preference
    assert metric(out1, "Y|fp32", "all", "sigma") > 9.0


# --- AP6.3a --------------------------------------------------------------------------------


@pytest.mark.parametrize(
    "bias,pi_id,pi_pos,legacy_shift",
    [
        ((0.0, 1.0, 0.0), 0.0, 1.0, 1.0),  # position: +1 nat for line 1
        ((1.0, 0.0, 0.0), 1.0, 0.0, 0.0),  # letter A
        ((0.0, 0.0, 1.0), 0.5, 0.5, 0.5),  # interaction A and line 1
    ],
)
def test_ap6_3a_place_bias_cancels_and_decomposes(analyze, tmp_path, bias, pi_id, pi_pos, legacy_shift):
    n = 96
    items, ref = S.make_items(n, decomp=True)
    rng = np.random.default_rng(5)
    base_ok, dec_ok, irr = S.outcome_flags(rng, n, 50, 20, 10)
    _, plc, para = (np.zeros((n, 4), bool), np.zeros((n, 4), bool), np.zeros((n, 2), bool))
    flags = (base_ok, dec_ok, irr, plc, para)
    clean = {"M": model_rows(items, ref, flags, "M")}
    biased = {"M": model_rows(items, ref, flags, "M", bias=bias)}
    ctx0, out0 = run(analyze, tmp_path, "p0", items, clean, n_boot=300)
    ctx1, out1 = run(analyze, tmp_path, "p1", items, biased, n_boot=300)
    m0, m1 = ctx0["results"]["M|fp32"]["pc"]["mstar"], ctx1["results"]["M|fp32"]["pc"]["mstar"]
    assert np.max(np.abs(m1 - m0)) <= 1e-12
    pi = ctx1["results"]["M|fp32"]["pi"]
    assert pi["pi_id"][0] == pytest.approx(pi_id, abs=1e-9)
    assert pi["pi_pos"][0] == pytest.approx(pi_pos, abs=1e-9)
    assert pi["agree"][0] == 1.0
    # counter-test: the old v2 averaging (letter swap at fixed content order) shifts m* by (2p + q) / 2
    assert pi["mstar_shift_v2"] == pytest.approx(legacy_shift, abs=1e-9)
    legacy = analyze.legacy_mstar(ctx1["models"][0])
    legacy0 = analyze.legacy_mstar(ctx0["models"][0])
    assert np.allclose(legacy - legacy0, legacy_shift, atol=1e-9)


# --- AP6.3b --------------------------------------------------------------------------------


def axis_dataset(rng, n, flip_irr, flip_plc, flip_para):
    base_ok = np.ones(n, dtype=bool)
    irr = np.zeros((n, 4), dtype=bool)
    plc = np.zeros((n, 4), dtype=bool)
    para = np.zeros((n, 2), dtype=bool)
    irr[:, 0] = S.exact_subset(rng, n, round(flip_irr * n))
    plc[:, 0] = S.exact_subset(rng, n, round(flip_plc * n))
    for j in range(2):
        para[:, j] = S.exact_subset(rng, n, round(flip_para * n))
    return base_ok, base_ok.copy(), irr, plc, para


@pytest.mark.parametrize(
    "flip_irr,flip_para,h3,h3p,reading",
    [
        (0.20, 0.20, True, False, "above the placebo, but not separable from wording noise"),
        (0.25, 0.05, True, True, "has an effect"),
    ],
)
def test_ap6_3b_h3_and_h3p(analyze, tmp_path, flip_irr, flip_para, h3, h3p, reading):
    items, ref = S.make_items(N)
    rng = np.random.default_rng(6)
    flags = axis_dataset(rng, N, flip_irr, 0.05, flip_para)
    ctx, out = run(analyze, tmp_path, f"ax{flip_irr}", items, {"M": model_rows(items, ref, flags, "M")})
    rows = {r["axis"]: r for r in read_csv(out + "/flips.csv")}
    g = rows["gender"]
    assert (g["h3_sig"] == "1") is h3
    assert (g["h3p_sig"] == "1") is h3p
    assert g["reading"] == reading
    assert float(g["flip_irr"]) == pytest.approx(flip_irr, abs=0.003)
    report = open(out + "/report.md", encoding="utf-8").read()
    assert f"| M|fp32 | gender |" in report and reading in report


# --- AP6.4 ---------------------------------------------------------------------------------


def test_ap6_4_mcnemar_matches_hand_calculation(analyze):
    # b = 7 (irr flips only), c = 2 (placebo flips only): n = 9
    two = 2 * (math.comb(9, 0) + math.comb(9, 1) + math.comb(9, 2)) / 2**9  # 92 / 512
    one = (math.comb(9, 7) + math.comb(9, 8) + math.comb(9, 9)) / 2**9  # 46 / 512
    assert analyze.mcnemar_two_sided(7, 2) == pytest.approx(two, abs=1e-12) == pytest.approx(0.1796875)
    assert float(analyze.mcnemar_one_sided(7, 2)) == pytest.approx(one, abs=1e-12) == pytest.approx(0.08984375)
    assert float(analyze.mcnemar_one_sided(0, 0)) == 1.0


def test_ap6_4_mcnemar_in_pipeline_uses_discordant_pairs(analyze, tmp_path):
    n = 96
    items, ref = S.make_items(n)
    base_ok = np.ones(n, dtype=bool)
    irr = np.zeros((n, 4), dtype=bool)
    plc = np.zeros((n, 4), dtype=bool)
    para = np.zeros((n, 2), dtype=bool)
    irr[:7, 0] = True  # irr only
    plc[7:9, 0] = True  # placebo only
    irr[9:12, 0] = plc[9:12, 0] = True  # both flip: concordant, ignored
    flags = (base_ok, base_ok.copy(), irr, plc, para)
    ctx, out = run(analyze, tmp_path, "mc", items, {"M": model_rows(items, ref, flags, "M")}, n_boot=300)
    g = {r["axis"]: r for r in read_csv(out + "/flips.csv")}["gender"]
    assert (g["b"], g["c"]) == ("7", "2")
    assert float(g["p_mcnemar_two_sided"]) == pytest.approx(0.1796875)
    assert float(g["p_h3"]) == pytest.approx(0.08984375)


# --- AP6.5 ---------------------------------------------------------------------------------


def test_ap6_5_byte_identical_metrics_for_same_seed(analyze, tmp_path):
    items, ref = S.make_items(96, decomp=True)
    rng = np.random.default_rng(7)
    ba, da, ia = S.outcome_flags(rng, 96, 50, 20, 10)
    plc = rng.random((96, 4)) < 0.05
    para = rng.random((96, 2)) < 0.1
    models = {"M": model_rows(items, ref, (ba, da, ia, plc, para), "M", n_tokens=lambda c, v: 100 + (c * 7 + v) % 5)}
    ip, dirs = S.write_dataset(str(tmp_path), items, models, "det")
    digests = []
    for i in range(2):
        out = str(tmp_path / f"o{i}")
        analyze.analyse(ip, dirs, 5, None, 123, out, 500)
        digests.append(hashlib.sha256(open(out + "/metrics.csv", "rb").read()).hexdigest())
    out = str(tmp_path / "o2")
    analyze.analyse(ip, dirs, 5, None, 124, out, 500)
    other = hashlib.sha256(open(out + "/metrics.csv", "rb").read()).hexdigest()
    assert digests[0] == digests[1]
    assert other != digests[0]  # the seed matters (bootstrap CIs)


def test_cli_runs_isolated(tmp_path):
    """The documented call `python3 -I analyze.py ...` works (no sibling import, no cwd import)."""
    import os
    import subprocess
    import sys

    items, ref = S.make_items(48)
    rng = np.random.default_rng(8)
    ba, da, ia = S.outcome_flags(rng, 48, 30, 8, 5)
    _, plc, para = no_flips(48)
    ip, dirs = S.write_dataset(str(tmp_path), items, {"M": model_rows(items, ref, (ba, da, ia, plc, para), "M")}, "cli")
    script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "analyze.py")
    out = str(tmp_path / "cli-out")
    r = subprocess.run(
        [sys.executable, "-I", script, "--items", ip, "--scores", *dirs, "--k", "5", "--seed", "20261115", "--out", out, "--n-boot", "300"],
        capture_output=True, text=True,
    )
    assert r.returncode == 0, r.stderr
    for f in ("report.md", "metrics.csv", "pairs.csv", "flips.csv"):
        assert os.path.exists(os.path.join(out, f))


# --- other checks of the instrument --------------------------------------------------------


def test_ties_count_as_wrong_and_constant_a_pattern(analyze, tmp_path):
    """Constant A: averaged m* = 0 everywhere -> Acc 0, raw (ER) Acc 0.5, sigma = log 9."""
    n = 48
    items, ref = S.make_items(n)
    rows = []
    for it in items:
        rows.append({**S.make_scores([it], np.ones((n, 12), dtype=int), "baseline:constant_a", mode="baseline", dtype=None)[0],
                     "l_a": math.log(0.9), "l_b": math.log(0.1), "mass": 1.0})
    ctx, out = run(analyze, tmp_path, "ca", items, {"c": rows}, n_boot=300)
    m = "baseline:constant_a"
    assert metric(out, m, "all", "acc") == 0.0
    assert metric(out, m, "all", "tie_share") == 1.0
    assert metric(out, m, "all", "acc_raw") == 0.5
    assert metric(out, m, "all", "sigma") == pytest.approx(math.log(9))


def test_label_mass_failure_is_not_ranked(analyze, tmp_path):
    n = 48
    items, ref = S.make_items(n)
    rng = np.random.default_rng(9)
    ba, da, ia = S.outcome_flags(rng, n, 30, 8, 5)
    _, plc, para = no_flips(n)
    rows = model_rows(items, ref, (ba, da, ia, plc, para), "thin")
    for r in rows:
        r["mass"] = 0.01
    ctx, out = run(analyze, tmp_path, "mass", items, {"thin": rows}, n_boot=300)
    assert "thin|fp32" in ctx["unranked"] and "thin|fp32" not in ctx["ranked"]
    assert "format not met" in open(out + "/report.md", encoding="utf-8").read()


def test_bound_check_holds(analyze, tmp_path):
    items, ref = S.make_items(N)
    rng = np.random.default_rng(10)
    ba, da, ia = S.outcome_flags(rng, N, 100, 100, 80)
    _, plc, para = no_flips(N)
    ctx, out = run(analyze, tmp_path, "bound", items, {"M": model_rows(items, ref, (ba, da, ia, plc, para), "M")}, n_boot=300)
    assert metric(out, "M|fp32", "all", "bound_ok") == 1.0
