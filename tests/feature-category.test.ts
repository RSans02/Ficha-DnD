import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog } from '../lib/catalog';
import { createCharacter, deriveCharacter } from '../lib/engine';
import { featureCategory } from '../lib/feature-category';
import { mergeCatalog, validateBooks, template } from '../lib/homebrew';
import crusades from '../imports/cruzadas-de-los-panteones.json';
import tales from '../imports/tales-and-taverns-omi.json';
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
