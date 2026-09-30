'use client';

import { useState } from 'react';
import { BookOpen, Check, Plus, Search, Sparkles, Trash2 } from 'lucide-react';
import type { Catalog, Character, Equipment, InventoryItem } from '@/lib/types';
import { foldEquipment, inventoryFromEquipment } from '@/lib/equipment';
import { Button, Field, Modal, SourceTag } from './ui';
import { CustomItemDialog } from './custom-item-dialog';

export function EquipmentSearch({ catalog, allowed = catalog.equipment, onSelect, selectedId, label = 'Buscar equipo en el manual' }: { catalog: Catalog; allowed?: Equipment[]; onSelect: (item: Equipment) => void; selectedId?: string; label?: string }) {
  const [query, setQuery] = useState(''), [limit, setLimit] = useState(15);
  const words = foldEquipment(query.trim()).split(/\s+/).filter(Boolean);
  const found = words.length ? allowed.filter(item => words.every(word => foldEquipment(`${item.name} ${item.category ?? ''} ${item.weaponCategory ?? ''} ${item.equipmentType ?? ''}`).includes(word))) : [];
  const selected = allowed.find(item => item.id === selectedId);
  return <div className="equipment-search stack" style={{ gap: 10 }}>
    <div className="search-field"><Search size={16}/><input type="search" aria-label={label} placeholder="Escribe el nombre de un objeto…" value={query} onChange={event => { setQuery(event.target.value); setLimit(15); }}/></div>
    {!query.trim() && <p className="subtle">Busca por nombre o tipo: espada, armadura, herramientas…</p>}
    {query.trim() && <>
      <p className="subtle" role="status">{found.length} {found.length === 1 ? 'resultado' : 'resultados'}</p>
      <div className="equipment-results" aria-label={`Resultados: ${label}`}>
        {found.slice(0, limit).map(item => <button type="button" key={item.id} className={`equipment-result ${selectedId === item.id ? 'selected' : ''}`} aria-pressed={selectedId === item.id} onClick={() => onSelect(item)}>
          <span><strong>{item.name}</strong><small>{item.category}{item.cost ? ` · ${item.cost}` : ''}{item.weight != null ? ` · ${item.weight} lb` : ' · peso por completar'}</small></span>{selectedId === item.id ? <Check size={18}/> : <Plus size={17}/>}
        </button>)}
      </div>
      {found.length === 0 && <p className="info-box">No hay coincidencias. Prueba otro nombre o crea un objeto homebrew.</p>}
      {found.length > limit && <Button variant="ghost" onClick={() => setLimit(limit + 15)}>Mostrar más resultados</Button>}
    </>}
    {selected && <p className="subtle flex"><Check size={15}/>{selected.name} seleccionado</p>}
  </div>;
}

export function EquipmentPicker({ character, catalog, onChange, allowHomebrew = false }: { character: Character; catalog: Catalog; onChange: (c: Character) => void; allowHomebrew?: boolean }) {
  const [selected, setSelected] = useState<Equipment | null>(null), [quantity, setQuantity] = useState('1'), [detail, setDetail] = useState<Equipment | null>(null), [custom, setCustom] = useState<InventoryItem | null>(null), [lastAdded, setLastAdded] = useState('');
  const count = Number(quantity), validCount = Number.isInteger(count) && count >= 1 && count <= 1_000_000;
  const add = () => {
    if (!selected || !validCount) return;
    onChange({ ...character, inventory: [...character.inventory, inventoryFromEquipment(selected, count)] });
    setLastAdded(`${count} × ${selected.name} añadido${count === 1 ? '' : 's'}.`); setSelected(null); setQuantity('1');
  };
  return <div className="stack">
    <EquipmentSearch catalog={catalog} selectedId={selected?.id} onSelect={setSelected}/>
    {selected && <div className="selection-summary stack" style={{ marginTop: 0 }}>
      <div className="between wrap"><h3>{selected.name}</h3><SourceTag source={selected.source}/></div>
      <div className="equipment-add-controls"><Field label="Cantidad a añadir"><input type="number" min={1} max={1_000_000} step={1} value={quantity} onChange={e => setQuantity(e.target.value)}/></Field><Button variant="primary" disabled={!validCount} onClick={add}><Plus size={16}/>Añadir al equipo</Button><Button variant="ghost" onClick={() => setDetail(selected)}><BookOpen size={16}/>Descripción</Button></div>
      <p className="subtle">{selected.cost ? `Precio de referencia: ${selected.cost} por unidad. ` : ''}Añadir no descuenta monedas. Las unidades respetan los paquetes del catálogo, como «Flechas (20)».</p>
    </div>}
    {lastAdded && <p role="status" className="subtle">{lastAdded}</p>}
    {allowHomebrew && <Button onClick={() => setCustom({ id: crypto.randomUUID(), name: '', category: 'Objetos', quantity: 1, weight: 0, equipped: false, attuned: false, description: '', notes: '', homebrew: true })}><Sparkles size={16}/>Crear objeto homebrew</Button>}
    {!!character.inventory.length && <div className="stack" style={{ gap: 10 }} aria-label="Equipo adicional seleccionado">{character.inventory.map(item => <div className="equipment-selected-row" key={item.id}>
      <span><strong>{item.name}</strong>{item.homebrew && <small className="badge">Homebrew</small>}</span>
      <input aria-label={`Cantidad de ${item.name}`} type="number" min={1} max={1_000_000} step={1} value={item.quantity} onChange={event => { const value = Number(event.target.value); if (Number.isInteger(value) && value >= 1 && value <= 1_000_000) onChange({ ...character, inventory: character.inventory.map(other => other.id === item.id ? { ...other, quantity: value } : other) }); }}/>
      <button type="button" className="icon-button" aria-label={`Quitar ${item.name}`} onClick={() => onChange({ ...character, inventory: character.inventory.filter(other => other.id !== item.id) })}><Trash2 size={15}/></button>
    </div>)}</div>}
    <Modal open={!!detail} title={detail?.name ?? ''} onClose={() => setDetail(null)}>{detail && <><SourceTag source={detail.source}/><p className="source-prose">{detail.description}</p></>}</Modal>
    <CustomItemDialog item={custom} onClose={() => setCustom(null)} onSave={item => { onChange({ ...character, inventory: [...character.inventory, item] }); setCustom(null); }}/>
  </div>;
}
