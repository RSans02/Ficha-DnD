"""Preserve the PDF's own spell relationships and optional-list text colors."""
import json
from collections import Counter
from pathlib import Path

import pdfplumber
from pypdf import PdfReader

ROOT=Path(__file__).resolve().parents[1]
pdf=next(ROOT.glob("*.pdf"))
out=ROOT/"data"/"source"
outline=json.loads((out/"outline.json").read_text(encoding="utf-8"))
spells=[row for row in outline if 474<=row["page"]<=632 and row["level"]==2]
reader=PdfReader(str(pdf))
page_numbers={page.indirect_reference.idnum:index+1 for index,page in enumerate(reader.pages)}
rows=[]
unresolved=[]
with pdfplumber.open(pdf) as document:
 for number in range(454,474):
  pypage=reader.pages[number-1]
  page=document.pages[number-1]
  chars=page.chars
  for annotation in pypage.get("/Annots",[]):
   a=annotation.get_object()
   dest=a.get("/Dest")
   if not dest or len(dest)<5 or not hasattr(dest[0],"idnum"):continue
   target_page=page_numbers.get(dest[0].idnum)
   if target_page is None or target_page<474:continue
   left,top=float(dest[2]),float(dest[3])
   candidates=[spell for spell in spells if spell["page"]==target_page]
   if not candidates:continue
   best=min(candidates,key=lambda spell:abs(spell["left"]-left)+abs(spell["top"]-top))
   distance=abs(best["left"]-left)+abs(best["top"]-top)
   x0,y0,x1,y1=map(float,a["/Rect"])
   selected=[c for c in chars if x0<=((c["x0"]+c["x1"])/2)<=x1 and page.height-y1<=((c["top"]+c["bottom"])/2)<=page.height-y0]
   selected.sort(key=lambda c:(round(c["top"]/3),c["x0"]))
   label="".join(c["text"] for c in selected).strip()
   colors=Counter(tuple(c["non_stroking_color"]) if isinstance(c["non_stroking_color"],(tuple,list)) else (c["non_stroking_color"],) for c in selected if c["text"].strip())
   optional=any(len(color)==3 and abs(color[0]-.518)<.002 and abs(color[1]-.404)<.002 and abs(color[2])<.002 for color in colors)
   row={"page":number,"label":label,"targetPage":target_page,"left":left,"top":top,"targetTitle":best["title"] if distance<5 else None,"targetDistance":distance,"optionalTasha":optional,"colors":[list(c)for c in colors]}
   rows.append(row)
   if distance>=5:unresolved.append(row)
(out/"spell-links.json").write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding="utf-8")
print(json.dumps({"links":len(rows),"unresolved":len(unresolved),"optionalTasha":sum(r["optionalTasha"]for r in rows),"unresolvedRows":unresolved},ensure_ascii=False))
