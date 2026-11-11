# paired-eval analysis (AP6) and power simulation (AP7)

Setup (Python 3.12+): `python3.12 -m venv .venv && .venv/bin/pip install -r scripts/paired-eval/requirements.txt`.

Entry point and claim boundary: [`docs/paired-eval.md`](../../docs/paired-eval.md).
`run.json` is a versioned research artifact (`euconform.paired-eval.run/v1`), not an
EuConform evidence document.

    python3 -I scripts/paired-eval/analyze.py --items items.jsonl --scores <dir> [<dir>...] \
        --k 5|15 [--pairs scripts/paired-eval/pairs.json] [--seed 20261115] [--n-boot 10000] --out <dir>
    python3 -I scripts/paired-eval/power.py --items pilot-items.jsonl --scores <dir>... --out <dir> [--full]

`analyze.py` writes `metrics.csv` (deterministic for a fixed seed), `pairs.csv`, `flips.csv`, `report.md`.
`power.py` writes `power.csv` and `power.md` (last section: `Decision: N = …, k = …`).
Test mode runs 200 simulations x 400 draws; `--full` runs the pre-registered 2000 x 2000.

## pairs.json

    {
      "schema_version": 1,
      "models": { "<short name>": { "model_id": "<HF id or null>", "dtype": "fp32" } },
      "pairs_k5": [ { "a": "<short name>", "b": "<short name>", "role": "<text>" } ]
    }

Short names are resolved to the `model_id` in the score files (exact id, else a unique substring
match). Without a `pairs_k5` list (or with `--k 15`) all pairs of ranked models are used.
`gemma-1b` is a placeholder and has to be mapped to the real Gemma id.

Tests: `python3 -m pytest scripts/paired-eval/tests` (synthetic data, plus the baseline end-to-end
test through the `paired-eval generate` and `baseline` commands; it needs `tsx` on PATH or `EUCONFORM_CLI` and is skipped otherwise).
