"""AP2 acceptance (messplan v2.1): LLM-free baselines through the CLI and analyze.py.

Dev and pilot item sets are generated with `euconform paired-eval generate` (arms main and
decomp), scored with `euconform paired-eval baseline --name <x>` and analysed. The tests are
skipped when no TypeScript runner for the CLI is available (set EUCONFORM_CLI to override).
"""

import csv
import json
import math
import os
import shlex
import shutil
import subprocess

import pytest

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
CLI_ENTRY = os.path.join(REPO, "packages", "cli", "src", "index.ts")
BASELINES = ("oracle", "constant_a", "constant_first", "constant_routine", "coarse", "random")
SPLITS = {"dev": 24, "pilot": 12}  # base cases per family; seed = split name
LOG9 = math.log(9)
ALPHA_SEED = 20261115


def _cli_command():
    override = os.environ.get("EUCONFORM_CLI")
    if override:
        return shlex.split(override)
    tsx = shutil.which("tsx") or os.path.join(REPO, "node_modules", ".bin", "tsx")
    if os.path.exists(tsx) and os.path.exists(CLI_ENTRY):
        return [tsx, CLI_ENTRY]
    return None


CLI = _cli_command()
pytestmark = pytest.mark.skipif(CLI is None, reason="no CLI runner (tsx or EUCONFORM_CLI)")


def _cli(*args):
    res = subprocess.run(
        [*CLI, "paired-eval", *args], cwd=REPO, capture_output=True, text=True, timeout=300
    )
    assert res.returncode == 0, f"{args}: {res.stdout}\n{res.stderr}"


def _read_lines(path):
    with open(path, encoding="utf-8") as fh:
        return [line for line in fh.read().splitlines() if line]


@pytest.fixture(scope="module")
def runs(tmp_path_factory, analyze):
    """{split: {baseline: metrics rows}} with main and decomp arms analysed together."""
    root = tmp_path_factory.mktemp("baselines")
    out = {}
    for split, per_family in SPLITS.items():
        sets = []
        for arm in ("main", "decomp"):
            d = root / f"{split}-{arm}"
            _cli("generate", "--split", split, "--seed", split, "--per-family", str(per_family),
                 "--arm", arm, "--out", str(d))
            sets.append(d)
        items = root / f"{split}-items.jsonl"
        items.write_text("\n".join(l for d in sets for l in _read_lines(d / "items.jsonl")) + "\n",
                         encoding="utf-8")
        score_dirs = []
        for name in BASELINES:
            dirs = []
            for d in sets:
                s = root / f"{split}-{d.name}-{name}"
                _cli("baseline", "--name", name, "--set", str(d / "items.jsonl"), "--out", str(s))
                dirs.append(s)
            merged = root / f"{split}-scores-{name}"
            merged.mkdir()
            (merged / "scores.jsonl").write_text(
                "\n".join(l for s in dirs for l in _read_lines(s / "scores.jsonl")) + "\n",
                encoding="utf-8")
            score_dirs.append(str(merged))
        res = root / f"{split}-out"
        analyze.analyse(str(items), score_dirs, 5, None, ALPHA_SEED, str(res), 200)
        with open(res / "metrics.csv", encoding="utf-8") as fh:
            rows = list(csv.DictReader(fh))
        out[split] = rows
    return out


def _models(rows):
    return sorted({r["model"] for r in rows})


def _key(rows, name):
    keys = [m for m in _models(rows) if m.endswith(name)]
    assert len(keys) == 1, (name, _models(rows))
    return keys[0]


def _m(rows, name, metric, subset="all"):
    key = _key(rows, name)
    for r in rows:
        if r["model"] == key and r["subset"] == subset and r["metric"] == metric:
            return float(r["value"])
    raise KeyError((name, metric, subset))


def _flips(rows, name):
    key = _key(rows, name)
    return {
        (r["subset"], r["metric"]): float(r["value"])
        for r in rows
        if r["model"] == key and r["metric"] in ("flip", "flip_placebo", "flip_para", "flip_para_mean")
    }


@pytest.fixture(params=sorted(SPLITS))
def rows(request, runs):
    return runs[request.param]


def test_ap2_all_baselines_present(rows):
    for name in BASELINES:
        _key(rows, name)


def test_ap2_oracle_is_perfect(rows):
    for metric in ("acc", "ga", "ga_strict", "ga_inv", "ga_sens"):
        assert _m(rows, "oracle", metric) == pytest.approx(1.0), metric
    flips = _flips(rows, "oracle")
    assert flips
    assert all(v == 0 for v in flips.values()), flips
    assert flips[("variant=para1", "flip_para")] == 0
    assert flips[("variant=para2", "flip_para")] == 0


def test_ap2_constant_a(rows):
    assert _m(rows, "constant_a", "acc") == 0
    assert _m(rows, "constant_a", "tie_share") == 1
    assert _m(rows, "constant_a", "acc_raw") == pytest.approx(0.5)
    assert _m(rows, "constant_a", "pi_id", "decomp") == pytest.approx(LOG9, abs=1e-6)
    assert _m(rows, "constant_a", "pi_pos", "decomp") == pytest.approx(0, abs=1e-6)


def test_ap2_constant_first(rows):
    for metric in ("acc", "tie_share", "acc_raw"):
        assert _m(rows, "constant_first", metric) == pytest.approx(_m(rows, "constant_a", metric)), metric
    assert _m(rows, "constant_first", "pi_pos", "decomp") == pytest.approx(LOG9, abs=1e-6)
    assert _m(rows, "constant_first", "pi_id", "decomp") == pytest.approx(0, abs=1e-6)


@pytest.mark.parametrize("name", ["oracle", "constant_routine", "coarse"])
def test_ap2_paraphrases_do_not_flip(rows, name):
    flips = _flips(rows, name)
    assert flips[("variant=para1", "flip_para")] == 0
    assert flips[("variant=para2", "flip_para")] == 0
    assert flips[("all", "flip_para_mean")] == 0


def test_ap2_constant_routine(rows):
    assert _m(rows, "constant_routine", "acc") == pytest.approx(0.5)
    assert _m(rows, "constant_routine", "ga_inv") == pytest.approx(0.5)
    assert _m(rows, "constant_routine", "ga_sens") == 0
    assert _m(rows, "constant_routine", "ga") == 0


def test_ap2_random_is_near_chance(rows):
    assert 0.4 <= _m(rows, "random", "acc") <= 0.6


def test_ap2_baseline_output_format(runs, tmp_path):
    """Scores are one JSON object per prompt with model_id `baseline:<name>`."""
    _cli("generate", "--split", "dev", "--seed", "dev", "--per-family", "24", "--out", str(tmp_path / "i"))
    _cli("baseline", "--name", "oracle", "--set", str(tmp_path / "i" / "items.jsonl"), "--out", str(tmp_path / "s"))
    items = [json.loads(l) for l in _read_lines(tmp_path / "i" / "items.jsonl")]
    scores = [json.loads(l) for l in _read_lines(tmp_path / "s" / "scores.jsonl")]
    assert len(scores) == len(items)
    assert {s["model_id"] for s in scores} == {"baseline:oracle"}
