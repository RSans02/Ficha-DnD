'use client';

import { useState } from 'react';
import { ArrowRight, Check, ChevronDown } from 'lucide-react';
import type { Catalog, Character } from '@/lib/types';
import { applyLevelUp, deriveCharacter, getLevelUpChoices, levelUpCurrentHp, planLevelUp, summarizeLevelUp } from '@/lib/engine';
import { getLevelUpIssues } from '@/lib/level-up-progress';
import { ChoicesEditor, SpellPicker } from './wizard';
import { Button, Field, Modal, SourceTag, sign } from './ui';
import './wizard-progress.css';
import './level-up.css';

const STEPS = ['Clase', 'PG y elecciones', 'Conjuros', 'Confirmación'];

export function LevelUp({ character: original, catalog, onClose, onApply }: { character: Character; catalog: Catalog; onClose: () => void; onApply: (character: Character) => void }) {
  const [target, setTarget] = useState(original.classes[0]?.classId ?? '');
  const [stage, setStage] = useState(0);
  const [furthestStage, setFurthestStage] = useState(0);
  const [draft, setDraft] = useState<Character | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const old = deriveCharacter(original, catalog);
  const next = draft ? deriveCharacter(draft, catalog) : null;
  const cls = catalog.classes.find(entry => entry.id === target);
  const issues = getLevelUpIssues(original, draft, target, catalog);
  const showIssues = (index: number) => index === 0 || index < furthestStage || stage === 3;
  const issueCounts = STEPS.map((_, index) => showIssues(index) ? issues.filter(issue => issue.step === index).length : 0);
  const currentIssues = showIssues(stage) ? issues.filter(issue => issue.step === stage) : [];

  const goToStage = (index: number) => {
    if (index > 0 && !draft) {
      const plan = planLevelUp(original, target, catalog);
      if (plan.errors.length) { setErrors(plan.errors); return; }
      setDraft(plan.next);
    }
    setFurthestStage(previous => Math.max(previous, index));
    setStage(index);
    setErrors([]);
  };

  const confirm = () => {
    if (!draft) return;
    try { onApply(applyLevelUp(original, draft, catalog)); }
    catch (error) { setErrors(error instanceof Error ? error.message.split('\n') : ['No se pudo completar la subida.']); }
  };

  return <Modal open onClose={onClose} title={`Resumen de nivel ${old.level} → ${old.level + 1}`} description="Cada avance se calcula a partir de la progresión del manual. Los cambios se aplican al confirmar." wide className="level-up-modal">
    <div className="level-up-steps">
      <div className="wizard-progress" aria-label={`Paso ${stage + 1} de 4`}>{STEPS.map((_, index) => <span key={index} className={`${index <= stage ? 'done' : ''}${issueCounts[index] ? ' pending' : ''}`} />)}</div>
      <nav className="wizard-steps level-up-stage-buttons" aria-label="Pasos de la subida de nivel">{STEPS.map((name, index) => <button key={name} type="button" className={`${index === stage ? 'active' : ''}${issueCounts[index] ? ' has-pending' : ''}`} aria-current={index === stage ? 'step' : undefined} aria-label={`${name}${issueCounts[index] ? `, ${issueCounts[index]} ${issueCounts[index] === 1 ? 'decisión pendiente' : 'decisiones pendientes'}` : ''}`} onClick={() => goToStage(index)}>{index < stage && !issueCounts[index] && <i><Check size={11} /></i>}{index + 1}. {name}{issueCounts[index] > 0 && <span className="wizard-step-count" aria-hidden="true">{issueCounts[index]}</span>}</button>)}</nav>
    </div>

    <div className="level-up-scroll" key={stage}>
      {stage === 0 && <div className="stack">
        <Field label="Clase en la que avanzas"><select value={target} onChange={event => { setTarget(event.target.value); setDraft(null); setFurthestStage(0); setErrors([]); }}>
          {original.classes.map(entry => <option key={entry.classId} value={entry.classId}>{catalog.classes.find(item => item.id === entry.classId)?.name} · {entry.level} → {entry.level + 1}</option>)}
          <optgroup label="Añadir clase (multiclase)">{catalog.classes.filter(entry => !original.classes.some(item => item.classId === entry.id)).map(entry => <option key={entry.id} value={entry.id}>{entry.name} · nivel 1</option>)}</optgroup>
        </select></Field>
        <div className="info-box">La multiclase es opcional y requiere acuerdo con el DM. Se comprobarán los requisitos de la clase actual y de la nueva clase según las páginas 450–452.</div>
      </div>}

      {stage === 1 && draft && <div className="stack">
        {currentIssues.length > 0 && <div className="level-up-issue-list"><strong>Por resolver</strong><ul>{currentIssues.map(issue => <li key={issue.id}>{issue.text}</li>)}</ul></div>}
        <Field label={`PG ganados: tirada de d${cls?.hitDie} antes de Constitución`} hint={`Introduce el resultado de tus dados o el valor fijo indicado por tu clase. Constitución (${sign(next!.abilities.con.modifier)}) se aplica automáticamente. Los PG ganados se sumarán al máximo y a los actuales.`}><input type="number" min={1} max={cls?.hitDie ?? 20} className={currentIssues.some(issue => issue.id === 'hp') ? 'wizard-input-pending' : undefined} aria-invalid={currentIssues.some(issue => issue.id === 'hp')} value={draft.hp.rolls.at(-1)?.value || ''} onChange={event => setDraft({ ...draft, hp: { ...draft.hp, rolls: draft.hp.rolls.map((roll, index) => index === draft.hp.rolls.length - 1 ? { ...roll, value: Number(event.target.value) } : roll) } })} /></Field>
        <ChoicesEditor character={draft} catalog={catalog} onChange={setDraft} choices={getLevelUpChoices(original, draft, catalog).filter(choice => choice.type === 'subclass' ? !original.classes.find(entry => entry.classId === choice.classId)?.subclassId : !original.choices[choice.id] || choice.amount > (original.choices[choice.id]?.length || 0))} pendingIds={new Set(currentIssues.map(issue => issue.id))} />
      </div>}

      {stage === 2 && draft && <div className="stack">
        {currentIssues.length > 0 && <div className="level-up-issue-list"><strong>Por resolver</strong><ul>{currentIssues.map(issue => <li key={issue.id}>{issue.text}</li>)}</ul></div>}
        <SpellPicker character={draft} catalog={catalog} onChange={setDraft} scrollList={false} />
      </div>}

      {stage === 3 && draft && next && <div className="stack">
        {issues.length > 0 && <div className="wizard-pending-summary" aria-label="Decisiones pendientes"><strong>Por resolver · {issues.length}</strong><div>{STEPS.map((name, index) => issueCounts[index] > 0 ? <button key={name} type="button" onClick={() => goToStage(index)}>{name} <span>{issueCounts[index]}</span></button> : null)}</div></div>}
        <div className="grid-3"><div className="panel"><span className="subtle">Puntos de golpe máximos</span><h2 style={{ marginTop: 10 }}>{old.hpMax.value} → {next.hpMax.value}</h2><p className="subtle" style={{ marginTop: 8 }}>PG actuales: {original.hp.current} → {levelUpCurrentHp(original, draft, catalog)}</p></div><div className="panel"><span className="subtle">Competencia</span><h2 style={{ marginTop: 10 }}>{sign(old.proficiency.value)} → {sign(next.proficiency.value)}</h2></div><div className="panel"><span className="subtle">Clase</span><h3 style={{ marginTop: 10 }}>{cls?.name} {draft.classes.find(entry => entry.classId === target)?.level}</h3></div></div>
        <div className="panel"><h3>Lo que cambia</h3>{summarizeLevelUp(original, draft, catalog).map((change, index) => <p className="subtle flex" style={{ marginTop: 12 }} key={index}><Check size={14} />{change}</p>)}{next.features.filter(feature => !old.features.some(previous => previous.id === feature.id)).map(feature => <details key={feature.id} className="detail-card" style={{ marginTop: 12 }}><summary><strong>{feature.name}</strong><ChevronDown size={16} /></summary><div className="detail-body"><SourceTag source={feature.source} /><p className="source-prose">{feature.description}</p></div></details>)}</div>
        <p className="subtle">Las decisiones quedan registradas en el historial. Podrás deshacer la subida y restaurar la instantánea anterior.</p>
      </div>}

      {errors.length > 0 && <div className="error-box" role="alert" style={{ marginTop: 18 }}>{errors.map((error, index) => <p key={index}>{error}</p>)}</div>}
    </div>

    <div className="modal-footer"><Button onClick={() => stage === 0 ? onClose() : goToStage(stage - 1)}>{stage === 0 ? 'Cancelar' : 'Anterior'}</Button><Button variant="primary" onClick={() => stage === 3 ? confirm() : goToStage(stage + 1)}>{stage === 3 ? 'Confirmar subida de nivel' : 'Continuar'}<ArrowRight size={15} /></Button></div>
  </Modal>;
}
