'use client';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Backpack, BookOpen, Check, CheckCircle2, Copy, Download, Feather, FolderPlus, Pencil, Plus, Save, Search, Sparkles, Swords, Trash2, Upload, Users, WandSparkles } from 'lucide-react';
import type { Catalog, CharacterClass, Feature, Race } from '@/lib/types';
import { emptyBook, HOME_TYPES, mergeCatalog, template, type HomeType, type HomebrewBook, validateBooks } from '@/lib/homebrew';
import { applyEntryDraft, duplicateEntry, editorDraftKey, entryFeatureIds, entryIssues, entrySummary, type EntryDraft, type HomebrewEntry } from '@/lib/homebrew-editor';
import { ChoiceFields, EntryRules, FormSection, NumberField, Toggle, TraitFields, homebrewLabels as labels, homebrewSingular as singular } from './homebrew-fields';
import { Button, Field, Modal, cleanDescription, downloadText } from './ui';
import './homebrew.css';

const icons = { races: Users, classes: Swords, spells: WandSparkles, features: Sparkles, feats: Sparkles, backgrounds: Feather, equipment: Backpack };
const descriptions: Record<HomeType, string> = { races: 'Orígenes, subrazas y linajes con sus propios rasgos.', classes: 'Competencias, magia, progresión y subclases.', spells: 'Magia nueva para las listas de tus personajes.', features: 'Capacidades con efectos y usos que se pueden reutilizar.', feats: 'Opciones para especializar a tus héroes.', backgrounds: 'Historias que aportan idiomas y competencias.', equipment: 'Armas, armaduras y objetos para la aventura.' };
const countBook = (book: HomebrewBook) => HOME_TYPES.reduce((total, key) => total + (book.entries[key]?.length ?? 0), 0);
const draftKey = (bookId: string, type: HomeType) => `${editorDraftKey}.${bookId}.${type}`;
function readDraft(bookId: string, type: HomeType): EntryDraft | null {
  try { const raw = sessionStorage.getItem(draftKey(bookId, type)); if (!raw) return null; const value = JSON.parse(raw) as EntryDraft; return value.bookId === bookId && value.type === type && value.entry?.id && Array.isArray(value.features) ? value : null; } catch { return null; }
}
interface Props { books: HomebrewBook[]; official: Catalog; bookId: string; type: HomeType; onBookIdChange: (id: string) => void; onTypeChange: (type: HomeType) => void; onSave: (books: HomebrewBook[]) => void; onNotify: (text: string, error?: boolean) => void }

export function HomebrewEditor({ books, official, bookId, type, onBookIdChange, onTypeChange, onSave, onNotify }: Props) {
  const [draft, setDraft] = useState<EntryDraft | null>(() => readDraft(bookId, type));
  const [error, setError] = useState('');
  const [storageError, setStorageError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<HomeType | 'all'>('all');
  const [bookForm, setBookForm] = useState<{ id: string; name: string; description: string } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [copyType, setCopyType] = useState<HomeType>(type);
  const [copyQuery, setCopyQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type?: HomeType; name: string } | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [incoming, setIncoming] = useState<HomebrewBook[] | null>(null);
  const [pendingDraft, setPendingDraft] = useState<EntryDraft | null>(null);
  const selected = books.find(book => book.id === bookId);
  const catalog = useMemo(() => mergeCatalog(official, books), [official, books]);
  useEffect(() => {
    try { if (draft) sessionStorage.setItem(draftKey(draft.bookId, draft.type), JSON.stringify(draft)); setStorageError(''); }
    catch { setStorageError('No se pudo conservar el borrador. Guarda la entrada antes de salir.'); }
  }, [draft]);
  useEffect(() => {
    if (!draft) return;
    const warn = (event: BeforeUnloadEvent) => { if (storageError) event.preventDefault(); };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [draft, storageError]);
  const commit = (next: HomebrewBook[]) => {
    try { onSave(validateBooks(next, official)); setError(''); return true; }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudieron guardar los cambios.'); return false; }
  };
  const clearDraft = () => { if (draft) { try { sessionStorage.removeItem(draftKey(draft.bookId, draft.type)); } catch { /* allow explicit close */ } } setDraft(null); setError(''); };
  const openDraft = (next: EntryDraft, replace = false) => {
    const existing = readDraft(next.bookId, next.type);
    if (!replace && existing && existing.entry.id !== next.entry.id) { setPendingDraft(next); setCreateOpen(false); return; }
    // Persist before the sidebar key remounts this editor for a different category.
    try { sessionStorage.setItem(draftKey(next.bookId, next.type), JSON.stringify(next)); } catch { setStorageError('Guarda la entrada antes de salir.'); }
    setDraft(next); setCreateOpen(false); setError(''); onTypeChange(next.type);
  };
  const startEntry = (nextType: HomeType, original?: HomebrewEntry) => {
    if (!selected) return;
    const content = original ? duplicateEntry(nextType, original, catalog) : { entry: template(nextType), features: [] };
    openDraft({ bookId: selected.id, type: nextType, ...content, step: 0 });
  };
  const editEntry = (entry: HomebrewEntry, nextType: HomeType) => {
    if (!selected) return;
    const ids = entryFeatureIds(entry), origins = [entry.id, ...('subclasses' in entry ? entry.subclasses.map(sub => sub.id) : [])];
    openDraft({ bookId: selected.id, type: nextType, entry: structuredClone(entry), features: structuredClone((selected.entries.features ?? []).filter(feature => ids.includes(feature.id) && origins.includes(feature.originId))), step: 0 });
  };
  const updateEntry = (entry: HomebrewEntry) => setDraft(current => current ? { ...current, entry } : null);
  const saveEntry = () => {
    if (!draft) return;
    const issues = entryIssues(draft.entry, draft.type, draft.features);
    if (issues.length) { setError(issues.join('\n')); return; }
    if (commit(applyEntryDraft(books, draft))) { onNotify(`${draft.entry.name} ya está disponible en el creador.`); clearDraft(); }
  };
  const saveBook = () => {
    if (!bookForm) return;
    if (!bookForm.name.trim()) { setError('Pon un nombre a tu compendio.'); return; }
    const book = { ...(books.find(item => item.id === bookForm.id) ?? emptyBook(bookForm.name.trim())), name: bookForm.name.trim(), description: bookForm.description.trim() };
    if (commit([...books.filter(item => item.id !== book.id), book])) { setBookForm(null); onBookIdChange(book.id); }
  };
  const remove = () => {
    if (!deleteTarget || (!deleteTarget.type && confirmation !== 'ELIMINAR')) return;
    const next = deleteTarget.type ? books.map(book => book.id !== selected?.id ? book : { ...book, entries: { ...book.entries, [deleteTarget.type!]: (book.entries[deleteTarget.type!] ?? []).filter(item => item.id !== deleteTarget.id) } }) : books.filter(book => book.id !== deleteTarget.id);
    if (commit(next)) { setDeleteTarget(null); setConfirmation(''); if (!deleteTarget.type) onBookIdChange(''); }
  };
  const importFile = async (file?: File) => {
    if (!file) return;
    try { if (file.size > 5_000_000) throw new Error('El archivo supera 5 MB.'); setIncoming(validateBooks(JSON.parse(await file.text()), official)); setError(''); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo leer el compendio.'); }
  };
  const relatedCatalog = draft ? { ...catalog, features: [...catalog.features.filter(feature => !draft.features.some(item => item.id === feature.id)), ...draft.features] } : catalog;
  const allRows = selected ? HOME_TYPES.flatMap(kind => (selected.entries[kind] ?? []).map(entry => ({ kind, entry }))) : [];
  const rows = allRows.filter(({ kind, entry }) => (filter === 'all' || kind === filter) && `${entry.name} ${entry.description}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')));
  const exportBooks = (items: HomebrewBook[]) => downloadText(JSON.stringify(items, null, 2), `${items.length === 1 ? items[0].name.replace(/[^\p{L}\p{N} -]/gu, '') || 'compendio' : 'mis-compendios'}.json`);

  return <div className="hb-workspace">
    {draft && selected ? <>
      <div className="hb-editor-heading"><div><button className="hb-back" onClick={() => { setDraft(null); setError(''); }}><ArrowLeft size={15}/>Volver a {selected.name}</button><h1>{draft.entry.name || `Nueva entrada de ${singular[draft.type]}`}</h1><p className="subtle">{labels[draft.type]} · {storageError ? 'Borrador sin guardar' : 'Borrador conservado en esta pestaña'}</p></div><span className="badge gold"><Pencil size={12}/>En edición</span></div>
      <nav className="hb-steps" aria-label="Pasos del editor">{['Identidad', 'Reglas', 'Rasgos y opciones', 'Revisión'].map((name, index) => <button key={name} aria-current={draft.step === index ? 'step' : undefined} onClick={() => setDraft({ ...draft, step: index })}><span>{index < draft.step ? <Check size={14}/> : index + 1}</span>{name}</button>)}</nav>
      <div className="hb-editor-layout"><div className="hb-editor-body">
        {draft.step === 0 && <FormSection title="Dale identidad" hint="Explica qué es y cómo se usa en tu mundo."><Field label="Nombre"><input autoFocus maxLength={120} value={draft.entry.name} placeholder={draft.type === 'races' ? 'Por ejemplo: Hijos de la aurora' : draft.type === 'spells' ? 'Por ejemplo: Llama estelar' : 'Nombre de tu creación'} onChange={event => updateEntry({ ...draft.entry, name: event.target.value })}/></Field><Field label={draft.type === 'spells' ? 'Efecto del hechizo' : 'Descripción'} hint="Escribe el texto que verá el jugador al consultar esta entrada."><textarea className="hb-description" value={draft.entry.description} placeholder="Cuenta su historia y describe sus reglas…" onChange={event => updateEntry({ ...draft.entry, description: event.target.value })}/></Field><div className="hb-tip"><BookOpen size={19}/><p>La descripción se muestra en el compendio. En los siguientes pasos podrás indicar qué cambia automáticamente en la ficha.</p></div></FormSection>}
        {draft.step === 1 && <EntryRules key={draft.entry.id} type={draft.type} entry={draft.entry} onChange={updateEntry} catalog={relatedCatalog}/>}
        {draft.step === 2 && <EntryExtras draft={draft} catalog={relatedCatalog} onEntry={updateEntry} onFeatures={features => setDraft(current => current ? { ...current, features } : null)}/>}
        {draft.step === 3 && <FormSection title="Lista para tu mesa" hint="Comprueba los datos antes de incorporar la entrada al compendio."><EntryPreview entry={draft.entry} type={draft.type} catalog={relatedCatalog} full/><div className="hb-tip"><CheckCircle2 size={20}/><p>Al guardar, estará disponible en el creador y en las fichas de este navegador. Puedes volver a editarla desde este compendio.</p></div>{entryIssues(draft.entry, draft.type, draft.features).length > 0 && <div className="error-box"><ul>{entryIssues(draft.entry, draft.type, draft.features).map(issue => <li key={issue}>{issue}</li>)}</ul></div>}</FormSection>}
        {(error || storageError) && <div className="error-box" role="alert" style={{ whiteSpace: 'pre-line' }}>{error || storageError}</div>}
        <div className="hb-editor-footer"><Button onClick={() => draft.step === 0 ? setDraft(null) : setDraft({ ...draft, step: draft.step - 1 })}><ArrowLeft size={15}/>{draft.step === 0 ? 'Volver al compendio' : 'Anterior'}</Button>{draft.step < 3 ? <Button variant="primary" onClick={() => { if (!draft.entry.name.trim()) { setError('Escribe un nombre antes de continuar.'); return; } setError(''); setDraft({ ...draft, step: draft.step + 1 }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Continuar<ArrowRight size={15}/></Button> : <Button variant="primary" onClick={saveEntry}><Save size={15}/>Guardar en el compendio</Button>}</div>
      </div><aside className="hb-preview"><span className="eyebrow">VISTA PREVIA</span><EntryPreview entry={draft.entry} type={draft.type} catalog={relatedCatalog}/><p className="subtle">Los efectos de las descripciones que dependan de la situación se resuelven durante la partida.</p></aside></div>
    </> : <>
      <header className="hb-header"><div>{selected ? <button className="hb-back" onClick={() => onBookIdChange('')}><ArrowLeft size={15}/>Todos mis compendios</button> : <span className="eyebrow">EL TALLER DEL CREADOR</span>}<h1>{selected?.name ?? 'Mis compendios'}</h1><p>{selected?.description || (selected ? 'Tu contenido, listo para formar parte de la próxima aventura.' : 'Un lugar para las reglas, los mundos y las ideas de tu mesa.')}</p></div><div className="flex wrap">{selected ? <><Button onClick={() => setBookForm({ id: selected.id, name: selected.name, description: selected.description ?? '' })}><Pencil size={15}/>Editar compendio</Button><Button variant="primary" onClick={() => setCreateOpen(true)}><Plus size={16}/>Añadir contenido</Button></> : <><label className="button secondary hb-import"><Upload size={15}/>Importar compendio<input hidden type="file" accept=".json,application/json" onChange={event => { void importFile(event.target.files?.[0]); event.target.value = ''; }}/></label><Button variant="primary" onClick={() => { setError(''); setBookForm({ id: '', name: '', description: '' }); }}><FolderPlus size={16}/>Nuevo compendio</Button></>}</div></header>
      {!selected ? <>{books.length ? <div className="hb-books">{books.map(book => <article className="hb-book" key={book.id}><div className="hb-book-icon"><BookOpen size={28}/></div><span className="eyebrow">COMPENDIO PERSONAL</span><h2>{book.name}</h2><p>{book.description || 'Las nuevas reglas de tu mesa comienzan aquí.'}</p><div className="hb-tags">{HOME_TYPES.filter(kind => book.entries[kind]?.length).map(kind => <span className="badge" key={kind}>{book.entries[kind]!.length} {labels[kind].toLowerCase()}</span>)}</div><button className="hb-book-open" onClick={() => onBookIdChange(book.id)}>Abrir compendio <span>{countBook(book)} entradas <ArrowRight size={15}/></span></button></article>)}</div> : <div className="hb-welcome"><div className="hb-book-icon"><BookOpen size={36}/></div><h2>Tu mundo necesita su propio libro</h2><p>Reúne razas, hechizos y clases en un compendio. Después podrás elegirlos al crear un personaje.</p><Button variant="primary" onClick={() => setBookForm({ id: '', name: '', description: '' })}><Plus size={16}/>Crear mi primer compendio</Button><div className="hb-welcome-steps"><span><b>1</b> Ponle un nombre</span><span><b>2</b> Añade tus ideas</span><span><b>3</b> Úsalas en tu personaje</span></div></div>}{!!books.length && <div className="hb-library-note"><span>Se guardan en este navegador. Exporta una copia para compartirlos.</span><Button variant="ghost" onClick={() => exportBooks(books)}><Download size={14}/>Exportar todos</Button></div>}</> : <>
        <DraftResume bookId={selected.id} onResume={openDraft}/>
        <div className="hb-library-tools"><div className="search-field"><Search size={16}/><input aria-label="Buscar en el compendio" placeholder="Buscar entre tus creaciones…" value={query} onChange={event => setQuery(event.target.value)}/></div><span className="subtle">{allRows.length} entradas</span><Button variant="ghost" onClick={() => exportBooks([selected])}><Download size={15}/>Exportar</Button></div>
        <div className="hb-filters"><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Todo <span>{allRows.length}</span></button>{HOME_TYPES.map(kind => { const Icon = icons[kind]; return <button key={kind} className={filter === kind ? 'active' : ''} onClick={() => setFilter(kind)}><Icon size={14}/>{labels[kind]}<span>{selected.entries[kind]?.length ?? 0}</span></button>; })}</div>
        {rows.length ? <div className="hb-entries">{rows.map(({ kind, entry }) => { const Icon = icons[kind]; return <article className="hb-entry" key={entry.id}><div className="hb-entry-icon"><Icon size={20}/></div><div className="hb-entry-copy"><span className="eyebrow">{singular[kind]}</span><button className="hb-entry-name" onClick={() => editEntry(entry, kind)}>{entry.name}</button><p>{entrySummary(entry, kind)}</p></div><div className="hb-entry-actions"><Button className="compact" onClick={() => editEntry(entry, kind)}><Pencil size={13}/>Editar</Button><button className="icon-button" aria-label={`Duplicar ${entry.name}`} onClick={() => startEntry(kind, entry)}><Copy size={15}/></button><button className="icon-button" aria-label={`Eliminar ${entry.name}`} onClick={() => { setDeleteTarget({ id: entry.id, type: kind, name: entry.name }); setError(''); }}><Trash2 size={15}/></button></div></article>; })}</div> : <div className="hb-empty"><Sparkles size={26}/><h2>{allRows.length ? 'No hay coincidencias' : 'El primer capítulo está por escribir'}</h2><p>{allRows.length ? 'Prueba con otro nombre o tipo de contenido.' : 'Empieza por una raza, un hechizo o cualquier idea que quieras llevar a tu mesa.'}</p><Button onClick={() => setCreateOpen(true)}><Plus size={15}/>Añadir contenido</Button></div>}
        <div className="hb-library-note"><span><CheckCircle2 size={14}/> Disponible en el creador de personajes</span><Button variant="ghost" onClick={() => { setDeleteTarget({ id: selected.id, name: selected.name }); setConfirmation(''); setError(''); }}>Eliminar compendio</Button></div>
      </>}{error && <div className="error-box" role="alert">{error}</div>}
    </>}
    <Modal open={!!bookForm} onClose={() => { setBookForm(null); setError(''); }} title={bookForm?.id ? 'Editar compendio' : 'Un nuevo compendio'} description="Agrupa el contenido de una campaña, un mundo o una colección de ideas.">{bookForm && <div className="stack"><Field label="Nombre del compendio"><input autoFocus maxLength={120} placeholder="Por ejemplo: Crónicas de la Costa de Ceniza" value={bookForm.name} onChange={event => setBookForm({ ...bookForm, name: event.target.value })}/></Field><Field label="Descripción (opcional)"><textarea placeholder="Qué encontrarán los jugadores en este libro…" value={bookForm.description} onChange={event => setBookForm({ ...bookForm, description: event.target.value })}/></Field>{error && <div className="error-box" role="alert">{error}</div>}<div className="modal-footer"><Button onClick={() => setBookForm(null)}>Cancelar</Button><Button variant="primary" onClick={saveBook}>{bookForm.id ? 'Guardar cambios' : 'Crear compendio'}<ArrowRight size={15}/></Button></div></div>}</Modal>
    <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="¿Qué vas a crear?" description="Empieza desde cero o toma una entrada existente como referencia." wide><div className="hb-type-grid">{HOME_TYPES.map(kind => { const Icon = icons[kind]; return <button key={kind} onClick={() => startEntry(kind)}><Icon size={23}/><strong>{labels[kind]}</strong><span>{descriptions[kind]}</span><small>Crear {singular[kind]} <ArrowRight size={12}/></small></button>; })}</div><details className="hb-reference-copy"><summary>Partir de una entrada existente</summary><div className="hb-fields"><Field label="Tipo de referencia"><select value={copyType} onChange={event => { setCopyType(event.target.value as HomeType); setCopyQuery(''); }}>{HOME_TYPES.map(kind => <option value={kind} key={kind}>{labels[kind]}</option>)}</select></Field><Field label="Buscar referencia"><input value={copyQuery} placeholder="Escribe un nombre…" onChange={event => setCopyQuery(event.target.value)}/></Field></div>{copyQuery.trim() && <div className="hb-copy-results">{catalog[copyType].filter(item => item.name.toLocaleLowerCase('es').includes(copyQuery.toLocaleLowerCase('es'))).slice(0, 8).map(item => <button key={item.id} onClick={() => startEntry(copyType, item)}><span>{item.name}</span><Copy size={14}/></button>)}</div>}<p className="subtle">Crearás una copia independiente que podrás adaptar a tu mesa.</p></details></Modal>
    <Modal open={!!deleteTarget} onClose={() => { setDeleteTarget(null); setError(''); }} title={deleteTarget?.type ? 'Eliminar entrada' : 'Eliminar compendio'}><div className="stack"><p>Vas a eliminar <strong>{deleteTarget?.name}</strong>{deleteTarget?.type ? '.' : ' y todas sus entradas.'}</p>{!deleteTarget?.type && <Field label="Escribe ELIMINAR para confirmar"><input value={confirmation} onChange={event => setConfirmation(event.target.value)}/></Field>}{error && <div className="error-box" role="alert">{error}</div>}<div className="modal-footer"><Button onClick={() => setDeleteTarget(null)}>Cancelar</Button><Button variant="danger" disabled={!deleteTarget?.type && confirmation !== 'ELIMINAR'} onClick={remove}>Eliminar</Button></div></div></Modal>
    <Modal open={!!incoming} onClose={() => setIncoming(null)} title="Importar compendios"><div className="stack">{incoming?.map(book => <p key={book.id}><strong>{book.name}</strong> · {countBook(book)} entradas{books.some(item => item.id === book.id) ? ' · Actualizará la copia existente' : ' · Nuevo compendio'}</p>)}<p className="subtle">Los demás compendios se conservan. Las referencias se comprueban antes de guardar.</p>{error && <div className="error-box" role="alert">{error}</div>}<div className="modal-footer"><Button onClick={() => setIncoming(null)}>Cancelar</Button><Button variant="primary" onClick={() => { if (incoming && commit([...books.filter(book => !incoming.some(item => item.id === book.id)), ...incoming])) { setIncoming(null); onNotify('Compendios importados.'); } }}>Importar</Button></div></div></Modal>
    <Modal open={!!pendingDraft} onClose={() => setPendingDraft(null)} title="Ya tienes una edición pendiente"><p>Hay un borrador de este tipo de contenido. Puedes retomarlo o sustituirlo por la nueva edición.</p><div className="modal-footer"><Button onClick={() => { if (pendingDraft) { const previous = readDraft(pendingDraft.bookId, pendingDraft.type); if (previous) openDraft(previous, true); } setPendingDraft(null); }}>Retomar borrador</Button><Button variant="danger" onClick={() => { if (pendingDraft) openDraft(pendingDraft, true); setPendingDraft(null); }}>Sustituir borrador</Button></div></Modal>
  </div>;
}

function DraftResume({ bookId, onResume }: { bookId: string; onResume: (draft: EntryDraft) => void }) {
  const [removed, setRemoved] = useState<string[]>([]);
  const drafts = HOME_TYPES.map(type => readDraft(bookId, type)).filter((item): item is EntryDraft => !!item && !removed.includes(item.entry.id));
  return <>{drafts.map(draft => <div className="hb-resume" key={draft.entry.id}><Pencil size={18}/><div><strong>{draft.entry.name || `Nueva entrada de ${singular[draft.type]}`}</strong><p>Borrador · Paso {draft.step + 1} de 4</p></div><Button className="compact" onClick={() => onResume(draft)}>Continuar</Button><button className="icon-button" aria-label={`Descartar borrador ${draft.entry.name}`} onClick={() => { sessionStorage.removeItem(draftKey(bookId, draft.type)); setRemoved([...removed, draft.entry.id]); }}><Trash2 size={15}/></button></div>)}</>;
}

function EntryExtras({ draft, catalog, onEntry, onFeatures }: { draft: EntryDraft; catalog: Catalog; onEntry: (entry: HomebrewEntry) => void; onFeatures: (features: Feature[]) => void }) {
  const entry = draft.entry;
  const choiceEditor = !['spells', 'equipment'].includes(draft.type) ? <FormSection title="Decisiones del jugador" hint="Estas preguntas aparecerán durante la creación del personaje."><ChoiceFields choices={'choices' in entry ? entry.choices ?? [] : []} onChange={choices => onEntry({ ...entry, choices } as HomebrewEntry)}/></FormSection> : null;
  const traits = (ownerId: string, ids: string[], onChange: (ids: string[]) => void) => <TraitFields ownerId={ownerId} ids={ids} pending={draft.features} onPending={onFeatures} onChange={onChange} catalog={catalog}/>;
  if ('featureIds' in entry) return <><FormSection title="Rasgos de esta entrada" hint="Escríbelos aquí y se guardarán junto con tu creación.">{traits(entry.id, entry.featureIds ?? [], featureIds => onEntry({ ...entry, featureIds }))}</FormSection>{choiceEditor}{draft.type === 'classes' && <FormSection title="Subclases" hint="Cada subclase puede tener sus propios rasgos y niveles de adquisición."><Toggle checked={!!(entry as CharacterClass).subclassLevel} onChange={enabled => onEntry({ ...entry as CharacterClass, subclassLevel: enabled ? 3 : null })}>Esta clase elige una subclase</Toggle>{!!(entry as CharacterClass).subclassLevel && <NumberField label="Nivel de elección" value={(entry as CharacterClass).subclassLevel} min={1} max={20} onChange={subclassLevel => onEntry({ ...entry as CharacterClass, subclassLevel })}/>} {(entry as CharacterClass).subclasses.map((sub, index) => <details className="hb-trait" key={sub.id} open><summary>{sub.name || 'Nueva subclase'}</summary><div className="stack"><Field label="Nombre de subclase"><input value={sub.name} onChange={event => onEntry({ ...entry as CharacterClass, subclasses: (entry as CharacterClass).subclasses.map((item, i) => i === index ? { ...item, name: event.target.value } : item) })}/></Field><Field label="Descripción de subclase"><textarea value={sub.description} onChange={event => onEntry({ ...entry as CharacterClass, subclasses: (entry as CharacterClass).subclasses.map((item, i) => i === index ? { ...item, description: event.target.value } : item) })}/></Field>{traits(sub.id, sub.featureIds, featureIds => onEntry({ ...entry as CharacterClass, subclasses: (entry as CharacterClass).subclasses.map((item, i) => i === index ? { ...item, featureIds } : item) }))}<Button onClick={() => onEntry({ ...entry as CharacterClass, subclasses: (entry as CharacterClass).subclasses.filter(item => item.id !== sub.id) })}>Quitar subclase</Button></div></details>)}<Button onClick={() => onEntry({ ...entry as CharacterClass, subclassLevel: (entry as CharacterClass).subclassLevel ?? 3, subclasses: [...(entry as CharacterClass).subclasses, { id: `homebrew-subclass-${crypto.randomUUID()}`, name: '', description: '', source: entry.source, featureIds: [] }] })}><Plus size={15}/>Añadir subclase</Button></FormSection>}</>;
  return choiceEditor ?? <FormSection title="El contenido está preparado" hint="Esta entrada ya tiene sus reglas en el paso anterior."><EntryPreview entry={entry} type={draft.type} catalog={catalog} full/><p className="subtle">Puedes revisar el texto y los efectos antes de guardar.</p></FormSection>;
}

function EntryPreview({ entry, type, catalog, full = false }: { entry: HomebrewEntry; type: HomeType; catalog: Catalog; full?: boolean }) {
  const features = entryFeatureIds(entry).map(id => catalog.features.find(item => item.id === id)).filter((item): item is Feature => !!item);
  return <div className="hb-entry-preview"><span className="badge">{singular[type]}</span><h2>{entry.name || 'Tu nueva creación'}</h2><p className="hb-preview-meta">{entrySummary(entry, type)}</p><p className="source-prose">{full ? entry.description || 'Sin descripción.' : cleanDescription(entry.description || 'La descripción de tu entrada aparecerá aquí.', 240)}</p>{type === 'races' && <div className="hb-tags">{Object.entries((entry as Race).abilityBonuses).filter(([, value]) => value).map(([key, value]) => <span className="badge" key={key}>{key.toUpperCase()} {Number(value) > 0 ? '+' : ''}{value}</span>)}</div>}{features.length > 0 && <div className="hb-preview-traits"><h4>Rasgos concedidos</h4>{features.map(feature => <div key={feature.id}><strong>{feature.name || 'Rasgo sin nombre'}</strong><small>Nivel {feature.level ?? 1}{feature.effects?.length ? ` · ${feature.effects.length} efectos` : ''}</small>{full && <p>{feature.description}</p>}</div>)}</div>}{'availableToClasses' in entry && <div className="hb-tags">{entry.availableToClasses.map(id => <span className="badge" key={id}>{catalog.classes.find(cls => cls.id === id)?.name ?? 'Clase desconocida'}</span>)}</div>}</div>;
}


