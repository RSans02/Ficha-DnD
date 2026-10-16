'use client';

import { Plus, Trash2 } from 'lucide-react';
import { ABILITIES, SKILLS } from '@/lib/constants';
import type { ItemEffect } from '@/lib/types';
import { Button, Field } from './ui';
import './item-effects-editor.css';

const EFFECT_TYPES: { value: ItemEffect['type']; label: string }[] = [
  { value: 'ability_bonus', label: 'Característica' },
  { value: 'skill_bonus', label: 'Bonificador de habilidad' },
  { value: 'skill_proficiency', label: 'Competencia en habilidad' },
  { value: 'skill_expertise', label: 'Pericia en habilidad' },
  { value: 'save_bonus', label: 'Bonificador de salvación' },
  { value: 'save_proficiency', label: 'Competencia en salvación' },
  { value: 'proficiency', label: 'Otra competencia' },
  { value: 'resistance', label: 'Resistencia' },
  { value: 'immunity', label: 'Inmunidad' },
  { value: 'sense', label: 'Sentido' },
  { value: 'language', label: 'Idioma' },
  { value: 'ac_bonus', label: 'Clase de armadura' },
  { value: 'initiative_bonus', label: 'Iniciativa' },
  { value: 'speed_bonus', label: 'Velocidad' },
  { value: 'hp_bonus', label: 'PG máximos' },
  { value: 'roll_mode', label: 'Ventaja o desventaja' },
];

function newEffect(type: ItemEffect['type']): ItemEffect {
  if (type === 'ability_bonus' || type === 'save_bonus') return { type, ability: 'str', value: 1 };
  if (type === 'save_proficiency') return { type, ability: 'str' };
  if (type === 'skill_bonus') return { type, skill: SKILLS[0].id, value: 1 };
  if (type === 'skill_proficiency' || type === 'skill_expertise') return { type, skill: SKILLS[0].id };
  if (type === 'proficiency' || type === 'resistance' || type === 'immunity' || type === 'sense' || type === 'language') return { type, value: '' };
  if (type === 'roll_mode') return { type, scope: 'skill', target: SKILLS[0].id, mode: 'advantage' };
  return { type, value: 1 };
}

export function ItemEffectsEditor({ effects, onChange }: { effects: ItemEffect[]; onChange: (effects: ItemEffect[]) => void }) {
  const update = (index: number, effect: ItemEffect) => onChange(effects.map((row, position) => position === index ? effect : row));
  return <section className="panel item-effects-editor" aria-label="Efectos al equipar">
    <div className="item-effects-heading"><div><h3>Efectos al equipar</h3><p className="subtle">Se aplican mientras este objeto esté equipado. Varias bonificaciones numéricas se suman; ventaja y desventaja se cancelan.</p></div><Button type="button" className="compact" disabled={effects.length >= 50} onClick={() => onChange([...effects, newEffect('ability_bonus')])}><Plus size={14}/>Añadir efecto</Button></div>
    {!effects.length && <p className="subtle">Sin efectos configurados.</p>}
    {effects.map((effect, index) => <div className="item-effect-row" key={index}>
      <Field label="Efecto"><select aria-label={`Tipo de efecto ${index + 1}`} value={effect.type} onChange={event => update(index, newEffect(event.target.value as ItemEffect['type']))}>{EFFECT_TYPES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
      {'ability' in effect && <Field label="Característica"><select aria-label={`Característica del efecto ${index + 1}`} value={effect.ability} onChange={event => update(index, { ...effect, ability: event.target.value } as ItemEffect)}>{ABILITIES.map(ability => <option key={ability.id} value={ability.id}>{ability.label}</option>)}</select></Field>}
      {'skill' in effect && <Field label="Habilidad"><select aria-label={`Habilidad del efecto ${index + 1}`} value={effect.skill} onChange={event => update(index, { ...effect, skill: event.target.value } as ItemEffect)}>{SKILLS.map(skill => <option key={skill.id} value={skill.id}>{skill.name}</option>)}</select></Field>}
      {['proficiency', 'resistance', 'immunity', 'sense', 'language'].includes(effect.type) && 'value' in effect && typeof effect.value === 'string' && <Field label={EFFECT_TYPES.find(option => option.value === effect.type)?.label ?? 'Valor'}><input required aria-label={`Texto del efecto ${index + 1}`} maxLength={120} placeholder={effect.type === 'proficiency' ? 'Herramientas de ladrón, armas marciales…' : effect.type === 'resistance' || effect.type === 'immunity' ? 'Fuego, frío…' : effect.type === 'sense' ? 'Visión en la oscuridad 60 pies' : 'Dracónico'} value={effect.value} onChange={event => update(index, { ...effect, value: event.target.value } as ItemEffect)}/></Field>}
      {effect.type === 'roll_mode' && <>
        <Field label="Tirada"><select aria-label={`Tirada del efecto ${index + 1}`} value={effect.scope} onChange={event => { const scope = event.target.value as 'ability' | 'skill' | 'save' | 'attack'; update(index, { ...effect, scope, target: scope === 'skill' ? SKILLS[0].id : scope === 'attack' ? undefined : 'str' }); }}><option value="skill">Habilidad</option><option value="ability">Prueba de característica</option><option value="save">Salvación</option><option value="attack">Todos los ataques</option></select></Field>
        {effect.scope !== 'attack' && <Field label={effect.scope === 'skill' ? 'Habilidad' : 'Característica'}><select aria-label={`Objetivo del efecto ${index + 1}`} value={effect.target ?? ''} onChange={event => update(index, { ...effect, target: event.target.value })}>{(effect.scope === 'skill' ? SKILLS.map(skill => ({ id: skill.id, label: skill.name })) : ABILITIES).map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></Field>}
        <Field label="Resultado"><select aria-label={`Ventaja del efecto ${index + 1}`} value={effect.mode} onChange={event => update(index, { ...effect, mode: event.target.value as 'advantage' | 'disadvantage' })}><option value="advantage">Ventaja</option><option value="disadvantage">Desventaja</option></select></Field>
      </>}
      {'value' in effect && typeof effect.value === 'number' && <Field label={effect.type === 'speed_bonus' ? 'Pies' : 'Valor'}><input aria-label={`Valor del efecto ${index + 1}`} type="number" min={-100} max={100} step={1} value={effect.value} onChange={event => update(index, { ...effect, value: Number(event.target.value) } as ItemEffect)}/></Field>}
      <button type="button" className="icon-button item-effect-remove" aria-label={`Quitar efecto ${index + 1}`} onClick={() => onChange(effects.filter((_, position) => position !== index))}><Trash2 size={16}/></button>
    </div>)}
  </section>;
}
