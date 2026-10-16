import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog } from '../lib/catalog';
import { spellDescriptionSections, spellEffect } from '../lib/spell-description';

test('the spell effect omits a separately displayed higher-level effect', () => {
  const spell = catalog.spells.find(item => item.name === 'Proyectil Mágico');
  assert(spell);
  const effect = spellEffect(spell);
  assert.match(effect, /tres dardos/i);
  assert.doesNotMatch(effect, /A niveles superiores:/i);
  assert(!effect.includes(spell.higherLevels));
});

test('cantrip scaling has its own character-level section', () => {
  const spell = catalog.spells.find(item => item.name === 'Agarre Electrizante');
  assert(spell);
  const sections = spellDescriptionSections(spell);
  assert.match(sections.effect, /no puede realizar reacciones/i);
  assert.doesNotMatch(sections.effect, /nivel 5/i);
  assert.equal(sections.progressionLabel, 'Progresión por nivel de personaje');
  assert.match(sections.progression, /nivel 5.*nivel 11.*nivel 17/i);
});

test('multi-sentence cantrip progression stays together without hiding other rules', () => {
  const spell = catalog.spells.find(item => item.name === 'Filo Atronador');
  assert(spell);
  const sections = spellDescriptionSections(spell);
  assert.match(sections.progression, /nivel 5.*nivel 11.*nivel 17/i);
  assert.doesNotMatch(sections.effect, /nivel 5/i);

  const rays = catalog.spells.find(item => item.name === 'Descarga Sobrenatural');
  assert(rays);
  assert.match(spellDescriptionSections(rays).effect, /una tirada de ataque individual/i);
});
