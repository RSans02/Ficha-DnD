import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog } from '../lib/catalog';
import { createCharacter, deriveCharacter, validSpells } from '../lib/engine';
import { validateCharacterData } from '../lib/persistence';
import { mergeCatalog, template, validateBooks, type HomebrewBook } from '../lib/homebrew';
import type { Race, Spell } from '../lib/types';

test('homebrew race and spell work in the creator and survive character validation', () => {
  const race = { ...template('races'), name: 'Astral', abilityBonuses: { int: 2 }, languages: ['Común'] } as Race;
  const spell = { ...template('spells'), name: 'Luz astral', availableToClasses: [catalog.classes.find(item => item.name === 'Mago')!.id] } as Spell;
  const book: HomebrewBook = { id: 'book-1', name: 'Mi mundo', entries: { races: [race], spells: [spell] } };
  const merged = mergeCatalog(catalog, validateBooks([book], catalog));
  const character = createCharacter();
  character.raceId = race.id;
  character.classes = [{ classId: spell.availableToClasses[0], level: 1 }];
  character.spellSelections[spell.availableToClasses[0]] = { known: [spell.id], prepared: [] };
  assert.equal(validateCharacterData(character, merged).length, 0);
  assert.equal(deriveCharacter(character, merged).abilities.int.bonus, 2);
  assert(validSpells(character, spell.availableToClasses[0], merged).some(item => item.id === spell.id));
  assert.throws(() => validateBooks([book, book], catalog), /duplicado/);
});
