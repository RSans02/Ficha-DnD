import type { Catalog, Entity } from './types';
import { HOME_TYPES, type HomebrewBook, type HomebrewSection } from './homebrew';

export interface CompendiumSearchEntry {
  item: Entity;
  compendium?: string;
  kind?: HomebrewSection;
}

const fold = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');

export function compendiumSearchEntries(catalog: Catalog, books: HomebrewBook[]): CompendiumSearchEntry[] {
  const owners = new Map<string, { compendium: string; kind: HomebrewSection }>();
  for (const book of books) {
    for (const kind of HOME_TYPES) for (const item of book.entries[kind] ?? []) owners.set(item.id, { compendium: book.name, kind });
    for (const sub of book.entries.subclasses ?? []) owners.set(sub.id, { compendium: book.name, kind: 'subclasses' });
    for (const cls of book.entries.classes ?? []) for (const sub of cls.subclasses) owners.set(sub.id, { compendium: book.name, kind: 'subclasses' });
  }
  const items: Entity[] = [...catalog.races, ...catalog.classes, ...catalog.classes.flatMap(cls => cls.subclasses), ...catalog.features, ...catalog.feats, ...catalog.spells, ...catalog.backgrounds, ...catalog.equipment];
  return items.map(item => ({ item, ...owners.get(item.id) }));
}

export function searchCompendium(entries: CompendiumSearchEntry[], query: string, limit = 30): CompendiumSearchEntry[] {
  if (!query.trim()) return [];
  return entries.filter(entry => matchesCompendiumEntry(entry, query)).slice(0, limit);
}

export function matchesCompendiumEntry({ item, compendium }: CompendiumSearchEntry, query: string): boolean {
  const terms = fold(query.trim()).split(/\s+/).filter(Boolean);
  const haystack = fold([item.name, item.description, compendium, item.source.book, item.source.title, item.source.url].filter(Boolean).join(' '));
  return terms.every(term => haystack.includes(term));
}
