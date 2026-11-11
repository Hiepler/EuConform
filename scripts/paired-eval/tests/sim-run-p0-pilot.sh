#!/usr/bin/env bash
# Simulates scripts/paired-eval/run-p0-pilot.sh without models: the real `generate` and `baseline`,
# a fake `run` (tests/fake-cli.mjs) that writes run.json and scores.jsonl in the real formats.
# Checks the P0 commit, resume after kill/abort, both abort rules and the STOP guards.
#   REAL_CLI="tsx packages/cli/src/index.ts" PY=/path/to/python bash scripts/paired-eval/tests/sim-run-p0-pilot.sh
set -uo pipefail
REPO=$(cd "$(dirname "$0")/../../.." && pwd)
: "${REAL_CLI:?set REAL_CLI, e.g. 'tsx packages/cli/src/index.ts'}"
: "${PY:?set PY to a python with the requirements installed}"
export REAL_CLI PY
FAKE="node $REPO/scripts/paired-eval/tests/fake-cli.mjs"
ROOT=${SIM_DIR:-$(mktemp -d)}
M=docs/measurements/2026-11-paired-eval
fail=0
ok() { echo "ok   $1"; }
bad() { echo "FAIL $1"; fail=1; }
check() { local name=$1; shift; if "$@" >/dev/null 2>&1; then ok "$name"; else bad "$name"; fi; }

new_sandbox() { # $1 name; stage 1 text is committed unless $2 = nofreeze
  for d in "$ROOT"/*/; do [ "$(basename "$d")" = happy ] || rm -rf "$d"; done; SB=$ROOT/$1; rm -rf "$SB"; mkdir -p "$SB"; cd "$SB"
  git init -q . && git config user.email sim@example.invalid && git config user.name sim
  mkdir -p docs scripts; cp -R "$REPO/docs/prereg" docs/prereg; cp -R "$REPO/scripts/paired-eval" scripts/paired-eval
  [ "${2:-}" = nofreeze ] && sed -i 's/stage 1 frozen/stage 1 open/' docs/prereg/2026-11-fosdem-paired-eval.md
  git add -A && git commit -qm base
}
go() { CLI="$FAKE" bash scripts/paired-eval/run-p0-pilot.sh >"$SB/out.log" 2>&1; echo $? >"$SB/rc"; }
rc() { cat "$SB/rc"; }
logged() { grep -q -- "$1" "$SB/out.log"; }
nrows() { wc -l <"$1/scores.jsonl" | tr -d ' '; }

echo "# 1 happy path"
new_sandbox happy; go
check "exit 0" test "$(rc)" = 0
check "P0 commit exists" git log --oneline -1 --grep "freeze label tokens"
check "config tracked" git ls-files --error-unmatch scripts/paired-eval/paired-eval.config.json
check "P0 DONE before pilot" bash -c "grep -n 'P0 DONE' out.log | head -1 | cut -d: -f1 > a; grep -n 'PILOT DONE' out.log | cut -d: -f1 > b; test \"\$(cat a)\" -lt \"\$(cat b)\""
check "PILOT DONE" logged "PILOT DONE"
check "H0 line printed" logged "Verdict H0: \*\*holds\*\*"
check "qwen3 frozen to space, llama to plain" node -e 'const c=require("./scripts/paired-eval/paired-eval.config.json").models;process.exit(c["onnx-community/Qwen3-1.7B-ONNX"].label_tokens[0]===" A"&&c["onnx-community/Llama-3.2-1B-Instruct-ONNX"].label_tokens[0]==="A"?0:1)'
check "8 pilot runs complete" test "$(grep -l '"status": "complete"' $M/pilot/runs/*/run.json | wc -l | tr -d ' ')" = 8
check "no decomp skip file" test ! -e $M/p0/pilot-skip-decomp
check "pilot used frozen config (source=config)" grep -q '"source": "config"' $M/pilot/runs/qwen3-1.7b-main/run.json
if [ -s "$SB/out.log" ]; then :; fi
HAPPY=$SB

echo "# 2 second start skips everything"
cd "$HAPPY"; before=$(git rev-parse HEAD); go
check "exit 0" test "$(rc)" = 0
check "P0 skipped" logged "P0 already committed"
check "all runs skipped" bash -c "test \$(grep -c '^skip ' out.log) = 8"
check "no new commit" test "$(git rev-parse HEAD)" = "$before"

echo "# 3 power simulation reads the pilot folders"
cd "$HAPPY"
$PY -I scripts/paired-eval/power.py --items $M/pilot/main/items.jsonl \
  --scores $M/pilot/runs/qwen3-1.7b-main $M/pilot/runs/llama-3.2-1b-main --out "$ROOT/power" >"$ROOT/power.log" 2>&1
check "power.py exit 0" test $? -eq 0
check "power.md has a decision" grep -q "^Decision:" "$ROOT/power/power.md"

echo "# 4 kill during the pilot, then restart"
new_sandbox killpilot
FAKE_KILL_AFTER="500:pilot/runs/llama-3.2-1b-main" go
check "first start died" test "$(rc)" != 0
check "P0 was committed before" git ls-files --error-unmatch scripts/paired-eval/paired-eval.config.json
check "killed run left status running" grep -q '"status": "running"' $M/pilot/runs/llama-3.2-1b-main/run.json
check "partial rows" test "$(nrows $M/pilot/runs/llama-3.2-1b-main)" = 500
go
check "restart exit 0" test "$(rc)" = 0
check "restart resumed" logged "== .* start $M/pilot/runs/llama-3.2-1b-main"
check "restart skipped qwen main" logged "skip $M/pilot/runs/qwen3-1.7b-main"
check "no duplicate rows" test "$(sort $M/pilot/runs/llama-3.2-1b-main/scores.jsonl | uniq -d | wc -l | tr -d ' ')" = 0
check "all rows present" test "$(nrows $M/pilot/runs/llama-3.2-1b-main)" = 2304
check "resumed_at recorded" bash -c "grep -A1 resumed_at $M/pilot/runs/llama-3.2-1b-main/run.json | grep -q Z"

echo "# 5 scorer error (abort) during P0, then restart"
new_sandbox abortp0
FAKE_ABORT_AFTER="100:p0/llama-3.2-1b-plain" go
check "exit non-zero" test "$(rc)" != 0
check "no P0 commit" bash -c "! git ls-files --error-unmatch scripts/paired-eval/paired-eval.config.json"
check "aborted status" grep -q '"status": "aborted"' $M/p0/llama-3.2-1b-plain/run.json
go
check "restart exit 0" test "$(rc)" = 0
check "P0 committed after restart" git ls-files --error-unmatch scripts/paired-eval/paired-eval.config.json
check "PILOT DONE" logged "PILOT DONE"

echo "# 6 abort rule pilot: latency above 6000 ms skips decomp"
new_sandbox slow
FAKE_LATENCY_MS=7000 go
check "exit 0" test "$(rc)" = 0
check "skip marker committed" git ls-files --error-unmatch $M/p0/pilot-skip-decomp
check "decomp skipped message" logged "decomp skipped (abort rule)"
check "no decomp run dirs" bash -c "! ls -d $M/pilot/runs/*-decomp"
check "PILOT DONE" logged "PILOT DONE"

echo "# 7 abort rule H0: retest deviates, stop before commit"
new_sandbox h0
FAKE_RETEST_NOISE=1 go
check "exit 2" test "$(rc)" = 2
check "STOP message" logged "STOP: H0 does not hold"
check "nothing committed" bash -c "! git ls-files --error-unmatch scripts/paired-eval/paired-eval.config.json && test \$(git log --oneline | wc -l) = 1"
check "no pilot started" test ! -e $M/pilot

echo "# 8 guards"
new_sandbox open nofreeze; git add -A; git commit -qm x; go
check "stage 1 not frozen stops" logged "STOP: stage 1 not committed"
new_sandbox dirty; echo x >>docs/prereg/2026-11-fosdem-paired-eval.md; go
check "dirty tree stops" logged "STOP: uncommitted changes"
new_sandbox cfgdrift; go; echo '{"models":{}}' >scripts/paired-eval/paired-eval.config.json; go
check "changed config stops" logged "STOP: uncommitted changes"

[ $fail = 0 ] && echo "ALL OK" || { echo "FAILURES"; exit 1; }
