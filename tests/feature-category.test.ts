import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog } from '../lib/catalog';
import { createCharacter, deriveCharacter, getAllChoices, selectedFeatIds } from '../lib/engine';
import { featureCategory } from '../lib/feature-category';
import { mergeCatalog, validateBooks, template } from '../lib/homebrew';
import crusades from '../imports/cruzadas-de-los-panteones.json';
import tales from '../imports/tales-and-taverns.json';
import type { Feature } from '../lib/types';

test('imported racial and subclass traits use their catalog origin', () => {
  const merged = mergeCatalog(catalog, validateBooks([...crusades, ...tales], catalog));
  const omi = createCharacter();
  omi.raceId = 'homebrew-race-omi';
  omi.classes = [{ classId: 'class-guerrero', level: 1 }];
  const omiFeature = deriveCharacter(omi, merged).features.find(feature => feature.name === 'Agilidad de lo Chiquito');
  assert(omiFeature);
  assert.equal(featureCategory(omiFeature, merged), 'Raciales');

  const warlock = createCharacter();
  warlock.classes = [{ classId: 'class-brujo', level: 1, subclassId: 'homebrew-subclass-brujo-ente-cautivado' }];
  const subclassFeature = deriveCharacter(warlock, merged).features.find(feature => feature.name === 'Dulce Cortejo');
  assert(subclassFeature);
  assert.equal(featureCategory(subclassFeature, merged), 'Subclase');
});

test('official, feat and personal categories remain available', () => {
  const classFeature = catalog.features.find(feature => catalog.classes.some(cls => cls.id === feature.originId));
  assert(classFeature);
  assert.equal(featureCategory(classFeature, catalog), 'Clase');
  const feat = catalog.feats[0];
  assert.equal(featureCategory({ ...template('features'), originId: feat.id } as Feature, catalog), 'Dotes');
  assert.equal(featureCategory({ ...template('features'), originId: 'manual', manualCategory: 'Raciales' } as Feature, catalog), 'Raciales');
  assert.equal(featureCategory({ ...template('features'), originId: 'unknown-origin' } as Feature, catalog), 'Otros');
});

test('Kastaya imports its racial traits and level-one choices', () => {
  const merged = mergeCatalog(catalog, validateBooks(tales, catalog));
  const kastaya = merged.races.find(race => race.id === 'homebrew-race-kastaya');
  assert(kastaya);
  assert.deepEqual(kastaya.abilityBonuses, { dex: 2, cha: 1 });

  const character = createCharacter();
  character.raceId = kastaya.id;
  character.classes = [{ classId: 'class-guerrero', level: 1 }];
  const choices = getAllChoices(character, merged);
  assert.equal(choices.find(choice => choice.id === 'homebrew-choice-kastaya-entorno')?.options.length, 5);
  assert(choices.find(choice => choice.id === 'homebrew-choice-kastaya-truco')?.options.some(option => typeof option !== 'string' && option.id === 'spell-luz'));

  const feat = merged.feats[0];
  character.choices['homebrew-choice-kastaya-dote'] = [feat.id];
  assert(selectedFeatIds(character, merged).includes(feat.id));

  const derived = deriveCharacter(character, merged);
  assert(derived.features.some(feature => feature.name === 'Sonrisa kastaya'));
  assert(derived.senses.includes('Visión en la oscuridad 60 pies'));
  assert(derived.proficiencies.includes('Armas sencillas'));
  assert(derived.proficiencies.includes('Armaduras intermedias'));
});
