#!/usr/bin/env python3
"""
Validate and optionally merge Chapter 5 explanation dataset into data/questions.json.

Usage:
  python validate_chapter5_explanations.py \
    --questions data/questions.json \
    --dataset chapter5_explanations_qcvn41_2024.json

  python validate_chapter5_explanations.py \
    --questions data/questions.json \
    --dataset chapter5_explanations_qcvn41_2024.json \
    --out data/questions.with-explanations.json
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import re
import sys
from pathlib import Path


PROTECTED_FIELDS = ("question", "options", "correct", "isLiet", "images", "chapter")


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def numbered_sign_labels(question: dict) -> list[str]:
    text = " ".join(
        [str(question.get("question", ""))]
        + [str(x) for x in question.get("options", [])]
    )
    labels = re.findall(r"\b(Biển|Vạch)\s+([1-4])\b", text, flags=re.I)
    nums = sorted({(kind.lower(), int(number)) for kind, number in labels})
    return [f"{kind.title()} {number}" for kind, number in nums]


def norm_label(s: str) -> str:
    return re.sub(r"\s+", " ", s.strip().lower())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--questions", required=True, type=Path)
    ap.add_argument("--dataset", required=True, type=Path)
    ap.add_argument("--out", type=Path)
    args = ap.parse_args()

    qroot = load_json(args.questions)
    ds = load_json(args.dataset)

    questions = qroot.get("questions", [])
    q_by_id = {int(q["id"]): q for q in questions}
    entries = ds.get("explanations", [])
    e_by_id = {int(e["id"]): e for e in entries}

    errors = []
    warnings = []

    # 1) Question bank structural checks
    ids = sorted(q_by_id)
    if ids != list(range(1, 601)):
        errors.append("Question bank phải có ID liên tục 1..600.")

    chapter5_ids = list(range(301, 486))
    missing_entries = [qid for qid in chapter5_ids if qid not in e_by_id]
    extra_entries = [qid for qid in e_by_id if qid not in chapter5_ids]
    if missing_entries:
        errors.append(f"Thiếu explanation IDs: {missing_entries}")
    if extra_entries:
        errors.append(f"Dataset có ID ngoài 301..485: {extra_entries}")

    if len(entries) != 185:
        errors.append(f"Dataset phải có 185 entry; hiện có {len(entries)}.")

    # 2) Optional source hash check
    expected_hash = (
        ds.get("sourceQuestionBank", {}).get("sha256")
        or ds.get("sourceQuestionBank", {}).get("sha256OfQuestionsJson")
    )
    actual_hash = sha256_file(args.questions)
    if expected_hash and expected_hash != actual_hash:
        warnings.append(
            "SHA-256 questions.json không trùng source dùng khi tạo dataset. "
            "Không tự merge production trước khi kiểm tra diff."
        )

    # 3) Answer-key invariants + required explanation structure
    visual_detected = 0
    visual_complete = 0
    for qid in chapter5_ids:
        q = q_by_id.get(qid)
        e = e_by_id.get(qid)
        if not q or not e:
            continue

        if e.get("correctIndex") != q.get("correct"):
            errors.append(
                f"Câu {qid}: correctIndex dataset={e.get('correctIndex')} "
                f"khác questions.json={q.get('correct')}."
            )

        options = q.get("options", [])
        ci = q.get("correct")
        if not isinstance(ci, int) or not (0 <= ci < len(options)):
            errors.append(f"Câu {qid}: correct index không hợp lệ.")
        elif e.get("correctAnswerText") != options[ci]:
            errors.append(
                f"Câu {qid}: correctAnswerText không khớp option hiện tại."
            )

        if not str(e.get("whyCorrect", "")).strip():
            errors.append(f"Câu {qid}: thiếu whyCorrect.")

        if not str(e.get("explanation", "")).strip():
            errors.append(f"Câu {qid}: thiếu explanation.")

        if not str(e.get("memoryTip", "")).strip():
            warnings.append(f"Câu {qid}: thiếu memoryTip.")

        needed = numbered_sign_labels(q)
        if q.get("chapter") == 5 and not e.get("signExplanations"):
            errors.append(f"Câu {qid}: thiếu visualExplanations.")
        if needed:
            visual_detected += 1
            provided = {
                norm_label(x.get("label", ""))
                for x in e.get("signExplanations", [])
                if isinstance(x, dict)
            }
            missing_labels = [
                label for label in needed if norm_label(label) not in provided
            ]
            if missing_labels:
                errors.append(
                    f"Câu {qid}: thiếu giải thích cho {', '.join(missing_labels)}."
                )
            else:
                visual_complete += 1

        for s in e.get("signExplanations", []):
            if not str(s.get("label", "")).strip():
                errors.append(f"Câu {qid}: signExplanations có label rỗng.")
            if not str(s.get("name", "")).strip():
                errors.append(f"Câu {qid}: {s.get('label', '?')} thiếu name.")
            if not str(s.get("meaning", "")).strip():
                errors.append(
                    f"Câu {qid}: {s.get('label', '?')} thiếu meaning."
                )

    # 4) Merge without mutating protected question-bank fields
    merged = copy.deepcopy(qroot)
    merged_by_id = {int(q["id"]): q for q in merged["questions"]}

    for qid in chapter5_ids:
        if qid not in e_by_id or qid not in merged_by_id:
            continue
        e = e_by_id[qid]
        q = merged_by_id[qid]

        q["explanation"] = {
            "summary": e.get("explanation", ""),
            "whyCorrect": e.get("whyCorrect", ""),
            "visualExplanations": [
                {
                    "label": s.get("label", ""),
                    **({"code": s["code"]} if str(s.get("code", "")).strip() else {}),
                    "name": s.get("name", ""),
                    "meaning": s.get("meaning", ""),
                }
                for s in e.get("signExplanations", [])
            ],
            "memoryTip": e.get("memoryTip", ""),
        }

    # Ensure merge preserved question/answer/image source fields byte-for-byte semantically.
    original_by_id = q_by_id
    for qid, mq in merged_by_id.items():
        oq = original_by_id[qid]
        for field in PROTECTED_FIELDS:
            if oq.get(field) != mq.get(field):
                errors.append(
                    f"Câu {qid}: merge làm thay đổi protected field '{field}'."
                )

    manual_ids = ds.get("validation", {}).get("manualValidationIds", [])
    confidence_counts = {}
    for e in entries:
        confidence_counts[e.get("confidence", "unknown")] = (
            confidence_counts.get(e.get("confidence", "unknown"), 0) + 1
        )

    print("=== VALIDATION REPORT ===")
    print(f"Question bank: {len(questions)} câu")
    print(f"Dataset Chapter 5: {len(entries)} entry")
    print(f"Numbered visual labels detected: {visual_detected}")
    print(f"Numbered visual labels explained completely: {visual_complete}")
    print(f"Confidence: {confidence_counts}")
    print(f"Needs manual validation: {len(manual_ids)}")
    if manual_ids:
        print("Manual validation IDs:", ", ".join(map(str, manual_ids)))

    if warnings:
        print("\nWARNINGS:")
        for w in warnings:
            print(" -", w)

    if errors:
        print("\nERRORS:")
        for err in errors:
            print(" -", err)
        print(f"\nFAILED: {len(errors)} error(s)")
        return 1

    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        with args.out.open("w", encoding="utf-8") as f:
            json.dump(merged, f, ensure_ascii=False, indent=2)
            f.write("\n")
        print(f"\nMerged file written: {args.out}")

    print("\nPASS: cấu trúc/answer-key/coverage hợp lệ.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
