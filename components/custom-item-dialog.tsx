'use client';

import { useState, type FormEvent } from 'react';
import { Shield, Sparkles } from 'lucide-react';
import type { Catalog, Character, InventoryItem, ItemRarity } from '@/lib/types';
import { attackFromEquipment } from '@/lib/equipment';
import { Button, Field, Modal } from '@/components/ui';
import { AttackFields } from './attack-fields';
import './custom-item-dialog.css';

const CATEGORIES: InventoryItem['category'][] = ['Armas', 'Armaduras', 'Equipo', 'Objetos'];
const RARITIES: ItemRarity[] = ['Común', 'Poco común', 'Raro', 'Muy raro', 'Legendario', 'Artefacto'];
const validNumber = (value: number, fallback = 0) => Number.isFinite(value) ? value : fallback;

type Props = {
  item: InventoryItem | null;
  onClose: () => void;
  onSave: (item: InventoryItem) => void;
  title?: string;
  containers?: InventoryItem[];
  catalog?: Catalog;
  character?: Character;
};

export function CustomItemDialog({ item, onClose, onSave, title = 'Crear objeto', containers = [], catalog, character }: Props) {
  return <Modal open={Boolean(item)} onClose={onClose} title={title} wide>
    {item && <ItemForm key={item.id} item={item} containers={containers} catalog={catalog} character={character} onClose={onClose} onSave={onSave} />}
  </Modal>;
}

function ItemForm({ item, onClose, onSave, containers = [], catalog, character }: Omit<Props, 'item' | 'title'> & { item: InventoryItem }) {
  const compendiumWeapon = catalog?.equipment.find(entry => entry.id === item.equipmentId);
  const defaultAttack = compendiumWeapon ? attackFromEquipment(compendiumWeapon, character, catalog) : undefined;
  const [draft, setDraft] = useState<InventoryItem>({ ...item, requiresAttunement: item.requiresAttunement ?? item.attuned, attack: item.attackDisabled ? undefined : item.attack ?? defaultAttack });
  const armorKind = draft.shieldBonus !== undefined ? 'shield' : draft.armorBase !== undefined ? 'armor' : 'none';
  const setArmorKind = (kind: string) => {
    const next = { ...draft };
    delete next.armorBase;
    delete next.dexCap;
    delete next.shieldBonus;
    if (kind === 'armor') next.armorBase = 10;
    if (kind === 'shield') next.shieldBonus = 2;
    setDraft(next);
  };
  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim()) return;
    const saved: InventoryItem = {
      ...draft,
      name: draft.name.trim(),
      quantity: Math.max(1, Math.floor(validNumber(draft.quantity, 1))),
      weight: Math.max(0, validNumber(draft.weight)),
    };
    if (saved.category !== 'Armaduras') {
      delete saved.armorBase;
      delete saved.dexCap;
      delete saved.shieldBonus;
    } else if (saved.shieldBonus !== undefined) {
      delete saved.armorBase;
      delete saved.dexCap;
    } else if (saved.armorBase === undefined) {
      delete saved.armorBase;
      delete saved.dexCap;
    }
    if (saved.dexCap === undefined) delete saved.dexCap;
    if (saved.shieldBonus === undefined) delete saved.shieldBonus;
    if (!saved.requiresAttunement) saved.attuned = false;
    if (!saved.containerId || saved.isContainer) delete saved.containerId;
    if (!saved.rarity) delete saved.rarity;
    if (!saved.attackDisabled) delete saved.attackDisabled;
    if (saved.attack) {
      saved.attack = { ...saved.attack };
      if (saved.attack.damageBonus === undefined) delete saved.attack.damageBonus;
      if (saved.attack.magicBonus === undefined) delete saved.attack.magicBonus;
      if (saved.attack.extraDamage === undefined) delete saved.attack.extraDamage;
    }
    onSave(saved);
  };

  return <form className="stack" onSubmit={save}>
    {draft.homebrew && <div className="info-box"><div className="flex"><Sparkles size={17} /><strong>Un objeto de tu propia aventura</strong></div><p>El peso, la CA y los ataques que definas se reflejan en la ficha.</p></div>}
    <div className="grid-2">
      <Field label="Nombre"><input required autoFocus maxLength={160} placeholder="Por ejemplo: Brújula de los ecos" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></Field>
      <Field label="Categoría"><select value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value as InventoryItem['category'] })}>{CATEGORIES.map(value => <option key={value}>{value}</option>)}</select></Field>
      <Field label="Cantidad" hint={draft.isContainer ? 'Cada unidad tendrá su propia pestaña.' : undefined}><input required type="number" min={1} max={draft.isContainer ? 50 : 1000000} step={1} value={draft.quantity} onChange={e => setDraft({ ...draft, quantity: validNumber(e.target.valueAsNumber, 1) })} /></Field>
      <Field label="Peso por unidad (lb)"><input required type="number" min={0} max={1000000} step="any" value={draft.weight} onChange={e => setDraft({ ...draft, weight: validNumber(e.target.valueAsNumber) })} /></Field>
      <Field label="Rareza (opcional)"><select value={draft.rarity ?? ''} onChange={e => setDraft(current => { const next = { ...current }; if (e.target.value) next.rarity = e.target.value as ItemRarity; else delete next.rarity; return next; })}><option value="">Sin rareza</option>{RARITIES.map(rarity => <option key={rarity}>{rarity}</option>)}</select></Field>
      {!draft.isContainer && containers.length > 0 && <Field label="Guardar dentro de"><select value={draft.containerId ?? ''} onChange={e => setDraft(current => { const next = { ...current }; if (e.target.value) next.containerId = e.target.value; else delete next.containerId; return next; })}><option value="">Sin contenedor</option>{containers.filter(container => container.id !== draft.id).map(container => <option key={container.id} value={container.id}>{container.name}</option>)}</select></Field>}
    </div>
    <div className="flex wrap">
      <label className="flex"><input type="checkbox" checked={draft.equipped} onChange={e => setDraft({ ...draft, equipped: e.target.checked })} />Equipado</label>
      <label className="flex"><input type="checkbox" checked={draft.isContainer ?? false} onChange={e => setDraft(current => { const next = { ...current, isContainer: e.target.checked }; if (next.isContainer) delete next.containerId; return next; })} />Es un contenedor</label>
      <label className="flex"><input type="checkbox" checked={draft.requiresAttunement ?? false} onChange={e => setDraft({ ...draft, requiresAttunement: e.target.checked, attuned: e.target.checked ? draft.attuned : false })} />Requiere sintonización</label>
      {draft.requiresAttunement && <label className="flex"><input type="checkbox" checked={draft.attuned} onChange={e => setDraft({ ...draft, attuned: e.target.checked })} />Sintonizado</label>}
    </div>
    {draft.category === 'Armaduras' && <div className="panel stack">
      <div className="flex subtle"><Shield size={16} />Protección</div>
      <Field label="Tipo de protección"><select value={armorKind} onChange={e => setArmorKind(e.target.value)}><option value="none">Sin valor de CA</option><option value="armor">Armadura</option><option value="shield">Escudo</option></select></Field>
      {armorKind === 'armor' && <div className="grid-2">
        <Field label="Clase de armadura base"><input type="number" required min={0} max={100} step={1} value={draft.armorBase ?? ''} onChange={e => setDraft({ ...draft, armorBase: Math.max(0, validNumber(e.target.valueAsNumber)) })} /></Field>
        <Field label="Máximo modificador de Destreza" hint="Vacío: sin límite. 0: no se suma Destreza."><input type="number" min={0} max={100} step={1} placeholder="Sin límite" value={draft.dexCap ?? ''} onChange={e => { const next = { ...draft }; if (e.target.value === '') delete next.dexCap; else next.dexCap = Math.max(0, validNumber(e.target.valueAsNumber)); setDraft(next); }} /></Field>
      </div>}
      {armorKind === 'shield' && <Field label="Bonificación del escudo a la CA"><input required type="number" min={0} max={100} step={1} value={draft.shieldBonus ?? 2} onChange={e => setDraft({ ...draft, shieldBonus: Math.max(0, validNumber(e.target.valueAsNumber)) })} /></Field>}
    </div>}
    <div className="panel stack"><label className="flex"><input type="checkbox" checked={!!draft.attack} onChange={e=>setDraft({...draft,attack:e.target.checked ? defaultAttack ?? {ability:'str',proficient:true,bonus:0,damage:'1d6',damageType:'',range:'Cuerpo a cuerpo',notes:''} : undefined, attackDisabled: !e.target.checked})}/>Este objeto tiene un ataque</label>{draft.attack&&<AttackFields value={draft.attack} onChange={attack=>setDraft({...draft,attack})}/>}</div>
    <Field label="Descripción"><textarea rows={4} placeholder="Aspecto, propiedades y efectos del objeto…" value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></Field>
    <Field label="Notas personales"><textarea rows={3} placeholder="Dónde lo encontraste, cargas restantes, acuerdos con el director…" value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} /></Field>
    <div className="modal-footer custom-item-footer"><Button type="button" onClick={onClose}>Cancelar</Button><Button type="submit" variant="primary">Guardar objeto</Button></div>
  </form>;
}
