'use client';

import { useState, type FormEvent } from 'react';
import type { Catalog, Spell } from '@/lib/types';
import { template } from '@/lib/homebrew';
import { entryIssues } from '@/lib/homebrew-editor';
import { EntryRules } from './homebrew-fields';
import { Button, Field, Modal } from './ui';

export function CustomSpellDialog({ open, catalog, onClose, onSave }: { open: boolean; catalog: Catalog; onClose: () => void; onSave: (spell: Spell) => Promise<boolean> }) {
  return <Modal open={open} onClose={onClose} title="Crear conjuro" wide>
    {open && <SpellForm catalog={catalog} onClose={onClose} onSave={onSave}/>}
  </Modal>;
}

function SpellForm({ catalog, onClose, onSave }: { catalog: Catalog; onClose: () => void; onSave: (spell: Spell) => Promise<boolean> }) {
  const [spell, setSpell] = useState<Spell>(() => template('spells') as Spell);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const save = async (event: FormEvent) => {
    event.preventDefault();
    const next = { ...spell, name: spell.name.trim(), description: spell.description.trim() };
    const issues = entryIssues(next, 'spells');
    if (issues.length) { setError(issues.join(' ')); return; }
    setSaving(true);
    try {
      if (await onSave(next)) onClose();
      else setError('No se pudo guardar el personaje. Vuelve a intentarlo.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo guardar el conjuro.');
    } finally {
      setSaving(false);
    }
  };
  return <form className="stack" onSubmit={event => void save(event)}>
    <p className="subtle">El conjuro se guardará solo en esta ficha. No aparecerá en «Mis compendios».</p>
    <Field label="Nombre"><input required autoFocus maxLength={120} value={spell.name} placeholder="Por ejemplo: Llama estelar" onChange={event => setSpell({ ...spell, name: event.target.value })}/></Field>
    <Field label="Efecto del conjuro"><textarea required rows={5} maxLength={10000} value={spell.description} placeholder="Describe qué hace y cómo se resuelve…" onChange={event => setSpell({ ...spell, description: event.target.value })}/></Field>
    <EntryRules type="spells" entry={spell} onChange={entry => setSpell(entry as Spell)} catalog={catalog} showSpellAvailability={false}/>
    {error && <div className="error-box" role="alert">{error}</div>}
    <div className="modal-footer"><Button type="button" onClick={onClose} disabled={saving}>Cancelar</Button><Button type="submit" variant="primary" disabled={saving}>{saving ? 'Guardando…' : 'Crear y añadir conjuro'}</Button></div>
  </form>;
}
