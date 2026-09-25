"""Build reproducible, provenance-preserving sections from every PDF bookmark.

The reading order text is extracted independently of visual layout. Headings are
matched accent/case/whitespace-insensitively; unresolved anchors are explicit.
"""
from __future__ import annotations

import bisect
import difflib
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "source"


def slug(value):
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def normalize(value):
    return " ".join(re.findall(r"[a-z0-9]+", unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode().lower()))


def norm_map(text):
    chars, positions = [], []
    for index, original in enumerate(text):
        for c in unicodedata.normalize("NFKD", original).encode("ascii", "ignore").decode().lower():
            if c.isalnum():
                chars.append(c)
                positions.append(index)
            elif chars and chars[-1] != " ":
                chars.append(" ")
                positions.append(index)
    return "".join(chars), positions


def main():
    pages = json.loads((OUT / "pages-reading-order.json").read_text(encoding="utf-8"))
    outline = json.loads((OUT / "outline.json").read_text(encoding="utf-8"))
    lengths = [0]
    for page in pages:
        lengths.append(lengths[-1] + len(page["text"]) + 1)
    combined = "\n".join(page["text"] for page in pages)
    normalized = [norm_map(page["text"]) for page in pages]
    anchors = []
    issues = []
    for index, row in enumerate(outline):
        page_number = row["page"]
        raw = pages[page_number - 1]["text"]
        norm, positions = normalized[page_number - 1]
        needle = normalize(row["title"])
        candidates = []
        for match in re.finditer(r"(?<![a-z0-9])" + re.escape(needle) + r"(?![a-z0-9])", norm):
            start = positions[match.start()]
            end = positions[match.end() - 1] + 1
            line_start = raw.rfind("\n", 0, start) + 1
            line_end = raw.find("\n", end)
            if line_end == -1:
                line_end = len(raw)
            exact_line = normalize(raw[line_start:line_end]) == needle
            candidates.append((not exact_line, start, end))
        status = "exact-heading"
        if candidates:
            candidates.sort()
            best = candidates[0]
            start, end = best[1:]
            if best[0]:
                status = "inline-heading"
        else:
            # Titles occasionally have punctuation/wording differences. Retain
            # the best whole-line evidence only at a strict similarity cutoff.
            options = []
            offset = 0
            for line in raw.splitlines(keepends=True):
                score = difflib.SequenceMatcher(None, needle, normalize(line)).ratio()
                if score >= .86:
                    options.append((score, offset, offset + len(line)))
                offset += len(line)
            if options:
                _, start, end = max(options)
                status = "fuzzy-heading"
            else:
                start = 0
                end = 0
                status = "unresolved-page-fallback"
        if status != "exact-heading":
            issues.append({"index": index, "title": row["title"], "page": page_number, "status": status})
        anchors.append({**row, "id": f"source-{page_number}-{slug(row['title'])}-{index}",
                        "startOffset": lengths[page_number - 1] + start,
                        "headingEndOffset": lengths[page_number - 1] + end,
                        "anchorStatus": status})

    unique_positions = sorted(set(anchor["startOffset"] for anchor in anchors if anchor["anchorStatus"] != "unresolved-page-fallback"))
    sections = []
    for index, anchor in enumerate(anchors):
        start = anchor["startOffset"]
        own_end_index = bisect.bisect_right(unique_positions, start)
        own_end = unique_positions[own_end_index] if own_end_index < len(unique_positions) else len(combined)
        hierarchical_end = len(combined)
        for following in anchors[index + 1:]:
            if following["level"] <= anchor["level"] and following["startOffset"] > start:
                hierarchical_end = following["startOffset"]
                break
        if anchor["anchorStatus"] == "unresolved-page-fallback":
            hierarchical_end = lengths[anchor["page"]]
            own_end = hierarchical_end
        end_page = min(len(pages), bisect.bisect_right(lengths, hierarchical_end - 1))
        text = combined[start:hierarchical_end].strip()
        sections.append({**anchor, "endPage": end_page,
                         "text": text, "ownText": combined[start:own_end].strip()})
    (OUT / "sections.json").write_text(json.dumps(sections, ensure_ascii=False, indent=2), encoding="utf-8")
    (OUT / "segmentation-issues.json").write_text(json.dumps(issues, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"sections": len(sections), "issues": len(issues), "unresolved": sum(row["status"] == "unresolved-page-fallback" for row in issues), "empty": sum(not row["text"] for row in sections)}))


if __name__ == "__main__":
    main()
