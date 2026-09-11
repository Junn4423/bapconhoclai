#!/usr/bin/env python3
"""Fail fast when required question explanations are missing or malformed."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path


QUESTION_PATH = Path(__file__).parents[1] / "data" / "questions.json"
VISUAL_LABEL_RE = re.compile(r"\b(Biển|Vạch)\s+([1-4])\b", re.IGNORECASE)


def labels_in_question(question: dict) -> list[str]:
    text = " ".join([str(question.get("question", ""))] + [str(option) for option in question.get("options", [])])
    labels = {(kind.lower(), int(number)) for kind, number in VISUAL_LABEL_RE.findall(text)}
    return [f"{kind.title()} {number}" for kind, number in sorted(labels)]


def main() -> int:
    try:
        root = json.loads(QUESTION_PATH.read_text(encoding="utf-8"))
    except Exception as error:
        print(f"FAILED: cannot read {QUESTION_PATH}: {error}")
        return 1

    questions = root.get("questions") if isinstance(root, dict) else None
    errors: list[str] = []
    if not isinstance(questions, list) or len(questions) != 600:
        errors.append("Question bank phải có đúng 600 câu.")
        questions = questions if isinstance(questions, list) else []

    ids = [question.get("id") for question in questions if isinstance(question, dict)]
    if ids != list(range(1, 601)):
        errors.append("Question bank phải có ID chính xác từ 1 đến 600.")

    for question in questions:
        if not isinstance(question, dict):
            errors.append("Question entry không phải object.")
            continue
        qid = question.get("id", "?")
        explanation = question.get("explanation")
        labels = labels_in_question(question)
        needs_explanation = question.get("chapter") == 5 or bool(labels)

        if not needs_explanation:
            continue
        if not isinstance(explanation, dict):
            errors.append(f"Question {qid}: thiếu explanation object.")
            continue
        if not str(explanation.get("summary", "")).strip():
            errors.append(f"Question {qid}: missing explanation.summary")
        if not str(explanation.get("whyCorrect", "")).strip():
            errors.append(f"Question {qid}: missing explanation.whyCorrect")

        visuals = explanation.get("visualExplanations")
        if question.get("chapter") == 5 and not isinstance(visuals, list):
            errors.append(f"Question {qid}: missing explanation.visualExplanations")
            visuals = []
        visuals = visuals if isinstance(visuals, list) else []
        provided = {str(item.get("label", "")).strip().lower(): item for item in visuals if isinstance(item, dict)}
        for label in labels:
            item = provided.get(label.lower())
            if not item:
                errors.append(f"Question {qid}: missing visual explanation for {label}")
                continue
            for field in ("name", "meaning"):
                if not str(item.get(field, "")).strip():
                    errors.append(f"Question {qid}: {label} missing {field}")
        for index, item in enumerate(visuals):
            if not isinstance(item, dict):
                errors.append(f"Question {qid}: visualExplanations[{index}] is not an object")
                continue
            if not str(item.get("label", "")).strip() or not str(item.get("name", "")).strip() or not str(item.get("meaning", "")).strip():
                errors.append(f"Question {qid}: visualExplanations[{index}] must include label, name and meaning")

    if errors:
        print("=== EXPLANATION VALIDATION FAILED ===")
        print("\n".join(f"- {error}" for error in errors))
        return 1
    chapter5 = sum(question.get("chapter") == 5 for question in questions)
    numbered = sum(bool(labels_in_question(question)) for question in questions)
    print(f"Explanation validation PASS: {chapter5} Chapter 5 questions, {numbered} questions with numbered visual labels.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
