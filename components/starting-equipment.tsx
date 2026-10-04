'use client';
import { Dice5 } from 'lucide-react';
import type { Catalog, Character, StartingEquipmentSelection } from '@/lib/types';
import { equipmentForPick, missingEquipmentProficiencies, resolveStartingEquipment, startingEquipmentSelection, startingEquipmentSources } from '@/lib/equipment';
import { Button, CheckOption, Field, SourceTag } from './ui';
import { EquipmentSearch } from './equipment-picker';

export function StartingEquipment({ character: c, catalog, onChange }: { character: Character; catalog: Catalog; onChange: (c: Character) => void }) {
  const state = startingEquipmentSelection(c), sources = startingEquipmentSources(c, catalog);
  const formula = catalog.startingEquipment?.[state.classId]?.goldAlternative;
  const update = (patch: Partial<StartingEquipmentSelection>) => onChange({ ...c, startingEquipment: { ...state, ...patch } });
  return <div className="stack">
    <div className="choice-options">
      <CheckOption selected={state.mode === 'equipment'} onClick={() => update({ mode: 'equipment' })} title="Equipo de clase y trasfondo" description="Elige tus alternativas y recibe los objetos fijos."/>
      {formula && <CheckOption selected={state.mode === 'gold'} onClick={() => update({ mode: 'gold' })} title={`Oro inicial: ${formula.diceCount}d${formula.dieSides}${formula.multiplier === 1 ? '' : ` × ${formula.multiplier}`} po`} description="Sustituye todo el equipo y las monedas de clase y trasfondo."/>}
    </div>
    {state.mode === 'gold' && formula ? <div className="panel stack">
      <h3>Empezar con oro</h3><p className="subtle">Introduce tu tirada o usa los dados. Compra después tu equipo con el buscador y ajusta las monedas de tu inventario.</p>
      <div className="equipment-add-controls"><Field label={`Suma de ${formula.diceCount}d${formula.dieSides}`}><input type="number" min={formula.diceCount} max={formula.diceCount * formula.dieSides} value={state.goldRoll ?? ''} onChange={e => { if (!e.target.value) { const next = { ...state }; delete next.goldRoll; onChange({ ...c, startingEquipment: next }); } else update({ goldRoll: Number(e.target.value) }); }}/></Field><Button onClick={() => update({ goldRoll: Array.from({ length: formula.diceCount }, () => 1 + Math.floor(Math.random() * formula.dieSides)).reduce((a,b) => a+b,0) })}><Dice5 size={16}/>Tirar dados</Button></div>
      <p className="info-box">Recibirás {resolveStartingEquipment(c, catalog).coins.po ?? '—'} po. El equipo adicional se conserva; su coste no se descuenta automáticamente.</p>
    </div> : sources.map(({ id, name, definition }) => <section className="panel stack" key={id}>
      <div className="between wrap"><h3>{name}</h3><SourceTag source={definition.source}/></div>
      {!!definition.fixed.length && <div><strong className="subtle">Objetos incluidos</strong><ul className="equipment-grants">{definition.fixed.map((item,index) => <li key={index}>{item.quantity} × {item.name || catalog.equipment.find(e => e.id === item.equipmentId)?.name}</li>)}</ul></div>}
      {definition.groups.map(group => { const key = `${id}.${group.id}`, selected = state.selections[key] || (group.options.length === 1 ? group.options[0].id : ''); return <div className="stack" key={key}>
        <h4>{group.name}</h4><div className="choice-options">{group.options.map(option => <CheckOption key={option.id} selected={selected === option.id} onClick={() => update({ selections: { ...state.selections, [key]: option.id } })} title={option.name}/>)}</div>
        {group.options.filter(option => option.id === selected).map(option => { const verification = `${key}.${option.id}`, missing = missingEquipmentProficiencies(option.requiresProficiency ?? [], c, catalog); return <div className="stack" key={option.id}>
          {!!missing.length && <CheckOption selected={state.verified.includes(verification)} onClick={() => update({ verified: state.verified.includes(verification) ? state.verified.filter(x => x !== verification) : [...state.verified, verification] })} title={`Tengo competencia en: ${missing.join(', ')}`} description="Comprueba que un rasgo de tu personaje te otorga la competencia necesaria."/>}
          {(option.picks ?? []).map(pick => { const pickKey = `${key}.${option.id}.${pick.id}`, picked = state.picks[pickKey] ?? []; return <div key={pick.id} className="stack">{Array.from({ length: pick.quantity }, (_,index) => { const item=catalog.equipment.find(e=>e.id===picked[index]),verifyKey=`${pickKey}.${index}`,needsConfirmation=pick.requiresProficiency&&item&&missingEquipmentProficiencies([item.name],c,catalog).length; return <div className="stack" key={index}><EquipmentSearch catalog={catalog} allowed={equipmentForPick(catalog.equipment, pick.category)} label={`${name}: ${pick.name}${pick.quantity > 1 ? ` (${index+1}/${pick.quantity})` : ''}`} selectedId={picked[index]} onSelect={item => { const values = Array.from({ length: pick.quantity }, (_,i) => i === index ? item.id : picked[i] || ''); update({ picks: { ...state.picks, [pickKey]: values }, verified:state.verified.filter(v=>v!==verifyKey) }); }}/>{!!needsConfirmation&&<CheckOption selected={state.verified.includes(verifyKey)} onClick={()=>update({verified:state.verified.includes(verifyKey)?state.verified.filter(v=>v!==verifyKey):[...state.verified,verifyKey]})} title={`Soy competente con ${item?.name}`} description="Revisa las competencias elegidas de tu personaje."/>}</div>; })}</div>; })}
        </div>; })}
      </div>; })}
      {!!Object.keys(definition.coins ?? {}).length && <p className="subtle">Monedas incluidas: {Object.entries(definition.coins ?? {}).map(([coin,value]) => `${value} ${coin}`).join(' · ')}</p>}
      {definition.notes?.map((note,index) => <p className="subtle" key={index}>{note}</p>)}
      <details><summary className="subtle">Texto de referencia del PDF</summary><p className="source-prose">{definition.description}</p></details>
    </section>)}
    {!sources.length && <p className="info-box">Selecciona una clase para elegir su equipo inicial.</p>}
  </div>;
}

export function StartingEquipmentSummary({ character, catalog }: { character: Character; catalog: Catalog }) {
  const preview = resolveStartingEquipment(character, catalog);
  return <div className="selection-summary"><h3>Equipo al comenzar</h3><ul className="equipment-grants">{[...preview.items, ...character.inventory].map(item => <li key={item.id}>{item.quantity} × {item.name}{item.homebrew ? ' · Homebrew' : ''}</li>)}</ul><p className="subtle">Monedas iniciales: {Object.entries(preview.coins).map(([coin,value]) => `${value} ${coin}`).join(' · ') || '0 po'}</p></div>;
}
