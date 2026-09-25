'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { Backpack, BookOpen, Coins, FilePenLine, NotebookPen, Plus, Search, Shield, Trash2, Weight } from 'lucide-react';
import type { Catalog, Character, Equipment, InventoryItem, Note } from '@/lib/types';
import { Button, Empty, Field, Modal } from '@/components/ui';
import { EquipmentPicker } from '@/components/wizard';

type PanelProps = { character: Character; catalog: Catalog; onChange: (character: Character) => void };
const INVENTORY_CATEGORIES: InventoryItem['category'][] = ['Armas', 'Armaduras', 'Equipo', 'Objetos'];
const NOTE_CATEGORIES = ['Sesión', 'NPC', 'Lugar', 'Misión', 'Objeto', 'Lore', 'Personalizada'];
const COINS = [{ id: 'pc', label: 'Cobre' }, { id: 'pp', label: 'Plata' }, { id: 'pe', label: 'Electro' }, { id: 'po', label: 'Oro' }, { id: 'ppt', label: 'Platino' }];
const fold = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
const validNumber = (value: number, fallback = 0) => Number.isFinite(value) ? value : fallback;
const decimal = (value: number) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(value);
function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function dateLabel(value: string) { const date = new Date(value.includes('T') ? value : `${value}T12:00:00`); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).format(date); }

function normalizeEquipment(item: InventoryItem, catalog: Catalog): InventoryItem {
  const source = catalog.equipment.find(e => e.id === item.equipmentId) as (Equipment & { shieldBonus?: number; armorCategory?: string }) | undefined;
  if (!source) return item;
  const isShield = Boolean(source.shieldBonus) || /escudo/i.test(`${source.name} ${source.armorCategory ?? ''}`);
  if (isShield) return { ...item, category: 'Armaduras', armorBase: undefined, dexCap: undefined, shieldBonus: source.shieldBonus ?? 2 };
  if (typeof source.armorClass === 'number') return { ...item, category: 'Armaduras', armorBase: source.armorClass, dexCap: source.dexterityCap ?? undefined, shieldBonus: undefined };
  return item;
}

export function InventoryPanel({ character, catalog, onChange }: PanelProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todas');
  const [draft, setDraft] = useState<InventoryItem | null>(null);
  const [catalogDraft, setCatalogDraft] = useState<Character | null>(null);
  const [removing, setRemoving] = useState<InventoryItem | null>(null);
  const items = useMemo(() => character.inventory.filter(item => (category === 'Todas' || item.category === category) && fold(`${item.name} ${item.description} ${item.notes}`).includes(fold(query))), [character.inventory, category, query]);
  const weight = character.inventory.reduce((total, item) => total + Math.max(0, validNumber(item.quantity)) * Math.max(0, validNumber(item.weight)), 0);
  const patchItem = (id: string, patch: Partial<InventoryItem>) => onChange({ ...character, inventory: character.inventory.map(item => item.id === id ? { ...item, ...patch } : item) });
  const create = () => setDraft({ id: crypto.randomUUID(), name: '', category: category === 'Todas' ? 'Equipo' : category as InventoryItem['category'], quantity: 1, weight: 0, equipped: false, attuned: false, description: '', notes: '' });
  const saveItem = (event: FormEvent) => {
    event.preventDefault();
    if (!draft || !draft.name.trim()) return;
    const saved: InventoryItem = { ...draft, name: draft.name.trim(), quantity: Math.max(1, Math.floor(validNumber(draft.quantity, 1))), weight: Math.max(0, validNumber(draft.weight)) };
    if (saved.category !== 'Armaduras') { delete saved.armorBase; delete saved.dexCap; delete saved.shieldBonus; }
    if (saved.shieldBonus !== undefined) { delete saved.armorBase; delete saved.dexCap; }
    const exists = character.inventory.some(item => item.id === saved.id);
    onChange({ ...character, inventory: exists ? character.inventory.map(item => item.id === saved.id ? saved : item) : [...character.inventory, saved] });
    setDraft(null);
  };
  const armorKind = draft?.shieldBonus !== undefined ? 'shield' : draft?.armorBase !== undefined ? 'armor' : 'none';

  return <div className="stack">
    <div className="section-heading"><div><h2>Equipo de aventura</h2><p className="subtle">Todo lo que llevas en el camino.</p></div><div className="flex wrap"><Button onClick={() => setCatalogDraft({ ...character, inventory: [] })}><BookOpen size={16} />Buscar en el manual</Button><Button variant="primary" onClick={create}><Plus size={16} />Nuevo objeto</Button></div></div>
    <section className="panel stack" aria-label="Inventario">
      <div className="between wrap"><div className="flex"><Backpack size={18} /><strong>{character.inventory.length} {character.inventory.length === 1 ? 'objeto' : 'objetos'}</strong></div><span className="flex subtle"><Weight size={16} />Peso total <strong>{decimal(weight)} lb</strong></span></div>
      <div className="spell-filters"><div className="search-field"><Search size={16} /><input aria-label="Buscar en el inventario" placeholder="Buscar un objeto…" value={query} onChange={e => setQuery(e.target.value)} /></div><select aria-label="Categoría de inventario" value={category} onChange={e => setCategory(e.target.value)}><option>Todas</option>{INVENTORY_CATEGORIES.map(value => <option key={value}>{value}</option>)}</select></div>
      {items.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th scope="col">Objeto</th><th scope="col">Cantidad</th><th scope="col">Peso / unidad</th><th scope="col">Equipado</th><th scope="col">Vinculado</th><th scope="col"><span className="subtle">Acciones</span></th></tr></thead><tbody>{items.map(item => <tr key={item.id}>
        <td className="name-cell"><button className="spell-name" onClick={() => setDraft({ ...item })}><strong>{item.name}</strong><small>{item.category}{item.shieldBonus !== undefined ? ` · +${item.shieldBonus} CA` : item.armorBase !== undefined ? ` · CA ${item.armorBase}` : ''}</small></button>{item.notes && <p className="subtle" style={{ maxWidth: 300, marginTop: 5 }}>{item.notes}</p>}</td>
        <td><input aria-label={`Cantidad de ${item.name}`} type="number" min={1} step={1} value={item.quantity} onChange={e => { if (e.target.value !== '') patchItem(item.id, { quantity: Math.max(1, Math.floor(validNumber(e.target.valueAsNumber, 1))) }); }} /></td>
        <td>{decimal(item.weight)} lb</td>
        <td><input aria-label={`Equipar ${item.name}`} type="checkbox" checked={item.equipped} style={{ width: 16, minHeight: 0 }} onChange={e => patchItem(item.id, { equipped: e.target.checked })} /></td>
        <td><input aria-label={`Vincular ${item.name}`} type="checkbox" checked={item.attuned} style={{ width: 16, minHeight: 0 }} onChange={e => patchItem(item.id, { attuned: e.target.checked })} /></td>
        <td><div className="flex" style={{ gap: 2 }}><button className="icon-button" aria-label={`Editar ${item.name}`} onClick={() => setDraft({ ...item })}><FilePenLine size={16} /></button><button className="icon-button" aria-label={`Eliminar ${item.name}`} onClick={() => setRemoving(item)}><Trash2 size={16} /></button></div></td>
      </tr>)}</tbody></table></div> : <Empty icon={<Backpack size={28} />} title={character.inventory.length ? 'No hay objetos que coincidan' : 'Tu mochila está lista'} description={character.inventory.length ? 'Prueba otro nombre o cambia la categoría.' : 'Añade equipo del manual o crea un objeto para tu aventura.'}>{character.inventory.length ? <Button variant="ghost" onClick={() => { setQuery(''); setCategory('Todas'); }}>Limpiar filtros</Button> : <Button onClick={create}><Plus size={16} />Añadir un objeto</Button>}</Empty>}
    </section>
    <section className="panel stack" aria-label="Dinero"><div className="panel-title flex"><Coins size={18} /><h3>Tu bolsa de monedas</h3></div><div className="money-grid">{COINS.map(coin => <Field key={coin.id} label={coin.label}><input aria-label={`Monedas de ${coin.label.toLowerCase()}`} type="number" min={0} step={1} value={character.money[coin.id] ?? 0} onChange={e => onChange({ ...character, money: { ...character.money, [coin.id]: Math.max(0, Math.floor(validNumber(e.target.valueAsNumber))) } })} /></Field>)}</div></section>

    <Modal open={Boolean(draft)} onClose={() => setDraft(null)} title={draft && character.inventory.some(item => item.id === draft.id) ? 'Editar objeto' : 'Nuevo objeto'} wide>
      {draft && <form className="stack" onSubmit={saveItem}>
        <div className="grid-2"><Field label="Nombre"><input required autoFocus maxLength={160} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></Field><Field label="Categoría"><select value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value as InventoryItem['category'] })}>{INVENTORY_CATEGORIES.map(value => <option key={value}>{value}</option>)}</select></Field><Field label="Cantidad"><input required type="number" min={1} step={1} value={draft.quantity} onChange={e => setDraft({ ...draft, quantity: validNumber(e.target.valueAsNumber, 1) })} /></Field><Field label="Peso por unidad (lb)"><input required type="number" min={0} step="any" value={draft.weight} onChange={e => setDraft({ ...draft, weight: validNumber(e.target.valueAsNumber) })} /></Field></div>
        <div className="flex wrap"><label className="flex"><input type="checkbox" checked={draft.equipped} onChange={e => setDraft({ ...draft, equipped: e.target.checked })} />Equipado</label><label className="flex"><input type="checkbox" checked={draft.attuned} onChange={e => setDraft({ ...draft, attuned: e.target.checked })} />Vinculado</label></div>
        {draft.category === 'Armaduras' && <div className="panel stack"><div className="flex subtle"><Shield size={16} />Protección</div><Field label="Tipo de protección"><select value={armorKind} onChange={e => setDraft({ ...draft, armorBase: e.target.value === 'armor' ? 10 : undefined, dexCap: undefined, shieldBonus: e.target.value === 'shield' ? 2 : undefined })}><option value="none">Sin valor de CA</option><option value="armor">Armadura</option><option value="shield">Escudo</option></select></Field>{armorKind === 'armor' && <div className="grid-2"><Field label="Clase de armadura base"><input type="number" required min={0} step={1} value={draft.armorBase ?? ''} onChange={e => setDraft({ ...draft, armorBase: Math.max(0, validNumber(e.target.valueAsNumber)) })} /></Field><Field label="Máximo modificador de Destreza" hint="Vacío: sin límite. 0: no se suma Destreza."><input type="number" min={0} step={1} placeholder="Sin límite" value={draft.dexCap ?? ''} onChange={e => setDraft({ ...draft, dexCap: e.target.value === '' ? undefined : Math.max(0, validNumber(e.target.valueAsNumber)) })} /></Field></div>}{armorKind === 'shield' && <Field label="Bonificación del escudo a la CA"><input required type="number" min={0} step={1} value={draft.shieldBonus ?? 2} onChange={e => setDraft({ ...draft, shieldBonus: Math.max(0, validNumber(e.target.valueAsNumber)) })} /></Field>}</div>}
        <Field label="Descripción"><textarea rows={4} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></Field><Field label="Notas personales"><textarea rows={3} placeholder="Dónde lo encontraste, propiedades especiales…" value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} /></Field>
        <div className="modal-footer"><Button type="button" onClick={() => setDraft(null)}>Cancelar</Button><Button type="submit" variant="primary">Guardar objeto</Button></div>
      </form>}
    </Modal>
    <Modal open={Boolean(catalogDraft)} onClose={() => setCatalogDraft(null)} title="Equipo del manual" description="Elige los objetos que quieres llevar contigo." wide>
      {catalogDraft && <div className="stack"><EquipmentPicker character={catalogDraft} catalog={catalog} onChange={next => setCatalogDraft({ ...next, inventory: next.inventory.map(item => normalizeEquipment(item, catalog)) })} /><div className="modal-footer"><Button onClick={() => setCatalogDraft(null)}>Cancelar</Button><Button variant="primary" disabled={!catalogDraft.inventory.length} onClick={() => { onChange({ ...character, inventory: [...character.inventory, ...catalogDraft.inventory] }); setCatalogDraft(null); }}>Añadir al inventario{catalogDraft.inventory.length ? ` (${catalogDraft.inventory.length})` : ''}</Button></div></div>}
    </Modal>
    <Modal open={Boolean(removing)} onClose={() => setRemoving(null)} title="Eliminar objeto" description={removing ? `¿Quieres quitar «${removing.name}» de tu inventario?` : undefined}><div className="modal-footer"><Button onClick={() => setRemoving(null)}>Cancelar</Button><Button variant="danger" onClick={() => { if (removing) onChange({ ...character, inventory: character.inventory.filter(item => item.id !== removing.id) }); setRemoving(null); }}><Trash2 size={16} />Eliminar objeto</Button></div></Modal>
  </div>;
}

export function NotesPanel({ character, onChange }: PanelProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todas');
  const [draft, setDraft] = useState<Note | null>(null);
  const [removing, setRemoving] = useState<Note | null>(null);
  const categories = [...new Set([...NOTE_CATEGORIES, ...character.notes.map(note => note.category)])];
  const notes = character.notes.filter(note => (category === 'Todas' || note.category === category) && fold(`${note.title} ${note.content} ${note.category}`).includes(fold(query))).sort((a, b) => b.date.localeCompare(a.date));
  const create = () => setDraft({ id: crypto.randomUUID(), title: '', category: category === 'Todas' ? 'Sesión' : category, content: '', date: today() });
  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!draft || !draft.title.trim()) return;
    const saved = { ...draft, title: draft.title.trim(), category: draft.category.trim() || 'Personalizada' };
    onChange({ ...character, notes: character.notes.some(note => note.id === draft.id) ? character.notes.map(note => note.id === draft.id ? saved : note) : [...character.notes, saved] });
    setDraft(null);
  };

  return <div className="stack">
    <div className="section-heading"><div><h2>Crónicas de aventura</h2><p className="subtle">Personas, lugares e historias que merecen recordarse.</p></div><Button variant="primary" onClick={create}><Plus size={16} />Nueva nota</Button></div>
    <div className="spell-filters"><div className="search-field"><Search size={16} /><input aria-label="Buscar notas" placeholder="Buscar en tus crónicas…" value={query} onChange={e => setQuery(e.target.value)} /></div><select aria-label="Categoría de notas" value={category} onChange={e => setCategory(e.target.value)}><option>Todas</option>{categories.map(value => <option key={value}>{value}</option>)}</select></div>
    {notes.length ? <div className="notes-grid">{notes.map(note => <article key={note.id} className="note-card"><div className="between"><span className="eyebrow">{note.category}</span><NotebookPen size={16} className="muted" /></div><h3>{note.title}</h3><p style={{ overflowWrap: 'anywhere' }}>{note.content || 'Esta historia está por escribir.'}</p><div className="note-footer"><time dateTime={note.date}>{dateLabel(note.date)}</time><div className="flex" style={{ gap: 2 }}><button className="icon-button" aria-label={`Editar nota ${note.title}`} onClick={() => setDraft({ ...note, date: note.date.slice(0, 10) })}><FilePenLine size={16} /></button><button className="icon-button" aria-label={`Eliminar nota ${note.title}`} onClick={() => setRemoving(note)}><Trash2 size={16} /></button></div></div></article>)}</div> : <div className="panel"><Empty icon={<NotebookPen size={28} />} title={character.notes.length ? 'Ninguna nota coincide' : 'Toda aventura merece una crónica'} description={character.notes.length ? 'Prueba otra búsqueda o categoría.' : 'Anota lo ocurrido en la última sesión o guarda los detalles de tu próxima misión.'}>{character.notes.length ? <Button variant="ghost" onClick={() => { setQuery(''); setCategory('Todas'); }}>Limpiar filtros</Button> : <Button onClick={create}><Plus size={16} />Escribir la primera nota</Button>}</Empty></div>}
    <Modal open={Boolean(draft)} onClose={() => setDraft(null)} title={draft && character.notes.some(note => note.id === draft.id) ? 'Editar nota' : 'Una nueva crónica'} wide>
      {draft && <form className="stack" onSubmit={save}><Field label="Título"><input required autoFocus maxLength={180} placeholder="Una promesa en la taberna…" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></Field><div className="grid-2"><Field label="Categoría"><select value={NOTE_CATEGORIES.includes(draft.category) ? draft.category : 'Personalizada'} onChange={e => setDraft({ ...draft, category: e.target.value })}>{NOTE_CATEGORIES.map(value => <option key={value}>{value}</option>)}</select></Field><Field label="Fecha"><input type="date" required value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })} /></Field></div>{(!NOTE_CATEGORIES.includes(draft.category) || draft.category === 'Personalizada') && <Field label="Nombre de la categoría"><input placeholder="Por ejemplo: Sueños" value={draft.category === 'Personalizada' ? '' : draft.category} onChange={e => setDraft({ ...draft, category: e.target.value || 'Personalizada' })} /></Field>}<Field label="Contenido"><textarea rows={10} style={{ minHeight: 240 }} placeholder="¿Qué ocurrió? ¿Qué detalles quieres recordar?" value={draft.content} onChange={e => setDraft({ ...draft, content: e.target.value })} /></Field><div className="modal-footer"><Button type="button" onClick={() => setDraft(null)}>Cancelar</Button><Button type="submit" variant="primary">Guardar nota</Button></div></form>}
    </Modal>
    <Modal open={Boolean(removing)} onClose={() => setRemoving(null)} title="Eliminar nota" description={removing ? `¿Quieres eliminar «${removing.title}»? Esta acción borrará su contenido.` : undefined}><div className="modal-footer"><Button onClick={() => setRemoving(null)}>Cancelar</Button><Button variant="danger" onClick={() => { if (removing) onChange({ ...character, notes: character.notes.filter(note => note.id !== removing.id) }); setRemoving(null); }}><Trash2 size={16} />Eliminar nota</Button></div></Modal>
  </div>;
}
