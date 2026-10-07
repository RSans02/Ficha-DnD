import type { Catalog, Subclass } from './types';

export const HOMEBREW_KEY = 'grimorio.homebrew.v1';
export const HOME_TYPES = ['races', 'classes', 'features', 'spells', 'feats', 'backgrounds', 'equipment'] as const;
export type HomeType = typeof HOME_TYPES[number];
export type HomebrewSection = HomeType | 'subclasses';
export interface HomebrewBook { id: string; name: string; description?: string; entries: Partial<Pick<Catalog, HomeType>> & { subclasses?: (Subclass & { classId: string })[] } }
export const emptyBook = (name: string): HomebrewBook => ({ id: crypto.randomUUID(), name, entries: {} });
const source = { page: 0, book: 'Homebrew' };
const base = (type: HomeType) => ({ id: `homebrew-${type}-${crypto.randomUUID()}`, name: '', description: '', source });
export function template(type: HomeType): Catalog[HomeType][number] {
  const common = base(type);
  switch (type) {
    case 'races': return { ...common, parentId: null, kind: 'race', version: 'Homebrew', category: 'Homebrew', size: 'Mediano', speed: 30, abilityBonuses: {}, languages: [], senses: [], resistances: [], immunities: [], featureIds: [], choices: [], effects: [] };
    case 'classes': return { ...common, hitDie: 8, primaryAbilities: [], savingThrows: [], armorProficiencies: [], weaponProficiencies: [], toolProficiencies: [], skillChoices: { amount: 0, options: [] }, subclassLevel: null, subclasses: [], featureIds: [], progression: Array.from({ length: 20 }, (_, index) => ({ level: index + 1, proficiencyBonus: 2 + Math.floor(index / 4), featureIds: [], featureNames: [], slots: [], cantrips: null, knownSpells: null, resources: {} })), spellcasting: null };
    case 'features': return { ...common, originId: '', level: 1, choices: [], effects: [] };
    case 'spells': return { ...common, level: 0, school: 'Evocación', castingTime: '1 acción', range: 'Personal', components: 'V, S', duration: 'Instantánea', concentration: false, ritual: false, higherLevels: '', availableToClasses: [] };
    case 'feats': return { ...common, prerequisiteText: '', prerequisites: [], effects: [], choices: [] };
    case 'backgrounds': return { ...common, skillProficiencies: [], toolProficiencies: [], languages: [], choices: [], featureIds: [] };
    case 'equipment': return { ...common, category: 'Equipo', weight: 0, cost: '' };
  }
}
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const validSource = (value: Record<string, unknown>) => value.url === undefined || value.url === '' || (typeof value.url === 'string' && value.url.length <= 2048 && /^https?:\/\/[^\s]+$/i.test(value.url));
const safe = (value: unknown, depth = 0): boolean => {
  if (depth > 20) return false;
  if (Array.isArray(value)) return value.length < 1000 && value.every(item => safe(item, depth + 1));
  if (object(value)) return Object.entries(value).length < 1000 && Object.entries(value).every(([key, item]) => !['__proto__', 'constructor', 'prototype'].includes(key) && safe(item, depth + 1));
  return value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value));
};
export function validateBooks(input: unknown, official: Catalog): HomebrewBook[] {
  if (!Array.isArray(input) || input.length > 100 || !safe(input)) throw new Error('El archivo de compendios no es válido.');
  const ids = new Set<string>([...HOME_TYPES.flatMap(type => official[type].map(item => item.id)), ...official.classes.flatMap(cls => cls.subclasses.map(sub => sub.id))]);
  const bookIds = new Set<string>();
  const books = input as HomebrewBook[];
  for (const book of books) {
    if (!object(book) || typeof book.id !== 'string' || !book.id || bookIds.has(book.id) || typeof book.name !== 'string' || !book.name.trim() || book.name.length > 120 || !object(book.entries)) throw new Error('Hay un compendio sin nombre o con ID duplicado.');
    bookIds.add(book.id);
    if (book.description !== undefined && (typeof book.description !== 'string' || book.description.length > 5000)) throw new Error('La descripción del compendio es demasiado larga.');
    for (const [type, entries] of Object.entries(book.entries)) {
      if (![...HOME_TYPES, 'subclasses'].includes(type as HomeType) || !Array.isArray(entries) || entries.length > 1000) throw new Error(`Categoría inválida: ${type}.`);
      if (type === 'subclasses') {
        for (const sub of entries) {
          if (!object(sub) || typeof sub.id !== 'string' || !sub.id.startsWith('homebrew-') || ids.has(sub.id) || typeof sub.classId !== 'string' || typeof sub.name !== 'string' || !sub.name.trim() || typeof sub.description !== 'string' || !object(sub.source) || typeof sub.source.page !== 'number' || !validSource(sub.source) || !Array.isArray(sub.featureIds) || sub.featureIds.some(id => typeof id !== 'string') || (sub.expandedSpellIds !== undefined && (!Array.isArray(sub.expandedSpellIds) || sub.expandedSpellIds.some(id => typeof id !== 'string')))) throw new Error(`Subclase inválida en ${book.name}.`);
          ids.add(sub.id);
        }
        continue;
      }
      for (const entry of entries) {
        if (!object(entry) || typeof entry.id !== 'string' || !entry.id.startsWith('homebrew-') || ids.has(entry.id) || typeof entry.name !== 'string' || !entry.name.trim() || typeof entry.description !== 'string' || !object(entry.source) || typeof entry.source.page !== 'number' || !validSource(entry.source)) throw new Error(`Entrada inválida o ID duplicado en ${book.name}.`);
        const requiredArrays: Record<HomeType, string[]> = { races: ['languages', 'senses', 'resistances', 'immunities', 'featureIds', 'choices', 'effects'], classes: ['primaryAbilities', 'savingThrows', 'armorProficiencies', 'weaponProficiencies', 'toolProficiencies', 'subclasses', 'featureIds', 'progression'], features: ['choices', 'effects'], spells: ['availableToClasses'], feats: ['prerequisites', 'effects', 'choices'], backgrounds: ['skillProficiencies', 'toolProficiencies', 'languages', 'choices', 'featureIds'], equipment: [] };
        if (requiredArrays[type as HomeType].some(key => !Array.isArray(entry[key]))) throw new Error(`Faltan listas obligatorias en ${entry.name}. Parte de una plantilla nueva.`);
        for (const key of ['languages', 'senses', 'resistances', 'immunities', 'featureIds', 'primaryAbilities', 'savingThrows', 'armorProficiencies', 'weaponProficiencies', 'toolProficiencies', 'skillProficiencies', 'availableToClasses', 'properties']) {
          if (entry[key] !== undefined && (!Array.isArray(entry[key]) || (entry[key] as unknown[]).some(value => typeof value !== 'string'))) throw new Error(`Lista de ${key} inválida en ${entry.name}.`);
        }
        if (entry.choices !== undefined && (!Array.isArray(entry.choices) || entry.choices.some(choice => !object(choice) || typeof choice.id !== 'string' || typeof choice.name !== 'string' || typeof choice.type !== 'string' || !Number.isInteger(choice.amount) || Number(choice.amount) < 1 || !Array.isArray(choice.options)))) throw new Error(`Revisa las elecciones de ${entry.name}.`);
        if (entry.effects !== undefined && (!Array.isArray(entry.effects) || entry.effects.some(effect => !object(effect) || typeof effect.type !== 'string'))) throw new Error(`Revisa los efectos de ${entry.name}.`);
        if (entry.invocationPrerequisites !== undefined && (type !== 'features' || !Array.isArray(entry.invocationPrerequisites) || entry.invocationPrerequisites.some(requirement => !object(requirement) || typeof requirement.type !== 'string'))) throw new Error(`Revisa los requisitos de invocación de ${entry.name}.`);
        if (entry.warlockPact !== undefined && (type !== 'features' || entry.warlockPact !== true || entry.originId !== 'class-brujo' || entry.level !== 3)) throw new Error(`Revisa el pacto de ${entry.name}.`);
        if (type === 'races' && (!object(entry.abilityBonuses) || !['race', 'subrace', 'lineage', 'variant'].includes(String(entry.kind)) || (entry.speed !== null && (typeof entry.speed !== 'number' || entry.speed < 0)))) throw new Error(`Datos raciales inválidos en ${entry.name}.`);
        if (type === 'classes' && (!object(entry.skillChoices) || !Array.isArray((entry.skillChoices as Record<string, unknown>).options) || ![4, 6, 8, 10, 12].includes(Number(entry.hitDie)) || (entry.spellcasting !== null && !object(entry.spellcasting)))) throw new Error(`Datos de clase inválidos en ${entry.name}.`);
        if (type === 'spells' && (typeof entry.level !== 'number' || entry.level < 0 || entry.level > 9 || !Number.isInteger(entry.level) || typeof entry.castingTime !== 'string' || typeof entry.school !== 'string' || typeof entry.concentration !== 'boolean' || typeof entry.ritual !== 'boolean')) throw new Error(`Datos de hechizo inválidos en ${entry.name}.`);
        if (type === 'features' && (typeof entry.originId !== 'string' || (entry.level !== null && (typeof entry.level !== 'number' || entry.level < 1 || entry.level > 20)))) throw new Error(`Datos de rasgo inválidos en ${entry.name}.`);
        ids.add(entry.id);
      }
    }
  }
  const merged = mergeCatalog(official, books);
  for (const book of books) for (const sub of book.entries.subclasses ?? []) {
    if (!merged.classes.some(cls => cls.id === sub.classId)) throw new Error(`Clase desconocida en ${sub.name}.`);
    if (sub.featureIds.some(id => !merged.features.some(feature => feature.id === id))) throw new Error(`Rasgo desconocido en ${sub.name}.`);
    if (sub.expandedSpellIds?.some(id => !merged.spells.some(spell => spell.id === id))) throw new Error(`Hechizo desconocido en ${sub.name}.`);
  }
  for (const book of books) for (const race of book.entries.races ?? []) {
    if (race.parentId && !merged.races.some(parent => parent.id === race.parentId && parent.kind !== 'subrace')) throw new Error(`Raza padre desconocida: ${race.name}.`);
    if ((race.featureIds ?? []).some(id => !merged.features.some(feature => feature.id === id))) throw new Error(`Rasgo desconocido en ${race.name}.`);
  }
  for (const book of books) for (const cls of book.entries.classes ?? []) {
    if (!Array.isArray(cls.progression) || cls.progression.length !== 20 || !cls.progression.every((row, index) => row && row.level === index + 1 && Array.isArray(row.featureIds) && row.featureIds.every(id => typeof id === 'string') && Array.isArray(row.featureNames) && row.featureNames.every(name => typeof name === 'string') && Array.isArray(row.slots) && row.slots.length <= 9 && row.slots.every(value => Number.isInteger(value) && value >= 0 && value <= 20) && object(row.resources))) throw new Error(`La clase ${cls.name} necesita una progresión válida de niveles 1–20.`);
    if (cls.subclasses.some(sub => !sub || typeof sub.id !== 'string' || typeof sub.name !== 'string' || !Array.isArray(sub.featureIds))) throw new Error(`Subclase inválida en ${cls.name}.`);
    for (const sub of cls.subclasses) { if (ids.has(sub.id)) throw new Error(`Identificador de subclase repetido en ${cls.name}.`); ids.add(sub.id); }
    if (cls.spellcasting && (!['str', 'dex', 'con', 'int', 'wis', 'cha'].includes(cls.spellcasting.ability) || !['known', 'prepared', 'spellbook', 'pact'].includes(cls.spellcasting.mode) || !['full', 'half', 'third', 'pact'].includes(cls.spellcasting.progression))) throw new Error(`Configuración de magia inválida en ${cls.name}.`);
    if (cls.spellListClassId && !merged.classes.some(item => item.id === cls.spellListClassId && item.id !== cls.id && !item.spellListClassId)) throw new Error(`La lista de hechizos de referencia de ${cls.name} no está disponible.`);
    if ([...cls.featureIds, ...cls.progression.flatMap(row => row.featureIds), ...cls.subclasses.flatMap(sub => sub.featureIds)].some(id => !merged.features.some(feature => feature.id === id))) throw new Error(`Rasgo desconocido en ${cls.name}.`);
  }
  for (const book of books) for (const bg of book.entries.backgrounds ?? []) if (bg.featureIds?.some(id => !merged.features.some(feature => feature.id === id))) throw new Error(`Rasgo desconocido en ${bg.name}.`);
  for (const book of books) for (const entry of [...book.entries.races ?? [], ...book.entries.features ?? [], ...book.entries.feats ?? []]) for (const effect of entry.effects ?? []) if (effect.type === 'grant_spell' && !merged.spells.some(spell => spell.id === effect.spellId)) throw new Error(`Hechizo concedido desconocido en ${entry.name}.`);
  for (const book of books) for (const spell of book.entries.spells ?? []) if (spell.availableToClasses?.some(id => !merged.classes.some(cls => cls.id === id))) throw new Error(`Clase desconocida en el hechizo ${spell.name}.`);
  return books;
}
export function mergeCatalog(official: Catalog, books: HomebrewBook[]): Catalog {
  const merged: Catalog = { ...official };
  for (const type of HOME_TYPES) (merged[type] as unknown[]) = [...official[type], ...books.flatMap(book => (book.entries[type] ?? []) as unknown[])];
  const extensions = books.flatMap(book => book.entries.subclasses ?? []);
  if (extensions.length) merged.classes = merged.classes.map(cls => ({ ...cls, subclasses: [...cls.subclasses, ...extensions.filter(sub => sub.classId === cls.id)] }));
  const invocations = books.flatMap(book => book.entries.features ?? []).filter(feature => feature.originId === 'class-brujo' && Array.isArray(feature.invocationPrerequisites));
  if (invocations.length) merged.classes = merged.classes.map(cls => cls.id === 'class-brujo' ? { ...cls, choices: cls.choices?.map(choice => choice.id === 'choice-brujo-invocaciones' ? { ...choice, options: [...choice.options, ...invocations.map(feature => ({ id: feature.id, name: feature.name, description: feature.description, effects: [{ type: 'feature', featureId: feature.id }], prerequisites: feature.invocationPrerequisites }))] } : choice) } : cls);
  const warlockPacts = books.flatMap(book => book.entries.features ?? []).filter(feature => feature.warlockPact);
  if (warlockPacts.length) merged.classes = merged.classes.map(cls => cls.id === 'class-brujo' ? { ...cls, choices: cls.choices?.map(choice => choice.id === 'choice-brujo-don-de-pacto' ? { ...choice, options: [...choice.options, ...warlockPacts.map(feature => ({ id: feature.id, name: feature.name, description: feature.description, effects: [{ type: 'feature', featureId: feature.id }] }))] } : choice) } : cls);
  return merged;
}
export function loadBooks(official: Catalog): HomebrewBook[] {
  const text = globalThis.localStorage.getItem(HOMEBREW_KEY);
  return text ? validateBooks(JSON.parse(text), official) : [];
}
export function saveBooks(books: HomebrewBook[], official: Catalog): void {
  validateBooks(books, official);
  globalThis.localStorage.setItem(HOMEBREW_KEY, JSON.stringify(books));
}
