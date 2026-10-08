import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog } from '../lib/catalog';
import { createCharacter, getAllChoices } from '../lib/engine';
import { creationChoiceStep, getCreationIssues } from '../lib/creation-progress';

test('creation progress points to the step where each missing decision can be made', () => {
  const character = createCharacter();
  const initial = getCreationIssues(character, catalog);
  assert(initial.some(issue => issue.step === 0 && issue.id === 'name'));
  assert(initial.some(issue => issue.step === 1 && issue.id === 'race'));
  assert(initial.some(issue => issue.step === 2 && issue.id === 'class'));

  character.name = 'Aventurera';
  character.raceId = catalog.races.find(race => !race.parentId && !catalog.races.some(child => child.parentId === race.id && child.kind === 'subrace'))!.id;
  character.classes = [{ classId: 'class-guerrero', level: 1 }];
  const skillChoice = getAllChoices(character, catalog).find(choice => choice.id === 'skills.class-guerrero')!;
  assert.equal(creationChoiceStep(skillChoice), 4);
  assert(getCreationIssues(character, catalog).some(issue => issue.step === 4 && issue.id === skillChoice.id));

  character.choices[skillChoice.id] = skillChoice.options.slice(0, skillChoice.amount).map(option => typeof option === 'string' ? option : option.id);
  assert(!getCreationIssues(character, catalog).some(issue => issue.id === skillChoice.id));
});

test('spell selections point to Hechizos and other choices to Opciones', () => {
  assert.equal(creationChoiceStep({ id: 'known.class-mago', type: 'spells', name: 'Conjuros conocidos', amount: 1, options: [] }), 6);
  assert.equal(creationChoiceStep({ id: 'racial-option', type: 'choose_cantrip', name: 'Truco de origen', amount: 1, options: [] }), 5);
});
