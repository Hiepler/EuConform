"""Synthetic items and scores in the `types.ts` formats, built from per-case outcomes.

A model is described by decisions (+1 escalate, -1 routine) per case and variant. The scores
carry content margin +-MU and an additive place effect s(letter, line) = a*[A] + p*[line 1]
+ q*[A and line 1] (messplan v2.1, section 5), so the averaged margin m* is exactly the
content margin and the place terms cancel.
"""

import json
import math
import os

import numpy as np

VARIANTS = [
    "base", "decisive", "irr-gender", "placebo-gender", "irr-origin", "placebo-origin",
    "irr-insurance", "placebo-insurance", "irr-order", "placebo-order", "para1", "para2",
]
FAMILIES = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8"]
STRATA = ["near", "mid", "far"]
MU = 2.0
MASS = 0.9


def make_items(n_cases, decomp=False, word=False):
    """Items of n_cases base cases; the reference of base alternates, decisive flips it."""
    rows, ref_base = [], []
    for i in range(n_cases):
        item_id = f"c{i:04d}"
        rb = 1 if (i // 2) % 2 == 0 else -1  # +1 escalate
        ref_base.append(rb)
        fam = FAMILIES[i % 8]
        stra = STRATA[(i // 8) % 3]
        grp = "de" if (i // 24) % 2 == 0 else "tr"
        for v in VARIANTS:
            ref = -rb if v == "decisive" else rb
            combos = [("main", "AB", "ER"), ("main", "AB", "RE")]
            if decomp and v in ("base", "decisive"):
                combos += [("decomp", "BA", "ER"), ("decomp", "BA", "RE")]
            if word and v in ("base", "decisive"):
                combos += [("word", "AB", "ER")]
            for arm, lo, oo in combos:
                rows.append({
                    "prompt_id": f"{item_id}|{v}|{oo}|{lo}|{arm}",
                    "item_id": item_id, "family": fam, "split": "pilot", "stratum": stra,
                    "distance": 0.1, "reference_content": "escalate" if ref == 1 else "routine",
                    "variant": v, "option_order": oo, "letter_order": lo, "arm": arm,
                    "reference_letter": None, "frame_ids": ["S1.w0", "S2.w0", "S3.w0"],
                    "decisive_var": "x", "decisive_value": 1.0, "name_group": grp,
                    "name_gender": "f", "first": "A", "last": "B", "age": 50,
                    "insurance": "statutory", "ward": "North", "value_order": [], "values": [],
                    "prompt": "p", "prompt_sha256": "0" * 64,
                })
    return rows, np.array(ref_base)


def decisions_from_flags(ref_base, base_ok, dec_ok, irr_flip, plc_flip, para_flip):
    """(N, 12) decisions: base/decisive follow the flags, other variants copy base unless flipped."""
    n = len(ref_base)
    dec = np.zeros((n, 12), dtype=int)
    dec[:, 0] = np.where(base_ok, ref_base, -ref_base)
    dec[:, 1] = np.where(dec_ok, -ref_base, ref_base)
    for a in range(4):
        dec[:, 2 + 2 * a] = np.where(irr_flip[:, a], -dec[:, 0], dec[:, 0])
        dec[:, 3 + 2 * a] = np.where(plc_flip[:, a], -dec[:, 0], dec[:, 0])
    for j in range(2):
        dec[:, 10 + j] = np.where(para_flip[:, j], -dec[:, 0], dec[:, 0])
    return dec


def _logs(d):
    """l_a, l_b with l_a - l_b = d and mass 0.9."""
    s = 1.0 / (1.0 + math.exp(-d))
    return math.log(MASS * s), math.log(MASS * (1.0 - s))


def make_scores(items, dec, model_id, bias=(0.0, 0.0, 0.0), dtype="fp32", mode="logprob", n_tokens=None, mu=MU):
    """Score rows for all items. bias = (a, p, q). `n_tokens(case, variant)` optional."""
    a, p, q = bias
    rows = []
    for it in items:
        if it["arm"] == "word":
            continue
        ci = int(it["item_id"][1:])
        vi = VARIANTS.index(it["variant"])
        d_c = dec[ci, vi]
        line1_a = it["letter_order"] == "AB"
        esc_line1 = it["option_order"] == "ER"
        esc_is_a = line1_a == esc_line1
        content_a = (d_c * mu / 2) * (1 if esc_is_a else -1)
        content_b = -content_a
        s_a = a + (p + q if line1_a else 0.0)
        s_b = p if not line1_a else 0.0
        d = (content_a + s_a) - (content_b + s_b)
        la, lb = _logs(d)
        mass = math.exp(la) + math.exp(lb)
        m = d if esc_is_a else -d
        decision = "escalate" if m > 0 else "routine" if m < 0 else "tie"
        rows.append({
            "prompt_id": it["prompt_id"], "mode": mode, "model_id": model_id, "revision": None,
            "dtype": dtype, "logits_dtype": None, "onnxruntime_version": None,
            "transformers_version": None, "intra_op_threads": 4, "inter_op_threads": 1,
            "thinking_mode": None, "template_sha256": None, "rendered_prompt_sha256": None,
            "n_tokens": None if n_tokens is None else n_tokens(ci, vi),
            "label_tokens": ["A", "B"], "label_token_ids": [1, 2], "l_a": la, "l_b": lb,
            "mass": mass, "l_escalate": None, "l_routine": None, "generated": None,
            "greedy_letter": None, "decision_content": decision,
            "reference_content": it["reference_content"], "latency_ms": 1.0, "cpu": None,
            "ram_bytes": None, "os": None,
        })
    return rows


def write_jsonl(path, rows):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        for r in rows:
            fh.write(json.dumps(r) + "\n")


def exact_subset(rng, n, count):
    m = np.zeros(n, dtype=bool)
    m[rng.permutation(n)[:count]] = True
    return m


def outcome_flags(rng, n, n_ga, n_both_flip, n_one):
    """Case outcome flags with exact counts: GA cases, both-ok but irr-flipped, exactly one ok."""
    order = rng.permutation(n)
    base_ok = np.zeros(n, dtype=bool)
    dec_ok = np.zeros(n, dtype=bool)
    irr_flip = np.zeros((n, 4), dtype=bool)
    ga = order[:n_ga]
    both = order[n_ga:n_ga + n_both_flip]
    one = order[n_ga + n_both_flip:n_ga + n_both_flip + n_one]
    base_ok[ga] = dec_ok[ga] = True
    base_ok[both] = dec_ok[both] = True
    irr_flip[both, rng.integers(0, 4, len(both))] = True
    half = len(one) // 2
    base_ok[one[:half]] = True
    dec_ok[one[half:]] = True
    return base_ok, dec_ok, irr_flip


def write_dataset(root, items, models, name):
    """models: {model_id: scores rows}. Returns (items_path, [score dirs])."""
    ip = os.path.join(root, name, "items.jsonl")
    write_jsonl(ip, items)
    dirs = []
    for i, (mid, rows) in enumerate(models.items()):
        d = os.path.join(root, name, f"scores-{i}")
        write_jsonl(os.path.join(d, "scores.jsonl"), rows)
        dirs.append(d)
    return ip, dirs
