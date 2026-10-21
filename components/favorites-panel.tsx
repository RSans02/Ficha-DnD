'use client';

import { useState } from 'react';
import { ArrowRight, Backpack, Search, Sparkles, Star, WandSparkles } from 'lucide-react';
import type { Catalog, Character, DerivedCharacter, Entity } from '@/lib/types';
import { Button, CheckOption, Modal, cleanDescription } from './ui';
import './favorites-panel.css';

export function FavoritesPanel({ character, catalog, derived, onChange, onDetail }: {
  character: Character;
  catalog: Catalog;
  derived: DerivedCharacter;
  onChange: (character: Character) => void;
  onDetail: (entity: Entity) => void;
}) {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('Todos');
  const [itemId, setItemId] = useState<string | null>(null);
  const [addingItems, setAddingItems] = useState(false);
  const [itemQuery, setItemQuery] = useState('');
  const term = query.trim().toLocaleLowerCase('es');
  const favoriteSpells = catalog.spells.filter(spell => character.favorites.spells.includes(spell.id));
  const favoriteFeatures = derived.features.filter(feature => character.favorites.features.includes(feature.id));
  const favoriteItems = character.inventory.filter(item => (character.favorites.items ?? []).includes(item.id));
  const selectedItem = favoriteItems.find(item => item.id === itemId);
  const spells = kind === 'Todos' || kind === 'Conjuros' ? favoriteSpells.filter(spell => spell.name.toLocaleLowerCase('es').includes(term)) : [];
  const features = kind === 'Todos' || kind === 'Rasgos' ? favoriteFeatures.filter(feature => feature.name.toLocaleLowerCase('es').includes(term)) : [];
  const items = kind === 'Todos' || kind === 'Objetos' ? favoriteItems.filter(item => item.name.toLocaleLowerCase('es').includes(term)) : [];
  const pickerItems = character.inventory.filter(item => item.name.toLocaleLowerCase('es').includes(itemQuery.trim().toLocaleLowerCase('es')));
  const toggleItem = (id: string) => {
    const ids = character.favorites.items ?? [];
    onChange({ ...character, favorites: { ...character.favorites, items: ids.includes(id) ? ids.filter(entry => entry !== id) : [...ids, id] } });
  };
  const removeItem = (id: string) => {
    toggleItem(id);
    setItemId(null);
  };

  return <div className="panel">
    <div className="panel-title"><Sparkles/><h3>Siempre a mano</h3><Button className="compact no-print" disabled={!character.inventory.length} title={character.inventory.length ? 'Elegir objetos que ya tienes en el inventario' : 'Primero añade objetos a tu inventario'} onClick={() => setAddingItems(true)}><Star size={14}/>Elegir del inventario</Button></div>
    <div className="spell-filters no-print"><div className="search-field"><Search size={15}/><input aria-label="Filtrar favoritos" placeholder="Buscar favoritos…" value={query} onChange={event => setQuery(event.target.value)}/></div><select aria-label="Tipo de favorito" value={kind} onChange={event => setKind(event.target.value)}><option>Todos</option><option>Conjuros</option><option>Rasgos</option><option>Objetos</option></select></div>
    {!favoriteSpells.length && !favoriteFeatures.length && !favoriteItems.length
      ? <p className="subtle">Aquí aparecerán los conjuros y rasgos que marques con la estrella, y los objetos que elijas de tu inventario.</p>
      : <div>{spells.map(spell => <button key={spell.id} className="attack-row favorite-entry" onClick={() => onDetail(spell)}><WandSparkles size={17}/><div className="attack-info"><h4>{spell.name}</h4><p>{spell.level === 0 ? 'Truco' : `Nivel ${spell.level}`} · {spell.castingTime}</p></div><ArrowRight size={14}/></button>)}
        {features.map(feature => <button key={feature.id} className="attack-row favorite-entry" onClick={() => onDetail(feature)}><Sparkles size={17}/><div className="attack-info"><h4>{feature.name}</h4><p>{cleanDescription(feature.description, 80)}</p></div><ArrowRight size={14}/></button>)}
        {items.map(item => <button key={item.id} className="attack-row favorite-entry" onClick={() => setItemId(item.id)}><Backpack size={17}/><div className="attack-info"><h4>{item.name}</h4><p>{item.category} · Cantidad {item.quantity}{item.equipped ? ' · Equipado' : ''}</p></div><ArrowRight size={14}/></button>)}
        {!spells.length && !features.length && !items.length && <p className="subtle favorite-empty">No hay favoritos con estos filtros.</p>}
      </div>}
    <Modal open={!!selectedItem} onClose={() => setItemId(null)} title={selectedItem?.name ?? ''}>
      {selectedItem && <div className="stack"><p className="subtle">{selectedItem.category} · Cantidad {selectedItem.quantity} · {selectedItem.weight} lb por unidad{selectedItem.equipped ? ' · Equipado' : ''}</p>{selectedItem.description && <p className="source-prose">{selectedItem.description}</p>}{selectedItem.notes && <p className="source-prose"><strong>Notas:</strong> {selectedItem.notes}</p>}<div className="modal-footer"><Button onClick={() => removeItem(selectedItem.id)}><Star size={15}/>Quitar de favoritos</Button><Button variant="primary" onClick={() => setItemId(null)}>Cerrar</Button></div></div>}
    </Modal>
    <Modal open={addingItems} onClose={() => setAddingItems(false)} title="Elegir objetos del inventario">
      <div className="stack"><p className="subtle">Marca los objetos que quieres tener en «Siempre a mano». Vuelve a pulsar uno para quitarlo.</p><div className="search-field"><Search size={16}/><input aria-label="Buscar objetos del inventario" placeholder="Buscar en tu inventario…" value={itemQuery} onChange={event => setItemQuery(event.target.value)}/></div><div className="favorite-item-picker">{pickerItems.slice(0, 100).map(item => <CheckOption key={item.id} selected={(character.favorites.items ?? []).includes(item.id)} onClick={() => toggleItem(item.id)} title={item.name} description={`${item.category} · Cantidad ${item.quantity}`}/>)}{!pickerItems.length && <p className="subtle">No hay objetos con ese nombre.</p>}{pickerItems.length > 100 && <p className="subtle">Se muestran los primeros 100 objetos. Escribe un nombre para afinar la búsqueda.</p>}</div><div className="modal-footer"><Button variant="primary" onClick={() => setAddingItems(false)}>Terminar</Button></div></div>
    </Modal>
  </div>;
}
