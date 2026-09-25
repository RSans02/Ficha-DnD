"""Extract the complete, local rules reference without copying it to the public app.

Usage: python scripts/extract_source.py [pdf_path]
Page numbers are one-based physical PDF page numbers.
"""

from __future__ import annotations

import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1]) if len(sys.argv) > 1 else next(ROOT.glob("*.pdf"))
out = ROOT / "data" / "source"
out.mkdir(parents=True, exist_ok=True)
reader = PdfReader(str(source))


def outline_rows(items, level=0, parent=None):
    rows = []
    last = parent
    for item in items:
        if isinstance(item, list):
            rows.extend(outline_rows(item, level + 1, last))
        else:
            title = str(getattr(item, "title", ""))
            page = reader.get_destination_page_number(item)
            row = {"title": title, "page": page + 1 if page is not None else None,
                   "level": level, "parent": parent,
                   "left": float(item.left) if item.left is not None else None,
                   "top": float(item.top) if item.top is not None else None}
            rows.append(row)
            last = title
    return rows


def write_json(name, value):
    (out / name).write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")


outline = outline_rows(reader.outline)
write_json("outline.json", outline)
pages = []
reading_pages = []
failures = []
for number, page in enumerate(reader.pages, start=1):
    try:
        text = page.extract_text(extraction_mode="layout") or ""
    except Exception as exc:
        failures.append({"page": number, "error": repr(exc)})
        text = page.extract_text() or ""
    pages.append({"page": number, "text": text})
    reading_pages.append({"page": number, "text": page.extract_text() or ""})
    if number % 50 == 0:
        print(f"Extracted {number}/{len(reader.pages)}", flush=True)
write_json("pages.json", pages)
write_json("pages-reading-order.json", reading_pages)
manifest = {
    "sourceFile": source.name,
    "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
    "extractedAt": datetime.now(timezone.utc).isoformat(),
    "pageNumbering": "1-based physical PDF pages",
    "extractor": "pypdf, layout text extraction",
    "pageCount": len(pages),
    "outlineCount": len(outline),
    "totalCharacters": sum(len(page["text"]) for page in pages),
    "emptyPages": [page["page"] for page in pages if not page["text"].strip()],
    "shortPages": [{"page": page["page"], "characters": len(page["text"])} for page in pages if len(page["text"].strip()) < 100],
    "fallbackExtractions": failures,
    "metadata": {str(key): str(value) for key, value in (reader.metadata or {}).items()},
}
write_json("manifest.json", manifest)
print(json.dumps(manifest, ensure_ascii=False), flush=True)
