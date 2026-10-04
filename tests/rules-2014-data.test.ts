import test from 'node:test';
import assert from 'node:assert/strict';
import rawClasses from '../data/rules/classes.json';
import type { CharacterClass } from '../lib/types';
const classes = rawClasses as unknown as CharacterClass[];
import spells from '../data/rules/spells.json';
import races from '../data/rules/races.json';
import equipment from '../data/rules/equipment.json';

// Published 2014/SRD 5.1 table, independent of the importer's implementation.
const fullSlots = [
  [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2],
  [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1],
];

test('all five full casters match every level of the 2014 slot table', () => {
  const casters = classes.filter(cls => cls.spellcasting?.progression === 'full');
  assert.equal(casters.length, 5);
  for (const cls of casters) {
    assert.deepEqual(cls.progression.map(row => row.slots.filter(Boolean)), fullSlots, cls.name);
    assert((cls.automationNotes??[]).some(note => note.includes('SRD 5.1')));
  }
});

test('2014 keeps paladin/ranger spellcasting at two and artificer at one', () => {
  for (const id of ['class-paladin', 'class-explorador']) {
    const cls = classes.find(c => c.id === id)!;
    assert.deepEqual(cls.progression[0].slots.filter(Boolean), []);
    assert.deepEqual(cls.progression[1].slots.filter(Boolean), [2]);
    assert.deepEqual(cls.progression[8].slots.filter(Boolean), [4, 3, 2]);
  }
  assert.deepEqual(classes.find(c => c.id === 'class-artificiero')!.progression[0].slots.filter(Boolean), [2]);
});

test('2014 subclass timing and Eldritch Knight cantrips are preserved', () => {
  const levels = { brujo: 1, clerigo: 1, hechicero: 1, druida: 2, mago: 2, paladin: 3, explorador: 3 };
  for (const [id, level] of Object.entries(levels)) assert.equal(classes.find(c => c.id === `class-${id}`)!.subclassLevel, level);
  const knight = classes.find(c => c.id === 'class-guerrero')!.subclasses.find(s => s.name === 'Caballero Arcano')!;
  assert.equal(knight.progression![8].cantrips, 2);
  assert.equal(knight.progression![9].cantrips, 3);
});

test('2014 druid weapon proficiency includes sickle and excludes rapier', () => {
  const druid = classes.find(c => c.id === 'class-druida')!;
  assert(druid.weaponProficiencies.includes('sickle'));
  assert(!druid.weaponProficiencies.includes('rapier'));
});

test('legacy water genasi grants Wisdom while Multiverse remains an explicit ability choice', () => {
  assert.deepEqual(races.find(r => r.id === 'race-genasi-del-agua')!.abilityBonuses, { wis: 1 });
  assert.deepEqual(races.find(r => r.id === 'race-agua')!.abilityBonuses, {});
});

test('2014 sources resolve both contradictory spell levels without erasing PDF evidence', () => {
  const snow = spells.find(s => s.id === 'spell-tormenta-de-bolas-de-nieve-de-snilloc')!;
  const wind = spells.find(s => s.id === 'spell-libertad-de-los-vientos')!;
  assert.equal(snow.level, 2); assert.equal(snow.printedLevel, 3); assert.equal(snow.sectionLevel, 2);
  assert.equal(wind.level, 5); assert.equal(wind.printedLevel, 3); assert.equal(wind.sectionLevel, 5);
  assert.equal(spells.filter(s => s.level === null).length, 0);
});

test('five corrected spell schools match SRD 5.1', () => {
  for (const [id, school] of Object.entries({ guia: 'Adivinación', 'toque-helado': 'Nigromancia', 'truco-de-la-cuerda': 'Transmutación', 'zona-de-la-verdad': 'Encantamiento', 'curar-heridas-en-masa': 'Evocación' })) {
    const spell = spells.find(s => s.id === `spell-${id}`)!;
    assert.equal(spell.school, school);
    assert(spell.automationNotes.some(note => note.includes('SRD 5.1')));
  }
});

test('catalog retains 2014 spell behavior and pre-revision supplement sources', () => {
  assert.deepEqual([...new Set(spells.map(s => s.sourceBook))].sort(), ['Dunamancia', 'Fizban', 'Manual del Jugador', 'Tal’Dorei', 'Tasha', 'Xanathar'].sort());
  assert.match(spells.find(s => s.id === 'spell-curar-heridas')!.description, /igual a 1d8/);
  assert.match(spells.find(s => s.id === 'spell-palabra-curativa')!.description, /iguales a 1d4/);
  assert.match(spells.find(s => s.id === 'spell-conjurar-animales')!.description, /Ocho bestias/);
  assert.equal(spells.find(s => s.id === 'spell-toque-helado')!.range, '120 pies');
});

test('the two-person tent has its 2014 weight rather than silently counting as weightless', () => {
  const tent = equipment.find(item => item.id === 'equipment-equipo-tienda-de-campana-para-dos-personas')!;
  assert.equal(tent.weight, 20);
  assert(tent.automationNotes?.some(note => note.includes('SRD 5.1')));
});
