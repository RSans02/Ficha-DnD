import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog } from '../lib/catalog';
import { createDemo } from '../lib/demo';
import { checkPrerequisites, createCharacter, deriveCharacter, getAllChoices, getPendingChoices, spellbookMinimum, validSpells, validateCharacter } from '../lib/engine';
import type { Character, ChoiceOption } from '../lib/types';

function realCharacter(classId: string, level = 1): Character {
  const cls = catalog.classes.find(item => item.id === classId)!;
  const c = createCharacter();
  c.name = `Prueba de catálogo: ${cls.name}`;
  c.raceId = 'race-humano';
  c.abilities = { str: 14, dex: 14, con: 14, int: 14, wis: 14, cha: 14 };
  c.classes = [{ classId, level, ...(cls.subclassLevel && cls.subclassLevel <= level ? { subclassId: cls.subclasses[0].id } : {}) }];
  c.hp.rolls = Array.from({ length: level - 1 }, () => ({ classId, value: Math.floor((cls.hitDie ?? 6) / 2) + 1 }));
  // Resolve ordinary choices before expertise, so existing proficiencies are real.
  for (let pass = 0; pass < 2; pass++) {
    const choices = getAllChoices(c, catalog).sort((a, b) => Number(a.type === 'expertise') - Number(b.type === 'expertise'));
    for (const choice of choices) {
      if (choice.type === 'subclass' || c.choices[choice.id]) continue;
      if (choice.type === 'choose_language') { c.choices[choice.id] = ['Dracónico']; continue; }
      if (choice.type === 'asi') { c.choices[choice.id] = ['ability:str', 'ability:con']; continue; }
      let options = choice.options.filter(option => typeof option === 'string' || !checkPrerequisites(option.prerequisites ?? [], c, catalog).length);
      if (choice.type === 'expertise') {
        const trained = Object.entries(deriveCharacter(c, catalog).skills).filter(([, skill]) => skill.breakdown.some(row => /Competencia|Pericia/.test(row.label) && row.value > 0)).map(([id]) => id);
        options = options.filter(option => trained.includes(typeof option === 'string' ? option : option.id));
      }
      c.choices[choice.id] = options.slice(0, choice.amount).map(option => typeof option === 'string' ? option : option.id);
    }
  }
  for (const caster of deriveCharacter(c, catalog).spellcasting) {
    const options = validSpells(c, caster.classId, catalog);
    const cantrips = options.filter(spell => spell.level === 0).slice(0, caster.cantrips ?? 0).map(spell => spell.id);
    const count = caster.knownLimit ?? spellbookMinimum(c, caster.classId, catalog) ?? 0;
    const known = options.filter(spell => spell.level! > 0).slice(0, count).map(spell => spell.id);
    const prepared = caster.preparedLimit ? (spellbookMinimum(c, caster.classId, catalog) !== null ? known : options.filter(spell => spell.level! > 0).map(spell => spell.id)).slice(0, caster.preparedLimit) : [];
    c.spellSelections[caster.classId] = { known: [...cantrips, ...known], prepared };
  }
  c.hp.current = deriveCharacter(c, catalog).hpMax.value;
  return c;
}

for (const cls of catalog.classes) {
  test(`real catalog: ${cls.name} can complete level-one creation with source-valid choices`, () => {
    const c = realCharacter(cls.id);
    assert.deepEqual(validateCharacter(c, catalog), []);
    assert.equal(getPendingChoices(c, catalog).filter(choice => choice.required !== false).length, 0);
    const derived = deriveCharacter(c, catalog);
    assert.equal(derived.level, 1);
    assert.equal(derived.hpMax.value, cls.hitDie! + derived.abilities.con.modifier);
    const automatic = derived.features.filter(feature => !(feature as typeof feature & { selectionOnly?: boolean }).selectionOnly);
    assert(automatic.every(feature => feature.level === null || feature.level <= 1));
  });
}

test('real demo is a valid level-three wizard with its complete spellbook', () => {
  const c = createDemo(catalog);
  assert.deepEqual(validateCharacter(c, catalog), []);
  assert.equal(deriveCharacter(c, catalog).level, 3);
});

test('real catalog: rogue expertise accepts the class-granted thieves tools', () => {
  const c = realCharacter('class-picaro');
  c.choices['choice-picaro-experto-1'] = ['thieves-tools', c.choices['skills.class-picaro'][0]];
  assert.deepEqual(validateCharacter(c, catalog), []);
});

test('real catalog: heavy-armor proficiency is recognized by Spanish feat requirements', () => {
  const c = realCharacter('class-guerrero');
  assert.deepEqual(checkPrerequisites([{ type: 'proficiency', value: 'armadura pesada' }], c, catalog), []);
  assert(deriveCharacter(c, catalog).proficiencies.includes('Armaduras pesadas'));
});

test('real catalog: barbarian fast movement recognizes light armor category', () => {
  const c = realCharacter('class-barbaro', 5);
  const leather = catalog.equipment.find(item => item.id === 'equipment-armaduras-cuero')!;
  c.inventory = [{ id: 'leather', equipmentId: leather.id, name: leather.name, category: 'Armaduras', quantity: 1, weight: leather.weight ?? 0, equipped: true, attuned: false, description: leather.description, notes: '', armorBase: leather.armorClass!, dexCap: leather.dexterityCap ?? undefined }];
  assert.equal(deriveCharacter(c, catalog).speed.value, 40);
});

test('real catalog: monk level two applies its explicit unarmored movement row', () => {
  const c = realCharacter('class-monje', 2);
  assert.equal(deriveCharacter(c, catalog).speed.value, 40);
});

test('real catalog: invocation requirements reject Lifedrinker before warlock twelve', () => {
  const c = realCharacter('class-brujo', 2);
  const choice = getAllChoices(c, catalog).find(item => item.id === 'choice-brujo-invocaciones')!;
  const option = choice.options.find(item => typeof item !== 'string' && item.name === 'Chupavidas') as ChoiceOption;
  assert(option, 'Source invocation Chupavidas must be present');
  const second = choice.options.find(item => typeof item !== 'string' && item.id !== option.id) as ChoiceOption;
  c.choices[choice.id] = [option.id, second.id];
  assert(validateCharacter(c, catalog).some(error => /Chupavidas.*(12|Pacto|pacto)/.test(error)), 'Level and pact requirements from the source must be enforced');
});

test('real catalog: invocation class levels cannot be met with levels in another class', () => {
  const c = realCharacter('class-brujo', 2);
  c.classes.push({ classId: 'class-guerrero', level: 18 });
  const option = catalog.classes.find(cls => cls.id === 'class-brujo')!.choices!.find(choice => choice.id === 'choice-brujo-invocaciones')!.options.find(item => typeof item !== 'string' && item.name === 'Chupavidas') as ChoiceOption;
  assert(checkPrerequisites(option.prerequisites!, c, catalog).some(error => error.includes('12')));
});

test('real catalog: pact and cantrip requirements validate their selected source IDs', () => {
  const c = realCharacter('class-brujo', 12);
  const options = catalog.classes.find(cls => cls.id === 'class-brujo')!.choices!.find(choice => choice.id === 'choice-brujo-invocaciones')!.options as ChoiceOption[];
  const lifedrinker = options.find(option => option.name === 'Chupavidas')!;
  c.choices['choice-brujo-don-de-pacto'] = ['feature-brujo-don-de-pacto-option-pacto-del-tomo'];
  assert(checkPrerequisites(lifedrinker.prerequisites!, c, catalog).some(error => error.includes('pacto-de-la-hoja')));
  c.choices['choice-brujo-don-de-pacto'] = ['feature-brujo-don-de-pacto-option-pacto-de-la-hoja'];
  assert.deepEqual(checkPrerequisites(lifedrinker.prerequisites!, c, catalog), []);
  const agonizing = options.find(option => option.name === 'Descarga Agonizante')!;
  c.spellSelections['class-brujo'].known = c.spellSelections['class-brujo'].known.filter(id => id !== 'spell-descarga-sobrenatural');
  assert(checkPrerequisites(agonizing.prerequisites!, c, catalog).length > 0);
  c.spellSelections['class-brujo'].known.push('spell-descarga-sobrenatural');
  assert.deepEqual(checkPrerequisites(agonizing.prerequisites!, c, catalog), []);
});

test('real catalog: curse requirement needs the spell or explicit source verification', () => {
  const c = realCharacter('class-brujo', 7);
  delete c.choices['verify.feature-brujo-invocaciones-sobrenaturales-de-xanathar-maleficio-implacable'];
  c.spellSelections['class-brujo'].known = c.spellSelections['class-brujo'].known.filter(id => id !== 'spell-mal-de-ojo');
  const choice = catalog.classes.find(cls => cls.id === 'class-brujo')!.choices!.find(item => item.id === 'choice-brujo-invocaciones')!;
  const option = choice.options.find(item => typeof item !== 'string' && item.name === 'Maleficio Implacable') as ChoiceOption;
  assert(checkPrerequisites(option.prerequisites!, c, catalog).length > 0, 'Open-ended prerequisites must not silently pass');
  c.choices['verify.feature-brujo-invocaciones-sobrenaturales-de-xanathar-maleficio-implacable'] = ['confirmed'];
  assert.deepEqual(checkPrerequisites(option.prerequisites!, c, catalog), []);
});

test('2014 source: paladin and ranger begin spellcasting at level two', () => {
  for (const id of ['class-paladin', 'class-explorador']) {
    assert.equal(deriveCharacter(realCharacter(id), catalog).spellcasting.length, 0);
    const next = deriveCharacter(realCharacter(id, 2), catalog);
    assert.equal(next.spellcasting.length, 1);
    assert.deepEqual(next.slots.filter(Boolean), [2]);
  }
});

test('source: every optional Tasha list relation requires its class opt-in', () => {
  for (const cls of catalog.classes.filter(item => item.spellcasting)) {
    const c = realCharacter(cls.id, 20);
    const extra = catalog.spells.filter(spell => (spell as typeof spell & { optionalForClasses?: string[] }).optionalForClasses?.includes(cls.id) && spell.level !== null && spell.level <= deriveCharacter(c, catalog).spellcasting[0].maxSpellLevel);
    const base = validSpells(c, cls.id, catalog);
    assert(extra.every(spell => !base.some(item => item.id === spell.id)));
    c.choices[`optional-spells.${cls.id}`] = ['enabled'];
    const enabled = validSpells(c, cls.id, catalog);
    assert(extra.every(spell => enabled.some(item => item.id === spell.id)));
  }
});

test('real catalog: artificer cannot learn level-fourteen infusion at level two', () => {
  const c = realCharacter('class-artificiero', 2);
  const choice = getAllChoices(c, catalog).find(item => item.id === 'choice-artificiero-infusiones-de-artificiero')!;
  const option = choice.options.find(item => typeof item !== 'string' && item.name === 'Armadura de Propulsión Arcana') as ChoiceOption;
  assert(checkPrerequisites(option.prerequisites!, c, catalog).some(error => error.includes('14')));
});
