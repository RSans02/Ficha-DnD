'use client';
import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronDown, Clock, Search, Sparkles, Star } from 'lucide-react';
import type { Background, Catalog, CharacterClass, Entity, Feat, Race, Spell } from '@/lib/types';
import { Button, ClassIcon, Empty, Modal, SourceTag, cleanDescription } from './ui';
import { spellDescriptionSections } from '@/lib/spell-description';
import { backgroundParentName } from '@/lib/background-label';
import { featDescriptionSections } from '@/lib/feat-description';
import { readableParagraphs } from '@/lib/readable-prose';
import { backgroundDescriptionSections, backgroundDisplayFacts } from '@/lib/background-description';

export function SpellDetails({spell:s}:{spell:Spell}){
  const {effect,progression,progressionLabel}=spellDescriptionSections(s);
  const readableEffect=effect.replace(/\bAl impactar\b/g,'Al\u00a0impactar');
  const facts=[
    ['Tiempo de lanzamiento',s.castingTime],
    ['Alcance',s.range],
    ['Duración',s.duration],
    ['Componentes',s.components]
  ];
  return <article className="spell-detail">
    <div className="spell-detail-heading">
      <div className="spell-detail-tags">
        <span className="badge gold">{s.level===null?'Nivel en conflicto':s.level===0?'Truco':`Nivel ${s.level}`}</span>
        <span className="badge">{s.school}</span>
        {s.concentration&&<span className="badge">Concentración</span>}
        {s.ritual&&<span className="badge">Ritual</span>}
      </div>
      <SourceTag source={s.source}/>
    </div>
    <dl className="spell-meta-grid">{facts.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value||'No disponible en la fuente'}</dd></div>)}</dl>
    <section className="spell-effect" aria-label="Efecto del conjuro">
      <h3>Efecto</h3>
      <p className="source-prose">{readableEffect}</p>
    </section>
    {progression&&<section className="spell-higher-levels" aria-label={progressionLabel}>
      <h3>{progressionLabel}</h3>
      <p className="source-prose">{progression}</p>
    </section>}
    {s.automationNotes?.map((note,i)=><div key={i} className="info-box spell-automation-note">{note}</div>)}
  </article>;
}

export function FeatDetails({feat}:{feat:Feat}){
  const {introduction,benefits}=featDescriptionSections(feat);
  const paragraphs=benefits.length?[introduction]:readableParagraphs(introduction);
  return <article className="feat-detail">
    <div className="feat-detail-meta"><span className="badge gold">Dote</span><SourceTag source={feat.source}/></div>
    {feat.prerequisiteText&&<section className="feat-prerequisite" aria-label="Requisito previo">
      <h3>Requisito previo</h3>
      <p>{feat.prerequisiteText}</p>
    </section>}
    <section className="feat-benefits" aria-label={benefits.length?'Beneficios':'Descripción'}>
      <h3>{benefits.length?'Beneficios':'Descripción'}</h3>
      {paragraphs.filter(Boolean).map((paragraph,index)=><p className="feat-introduction" key={index}>{paragraph}</p>)}
      {benefits.length>0&&<ul>{benefits.map((benefit,index)=><li key={index}>{benefit}</li>)}</ul>}
    </section>
    {feat.automationNotes?.map((note,index)=><div key={index} className="info-box feat-automation-note">{note}</div>)}
  </article>;
}

export function BackgroundDetails({background,catalog}:{background:Background;catalog:Catalog}){
  const {introduction,sections}=backgroundDescriptionSections(background);
  const facts=backgroundDisplayFacts(background,catalog);
  const parent=backgroundParentName(background,catalog);
  const notes=background.automationNotes?.filter(note=>!note.startsWith('Las competencias fijas y las elecciones de habilidades, herramientas e idiomas están estructuradas.'))??[];
  return <article className="background-detail">
    <div className="background-detail-meta">
      <span className="badge gold">{parent?'Variante de trasfondo':'Trasfondo'}</span>
      <SourceTag source={background.source}/>
    </div>
    {parent&&<p className="background-parent">Variante de <strong>{parent}</strong></p>}
    {introduction&&<section className="background-section" aria-label="Historia">
      <h3>Historia</h3>
      {readableParagraphs(introduction).map((paragraph,index)=><p key={index}>{paragraph}</p>)}
    </section>}
    {facts.length>0&&<section className="background-section" aria-label="Competencias y equipo">
      <h3>Competencias y equipo</h3>
      {parent&&<p className="background-inheritance">Del trasfondo «{parent}». Las sustituciones de esta variante se indican en su descripción.</p>}
      <dl className="background-facts">{facts.map((fact,index)=><div key={index} className={fact.heading==='Equipo inicial'?'background-fact-wide':''}>
        <dt>{fact.heading}</dt><dd>{fact.text}</dd>
      </div>)}</dl>
    </section>}
    {sections.filter(section=>parent||section.heading!=='Variante').map((section,index)=><section className="background-section" aria-label={parent&&section.heading==='Variante'?'Descripción de la variante':section.heading} key={index}>
      {section.title&&<span className="background-section-kicker">{section.heading}</span>}
      <h3>{section.title||(parent&&section.heading==='Variante'?'Descripción':section.heading)}</h3>
      {readableParagraphs(section.text).map((paragraph,paragraphIndex)=><p key={paragraphIndex}>{paragraph}</p>)}
    </section>)}
    {notes.map((note,index)=><div key={index} className="info-box background-automation-note">{note}</div>)}
  </article>;
}

export function RaceDetails({race:r,catalog}:{race:Race;catalog:Catalog}){
  const features=r.featureIds.map(id=>catalog.features.find(f=>f.id===id)).filter(f=>!!f);
  const description=r.description.trim().replace(new RegExp(`^${r.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*`,'i'),'');
  const firstTrait=description.search(/(?:Aumento de Características|Tipo de Criatura|Tamaño|Velocidad|Edad|Idiomas)\s*:/i);
  const introduction=firstTrait>0?description.slice(0,firstTrait).trim():'';
  const bonuses=Object.entries(r.abilityBonuses).map(([ability,value])=>`+${value} ${{str:'Fuerza',dex:'Destreza',con:'Constitución',int:'Inteligencia',wis:'Sabiduría',cha:'Carisma'}[ability as keyof typeof r.abilityBonuses]||ability}`).join(' · ');
  const facts=[['Tamaño',r.size],['Velocidad',r.speed?`${r.speed} pies`:null],['Características',bonuses],['Idiomas',r.languages.join(', ')],['Sentidos',r.senses.join(' · ')],['Resistencias',r.resistances.join(', ')],['Inmunidades',r.immunities.join(', ')]].filter(([,value])=>!!value);
  return <div className="race-detail"><div className="spell-detail-heading"><div className="flex wrap"><span className="badge gold">{r.version}</span><span className="badge">{r.kind==='lineage'?'Linaje':r.kind==='subrace'?'Subraza':r.kind==='variant'?'Variante':'Raza'}</span></div><SourceTag source={r.source}/></div>{introduction&&<p className="race-introduction">{introduction}</p>}<dl className="race-facts">{facts.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{features.length>0&&<section className="race-traits"><h3>Rasgos raciales</h3><div className="race-trait-grid">{features.map(feature=><article key={feature.id}><h4>{feature.name}</h4><p>{feature.description.replace(new RegExp(`^${feature.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*[:.]?\\s*`,'i'),'')}</p></article>)}</div></section>}{r.choices.length>0&&<section className="race-traits"><h3>Elecciones</h3><div className="race-trait-grid">{r.choices.map(choice=><article key={choice.id}><h4>{choice.name}</h4><p>{choice.amount} {choice.amount===1?'opción':'opciones'}{choice.options.length?`: ${choice.options.map(option=>typeof option==='string'?option:option.name).join(', ')}`:''}</p></article>)}</div></section>}<details className="race-original"><summary>Ver texto íntegro de la fuente <ChevronDown size={16}/></summary><p className="source-prose">{r.description}</p></details>{r.automationNotes?.map((note,i)=><div key={i} className="info-box" style={{marginTop:16}}>{note}</div>)}</div>
}

export function ClassDetails({cls,catalog}:{cls:CharacterClass;catalog:Catalog}){const [tab,setTab]=useState('Descripción');return <div className="stack"><div className="flex wrap"><SourceTag source={cls.source}/><span className="badge">Dado de golpe d{cls.hitDie}</span><span className="badge">Subclase · nivel {cls.subclassLevel}</span></div><div className="inline-tabs">{['Descripción','Progresión','Subclases','Rasgos'].map(t=><button key={t} className={tab===t?'active':''} onClick={()=>setTab(t)}>{t}</button>)}</div>{tab==='Descripción'&&<p className="source-prose">{cls.description}</p>}{tab==='Progresión'&&<ProgressionTable cls={cls}/>} {tab==='Subclases'&&<div className="stack">{cls.subclasses.map(s=><details className="detail-card" key={s.id}><summary><span><strong>{s.name}</strong><SourceTag source={s.source}/></span><ChevronDown size={17}/></summary><div className="detail-body"><p className="source-prose">{s.description}</p>{s.featureIds.map(id=>catalog.features.find(f=>f.id===id)).filter(f=>!!f).map(f=><details className="detail-card" key={f.id} style={{marginTop:12}}><summary><span><strong>{f.name}</strong><span className="subtle">Nivel {f.level??'según rasgo'}</span></span><ChevronDown size={15}/></summary><div className="detail-body"><SourceTag source={f.source}/><p className="source-prose">{f.description}</p></div></details>)}</div></details>)}</div>}{tab==='Rasgos'&&<div className="stack">{cls.featureIds.map(id=>catalog.features.find(f=>f.id===id)).filter(f=>!!f).map(f=><details className="detail-card" key={f.id}><summary><span><strong>{f.name}</strong><span className="subtle">{f.optional?'Opcional · ':''}Nivel {f.level??'según rasgo'}</span></span><ChevronDown size={15}/></summary><div className="detail-body"><SourceTag source={f.source}/><p className="source-prose">{f.description}</p></div></details>)}</div>}{cls.automationNotes?.map((n,i)=><p className="info-box" key={i}>{n}</p>)}</div>}

export function ProgressionTable({cls,level}:{cls:CharacterClass;level?:number}){return <div className="table-scroll"><table className="data-table"><thead><tr><th>NIVEL</th><th>COMP.</th><th>RASGOS</th>{cls.spellcasting&&<><th>TRUCOS</th><th>CONOCIDOS</th><th>ESPACIOS (NIVEL 1 → 9)</th></>}</tr></thead><tbody>{cls.progression.map(r=><tr className={level!==undefined&&r.level<=level?'current':''} key={r.level}><td><strong>{r.level}</strong>{level!==undefined&&r.level<=level&&<Check size={12} style={{display:'inline',marginLeft:5}}/>}</td><td>+{r.proficiencyBonus}</td><td style={{minWidth:220}}>{r.featureNames.join(', ')||'—'}</td>{cls.spellcasting&&<><td>{r.cantrips??'—'}</td><td>{r.knownSpells??'—'}</td><td style={{whiteSpace:'nowrap'}}>{r.slots.map(n=>n||'—').join(' · ')}</td></>}</tr>)}</tbody></table></div>}

function BackgroundCatalogCard({background,catalog,onDetail}:{background:Background;catalog:Catalog;onDetail:(background:Background)=>void}){
  const {introduction,sections}=backgroundDescriptionSections(background);
  const facts=backgroundDisplayFacts(background,catalog);
  const parent=backgroundParentName(background,catalog);
  const summary=introduction||sections[0]?.text||background.description;
  const skills=facts.find(fact=>fact.heading==='Habilidades')?.text;
  return <button className="catalog-card background-catalog-card" onClick={()=>onDetail(background)}>
    <div className="between" style={{width:'100%'}}><BookOpen size={20} color="var(--gold)"/><span className="badge gold">{parent?'Variante':'Trasfondo'}</span></div>
    <h3>{background.name}</h3>
    {parent&&<span className="background-card-parent">Variante de {parent}</span>}
    <p className="background-card-summary">{cleanDescription(summary,145)}</p>
    {skills&&<span className="background-card-facts">Habilidades: {skills}</span>}
    <SourceTag source={background.source}/>
  </button>;
}

function FeatCatalogCard({feat,onDetail}:{feat:Feat;onDetail:(feat:Feat)=>void}){
  const {introduction,benefits}=featDescriptionSections(feat);
  const summary=introduction.replace(/\s*(?:Ganas|Obtienes) los siguientes beneficios:\s*$/i,'').trim()||benefits[0]||introduction;
  return <button className="catalog-card feat-catalog-card" onClick={()=>onDetail(feat)}>
    <div className="between" style={{width:'100%'}}><BookOpen size={20} color="var(--gold)"/><span className="badge gold">Dote</span></div>
    <h3>{feat.name}</h3>
    {feat.prerequisiteText&&<p className="feat-card-requirement"><strong>Requisito:</strong> {feat.prerequisiteText}</p>}
    <p className="feat-card-summary">{cleanDescription(summary,145)}</p>
    {benefits.length>0&&<span className="feat-card-benefit-count">{benefits.length} {benefits.length===1?'beneficio':'beneficios'}</span>}
    <SourceTag source={feat.source}/>
  </button>;
}

export function CatalogView({catalog,category,onDetail}:{catalog:Catalog;category:string;onDetail:(e:Entity)=>void}){
  const [query,setQuery]=useState(''),[level,setLevel]=useState('all'),[school,setSchool]=useState('all'),[classId,setClassId]=useState('all'),[version,setVersion]=useState('all'),[concentration,setConcentration]=useState(false),[ritual,setRitual]=useState(false),[page,setPage]=useState(0),[selectedClass,setSelectedClass]=useState<CharacterClass|null>(null),[selectedSpell,setSelectedSpell]=useState<Spell|null>(null);
  const keyMap:Record<string,keyof Catalog>={'Razas y linajes':'races','Clases':'classes','Hechizos':'spells','Dotes':'feats','Trasfondos':'backgrounds','Equipo':'equipment'};
  const items=catalog[keyMap[category]||'races'] as Entity[];
  const filtered=items.filter(i=>i.name.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es'))).filter(i=>{if(category==='Hechizos'){const s=i as Spell;return (level==='all'||(level==='conflict'?s.level===null:s.level===Number(level)))&&(school==='all'||s.school===school)&&(classId==='all'||s.availableToClasses.includes(classId))&&(!concentration||s.concentration)&&(!ritual||s.ritual)}if(category==='Razas y linajes')return version==='all'||catalog.races.find(r=>r.id===i.id)?.version===version;return true});
  const pageCount=Math.max(1,Math.ceil(filtered.length/24)),safePage=Math.min(page,pageCount-1),shown=filtered.slice(safePage*24,(safePage+1)*24);
  const changeFilter=(f:()=>void)=>{f();setPage(0)};
  return <div className="stack"><div className="page-heading"><span className="eyebrow">EL COMPENDIO</span><h1 style={{marginTop:11}}>{category}</h1><p>{items.length} entradas de Manual para Casi Todo · La referencia completa, siempre a mano.</p></div><div className="spell-filters"><div className="search-field"><Search size={17}/><input value={query} placeholder={`Buscar ${category.toLowerCase()}…`} onChange={e=>changeFilter(()=>setQuery(e.target.value))}/></div>{category==='Razas y linajes'&&<select value={version} aria-label="Versión" onChange={e=>changeFilter(()=>setVersion(e.target.value))}><option value="all">Todas las versiones</option>{Array.from(new Set(catalog.races.map(r=>r.version))).map(v=><option key={v}>{v}</option>)}</select>}{category==='Hechizos'&&<><select aria-label="Nivel" value={level} onChange={e=>changeFilter(()=>setLevel(e.target.value))}><option value="all">Todos los niveles</option><option value="conflict">Nivel en conflicto</option>{Array.from({length:10},(_,i)=><option value={i} key={i}>{i===0?'Trucos':`Nivel ${i}`}</option>)}</select><select aria-label="Escuela" value={school} onChange={e=>changeFilter(()=>setSchool(e.target.value))}><option value="all">Todas las escuelas</option>{Array.from(new Set(catalog.spells.map(s=>s.school))).sort().map(v=><option key={v}>{v}</option>)}</select><select aria-label="Clase" value={classId} onChange={e=>changeFilter(()=>setClassId(e.target.value))}><option value="all">Todas las clases</option>{catalog.classes.filter(c=>c.spellcasting).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><label><input type="checkbox" checked={concentration} onChange={e=>changeFilter(()=>setConcentration(e.target.checked))}/>Concentración</label><label><input type="checkbox" checked={ritual} onChange={e=>changeFilter(()=>setRitual(e.target.checked))}/>Ritual</label></>}</div><div className="between"><p className="subtle">{filtered.length} resultados</p><SourceTag source={{page:category==='Hechizos'?474:category==='Clases'?102:category==='Dotes'?433:category==='Equipo'?418:category==='Trasfondos'?394:3}}/></div><div className="catalog-grid">{shown.map(item=>{if(category==='Trasfondos')return <BackgroundCatalogCard key={item.id} background={item as Background} catalog={catalog} onDetail={onDetail}/>;if(category==='Dotes')return <FeatCatalogCard key={item.id} feat={item as Feat} onDetail={onDetail}/>;const race=catalog.races.find(r=>r.id===item.id),background=category==="Trasfondos"?catalog.backgrounds.find(b=>b.id===item.id):undefined,spell=category==='Hechizos'?item as Spell:null,cls=category==='Clases'?item as CharacterClass:null;return <button className="catalog-card" key={item.id} onClick={()=>{if(cls)setSelectedClass(cls);else if(spell)setSelectedSpell(spell);else onDetail(item)}}><div className="between" style={{width:'100%'}}>{cls?<ClassIcon id={cls.id} size={25}/>:<BookOpen size={20} color="var(--gold)"/>}{race&&<span className={`badge ${race.version==='Legado'?'gold':''}`}>{race.version}</span>}{spell&&<span className="badge">{spell.level===null?'Conflicto de fuente':spell.level===0?'Truco':`Nivel ${spell.level}`}</span>}</div><h3>{item.name}</h3>{background&&backgroundParentName(background,catalog)&&<span className="badge">Variante de {backgroundParentName(background,catalog)}</span>}{spell?<p>{spell.school} · {spell.castingTime}<br/>{spell.range} · {spell.duration}</p>:<p>{cleanDescription(item.description.replace(item.name,''),155)}</p>}{cls&&<div className="badge">d{cls.hitDie} · {cls.subclasses.length} subclases</div>}<SourceTag source={item.source}/></button>})}</div>{!filtered.length&&<Empty title="Sin resultados" description="Amplía los filtros o prueba otro nombre."/>}<div className="pagination"><Button variant="ghost" disabled={safePage===0} onClick={()=>setPage(safePage-1)}><ArrowLeft size={14}/>Anterior</Button><span>{safePage+1} / {pageCount}</span><Button variant="ghost" disabled={safePage===pageCount-1} onClick={()=>setPage(safePage+1)}>Siguiente<ArrowRight size={14}/></Button></div><Modal open={!!selectedClass} onClose={()=>setSelectedClass(null)} title={selectedClass?.name||''} wide>{selectedClass&&<ClassDetails cls={selectedClass} catalog={catalog}/>}</Modal><Modal open={!!selectedSpell} onClose={()=>setSelectedSpell(null)} title={selectedSpell?.name||''} wide>{selectedSpell&&<SpellDetails spell={selectedSpell}/>}</Modal></div>
}
