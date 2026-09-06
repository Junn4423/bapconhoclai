#!/usr/bin/env python3
"""Extract questions, underlined answers and embedded images from the source PDF.

This is a build-time helper only. The shipped app reads the generated JSON and
does not need Python or a PDF parser at runtime.
"""

from __future__ import annotations

import argparse
import glob
import json
import re
from pathlib import Path

import pdfplumber


LIET_IDS = {
    19, 20, 21, 22, 23, 24, 25, 26, 27, 28,
    30, 32, 34, 35, 47, 48, 52, 53, 55, 58,
    63, 64, 65, 66, 67, 68, 70, 71, 72, 73,
    74, 85, 86, 87, 88, 89, 90, 91, 92, 93,
    97, 98, 102, 117, 163, 165, 167, 197, 198, 206,
    215, 226, 234, 245, 246, 252, 253, 254, 255, 260,
}

QUESTION_RE = re.compile(r"^\s*Câu\s*(\d+)\s*[\.:]", re.IGNORECASE)
OPTION_RE = re.compile(r"^\s*([1-4])\s*[\.)]\s*(.*)$")
PAGE_NUMBER_RE = re.compile(r"^\d{1,3}$")

CATEGORY_META = (
    (1, 180, 1, "law", "Luật & quy tắc"),
    (181, 205, 2, "culture", "Văn hóa & cứu hộ"),
    (206, 263, 3, "technique", "Kỹ thuật lái"),
    (264, 300, 4, "vehicle", "Cấu tạo & sửa chữa"),
    (301, 485, 5, "signs", "Biển báo"),
    (486, 600, 6, "situation", "Sa hình & tình huống"),
)


def normalize(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def is_dark(value: object) -> bool:
    if isinstance(value, (int, float)):
        return float(value) < 0.5
    if isinstance(value, (tuple, list)) and value:
        return max(float(item) for item in value) < 0.5
    return False


def get_category(number: int) -> tuple[int, str, str]:
    for start, end, chapter, category, label in CATEGORY_META:
        if start <= number <= end:
            return chapter, category, label
    raise ValueError(f"Question {number} is outside the known chapter ranges")


def make_page_lines(page: pdfplumber.page.Page, page_number: int) -> list[dict]:
    words = page.extract_words(x_tolerance=1, y_tolerance=2)
    lines: list[dict] = []

    for word in sorted(words, key=lambda item: (item["top"], item["x0"])):
        target = next(
            (
                line
                for line in reversed(lines[-4:])
                if abs(line["top"] - word["top"]) <= 1.2
            ),
            None,
        )
        if target is None:
            target = {
                "page": page_number,
                "top": word["top"],
                "bottom": word["bottom"],
                "x0": word["x0"],
                "x1": word["x1"],
                "words": [],
            }
            lines.append(target)

        target["words"].append(word)
        target["bottom"] = max(target["bottom"], word["bottom"])
        target["x0"] = min(target["x0"], word["x0"])
        target["x1"] = max(target["x1"], word["x1"])

    for line in lines:
        line["text"] = " ".join(
            word["text"] for word in sorted(line["words"], key=lambda item: item["x0"])
        )
    return lines


def has_underline(line: dict, underlines: list[tuple[int, dict]]) -> bool:
    for page_number, underline in underlines:
        if page_number != line["page"]:
            continue
        if abs(underline["top"] - line["bottom"]) > 3.5:
            continue
        overlap = max(
            0,
            min(underline["x1"], line["x1"])
            - max(underline["x0"], line["x0"]),
        )
        threshold = min(5, max(1, (line["x1"] - line["x0"]) * 0.2))
        if overlap >= threshold:
            return True
    return False


def image_path(image_dir: Path, image_prefix: str, index: int) -> str | None:
    matches = sorted(glob.glob(str(image_dir / f"{image_prefix}-{index:03d}.*")))
    if not matches:
        return None
    return "/source-images/" + Path(matches[0]).name


def extract(pdf_path: Path, image_dir: Path, image_prefix: str) -> dict:
    all_lines: list[dict] = []
    underlines: list[tuple[int, dict]] = []
    images: list[dict] = []
    image_index = 0

    with pdfplumber.open(pdf_path) as pdf:
        for page_number, page in enumerate(pdf.pages, start=1):
            all_lines.extend(make_page_lines(page, page_number))

            for rect in page.rects:
                if (
                    rect.get("height", 99) <= 1.5
                    and rect.get("width", 0) > 4
                    and is_dark(rect.get("non_stroking_color"))
                ):
                    underlines.append((page_number, rect))

            for line in page.lines:
                if (
                    abs(line.get("top", 0) - line.get("bottom", 0)) <= 1.5
                    and line.get("width", 0) > 4
                    and is_dark(line.get("stroking_color"))
                ):
                    underlines.append((page_number, line))

            for image in page.images:
                images.append(
                    {
                        "index": image_index,
                        "page": page_number,
                        "top": image["top"],
                        "bottom": image["bottom"],
                    }
                )
                image_index += 1

    starts: list[tuple[int, int, int, float]] = []
    for index, line in enumerate(all_lines):
        match = QUESTION_RE.match(line["text"])
        if match:
            starts.append((index, int(match.group(1)), line["page"], line["top"]))

    questions: list[dict] = []
    for start_index, (line_index, number, start_page, start_top) in enumerate(starts):
        end_index = (
            starts[start_index + 1][0]
            if start_index + 1 < len(starts)
            else len(all_lines)
        )
        end_page = starts[start_index + 1][2] if start_index + 1 < len(starts) else 999
        end_top = starts[start_index + 1][3] if start_index + 1 < len(starts) else 9999
        block = all_lines[line_index:end_index]

        prompt_lines: list[dict] = []
        option_groups: list[dict] = []
        current_option: dict | None = None

        for line in block:
            text = line["text"].strip()
            if PAGE_NUMBER_RE.fullmatch(text):
                continue
            option_match = OPTION_RE.match(text)
            if option_match:
                current_option = {
                    "number": int(option_match.group(1)),
                    "first_text": option_match.group(2),
                    "lines": [line],
                }
                option_groups.append(current_option)
            elif current_option is not None:
                current_option["lines"].append(line)
            else:
                prompt_lines.append(line)

        prompt = normalize(" ".join(line["text"] for line in prompt_lines))
        prompt = normalize(
            re.sub(r"^Câu\s*\d+\s*[\.:]\s*", "", prompt, flags=re.IGNORECASE)
        )

        options: list[str] = []
        correct_indices: list[int] = []
        for option_index, option in enumerate(option_groups):
            first_line = option["lines"][0]["text"]
            first_line = OPTION_RE.sub(r"\2", first_line, count=1)
            option_text = normalize(
                " ".join([first_line] + [line["text"] for line in option["lines"][1:]])
            )
            options.append(option_text)
            if any(has_underline(line, underlines) for line in option["lines"]):
                correct_indices.append(option_index)

        if len(correct_indices) != 1:
            raise ValueError(
                f"Question {number} has {len(correct_indices)} underlined answers"
            )
        if not 1 <= len(options) <= 4:
            raise ValueError(f"Question {number} has {len(options)} options")

        chapter, category, category_label = get_category(number)
        linked_images = [
            image_path(image_dir, image_prefix, image["index"])
            for image in images
            if (
                start_page <= image["page"] <= end_page
                and not (image["page"] == start_page and image["bottom"] < start_top)
                and not (image["page"] == end_page and image["top"] >= end_top)
            )
        ]

        questions.append(
            {
                "id": number,
                "question": prompt,
                "options": options,
                "correct": correct_indices[0],
                "chapter": chapter,
                "category": category,
                "categoryLabel": category_label,
                "isLiet": number in LIET_IDS,
                "images": [path for path in linked_images if path],
                "sourcePage": start_page,
            }
        )

    questions.sort(key=lambda item: item["id"])
    ids = [item["id"] for item in questions]
    if ids != list(range(1, 601)):
        raise ValueError("The extracted question numbers are not exactly 1 through 600")

    return {
        "source": pdf_path.name,
        "sourceTitle": "600 câu hỏi dùng cho sát hạch lái xe cơ giới đường bộ",
        "questionCount": len(questions),
        "liệtCount": len(LIET_IDS),
        "questionsWithImages": sum(bool(item["images"]) for item in questions),
        "embeddedImageCount": len(images),
        "questions": questions,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf", required=True, type=Path)
    parser.add_argument("--image-dir", required=True, type=Path)
    parser.add_argument("--image-prefix", default="source")
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()

    result = extract(args.pdf, args.image_dir, args.image_prefix)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        json.dumps(
            {
                "questions": result["questionCount"],
                "liệt": result["liệtCount"],
                "questionsWithImages": result["questionsWithImages"],
                "embeddedImages": result["embeddedImageCount"],
                "out": str(args.out),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
