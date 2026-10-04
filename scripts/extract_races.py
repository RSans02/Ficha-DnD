"""Extract race entities and traits from the complete, column-aware source index.
Never merge legacy and multiverse versions. Re-run after segment_source.py.
"""
import json, re, unicodedata, itertools
from pathlib import Path
import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data/rules'
OUT.mkdir(parents=True, exist_ok=True)
sections = json.loads((ROOT/'data/source/sections.json').read_text(encoding='utf8'))
def norm(s): return re.sub(r'\s+', ' ', s).strip()
def slug(s): return re.sub('[^a-z0-9]+','-',unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower()).strip('-')
def plain(s): return unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower()
abilities = {'Fue':'str','Des':'dex','Con':'con','Int':'int','Sab':'wis','Car':'cha'}
labels = {'str':'Fuerza','dex':'Destreza','con':'Constitución','int':'Inteligencia','wis':'Sabiduría','cha':'Carisma'}
skills = {'Acrobacias':'acrobatics','Trato con Animales':'animal-handling','Arcano':'arcana','Atletismo':'athletics','Engaño':'deception','Historia':'history','Perspicacia':'insight','Intimidación':'intimidation','Investigación':'investigation','Medicina':'medicine','Naturaleza':'nature','Percepción':'perception','Interpretación':'performance','Persuasión':'persuasion','Religión':'religion','Juego de Manos':'sleight-of-hand','Sigilo':'stealth','Supervivencia':'survival'}
group_titles = {'Dracónidos de Wildemount','Dracónidos de Fizban','Creando tu Propio Personaje'}
ignored_parents = {'Introducción','Creando tu Propio Personaje','Aasimar','Kobold'}
selected = [s for s in sections if 3<=s['page']<=101 and s['level']>0 and s['title'] not in group_titles and s['parent'] not in ignored_parents and not s['title'].startswith('Razas de ') and not (s['parent']=='Información de las Razas' and s['title']!='Linaje Customizado')]

# Typography establishes trait titles; body text is always retained in description.
bold_by_page = {}
with pdfplumber.open(next(ROOT.glob('*.pdf'))) as pdf:
    for page_n in range(3,102):
        page=pdf.pages[page_n-1]
        lines={}
        for w in page.extract_words(extra_attrs=['fontname','size']):
            if ('Bold' in w['fontname'] and 9 <= w['size'] <= 12) or ('CrimsonText' in w['fontname'] and 12 <= w['size'] <= 16):
                key=(int(w['x0']>page.width/2),round(w['top']/2)*2)
                lines.setdefault(key,[]).append(w)
        bold_by_page[page_n]=[norm(' '.join(w['text'] for w in sorted(ws,key=lambda w:w['x0']))).strip(': .') for _,ws in sorted(lines.items())]

races=[]; features=[]; used=set(); by_title={}
for s in selected:
    category=next((x['title'] for x in reversed(sections[:sections.index(s)]) if x['level']==0),'Razas')
    name=s['title']; rid='race-'+slug(name)
    if rid in used: rid+='-'+slug(s['parent'])
    used.add(rid)
    by_title.setdefault(name,[]).append(rid)
    parent=next((r for r in reversed(races) if r['name']==s['parent']),None)
    # Draconic versions replace the base package, while common subraces extend it.
    if s['parent'] in group_titles: parent=None
    raw_text=s['ownText']
    if name=='Aasimar' and s['page']==50: raw_text=s['text']
    if name=='Kobold' and s['page']==72: raw_text=s['text']
    text=norm(raw_text)
    source={'page':s['page'],'endPage':s['endPage']}
    bonus={}
    am=re.search(r'Aumento de (?:Puntuaci[oó]n(?:es)? de )?Caracter[ií]sticas?:\s*',text,re.I)
    # Short subrace blocks do not contain Tamaño/Edad; their fixed increases
    # still belong to the first field. Do not scan the entire race for bonuses.
    bt=text[am.end():].split(':',1)[0][:220] if am else ''
    for group in re.finditer(r'\+([1-3])\s*([^+.]+)',bt,re.I):
        num,clause=group.groups()
        for ab in re.findall(r'\b(Fue|Des|Con|Int|Sab|Car)\b',clause,re.I):
            bonus[abilities[ab.title()]]=int(num)
        for ability,label in labels.items():
            if re.search(r'\b'+re.escape(label)+r'\b',clause,re.I):bonus[ability]=int(num)
    if name=='Humano': bonus={a:1 for a in labels}
    size=re.search(r'Tamaño:\s*([^\.]+)',text)
    speed=re.search(r'Velocidad:\s*[^.:]{0,70}?(\d+)\s*pies',text,re.I)
    langs=re.search(r'Idiomas?(?: [Aa]dicional)?[:.]\s*(.*?)(?:Rasgos|[A-ZÁÉÍÓÚ][a-záéíóú]+:|$)',text)
    langtext=langs.group(1) if langs else ''
    known_langs=['común','enano','élfico','gigante','gnomo','goblin','mediano','orco','abisal','celestial','dracónico','habla profunda','infernal','primordial','silvano','infracomún','aquan','auran','ignan','terran','gith','grung','minotauro','loxodón','vedalken']
    languages=[l.capitalize() for l in known_langs if re.search(r'(?<![\w])'+re.escape(l)+r'(?![\w])',langtext,re.I)]
    is_multiverse=category=='Razas del Multiverso'
    if is_multiverse and not languages: languages=['Común']
    vision=re.search(r'(?:Visión en la Oscuridad|Visión en la Oscuridad Mejorada)[.:]?\s*.{0,140}?(\d+)\s*pies',text,re.I)
    senses=[f'Visión en la oscuridad {vision.group(1)} pies'] if vision else []
    res=[]
    for damage in ['veneno','fuego','frío','ácido','relámpago','necrótico','radiante','psíquico']:
        if re.search(r'resistencia (?:al |contra el |contra |a )?(?:daño (?:de |por )?)?'+damage,text,re.I): res.append(damage)
    effects=[]; choices=[]
    def add_ability_choice(patterns):
        opts=[]
        for inc in patterns:
            opts.append({'id':'+'.join(f'{a}-{v}' for a,v in inc.items()),'name':' · '.join(f'+{v} {labels[a]}' for a,v in inc.items()),'effects':[{'type':'ability_bonus','ability':a,'value':v} for a,v in inc.items()]})
        choices.append({'id':rid+'.abilities','type':'choose_ability_increase','name':'Aumentos de características','amount':1,'options':opts,'source':source,'required':True})
    # The shared p48 package is inherited once from a Multiverse parent. Genasi
    # elemental children add their own traits, never another ability package.
    inherits_multiverse=bool(parent and parent['version']=='Multiverso')
    if (is_multiverse and not inherits_multiverse) or ('tres' in plain(bt) and any(word in plain(bt)for word in ['diferentes','distintas'])) or ('aumenta tres' in plain(bt)):
        add_ability_choice([{a:2,b:1} for a in labels for b in labels if a!=b]+[{a:1 for a in xs} for xs in itertools.combinations(labels,3)])
    elif name=='Humano Variante': add_ability_choice([{a:1 for a in xs} for xs in itertools.combinations(labels,2)])
    elif name=='Semielfo': add_ability_choice([{a:1 for a in xs} for xs in itertools.combinations([a for a in labels if a!='cha'],2)])
    elif re.search(r'\+2 (?:en |a )?una',bt,re.I) and re.search(r'\+1 (?:en |a )?otra',bt,re.I):add_ability_choice([{a:2,b:1}for a in labels for b in labels if a!=b])
    elif re.search(r'\+2 a una|en 2',bt,re.I) and ('elecci' in bt or 'elijas' in bt): add_ability_choice([{a:2} for a in labels])
    elif re.search(r'\+1 a una',bt,re.I) and ('elecci' in bt or 'elijas' in bt):add_ability_choice([{a:1}for a in labels])
    language_choice=bool(re.search(r'idioma.{0,65}(?:elecci[oó]n|elijas)|(?:otro|un) idioma',langtext,re.I) and re.search(r'elecci[oó]n|elijas|otro idioma',langtext,re.I))
    if language_choice or (is_multiverse and not inherits_multiverse):
        choices.append({'id':rid+'.language','type':'choose_language','name':'Idioma adicional (acordado con el DM)','amount':1,'options':[], 'required':True,'source':source})
    if name in ['Humano Variante','Linaje Customizado']:
        choices.append({'id':rid+'.feat','type':'choose_feat','name':'Dote de origen','amount':1,'options':[], 'required':True,'source':source})
    if name=='Linaje Customizado':
        senses=[]
        choices.append({'id':rid+'.variable','type':'choose_option','name':'Rasgo variable','amount':1,'required':True,'source':source,'options':[{'id':'darkvision','name':'Visión en la oscuridad de 60 pies','effects':[{'type':'sense','value':'Visión en la oscuridad 60 pies'}]}]+[{'id':sid,'name':'Competencia: '+label,'effects':[{'type':'skill_proficiency','skill':sid}]}for label,sid in skills.items()]})
    if name=='Humano Variante' or name=='Semielfo':
        choices.append({'id':rid+'.skills','type':'choose_skill','name':'Habilidades de origen','amount':2 if name=='Semielfo' else 1,'options':[{'id':v,'name':k,'effects':[{'type':'skill_proficiency','skill':v,'value':1}]} for k,v in skills.items()],'source':source})
    if name=='Alto Elfo':
        choices.append({'id':rid+'.cantrip','type':'choose_cantrip','name':'Truco de mago','amount':1,'classId':'class-mago','options':[],'source':source})
    if name=='Enano':
        choices.append({'id':rid+'.tool','type':'choose_tool','name':'Herramienta de artesano','amount':1,'options':[{'id':x,'name':x,'effects':[{'type':'proficiency','category':'tool','value':x}]} for x in ['Herramientas de herrero','Provisiones de fermentación','Herramientas de albañil']],'source':source})
    if name in ['Enano de la Colina','Duergar o Enano Gris (Legado)']:
        effects.append({'type':'hp_per_level','value':1})
    if name=='Elfo de los Bosques': speed=type('Match',(),{'group':lambda self,n:'35'})()
    if name=='Elfo Oscuro o Drow':
        for level,spell in [(1,'luces-danzantes'),(3,'fuego-feerico'),(5,'oscuridad')]: effects.append({'type':'grant_spell','level':level,'spellId':'spell-'+spell,'ability':'cha'})
    # Extract unconditional skill grants only; context-based checks remain textual.
    for skill,sid in skills.items():
        if re.search(r'(?:(?:tienes|obtienes|ganas) competencia (?:en|con)|eres competente (?:en|con)) (?:la habilidad (?:de )?)?'+re.escape(skill)+r'\b',text,re.I): effects.append({'type':'skill_proficiency','skill':sid,'value':1})
    # Split actual typographic trait names, leaving full race prose available as well.
    candidates=[]
    for p in range(s['page'],s['endPage']+1):
        for h in bold_by_page.get(p,[]):
            if len(h)<3 or len(h)>85 or h in ['Rasgos','Subrazas','Edad','Idiomas','Tamaño','Velocidad','Tipo','Aumento de Características','Aumento de Puntuación de Característica','Dragon','Tipo de','Daño','Arma de','Aliento','Azul','Blanco','Bronce','Cobre','Oro','Latón','Plata','Negro','Rojo','Verde'] or re.match(r'^(?:d\d+|\d+)\b',h): continue
            if h in name or ':' in h: continue
            # Require a real heading at a source line start. A bold word can
            # occur earlier in prose or a table (e.g. Shifter and Tiefling), which
            # must not split the previous trait or activate an optional trait.
            pattern=r'(?m)^[ \t]*'+r'\s+'.join(re.escape(part)for part in h.split())+r'(?=[.: \t]*(?:\n|[.:]))'
            match=re.search(pattern,raw_text)
            pos=len(norm(raw_text[:match.start()]))+1 if match else -1
            if pos>=len(name)+1 and (not candidates or all(x[1]!=h for x in candidates)): candidates.append((pos,h,p))
    candidates.sort()
    trait_ids=[]
    for n,(pos,h,p) in enumerate(candidates):
        end=candidates[n+1][0] if n+1<len(candidates) else len(text)
        body=text[pos:end].strip()
        if len(body)<len(h)+12: continue
        fid='racial-'+slug(rid[5:])+'-'+slug(h)
        if any(f['id']==fid for f in features): continue
        features.append({'id':fid,'name':h,'description':body,'source':{'page':p,'endPage':s['endPage']},'originId':rid,'level':1,'effects':[],'choices':[]})
        trait_ids.append(fid)
    if not trait_ids:
        fid='racial-'+rid[5:]+'-rasgos'
        features.append({'id':fid,'name':'Rasgos de '+name,'description':text,'source':source,'originId':rid,'level':1,'effects':[],'choices':[]})
        trait_ids.append(fid)
    immunities=['veneno'] if re.search(r'Eres inmune al daño por veneno',text,re.I) else []
    races.append({'id':rid,'name':name,'description':text,'source':source,'parentId':parent['id'] if parent else None,'kind':'variant' if 'Variante' in name else 'subrace' if parent else 'lineage' if name=='Linaje Customizado' or s['parent']=='Razas de Ravenloft' else 'race','version':'Legado' if 'Legado' in name or (parent and parent['version']=='Legado') else 'Multiverso' if is_multiverse else s['parent'].replace('Razas de ','') if s['parent'].startswith('Razas de ') else 'Original','category':category,'size':size.group(1) if size else None,'speed':int(speed.group(1)) if speed else None,'abilityBonuses':bonus,'languages':languages,'senses':senses,'resistances':res,'immunities':immunities,'featureIds':trait_ids,'choices':choices,'effects':effects,'replacesParent':name=='Humano Variante','automationNotes':['Los efectos condicionados y las decisiones no estructuradas se conservan en su descripción completa.']})

# Human variant replaces ability increase only; inherit unaffected metadata explicitly.
for race in races:
    if race['name']=='Genasi del Agua' and race['version']=='Legado':
        race['abilityBonuses']={'wis':1}
        race['automationNotes'].append('Reglas de la edición 2014: el Genasi del Agua legado obtiene +1 Sabiduría, no Inteligencia (Elemental Evil Player’s Companion, p. 10). Se conserva la errata del PDF en el texto original.')
    if race['name']=='Humano Variante':
        parent=next(r for r in races if r['id']==race['parentId'])
        for field in ['speed','size','languages']: race[field]=parent[field]
        race['choices']+= [c for c in parent['choices'] if c['type']=='choose_language']
    if race['name'] in ['Sangre de Dragon o Draconblood','Ravenite']:
        parent=next(r for r in races if r['name']=='Dracónido')
        race['parentId']=parent['id']
        race['kind']='variant'
        race['version']='Wildemount'
        race['replacesParent']=True
        for field in ['speed','size','languages']:race[field]=parent[field]
        # Their paragraphs explicitly replace ability increases and resistance,
        # while retaining the other draconic traits. Copy only those references.
        inherited=[fid for fid in parent['featureIds'] if next(f['name']for f in features if f['id']==fid)!='Resistencia al Daño']
        race['featureIds']=inherited+race['featureIds']
        race['automationNotes'].append('Hereda rasgos del Dracónido salvo aumento de características y resistencia al daño, reemplazados explícitamente en pp12–13.')
    if race['name']=='Semielfo Variante':
        parent=next(r for r in races if r['id']==race['parentId'])
        race['replacesParent']=True
        for field in ['abilityBonuses','speed','size','languages','senses','resistances','immunities']:race[field]=parent[field]
        race['choices']=[c for c in parent['choices']if c['type']!='choose_skill']
        inherited=[fid for fid in parent['featureIds']if next(f['name']for f in features if f['id']==fid)!='Versatilidad en Habilidades']
        race['featureIds']=inherited+race['featureIds']
        race['automationNotes'].append('Esta variante sustituye Versatilidad en Habilidades. La ascendencia y su opción deben registrarse manualmente; no recibe automáticamente las dos competencias sustituidas.')
# Explicit alternative AC formulas in the printed Armadura Natural paragraphs.
for feature in features:
    if feature['name'] != 'Armadura Natural': continue
    body=feature['description']
    formula=re.search(r'(?:CA es|CA base de) (\d+)(?: \+ tu modificador de (Destreza|Constitución))?',body)
    if formula:
        feature['effects'].append({'type':'natural_armor','value':int(formula.group(1)),'abilities':[{'Destreza':'dex','Constitución':'con'}[formula.group(2)]] if formula.group(2) else [],'ignoresWornArmor':'No obtienes ningún beneficio por usar armadura' in body})
for filename,data in [('races.json',races),('racial-features.json',features)]: (OUT/filename).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')
report={'races':len(races),'rootRaces':sum(not r['parentId'] for r in races),'subracesAndVariants':sum(bool(r['parentId']) for r in races),'racialTraits':len(features),'sourcePages':99,'unstructuredChoices':[r['id'] for r in races if 'elecci' in r['description'].lower() and not r['choices']]}
(OUT/'races-coverage.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
(ROOT/'docs/races-coverage.md').write_text('# Cobertura racial\n\n'+json.dumps(report,ensure_ascii=False,indent=2)+'\n\nSe incluyen todas las entradas raciales del índice. Los agrupadores de Dracónidos no son razas; cada variante de esos grupos es una entidad independiente. Las manifestaciones de Aasimar y Legado Kobold se conservan como opciones en el texto de la raza, no como subrazas. Descripciones completas preservadas. Aumentos fijos y combinaciones de Multiverso, idiomas, velocidad, visión y resistencias inequívocas están estructurados. Mecánicas condicionadas y opciones complejas requieren lectura y ajuste manual; la existencia de una entidad no equivale a automatización completa.\n',encoding='utf8')
print(json.dumps(report,ensure_ascii=False))
