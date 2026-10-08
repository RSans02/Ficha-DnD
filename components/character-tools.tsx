'use client';

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpDown, Backpack, BookOpen, ChevronRight, Coins, FilePenLine, Hand, LayoutGrid, MoreHorizontal, NotebookPen, Plus, Search, Settings2, Sparkles, Trash2, Weight } from 'lucide-react';
import type { Catalog, Character, InventoryItem, Note } from '@/lib/types';
import { Button, Empty, Field, Modal } from '@/components/ui';
import { EquipmentPicker } from './equipment-picker';
import { CustomItemDialog } from './custom-item-dialog';
import { inventorySummary, reorderContainerRows, separateContainerUnits, withoutContainerId } from '@/lib/equipment';
import './inventory-tabs.css';

type PanelProps = { character: Character; catalog: Catalog; onChange: (character: Character) => void };
const INVENTORY_CATEGORIES: InventoryItem['category'][] = ['Armas', 'Armaduras', 'Equipo', 'Objetos'];
const INVENTORY_SORT_FIELDS = [{ key: 'name', label: 'Objeto' }, { key: 'quantity', label: 'Cantidad' }, { key: 'weight', label: 'Peso / unidad' }, { key: 'equipped', label: 'Equipado' }, { key: 'attuned', label: 'Sintonizado' }] as const;
type InventorySortKey = typeof INVENTORY_SORT_FIELDS[number]['key'];
const NOTE_CATEGORIES = ['Sesión', 'NPC', 'Lugar', 'Misión', 'Objeto', 'Lore', 'Personalizada'];
const COINS = [{ id: 'pc', label: 'Cobre' }, { id: 'pp', label: 'Plata' }, { id: 'pe', label: 'Electro' }, { id: 'po', label: 'Oro' }, { id: 'ppt', label: 'Platino' }];
const fold = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
const validNumber = (value: number, fallback = 0) => Number.isFinite(value) ? value : fallback;
const decimal = (value: number) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(value);
function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function dateLabel(value: string) { const date = new Date(value.includes('T') ? value : `${value}T12:00:00`); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).format(date); }

export function InventoryPanel({ character, catalog, onChange }: PanelProps) {
  const panelId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [scope, setScope] = useState('all');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todas');
  const [sort, setSort] = useState<{ key: InventorySortKey; direction: 'asc' | 'desc' } | null>(null);
  const [openNotesId, setOpenNotesId] = useState<string | null>(null);
  const [draft, setDraft] = useState<InventoryItem | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [removing, setRemoving] = useState<InventoryItem | null>(null);
  const [containerMenu, setContainerMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [draggedContainerId, setDraggedContainerId] = useState<string | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [reorderAnnouncement, setReorderAnnouncement] = useState('');
  const menuRef = useRef<HTMLDivElement | null>(null);
  const firstMenuItemRef = useRef<HTMLButtonElement | null>(null);
  const draggedContainerRef = useRef<string | null>(null);
  const draggedItemRef = useRef<string | null>(null);
  const previousTabPositions = useRef<Map<string, { left: number; top: number }> | null>(null);
  const focusAfterReorder = useRef<string | null>(null);
  const containers = character.inventory.filter(item => item.isContainer);
  const menuContainer = containers.find(item => item.id === containerMenu?.id);
  const menuContainerIndex = containers.findIndex(item => item.id === containerMenu?.id);
  useEffect(() => {
    if (!containerMenu) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node) && !(event.target as Element).closest('[data-container-menu-trigger]')) setContainerMenu(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setContainerMenu(null);
      tabRefs.current[tabs.findIndex(tab => tab.id === containerMenu.id)]?.focus({ preventScroll: true });
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    requestAnimationFrame(() => firstMenuItemRef.current?.focus());
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [containerMenu, character.inventory]);
  const selectedContainer = containers.find(item => item.id === scope);
  const showAllTab = character.inventoryOptions?.showAllTab !== false;
  const activeScope = selectedContainer?.id ?? (scope === 'all' && showAllTab ? 'all' : 'loose');
  const nameTotals = new Map<string, number>();
  containers.forEach(container => {
    const key = fold(container.name.trim() || 'Contenedor');
    nameTotals.set(key, (nameTotals.get(key) ?? 0) + 1);
  });
  const seenNames = new Map<string, number>();
  const looseItems = character.inventory.filter(item => !item.isContainer && (!item.containerId || !containers.some(container => container.id === item.containerId)));
  const tabs = [...(showAllTab ? [{ id: 'all', label: 'Todo', count: character.inventory.length }] : []), { id: 'loose', label: 'General', count: looseItems.length }, ...containers.map(container => {
    const name = container.name.trim() || 'Contenedor';
    const key = fold(name);
    const number = (seenNames.get(key) ?? 0) + 1;
    seenNames.set(key, number);
    return { id: container.id, label: name, count: character.inventory.filter(item => item.containerId === container.id).length, number, total: nameTotals.get(key) ?? 1 };
  })];
  useLayoutEffect(() => {
    const previous = previousTabPositions.current;
    if (!previous) return;
    previousTabPositions.current = null;
    containers.forEach(container => {
      const element = tabRefs.current[tabs.findIndex(tab => tab.id === container.id)]?.parentElement;
      const before = previous.get(container.id);
      if (!element || !before || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const after = element.getBoundingClientRect();
      const x = before.left - after.left, y = before.top - after.top;
      if (x || y) element.animate([{ transform: `translate(${x}px, ${y}px)` }, { transform: 'translate(0, 0)' }], { duration: 260, easing: 'cubic-bezier(.22, 1, .36, 1)' });
    });
    if (focusAfterReorder.current) {
      tabRefs.current[tabs.findIndex(tab => tab.id === focusAfterReorder.current)]?.focus({ preventScroll: true });
      focusAfterReorder.current = null;
    }
  }, [character.inventory]);
  const selectedTabIndex = tabs.findIndex(tab => tab.id === activeScope);
  const reorderContainer = (sourceId: string, targetId: string, restoreFocus = false) => {
    const nextInventory = reorderContainerRows(character.inventory, sourceId, targetId);
    if (nextInventory === character.inventory) return;
    previousTabPositions.current = new Map(containers.map(container => {
      const rect = tabRefs.current[tabs.findIndex(tab => tab.id === container.id)]?.parentElement?.getBoundingClientRect();
      return [container.id, { left: rect?.left ?? 0, top: rect?.top ?? 0 }];
    }));
    if (restoreFocus) focusAfterReorder.current = sourceId;
    const nextPosition = nextInventory.filter(item => item.isContainer).findIndex(item => item.id === sourceId) + 1;
    const name = containers.find(item => item.id === sourceId)?.name ?? 'Contenedor';
    setReorderAnnouncement(`${name}, posición ${nextPosition} de ${containers.length}`);
    onChange({ ...character, inventory: nextInventory });
  };
  const moveItemToScope = (itemId: string, targetId: string) => {
    const item = character.inventory.find(entry => entry.id === itemId);
    if (!item || item.isContainer) return;
    if (targetId === 'all' || targetId === 'loose') {
      if (!item.containerId) return;
      onChange({ ...character, inventory: character.inventory.map(entry => entry.id === itemId ? withoutContainerId(entry) : entry) });
      setReorderAnnouncement(`${item.name} sacado de la bolsa.`);
      return;
    }
    const container = containers.find(entry => entry.id === targetId);
    if (!container || item.containerId === targetId) return;
    onChange({ ...character, inventory: character.inventory.map(entry => entry.id === itemId ? { ...entry, containerId: targetId } : entry) });
    setReorderAnnouncement(`${item.name} guardado en ${container.name}.`);
  };
  const clearItemDrag = () => { draggedItemRef.current = null; setDraggedItemId(null); setDropTargetId(null); };
  const showContainerMenu = (id: string, x: number, y: number) => {
    setContainerMenu({ id, x: Math.max(8, Math.min(x, window.innerWidth - 228)), y: Math.max(8, Math.min(y, window.innerHeight - 235)) });
  };
  const moveTab = (index: number, key: string) => {
    const next = key === 'Home' ? 0 : key === 'End' ? tabs.length - 1 : key === 'ArrowRight' ? (index + 1) % tabs.length : (index + tabs.length - 1) % tabs.length;
    setScope(tabs[next].id);
    tabRefs.current[next]?.focus();
    tabRefs.current[next]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };
  const returnToRoot = () => {
    setScope(showAllTab ? 'all' : 'loose');
    setContainerMenu(null);
    requestAnimationFrame(() => tabRefs.current[0]?.focus());
  };
  const items = useMemo(() => {
    const roots = character.inventory.filter(item => !item.containerId || !character.inventory.some(parent => parent.id === item.containerId));
    const ordered = activeScope === 'all' ? roots.flatMap(root => [root, ...character.inventory.filter(item => item.containerId === root.id)]) : activeScope === 'loose' ? looseItems : character.inventory.filter(item => item.containerId === activeScope);
    const term = fold(query.trim());
    const matches = ordered.filter(item => (category === 'Todas' || item.category === category) && fold(`${item.name} ${item.description} ${item.notes}`).includes(term));
    if (sort) return matches.sort((a, b) => {
      const comparison = sort.key === 'name' ? a.name.localeCompare(b.name, 'es', { sensitivity: 'base', numeric: true }) : Number(a[sort.key]) - Number(b[sort.key]);
      return sort.direction === 'asc' ? comparison : -comparison;
    });
    return term ? matches.sort((a, b) => Number(fold(b.name).includes(term)) - Number(fold(a.name).includes(term))) : matches;
  }, [character.inventory, activeScope, category, query, sort]);
  const hasInventoryFilter = Boolean(query.trim()) || category !== 'Todas';
  const showContainerLocation = hasInventoryFilter || sort !== null;
  const toggleSort = (key: InventorySortKey) => setSort(current => current?.key === key ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: key === 'equipped' || key === 'attuned' ? 'desc' : 'asc' });
  const containerNames = new Map(containers.map(item => [item.id, item.name]));
  const containerContents = selectedContainer ? character.inventory.filter(item => item.containerId === selectedContainer.id) : [];
  const summary = inventorySummary(character), weight = summary.totalWeight;
  const patchItem = (id: string, patch: Partial<InventoryItem>) => onChange({ ...character, inventory: character.inventory.map(item => item.id === id ? { ...item, ...patch } : item) });
  const create = (container = false, targetContainerId = selectedContainer?.id) => setDraft({ id: crypto.randomUUID(), homebrew: true, name: container ? 'Bolsa' : '', category: container || category === 'Todas' ? 'Equipo' : category as InventoryItem['category'], quantity: 1, weight: 0, equipped: false, attuned: false, isContainer: container, ...(container || !targetContainerId ? {} : { containerId: targetContainerId }), description: '', notes: '' });
  const addContainer = () => {
    const bag: InventoryItem = { id: crypto.randomUUID(), homebrew: true, name: 'Bolsa', category: 'Equipo', quantity: 1, weight: 0, equipped: false, attuned: false, isContainer: true, description: '', notes: '' };
    onChange({ ...character, inventory: [...character.inventory, bag] });
    setScope(bag.id);
    setContainerMenu(null);
  };
  const saveItem = (saved: InventoryItem) => {
    const exists = character.inventory.some(item => item.id === saved.id);
    const [first, ...additional] = separateContainerUnits(saved);
    onChange({ ...character, inventory: exists ? [...character.inventory.map(item => item.id === saved.id ? first : !saved.isContainer && item.containerId === saved.id ? withoutContainerId(item) : item), ...additional] : [...character.inventory, first, ...additional] });
    if (activeScope === saved.id && !saved.isContainer) returnToRoot();
    if (!exists && saved.isContainer) setScope(saved.id);
    setDraft(null);
  };

  return <div className="stack">
    <div className="section-heading"><div><h2>Equipo de aventura</h2><p className="subtle">Todo lo que llevas en el camino.</p></div><div className="flex wrap"><Button onClick={() => setCatalogOpen(true)}><BookOpen size={16} />Buscar en el manual</Button><Button variant="primary" onClick={() => create()}><Sparkles size={16} />Crear objeto</Button><button className="icon-button inventory-settings-trigger" type="button" aria-label="Ajustes de inventario" title="Ajustes de inventario" aria-expanded={settingsOpen} aria-controls={`${panelId}-settings`} onClick={() => setSettingsOpen(open => !open)}><Settings2 size={18} /></button></div></div>
    {settingsOpen && <section id={`${panelId}-settings`} className="panel inventory-settings" aria-label="Ajustes de inventario"><h3>Ajustes de inventario</h3><label><input type="checkbox" checked={character.inventoryOptions?.coinsHaveWeight === false} onChange={e => onChange({ ...character, inventoryOptions: { ...character.inventoryOptions, coinsHaveWeight: !e.target.checked } })} />Las monedas no pesan</label><label><input type="checkbox" checked={showAllTab} onChange={e => { onChange({ ...character, inventoryOptions: { coinsHaveWeight: character.inventoryOptions?.coinsHaveWeight !== false, showAllTab: e.target.checked } }); if (!e.target.checked && activeScope === 'all') setScope('loose'); }} />Mostrar la pestaña «Todo»</label></section>}
    <section className="panel stack" aria-label="Inventario">
      <div className="between wrap"><div className="flex"><Backpack size={18} /><strong>{character.inventory.length} {character.inventory.length === 1 ? 'objeto' : 'objetos'}</strong></div><span className="flex subtle"><Weight size={16} />Peso total <strong>{decimal(weight)} lb</strong></span></div>
      <p className="subtle">Equipo: {decimal(summary.itemWeight)} lb · Monedas: {decimal(summary.coinWeight)} lb {character.inventoryOptions?.coinsHaveWeight === false ? '(sin peso)' : '(50 por libra)'}. Sintonización: {summary.attuned} / {summary.attunementLimit} objetos.</p>
      {summary.attuned>summary.attunementLimit&&<p className="error-box" role="alert">Superas tu límite de sintonización. Revisa los objetos vinculados; separa los objetos de una pila si solo uno está sintonizado.</p>}
      <div className="inventory-tabs">
        <div className="inventory-tab-list" role="tablist" aria-label="Ubicaciones del inventario">{tabs.map((tab, index) =>
          <div key={tab.id} className={`inventory-tab-item${draggedContainerId === tab.id ? ' is-dragging' : ''}${dropTargetId === tab.id ? ' is-drop-target' : ''}`} role="presentation"
            onContextMenu={containers.some(container => container.id === tab.id) ? event => { event.preventDefault(); showContainerMenu(tab.id, event.clientX, event.clientY); } : undefined}
            onDragOver={event => { const item = character.inventory.find(entry => entry.id === draggedItemRef.current); if ((item && !item.isContainer && (tab.id === 'all' || tab.id === 'loose' ? Boolean(item.containerId) : item.containerId !== tab.id)) || (containers.some(container => container.id === tab.id) && draggedContainerRef.current && draggedContainerRef.current !== tab.id)) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDropTargetId(tab.id); } }}
            onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDropTargetId(current => current === tab.id ? null : current); }}
            onDrop={event => { event.preventDefault(); if (draggedItemRef.current) { moveItemToScope(draggedItemRef.current, tab.id); if (tab.id === 'all' || tab.id === 'loose') setScope(tab.id); clearItemDrag(); } else if (containers.some(container => container.id === tab.id) && draggedContainerRef.current) { reorderContainer(draggedContainerRef.current, tab.id); draggedContainerRef.current = null; setDraggedContainerId(null); setDropTargetId(null); } }}>
            <button ref={node => { tabRefs.current[index] = node; }} id={`${panelId}-tab-${index}`} type="button" role="tab"
              draggable={containers.some(container => container.id === tab.id)} aria-label={`${tab.label}${'total' in tab && tab.total > 1 ? `, ${tab.number} de ${tab.total}` : ''}, ${tab.count} ${tab.count === 1 ? 'objeto' : 'objetos'}`}
              title={containers.some(container => container.id === tab.id) ? `${tab.label} · Suelta objetos aquí o arrastra la bolsa para reordenar` : 'Suelta aquí un objeto para sacarlo de su bolsa'} aria-selected={activeScope === tab.id} aria-controls={`${panelId}-items`} tabIndex={activeScope === tab.id ? 0 : -1} className="inventory-tab"
              onClick={() => { setScope(tab.id); setContainerMenu(null); }}
              onDragStart={containers.some(container => container.id === tab.id) ? event => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', tab.id); event.dataTransfer.setDragImage(event.currentTarget, -12, -40); draggedItemRef.current = null; setDraggedItemId(null); draggedContainerRef.current = tab.id; setDraggedContainerId(tab.id); setContainerMenu(null); } : undefined}
              onDragEnd={() => { draggedContainerRef.current = null; setDraggedContainerId(null); setDropTargetId(null); }}
              onKeyDown={event => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); moveTab(index, event.key); setContainerMenu(null); } else if (containers.some(container => container.id === tab.id) && (event.key === 'ContextMenu' || event.key === 'F10' && event.shiftKey)) { event.preventDefault(); const rect = event.currentTarget.getBoundingClientRect(); showContainerMenu(tab.id, rect.left, rect.bottom + 4); } }}>
              {tab.id === 'all' ? <LayoutGrid size={15} aria-hidden="true"/> : tab.id === 'loose' ? <Hand size={15} style={{ transform: 'scaleX(.9333)' }} aria-hidden="true"/> : <Backpack size={15} aria-hidden="true"/>}<span>{tab.label}</span>
            </button>
            {containers.some(container => container.id === tab.id) && <button data-container-menu-trigger className="inventory-tab-options" type="button" aria-label={`Opciones de ${tab.label}${'total' in tab && tab.total > 1 ? `, ${tab.number} de ${tab.total}` : ''}`} aria-haspopup="menu" aria-expanded={containerMenu?.id === tab.id} aria-controls={containerMenu?.id === tab.id ? `${panelId}-container-menu` : undefined} onClick={event => { if (containerMenu?.id === tab.id) setContainerMenu(null); else { const rect = event.currentTarget.getBoundingClientRect(); showContainerMenu(tab.id, rect.left, rect.bottom + 4); } }}><MoreHorizontal size={17} aria-hidden="true"/></button>}
          </div>
        )}</div>
        <button className="inventory-add-container" type="button" aria-label="Añadir bolsa" title="Añadir bolsa" onClick={addContainer}><Plus size={18} aria-hidden="true"/></button>
      </div>
      {menuContainer && containerMenu && createPortal(<div ref={menuRef} id={`${panelId}-container-menu`} className="inventory-container-menu" role="menu" aria-label={`Opciones de ${menuContainer.name}`} style={{ left: containerMenu.x, top: containerMenu.y }} onKeyDown={event => { if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return; event.preventDefault(); const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')); const current = buttons.indexOf(document.activeElement as HTMLButtonElement); const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : event.key === 'ArrowDown' ? (current + 1) % buttons.length : (current + buttons.length - 1) % buttons.length; buttons[next]?.focus(); }}>
        <button ref={firstMenuItemRef} type="button" role="menuitem" onClick={() => { setDraft({ ...menuContainer }); setContainerMenu(null); }}><FilePenLine size={15} aria-hidden="true"/>Editar contenedor</button>
        <button type="button" role="menuitem" onClick={() => { create(false, menuContainer.id); setContainerMenu(null); }}><Plus size={15} aria-hidden="true"/>Crear objeto aquí</button>
        <button type="button" role="menuitem" disabled={menuContainerIndex <= 0} onClick={() => { reorderContainer(menuContainer.id, containers[menuContainerIndex - 1].id, true); setContainerMenu(null); }}><ArrowLeft size={15} aria-hidden="true"/>Mover a la izquierda</button>
        <button type="button" role="menuitem" disabled={menuContainerIndex >= containers.length - 1} onClick={() => { reorderContainer(menuContainer.id, containers[menuContainerIndex + 1].id, true); setContainerMenu(null); }}><ArrowRight size={15} aria-hidden="true"/>Mover a la derecha</button>
        <button type="button" role="menuitem" className="danger" onClick={() => { setRemoving(menuContainer); setContainerMenu(null); }}><Trash2 size={15} aria-hidden="true"/>Eliminar contenedor</button>
      </div>, document.body)}
      <p className="inventory-reorder-status" role="status" aria-live="polite">{reorderAnnouncement}</p>
      <div id={`${panelId}-items`} role="tabpanel" aria-labelledby={`${panelId}-tab-${selectedTabIndex}`} tabIndex={0} className="inventory-tab-panel">
      <div className="spell-filters"><div className="search-field"><Search size={16} /><input aria-label="Buscar en el inventario" placeholder="Buscar un objeto…" value={query} onChange={e => setQuery(e.target.value)} /></div><select aria-label="Categoría de inventario" value={category} onChange={e => setCategory(e.target.value)}><option>Todas</option>{INVENTORY_CATEGORIES.map(value => <option key={value}>{value}</option>)}</select></div>
      {items.length ? <div className="table-scroll"><table className="data-table"><thead><tr>{INVENTORY_SORT_FIELDS.map(({ key, label }) => <th key={key} scope="col" className="inventory-sort-heading" aria-sort={sort?.key === key ? sort.direction === 'asc' ? 'ascending' : 'descending' : 'none'}><button type="button" className="inventory-sort-button" onClick={() => toggleSort(key)} aria-label={`Ordenar por ${label.toLowerCase()}${sort?.key === key ? sort.direction === 'asc' ? ', descendente' : ', ascendente' : ''}`}>{label}{sort?.key === key ? sort.direction === 'asc' ? <ArrowUp size={13} aria-hidden="true"/> : <ArrowDown size={13} aria-hidden="true"/> : <ArrowUpDown size={13} aria-hidden="true"/>}</button></th>)}<th scope="col"><span className="subtle">Acciones</span></th></tr></thead>{items.map(item => <tbody key={item.id}><tr draggable={!item.isContainer} className={`inventory-item-header${openNotesId === item.id ? ' notes-open' : ''}${draggedItemId === item.id ? ' is-dragging' : ''}${item.isContainer && dropTargetId === item.id ? ' is-drop-target' : ''}`}
        onDragStart={item.isContainer ? undefined : event => { draggedContainerRef.current = null; draggedItemRef.current = item.id; setDraggedItemId(item.id); setDropTargetId(null); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', item.id); }}
        onDragEnd={item.isContainer ? undefined : clearItemDrag}
        onDragOver={item.isContainer ? event => { const source = character.inventory.find(entry => entry.id === draggedItemRef.current); if (source && !source.isContainer && source.containerId !== item.id) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDropTargetId(item.id); } } : undefined}
        onDragLeave={item.isContainer ? event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDropTargetId(current => current === item.id ? null : current); } : undefined}
        onDrop={item.isContainer ? event => { event.preventDefault(); if (draggedItemRef.current) moveItemToScope(draggedItemRef.current, item.id); clearItemDrag(); } : undefined}>
        <td className="name-cell" style={item.containerId && activeScope === 'all' && !showContainerLocation ? { paddingLeft: 28 } : undefined}><button type="button" className="spell-name inventory-item-name" aria-label={item.notes ? `${openNotesId === item.id ? 'Ocultar' : 'Ver'} notas de ${item.name}` : `Editar ${item.name}`} aria-expanded={item.notes ? openNotesId === item.id : undefined} aria-controls={item.notes && openNotesId === item.id ? `${panelId}-notes-${item.id}` : undefined} onClick={() => item.notes ? setOpenNotesId(current => current === item.id ? null : item.id) : setDraft({ ...item })}><strong>{item.containerId && activeScope === 'all' && !showContainerLocation ? '↳ ' : ''}{item.name}</strong><small>{item.category}{item.isContainer ? ' · Contenedor' : ''}{item.rarity ? ` · ${item.rarity}` : ''}{item.shieldBonus !== undefined ? ` · +${item.shieldBonus} CA` : item.armorBase !== undefined ? ` · CA ${item.armorBase}` : ''}{item.containerId && activeScope === 'all' && showContainerLocation ? ` · En: ${containerNames.get(item.containerId) ?? 'Contenedor'}` : ''}</small>{item.notes && <span className="inventory-name-notes"><ChevronRight size={12} aria-hidden="true"/>{openNotesId === item.id ? 'Ocultar notas' : 'Ver notas'}</span>}</button></td>
        <td><input aria-label={`Cantidad de ${item.name}`} title={item.isContainer ? 'Cada contenedor se administra por separado; edítalo para crear varias unidades.' : undefined} type="number" min={1} step={1} disabled={item.isContainer} value={item.quantity} onChange={e => { if (e.target.value !== '') patchItem(item.id, { quantity: Math.max(1, Math.floor(validNumber(e.target.valueAsNumber, 1))) }); }} /></td>
        <td>{decimal(item.weight)} lb</td>
        <td><input aria-label={`Equipar ${item.name}`} type="checkbox" checked={item.equipped} style={{ width: 16, minHeight: 0 }} onChange={e => patchItem(item.id, { equipped: e.target.checked })} /></td>
        <td><input aria-label={`Sintonizar ${item.name}`} type="checkbox" checked={item.attuned} disabled={!item.requiresAttunement && !item.attuned} style={{ width: 16, minHeight: 0 }} onChange={e => patchItem(item.id, { attuned: e.target.checked })} /></td>
        <td><div className="flex" style={{ gap: 2 }}><button className="icon-button" aria-label={`Editar ${item.name}`} onClick={() => setDraft({ ...item })}><FilePenLine size={16} /></button><button className="icon-button" aria-label={`Eliminar ${item.name}`} onClick={() => setRemoving(item)}><Trash2 size={16} /></button></div></td>
      </tr>{item.notes && openNotesId === item.id && <tr id={`${panelId}-notes-${item.id}`} className="inventory-item-notes"><td colSpan={6}><p>{item.notes}</p></td></tr>}</tbody>)}</table></div> : <Empty icon={<Backpack size={28} />} title={selectedContainer && !containerContents.length ? 'Este contenedor está vacío' : character.inventory.length ? 'No hay objetos que coincidan' : 'Tu mochila está lista'} description={selectedContainer && !containerContents.length ? 'Añade un objeto aquí o búscalo en el manual.' : character.inventory.length ? 'Prueba otro nombre o cambia la categoría.' : 'Añade equipo del manual o crea un objeto para tu aventura.'}>{query || category !== 'Todas' ? <Button variant="ghost" onClick={() => { setQuery(''); setCategory('Todas'); }}>Limpiar filtros</Button> : <Button onClick={() => create()}><Sparkles size={16} />{selectedContainer ? 'Crear objeto aquí' : 'Crear objeto'}</Button>}</Empty>}
      </div>
    </section>
    <section className="panel stack" aria-label="Dinero"><div className="panel-title flex"><Coins size={18} /><h3>Tu bolsa de monedas</h3></div><div className="money-grid">{COINS.map(coin => <Field key={coin.id} label={coin.label}><input aria-label={`Monedas de ${coin.label.toLowerCase()}`} type="number" min={0} step={1} value={character.money[coin.id] ?? 0} onChange={e => onChange({ ...character, money: { ...character.money, [coin.id]: Math.max(0, Math.floor(validNumber(e.target.valueAsNumber))) } })} /></Field>)}</div></section>

    <CustomItemDialog item={draft} containers={character.inventory.filter(item => item.isContainer)} onClose={() => setDraft(null)} onSave={saveItem} title={draft && character.inventory.some(item => item.id === draft.id) ? 'Editar objeto' : 'Crear objeto'} />
    <Modal open={catalogOpen} onClose={() => setCatalogOpen(false)} title="Equipo del manual" description="Haz clic para añadir un objeto. Haz clic derecho para quitar uno." wide>
      <div className="stack"><EquipmentPicker character={character} catalog={catalog} onChange={onChange} containerId={selectedContainer?.id} showSelectedList={false}/>{selectedContainer && <p className="subtle">Los objetos sueltos se guardan en {selectedContainer.name}. Los paquetes del manual crean su propio contenedor.</p>}<div className="modal-footer"><Button onClick={() => setCatalogOpen(false)}>Cerrar</Button></div></div>
    </Modal>
    <Modal open={Boolean(removing)} onClose={() => setRemoving(null)} title={removing?.isContainer ? 'Eliminar contenedor' : 'Eliminar objeto'} description={removing ? `¿Quieres quitar «${removing.name}» de tu inventario?${removing.isContainer ? ' Los objetos guardados dentro quedarán fuera.' : ''}` : undefined}><div className="modal-footer"><Button onClick={() => setRemoving(null)}>Cancelar</Button><Button variant="danger" onClick={() => { if (removing) { onChange({ ...character, inventory: character.inventory.filter(item => item.id !== removing.id).map(item => item.containerId === removing.id ? withoutContainerId(item) : item) }); if (activeScope === removing.id) returnToRoot(); } setRemoving(null); }}><Trash2 size={16} />{removing?.isContainer ? 'Eliminar contenedor' : 'Eliminar objeto'}</Button></div></Modal>
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
