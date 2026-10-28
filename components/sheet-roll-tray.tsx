import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Dice5, Trash2, X } from 'lucide-react';
import type { PreparedRoll, RollMode } from '@/lib/owlbear-rolls';
import { composePreparedRolls, MAX_PREPARED_ROLLS } from '@/lib/owlbear-rolls';
import './sheet-roll-tray.css';

type Props = {
  pending: boolean;
  mode: RollMode;
  onMode: (mode: RollMode) => void;
  accumulating: boolean;
  onAccumulating: (value: boolean) => void;
  rolls: PreparedRoll[];
  combineDamage: boolean;
  onCombineDamage: (value: boolean) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onSend: () => void;
};

const MODES: { value: RollMode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'advantage', label: 'Ventaja' },
  { value: 'disadvantage', label: 'Desventaja' },
];

const pageSizeForHeight = (height: number) => height < 470 ? 1 : height < 590 ? 2 : height < 750 ? 4 : MAX_PREPARED_ROLLS;

export function SheetRollTray({ pending, mode, onMode, accumulating, onAccumulating, rolls, combineDamage, onCombineDamage, onRemove, onClear, onSend }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(4);
  const previousCount = useRef(rolls.length);
  const damageCount = rolls.filter(roll => roll.kind === 'damage').length;
  const combined = combineDamage && damageCount > 1 ? composePreparedRolls(rolls, true).find(entry => entry.label.startsWith('Daño de ')) : null;
  const attackWithoutDamage = rolls.find(roll => roll.kind === 'd20' && roll.label.startsWith('Ataque con ') && !rolls.some(other => other.kind === 'damage' && other.label === `Daño de ${roll.label.slice('Ataque con '.length)}`));
  const pageCount = Math.max(1, Math.ceil(rolls.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const first = currentPage * pageSize;
  const visibleRolls = rolls.slice(first, first + pageSize);

  useEffect(() => {
    const update = () => setPageSize(pageSizeForHeight(window.innerHeight));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  useEffect(() => {
    if (rolls.length > previousCount.current) setPage(Math.ceil(rolls.length / pageSize) - 1);
    previousCount.current = rolls.length;
  }, [rolls.length, pageSize]);

  return <aside className={`sheet-roll-tray no-print${collapsed ? ' is-collapsed' : ''}`} aria-label="Mesa de tiradas de Owlbear">
    <button type="button" className="sheet-roll-tray-heading" aria-expanded={!collapsed} aria-label={`${collapsed ? 'Mostrar' : 'Ocultar'} mesa de tiradas de Owlbear`} onClick={() => setCollapsed(!collapsed)}>
      <Dice5 size={17}/><span className="sheet-roll-tray-title">Tiradas Owlbear</span>
      <span className="sheet-roll-tray-count" aria-live="polite">{rolls.length}</span>
      <ChevronDown size={15} className="sheet-roll-tray-chevron"/>
    </button>
    {!collapsed && <div className="sheet-roll-tray-body">
      <span className="sheet-roll-connection connected">Conectado a Owlbear</span>
      <fieldset className="sheet-roll-mode"><legend>Modo del d20</legend><div role="group" aria-label="Modo del d20">{MODES.map(option => <button key={option.value} type="button" className={mode === option.value ? 'active' : ''} aria-pressed={mode === option.value} onClick={() => onMode(option.value)}>{option.label}</button>)}</div></fieldset>
      <button type="button" className={`sheet-roll-accumulate${accumulating ? ' active' : ''}`} aria-pressed={accumulating} onClick={() => onAccumulating(!accumulating)}><span><strong>Acumular tiradas</strong><small>{accumulating ? 'Los dados se añaden aquí' : 'Tirar al pulsar un dado'}</small></span><span className="sheet-roll-switch" aria-hidden="true"/></button>
      <div className="sheet-roll-queue-heading"><strong>Preparadas <span aria-live="polite">{rolls.length}/{MAX_PREPARED_ROLLS}</span></strong>{rolls.length > 0 && <button type="button" onClick={onClear}><Trash2 size={12}/>Vaciar</button>}</div>
      {rolls.length ? <ol className="sheet-roll-queue" start={first + 1}>{visibleRolls.map(roll => <li key={roll.id}><span className="sheet-roll-kind">{roll.kind === 'd20' ? 'D20' : 'DAÑO'}</span><span className="sheet-roll-queued-text"><strong title={roll.label}>{roll.label}</strong><small title={roll.notation}>{roll.notation}</small></span><button type="button" aria-label={`Quitar ${roll.label}`} onClick={() => onRemove(roll.id)}><X size={14}/></button></li>)}</ol> : <p className="sheet-roll-empty">Activa «Acumular» y pulsa un dado de la ficha.</p>}
      {pageCount > 1 && <div className="sheet-roll-pages"><button type="button" aria-label="Página anterior de tiradas" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={15}/></button><span>{first + 1}–{Math.min(first + pageSize, rolls.length)} de {rolls.length}</span><button type="button" aria-label="Página siguiente de tiradas" disabled={currentPage === pageCount - 1} onClick={() => setPage(currentPage + 1)}><ChevronRight size={15}/></button></div>}
      {attackWithoutDamage && <p className="sheet-roll-hint">Añade «Daño» de {attackWithoutDamage.label.slice('Ataque con '.length)} si quieres incluirlo.</p>}
      {damageCount > 1 && <label className="sheet-roll-combine"><input type="checkbox" checked={combineDamage} onChange={event => onCombineDamage(event.target.checked)}/><span>Sumar daños</span></label>}
      {combined && <p className="sheet-roll-preview" title={combined.notation}>Daño: {combined.notation}</p>}
      <button type="button" className="sheet-roll-send" disabled={!rolls.length || pending} onClick={onSend}><Dice5 size={16}/>{pending ? 'Esperando…' : rolls.length === 1 ? 'Lanzar tirada' : `Lanzar ${rolls.length} tiradas`}</button>
    </div>}
  </aside>;
}
