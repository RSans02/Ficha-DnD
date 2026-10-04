'use client';

import { useState, type FormEvent } from 'react';
import { Shield, Sparkles } from 'lucide-react';
import type { InventoryItem } from '@/lib/types';
import { Button, Field, Modal } from '@/components/ui';

const CATEGORIES: InventoryItem['category'][] = ['Armas', 'Armaduras', 'Equipo', 'Objetos'];
const validNumber = (value: number, fallback = 0) => Number.isFinite(value) ? value : fallback;

type Props = {
  item: InventoryItem | null;
  onClose: () => void;
  onSave: (item: InventoryItem) => void;
  title?: string;
};

export function CustomItemDialog({ item, onClose, onSave, title = 'Crear objeto homebrew' }: Props) {
  return <Modal open={Boolean(item)} onClose={onClose} title={title} wide>
    {item && <ItemForm key={item.id} item={item} onClose={onClose} onSave={onSave} />}
  </Modal>;
}

function ItemForm({ item, onClose, onSave }: Omit<Props, 'item' | 'title'> & { item: InventoryItem }) {
  const [draft, setDraft] = useState<InventoryItem>({ ...item });
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
    onSave(saved);
  };

  return <form className="stack" onSubmit={save}>
    {draft.homebrew && <div className="info-box"><div className="flex"><Sparkles size={17} /><strong>Un objeto de tu propia aventura</strong></div><p>Define sus propiedades y efectos. El peso, la cantidad y la CA de armaduras o escudos se reflejan en la ficha; el resto de efectos se gestiona manualmente.</p></div>}
    <div className="grid-2">
      <Field label="Nombre"><input required autoFocus maxLength={160} placeholder="Por ejemplo: Brújula de los ecos" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></Field>
      <Field label="Categoría"><select value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value as InventoryItem['category'] })}>{CATEGORIES.map(value => <option key={value}>{value}</option>)}</select></Field>
      <Field label="Cantidad"><input required type="number" min={1} max={1000000} step={1} value={draft.quantity} onChange={e => setDraft({ ...draft, quantity: validNumber(e.target.valueAsNumber, 1) })} /></Field>
      <Field label="Peso por unidad (lb)"><input required type="number" min={0} max={1000000} step="any" value={draft.weight} onChange={e => setDraft({ ...draft, weight: validNumber(e.target.valueAsNumber) })} /></Field>
    </div>
    <div className="flex wrap">
      <label className="flex"><input type="checkbox" checked={draft.equipped} onChange={e => setDraft({ ...draft, equipped: e.target.checked })} />Equipado</label>
      <label className="flex"><input type="checkbox" checked={draft.attuned} onChange={e => setDraft({ ...draft, attuned: e.target.checked })} />Vinculado</label>
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
    <Field label="Descripción"><textarea rows={4} placeholder="Aspecto, propiedades y efectos del objeto…" value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></Field>
    <Field label="Notas personales"><textarea rows={3} placeholder="Dónde lo encontraste, cargas restantes, acuerdos con el director…" value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} /></Field>
    <div className="modal-footer"><Button type="button" onClick={onClose}>Cancelar</Button><Button type="submit" variant="primary">Guardar objeto</Button></div>
  </form>;
}
