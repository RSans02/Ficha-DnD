import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog } from '../lib/catalog';
import { applyRest, checkPrerequisites, createCharacter, deriveCharacter, getAllChoices, validSpells } from '../lib/engine';
import { validateCharacterData } from '../lib/persistence';
import { mergeCatalog, template, validateBooks, withoutFeatureReferences, type HomebrewBook } from '../lib/homebrew';
import type { CharacterClass, Feature, Race, Spell } from '../lib/types';
import { applyEntryDraft, duplicateEntry, entryIssues, type EntryDraft } from '../lib/homebrew-editor';
import crusades from '../imports/cruzadas-de-los-panteones.json';

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

test('homebrew class progression can be selected and calculated at level one', () => {
  const cls = { ...template('classes'), name: 'Guardián', savingThrows: ['str', 'con'] } as CharacterClass;
  const book: HomebrewBook = { id: 'book-class', name: 'Clases propias', entries: { classes: [cls] } };
  const merged = mergeCatalog(catalog, validateBooks([book], catalog));
  const character = createCharacter();
  character.classes = [{ classId: cls.id, level: 1 }];
  assert.equal(validateCharacterData(character, merged).length, 0);
  assert.equal(deriveCharacter(character, merged).level, 1);
});

test('imported subclass extends the official warlock with traits and spell access', () => {
  const books = validateBooks(crusades, catalog);
  const merged = mergeCatalog(catalog, books);
  const warlock = merged.classes.find(cls => cls.id === 'class-brujo')!;
  const subclass = warlock.subclasses.find(sub => sub.id === 'homebrew-subclass-brujo-ente-cautivado')!;
  assert(subclass);
  const character = createCharacter();
  character.classes = [{ classId: warlock.id, level: 10, subclassId: subclass.id }];
  const derived = deriveCharacter(character, merged);
  assert(derived.features.some(feature => feature.name === 'Negación Inagotable'));
  assert(derived.immunities.includes('psíquico'));
  assert(validSpells(character, warlock.id, merged).some(spell => spell.id === 'spell-custodia-contra-la-muerte'));
  assert(getAllChoices(character, merged).some(choice => choice.id === 'homebrew-choice-ente-cautivado-truco'));
});

test('Crusades invocations join the warlock choice and retain their requirements', () => {
  const merged = mergeCatalog(catalog, validateBooks(crusades, catalog));
  const character = createCharacter();
  character.classes = [{ classId: 'class-brujo', level: 3 }];
  const choice = getAllChoices(character, merged).find(item => item.id === 'choice-brujo-invocaciones');
  assert(choice);
  const manto = choice.options.find(option => typeof option !== 'string' && option.name === 'Manto benigno');
  const cadena = choice.options.find(option => typeof option !== 'string' && option.name === 'Cadena de conjuros menores');
  assert(manto && typeof manto !== 'string');
  assert(cadena && typeof cadena !== 'string');
  assert.deepEqual(checkPrerequisites(manto.prerequisites ?? [], character, merged), []);
  assert(checkPrerequisites(cadena.prerequisites ?? [], character, merged).some(issue => issue.includes('Grimorio Profundo')));
  character.choices['choice-brujo-don-de-pacto'] = ['homebrew-feature-brujo-grimorio-profundo'];
  assert.deepEqual(checkPrerequisites(cadena.prerequisites ?? [], character, merged), []);
  character.choices[choice.id] = [manto.id];
  assert(deriveCharacter(character, merged).features.some(feature => feature.id === manto.id));
});

test('Grimorio Profundo is selected with the level-three pact and has long-rest slots', () => {
  const merged = mergeCatalog(catalog, validateBooks(crusades, catalog));
  const character = createCharacter();
  character.classes = [{ classId: 'class-brujo', level: 1 }];
  assert(!getAllChoices(character, merged).some(choice => choice.id === 'choice-brujo-don-de-pacto'));
  assert.deepEqual(deriveCharacter(character, merged).grimoireSlots, []);
  character.classes[0].level = 3;
  const pactChoice = getAllChoices(character, merged).find(choice => choice.id === 'choice-brujo-don-de-pacto');
  assert(pactChoice);
  assert(pactChoice.options.some(option => typeof option !== 'string' && option.name === 'Grimorio Profundo'));
  character.choices[pactChoice.id] = ['homebrew-feature-brujo-grimorio-profundo'];
  assert.deepEqual(deriveCharacter(character, merged).grimoireSlots, [1, 1, 0, 0, 0]);
  character.classes[0].level = 11;
  assert.deepEqual(deriveCharacter(character, merged).grimoireSlots, [1, 1, 1, 1, 2]);
  character.hp.current = 1;
  character.slotsSpent['grimoire.1'] = 1;
  assert.equal(applyRest(character, 'short', merged).slotsSpent['grimoire.1'], 1);
  assert.equal(applyRest(character, 'long', merged).slotsSpent['grimoire.1'], 0);
});

test('inline traits and player choices save atomically and calculate after export/import', () => {
  const race = { ...template('races'), name: 'Aurora' } as Race;
  const feature = { ...template('features'), name: 'Ojos estelares', originId: race.id, effects: [{ type: 'skill_proficiency', skill: 'perception' }], choices: [{ id: 'homebrew-choice-language', name: 'Otro idioma', type: 'choose_language', amount: 1, required: true, options: [] }] } as Feature;
  race.featureIds = [feature.id];
  const draft: EntryDraft = { bookId: 'aurora', type: 'races', entry: race, features: [feature], step: 3 };
  const books = applyEntryDraft([{ id: 'aurora', name: 'Aurora', entries: {} }], draft);
  const reloaded = validateBooks(JSON.parse(JSON.stringify(books)), catalog);
  const combined = mergeCatalog(catalog, reloaded);
  const character = createCharacter();
  character.raceId = race.id;
  character.classes = [{ classId: catalog.classes[0].id, level: 1 }];
  character.choices['homebrew-choice-language'] = ['Celestial'];
  assert.deepEqual(entryIssues(race, 'races', [feature]), []);
  assert.equal(validateCharacterData(character, combined).length, 0);
  assert(getAllChoices(character, combined).some(choice => choice.id === 'homebrew-choice-language'));
  const derived = deriveCharacter(character, combined);
  assert(derived.features.some(item => item.id === feature.id));
  assert(derived.languages.includes('Celestial'));
  assert(derived.skills.perception.breakdown.some(row => row.label === 'Competencia' && row.value === 2));
});

test('copying a race creates independent trait and choice identities', () => {
  const original = catalog.races.find(race => race.featureIds.length && race.choices.length)!;
  const copy = duplicateEntry('races', original, catalog);
  const race = copy.entry as Race;
  assert.notEqual(race.id, original.id);
  assert.notEqual(race.choices[0].id, original.choices[0].id);
  assert(race.featureIds.every(id => copy.features.some(feature => feature.id === id)));
  assert(copy.features.every(feature => !original.featureIds.includes(feature.id)));
  const saved = applyEntryDraft([{ id: 'copy', name: 'Copias', entries: {} }], { ...copy, bookId: 'copy', type: 'races', step: 3 });
  assert.doesNotThrow(() => validateBooks(saved, catalog));
});

test('a class copied from the wizard retains spell access through its selected reference list', () => {
  const wizard = catalog.classes.find(cls => cls.name === 'Mago')!;
  const copy = duplicateEntry('classes', wizard, catalog);
  const cls = copy.entry as CharacterClass;
  assert.equal(cls.spellListClassId, wizard.id);
  assert(cls.subclasses.every(sub => !wizard.subclasses.some(original => original.id === sub.id)));
  const saved = applyEntryDraft([{ id: 'copy', name: 'Copias', entries: {} }], { ...copy, bookId: 'copy', type: 'classes', step: 3 });
  const combined = mergeCatalog(catalog, validateBooks(saved, catalog));
  const character = createCharacter();
  character.classes = [{ classId: cls.id, level: 1 }];
  const officialCharacter = { ...character, classes: [{ classId: wizard.id, level: 1 }] };
  assert.deepEqual(validSpells(character, cls.id, combined).map(spell => spell.id), validSpells(officialCharacter, wizard.id, catalog).map(spell => spell.id));
});

test('editor rejects impossible class choices and unfinished granted spells', () => {
  const cls = { ...template('classes'), name: 'Guardián', skillChoices: { amount: 3, options: ['arcana'] } } as CharacterClass;
  assert(entryIssues(cls, 'classes').some(issue => issue.includes('habilidades')));
  const feature = { ...template('features'), name: 'Magia', effects: [{ type: 'grant_spell', spellId: '' }] } as Feature;
  assert(entryIssues(feature, 'features').some(issue => issue.includes('hechizo')));
  const book = { id: 'bad', name: 'Incompleto', entries: { features: [feature] } };
  assert.throws(() => validateBooks([book], catalog), /Hechizo concedido/);
});

test('source links entered in the editor survive export and reject unsafe protocols', () => {
  const feature = { ...template('features'), name: 'Promesa celestial', source: { page: 12, book: 'Borrador', url: 'https://example.com/rasgo' } } as Feature;
  const saved = applyEntryDraft([{ id: 'source-book', name: 'Panteones', entries: {} }], { bookId: 'source-book', type: 'features', entry: feature, features: [], step: 3 });
  const [book] = validateBooks(JSON.parse(JSON.stringify(saved)), catalog);
  assert.equal(book.entries.features?.[0].source.book, 'Panteones');
  assert.equal(book.entries.features?.[0].source.url, 'https://example.com/rasgo');
  assert(entryIssues({ ...feature, source: { ...feature.source, url: 'javascript:alert(1)' } }, 'features').some(issue => issue.includes('https://')));
  assert.throws(() => validateBooks([{ ...book, entries: { features: [{ ...feature, source: { ...feature.source, url: 'javascript:alert(1)' } }] } }], catalog), /Entrada inválida/);
});

test('deleting a shared homebrew trait clears race references', () => {
  const feature = { ...template('features'), name: 'Don del bosque' } as Feature;
  const race = { ...template('races'), name: 'Habitante del bosque', featureIds: [feature.id] } as Race;
  const book: HomebrewBook = { id: 'book-delete-feature', name: 'Bosque', entries: { features: [feature], races: [race] } };
  const cleaned = withoutFeatureReferences(book, feature.id);
  const withoutFeature = { ...cleaned, entries: { ...cleaned.entries, features: [] } };
  assert.deepEqual(withoutFeature.entries.races?.[0].featureIds, []);
  assert.doesNotThrow(() => validateBooks([withoutFeature], catalog));
});
