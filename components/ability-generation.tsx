'use client';
import { Dice5 } from 'lucide-react';
import { ABILITIES } from '@/lib/constants';
import { abilityScoresFrom, POINT_COST, pointBuyCost, rollScore, STANDARD_ARRAY } from '@/lib/ability-generation';
import { deriveCharacter } from '@/lib/engine';
import type { Ability, Catalog, Character } from '@/lib/types';
import { Button, Field, sign } from './ui';

export function AbilityGeneration({ character:c, catalog, onChange }: { character:Character; catalog:Catalog; onChange:(c:Character)=>void }) {
  const method = c.abilityGeneration?.method ?? 'manual', d = deriveCharacter(c,catalog);
  const pool = method === 'standard' ? STANDARD_ARRAY : method === 'rolled' ? c.abilityGeneration?.rolls?.map(rollScore) ?? [] : [];
  const setScore = (id:Ability,value:number) => {
    const swap = pool.length ? ABILITIES.find(a => a.id !== id && c.abilities[a.id] === value) : undefined;
    onChange({ ...c, abilities:{ ...c.abilities, [id]:value, ...(swap ? { [swap.id]:c.abilities[id] } : {}) } });
  };
  return <div className="stack">
    <Field label="Método de características"><select value={method} onChange={e => { const next=e.target.value as NonNullable<Character['abilityGeneration']>['method']; onChange({ ...c, abilityGeneration:{method:next}, abilities:next==='standard'?abilityScoresFrom(STANDARD_ARRAY):next==='point-buy'?abilityScoresFrom([8,8,8,8,8,8]):c.abilities }); }}><option value="standard">Matriz estándar</option><option value="point-buy">Compra de 27 puntos (opcional)</option><option value="rolled">Tiradas de 4d6</option><option value="manual">Manual / tiradas de la mesa</option></select></Field>
    {method === 'standard' && <p className="info-box">Reparte 15, 14, 13, 12, 10 y 8. Al elegir una puntuación se intercambia con la característica que la tenía.</p>}
    {method === 'point-buy' && <p className="info-box" role="status">{27-pointBuyCost(c.abilities)} puntos disponibles de 27. Las bases van de 8 a 15; 14 cuesta 7 puntos y 15 cuesta 9. Esta variante requiere acuerdo con el DM.</p>}
    {method === 'rolled' && <><Button onClick={() => { const rolls=Array.from({length:6},()=>Array.from({length:4},()=>1+Math.floor(Math.random()*6))); onChange({...c,abilityGeneration:{method:'rolled',rolls},abilities:abilityScoresFrom(rolls.map(rollScore))}); }}><Dice5 size={17}/>{pool.length?'Volver a tirar':'Tirar seis veces 4d6'}</Button><p className="subtle">Se descarta el dado menor de cada tirada. Puedes intercambiar las puntuaciones.</p>{c.abilityGeneration?.rolls && <div className="flex wrap">{c.abilityGeneration.rolls.map((roll,i)=><span className="badge" key={i}>{roll.join(' + ')} − {Math.min(...roll)} = {rollScore(roll)}</span>)}</div>}</>}
    <div className="ability-grid">{ABILITIES.map(a=><div className="ability-editor" key={a.id}><h3>{a.label}</h3><label><span className="subtle">Puntuación base</span>{pool.length?<select aria-label={`${a.label} base`} value={c.abilities[a.id]} onChange={e=>setScore(a.id,Number(e.target.value))}>{[...new Set(pool)].sort((a,b)=>b-a).map(value=><option key={value}>{value}</option>)}</select>:method==='point-buy'?<select aria-label={`${a.label} base`} value={c.abilities[a.id]} onChange={e=>setScore(a.id,Number(e.target.value))}>{Object.entries(POINT_COST).map(([score,cost])=><option key={score} value={score} disabled={pointBuyCost(c.abilities)-(POINT_COST[c.abilities[a.id]]??0)+cost>27}>{score} ({cost} pt)</option>)}</select>:<input aria-label={`${a.label} base`} type="number" min={1} max={20} disabled={method==='rolled'} value={c.abilities[a.id]} onChange={e=>setScore(a.id,Number(e.target.value))}/>}</label><small>Bonificadores {sign(d.abilities[a.id].bonus)}</small><div className="ability-total">{d.abilities[a.id].total} <small>({sign(d.abilities[a.id].modifier)})</small></div><small>Total · modificador</small></div>)}</div>
    <p className="subtle">Los aumentos raciales se suman después de asignar las bases. <a href="https://www.dndbeyond.com/sources/dnd/basic-rules-2014/step-by-step-characters#3DetermineAbilityScores" target="_blank" rel="noreferrer">Reglas básicas de 2014</a>.</p>
  </div>;
}
