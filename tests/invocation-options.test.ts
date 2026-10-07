import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog } from '../lib/catalog';
import { checkPrerequisites, createCharacter, getAllChoices } from '../lib/engine';
import { filterInvocationOptions, invocationLevel, invocationPact, type InvocationFilters } from '../lib/invocation-options';
import { mergeCatalog, validateBooks } from '../lib/homebrew';
import crusades from '../imports/cruzadas-de-los-panteones.json';
import type { ChoiceOption } from '../lib/types';

const warlock = createCharacter();
warlock.classes = [{ classId: 'class-brujo', level: 2 }];
const invocationChoice = getAllChoices(warlock, catalog).find(choice => choice.id === 'choice-brujo-invocaciones');
assert(invocationChoice);
const options = invocationChoice.options.filter((option): option is ChoiceOption => typeof option !== 'string');
const defaults: InvocationFilters = { query: '', status: 'all', pact: 'all', level: null };

test('available invocations appear before locked ones at warlock level 2', () => {
  const shown = filterInvocationOptions(options, [], warlock, catalog, defaults);
  const firstLocked = shown.findIndex(option => checkPrerequisites(option.prerequisites ?? [], warlock, catalog).length > 0);
  assert(firstLocked > 0);
  assert(shown.slice(0, firstLocked).every(option => checkPrerequisites(option.prerequisites ?? [], warlock, catalog).length === 0));
  assert(shown.slice(firstLocked).every(option => checkPrerequisites(option.prerequisites ?? [], warlock, catalog).length > 0));
  assert.equal(shown[0].name, 'Armadura de las Sombras');
});

test('availability, selection, pact, level and text filters work together', () => {
  const available = filterInvocationOptions(options, [], warlock, catalog, { ...defaults, status: 'available' });
  assert(available.length > 0 && available.length < options.length);
  const locked = filterInvocationOptions(options, [], warlock, catalog, { ...defaults, status: 'locked' });
  assert.equal(available.length + locked.length, options.length);

  const selected = options.find(option => option.name === 'Sudario de las Sombras');
  assert(selected);
  assert.deepEqual(filterInvocationOptions(options, [selected.id], warlock, catalog, { ...defaults, status: 'selected' }).map(option => option.id), [selected.id]);

  const tome = filterInvocationOptions(options, [], warlock, catalog, { ...defaults, pact: 'tomo' });
  assert(tome.length > 0 && tome.every(option => invocationPact(option) === 'tomo'));
  const levelFive = filterInvocationOptions(options, [], warlock, catalog, { ...defaults, level: 5 });
  assert(levelFive.length > 0 && levelFive.every(option => invocationLevel(option) === 5));
  const noLevel = filterInvocationOptions(options, [], warlock, catalog, { ...defaults, level: 0 });
  assert(noLevel.length > 0 && noLevel.every(option => invocationLevel(option) === null));
  assert(filterInvocationOptions(options, [], warlock, catalog, { ...defaults, query: 'agonizante' }).some(option => option.name === 'Descarga Agonizante'));
});

test('Manto benigno appears at required level 3 when the pact filter is cleared', () => {
  const merged = mergeCatalog(catalog, validateBooks(crusades, catalog));
  const choice = getAllChoices(warlock, merged).find(item => item.id === 'choice-brujo-invocaciones');
  assert(choice);
  const imported = choice.options.filter((option): option is ChoiceOption => typeof option !== 'string');
  const lockedLevelThree = filterInvocationOptions(imported, [], warlock, merged, { ...defaults, status: 'locked', level: 3 });
  assert(lockedLevelThree.some(option => option.name === 'Manto benigno'));
  const pactOnly = filterInvocationOptions(imported, [], warlock, merged, { ...defaults, status: 'locked', level: 3, pact: 'grimorio-profundo' });
  assert(pactOnly.some(option => option.name === 'Cadena de conjuros menores'));
  assert(!pactOnly.some(option => option.name === 'Manto benigno'));
});
