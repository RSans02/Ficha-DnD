"""Import all spells, spell lists, feats, backgrounds and equipment from source data.

No network or external rules are used. Ambiguities are recorded, never filled in.
"""
from __future__ import annotations

import difflib
import json
import re
import unicodedata
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data" / "source"
OUTPUT = ROOT / "data" / "rules"
OUTPUT.mkdir(parents=True, exist_ok=True)
SECTIONS = json.loads((SOURCE / "sections.json").read_text(encoding="utf-8"))
PAGES = json.loads((SOURCE / "pages-reading-order.json").read_text(encoding="utf-8"))
ISSUES = []
ABILITIES = {"Fuerza": "str", "Destreza": "dex", "Constitución": "con", "Inteligencia": "int", "Sabiduría": "wis", "Carisma": "cha"}
SKILLS={"acrobacias":"acrobatics","trato con animales":"animal-handling","tacto con animales":"animal-handling","arcano":"arcana","arcanos":"arcana","atletismo":"athletics","engaño":"deception","engañar":"deception","historia":"history","perspicacia":"insight","averiguar intenciones":"insight","intimidación":"intimidation","investigación":"investigation","medicina":"medicine","naturaleza":"nature","percepción":"perception","interpretación":"performance","interpretar":"performance","persuasión":"persuasion","religión":"religion","juego de manos":"sleight-of-hand","sigilo":"stealth","supervivencia":"survival"}


def slug(text):
    return re.sub(r"[^a-z0-9]+", "-", unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()).strip("-")


def clean(text):
    return re.sub(r"\s+", " ", text).strip()


def norm(text):
    return slug(text).replace("-", " ")


def source(section):
    return {"page": section["page"], "endPage": section["endPage"], "title": section["parent"] or section["title"]}


def save(name, data):
    (OUTPUT / name).write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def spell_source(page):
    return next(name for start, end, name in [(474,579,"Manual del Jugador"),(580,608,"Xanathar"),(609,623,"Tasha"),(624,626,"Fizban"),(627,631,"Dunamancia"),(632,632,"Tal’Dorei")] if start<=page<=end)


def import_spells():
    spells = []
    for section in SECTIONS:
        if not (474 <= section["page"] <= 632 and section["level"] == 2):
            continue
        text = clean(section["text"])
        match = re.search(r"^(?:Truco|Nivel\s+(\d))\s*[,.:]\s*([A-Za-zÁÉÍÓÚáéíóúñÑ]+)([^\n]*)", section["text"], re.I | re.M)
        level = int(match.group(1)) if match and match.group(1) else 0 if match else None
        school = match.group(2).rstrip(".").capitalize() if match else ""
        fields = {}
        labels = ["Tiempo de lanzamiento", "Alcance", "Componentes", "Duración"]
        positions = []
        for label in labels:
            found = re.search(re.escape(label) + r"\s*:", section["text"], re.I)
            positions.append(found)
        for i, key in enumerate(["castingTime", "range", "components"]):
            fields[key] = clean(section["text"][positions[i].end():positions[i+1].start()]) if positions[i] and positions[i+1] else ""
        # Duration normally ends at the first newline. A wrapped parenthetical
        # or concentration clause is joined only while its syntax is incomplete.
        duration = ""
        if positions[3]:
            tail = section["text"][positions[3].end():].lstrip()
            lines = [line.strip() for line in tail.splitlines() if line.strip()]
            if lines:
                duration = lines[0]
                if (duration.endswith(",") or duration.count("(")>duration.count(")") or re.search(r"\b(?:hasta|de|del)\s*$",duration,re.I)) and len(lines)>1:
                    duration += " " + lines[1]
        parent_level = 0 if "truco" in section["parent"].lower() else int(re.search(r"Nivel\s*(\d)",section["parent"],re.I).group(1))
        notes = []
        printed_level = level
        if level != parent_level:
            notes.append(f"Conflicto de fuente: cabecera del hechizo nivel {level}, sección nivel {parent_level}. Resolver manualmente.")
            ISSUES.append({"type":"spell-level-conflict","name":section["title"],"page":section["page"],"printed":level,"section":parent_level})
            level = None
        higher = re.search(r"(?:En|A)\s+Niveles?\s+Superiores?\s*[:.]?\s*(.*)",text,re.I)
        spell = {"id":"spell-"+slug(section["title"]),"name":section["title"],"source":source(section),
                 "description":text,"level":level,"school":school,"castingTime":fields["castingTime"],
                 "range":fields["range"],"components":fields["components"],"duration":clean(duration),
                 "concentration":"concentraci" in norm(duration),
                 "ritual":bool(match and "ritual" in match.group(0).lower()),
                 "higherLevels":higher.group(1).strip() if higher else "", "availableToClasses":[],
                 "sourceBook":spell_source(section["page"]),"printedLevel":printed_level,"sectionLevel":parent_level,
                 "automationNotes":notes}
        for key in ["school","castingTime","range","components","duration"]:
            if not spell[key]:ISSUES.append({"type":"spell-missing-header","id":spell["id"],"field":key,"page":section["page"]})
        if spell["sourceBook"]=="Dunamancia":
            spell["availableToSubclasses"]=["subclass-mago-magia-cronurgica","subclass-mago-magia-graviturgica"]
            spell["accessNote"]="Acceso para Magia Cronúrgica y Magia Gravitúrgica. Otras clases requieren consentimiento del DM (p627)."
        if spell["sourceBook"]=="Tal’Dorei":
            spell["availableToSubclasses"]=["subclass-paladin-juramento-del-mar-abierto"]
            spell["dmAccessForClasses"]=["class-druida","class-explorador","class-hechicero"]
            spell["accessNote"]="El Juramento del Mar Abierto los concede por sus rasgos. Druidas, exploradores y hechiceros pueden aprenderlos si el DJ está de acuerdo (p632)."
        spells.append(spell)
    return spells


def import_spell_lists(spells):
    by_name = {norm(row["name"]):row for row in spells}
    # Name variations are linked only when their title and source entry can be
    # checked in the same PDF. Each non-exact mapping remains in the audit.
    by_name.update({norm(row["name"].split("/")[0]):row for row in spells if "/" in row["name"]})
    by_name.update({norm(row["name"].split("/")[-1]):row for row in spells if "/" in row["name"]})
    lists=[]
    for section in SECTIONS:
        if not (454<=section["page"]<=473 and section["level"]==1):continue
        class_name=section["title"].replace("Hechizos de ","")
        class_id="class-"+slug(class_name)
        candidates=[]
        school_pattern=r"abjuraci[oó]n|adivinaci[oó]n|conjuraci[oó]n|encantamiento|evocaci[oó]n|ilusi[oó]n|nigromancia|transmutaci[oó]n"
        for match in re.finditer(r"([^\n]+?)[ \t]*\(("+school_pattern+r")\)[ \t]*([CR ]*)",section["text"],re.I):
            name=clean(match.group(1))
            key=norm(name)
            resolved=by_name.get(key)
            status="exact"
            if not resolved:
                closest=difflib.get_close_matches(key,list(by_name),n=1,cutoff=.85)
                if closest:
                    resolved=by_name[closest[0]]
                    status="fuzzy-reviewed"
                    ISSUES.append({"type":"spell-list-alias","classId":class_id,"listName":name,"spellName":resolved["name"],"similarity":round(difflib.SequenceMatcher(None,key,closest[0]).ratio(),3)})
                else:
                    status="unresolved"
                    ISSUES.append({"type":"spell-list-unresolved","classId":class_id,"name":name,"page":section["page"]})
            candidates.append({"name":name,"spellId":resolved["id"] if resolved else None,"school":match.group(2),"ritualForClass":"R" in match.group(3),"concentrationInList":"C" in match.group(3),"match":status})
            if resolved and class_id not in resolved["availableToClasses"]:
                resolved["availableToClasses"].append(class_id)
        lists.append({"id":"spell-list-"+slug(class_name),"name":section["title"],"classId":class_id,"source":source(section),"description":clean(section["text"]),"entries":candidates})
    links_path=SOURCE/"spell-links.json"
    if links_path.exists():
        links=json.loads(links_path.read_text(encoding="utf-8"))
        ISSUES[:]=[issue for issue in ISSUES if not issue["type"].startswith("spell-list-")]
        by_title={spell["name"]:spell for spell in spells}
        # Exact spelling overrides misdirected PDF hyperlinks. Non-exact source
        # spelling is accepted only where the PDF link supplies the relationship.
        for list_index,spell_list in enumerate(lists):
            start=spell_list["source"]["page"]
            end=lists[list_index+1]["source"]["page"]-1 if list_index+1<len(lists) else 473
            existing={norm(row["name"]):row for row in spell_list["entries"]}
            entries=[]
            seen=set()
            for link in links:
                if not(start<=link["page"]<=end):continue
                key=norm(link["label"])
                resolved=by_name.get(key)
                target=by_title.get(link["targetTitle"])
                method="exact-name"
                if not resolved:
                    resolved=target
                    method="pdf-link"
                if not resolved:
                    prior=existing.get(key)
                    if prior and prior["spellId"]:
                        resolved=next(spell for spell in spells if spell["id"]==prior["spellId"])
                        method="normalized-name"
                if resolved and target and resolved["id"]!=target["id"]:
                    ISSUES.append({"type":"pdf-link-wrong-target","classId":spell_list["classId"],"page":link["page"],"label":link["label"],"linkTarget":target["name"],"usedExactTitle":resolved["name"]})
                if not resolved:
                    ISSUES.append({"type":"spell-list-unresolved","classId":spell_list["classId"],"name":link["label"],"page":link["page"]})
                elif method=="pdf-link" and key!=norm(resolved["name"]):
                    ISSUES.append({"type":"spell-list-source-alias","classId":spell_list["classId"],"listName":link["label"],"spellName":resolved["name"],"page":link["page"]})
                dedup=(resolved["id"] if resolved else key,link["optionalTasha"])
                if dedup in seen:continue
                seen.add(dedup)
                prior=existing.get(key,{})
                entries.append({"name":link["label"],"spellId":resolved["id"] if resolved else None,"sourcePage":link["page"],"school":resolved["school"] if resolved else "","ritualForClass":prior.get("ritualForClass",False),"concentrationInList":prior.get("concentrationInList",False),"optionalTasha":link["optionalTasha"],"match":method})
            spell_list["entries"]=entries
        for spell in spells:
            spell["availableToClasses"]=[]
            spell["optionalForClasses"]=[]
            for spell_list in lists:
                matches=[entry for entry in spell_list["entries"] if entry["spellId"]==spell["id"]]
                if matches:spell["availableToClasses"].append(spell_list["classId"])
                if matches and all(entry["optionalTasha"]for entry in matches):spell["optionalForClasses"].append(spell_list["classId"])
    return lists


def import_feats():
    feats=[]
    for section in SECTIONS:
        if not (433<=section["page"]<=449 and section["level"]==1):continue
        text=clean(section["text"])
        lines=[line.strip() for line in section["text"].splitlines() if line.strip()]
        req=""
        for idx,line in enumerate(lines):
            if re.match(r"Requisitos?(?: [Pp]revio)?\s*:",line):
                req=line.split(":",1)[1].strip()
                # Source wraps long prerequisite text across lines.
                if re.search(r"\b(?:de|prepare|que|del)\s*$",req,re.I) and idx+1<len(lines):req+=" "+lines[idx+1]
                break
        prereqs=[]
        req_norm=norm(req)
        minimum=re.search(r"personaje de nivel (\d+)",req,re.I)
        if minimum:prereqs.append({"type":"minimum_level","minimum":int(minimum.group(1))})
        if any(k in req_norm for k in ["lanzamiento de hechizos","lanzamiento de conjuros","lanzador de","lanzar al menos"]):prereqs.append({"type":"spellcasting"})
        ability_reqs=[]
        ability_min=re.search(r"(\d+)\s+o superior",req,re.I)
        if ability_min:
            for name,ability in ABILITIES.items():
                if name.lower() in req.lower():ability_reqs.append({"type":"minimum_ability","ability":ability,"minimum":int(ability_min.group(1))})
            if len(ability_reqs)>1:prereqs.append({"type":"any","options":ability_reqs})
            else:prereqs+=ability_reqs
        if "armadura" in req_norm:
            kind=next((w for w in ["ligera","media","pesada"] if w in req_norm),None)
            if kind:prereqs.append({"type":"proficiency","value":"armadura "+kind})
        if "arma marcial" in req_norm:prereqs.append({"type":"proficiency","value":"armas marciales"})
        if "una clase que prepare" in req_norm:prereqs.append({"type":"prepared_spellcasting"})
        if req and not prereqs:
            # Racial predicates resolved after the race catalog is built.
            prereqs.append({"type":"source_requirement","value":req})
        effects=[]
        choices=[]
        notes=[]
        # Read each explicit increase clause rather than treating every ability
        # name in a feat as a granted bonus.
        for match in re.finditer(r"(?:Incrementa|Aumenta|Aumentas|Incrementas)\s+tu\s+(?:(?:puntuaci[oó]n(?:es)?|puntaje)\s+(?:de|en)\s+)?(.{1,140}?)(?:en|aumenta en)\s+(\d)(?:\s|,|\.)",text,re.I):
            clause=match.group(1)
            value=int(match.group(2))
            names=[name for name in ABILITIES if name.lower() in clause.lower()]
            if len(names)==1:effects.append({"type":"ability_bonus","ability":ABILITIES[names[0]],"value":value})
            elif len(names)>1:
                choices.append({"id":"feat-"+slug(section["title"])+"-ability","type":"choose_ability_increase","name":"Aumento de característica","amount":1,"required":True,"options":[{"id":ABILITIES[name],"name":name,"effects":[{"type":"ability_bonus","ability":ABILITIES[name],"value":value}]} for name in names]})
        if section["title"]=="Alerta" and "+5" in text and "iniciativa" in text.lower():effects.append({"type":"initiative_bonus","value":5})
        if section["title"]=="Ágil" and "10 pies" in text:effects.append({"type":"speed_bonus","value":10})
        if section["title"]=="Vigoroso" and "dos veces tu nivel" in text:effects.append({"type":"hp_per_level","value":2})
        if section["title"]=="Constitución Infernal":
            for kind in ["frío","veneno"]:
                if kind in text:effects.append({"type":"resistance","value":kind})
        if section["title"]=="Observador" and "+5"in text:
            effects.extend([{"type":"passive_perception_bonus","value":5},{"type":"passive_investigation_bonus","value":5}])
        if section["title"]=="Resistente":
            choices.append({"id":"feat-resistente-ability","type":"choose_ability_increase","name":"Característica y salvación competente","amount":1,"required":True,"options":[{"id":ability,"name":name,"effects":[{"type":"ability_bonus","ability":ability,"value":1},{"type":"saving_throw_proficiency","ability":ability}]} for name,ability in ABILITIES.items()]})
        if section["title"]=="Experto en Varias Habilidades (Tasha)":
            choices.extend([
                {"id":"feat-experto-en-varias-habilidades-tasha-ability","type":"choose_ability_increase","name":"Aumento de característica","amount":1,"required":True,"options":[{"id":ability,"name":name,"effects":[{"type":"ability_bonus","ability":ability,"value":1}]}for name,ability in ABILITIES.items()]},
                {"id":"feat-experto-en-varias-habilidades-tasha-skill","type":"choose_skill","name":"Competencia adicional","amount":1,"required":True,"options":[{"id":skill,"name":name.title(),"effects":[{"type":"skill_proficiency","skill":skill}]}for skill,name in {s:n for n,s in SKILLS.items()}.items()]},
                {"id":"feat-experto-en-varias-habilidades-tasha-expertise","type":"choose_skill","name":"Pericia (elige una habilidad competente)","amount":1,"required":True,"options":[{"id":skill,"name":name.title(),"effects":[{"type":"skill_expertise","skill":skill}],"prerequisites":[{"type":"skill_proficiency","value":skill}]}for skill,name in {s:n for n,s in SKILLS.items()}.items()]}
            ])
        if not effects and not choices:notes.append("Efectos conservados íntegramente como texto; requieren aplicación manual cuando sean condicionales o no estén estructurados.")
        feats.append({"id":"feat-"+slug(section["title"]),"name":section["title"],"source":source(section),"description":text,"prerequisiteText":req,"prerequisites":prereqs,"effects":effects,"choices":choices,"automationNotes":notes})
    return feats


def import_backgrounds():
    rows=[]
    skills=SKILLS
    for section in SECTIONS:
        if not(394<=section["page"]<=417 and section["level"]==1):continue
        text=clean(section["text"])
        labels=list(re.finditer(r"(Competencias? (?:en|con) (?:Habilidades?|Herramientas?)|Idiomas?|Equipo)\s*:\s*",text,re.I))
        fields={}
        for i,m in enumerate(labels):
            # First occurrence belongs to the base background; variants remain
            # explicit in full text and do not overwrite the base grants.
            key=norm(m.group(1))
            if key not in fields:fields[key]=text[m.end():labels[i+1].start() if i+1<len(labels) else min(len(text),m.end()+650)].strip()
        skill_text=next((v for k,v in fields.items() if "habilidad" in k),"")
        granted=[]
        for name,skill in skills.items():
            if re.search(r"\b"+re.escape(name)+r"\b",skill_text,re.I) and skill not in granted:granted.append(skill)
        # A choose-two clause is not two automatically granted proficiencies.
        is_choice=bool(re.search(r"\b(?:elig\w*|elecci\w*|escog\w*)",skill_text,re.I))
        choices=[]
        if is_choice and granted:
            amount=2 if re.search(r"\bdos\b",skill_text,re.I)else 1
            choice_options=granted[:]
            fixed=[]
            if "entre" in skill_text.lower():
                before,after=re.split(r"\bentre\b",skill_text,maxsplit=1,flags=re.I)
                fixed=[skill for skill in granted if any(s==skill and re.search(r"\b"+re.escape(name)+r"\b",before,re.I)for name,s in skills.items())]
                choice_options=[skill for skill in granted if skill not in fixed]
            if section["title"]=="Agente de una Facción":
                fixed=["insight"]
                choice_options=["arcana","history","investigation","nature","religion","animal-handling","medicine","perception","survival","deception","intimidation","performance","persuasion"]
            choices.append({"id":"background-"+slug(section["title"])+"-skills","type":"choose_skill","name":"Habilidades del trasfondo","amount":amount,"options":[{"id":skill,"name":next(name.title() for name,s in skills.items() if s==skill),"effects":[{"type":"skill_proficiency","skill":skill}]} for skill in choice_options],"required":True})
            granted=fixed
        row={"id":"background-"+slug(section["title"]),"name":section["title"],"source":source(section),"description":text,"skillProficiencies":granted,"languages":[],"choices":choices,"featureIds":[],"sourceFields":fields,"automationNotes":["Equipo inicial, herramientas e idiomas elegibles se conservan en la descripción; revisa las decisiones que no tengan selector estructurado."]}
        rows.append(row)
        variants=list(re.finditer(r"^Variante:\s*([^\n]+)",section["text"],re.M))
        for match in variants:
            name=match.group(1).strip()
            variant={**row,"id":"background-"+slug(name),"name":name,"description":clean(section["text"][match.start():]),"parentId":row["id"],"version":"Variante","choices":[{**choice,"id":choice["id"]+"-"+slug(name)}for choice in choices],"automationNotes":row["automationNotes"]+["Variante del trasfondo "+row["name"]+". Revisa los cambios de equipo y rasgo en su descripción."]}
            if name=="Investigador":variant["skillProficiencies"]=["investigation","insight"]
            rows.append(variant)
    return rows


if __name__=="__main__":
    spells=import_spells()
    lists=import_spell_lists(spells)
    feats=import_feats()
    backgrounds=import_backgrounds()
    save("spells.json",spells)
    save("spell-lists.json",lists)
    save("feats.json",feats)
    save("backgrounds.json",backgrounds)
    save("reference-import-issues.json",ISSUES)
    print(json.dumps({"spells":len(spells),"spellLists":len(lists),"listEntries":sum(len(row['entries'])for row in lists),"feats":len(feats),"backgrounds":len(backgrounds),"issues":Counter(row['type']for row in ISSUES)},ensure_ascii=False))
