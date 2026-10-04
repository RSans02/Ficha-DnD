"""Extract all source equipment tables, retaining unknown values explicitly."""
from __future__ import annotations
import json
import re
import unicodedata
from collections import Counter
from fractions import Fraction
from pathlib import Path

import pdfplumber

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/"data"/"source"
OUT=ROOT/"data"/"rules"
pages=json.loads((SOURCE/"pages-reading-order.json").read_text(encoding="utf-8"))
rows=[]
issues=[]


def clean(text):return re.sub(r"\s+"," ",text).strip()
def slug(text):return re.sub(r"[^a-z0-9]+","-",unicodedata.normalize("NFKD",text).encode("ascii","ignore").decode().lower()).strip("-")
def weight(text):
 text=text.strip().replace("½","1/2")
 m=re.search(r"([\d /]+)\s*(?:lb|ib)",text,re.I)
 if not m:return None
 return float(sum(Fraction(p)for p in m.group(1).split()))


def add(name,category,page,description,**fields):
 identifier="equipment-"+slug(category+"-"+name)
 row={"id":identifier,"name":name,"category":category,"source":{"page":page,"endPage":page,"title":"Equipo"},"description":description,"weight":None,**fields}
 rows.append(row)
 return row


# Armors: source table uses full-width rows; collapse known wrapped names.
armor_text=pages[419]["text"].split("Armadura Coste Clase de Armadura (CA)")[-1]
armor_text=re.sub(r"Camisote de\s+malla\s+(?=50 oro)", "Camisote de malla ",armor_text)
category=""
for line in armor_text.splitlines():
 line=clean(line)
 if line.startswith("Armaduras "):category=line;continue
 m=re.match(r"(.+?)\s+(\d+)\s+oro\s+(\+?\d+)(.*?)\s+((?:\d+)\s+(?:lb|ib)\.?)$",line,re.I)
 if not m:continue
 name,cost,base,rest,wt=m.groups()
 shield=name=="Escudo"
 cap=2 if "máximo 2" in rest else None if "Destreza" in rest else 0
 strength=re.search(r"Fue\s*(\d+)",rest,re.I)
 props=[]
 if "Desventaja" in rest:props.append("Desventaja en Sigilo")
 if strength:props.append("Fuerza "+strength.group(1))
 add(name,"Armaduras",420,line,weight=weight(wt),cost=cost+" po",armorClass=None if shield else int(base),dexterityCap=0 if shield else cap,
     shieldBonus=int(base) if shield else 0,armorCategory="Escudo" if shield else category,properties=props,
     strengthRequirement=int(strength.group(1))if strength else None)

# Weapons: continuation lines carry either a wrapped name or weapon properties.
weapon_text=pages[422]["text"]
lines=[clean(line)for line in weapon_text.splitlines()if line.strip()]
category=""
pending=""
for line in lines:
 if line.startswith("Armas "):category=line;pending="";continue
 if line.startswith("Tabla")or line.startswith("Arma Coste"):continue
 combined=(pending+" "+line).strip()
 m=re.match(r"(.+?)\s+(\d+)\s+(oro|plata|cobre)\s+(\d+d\d+|\d+|-)\s*(contundente|cortante|perforante)?\s+((?:[\d /]+\s+lb\.)|-)\s+(.*)$",combined,re.I)
 if m:
  name,cost,currency,damage,damage_type,wt,props=m.groups()
  range_match=re.search(r"distancia\s+([\d/]+)",props,re.I)
  add(name,"Armas",423,combined,weight=weight(wt),cost=cost+" "+{"oro":"po","plata":"pp","cobre":"pc"}[currency],damage=damage,damageType=damage_type or "",properties=[p.strip()for p in props.split(",")if p.strip() and p.strip()!="-"],weaponCategory=category,range=range_match.group(1)if range_match else "",proficiencyCategory="marciales"if "marciales"in category else "simples")
  pending=""
 elif line in ["Carga","Pesada","Pesada, Carga"] and rows and rows[-1]["category"]=="Armas":
  rows[-1]["properties"] += [p.strip()for p in line.split(",")]
  rows[-1]["description"] += " "+line
 else:pending=combined

source_columns=[]
with pdfplumber.open(next(ROOT.glob("*.pdf")))as document:
 page=document.pages[426]
 source_columns=[page.crop((left,0,right,page.height)).extract_text(x_tolerance=1)for left,right in [(0,297),(297,page.width)]]
(SOURCE/"equipment-columns.json").write_text(json.dumps({"page":427,"columns":source_columns},ensure_ascii=False,indent=2),encoding="utf-8")
for column in source_columns:
 # Extract table text by physical columns, then rejoin three wrapped cells.
 for start,end in [("Estuche para mapas o","pergaminos"),("Estuche para virotes de","ballesta"),("Tienda de campaña para","dos personas")]:
  column=re.sub(re.escape(start)+r"\n([^\n]+)\n"+re.escape(end),lambda m:start+" "+end+" "+m.group(1),column)
 subcategory="Equipo de aventura"
 for line in column.splitlines():
  line=clean(line)
  if line in ["Foco arcano","Foco druídico","Munición","Símbolo sagrado"]:subcategory=line;continue
  m=re.match(r"(.+?)\s+(\d+)\s+(po|pp|pc)\s+(.*)$",line)
  if not m:continue
  name,cost,currency,wt=m.groups()
  if name in ["Bastón","Cetro","Cristal","Orbe","Varita"]:item_group="Foco arcano"
  elif name in ["Bastón de madera","Ramo de muérdago","Tótem","Varita de tejo"]:item_group="Foco druídico"
  elif name in ["Amuleto","Emblema","Relicario"]:item_group="Símbolo sagrado"
  elif name in ["Agujas de cerbatanas (50)","Balas para honda (20)","Flechas (20)","Virotes de ballesta (20)"]:item_group="Munición"
  else:item_group="Equipo de aventura"
  item=add(name,"Equipo",427,line,weight=weight(wt),cost=cost+" "+currency,equipmentType=item_group,weightText=wt)
  if wt.lower()=="lb":
   item["automationNotes"]=["El PDF no especifica la cifra del peso; solo imprime «Lb»."]
   issue={"type":"missing-source-weight","id":item["id"],"page":427}
   if name=="Tienda de campaña para dos personas":
    item["weight"]=20
    item["automationNotes"].append("Reglas 2014: peso de 20 lb, verificado en SRD 5.1 (inglés), p. 69. El valor original ausente permanece en weightText y en la descripción.")
    issue.update({"resolvedWeight":20,"correctionSource":"SRD 5.1 (English), p. 69","correctionUrl":"https://media.dndbeyond.com/compendium-images/srd/5.1/SRD_CC_v5.1.pdf"})
   issues.append(issue)

# Tool table and transport tables have complete reading-order rows.
tool_text=pages[428]["text"].split("Tabla de Herramientas")[-1]
category="Herramientas"
for line in tool_text.splitlines():
 line=clean(line)
 if line in ["Herramientas de artesano","Instrumentos musicales","Kits","Set de juego"]:category=line;continue
 m=re.match(r"(.+?)\s+(\d+)\s+(po|pp|pc)\s+(.*)$",line)
 if m:
  name,cost,currency,wt=m.groups()
  # These two rows follow the artisan rows without a fresh PDF heading, but
  # are separate tool categories in 2014 (SRD 5.1 Spanish p. 72).
  tool_category="Herramientas especializadas" if name in ["Herramientas de ladrón","Herramientas de navegación"] else category
  add(name,"Herramientas",429,line,weight=weight(wt),cost=cost+" "+currency,equipmentType=tool_category,weightText=wt)

transport=pages[430]["text"]
for line in transport.splitlines():
 line=clean(line)
 m=re.match(r"(.+?)\s+(\d[\d.]*)\s+(po|pp|pc)\s+(.*)$",line)
 if not m:continue
 name,cost,currency,rest=m.groups()
 category="Monturas" if re.search(r"pies\s+\d+\s+lb",rest)else "Vehículos"if "milla"in rest else "Equipo"
 if name in ["De carga","De montar","Exótica","Militar"]:name="Silla de montar: "+name
 props={}
 speed=re.search(r"([\d,]+)\s+(pies|millas?/hora)",rest)
 if speed:props["speedText"]=speed.group(0)
 if category=="Monturas":props["carryingCapacity"]=weight(rest)
 add(name,category,431,line,weight=None if category=="Monturas"else weight(rest),cost=cost+" "+currency,**props)
add("Barda","Equipo",431,"Barda ×4 ×2. El coste es cuatro veces el precio de la armadura equivalente y su peso es el doble (p430).",cost="×4 armadura",armorCostMultiplier=4,armorWeightMultiplier=2)

kit_text=pages[431]["text"]
# Preserve line boundaries while locating actual pack headings. Flattening first
# lets the ingredient "Equipo de cocina" consume the following priest heading.
matches=list(re.finditer(r"(?m)^[ \t]*(Equipo (?:de|para) [^\r\n().]+?) \((\d+) po\)\.",kit_text))
assert len(matches)==7, "Expected seven pack headings on source page 432"
for i,m in enumerate(matches):
 end=matches[i+1].start()if i+1<len(matches)else len(kit_text)
 description=clean(kit_text[m.start():end])
 add(clean(m.group(1)),"Paquetes",432,description,cost=m.group(2)+" po",contentsText=description.split(". ",1)[1])

# Attach descriptive object paragraphs where the PDF provides one. Unmatched
# rows retain the table's entire factual row as their source description.
descriptive=clean("\n".join(pages[n-1]["text"]for n in [424,425,426,428,429]))
for row in rows:
 if row["source"]["page"]not in [427,429]:continue
 name=row["name"].split(" (")[0]
 match=re.search(r"(?<!\w)"+re.escape(name)+r"\.",descriptive,re.I)
 if match:
  following=re.search(r"\s[A-ZÁÉÍÓÚ][a-záéíóúñ]+(?: [a-zA-ZáéíóúÁÉÍÓÚñ]+){0,5}\. ",descriptive[match.end():])
  # Description boundaries from bold source headings are ambiguous in plain
  # text. Preserve the full table row and use source pages for complete text.
  row["detailReferencePages"]=[424,425,426]if row["source"]["page"]==427 else [428,429]

ids=Counter(row["id"]for row in rows)
assert all(count==1 for count in ids.values()),ids
assert sum(row["category"]=="Armaduras"for row in rows)==13
assert sum(row["category"]=="Armas"for row in rows)==37
(OUT/"equipment.json").write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding="utf-8")
(OUT/"equipment-import-issues.json").write_text(json.dumps(issues,ensure_ascii=False,indent=2),encoding="utf-8")
print(json.dumps({"equipment":len(rows),"categories":Counter(row["category"]for row in rows),"issues":issues},ensure_ascii=False))
