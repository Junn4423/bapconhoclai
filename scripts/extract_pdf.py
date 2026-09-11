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
OPTION_TOKEN_RE = re.compile(r"^[1-4][\.)]$")
CHAPTER_RE = re.compile(r"^\s*CHƯƠNG\s+[IVX]+\s*[\.:]", re.IGNORECASE)
PAGE_NUMBER_RE = re.compile(r"^\d{1,3}$")

# The PDF uses a few different option layouts: one option per line, options
# in two columns, and compact horizontal options. A numeric token in the
# option text (for example the "1." in "Biển 1.") must not be mistaken for
# a new option. In the compact layouts, actual option markers start a new
# visual column and therefore have a noticeably larger gap from the previous
# word than punctuation inside the option text.
OPTION_COLUMN_GAP = 24

CATEGORY_META = (
    (1, 180, 1, "law", "Luật & quy tắc"),
    (181, 205, 2, "culture", "Văn hóa & cứu hộ"),
    (206, 263, 3, "technique", "Kỹ thuật lái"),
    (264, 300, 4, "vehicle", "Cấu tạo & sửa chữa"),
    (301, 485, 5, "signs", "Biển báo"),
    (486, 600, 6, "situation", "Sa hình & tình huống"),
)


def normalize(value: str) -> str:
    value = re.sub(r"\s+", " ", value).strip()
    # pdfminer occasionally separates the Vietnamese word "bộ" around its
    # diacritic-bearing character. Keep the source wording intact in JSON.
    return value.replace("b ộ", "bộ")


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
        line["words"] = sorted(line["words"], key=lambda item: item["x0"])
        line["text"] = " ".join(
            word["text"] for word in line["words"]
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


def split_option_line(line: dict) -> list[dict]:
    """Split a visual line that contains multiple horizontally-laid options."""

    words = line["words"]
    marker_indexes: list[int] = []
    for index, word in enumerate(words):
        if not OPTION_TOKEN_RE.fullmatch(word["text"]):
            continue
        if index == 0 or word["x0"] - words[index - 1]["x1"] >= OPTION_COLUMN_GAP:
            marker_indexes.append(index)

    if not marker_indexes:
        return []

    fragments: list[dict] = []
    for marker_position, start in enumerate(marker_indexes):
        end = (
            marker_indexes[marker_position + 1]
            if marker_position + 1 < len(marker_indexes)
            else len(words)
        )
        fragment_words = words[start:end]
        fragment = dict(line)
        fragment["words"] = fragment_words
        fragment["x0"] = fragment_words[0]["x0"]
        fragment["x1"] = fragment_words[-1]["x1"]
        fragment["text"] = " ".join(word["text"] for word in fragment_words)
        fragments.append(fragment)
    return fragments


def continuation_target(line: dict, option_groups: dict[int, dict]) -> dict | None:
    """Find the most recent option in the same visual column as a wrapped line."""

    candidates = [
        group
        for group in option_groups.values()
        if abs(group["lines"][0]["x0"] - line["x0"]) <= OPTION_COLUMN_GAP
    ]
    if not candidates:
        return None
    return max(
        candidates,
        key=lambda group: (
            group["lines"][-1]["page"],
            group["lines"][-1]["top"],
            group["number"],
        ),
    )


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
        option_groups: dict[int, dict] = {}
        current_option: dict | None = None
        skip_chapter_tail = False

        for line in block:
            text = line["text"].strip()
            if skip_chapter_tail:
                continue
            if PAGE_NUMBER_RE.fullmatch(text):
                continue
            if CHAPTER_RE.match(text):
                # Chapter headings can wrap onto another visual line. They
                # sit between the last question of a chapter and the first
                # question of the next one, so the remainder of this block is
                # heading text rather than an answer continuation.
                skip_chapter_tail = True
                continue

            option_fragments = split_option_line(line)
            if option_fragments:
                for fragment in option_fragments:
                    option_match = OPTION_RE.match(fragment["text"])
                    if option_match is None:
                        raise ValueError(
                            f"Question {number} has an invalid option marker: "
                            f"{fragment['text']}"
                        )
                    option_number = int(option_match.group(1))
                    current_option = option_groups.setdefault(
                        option_number,
                        {
                            "number": option_number,
                            "lines": [],
                        },
                    )
                    current_option["lines"].append(fragment)
                continue

            if current_option is not None:
                target = continuation_target(line, option_groups) or current_option
                target["lines"].append(line)
            else:
                prompt_lines.append(line)

        prompt = normalize(" ".join(line["text"] for line in prompt_lines))
        prompt = normalize(
            re.sub(r"^Câu\s*\d+\s*[\.:]\s*", "", prompt, flags=re.IGNORECASE)
        )

        options: list[str] = []
        correct_indices: list[int] = []
        option_numbers = sorted(option_groups)
        if option_numbers != list(range(1, len(option_numbers) + 1)):
            raise ValueError(
                f"Question {number} has non-contiguous option numbers: {option_numbers}"
            )
        if not 2 <= len(option_numbers) <= 4:
            raise ValueError(f"Question {number} has {len(option_numbers)} options")

        for option_index, option_number in enumerate(option_numbers):
            option = option_groups[option_number]
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
