"""Assert source catalog integrity and publish honest extraction coverage.

This validates evidence-backed records and references. It intentionally does not
claim that all textual mechanics are executable in the calculation engine.
"""
from __future__ import annotations
import json
from collections import Counter
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/"data"/"rules"
SOURCE=ROOT/"data"/"source"
def read(name):return json.loads((DATA/name).read_text(encoding="utf-8"))
races,classes,spells,feats,backgrounds,equipment=[read(name+".json")for name in ["races","classes","spells","feats","backgrounds","equipment"]]
features=read("racial-features.json")+read("class-features.json")
lists=read("spell-lists.json")
sections=json.loads((SOURCE/"sections.json").read_text(encoding="utf-8"))
manifest=json.loads((SOURCE/"manifest.json").read_text(encoding="utf-8"))
source_spells=[s for s in sections if 474<=s["page"]<=632 and s["level"]==2]
source_feats=[s for s in sections if 433<=s["page"]<=449 and s["level"]==1]
source_backgrounds=[s for s in sections if 394<=s["page"]<=417 and s["level"]==1]
assert len(spells)==len(source_spells)==501
assert len(feats)==len(source_feats)==83
assert len([b for b in backgrounds if not b.get("parentId")])==len(source_backgrounds)==25
assert len(classes)==13
assert len(lists)==9
for name,records in [("races",races),("classes",classes),("spells",spells),("feats",feats),("backgrounds",backgrounds),("equipment",equipment),("features",features)]:
 ids=[row["id"]for row in records]
 assert len(ids)==len(set(ids)),(name,"duplicate IDs")
 for row in records:
  assert row["name"] and row["description"],(name,row["id"],"empty name/description")
  assert 1<=row["source"]["page"]<=633,(name,row["id"],"invalid source page")
spell_ids={s["id"]for s in spells}
class_ids={c["id"]for c in classes}
race_ids={r["id"]for r in races}
feature_ids={f["id"]for f in features}
subclass_ids={sub["id"]for cls in classes for sub in cls["subclasses"]}
for race in races:
 assert not race["parentId"]or race["parentId"]in race_ids,race["id"]
 assert all(fid in feature_ids for fid in race["featureIds"]),race["id"]
for cls in classes:
 for owner in [cls,*cls["subclasses"]]:
  assert all(fid in feature_ids for fid in owner["featureIds"]),owner["id"]
for spell in spells:
 assert all(cid in class_ids for cid in spell["availableToClasses"]),spell["id"]
 assert all(sid in subclass_ids for sid in spell.get("availableToSubclasses",[])),spell["id"]
 assert all(spell[k]for k in ["school","castingTime","range","components","duration"]),spell["id"]
 assert spell["level"]is None or 0<=spell["level"]<=9,spell["id"]
for row in lists:
 assert row["classId"]in class_ids,row["id"]
 for entry in row["entries"]:
  assert entry["spellId"]in spell_ids,entry
  spell=next(s for s in spells if s["id"]==entry["spellId"])
  assert row["classId"]in spell["availableToClasses"],entry
  if entry["optionalTasha"]:assert row["classId"]in spell["optionalForClasses"],entry
assert sum(entry["optionalTasha"]for row in lists for entry in row["entries"])==65
assert sum(s["level"]is None for s in spells)==2
for name in ["Agua","Aire","Tierra","Fuego"]:
 child=next(r for r in races if r["name"]==name and r["version"]=="Multiverso")
 parent=next(r for r in races if r["id"]==child["parentId"])
 assert sum(c["type"]=="choose_ability_increase"for r in [parent,child]for c in r["choices"])==1
 assert sum(c["type"]=="choose_language"for r in [parent,child]for c in r["choices"])==1
assert next(r for r in races if r["name"]=="Alto Elfo")["abilityBonuses"]=={"int":1}
assert next(r for r in races if r["name"]=="Tritón (Legado)")["abilityBonuses"]=={"str":1,"con":1,"cha":1}
assert next(r for r in races if r["name"]=="Linaje Customizado")["senses"]==[]
assert next(r for r in races if r["name"]=="Sangre de Dragon o Draconblood")["parentId"]=="race-draconido"
assert next(b for b in backgrounds if b["name"]=="Acólito")["skillProficiencies"]==["insight","religion"]
assert next(b for b in backgrounds if b["name"]=="Cazarrecompensas Urbano")["choices"][0]["amount"]==2
assert next(e for e in equipment if e["name"]=="Tienda de campaña para dos personas")["weight"]is None
assert next(e for e in equipment if e["name"]=="Daga")["damage"]=="1d4"
assert next(e for e in equipment if e["name"]=="Escudo")["shieldBonus"]==2
issues=read("reference-import-issues.json")+read("equipment-import-issues.json")
limitations=[
 "El texto completo extraído no equivale a automatización de todas sus mecánicas.",
 "Dos hechizos tienen conflicto interno de nivel y quedan en modo manual: Tormenta de Bolas de Nieve de Snilloc (p588) y Libertad de los Vientos (p632).",
 "Dunamancia solo tiene acceso automático documentado para Magia Cronúrgica/Gravitúrgica; otras clases requieren consentimiento del DM.",
 "Las 65 ampliaciones opcionales de Tasha conservan su condición opcional por clase; no equivalen a acceso base.",
 "El PDF omite reglas generales completas de compra de puntos, matriz estándar, experiencia, condiciones y descanso. No se incorporan reglas externas.",
 "Dotes complejas, transformaciones raciales, recursos condicionales, linajes con sustituciones y parte de las elecciones de rasgos siguen siendo texto y ajuste manual.",
 "Los 25 trasfondos y 6 variantes preservan narrativa y competencias; herramientas/idiomas/equipo elegibles no están todos convertidos en decisiones ejecutables.",
 "El peso de Tienda de campaña para dos personas está ausente en el PDF. Los pesos numéricos de equipo se expresan en lb.",
 "La CA especial, vuelo/nado/escalada, armas naturales y hechizos raciales no están automatizados de manera exhaustiva; consultar el rasgo y los overrides.",
 "Las variantes agregadas de Tiefling y la ascendencia de Semielfo Variante precisan resolver las opciones y sustituciones manualmente. Sus descripciones completas permanecen accesibles.",
 "Los efectos por nivel y requisitos de subclase no expresados inequívocamente por tablas/cabeceras permanecen explícitamente pendientes o manuales.",
]
coverage={"sourceFile":manifest["sourceFile"],"sourceSha256":manifest["sourceSha256"],"pages":633,"pagesExtracted":633,"blankPages":[211,232],"outlineEntries":len(sections),
 "counts":{"races":len(races),"rootRaces":sum(not r["parentId"]for r in races),"subracesAndVariants":sum(bool(r["parentId"])for r in races),"classes":len(classes),"subclasses":sum(len(c["subclasses"])for c in classes),"features":len(features),"racialFeatures":len(read("racial-features.json")),"classFeatures":len(read("class-features.json")),"spells":len(spells),"spellLists":len(lists),"spellListEntries":sum(len(row["entries"])for row in lists),"optionalTashaRelations":65,"feats":len(feats),"backgrounds":len(backgrounds),"baseBackgrounds":25,"backgroundVariants":6,"equipment":len(equipment)},
 "sourceEntityCoverage":{"indexedSpells":{"expected":501,"imported":501},"indexedFeats":{"expected":83,"imported":83},"indexedBaseBackgrounds":{"expected":25,"imported":25}},
 "spellHeadersComplete":sum(all(s[k]for k in ["school","castingTime","range","components","duration"])for s in spells),"spellLevelConflicts":2,"unresolvedSpellListReferences":0,
 "featAutomation":{"withEffectsOrChoices":sum(bool(f["effects"]or f["choices"])for f in feats),"textOnly":sum(not(f["effects"]or f["choices"])for f in feats)},
 "equipmentCategories":dict(Counter(e["category"]for e in equipment)),"equipmentWeightUnit":"lb","sourceIssues":dict(Counter(i["type"]for i in issues)),"limitations":limitations,
 "validation":{"stableIdsUnique":True,"spellClassReferencesValid":True,"spellSubclassReferencesValid":True,"spellListsResolved":True,"raceFeatureReferencesValid":True,"multiverseGenasiInheritsOnce":True,"allEntityDescriptionsPresent":True}}
(DATA/"coverage.json").write_text(json.dumps(coverage,ensure_ascii=False,indent=2),encoding="utf-8")
report="# Cobertura y validación de catálogos\n\n"
report+="La fuente tiene **633 páginas**. Se conserva texto íntegro y procedencia por página. Esta auditoría valida registros y relaciones; no presenta los efectos textuales como mecánicas automatizadas.\n\n"
report+="## Registros importados\n\n| Catálogo | Registros |\n|---|---:|\n"
for key,value in coverage["counts"].items():report+=f"| {key} | {value} |\n"
report+="\n## Verificación\n\n"
report+="- Los 501 hechizos del índice tienen descripción completa y las cinco cabeceras estructuradas. Dos niveles contradictorios están en `null`, con los valores impresos y de sección conservados.\n"
report+="- Las 9 listas contienen 1.317 relaciones únicas. Se contrastaron 1.318 hipervínculos originales: uno está duplicado. Las 65 ampliaciones Tasha se identifican con el color del PDF, no por inferencia.\n"
report+="- Se auditaron siete vínculos erróneos del PDF y se preservaron las relaciones determinadas por el nombre exacto. Los 38 alias de traducción entre listas y títulos se justifican con el vínculo del PDF. No quedan referencias de listas sin resolver.\n"
report+="- Los 83 dotes y los 25 trasfondos principales coinciden con el índice. Hay 6 variantes adicionales. Solo se generan efectos cuantificables con evidencia literal; se mantiene el texto de todos los demás.\n"
report+="- Equipo incluye 13 armaduras/escudo y 37 armas. La tabla doble de aventura se separó por coordenadas. Pesos en libras; cifras ausentes no se sustituyen por valores oficiales externos.\n"
report+="- IDs únicos, descripciones no vacías, fuentes válidas y todas las referencias clase/subclase/rasgo/hechizo comprobadas por `scripts/validate_catalogs.py`.\n"
report+="- Regresión racial: Genasi MPMM hereda un único conjunto de aumentos y un único idioma; Alto Elfo +1 INT; Tritón legado +1 FUE/CON/CAR; linaje customizado no concede visión sin elegirla.\n"
report+="\n## Correcciones de extracción racial\n\n"
report+="Se reconocen aumentos de subrazas aunque no tengan bloque Tamaño/Edad, nombres completos y abreviados de características, velocidades descritas en prosa y títulos reales al inicio de línea. Se excluyen cabeceras/filas de tablas que antes aparecían como rasgos. Draconblood y Ravenite se clasifican como variantes de Wildemount con sustituciones documentadas; no reciben dos aumentos raciales. Semielfo Variante no obtiene simultáneamente el rasgo de habilidades que sustituye. No se corrigen mediante otras publicaciones las peculiaridades del PDF (por ejemplo +1 INT de Genasi del Agua legado).\n"
report+="\n## Huecos concretos y trabajo manual\n\n"+"\n".join("- "+line for line in limitations)+"\n"
report+="\n## Reproducibilidad\n\nEjecutar, en orden, `extract_source.py`, `segment_source.py`, `audit_source.py`, `extract_spell_links.py`, `import_reference_catalogs.py`, `import_equipment.py`, `extract_races.py`, el importador de clases y `validate_catalogs.py`. Los JSON de cobertura se regeneran desde los catálogos actuales. El PDF original y la extracción completa no se copian a `public`.\n"
(ROOT/"docs"/"reference-coverage.md").write_text(report,encoding="utf-8")
print(json.dumps({"validation":"passed","counts":coverage["counts"],"issues":coverage["sourceIssues"]},ensure_ascii=False))
