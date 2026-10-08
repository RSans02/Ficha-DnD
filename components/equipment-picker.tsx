'use client';

import { useState } from 'react';
import { Check, Info, Minus, Plus, Search, Sparkles, Trash2 } from 'lucide-react';
import type { Catalog, Character, Equipment, InventoryItem } from '@/lib/types';
import { addOneEquipment, equipmentCountInScope, foldEquipment, removeOneEquipment, separateContainerUnits, withoutContainerId } from '@/lib/equipment';
import { Button, Modal, SourceTag } from './ui';
import { CustomItemDialog } from './custom-item-dialog';
import './equipment-picker.css';

type QuickActions = { onAdd: (item: Equipment) => void; onRemove: (item: Equipment) => void; onDetail: (item: Equipment) => void; count: (item: Equipment) => number };

export function EquipmentSearch({ catalog, allowed = catalog.equipment, onSelect, selectedId, label = 'Buscar equipo en el manual', quick }: { catalog: Catalog; allowed?: Equipment[]; onSelect?: (item: Equipment) => void; selectedId?: string; label?: string; quick?: QuickActions }) {
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
        {found.slice(0, limit).map(item => quick ? <div key={item.id} className={`equipment-result quick${quick.count(item) ? ' selected' : ''}`} onContextMenu={event => { event.preventDefault(); quick.onRemove(item); }}>
          <button type="button" className="equipment-result-main" aria-label={`Añadir ${item.name}`} title="Clic para añadir; clic derecho para quitar" onClick={() => quick.onAdd(item)}><span><strong>{item.name}</strong><small>{item.category}{item.cost ? ` · ${item.cost}` : ''}{item.weight != null ? ` · ${item.weight} lb` : item.category === 'Paquetes' ? ' · peso según contenido' : ' · peso sin cifra oficial'}</small></span><Plus size={16} aria-hidden="true"/></button>
          <div className="equipment-result-actions">{quick.count(item) > 0 && <><span className="equipment-result-count" aria-label={`${quick.count(item)} en el inventario`}>{quick.count(item)}</span><button type="button" className="equipment-result-icon" aria-label={`Quitar uno de ${item.name}`} title="Quitar uno" onClick={() => quick.onRemove(item)}><Minus size={16} aria-hidden="true"/></button></>}<button type="button" className="equipment-result-icon" aria-label={`Ver descripción de ${item.name}`} title="Ver descripción" onClick={() => quick.onDetail(item)}><Info size={17} aria-hidden="true"/></button></div>
        </div> : <button type="button" key={item.id} className={`equipment-result ${selectedId === item.id ? 'selected' : ''}`} aria-pressed={selectedId === item.id} onClick={() => onSelect?.(item)}>
          <span><strong>{item.name}</strong><small>{item.category}{item.cost ? ` · ${item.cost}` : ''}{item.weight != null ? ` · ${item.weight} lb` : item.category === 'Paquetes' ? ' · peso según contenido' : ' · peso sin cifra oficial'}</small></span>{selectedId === item.id ? <Check size={18}/> : <Plus size={17}/>}
        </button>)}
      </div>
      {found.length === 0 && <p className="info-box">No hay coincidencias. Prueba otro nombre.</p>}
      {found.length > limit && <Button variant="ghost" onClick={() => setLimit(limit + 15)}>Mostrar más resultados</Button>}
    </>}
    {!quick && selected && <p className="subtle flex"><Check size={15}/>{selected.name} seleccionado</p>}
  </div>;
}

export function EquipmentPicker({ character, catalog, onChange, allowHomebrew = false, containerId, showSelectedList = true }: { character: Character; catalog: Catalog; onChange: (c: Character) => void; allowHomebrew?: boolean; containerId?: string; showSelectedList?: boolean }) {
  const [detail, setDetail] = useState<Equipment | null>(null), [custom, setCustom] = useState<InventoryItem | null>(null), [lastAction, setLastAction] = useState('');
  const quick: QuickActions = {
    onAdd: item => {
      onChange({ ...character, inventory: addOneEquipment(character.inventory, item, catalog, containerId, character) });
      setLastAction(`${item.name} añadido.`);
    },
    onRemove: item => {
      const inventory = removeOneEquipment(character.inventory, item.id, containerId);
      if (inventory === character.inventory) return;
      onChange({ ...character, inventory });
      setLastAction(`${item.name} quitado.`);
    },
    onDetail: setDetail,
    count: item => equipmentCountInScope(character.inventory, item.id, containerId),
  };
  return <div className="stack">
    <EquipmentSearch catalog={catalog} quick={quick}/>
    {lastAction && <p role="status" className="subtle">{lastAction}</p>}
    {allowHomebrew && <Button onClick={() => setCustom({ id: crypto.randomUUID(), name: '', category: 'Objetos', quantity: 1, weight: 0, equipped: false, attuned: false, description: '', notes: '', homebrew: true })}><Sparkles size={16}/>Crear objeto</Button>}
    {showSelectedList && !!character.inventory.length && <div className="stack" style={{ gap: 10 }} aria-label="Equipo adicional seleccionado">{character.inventory.map(item => <div className="equipment-selected-row" key={item.id}>
      <span><strong>{item.name}</strong></span>
      <input aria-label={`Cantidad de ${item.name}`} type="number" min={1} max={1_000_000} step={1} disabled={item.isContainer} value={item.quantity} onChange={event => { const value = Number(event.target.value); if (Number.isInteger(value) && value >= 1 && value <= 1_000_000) onChange({ ...character, inventory: character.inventory.map(other => other.id === item.id ? { ...other, quantity: value } : other) }); }}/>
      <button type="button" className="icon-button" aria-label={`Quitar ${item.name}`} onClick={() => onChange({ ...character, inventory: character.inventory.filter(other => other.id !== item.id).map(other => other.containerId === item.id ? withoutContainerId(other) : other) })}><Trash2 size={15}/></button>
    </div>)}</div>}
    <Modal open={!!detail} title={detail?.name ?? ''} onClose={() => setDetail(null)}>{detail && <><SourceTag source={detail.source}/><p className="source-prose">{detail.description}</p></>}</Modal>
    <CustomItemDialog item={custom} onClose={() => setCustom(null)} onSave={item => { onChange({ ...character, inventory: [...character.inventory, ...separateContainerUnits(item)] }); setCustom(null); }}/>
  </div>;
}
