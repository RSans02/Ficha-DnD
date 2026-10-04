"""Build the class catalog from the manual, applying documented 2014 corrections.

Run after scripts/extract_source.py. Raster progression tables were transcribed
from rendered pages; their page numbers and source inconsistencies are recorded
below and in docs/classes-coverage.md. The effective base rules use SRD 5.1;
original PDF prose remains available for auditing. See docs/rules-2014-audit.md.
"""
from pathlib import Path
import bisect
import json
import re
import unicodedata
from collections import Counter, defaultdict

ROOT = Path(__file__).resolve().parents[1]

def slug(value):
    return re.sub(r'[^a-z0-9]+', '-', unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode().lower()).strip('-')

def text(value):
    # Preserve every word and paragraph, removing only PDF line wrapping.
    return '\n\n'.join(re.sub(r'\s+', ' ', p).strip() for p in re.split(r'\n\s*\n', value) if p.strip())

def source(s):
    return {'page': s['page'], 'endPage': s['endPage']}

def repair_repeated_class_headings(sections, pages):
    """Resolve repeated printed titles by their physical bookmark order.

    The source segmenter chooses the first text match. Eleven pairs of class
    bookmarks have identical printed titles on one page, but different bodies.
    Their PDF left/top destinations were checked against physical text crops.
    Preserve printed titles and stable source IDs; only repair text boundaries.
    """
    sections = [dict(s) for s in sections]
    lengths = [0]
    for page in pages:
        lengths.append(lengths[-1] + len(page['text']) + 1)
    combined = '\n'.join(page['text'] for page in pages)
    groups = defaultdict(list)
    for s in sections:
        if 102 <= s['page'] < 394 and s['anchorStatus'] != 'unresolved-page-fallback':
            groups[(s['page'], slug(s['title']))].append(s)
    repairs = []
    for (page_number, title), group in groups.items():
        if len(group) < 2:
            continue
        raw = pages[page_number - 1]['text']
        matches = []
        offset = 0
        for line in raw.splitlines(keepends=True):
            if slug(line) == title:
                matches.append((offset, offset + len(line.rstrip())))
            offset += len(line)
        # Refuse an ambiguous future import instead of silently copying prose.
        assert len(matches) == len(group), (page_number, title, len(matches), len(group))
        physical_order = sorted(group, key=lambda s: (s['left'], -s['top']))
        for s, (start, end) in zip(physical_order, matches):
            old_start = s['startOffset']
            s['startOffset'] = lengths[page_number - 1] + start
            s['headingEndOffset'] = lengths[page_number - 1] + end
            s['anchorStatus'] = 'repeated-heading-physical-order'
            repairs.append({'sourceId': s['id'], 'page': page_number,
                            'title': s['title'], 'parent': s['parent'],
                            'left': s['left'], 'top': s['top'],
                            'previousStartOffset': old_start,
                            'startOffset': s['startOffset']})
    positions = sorted({s['startOffset'] for s in sections
                        if s['anchorStatus'] != 'unresolved-page-fallback'})
    for index, s in enumerate(sections):
        if not 102 <= s['page'] < 394:
            continue
        start = s['startOffset']
        own_index = bisect.bisect_right(positions, start)
        own_end = positions[own_index] if own_index < len(positions) else len(combined)
        hierarchy_end = next((n['startOffset'] for n in sections[index + 1:]
                              if n['level'] <= s['level'] and n['startOffset'] > start), len(combined))
        if s['anchorStatus'] == 'unresolved-page-fallback':
            hierarchy_end = own_end = lengths[s['page']]
        s['ownText'] = combined[start:own_end].strip()
        s['text'] = combined[start:hierarchy_end].strip()
        s['endPage'] = min(len(pages), bisect.bisect_right(lengths, hierarchy_end - 1))
    return sections, repairs

def spellcasting(ability, mode, progression, formula=None):
    result = {'ability': ability, 'mode': mode, 'progression': progression, 'recovery': 'short' if mode == 'pact' else 'long'}
    if formula: result['preparedFormula'] = formula
    return result

# Rows copied from the manual's class tables, in character-level order 1..20.
# A dash in the original is represented as zero for slots and empty for features.
# SRD 5.1 (2014), Spanish pp. 11, 21, 25, 36 and 40. The manual prints two
# fourth-level slots at class levels 9..17; retain that evidence in the audit,
# while the effective progression correctly grants three fourth-level slots.
FULL = [[int(x) for x in row] for row in ['200000000','300000000','420000000','430000000','432000000','433000000','433100000','433200000','433310000','433320000','433321000','433321000','433321100','433321100','433321110','433321110','433321111','433331111','433332111','433332211']]
HALF = [[int(x) for x in row] for row in ['00000','20000','30000','30000','42000','42000','43000','43000','43200','43200','43300','43300','43310','43310','43320','43320','43331','43331','43332','43332']]
THIRD = [[int(x) for x in row] for row in ['0000','0000','2000','3000','3000','3000','4200','4200','4200','4300','4300','4300','4320','4320','4320','4330','4330','4330','4331','4331']]
ASI = 'Mejora de Puntuación de Característica'

TABLES = {
 'artificiero': (104, 'Ingeniería Mágica, Lanzamiento de hechizos|Infusión de objetos|Especialización de Artificiero, La Herramienta Precisa Para el Trabajo|@|Rasgo de Especialización|Pericia en Herramientas|Mente Brillante|@|Rasgo de Especialización|Experto en Objetos Mágicos|Almacenamiento de Hechizos en Objetos|@||Erudición en Objetos Mágicos|Rasgo de Especialización|@||Maestría en Objetos Mágicos|@|Alma de Artificiero'),
 'barbaro': (121, 'Furia, Defensa sin Armadura|Ataque Temerario, Sentido del peligro|Senda Primitiva|@|Multiataque, Movimiento rápido|Rasgo de Senda|Instinto Salvaje|@|Crítico Brutal (un dado)|Rasgo de Senda|Furia Implacable|@|Crítico Brutal (dos dados)|Rasgo de Senda|Furia Persistente|@|Crítico Brutal (tres dados)|Fuerza Indómita|@|Campeón Primario'),
 'bardo': (140, 'Lanzamiento de Conjuros, Inspiración de Bardos (d6)|Polivalente, Canción de Descanso (d6)|Colegio de Bardo, Experto|@|Inspiración de Bardo (d8), Fuente de Inspiración|Contraoda, Rasgo de Colegio de Bardo||@|Canción de Descanso (d8)|Inspiración de Bardo (d10), Experto, Secretos Mágicos||@|Canción de Descanso (d10)|Secretos Mágicos, Rasgo de Colegio de Bardo|Inspiración de Bardo (d12)|@|Canción de Descanso (d12)|Secretos Mágicos|@|Inspiración Superior'),
 'brujo': (159, 'Patrón de Otro Mundo, Magia del Pacto|Invocaciones Sobrenaturales|Don del Pacto|@||Rasgo de Patrón de Otro Mundo||@||Rasgo de Patrón de Otro Mundo|Arcanum Místico (nivel 6)|@|Arcanum Místico (nivel 7)|Rasgo de Patrón de Otro Mundo|Arcanum Místico (nivel 8)|@|Arcanum Místico (nivel 9)||@|Maestro Arcano'),
 'clerigo': (185, 'Lanzamiento de Conjuros, Dominio Divino|Canalizar Divinidad (1/descanso), Rasgo de Dominio Divino||@|Destruir Muertos Vivientes (VD 1/2)|Canalizar Divinidad (2/descanso), Rasgo de Dominio Divino||@, Destruir Muertos Vivientes (VD 1), Rasgo de Dominio Divino||Intervención Divina|Destruir Muertos Vivientes (VD 2)|@||Destruir Muertos Vivientes (VD 3)||@|Destruir Muertos Vivientes (VD 4), Rasgo de Dominio Divino|Canalizar Divinidad (3/descanso)|@|Intervención Divina Mejorada'),
 'druida': (213, 'Lengua Druídica, Lanzamiento de Conjuros|Forma Salvaje, Círculo Druídico||Mejorar Forma Salvaje, @||Rasgo de Círculo Druídico||Mejorar Forma Salvaje, @||Rasgo de Círculo Druídico||@||Rasgo de Círculo Druídico||@||Cuerpo Atemporal, Conjuros Bestiales|@|Archidruida'),
 'explorador': (234, 'Enemigo Predilecto, Explorador de lo Natural|Estilo de Combate, Lanzamiento de Conjuros|Arquetipo Explorador, Conciencia Primitiva|@|Ataque Extra|Mejora de Enemigo Predilecto, Explorador Natural|Rasgo del Arquetipo del Explorador|@, Zancada Forestal||Mejora de Explorador de lo Natural, Esconderse a Plena Vista|Rasgo del Arquetipo del Explorador|@||Mejora de Enemigo Predilecto, Esfumarse|Rasgo del Arquetipo del Explorador|@||Sentidos Salvajes|@|Asesino de Enemigos'),
 'guerrero': (256, 'Estilo de Combate, Nuevas Energías|Oleada de Acción|Arquetipo Marcial|@|Multiataque|@|Rasgo de Arquetipo Marcial|@|Indomable (un uso)|Rasgo de Arquetipo Marcial|Multiataque (2)|@|Indomable (dos usos)|@|Rasgo de Arquetipo Marcial|@|Oleada de Acción (dos usos), Indomable (tres usos)|Rasgo de Arquetipo Marcial|@|Multiataque (3)'),
 'hechicero': (281, 'Lanzamiento de Conjuros, Origen de Hechicería|Fuente de Magia|Metamagia|@||Rasgo de Origen de Hechicería||@||Metamagia||@||Rasgo de Origen de Hechicería||@|Metamagia|Rasgo de Origen de Hechicería|@|Restauración de Hechicero'),
 'mago': (305, 'Lanzamiento de Conjuros, Recuperación Arcana|Tradición Arcana||@||Rasgo de Tradición Arcana||@||Rasgo de Tradición Arcana||@||Rasgo de Tradición Arcana||@||Maestría en Conjuros|@|Conjuro de Signatura'),
 'monje': (329, 'Defensa sin Armadura, Artes Marciales|Ki, Movimiento Sin Armadura|Tradición Monástica, Desviar Proyectiles|@, Caída Lenta|Ataque Extra, Golpe Aturdidor|Golpes Potenciados con Ki, Rasgo de Tradición Monástica|Evasión, Quietud de la Mente|@|Mejora de Movimiento sin Armadura|Pureza del Cuerpo|Rasgo de Tradición Monástica|@|Lengua del Sol y la Luna|Alma Diamantina|Cuerpo Imperecedero|@|Rasgo de Tradición Monástica|Cuerpo Vacío|@|Perfección de Uno Mismo'),
 'paladin': (351, 'Imposición de Manos, Sentido Divino|Estilo de Combate, Lanzamiento de Conjuros, Castigo Divino|Salud Divina, Juramento Sagrado|@|Ataque Extra|Aura de Protección|Rasgo de Juramento Sagrado|@||Aura de Coraje|Castigo Divino Mejorado|@||Toque Purificador|Rasgo de Juramento Sagrado|@||Mejora de Auras|@|Rasgo de Juramento Sagrado'),
 'picaro': (376, 'Ataque Furtivo, Experto, Jerga de Ladrones|Acción Astuta|Arquetipo de Pícaro|@|Esquiva Asombrosa|Pericia|Evasión|@|Rasgo de Arquetipo de Pícaro|@|Talento Seguro|@|Rasgo de Arquetipo de Pícaro|Sentido Ciego|Mente Escurridiza|@|Rasgo de Arquetipo de Pícaro|Escurridizo|@|Golpe de Suerte'),
}

SKILLS = 'acrobatics animal-handling arcana athletics deception history insight intimidation investigation medicine nature perception performance persuasion religion sleight-of-hand stealth survival'.split()
# Values below normalize the class proficiency paragraphs. The druid weapon
# list corrects the manual's rapier typo to sickle using SRD 5.1, Spanish p. 25.
META = {
 'artificiero': (8, 'int', 'con int', 'light medium shield', 'simple', ['Herramientas de ladrón', 'Una herramienta de artesano de tu elección'], 2, 'arcana history investigation medicine nature perception sleight-of-hand', 3, spellcasting('int','prepared','half','halfLevel+ability')),
 'barbaro': (12, 'str', 'str con', 'light medium shield', 'simple martial', [], 2, 'athletics intimidation nature perception survival animal-handling', 3, None),
 'bardo': (8, 'cha', 'dex cha', 'light', 'simple hand-crossbow longsword rapier shortsword', ['Tres instrumentos musicales de tu elección'], 3, '*', 3, spellcasting('cha','known','full')),
 'brujo': (8, 'cha', 'wis cha', 'light', 'simple', [], 2, 'arcana deception history intimidation investigation nature religion', 1, spellcasting('cha','pact','pact')),
 'clerigo': (8, 'wis', 'wis cha', 'light medium shield', 'simple', [], 2, 'insight history medicine persuasion religion', 1, spellcasting('wis','prepared','full','level+ability')),
 'druida': (8, 'wis', 'int wis', 'light medium shield', 'quarterstaff scimitar club dagger dart sickle sling javelin spear mace', ['Kit de herboristería'], 2, 'arcana insight medicine nature perception religion survival animal-handling', 2, spellcasting('wis','prepared','full','level+ability')),
 'explorador': (10, 'dex wis', 'str dex', 'light medium shield', 'simple martial', [], 3, 'athletics insight investigation animal-handling nature perception stealth survival', 3, spellcasting('wis','known','half')),
 'guerrero': (10, 'str dex', 'str con', 'light medium heavy shield', 'simple martial', [], 2, 'acrobatics athletics insight history intimidation animal-handling perception survival', 3, None),
 'hechicero': (6, 'cha', 'con cha', '', 'dagger dart sling quarterstaff light-crossbow', [], 2, 'arcana insight deception intimidation persuasion religion', 1, spellcasting('cha','known','full')),
 'mago': (6, 'int', 'int wis', '', 'quarterstaff light-crossbow dagger dart sling', [], 2, 'arcana insight history investigation medicine religion', 2, spellcasting('int','spellbook','full','level+ability')),
 'monje': (8, 'dex wis', 'str dex', '', 'simple shortsword', ['Una herramienta de artesano o un instrumento musical de tu elección'], 2, 'acrobatics athletics insight history religion stealth', 3, None),
 'paladin': (10, 'str cha', 'wis cha', 'light medium heavy shield', 'simple martial', [], 2, 'athletics insight intimidation medicine persuasion religion', 3, spellcasting('cha','prepared','half','halfLevel+ability')),
 'picaro': (8, 'dex', 'dex int', 'light', 'simple hand-crossbow longsword rapier shortsword', ['Herramientas de ladrón'], 4, 'acrobatics athletics insight deception performance intimidation investigation sleight-of-hand perception persuasion stealth', 3, None),
}
EXCLUDE_SUBCLASS = re.compile(r'^(Tabla|Rasgos|Información|Opciones|Invocaciones|Infusiones|Patrones de Otros Mundos|Dominios Divinos|Círculos Druídicos$|Arquetipo|Origen de Hechicero|Tradiciones|Juramentos Sagrados)')

ALIASES = {
 'ingenieria-magica': 'arreglo-magico', 'senda-primitiva':'senda-primaria', 'lanzamiento-de-conjuros':'lanzamiento-de-hechizos',
 'inspiracion-de-bardos':'inspiracion-de-bardo', 'magia-del-pacto':'magia-de-pacto', 'don-del-pacto':'don-de-pacto',
 'destruir-muertos-vivientes':'destruir-no-muertos','intervencion-divina-mejorada':'intervencion-divina',
 'mejorar-forma-salvaje':'forma-salvaje','cuerpo-atemporal':'cuerpo-eterno','arquetipo-explorador':'arquetipo-de-explorador',
 'ataque-extra':'multiataque','mejora-de-enemigo-predilecto':'enemigo-predilecto','explorador-natural':'explorador-de-lo-natural',
 'zancada-forestal':'zancada-de-la-tierra','mejora-de-explorador-de-lo-natural':'explorador-de-lo-natural',
 'esconderse-a-plena-vista':'ocultarse-a-plena-vista','esfumarse':'esfumarte','origen-de-hechiceria':'origen-de-hechicero',
 'restauracion-de-hechicero':'restablecimiento-de-hechicero','maestria-en-conjuros':'maestria-de-hechizos',
 'conjuro-de-signatura':'hechizo-de-signatura','golpes-potenciados-con-ki':'golpes-potenciados-por-ki',
 'mejora-de-movimiento-sin-armadura':'movimiento-sin-armadura','toque-purificador':'toque-de-purificacion','pericia':'experto',
}

def progression(k, features):
    page, raw = TABLES[k]
    names = raw.replace('@', ASI).split('|')
    assert len(names) == 20, (k, len(names))
    lookup = {slug(f['name']):f['id'] for f in features if not f.get('optional') and not f.get('selectionOnly')}
    result=[]
    for i, namestr in enumerate(names):
        level=i+1; labels = [x.strip() for x in namestr.split(',') if x.strip()]; ids=[]
        for label in labels:
            name=slug(re.sub(r'\s*\([^)]*\)', '', label))
            name=ALIASES.get(name,name)
            subclass_alias={'artificiero':'especializacion-de-artificiero','barbaro':'senda-primaria','bardo':'colegio-de-bardo','brujo':'patron-de-otro-mundo','clerigo':'dominio-divino','druida':'circulo-druidico','explorador':'arquetipo-de-explorador','guerrero':'arquetipo-marcial','hechicero':'origen-de-hechicero','mago':'tradicion-arcana','monje':'tradicion-monastica','paladin':'juramento-sagrado','picaro':'arquetipo-de-picaro'}
            if name.startswith(('rasgo-de-','rasgo-del-')):name=subclass_alias[k]
            if name=='lanzamiento-de-hechizos' and k=='druida': name='lanzamiento-de-hechizo'
            if name in lookup: ids.append(lookup[name])
            if name=='mejora-de-auras': ids.extend(lookup[n] for n in ('aura-de-proteccion','aura-de-coraje') if n in lookup)
        row={'level':level,'proficiencyBonus':2+i//4,'featureIds':list(dict.fromkeys(ids)),'featureNames':labels,'slots':[], 'cantrips':None,'knownSpells':None,'resources':{},'source':{'page':page,'endPage':page}}
        if k in ('bardo','clerigo','druida','hechicero','mago'): row['slots']=FULL[i][:]
        if k in ('artificiero','explorador','paladin'): row['slots']=HALF[i][:]
        if k=='artificiero':
            if level==1:row['slots']=[2,0,0,0,0]
            row['cantrips']=2 if level<10 else 3 if level<14 else 4
            row['resources']={'infusionsKnown':0 if level<2 else 4 if level<6 else 6 if level<10 else 8 if level<14 else 10 if level<18 else 12,'infusedItems':0 if level<2 else 2 if level<6 else 3 if level<10 else 4 if level<14 else 5 if level<18 else 6}
        if k=='barbaro': row['resources']={'rageUses':[2,2,3,3,3,4,4,4,4,4,4,5,5,5,5,5,6,6,6,-1][i], 'rageDamage':2 if level<9 else 3 if level<16 else 4}
        if k=='bardo':
            row['cantrips']=2 if level<4 else 3 if level<10 else 4
            row['knownSpells']=[4,5,6,7,8,9,10,11,12,14,15,15,16,18,19,19,20,22,22,22][i]
            row['resources']={'inspirationDie':6 if level<5 else 8 if level<10 else 10 if level<15 else 12, 'songOfRestDie':6 if level<9 else 8 if level<13 else 10 if level<17 else 12}
        if k=='brujo':
            row['cantrips']=2 if level<4 else 3 if level<10 else 4
            row['knownSpells']=[2,3,4,5,6,7,8,9,10,10,11,11,12,12,13,13,14,14,15,15][i]
            slotlevel=min(5,(level+1)//2); count=1 if level==1 else 2 if level<11 else 3 if level<17 else 4
            row['slots']=[0]*(slotlevel-1)+[count]
            row['resources']={'pactSlots':count,'pactSlotLevel':slotlevel,'invocationsKnown':[0,2,2,2,3,3,4,4,5,5,5,6,6,6,7,7,7,8,8,8][i]}
        if k in ('clerigo','mago'): row['cantrips']=3 if level<4 else 4 if level<10 else 5
        if k=='clerigo':row['resources']={'channelDivinity':0 if level<2 else 1 if level<6 else 2 if level<18 else 3}
        if k=='druida':row['cantrips']=2 if level<4 else 3 if level<10 else 4
        if k=='explorador': row['knownSpells']=[0,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11][i]
        if k=='hechicero':
            row['cantrips']=4 if level<4 else 5 if level<10 else 6
            row['knownSpells']=[2,3,4,5,6,7,8,9,10,11,12,12,13,13,14,14,15,15,15,15][i]
            row['resources']={'sorceryPoints':0 if level==1 else level}
        if k=='monje':row['resources']={'kiPoints':0 if level==1 else level,'martialArtsDie':4 if level<5 else 6 if level<11 else 8 if level<17 else 10,'unarmoredMovement':0 if level==1 else 10 if level<6 else 15 if level<10 else 20 if level<14 else 25 if level<18 else 30}
        if k=='picaro':row['resources']={'sneakAttackDice':(level+1)//2}
        if k=='guerrero':row['resources']={'actionSurge':0 if level<2 else 1 if level<17 else 2,'indomitable':0 if level<9 else 1 if level<13 else 2 if level<17 else 3}
        result.append(row)
    return result

def get_levels(s):
    match = re.search(r'Rasg[oa]s?\s+(?:Opcional\s+)?de\s+Nivel(?:es)?\s+([\d, y]+)', s, re.I)
    if match:return [int(n) for n in re.findall(r'\d+',match.group(1)) if 1<=int(n)<=20]
    return []

def class_features(sections, cls, nextpage, subclasses):
    k=slug(cls['title']); output=[]; seen=Counter(); classids=[]; options={}; references=[]
    subnames={s['name']:s for s in subclasses}
    for s in sections:
        if not cls['page']<=s['page']<nextpage or s['level']!=3:continue
        if len(s['title'])>150:continue # accidental paragraph bookmarks, not features
        parent=s['parent']; sub=subnames.get(parent)
        optional=parent.startswith('Opciones')
        core=parent.startswith('Rasgos')
        selection=parent.startswith(('Infusiones','Invocaciones'))
        name=s['title']; key=f'feature-{k}-'+(slug(parent)+'-' if sub or selection or optional else '')+slug(name)
        seen[key]+=1
        if seen[key]>1:key+=f'-{seen[key]}'
        body=text(s['ownText']);levels=get_levels(body)
        kind='class' if core else 'subclass' if sub else 'option' if selection or optional else 'reference'
        f={'id':key,'name':name,'description':body,'source':source(s),'originId':sub['id'] if sub else 'class-'+k,'level':min(levels) if levels else None,'levels':levels,'kind':kind,'optional':optional,'selectionOnly':selection or kind=='reference','effects':[], 'choices':[]}
        if selection:
            prerequisite=re.search(r'(?:Prerrequisito|Pre-requisito|Requisito)s?\s*:\s*([^\n]+)',s['ownText'],re.I)
            if prerequisite:f['prerequisiteText']=text(prerequisite.group(1))
            options.setdefault(parent,[]).append(f)
        if core or optional:classids.append(key)
        if sub:sub['featureIds'].append(key)
        if kind=='reference':references.append(key)
        output.append(f)
    return output,classids,options,references

def set_core_automation(k, features):
    core={slug(f['name']):f for f in features if f['originId']=='class-'+k and not f.get('optional') and not f.get('selectionOnly')}
    def resource(name,max,recovery):
        if name in core:core[name]['resource']={'max':max,'recovery':recovery}
    def effects(name,eff):
        if name in core:core[name]['effects'].extend(eff)
    if k=='barbaro':
        resource('furia',{'byLevel':[2,2,3,3,3,4,4,4,4,4,4,5,5,5,5,5,6,6,6,-1]},'long')
        effects('defensa-sin-armadura',[{'type':'unarmoredDefense','abilities':['dex','con'],'shieldAllowed':True}])
        effects('movimiento-rapido',[{'type':'speed','value':10,'condition':'not-heavy-armor'}])
        effects('campeon-primario',[{'type':'ability_bonus','ability':'str','value':4,'maximum':24},{'type':'ability_bonus','ability':'con','value':4,'maximum':24}])
    if k=='monje':
        resource('ki',{'byLevel':[0]+list(range(2,21))},'short')
        effects('defensa-sin-armadura',[{'type':'unarmoredDefense','abilities':['dex','wis'],'shieldAllowed':False}])
    if k=='hechicero':resource('fuente-de-magia',{'byLevel':[0]+list(range(2,21))},'long')
    if k=='clerigo':resource('canalizar-divinidad',{'byLevel':[0]+[1]*4+[2]*12+[3]*3},'short')
    if k=='druida':resource('forma-salvaje',2,'short')
    if k=='guerrero':
        resource('nuevas-energias',1,'short');resource('oleada-de-accion',{'byLevel':[0]+[1]*15+[2]*4},'short');resource('indomable',{'byLevel':[0]*8+[1]*4+[2]*4+[3]*4},'long')
    if k=='paladin':
        resource('imposicion-de-manos',{'byLevel':[n*5 for n in range(1,21)]},'long')
        resource('toque-de-purificacion',{'ability':'cha','min':1},'long')
        effects('aura-de-proteccion',[{'type':'save_ability_bonus','ability':'cha','minimum':1,'condition':'conscious'}])
    if k=='artificiero':resource('mente-brillante',{'ability':'int','min':1},'long')
    if k=='bardo':
        resource('inspiracion-de-bardo',{'ability':'cha','min':1},'long')
        effects('polivalente',[{'type':'half_proficiency_untrained'}])
    if k=='picaro':resource('golpe-de-suerte',1,'short')

def add_prose_choices(c, features):
    """Turn explicitly named decisions into individually selectable source entries."""
    k=slug(c['name']); base=list(features)
    def make_options(feature, names):
        body=feature['description']; matches=[]
        for name in names:
            pattern='A [dD]istancia' if name=='A Distancia' else re.escape(name)
            m=re.search(pattern+r'(?=[.:\s])', body)
            if m:matches.append((m.start(),name))
        matches.sort();options=[]
        for i,(start,name) in enumerate(matches):
            desc=body[start:matches[i+1][0] if i+1<len(matches) else len(body)].strip()
            fid=feature['id']+'-option-'+slug(name)
            f={'id':fid,'name':name,'description':desc,'source':feature['source'],'originId':feature['originId'],'level':feature['level'],'kind':'option','selectionOnly':True,'optional':feature.get('optional',False),'effects':[]}
            if slug(name)=='defensa':f['effects']=[{'type':'conditional_ac_bonus','value':1,'condition':'wearing-armor'}]
            if slug(name)=='lucha-a-ciegas':f['effects']=[{'type':'sense','value':'Visión ciega 10 pies'}]
            features.append(f);options.append({'id':fid,'name':name,'description':desc,'effects':[{'type':'feature','featureId':fid}]})
        return options
    styles=['A Distancia','Defensa','Duelista','Lucha con Arma a Dos Manos','Protección','Lucha con Dos Armas','Lucha a Ciegas','Guerrero Druida','Lucha con Armas Arrojadizas','Interceptar','Técnica Superior','Lucha Lanzando Armas','Lucha Desarmada','Guerrero Bendito']
    if k in ('guerrero','explorador','paladin'):
        options=[]
        for f in base:
            if f['name'] in ('Estilo de Combate','Opciones Para el Estilo de Combate') and f['originId']==c['id']:
                options.extend(make_options(f,styles))
        c['choices'].append({'id':f'choice-{k}-estilo-de-combate','type':'feature','name':'Estilo de Combate','amount':1,'level':1 if k=='guerrero' else 2,'required':True,'options':options})
    if k=='hechicero':
        options=[]
        for f in base:
            if f['name'] in ('Metamagia','Opciones de Metamagia'):
                options.extend(make_options(f,['Hechizo Cuidadoso','Hechizo Distante','Hechizo Potenciado','Ampliar Hechizo','Conjuro Aumentado','Hechizo Acelerado','Hechizo sutil','Hechizo Duplicado','Hechizo Buscador','Transmutar Hechizo']))
        for level,amount in [(3,2),(10,1),(17,1)]:
            c['choices'].append({'id':f'choice-hechicero-metamagia-{level}','type':'feature','name':f'Metamagia (nivel {level})','amount':amount,'level':level,'required':True,'distinctFrom':[f'choice-hechicero-metamagia-{n}' for n in (3,10,17) if n!=level],'options':options})
    if k=='brujo':
        parent=next(f for f in base if f['name']=='Don de Pacto')
        options=make_options(parent,['Pacto de la Cadena','Pacto de la Hoja','Pacto del Tomo'])
        talisman=next(f for f in base if f['name']=='Pacto del Talismán')
        talisman['selectionOnly']=True
        options.append({'id':talisman['id'],'name':talisman['name'],'description':talisman['description'],'effects':[{'type':'feature','featureId':talisman['id']}]})
        c['choices'].append({'id':'choice-brujo-don-de-pacto','type':'feature','name':'Don de Pacto','amount':1,'level':3,'required':True,'options':options})
    if k in ('bardo','picaro'):
        for level in ((3,10) if k=='bardo' else (1,6)):
            c['choices'].append({'id':f'choice-{k}-experto-{level}','type':'expertise','name':f'Experto (nivel {level})','amount':2,'level':level,'required':True,'requiresProficiency':True,'options':[{'id':skill,'name':skill,'effects':[{'type':'skill_expertise','skill':skill}]} for skill in SKILLS]+([{'id':'thieves-tools','name':'Herramientas de ladrón','effects':[{'type':'proficiency','value':'Pericia: herramientas de ladrón'}]}] if k=='picaro' else [])})

def add_option_prerequisites(c, features, sections):
    """Parse printed requirements only; preserve a manual gate for open predicates."""
    if c['id'] not in ('class-brujo','class-artificiero'):return
    lookup={f['id']:f for f in features}
    spells=json.loads((ROOT/'data/rules/spells.json').read_text(encoding='utf-8'))
    spell_ids={slug(s['name']):s['id'] for s in spells}
    pact_names={'pacto-de-la-cadena':'Pacto de la Cadena','pacto-de-la-espada':'Pacto de la Hoja','pacto-de-la-hoja':'Pacto de la Hoja','pacto-del-filo':'Pacto de la Hoja','pacto-del-tomo':'Pacto del Tomo','pacto-del-talisman':'Pacto del Talismán'}
    pact_ids={label:next((f['id'] for f in features if f['name']==name),None) for label,name in pact_names.items()}
    gates=[]
    for choice in c['choices']:
        if choice.get('dynamicAmountResource') not in ('invocationsKnown','infusionsKnown'):continue
        for option in choice['options']:
            f=lookup[option['id']]
            origin=next((s for s in sections if s['title']==f['name'] and s['page']==f['source']['page'] and text(s['ownText'])==f['description']),None)
            if not origin:continue
            lines=origin['ownText'].splitlines(); requirement=''
            for i,line in enumerate(lines):
                match=re.search(r'(?:Prerrequisito|Pre-requisito|Requisito)s?\s*:\s*(.*)',line,re.I)
                if not match:continue
                parts=[match.group(1).strip()]
                for following in lines[i+1:]:
                    following=following.strip()
                    if not following or not following[0].islower():break
                    parts.append(following)
                requirement=' '.join(parts);break
            if not requirement:continue
            f['prerequisiteText']=requirement
            normalized=slug(requirement);requirements=[];remaining=normalized
            level=re.search(r'\bnivel-(\d+)\b',remaining)
            if level:
                requirements.append({'type':'class','value':c['id'],'minimum':int(level.group(1))})
                remaining=re.sub(r'nivel-\d+(?:-de-artificiero)?','',remaining)
            def manual_gate(reason):
                gateid='verify.'+f['id']
                if not any(g['id']==gateid for g in gates):
                    gates.append({'id':gateid,'type':'manual_verification','name':'Revisar requisito: '+f['name'],'amount':1,'required':False,'level':int(level.group(1)) if level else 2,'source':f['source'],'options':[{'id':'confirmed','name':'He revisado con el DM que mi personaje cumple este requisito','description':reason}]})
                return {'type':'requires_manual_verification','value':reason,'verificationChoiceId':gateid}
            if 'el-hechizo-mal-de-ojo-o-un-rasgo-de-brujo-que-maldiga' in remaining:
                spellid=spell_ids.get('mal-de-ojo')
                alternatives=([{'type':'spell','value':spellid}] if spellid else [])+[manual_gate('Un rasgo de brujo que maldiga: comprueba su descripción en el manual.')]
                requirements.append({'type':'any','options':alternatives})
                remaining=remaining.replace('el-hechizo-mal-de-ojo-o-un-rasgo-de-brujo-que-maldiga','')
            for pact,pactid in pact_ids.items():
                if pact in remaining:
                    requirements.append({'type':'feature','value':pactid} if pactid else manual_gate(requirement))
                    remaining=remaining.replace(pact,'')
            if 'descarga-sobrenatural' in remaining:
                sid=spell_ids.get('descarga-sobrenatural')
                requirements.append({'type':'spell','value':sid} if sid else manual_gate(requirement))
                remaining=remaining.replace('descarga-sobrenatural','')
            unparsed=[w for w in remaining.split('-') if w and w not in ('y','el','la','un','rasgo','truco','hechizo')]
            if unparsed or not requirements:requirements.append(manual_gate(requirement))
            f['prerequisites']=requirements;option['prerequisites']=requirements
    c['choices'].extend(gates)

def main():
    sections=json.loads((ROOT/'data/source/sections.json').read_text(encoding='utf-8'))
    pages=json.loads((ROOT/'data/source/pages-reading-order.json').read_text(encoding='utf-8'))
    sections, anchor_repairs=repair_repeated_class_headings(sections,pages)
    classheads=[s for s in sections if s['level']==1 and s['parent']=='Clases']
    allfeatures=[];classes=[];notes=[]
    for index, head in enumerate(classheads):
        k=slug(head['title']); end=classheads[index+1]['page'] if index+1<len(classheads) else 394
        members=[s for s in sections if head['page']<=s['page']<end]
        subheads=[s for s in members if s['level']==2 and not EXCLUDE_SUBCLASS.match(s['title'])]
        subclasses=[{'id':f'subclass-{k}-{slug(s["title"])}','name':s['title'],'description':text(s['ownText']),'source':source(s),'featureIds':[]} for s in subheads]
        fs,ids,groups,refs=class_features(sections,head,end,subclasses)
        set_core_automation(k,fs)
        hd,primary,saves,armor,weapons,tools,amount,skills,sublevel,casting=META[k]
        c={'id':'class-'+k,'name':head['title'],'description':text(head['ownText']),'source':{'page':head['page'],'endPage':end-1},'hitDie':hd,'primaryAbilities':primary.split(),'savingThrows':saves.split(),'armorProficiencies':armor.split(),'weaponProficiencies':weapons.split(),'toolProficiencies':tools,'skillChoices':{'amount':amount,'options':SKILLS if skills=='*' else skills.split()},'subclassLevel':sublevel,'subclasses':subclasses,'featureIds':ids,'progression':progression(k,fs),'spellcasting':casting,'choices':[],'referenceFeatureIds':refs,'automationNotes':[]}
        if k=='brujo':groups={'Invocaciones':sum(groups.values(),[])}
        for label,options in groups.items():
            base=2 if label.startswith('Invocaciones') else 4
            c['choices'].append({'id':f'choice-{k}-{slug(label)}','type':'feature','name':label,'amount':base,'level':2,'required':True,'dynamicAmountResource':'invocationsKnown' if label.startswith('Invocaciones') else 'infusionsKnown','options':[{'id':f['id'],'name':f['name'],'description':f['description'],'effects':[{'type':'feature','featureId':f['id']}]} for f in options]})
        add_prose_choices(c,fs)
        add_option_prerequisites(c,fs,members)
        requirement_abilities={'artificiero':'int','barbaro':'str','bardo':'cha','brujo':'cha','clerigo':'wis','druida':'wis','explorador':'dex wis','guerrero':'str dex','hechicero':'cha','mago':'int','monje':'dex wis','paladin':'str cha','picaro':'dex'}
        c['multiclassRequirements']=[{'ability':a,'minimum':13} for a in requirement_abilities[k].split()]
        c['multiclassRequirementMode']='any' if k=='guerrero' else 'all'
        c['multiclassRequirementsSource']={'page':450,'endPage':450}
        # Supplemental chapter introductions may contain options without separate
        # bookmarks. Preserve them as references, never grant them implicitly.
        for s in members:
            if s['level']==2 and EXCLUDE_SUBCLASS.match(s['title']) and not s['title'].startswith(('Rasgos','Tabla')):
                f={'id':f'feature-{k}-reference-{slug(s["title"])}','name':s['title'],'description':text(s['ownText']),'source':source(s),'originId':c['id'],'level':None,'kind':'reference','selectionOnly':True,'optional':s['title'].startswith('Opciones')}
                fs.append(f);c['referenceFeatureIds'].append(f['id'])
        if k=='artificiero':
            c['automationNotes'].append('Multiclase: suma la mitad de niveles de artificiero redondeada hacia arriba (p. 105). La tabla llama Ingeniería Mágica al rasgo Arreglo Mágico.')
        if k=='barbaro':c['automationNotes'].append('Furia de nivel 20: usos ilimitados, representados por -1. La tabla concede Senda a nivel 10, omitido en el encabezado del rasgo. Juggernaut: Golpe Huracanado dice nivel 6 en encabezado y nivel 10 en texto; se conserva la discrepancia sin corregir el manual.')
        if k=='bardo':c['automationNotes'].append('Inspiración recupera usos con descanso corto a partir de nivel 5 mediante Fuente de Inspiración; el recurso base conserva recuperación larga.')
        if k=='druida':c['automationNotes'].append('Reglas 2014: competencia con hoz, no con estoque (SRD 5.1, p. 25; errata del PDF). Restricción: ninguna armadura ni escudo de metal. Archidruida elimina el límite de Forma Salvaje a nivel 20.')
        if k=='explorador':c['automationNotes'].append('La cabecera de Mejora de Puntuación incluye nivel 14, pero la tabla y el cuerpo del rasgo no lo incluyen. La progresión sigue la tabla. Las opciones de Tasha que reemplazan rasgos requieren elección explícita.')
        for sub in subclasses:
            if sub['name'] in ('Caballero Arcano','Bribón Arcano'):
                sub['spellcasting']=spellcasting('int','known','third')
                sub['progression']=[]
                for i in range(20):
                    level=i+1;kn=[0,0,3,4,4,4,5,6,6,7,8,8,9,10,10,11,11,11,12,13][i]
                    can=0 if level<3 else (2 if level<10 else 3) if sub['name']=='Caballero Arcano' else (3 if level<10 else 4)
                    sub['progression'].append({'level':level,'proficiencyBonus':2+i//4,'featureIds':[f['id'] for f in fs if f['originId']==sub['id'] and f['level']==level],'featureNames':[],'slots':THIRD[i][:],'cantrips':can,'knownSpells':kn,'resources':{},'source':{'page':259 if sub['name']=='Caballero Arcano' else 382}})
                sub['automationNotes']=['Solo conjuros de mago y restricciones de escuela detalladas en Lanzamiento de Hechizos.']
                if sub['name']=='Caballero Arcano':sub['automationNotes'].append('El tercer truco se aprende a nivel 10, como indica el texto de Lanzamiento de Hechizos (2014). Se corrige la errata de la tabla del PDF, que lo adelanta al nivel 9.')
        # Source ownText includes all feature prose; the full hierarchical text is
        # also retained in data/source/sections.json for a lossless source view.
        classes.append(c);allfeatures.extend(fs)
    assert len(classes)==13
    assert len({f['id'] for f in allfeatures})==len(allfeatures)
    allids={f['id'] for f in allfeatures}
    for c in classes:
        assert len(c['progression'])==20
        for origin in [c]+c['subclasses']:
            assert set(origin['featureIds'])<=allids
        assert all(p['proficiencyBonus']==2+(p['level']-1)//4 for p in c['progression'])
    for filename, value in [('classes.json',classes),('class-features.json',allfeatures)]:
        path=ROOT/'data/rules'/filename;path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (ROOT/'data/rules/class-source-repairs.json').write_text(json.dumps(anchor_repairs,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    coverage=['# Cobertura de clases del manual','', 'Fuente de contenido: Manual para Casi Todo de D&D 5e (V30.03.25).pdf, páginas físicas 102–393. La base mecánica se contrasta con SRD 5.1 (reglas 2014); véase [auditoría de 2014](rules-2014-audit.md).','',f'{len(classes)} clases, {sum(len(c["subclasses"]) for c in classes)} subclases, {len(allfeatures)} entradas de rasgos y referencias; 260 filas de progresión de clase y 40 filas de progresión de subclase.','', '| Clase | Páginas | Subclases | Rasgos de clase/opcionales | Tabla |','|---|---|---:|---:|---:|']
    for c in classes:coverage.append(f'| {c["name"]} | {c["source"]["page"]}–{c["source"]["endPage"]} | {len(c["subclasses"])} | {len(c["featureIds"])} | {TABLES[slug(c["name"])][0]} |')
    coverage+=['','## Método y auditoría','', 'El extractor consume todas las secciones de nivel 1, 2 y 3 del capítulo, con texto segmentado por columnas y marcadores del PDF. Conserva íntegro cada rasgo en description y la referencia física de página. Los encabezados accidentales de párrafos en las páginas 137 y 157 se excluyen como entidades, pero sus textos permanecen en la fuente y la introducción de subclase. Infusiones, invocaciones, opciones de Tasha y referencias de Xanathar se distinguen para impedir concesiones automáticas de opciones.','', 'Las tablas rasterizadas de las páginas 104, 140, 159, 185, 213, 234, 281, 305 y 329, y las tablas de subclase de 259 y 382, se renderizaron y revisaron visualmente. Sus valores se transcriben en constantes explícitas del extractor. Las tablas de 121, 256, 351 y 376 tienen texto extraíble. Las correcciones mecánicas documentadas usan SRD 5.1 (2014); no se incorporan las reglas revisadas de 2024.','', 'Comprobaciones reproducibles: 13 clases, 20 niveles consecutivos por clase, unicidad de identificadores y referencias de rasgo resueltas. Los campos null indican que el dato no aplica o que el encabezado no especifica nivel; nunca se inventa un nivel.','', '## Notas de fuente y límites de automatización','']
    for c in classes:
        for n in c['automationNotes'][:-1]:coverage.append(f'- {c["name"]}: {n}')
    coverage+=['', '## Encabezados repetidos verificados', '',
               'Se separan 11 pares de marcadores con el mismo título impreso en una página. Las coordenadas left/top del PDF se contrastaron con el texto físico; cada ocurrencia recibe su cuerpo y nivel propios. Se conservan los títulos repetidos y los IDs existentes, sin sustituirlos por nombres de otra fuente. El registro reproducible está en `data/rules/class-source-repairs.json`.', '',
               '| Página física | Título impreso repetido | Cuerpos separados |',
               '|---:|---|---|',
               '| 116 | Arma Mejorada | Bonificador de arma / arma arrojadiza que vuelve a la mano |',
               '| 130 | Escudo Espiritual | Consulta ancestral, nivel 10 / represalia, nivel 14 |',
               '| 132 | Presencia Fanática | Inspiración, nivel 10 / resistir golpes fatales, nivel 14 |',
               '| 165 | Resistencia Infernal | Resistencia, nivel 10 / viaje infernal, nivel 14 |',
               '| 200 | Lanzamiento de Hechizos Potentes | Daño de trucos, nivel 8 / curación, nivel 17 |',
               '| 241 | Furia Bestial | Dos ataques, nivel 11 / compartir conjuro, nivel 15 |',
               '| 245 | Defensa Sobrenatural | Salvaciones, nivel 7 / frustrar magia, nivel 11 |',
               '| 301 | Fenómeno Lunar | Hechicero de la Luna, nivel 18 / Runaestirpe, nivel 1 |',
               '| 314 | Ilusiones Maleables | Cambiar ilusión, nivel 6 / duplicado defensivo, nivel 10 |',
               '| 372 | Represión Vigilante | Represalia, nivel 15 / transformación, nivel 20 |',
               '| 388 | Maniobra Elegante | Acrobacia o Atletismo, nivel 13 / repetir ataque, nivel 17 |', '',
               '## Opciones y límites restantes', '']
    coverage+=['- Caballero Arcano: tercer truco a nivel 10 según la prosa de 2014; se corrige la errata de nivel 9 de la tabla.', '- Se estructuran como elecciones: 16 infusiones, 54 invocaciones, 4 pactos, 10 opciones de metamagia, estilos de combate y pericias de bardo/pícaro. Los cupos de infusiones e invocaciones se vinculan a la progresión mediante dynamicAmountResource. Los requisitos para multiclase proceden de la tabla de la página 450; Guerrero permite Fuerza O Destreza.', '- No se automatizan todavía todas las decisiones contenidas en prosa (maniobras, modelos de armadura, tótems, escuelas y rasgos con selección de hechizos). Su texto íntegro está disponible. Las elecciones catalogadas no aplican por defecto.', '- Las tablas insertadas como imagen dentro de rasgos (listas de hechizos, resultados aleatorios, estadísticas de compañeros) pueden no aparecer como texto en la extracción; la referencia de página y el PDF completo son la autoridad. Las tablas principales de progresión sí se transcribieron completas.','', '## Reproducir','', 'Ejecutar primero el extractor de fuentes que genera data/source/sections.json y después `python scripts/extract_classes.py`. Los archivos JSON se regeneran de forma determinista.','']
    (ROOT/'docs/classes-coverage.md').write_text('\n'.join(coverage),encoding='utf-8')
    print(json.dumps({'classes':len(classes),'subclasses':sum(len(c['subclasses']) for c in classes),'features':len(allfeatures),'optional':sum(bool(f.get('optional')) for f in allfeatures),'nullLevels':sum(f['level'] is None and f.get('kind') in ('class','subclass') for f in allfeatures)},ensure_ascii=False))

if __name__=='__main__':main()
