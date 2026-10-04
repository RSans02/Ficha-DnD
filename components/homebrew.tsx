'use client';
import { useState } from 'react';
import { BookOpen, Download, Plus, Trash2, Upload } from 'lucide-react';
import type { Catalog } from '@/lib/types';
import { emptyBook, HOME_TYPES, template, type HomeType, type HomebrewBook, validateBooks } from '@/lib/homebrew';
import { Button, downloadText } from './ui';

const labels: Record<HomeType, string> = { races: 'Razas y subrazas', classes: 'Clases y subclases', features: 'Rasgos', spells: 'Hechizos', feats: 'Dotes', backgrounds: 'Trasfondos', equipment: 'Equipo' };
export function HomebrewEditor({ books, official, onSave, onNotify }: { books: HomebrewBook[]; official: Catalog; onSave: (books: HomebrewBook[]) => void; onNotify: (text: string, error?: boolean) => void }) {
  const [bookId, setBookId] = useState(books[0]?.id ?? '');
  const [type, setType] = useState<HomeType>('races');
  const [entryId, setEntryId] = useState('');
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const selected = books.find(book => book.id === bookId);
  const entries = selected?.entries[type] ?? [];
  const selectEntry = (id: string) => { setEntryId(id); setDraft(JSON.stringify(entries.find(item => item.id === id), null, 2)); setError(''); };
  const basic = (() => { try { return JSON.parse(draft) as { name?: string; description?: string }; } catch { return null; } })();
  const setBasic = (key: 'name' | 'description', value: string) => { try { setDraft(JSON.stringify({ ...JSON.parse(draft), [key]: value }, null, 2)); } catch { setError('Corrige el JSON antes de editar los campos básicos.'); } };
  const commit = (next: HomebrewBook[]) => { try { onSave(validateBooks(next, official)); setError(''); return true; } catch (reason) { setError(reason instanceof Error ? reason.message : 'Datos inválidos.'); return false; } };
  const newBook = () => { const name = window.prompt('Nombre del compendio'); if (!name?.trim()) return; const book = emptyBook(name.trim()); if (commit([...books, book])) { setBookId(book.id); setEntryId(''); setDraft(''); } };
  const newEntry = () => { if (!selected) return; const item = template(type); setEntryId(item.id); setDraft(JSON.stringify(item, null, 2)); setError(''); };
  const saveEntry = () => {
    if (!selected) return;
    try {
      const item = JSON.parse(draft) as Catalog[HomeType][number];
      if (!item || typeof item !== 'object' || item.id !== entryId) throw new Error('Conserva el ID de la plantilla.');
      const next = books.map(book => book.id !== selected.id ? book : { ...book, entries: { ...book.entries, [type]: [...(book.entries[type] ?? []).filter(entry => entry.id !== entryId), item] } });
      if (commit(next)) onNotify('Entrada homebrew guardada.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'JSON inválido.'); }
  };
  const removeEntry = () => { if (!selected || !entryId || !window.confirm('¿Eliminar esta entrada del compendio? Los personajes que la usen dejarán de tener una referencia válida.')) return; if (commit(books.map(book => book.id !== selected.id ? book : { ...book, entries: { ...book.entries, [type]: (book.entries[type] ?? []).filter(entry => entry.id !== entryId) } }))) { setEntryId(''); setDraft(''); } };
  const importFile = async (file?: File) => { if (!file) return; try { if (file.size > 5_000_000) throw new Error('El archivo supera 5 MB.'); const incoming = validateBooks(JSON.parse(await file.text()), official); if (books.length && !window.confirm('¿Sustituir tus compendios actuales por los del archivo? Exporta una copia antes si quieres conservarlos.')) return; if (commit(incoming)) { setBookId(incoming[0]?.id ?? ''); setEntryId(''); setDraft(''); onNotify(`${incoming.length} compendio(s) importado(s).`); } } catch (reason) { setError(reason instanceof Error ? reason.message : 'Archivo inválido.'); } };
  return <div className="stack"><div className="page-heading between"><div><span className="eyebrow">TU BIBLIOTECA DE REGLAS</span><h1>Compendios homebrew</h1><p>Crea contenido propio y úsalo en el creador de personajes. Se guarda en este navegador.</p></div><div className="flex wrap"><Button onClick={() => downloadText(JSON.stringify(books, null, 2), 'compendios-homebrew.json')}><Download size={15}/>Exportar</Button><label className="button secondary" style={{ cursor: 'pointer' }}><Upload size={15}/>Importar<input hidden type="file" accept=".json,application/json" onChange={event => { void importFile(event.target.files?.[0]); event.target.value = ''; }}/></label><Button variant="primary" onClick={newBook}><Plus size={15}/>Nuevo compendio</Button></div></div>
    <div className="panel stack"><div className="flex wrap"><select aria-label="Compendio" value={bookId} onChange={event => { setBookId(event.target.value); setEntryId(''); setDraft(''); }}>{books.length ? books.map(book => <option key={book.id} value={book.id}>{book.name}</option>) : <option value="">Crea tu primer compendio</option>}</select><select aria-label="Tipo de contenido" value={type} onChange={event => { setType(event.target.value as HomeType); setEntryId(''); setDraft(''); }}>{HOME_TYPES.map(key => <option key={key} value={key}>{labels[key]}</option>)}</select>{selected && <Button onClick={newEntry}><Plus size={15}/>Nueva entrada</Button>}</div>
      {selected && <div className="flex wrap">{entries.map(entry => <button className={`button ${entry.id === entryId ? 'primary' : 'secondary'}`} key={entry.id} onClick={() => selectEntry(entry.id)}>{entry.name}</button>)}</div>}
      {entryId && <><label className="field"><span>Nombre</span><input value={basic?.name ?? ''} onChange={event => setBasic('name', event.target.value)}/></label><label className="field"><span>Descripción</span><textarea value={basic?.description ?? ''} onChange={event => setBasic('description', event.target.value)}/></label><p className="subtle"><BookOpen size={14}/> Reglas y vínculos avanzados: edita la plantilla JSON. Conserva su ID; vincula rasgos por <code>featureIds</code> y hechizos a clases por <code>availableToClasses</code>. Las subclases van dentro de una clase.</p><textarea aria-label="Datos de la entrada homebrew" spellCheck={false} value={draft} onChange={event => setDraft(event.target.value)} style={{ minHeight: 400, fontFamily: 'monospace', width: '100%' }}/><div className="flex"><Button variant="primary" onClick={saveEntry}>Guardar entrada</Button>{entries.some(entry => entry.id === entryId) && <Button variant="danger" onClick={removeEntry}><Trash2 size={15}/>Eliminar entrada</Button>}</div></>}
      {selected && <Button variant="danger" onClick={() => { if (window.confirm(`¿Eliminar el compendio ${selected.name}?`)) { const next = books.filter(book => book.id !== selected.id); if (commit(next)) { setBookId(next[0]?.id ?? ''); setEntryId(''); setDraft(''); } } }}><Trash2 size={15}/>Eliminar compendio</Button>}
      {error && <div className="error-box" role="alert">{error}</div>}
    </div></div>;
}
