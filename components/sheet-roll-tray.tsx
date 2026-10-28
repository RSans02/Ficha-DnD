import { useState } from 'react';
import { ChevronDown, Dice5, Trash2, X } from 'lucide-react';
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

export function SheetRollTray({ pending, mode, onMode, accumulating, onAccumulating, rolls, combineDamage, onCombineDamage, onRemove, onClear, onSend }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const damageCount = rolls.filter(roll => roll.kind === 'damage').length;
  const combined = combineDamage && damageCount > 1 ? composePreparedRolls(rolls, true).find(entry => entry.label.startsWith('Daño de ')) : null;
  const attackWithoutDamage = rolls.find(roll => roll.kind === 'd20' && roll.label.startsWith('Ataque con ') && !rolls.some(other => other.kind === 'damage' && other.label === `Daño de ${roll.label.slice('Ataque con '.length)}`));

  return <aside className={`sheet-roll-tray no-print${collapsed ? ' is-collapsed' : ''}`} aria-label="Mesa de tiradas de Owlbear">
    <button type="button" className="sheet-roll-tray-heading" aria-expanded={!collapsed} aria-label={`${collapsed ? 'Mostrar' : 'Ocultar'} mesa de tiradas de Owlbear`} onClick={() => setCollapsed(!collapsed)}>
      <Dice5 size={19}/><span className="sheet-roll-tray-title">Tiradas Owlbear</span>
      <span className="sheet-roll-tray-count" aria-live="polite">{rolls.length}</span>
      <ChevronDown size={16} className="sheet-roll-tray-chevron"/>
    </button>
    {!collapsed && <div className="sheet-roll-tray-body">
      <span className="sheet-roll-connection connected">Conectado a Owlbear</span>
      <fieldset className="sheet-roll-mode"><legend>Modo del d20</legend><div role="group" aria-label="Modo del d20">{MODES.map(option => <button key={option.value} type="button" className={mode === option.value ? 'active' : ''} aria-pressed={mode === option.value} onClick={() => onMode(option.value)}>{option.label}</button>)}</div></fieldset>
      <p className="sheet-roll-explainer">Se aplica a pruebas, ataques y salvaciones. La ventaja y desventaja opuestas se cancelan.</p>
      <button type="button" className={`sheet-roll-accumulate${accumulating ? ' active' : ''}`} aria-pressed={accumulating} onClick={() => onAccumulating(!accumulating)}><span><strong>Acumular tiradas</strong><small>{accumulating ? 'Los dados de la ficha se añaden aquí' : 'Los dados de la ficha tiran al momento'}</small></span><span className="sheet-roll-switch" aria-hidden="true"/></button>
      <div className="sheet-roll-queue-heading"><strong>Preparadas <span aria-live="polite">{rolls.length}/{MAX_PREPARED_ROLLS}</span></strong>{rolls.length > 0 && <button type="button" onClick={onClear}><Trash2 size={13}/>Vaciar</button>}</div>
      {rolls.length ? <ol className="sheet-roll-queue">{rolls.map(roll => <li key={roll.id}><span className="sheet-roll-kind">{roll.kind === 'd20' ? 'D20' : 'DAÑO'}</span><span className="sheet-roll-queued-text"><strong>{roll.label}</strong><small>{roll.notation}</small></span><button type="button" aria-label={`Quitar ${roll.label}`} onClick={() => onRemove(roll.id)}><X size={15}/></button></li>)}</ol> : <div className="sheet-roll-empty"><Dice5 size={24}/><strong>Aún no hay tiradas</strong><p>Activa «Acumular» y pulsa los dados de la ficha.</p></div>}
      {attackWithoutDamage && <p className="sheet-roll-explainer">El ataque de {attackWithoutDamage.label.slice('Ataque con '.length)} solo tira el d20. Pulsa también «Daño» en ese ataque para añadir sus dados.</p>}
      <label className="sheet-roll-combine"><input type="checkbox" checked={combineDamage} disabled={damageCount < 2} onChange={event => onCombineDamage(event.target.checked)}/><span>Sumar daños en un resultado</span></label>
      {combined && <p className="sheet-roll-preview">Daño combinado: <strong>{combined.notation}</strong></p>}
      <button type="button" className="sheet-roll-send" disabled={!rolls.length || pending} onClick={onSend}><Dice5 size={17}/>{pending ? 'Esperando resultado…' : `Lanzar ${rolls.length === 1 ? 'tirada' : 'tiradas'} a la vez`}</button>
    </div>}
  </aside>;
}
