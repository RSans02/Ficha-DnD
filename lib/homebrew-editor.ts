import { template, type HomebrewBook, type HomeType } from './homebrew';
import type { Catalog, CharacterClass, Feature, Race, Spell } from './types';

export type HomebrewEntry = Catalog[HomeType][number];
export interface EntryDraft { bookId: string; type: HomeType; entry: HomebrewEntry; features: Feature[]; step: number }
export const editorDraftKey = 'grimorio.homebrew.editor.v1';

export function entryFeatureIds(entry: HomebrewEntry): string[] {
  return [...('featureIds' in entry ? entry.featureIds ?? [] : []), ...('subclasses' in entry ? entry.subclasses.flatMap(sub => sub.featureIds) : [])];
}

/** Save the entry and inline traits together, so references never point to unsaved traits. */
export function applyEntryDraft(books: HomebrewBook[], draft: EntryDraft): HomebrewBook[] {
  const referenced = new Set(entryFeatureIds(draft.entry));
  // Include traits unlocked through a trait's choices as part of the same save.
  for (const id of referenced) {
    const feature = draft.features.find(item => item.id === id);
    if (feature) for (const candidate of draft.features) if (JSON.stringify(feature).includes(`"${candidate.id}"`)) referenced.add(candidate.id);
  }
  const traits = draft.features.filter(feature => referenced.has(feature.id));
  return books.map(book => {
    if (book.id !== draft.bookId) return book;
    const entry = { ...draft.entry, source: { ...draft.entry.source, book: book.name } };
    const entries = { ...book.entries, [draft.type]: [...(book.entries[draft.type] ?? []).filter(item => item.id !== entry.id), entry] };
    if (traits.length) entries.features = [...(entries.features ?? []).filter(item => !traits.some(trait => trait.id === item.id)), ...traits.map(trait => ({ ...trait, source: { ...trait.source, book: book.name } }))];
    return { ...book, entries };
  });
}

/** Copy internal identities too, keeping the original's choices and traits independent. */
export function duplicateEntry(type: HomeType, original: HomebrewEntry, catalog: Catalog): Pick<EntryDraft, 'entry' | 'features'> {
  const ids = new Map<string, string>([[original.id, template(type).id]]);
  const preservedIds = new Set([...catalog.spells, ...catalog.races, ...catalog.classes, ...catalog.feats, ...catalog.backgrounds, ...catalog.equipment].map(item => item.id));
  const traits: Feature[] = [];
  const collect = (item: unknown) => {
    if (!item || typeof item !== 'object') return;
    if (Array.isArray(item)) { item.forEach(collect); return; }
    const record = item as Record<string, unknown>;
    if (typeof record.id === 'string' && !ids.has(record.id) && !preservedIds.has(record.id)) ids.set(record.id, `homebrew-copy-${crypto.randomUUID()}`);
    Object.values(record).forEach(collect);
  };
  collect(original);
  const pending = [...entryFeatureIds(original)];
  const seen = new Set<string>();
  while (pending.length) {
    const id = pending.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const feature = catalog.features.find(item => item.id === id);
    if (!feature) continue;
    traits.push(feature); collect(feature);
    const serialized = JSON.stringify(feature);
    for (const candidate of catalog.features) if (serialized.includes(`"${candidate.id}"`)) pending.push(candidate.id);
  }
  const rewrite = (item: unknown): unknown => {
    if (typeof item === 'string') return ids.get(item) ?? item;
    if (Array.isArray(item)) return item.map(rewrite);
    if (item && typeof item === 'object') return Object.fromEntries(Object.entries(item).map(([key, value]) => [key, rewrite(value)]));
    return item;
  };
  const entry = { ...template(type), ...rewrite(original) as HomebrewEntry } as HomebrewEntry;
  entry.name = `${original.name} (copia)`;
  entry.source = { page: 0, book: 'Homebrew' };
  if (type === 'classes' && (entry as CharacterClass).spellcasting) (entry as CharacterClass).spellListClassId = (original as CharacterClass).spellListClassId ?? original.id;
  return { entry, features: traits.map(trait => ({ choices: [], effects: [], ...rewrite(trait) as Feature, source: entry.source })) };
}

export function entryIssues(entry: HomebrewEntry, type: HomeType, features: Feature[] = []): string[] {
  const errors: string[] = [];
  if (!entry.name.trim()) errors.push('Escribe un nombre para la entrada.');
  const bounded = (value: number | null | undefined, min: number, max: number, label: string, integer = true) => {
    if (value !== null && value !== undefined && (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value)))) errors.push(`${label}: usa un valor entre ${min} y ${max}.`);
  };
  if (type === 'races') {
    const race = entry as Race;
    if (race.kind === 'subrace' && !race.parentId) errors.push('Selecciona la raza a la que pertenece esta subraza.');
    if (race.parentId === race.id) errors.push('Una raza no puede ser su propio origen.');
    bounded(race.speed, 0, 200, 'Velocidad');
    Object.values(race.abilityBonuses).forEach(value => bounded(value, -5, 10, 'Bonificador de característica'));
  }
  if (type === 'classes') {
    const cls = entry as CharacterClass;
    if (cls.skillChoices.amount > cls.skillChoices.options.length) errors.push('Ofrece al menos tantas habilidades como debe elegir el jugador.');
    if (cls.subclasses.length && !cls.subclassLevel) errors.push('Indica en qué nivel se elige la subclase.');
    if (cls.subclassLevel && !cls.subclasses.length) errors.push('Añade una subclase o desactiva la elección de subclase.');
    if (cls.subclasses.some(sub => !sub.name.trim())) errors.push('Pon nombre a todas las subclases.');
    bounded(cls.skillChoices.amount, 0, 18, 'Habilidades a elegir');
    bounded(cls.subclassLevel, 1, 20, 'Nivel de subclase');
    cls.progression.forEach(row => {
      bounded(row.cantrips, 0, 30, `Trucos en nivel ${row.level}`);
      bounded(row.knownSpells, 0, 100, `Hechizos en nivel ${row.level}`);
      row.slots.forEach(value => bounded(value, 0, 20, `Espacios en nivel ${row.level}`));
    });
  }
  const related = features.filter(feature => entryFeatureIds(entry).includes(feature.id));
  if (related.some(feature => !feature.name.trim())) errors.push('Pon nombre a todos los rasgos añadidos.');
  [...related, ...(type === 'features' ? [entry as Feature] : [])].forEach(feature => bounded(feature.level, 1, 20, 'Nivel de rasgo'));
  const effects = [...('effects' in entry ? entry.effects ?? [] : []), ...related.flatMap(feature => feature.effects ?? [])];
  if (effects.some(effect => effect.type === 'grant_spell' && !effect.spellId)) errors.push('Selecciona el hechizo de cada efecto que concede magia.');
  if (effects.some(effect => ['language', 'sense', 'resistance', 'immunity', 'proficiency'].includes(effect.type) && (typeof effect.value !== 'string' || !effect.value.trim()))) errors.push('Completa el valor de los efectos de idioma, sentido, resistencia o competencia.');
  return errors;
}

export function entrySummary(entry: HomebrewEntry, type: HomeType): string {
  if (type === 'races') { const r = entry as Race; return `${r.size ?? 'Tamaño libre'} · ${r.speed ?? 30} pies`; }
  if (type === 'classes') { const cls = entry as CharacterClass; return `d${cls.hitDie} de golpe · ${cls.spellcasting ? 'Con magia' : 'Sin magia'}`; }
  if (type === 'spells') { const spell = entry as Spell; return `${spell.level ? `Nivel ${spell.level}` : 'Truco'} · ${spell.school}`; }
  if (type === 'features') return `Disponible desde nivel ${(entry as Feature).level ?? 1}`;
  return entry.description ? entry.description.slice(0, 100) : 'Lista para personalizar';
}
