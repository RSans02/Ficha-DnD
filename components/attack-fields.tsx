'use client';

import { useId, useState } from 'react';
import type { Attack } from '@/lib/types';
import { ABILITIES, DAMAGE_TYPES } from '@/lib/constants';
import { Button, Field } from './ui';
import { Plus, Trash2 } from 'lucide-react';
import './attack-fields.css';

type AttackFieldsValue = Omit<Attack, 'id' | 'name' | 'favorite'>;

function BaseDamageTypeField({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const selectId = useId();
  const [custom, setCustom] = useState(() => value !== '' && !DAMAGE_TYPES.some(type => type.toLocaleLowerCase('es') === value.toLocaleLowerCase('es')));
  const standardType = DAMAGE_TYPES.find(type => type.toLocaleLowerCase('es') === value.toLocaleLowerCase('es'));
  const isCustom = custom || (value !== '' && !standardType);
  return <div className="field">
    <span><label htmlFor={selectId}>Tipo de daño base</label></span>
    <div className="attack-damage-type-controls">
      <select id={selectId} value={isCustom ? 'custom' : standardType ?? ''} onChange={event => {
        const selected = event.target.value;
        setCustom(selected === 'custom');
        onChange(selected === 'custom' ? '' : selected);
      }}>
        <option value="">Selecciona un tipo de daño</option>
        {DAMAGE_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
        <option value="custom">Personalizado…</option>
      </select>
      {isCustom && <input aria-label="Tipo de daño base personalizado" value={value} onChange={event => onChange(event.target.value)} placeholder="Escribe el tipo de daño"/>}
    </div>
  </div>;
}

export function AttackFields({ value, onChange }: { value: AttackFieldsValue; onChange: (next: AttackFieldsValue) => void }) {
  const patch = (change: Partial<AttackFieldsValue>) => onChange({ ...value, ...change });
  const extras = value.extraDamage ?? [];
  return <div className="stack">
    <div className="grid-2">
      <Field label="Característica del ataque"><select value={value.ability} onChange={event => patch({ ability: event.target.value as Attack['ability'] })}><option value="none">Ninguna: bonificador manual</option>{ABILITIES.map(ability => <option key={ability.id} value={ability.id}>{ability.label}</option>)}</select></Field>
      <Field label="Bonificador adicional al ataque"><input type="number" value={value.bonus} onChange={event => patch({ bonus: Number(event.target.value) || 0 })}/></Field>
      <Field label="Bonificador mágico" hint="Se suma tanto al ataque como al daño."><input type="number" value={value.magicBonus ?? 0} onChange={event => patch({ magicBonus: Number(event.target.value) || 0 })}/></Field>
      <Field label="Alcance o tipo"><input value={value.range} onChange={event => patch({ range: event.target.value })} placeholder="Cuerpo a cuerpo, 5 pies"/></Field>
    </div>
    <label className="flex"><input type="checkbox" checked={value.proficient} onChange={event => patch({ proficient: event.target.checked })}/>Añadir competencia al ataque</label>
    <div className="attack-damage-row">
      <Field label="Dados de daño base"><input value={value.damage} onChange={event => patch({ damage: event.target.value })} placeholder="2d4"/></Field>
      <BaseDamageTypeField value={value.damageType} onChange={damageType => patch({ damageType })}/>
    </div>
    <div className="attack-damage-bonus"><Field label="Bonificador base al daño" hint="Vacío: característica, o 0 si no usa ninguna. La bonificación mágica se añade aparte."><input type="number" value={value.damageBonus ?? ''} placeholder="Automático" onChange={event => { const next = { ...value }; if (event.target.value === '') delete next.damageBonus; else next.damageBonus = Number(event.target.value); onChange(next); }}/></Field></div>
    <div className="stack" style={{gap:10}}><div className="between wrap"><strong>Daño adicional</strong><Button type="button" className="compact" onClick={() => patch({ extraDamage: [...extras, { dice: '', damageType: '', condition: '' }] })}><Plus size={14}/>Añadir daño</Button></div>
      {extras.map((extra, index) => <div className="panel" key={index}><div className="grid-2"><Field label="Dados o daño"><input value={extra.dice} placeholder="2d8" onChange={event => patch({ extraDamage: extras.map((item, i) => i === index ? { ...item, dice: event.target.value } : item) })}/></Field><Field label="Tipo"><input value={extra.damageType} placeholder="Necrótico" onChange={event => patch({ extraDamage: extras.map((item, i) => i === index ? { ...item, damageType: event.target.value } : item) })}/></Field></div><div className="flex wrap"><Field label="Cuándo se aplica"><input value={extra.condition ?? ''} placeholder="Contra una criatura en penumbra u oscuridad" onChange={event => patch({ extraDamage: extras.map((item, i) => i === index ? { ...item, condition: event.target.value } : item) })}/></Field><Button type="button" variant="ghost" className="compact" onClick={() => patch({ extraDamage: extras.filter((_, i) => i !== index) })}><Trash2 size={14}/>Quitar</Button></div></div>)}
    </div>
    <p className="subtle">Para efectos como Ataque furtivo, elige «Ninguna» y desactiva la competencia. El daño condicionado aparece separado del daño base.</p>
  </div>;
}
