"""AP7 acceptance: simulated power against the normal approximation, decision line."""

import numpy as np
import pytest

import synth as S


@pytest.fixture(scope="module")
def pilot_paths(tmp_path_factory):
    root = tmp_path_factory.mktemp("pilot")
    n = 192
    items, ref = S.make_items(n)
    models = {}
    for i, (mid, n_ga, n_both, n_one) in enumerate((("P1", 80, 40, 30), ("P2", 60, 40, 40))):
        rng = np.random.default_rng(100 + i)
        ba, da, ia = S.outcome_flags(rng, n, n_ga, n_both, n_one)
        plc = rng.random((n, 4)) < 0.05
        para = rng.random((n, 2)) < 0.08
        dec = S.decisions_from_flags(ref, ba, da, ia, plc, para)
        models[mid] = S.make_scores(items, dec, mid)
    return S.write_dataset(str(root), items, models, "pilot")


def test_ap7_1_h1_power_matches_normal_approximation(power, pilot_paths):
    pilot = power.load_pilot(*pilot_paths)
    rng = np.random.default_rng(11)
    N, delta, sims, boot = 192, 0.10, 400, 1000
    sim = power.simulate_h1(pilot, N, delta, sims, boot, rng)
    assert abs(sim["shortfall"]) <= 0.005
    got = power.power_at(sim["p"], 1)
    se_acc = np.std(sim["d_acc"], ddof=1)
    se_ga = np.std(sim["d_ga"], ddof=1)
    rho = np.corrcoef(sim["d_acc"], -sim["d_ga"])[0, 1]
    ref = power.normal_power(sim["d_acc"].mean(), sim["d_ga"].mean(), se_acc, se_ga, rho, k=1)
    assert abs(got - ref) <= 0.05, (got, ref)


def test_ap7_1_power_decreases_with_k(power, pilot_paths):
    pilot = power.load_pilot(*pilot_paths)
    sim = power.simulate_h1(pilot, 192, 0.10, 200, 500, np.random.default_rng(12))
    p1, p5, p15 = (power.power_at(sim["p"], k) for k in (1, 5, 15))
    assert p1 >= p5 >= p15


def test_ap7_2_decision_line_in_report(power, pilot_paths, tmp_path):
    res = power.run_power(*pilot_paths, str(tmp_path / "pw"), 20261115, 20, 100)
    md = (tmp_path / "pw" / "power.md").read_text(encoding="utf-8")
    assert "Decision: N = " in md
    assert (tmp_path / "pw" / "power.csv").exists()
    assert res["decision"]["N"] in power.NS and res["decision"]["k"] in (5, 15)


def test_ap7_decide_rules(power):
    t = {(N, d, k): 0.0 for N in power.NS for d in power.DELTAS for k in power.KS}
    assert power.decide(t)["rule"] == "3"
    t[(384, 10, 15)] = 0.9
    assert power.decide(t) == {"N": 384, "k": 15, "delta80": 10, "rule": "1"}
    t[(384, 10, 15)] = 0.0
    t[(576, 8, 5)] = 0.85
    assert power.decide(t)["rule"] == "2" and power.decide(t)["N"] == 576
