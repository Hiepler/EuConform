#!/usr/bin/env bash
# P0 on dev, then the pilot (pre-registration stages 2 and the pilot runs), unattended.
# Usage from the repo root, see docs/prereg/2026-11-run-guide-macos.md step 4:
#   caffeinate -i bash scripts/paired-eval/run-p0-pilot.sh 2>&1 | tee -a ~/euconform-p0-pilot.log
# Safe to start again after an abort: finished runs are skipped, interrupted runs resume, and P0 is
# skipped once its commit exists. Written for macOS bash 3.2 (no bash 4 features).
set -eo pipefail
cd "$(git rev-parse --show-toplevel)"
CLI="${CLI:-node packages/cli/dist/index.js}"
PY="${PY:-$HOME/.venvs/euconform-pe/bin/python}"
M=docs/measurements/2026-11-paired-eval
CFG=scripts/paired-eval/paired-eval.config.json
QWEN3=onnx-community/Qwen3-1.7B-ONNX;            QWEN3_REV=3231b522c6e703b2f9b3cd8ea27426a1289a02f2
LLAMA=onnx-community/Llama-3.2-1B-Instruct-ONNX; LLAMA_REV=82ac69368916173bad498ad390290faab92d4fb0

sha() { shasum -a 256 "$1" | cut -d' ' -f1; }
want() { [ "$(sha "$1")" = "$2" ] || { echo "STOP: $1 has SHA $(sha "$1"), pre-registered $2"; exit 1; }; }
# run <model> <revision> <items> <out> [extra flags]: skips finished runs, resumes interrupted ones
run() {
  local out=$4 r=""
  if [ -f "$out/run.json" ] && grep -q '"status": "complete"' "$out/run.json"; then echo "skip $out (complete)"; return; fi
  [ -f "$out/run.json" ] && r="--resume"
  echo "== $(date '+%a %d.%m. %H:%M') start $out"
  $CLI paired-eval run --model "$1" --revision "$2" --dtype fp32 --set "$3" --out "$out" $r "${@:5}"
}
variant() { node -e 'const c=require(process.argv[1]);process.stdout.write(c.models[process.argv[2]].label_tokens[0]===" A"?"space":"plain")' "$PWD/$CFG" "$1"; }

grep -q "stage 1 frozen" docs/prereg/2026-11-fosdem-paired-eval.md || { echo "STOP: stage 1 not committed"; exit 1; }
git diff --quiet HEAD || { echo "STOP: uncommitted changes to tracked files"; exit 1; }

if git ls-files --error-unmatch "$CFG" >/dev/null 2>&1; then
  echo "P0 already committed, skipping to the pilot"
else
  # ---- P0 on dev
  $CLI paired-eval generate --split dev --seed dev --per-family 24 --out $M/dev
  want $M/dev/items.jsonl d88817d6d81c6edee668805cc19885257c2cdbeb7eac32e67425365e1f562084
  $CLI paired-eval baseline --name oracle --set $M/dev/items.jsonl --out $M/p0/baseline-oracle
  for v in plain space; do
    run $QWEN3 $QWEN3_REV $M/dev/items.jsonl $M/p0/qwen3-1.7b-$v --label-variant $v
    run $LLAMA $LLAMA_REV $M/dev/items.jsonl $M/p0/llama-3.2-1b-$v --label-variant $v
  done
  node scripts/paired-eval/choose-label-tokens.mjs --out "$CFG" $M/p0/*-plain $M/p0/*-space | tee $M/p0/label-choice.md
  run $QWEN3 $QWEN3_REV $M/dev/items.jsonl $M/p0/qwen3-1.7b-retest --config "$CFG" --limit 200
  run $LLAMA $LLAMA_REV $M/dev/items.jsonl $M/p0/llama-3.2-1b-retest --config "$CFG" --limit 200
  QV=$(variant $QWEN3); LV=$(variant $LLAMA)
  $PY -I scripts/paired-eval/analyze.py --items $M/dev/items.jsonl \
    --scores $M/p0/baseline-oracle $M/p0/qwen3-1.7b-$QV $M/p0/qwen3-1.7b-retest $M/p0/llama-3.2-1b-$LV $M/p0/llama-3.2-1b-retest \
    --k 15 --seed 20261115 --n-boot 2000 --out $M/p0/analysis
  grep "Verdict H0" $M/p0/analysis/report.md || true
  grep -q 'Verdict H0: \*\*holds\*\*' $M/p0/analysis/report.md || { echo "STOP: H0 does not hold on dev, see $M/p0/analysis/report.md"; exit 2; }
  rc=0
  node -e 'const fs=require("fs");let worst=0;for(const d of process.argv.slice(1)){const v=fs.readFileSync(d+"/scores.jsonl","utf8").split("\n").filter(Boolean).map(l=>JSON.parse(l).latency_ms).sort((a,b)=>a-b);const m=v[Math.floor(v.length/2)];worst=Math.max(worst,m);console.log(d+": median "+m+" ms per prompt, n="+v.length)}console.log("worst median "+worst+" ms; abort rule pilot: > 6000 ms");process.exit(worst>6000?3:0)' \
    $M/p0/qwen3-1.7b-$QV $M/p0/llama-3.2-1b-$LV | tee $M/p0/timing.txt || rc=$?
  if [ $rc -eq 3 ]; then echo "skip-decomp" > $M/p0/pilot-skip-decomp; elif [ $rc -ne 0 ]; then exit $rc; fi
  git add $M/dev $M/p0 "$CFG"
  git commit -m "chore(paired-eval): add P0 dev runs and freeze label tokens (pre-registration stage 2)"
  GIT_TERMINAL_PROMPT=0 git push || echo "push failed, push manually in step 5"
  echo "P0 DONE"
fi

# ---- Pilot
git ls-files --error-unmatch "$CFG" >/dev/null && git diff --quiet HEAD -- "$CFG" || { echo "STOP: label tokens not committed"; exit 1; }
$CLI paired-eval generate --split pilot --seed pilot --per-family 12 --out $M/pilot/main
$CLI paired-eval generate --split pilot --seed pilot --per-family 12 --arm word --out $M/pilot/word
$CLI paired-eval generate --split pilot --seed pilot --per-family 12 --arm decomp --out $M/pilot/decomp
node scripts/paired-eval/greedy-subset.mjs $M/pilot/main/items.jsonl $M/pilot/word/items.jsonl $M/pilot/greedy/items.jsonl
want $M/pilot/main/items.jsonl 16abe77edecd23f9931563c1893fb3facd1dfaee435bf04c959bdb91de6da74d
want $M/pilot/word/items.jsonl 85e0058c7499f75c1b77af7bb01998d0d6da95666e5175bd9e370ccae216fdf4
want $M/pilot/decomp/items.jsonl 163b385ac7c4043ee0dd33c6e0df62b445b4193910f2073def9ffa67b693dcdf
want $M/pilot/greedy/items.jsonl 10898f597b99178e0802083fa269cd6488b41c9a2d7cf3e00b5ff5ec20710b7c
for m in qwen3-1.7b llama-3.2-1b; do
  if [ $m = qwen3-1.7b ]; then ID=$QWEN3; REV=$QWEN3_REV; else ID=$LLAMA; REV=$LLAMA_REV; fi
  run $ID $REV $M/pilot/main/items.jsonl $M/pilot/runs/$m-main --config "$CFG"
done
for m in qwen3-1.7b llama-3.2-1b; do
  if [ $m = qwen3-1.7b ]; then ID=$QWEN3; REV=$QWEN3_REV; else ID=$LLAMA; REV=$LLAMA_REV; fi
  run $ID $REV $M/pilot/word/items.jsonl $M/pilot/runs/$m-word --mode seqlogprob
  run $ID $REV $M/pilot/greedy/items.jsonl $M/pilot/runs/$m-greedy --mode greedy --max-new-tokens 8 --config "$CFG"
  if [ -f $M/p0/pilot-skip-decomp ]; then echo "decomp skipped (abort rule)"; else
    run $ID $REV $M/pilot/decomp/items.jsonl $M/pilot/runs/$m-decomp --config "$CFG"; fi
done
for f in $M/pilot/runs/*/run.json; do grep -q '"status": "complete"' "$f" || { echo "STOP: unfinished run $f"; exit 1; }; done
echo "PILOT DONE $(date '+%a %d.%m. %H:%M')"
