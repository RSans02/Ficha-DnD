import type { Catalog, Character, Spell } from './types';
import { DEFAULT_BOOK_ID, type HomebrewBook } from './homebrew';

/** A character's own spell definitions take precedence over compendium copies. */
export function catalogForCharacter(character: Character, catalog: Catalog): Catalog {
  const own = character.customSpells ?? [];
  if (!own.length) return catalog;
  const ids = new Set(own.map(spell => spell.id));
  return { ...catalog, spells: [...own, ...catalog.spells.filter(spell => !ids.has(spell.id))] };
}

/** Preserve spells already used by a sheet before changing its source compendium. */
export function retainSheetSpells(character: Character, books: HomebrewBook[]): Character {
  const source = books.find(book => book.id === DEFAULT_BOOK_ID);
  if (!source?.entries.spells?.length) return character;
  const used = new Set([
    ...(character.extraSpells ?? []).map(entry => entry.spellId),
    ...Object.values(character.spellSelections).flatMap(selection => [...selection.known, ...selection.prepared]),
    ...character.favorites.spells,
    ...(character.sheetSpellAttackIds ?? []),
    ...Object.values(character.choices).flat(),
  ]);
  const existing = new Set((character.customSpells ?? []).map(spell => spell.id));
  const copies: Spell[] = source.entries.spells.filter(spell => used.has(spell.id) && !existing.has(spell.id));
  return copies.length ? { ...character, customSpells: [...(character.customSpells ?? []), ...copies.map(spell => structuredClone(spell))] } : character;
}
