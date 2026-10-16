import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog } from '../lib/catalog';
import { backgroundDescriptionSections, backgroundDisplayFacts } from '../lib/background-description';

test('Acólito separates its story, starting details and background feature', () => {
  const background = catalog.backgrounds.find(item => item.name === 'Acólito');
  assert(background);
  const result = backgroundDescriptionSections(background);
  assert.match(result.introduction, /^Has pasado tu vida/i);
  assert(result.facts.some(fact => fact.heading === 'Habilidades' && /Perspicacia/.test(fact.text)));
  assert(result.facts.some(fact => fact.heading === 'Equipo inicial' && /15 po/.test(fact.text)));
  assert(result.sections.some(section => section.heading === 'Rasgo del trasfondo' && section.title === 'Refugio de los Fieles'));
});

test('additional guild information does not get folded into starting equipment', () => {
  const background = catalog.backgrounds.find(item => item.name === 'Artesano Gremial');
  assert(background);
  const result = backgroundDescriptionSections(background);
  const equipment = result.facts.find(fact => fact.heading === 'Equipo inicial');
  assert(equipment);
  assert.doesNotMatch(equipment.text, /Ocupaciones de Gremio/);
  assert(result.sections.some(section => section.heading === 'Información adicional' && section.title === 'Ocupaciones de Gremio'));
  assert(result.sections.some(section => section.heading === 'Variante' && section.title === 'Mercader de Gremio'));
});

test('a variant retains its own prose and its parent is available as structured data', () => {
  const background = catalog.backgrounds.find(item => item.name === 'Espía');
  assert(background);
  const result = backgroundDescriptionSections(background);
  assert(background.parentId);
  assert(result.sections.some(section => section.heading === 'Variante' && section.text && !section.text.startsWith('Espía ')));
});

test('variants display inherited skills, including their explicit substitutions', () => {
  for (const variant of catalog.backgrounds.filter(item => item.parentId)) {
    const skills = backgroundDisplayFacts(variant, catalog).find(fact => fact.heading === 'Habilidades');
    assert(skills, variant.name);
    assert(skills.text.length > 0, variant.name);
  }
  const spy = catalog.backgrounds.find(item => item.name === 'Espía');
  const investigator = catalog.backgrounds.find(item => item.name === 'Investigador');
  assert(spy && investigator);
  assert.match(backgroundDisplayFacts(spy, catalog).find(fact => fact.heading === 'Habilidades')!.text, /Engaño, Sigilo/);
  const investigatorSkills = backgroundDisplayFacts(investigator, catalog).find(fact => fact.heading === 'Habilidades')!.text;
  assert.match(investigatorSkills, /Investigación, Perspicacia/);
  assert.doesNotMatch(investigatorSkills, /Atletismo/);
});

test('merchant variant shows its alternate tool or language choice', () => {
  const merchant = catalog.backgrounds.find(item => item.name === 'Mercader de Gremio');
  assert(merchant);
  const tools = backgroundDisplayFacts(merchant, catalog).find(fact => fact.heading === 'Herramientas');
  assert(tools);
  assert.match(tools.text, /navegación o un idioma adicional/);
});

test('alternate source labels still separate skills and a single language', () => {
  const courtier = catalog.backgrounds.find(item => item.name === 'Cortesano');
  const sage = catalog.backgrounds.find(item => item.name === 'Sabio');
  assert(courtier && sage);
  assert(backgroundDescriptionSections(courtier).facts.some(fact => fact.heading === 'Habilidades' && /Persuasión/.test(fact.text)));
  assert(backgroundDescriptionSections(sage).facts.some(fact => fact.heading === 'Idiomas' && /dos de tu elección/.test(fact.text)));
});

test('every background retains readable content', () => {
  for (const background of catalog.backgrounds) {
    const result = backgroundDescriptionSections(background);
    assert(result.introduction || result.facts.length || result.sections.length, background.name);
    for (const section of result.sections.filter(item => item.heading === 'Rasgo del trasfondo')) {
      assert(section.title, background.name);
      assert(section.text, background.name);
    }
  }
});
