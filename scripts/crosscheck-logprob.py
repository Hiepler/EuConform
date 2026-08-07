#!/usr/bin/env python3
"""
One-time independent cross-check of the BOS-fixed log-probability scoring against
PyTorch + Hugging Face `transformers` (gpt2), using the SAME BOS rule as the
TypeScript implementation: BOS is prepended explicitly (bos_token_id == eos_token_id
== 50256 for GPT-2), never scored itself, and every sentence token is scored via the
half-open span [1, n+1) using log_softmax(logits[j-1])[token[j]], SUMMED (not mean).

Because the checked-in fixture (packages/core/tests/inference/fixtures/logprob-golden.json)
stores a SHA-256 hash of the scored token ids rather than the raw ids, this script
first verifies that its own tokenization of each sentence (add_special_tokens=False,
via HF's gpt2 tokenizer) produces the exact same token ids the fixture was built from
(hash-for-hash) before comparing scores. This satisfies the "identical token
sequences, not just identical text" requirement: a coincidental score match on
different token ids would not pass the hash check.

Usage:
    python3 scripts/crosscheck-logprob.py

Prerequisites (CPU-only, in a disposable venv):
    python3 -m venv ~/.venvs/logprob-crosscheck
    source ~/.venvs/logprob-crosscheck/bin/activate
    pip install --index-url https://download.pytorch.org/whl/cpu torch
    pip install transformers numpy
"""
import hashlib
import json
import math
import os
import sys

FIXTURE_PATH = os.path.join(
    os.path.dirname(__file__), "..", "packages", "core", "tests", "inference",
    "fixtures", "logprob-golden.json",
)


def sha256_hex_of_ids(ids):
    # Must match JS's JSON.stringify exactly: no spaces after separators.
    compact = json.dumps(list(ids), separators=(",", ":"))
    return hashlib.sha256(compact.encode("utf-8")).hexdigest()


def main():
    try:
        import torch
        from transformers import GPT2LMHeadModel, GPT2Tokenizer
    except ImportError as exc:
        print(f"FAILED to import torch/transformers: {exc}", file=sys.stderr)
        print("This is a documented, non-fatal failure per the task spec: the "
              "synthetic offline test remains the truth anchor.", file=sys.stderr)
        sys.exit(1)

    with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
        fixture = json.load(f)

    tokenizer = GPT2Tokenizer.from_pretrained("gpt2")
    model = GPT2LMHeadModel.from_pretrained("gpt2")
    model.eval()

    bos_token_id = tokenizer.bos_token_id
    eos_token_id = tokenizer.eos_token_id
    assert bos_token_id == eos_token_id == 50256, (
        f"unexpected special token ids: bos={bos_token_id} eos={eos_token_id}"
    )

    print(f"model=gpt2 (HF) bos_token_id=eos_token_id={bos_token_id}")
    print(f"fixture modelId={fixture['modelId']} revision={fixture['revision']} "
          f"libraryVersion={fixture['libraryVersion']}")
    print()

    max_rel_diff = 0.0
    all_ok = True

    for entry in fixture["sentences"]:
        text = entry["text"]
        expected_score = entry["score"]
        expected_hash = entry["scoredTokenIdsHash"]

        sentence_ids = tokenizer.encode(text, add_special_tokens=False)
        actual_hash = sha256_hex_of_ids(sentence_ids)

        hash_match = actual_hash == expected_hash
        if not hash_match:
            print(f"[TOKEN MISMATCH] \"{text[:50]}\": "
                  f"hash {actual_hash} != fixture {expected_hash}")
            all_ok = False
            continue

        final_ids = [bos_token_id] + sentence_ids
        input_ids = torch.tensor([final_ids], dtype=torch.long)

        with torch.no_grad():
            outputs = model(input_ids)
            logits = outputs.logits[0]  # [seqLen, vocabSize]

        # Span [1, n+1): token at position j scored from logits at position j-1.
        total = 0.0
        for j in range(1, len(final_ids)):
            log_probs = torch.log_softmax(logits[j - 1], dim=-1)
            target_id = final_ids[j]
            total += log_probs[target_id].item()

        rel_diff = abs(total - expected_score) / abs(expected_score)
        max_rel_diff = max(max_rel_diff, rel_diff)
        status = "OK" if rel_diff < 0.01 else "MISMATCH"
        if rel_diff >= 0.01:
            all_ok = False

        print(f"[{status}] \"{text[:50]}{'...' if len(text) > 50 else ''}\"")
        print(f"    fixture score = {expected_score:.6f}")
        print(f"    python  score = {total:.6f}")
        print(f"    relative diff = {rel_diff * 100:.4f}%")
        print()

    print(f"max relative diff across all sentences: {max_rel_diff * 100:.4f}%")
    print("RESULT:", "PASS (< 1%)" if all_ok else "FAIL")
    sys.exit(0 if all_ok else 1)


if __name__ == "__main__":
    main()
