import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog } from '../lib/catalog';
import { createCharacter, deriveCharacter, getAllChoices, getPendingChoices } from '../lib/engine';
import { equipmentForPick, resolveStartingEquipment } from '../lib/equipment';
import type { ChoiceOption } from '../lib/types';

const background = (id: string) => catalog.backgrounds.find(row => row.id === `background-${id}`)!;

test('all 31 backgrounds resolve two skills and two tools or languages, retaining the Clan conditional language', () => {
  assert.equal(catalog.backgrounds.length, 31);
  for (const row of catalog.backgrounds) {
    const choices = row.choices ?? [];
    assert.equal(new Set(choices.map(choice => choice.id)).size, choices.length, row.name);
    assert.equal((row.skillProficiencies?.length ?? 0) + choices.filter(choice => choice.type === 'choose_skill').reduce((sum, choice) => sum + choice.amount, 0), 2, row.name);
    assert.equal((row.toolProficiencies?.length ?? 0) + (row.languages?.length ?? 0) + choices.filter(choice => choice.type !== 'choose_skill' && !choice.replacementForLanguage).reduce((sum, choice) => sum + choice.amount, 0), 2, row.name);
    for (const choice of choices.filter(choice => choice.type === 'choose_tool' || choice.type === 'choose_proficiency')) {
      assert.ok(choice.options.length >= choice.amount, row.name);
      assert.ok(choice.options.every(option => typeof option !== 'string' && option.effects?.length), row.name);
    }
  }
  const clan = background('artesano-del-clan');
  assert.deepEqual(clan.languages, ['Enano']);
  assert.equal(clan.choices?.find(choice => choice.type === 'choose_language')?.replacementForLanguage, 'Enano');
});

test('Folk Hero follows 2014, while variants keep their inherited proficiencies', () => {
  const hero = background('heroe-de-pueblo');
  assert.deepEqual(hero.languages, []);
  assert.ok(!hero.choices?.some(choice => choice.type === 'choose_language'));
  assert.deepEqual(hero.toolProficiencies, ['Vehículos terrestres']);
  for (const [variant, parent] of [['espia', 'criminal'], ['pirata', 'marinero'], ['gladiador', 'artista'], ['caballero', 'noble']]) {
    assert.deepEqual(background(variant).skillProficiencies, background(parent).skillProficiencies);
    assert.deepEqual(background(variant).toolProficiencies, background(parent).toolProficiencies);
  }
  assert.deepEqual(background('investigador').skillProficiencies, ['investigation', 'insight']);
});

test('chosen tools and the Guild Merchant language alternative grant their corresponding proficiency only', () => {
  const c = createCharacter();
  c.backgroundId = 'background-artista';
  c.choices['background-artista.choose_tool'] = ['Laúd'];
  let derived = deriveCharacter(c, catalog);
  assert.ok(derived.proficiencies.includes('Laúd'));
  assert.ok(derived.proficiencies.includes('Kit de disfraz'));
  assert.ok(!derived.proficiencies.includes('Flauta'));
  c.backgroundId = 'background-mercader-de-gremio';
  c.choices = { 'background-mercader-de-gremio.choose_proficiency': ['language:Élfico'] };
  derived = deriveCharacter(c, catalog);
  assert.ok(derived.languages.includes('Élfico'));
  assert.ok(!derived.proficiencies.includes('Herramientas de navegación'));
  const hunter = background('cazarrecompensas-urbano').choices!.find(choice => choice.type === 'choose_tool')!;
  assert.equal(hunter.distinctCategories, true);
  assert.deepEqual(new Set((hunter.options as ChoiceOption[]).flatMap(option => option.effects?.map(effect => effect.category))), new Set(['instrument', 'game', 'thieves-tools']));
});

test('every background gear reference and equipment picker resolves, with source pages and no dangling IDs', () => {
  assert.deepEqual(Object.keys(catalog.backgroundEquipment!).sort(), catalog.backgrounds.map(row => row.id).sort());
  for (const [id, definition] of Object.entries(catalog.backgroundEquipment!)) {
    assert.ok(definition.source.page >= 395 && definition.source.page <= 417, id);
    assert.equal(new Set(definition.groups.map(group => group.id)).size, definition.groups.length, id);
    for (const grant of [...definition.fixed, ...definition.groups.flatMap(group => group.options.flatMap(option => option.items))]) {
      assert.ok(Number.isInteger(grant.quantity) && grant.quantity > 0, id);
      assert.ok(grant.equipmentId ? catalog.equipment.some(item => item.id === grant.equipmentId) : grant.name, `${id}: ${grant.equipmentId}`);
    }
    for (const pick of definition.groups.flatMap(group => group.options.flatMap(option => option.picks ?? []))) {
      assert.ok(equipmentForPick(catalog.equipment, pick.category).length > 0, `${id}: ${pick.category}`);
    }
  }
});

test('background preview preserves gems as objects and distinguishes equipment from proficiency', () => {
  for (const suffix of ['artesano-del-clan', 'forastero-errante']) {
    const c = createCharacter(); c.backgroundId = `background-${suffix}`;
    const initial = resolveStartingEquipment(c, catalog);
    assert.equal(initial.coins.po, 5);
    assert.ok(initial.items.some(item => /valor: 10 po/.test(item.name)));
    assert.ok(catalog.backgroundEquipment![c.backgroundId].groups.flatMap(group => group.options.flatMap(option => option.picks ?? [])).every(pick => pick.requiresProficiency === true));
  }
  const c = createCharacter(); c.backgroundId = 'background-criminal';
  assert.ok(deriveCharacter(c, catalog).proficiencies.includes('Herramientas de ladrón'));
  assert.ok(!resolveStartingEquipment(c, catalog).items.some(item => item.equipmentId === 'equipment-herramientas-herramientas-de-ladron'));
});

test('Clan language replacement only appears for an already known language and urban hunter needs two categories', () => {
  const c = createCharacter(); c.backgroundId = 'background-artesano-del-clan';
  assert.ok(!getAllChoices(c, catalog).some(choice => choice.replacementForLanguage));
  c.manual.languages = ['Enano'];
  assert.ok(getAllChoices(c, catalog).some(choice => choice.replacementForLanguage === 'Enano'));
  c.backgroundId = 'background-cazarrecompensas-urbano';
  c.choices['background-cazarrecompensas-urbano.choose_tool'] = ['Laúd', 'Flauta'];
  assert.ok(getPendingChoices(c, catalog).some(choice => choice.id === 'background-cazarrecompensas-urbano.choose_tool'));
  c.choices['background-cazarrecompensas-urbano.choose_tool'] = ['Laúd', 'Set de dados'];
  assert.ok(!getPendingChoices(c, catalog).some(choice => choice.id === 'background-cazarrecompensas-urbano.choose_tool'));
});
