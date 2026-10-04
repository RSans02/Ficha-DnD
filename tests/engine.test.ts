import test from 'node:test';
import assert from 'node:assert/strict';
import { ABILITIES, MULTICLASS_SLOTS } from '../lib/constants';
import { applyDamage, applyHealing, applyLevelUp, applyRest, checkPrerequisites, createCharacter, deriveAttack, deriveCharacter, getAllChoices, getFixedClassCantrips, getGrantedSpells, getPendingChoices, isAttackSpell, longRestHitDiceRecovery, planLevelUp, restPreview, selectedFeatIds, spellbookMinimum, spendHitDie, summarizeLevelUp, undoLevelUp, validSpells, validateCharacter } from '../lib/engine';

test('attack spell detection excludes spells that only modify another attack', () => {
  const named=(name:string)=>rawSpells.find(spell=>spell.name===name) as unknown as Spell;
  assert.equal(isAttackSpell(named('Descarga de Fuego')),true);
  assert.equal(isAttackSpell(named('Impacto Certero')),false);
});
import rawClasses from '../data/rules/classes.json';
import rawFeatures from '../data/rules/class-features.json';
import rawSpells from '../data/rules/spells.json';
import { exportJSON, importJSON, LocalCharacterRepository, LocalDraftRepository, normalizeEquipmentLabels, validateCharacterData } from '../lib/persistence';
import type { Catalog, Character, CharacterClass, Feature, Race, Spell } from '../lib/types';

const source = { page: 1 };
const race: Race = { id: 'race-fixture', name: 'Raza de prueba', description: 'Datos controlados para pruebas, no contenido del juego.', source, parentId: null, kind: 'race', version: 'Prueba', category: 'Prueba', size: 'Mediano', speed: 30, abilityBonuses: { dex: 2 }, languages: ['Común'], senses: [], resistances: [], immunities: [], featureIds: [], choices: [], effects: [] };
const classFixture = (id: string, name: string, changes: Partial<CharacterClass> = {}): CharacterClass => ({ id, name, description: '', source, hitDie: 10, primaryAbilities: ['str'], savingThrows: ['str', 'con'], armorProficiencies: ['Armaduras ligeras', 'Armaduras medias'], weaponProficiencies: ['Armas marciales'], toolProficiencies: [], skillChoices: { amount: 1, options: ['athletics', 'perception'] }, subclassLevel: null, subclasses: [], featureIds: [], progression: Array.from({ length: 20 }, (_, i) => ({ level: i + 1, proficiencyBonus: 2 + Math.floor(i / 4), featureIds: [], featureNames: i === 3 ? ['Mejora de Características'] : [], slots: [], cantrips: null, knownSpells: null, resources: {} })), spellcasting: null, ...changes });
const spell = (id: string, level: number, classes = ['class-mago']): Spell => ({ id, name: id, description: '', source, level, school: 'Evocación', castingTime: '1 acción', range: '60 pies', components: 'V', duration: 'Instantánea', concentration: false, ritual: false, higherLevels: '', availableToClasses: classes });
const wizard = classFixture('class-mago', 'Mago', { hitDie: 6, savingThrows: ['int', 'wis'], skillChoices: { amount: 0, options: [] }, armorProficiencies: [], weaponProficiencies: [], spellcasting: { ability: 'int', mode: 'spellbook', progression: 'full', recovery: 'long', preparedFormula: 'level+ability' }, multiclassRequirements: [{ ability: 'int', minimum: 13 }] });
wizard.progression = wizard.progression.map(row => ({ ...row, cantrips: 1, slots: [...MULTICLASS_SLOTS[row.level]] }));
const ranger = classFixture('class-explorador', 'Explorador', { hitDie: 10, savingThrows: ['str', 'dex'], skillChoices: { amount: 0, options: [] }, spellcasting: { ability: 'wis', mode: 'known', progression: 'half', recovery: 'long' } });
ranger.progression = ranger.progression.map(row => ({ ...row, slots: row.level > 1 ? [...MULTICLASS_SLOTS[Math.ceil(row.level / 2)]] : [], knownSpells: row.level > 1 ? 2 : null }));
const fighter = classFixture('class-guerrero', 'Guerrero', { multiclassRequirements: [{ ability: 'str', minimum: 13 }, { ability: 'dex', minimum: 13 }] });
const catalog: Catalog = { races: [race], classes: [fighter, wizard, ranger], features: [], feats: [{ id: 'feat-vigoroso', name: 'Vigoroso', description: '', source, prerequisiteText: '', prerequisites: [], effects: [{ type: 'hp_per_level', value: 2 }], choices: [] }], spells: [spell('spark', 0), ...Array.from({ length: 20 }, (_, i) => spell(`level1-${i}`, 1)), spell('level2', 2), spell('level3', 3), spell('ranger-level1', 1, ['class-explorador'])], backgrounds: [], equipment: [] };

function character(classId = 'class-guerrero', level = 1): Character {
  const c = createCharacter(); c.name = 'Prueba'; c.raceId = race.id; c.classes = [{ classId, level }]; c.abilities = { str: 14, dex: 14, con: 14, int: 16, wis: 14, cha: 10 }; c.choices[`skills.${classId}`] = ['athletics'];
  c.hp.rolls = Array.from({ length: level - 1 }, () => ({ classId, value: 4 })); c.hp.current = 10; return c;
}
function caster(level = 1) {
  const c = character('class-mago', level); delete c.choices['skills.class-mago'];
  c.spellSelections['class-mago'] = { known: ['spark', ...Array.from({ length: 6 + (level - 1) * 2 }, (_, i) => `level1-${i}`)], prepared: ['level1-0'] }; return c;
}

test('Bribón Arcano gains Mano de Mago as a fixed cantrip and only chooses two others at level 3', () => {
  const rogue=rawClasses.find(cls=>cls.id==='class-picaro') as unknown as CharacterClass;
  const mageHand=rawSpells.find(s=>s.id==='spell-mano-de-mago') as unknown as Spell;
  const fixture={...catalog,classes:[rogue],features:rawFeatures as unknown as Feature[],spells:[mageHand,spell('trick-one',0),spell('trick-two',0)]};
  const c=character('class-picaro',3);c.classes[0].subclassId='subclass-picaro-bribon-arcano';c.choices['skills.class-picaro']=[];
  assert.deepEqual(getFixedClassCantrips(c,'class-picaro',fixture).map(s=>s.id),['spell-mano-de-mago']);
  assert.ok(getGrantedSpells(c,fixture).some(s=>s.id==='spell-mano-de-mago'));
  c.spellSelections['class-picaro']={known:['trick-one','trick-two'],prepared:[]};
  assert.equal(getPendingChoices(c,fixture).some(ch=>ch.id==='cantrips.class-picaro'),false);
});

test('expertise does not create a background proficiency replacement, while a real overlap names its sources', () => {
  const rogue = classFixture('class-picaro', 'Pícaro', { skillChoices: { amount: 1, options: ['stealth'] }, choices: [{ id: 'expert', type: 'expertise', name: 'Experto (nivel 1)', amount: 1, required: true, options: [{ id: 'stealth', name: 'Sigilo', effects: [{ type: 'skill_expertise', skill: 'stealth' }] }] }] });
  const spy = { id: 'background-spy', name: 'Espía', description: '', source, skillProficiencies: ['stealth'], toolProficiencies: [], choices: [] };
  const fixture = { ...catalog, classes: [...catalog.classes, rogue], backgrounds: [spy] };
  const c = character('class-picaro'); c.backgroundId = spy.id; c.choices['skills.class-picaro'] = []; c.choices.expert = ['stealth'];
  assert.equal(getAllChoices(c, fixture).some(ch => ch.id === 'replacement.background.skill.stealth'), false);
  assert.equal(deriveCharacter(c, fixture).skills.stealth.breakdown.find(row => row.label === 'Pericia')?.value, 4);
  c.choices['skills.class-picaro'] = ['stealth'];
  assert.match(getAllChoices(c, fixture).find(ch => ch.id === 'replacement.background.skill.stealth')!.name, /Pícaro y Espía otorgan Sigilo/);
});

test('CON changes retroactively recalculate every level; feat effects and trace remain separate', () => {
  const c = character('class-guerrero', 3); c.featIds = ['feat-vigoroso'];
  const before = deriveCharacter(c, catalog); assert.equal(before.hpMax.value, 30);
  c.abilities.con = 18; const after = deriveCharacter(c, catalog); assert.equal(after.hpMax.value, 36);
  assert.equal(after.hpMax.breakdown.reduce((sum, b) => sum + b.value, 0), 36);
  c.manualOverrides.hpMax = 55; const overridden = deriveCharacter(c, catalog).hpMax;
  assert.equal(overridden.value, 55); assert.equal(overridden.mode, 'override'); assert.equal(overridden.breakdown.reduce((sum, b) => sum + b.value, 0), 55);
});

test('racial and class proficiency is not double counted; expertise doubles only proficiency', () => {
  const c = character('class-guerrero', 5); c.skillRanks.athletics = 2; c.skillBonuses.athletics = 1;
  const d = deriveCharacter(c, catalog); assert.equal(d.proficiency.value, 3); assert.equal(d.skills.athletics.value, 2 + 6 + 1);
  c.skillRanks.athletics = 1; assert.equal(deriveCharacter(c, catalog).skills.athletics.value, 2 + 3 + 1);
  assert.equal(d.abilities.dex.total, 16); assert.equal(d.initiative.value, 3);
});

test('multiclass uses total-level proficiency, first-class saves and rolled HP in new classes', () => {
  const c = character('class-guerrero', 3); c.classes.push({ classId: 'class-mago', level: 2 }); c.hp.rolls.push({ classId: 'class-mago', value: 3 }, { classId: 'class-mago', value: 4 });
  const d = deriveCharacter(c, catalog); assert.equal(d.level, 5); assert.equal(d.proficiency.value, 3);
  assert.equal(d.hpMax.value, 10 + 4 + 4 + 3 + 4 + 2 * 5);
  assert.equal(d.saves.str.value, 5); assert.equal(d.saves.int.value, 3); assert.equal(d.saves.wis.value, 2);
  assert.deepEqual(d.slots, MULTICLASS_SLOTS[2]);
});

test('multiclass shared slots do not unlock higher-level spells for a lower-level class', () => {
  const c = caster(3); c.classes.push({ classId: 'class-explorador', level: 4 });
  const d = deriveCharacter(c, catalog); assert.deepEqual(d.slots, MULTICLASS_SLOTS[5]);
  assert.equal(d.spellcasting.find(s => s.classId === 'class-explorador')!.maxSpellLevel, 1);
  assert(!validSpells(c, 'class-mago', catalog).some(s => s.level === 3));
});

test('artificer half-level rounded up is included in shared slots', () => {
  const artificer = classFixture('class-artificiero', 'Artificiero', { skillChoices: { amount: 0, options: [] }, spellcasting: { ability: 'int', mode: 'prepared', progression: 'half', recovery: 'long', preparedFormula: 'halfLevel+ability' } });
  artificer.progression = artificer.progression.map(row => ({ ...row, slots: [...MULTICLASS_SLOTS[Math.ceil(row.level / 2)]] }));
  const cat = { ...catalog, classes: [...catalog.classes, artificer] }, c = caster(1); c.classes.push({ classId: artificer.id, level: 3 });
  assert.deepEqual(deriveCharacter(c, cat).slots, MULTICLASS_SLOTS[3]);
});

test('pact slots stay separate and recover on their own explicit rest rule', () => {
  const warlock = classFixture('class-brujo', 'Brujo', { skillChoices: { amount: 0, options: [] }, spellcasting: { ability: 'cha', mode: 'pact', progression: 'pact', recovery: 'short' } });
  warlock.progression[2].slots = [0, 2];
  const cat = { ...catalog, classes: [...catalog.classes, warlock] }, c = caster(1); c.classes.push({ classId: warlock.id, level: 3 }); c.slotsSpent = { '1': 2, 'pact.class-brujo': 1 };
  const d = deriveCharacter(c, cat); assert.deepEqual(d.slots, [2]); assert.deepEqual(d.pactSlots, [{ classId: warlock.id, level: 2, max: 2 }]);
  const rested = applyRest(c, 'short', cat); assert.equal(rested.slotsSpent['1'], 2); assert.equal(rested.slotsSpent['pact.class-brujo'], 0);
});

test('spell validation rejects class, level, count, duplicate and unowned prepared selections', () => {
  const c = caster(); assert.deepEqual(validateCharacter(c, catalog), []);
  c.spellSelections['class-mago'].prepared = ['level2']; assert(validateCharacter(c, catalog).some(e => e.includes('no disponible'))); assert(validateCharacter(c, catalog).some(e => e.includes('presentes en tu libro')));
  c.spellSelections['class-mago'] = { known: ['spark', 'spark', 'ranger-level1'], prepared: [] };
  const errors = validateCharacter(c, catalog); assert(errors.some(e => e.includes('repetir'))); assert(errors.some(e => e.includes('no disponible'))); assert(errors.some(e => e.includes('libro')));
  c.spellSelections['class-guerrero'] = { known: ['spark'], prepared: [] }; assert(validateCharacter(c, catalog).some(e => e.includes('no dispone')));
});

test('wizard books enforce their minimum while permitting copied additional spells', () => {
  const c = caster(2); assert.equal(spellbookMinimum(c, 'class-mago', catalog), 8);
  c.spellSelections['class-mago'].known.pop(); assert(getPendingChoices(c, catalog).some(ch => ch.id === 'book.class-mago' && ch.amount === 8));
  c.spellSelections['class-mago'].known.push('level1-7', 'level1-8'); assert(!getPendingChoices(c, catalog).some(ch => ch.id === 'book.class-mago'));
});

test('optional class list additions are excluded until explicit consent', () => {
  const cat = structuredClone(catalog); Object.assign(cat.spells.find(s => s.id === 'level1-0')!, { optionalForClasses: ['class-mago'] });
  const c = caster(); assert(!validSpells(c, 'class-mago', cat).some(s => s.id === 'level1-0'));
  c.choices['optional-spells.class-mago'] = ['enabled']; assert(validSpells(c, 'class-mago', cat).some(s => s.id === 'level1-0'));
});

test('racial grants, free-language choice and feat choice apply independently of class quotas', () => {
  const cat = structuredClone(catalog); cat.races[0].choices = [
    { id: 'origin.feat', name: 'Dote', type: 'choose_feat', amount: 1, options: [] },
    { id: 'origin.cantrip', name: 'Truco', type: 'choose_cantrip', amount: 1, classId: 'class-mago', options: [] },
    { id: 'origin.language', name: 'Idioma', type: 'choose_language', amount: 1, options: [] },
  ];
  cat.races[0].effects = [{ type: 'grant_spell', spellId: 'level2', level: 3 }];
  const c = character(); c.choices['origin.feat'] = ['feat-vigoroso']; c.choices['origin.cantrip'] = ['spark']; c.choices['origin.language'] = ['Dracónico'];
  assert.deepEqual(selectedFeatIds(c, cat), ['feat-vigoroso']); assert.equal(deriveCharacter(c, cat).hpMax.value, 14);
  assert(deriveCharacter(c, cat).languages.includes('Dracónico')); assert.deepEqual(getGrantedSpells(c, cat).map(s => s.id), ['spark']);
  assert.deepEqual(validateCharacter(c, cat), []);
  c.classes[0].level = 3; assert(getGrantedSpells(c, cat).some(s => s.id === 'level2'));
});

test('variant replacing a parent does not inherit its ability bonuses or traits', () => {
  const variant: Race = { ...structuredClone(race), id: 'race-variant', parentId: race.id, kind: 'variant', replacesParent: true, abilityBonuses: { con: 1 }, languages: ['Propio'] };
  const c = character(); c.subraceId = variant.id;
  const d = deriveCharacter(c, { ...catalog, races: [race, variant] }); assert.equal(d.abilities.dex.total, 14); assert.equal(d.abilities.con.total, 15); assert.deepEqual(d.languages, ['Propio']);
});

test('progression-driven choices grow and expertise requires existing proficiency', () => {
  const cls = structuredClone(fighter); cls.progression[0].resources.invocationsKnown = 1; cls.progression[1].resources.invocationsKnown = 2;
  cls.choices = [{ id: 'dynamic', type: 'feature', name: 'Rasgos', amount: 1, required: true, dynamicAmountResource: 'invocationsKnown', options: ['a', 'b'] }, { id: 'expert', type: 'expertise', name: 'Pericia', amount: 1, requiresProficiency: true, options: [{ id: 'perception', name: 'Percepción', effects: [{ type: 'skill_expertise', skill: 'perception' }] }] }];
  const cat = { ...catalog, classes: [cls] }, c = character(); c.choices.dynamic = ['a']; c.choices.expert = ['perception'];
  assert(validateCharacter(c, cat).some(e => e.includes('competencia previa'))); c.skillRanks.perception = 1;
  assert(!validateCharacter(c, cat).some(e => e.includes('competencia previa'))); c.classes[0].level = 2;
  assert.equal(getAllChoices(c, cat).find(ch => ch.id === 'dynamic')!.amount, 2); assert(getPendingChoices(c, cat).some(ch => ch.id === 'dynamic'));
});

test('ASI allows +2 same ability, detects incomplete mix and enforces ceiling', () => {
  const c = character('class-guerrero', 4), key = 'asi.class-guerrero.4';
  assert(getPendingChoices(c, catalog).some(ch => ch.id === key));
  c.choices[key] = ['ability:str', 'ability:str']; assert.equal(deriveCharacter(c, catalog).abilities.str.total, 16); assert(!getPendingChoices(c, catalog).some(ch => ch.id === key));
  c.abilities.str = 20; assert(validateCharacter(c, catalog).some(e => e.includes('no puede superar 20')));
  c.choices[key] = ['ability:str', 'feat:feat-vigoroso']; assert(getPendingChoices(c, catalog).some(ch => ch.id === key));
});

test('level-up is a validated immutable draft and can undo exactly once', () => {
  const c = character(), serialized = JSON.stringify(c), plan = planLevelUp(c, 'class-guerrero', catalog);
  assert.equal(JSON.stringify(c), serialized); assert.equal(plan.next.hp.rolls[0].value, 0); assert.throws(() => applyLevelUp(c, plan.next, catalog), /tirada válida/);
  plan.next.hp.rolls[0].value = 6; const leveled = applyLevelUp(c, plan.next, catalog);
  assert.equal(leveled.classes[0].level, 2); assert(leveled.lastLevelSnapshot); assert(!JSON.parse(leveled.lastLevelSnapshot).lastLevelSnapshot);
  const undone = undoLevelUp(leveled); assert.equal(undone.classes[0].level, 1); assert.equal(undone.hp.rolls.length, 0); assert.equal(undone.lastLevelSnapshot, undefined); assert.equal(undoLevelUp(undone), undone);
});

test('multiclass entry checks old and new classes and fighter accepts DEX or STR', () => {
  const c = character(); c.abilities.str = 10; c.abilities.dex = 14; c.abilities.int = 12;
  assert(planLevelUp(c, 'class-mago', catalog).errors.some(e => e.includes('Inteligencia')));
  c.abilities.int = 13; assert.deepEqual(planLevelUp(c, 'class-mago', catalog).errors, []);
  c.abilities.dex = 8; assert(planLevelUp(c, 'class-mago', catalog).errors.some(e => e.includes('Fuerza 13 o Destreza')));
});

test('damage consumes temp HP first and healing respects derived maximum without mutation', () => {
  const c = character(); c.hp.temp = 5; c.hp.current = 10;
  const hurt = applyDamage(c, 8, catalog); assert.equal(hurt.hp.temp, 0); assert.equal(hurt.hp.current, 7); assert.equal(c.hp.temp, 5);
  assert.equal(applyHealing(hurt, 100, catalog).hp.current, 12); assert.throws(() => applyDamage(c, NaN), /cantidad/); assert.throws(() => applyHealing(c, -1, catalog), /cantidad/);
});

test('2014 long rest restores HP and one hit die at first level but preserves manual resources', () => {
  const feature = (id: string, recovery: 'long' | 'short' | 'manual'): Feature => ({ id, name: id, description: '', source, originId: 'class-guerrero', level: 1, resource: { max: 2, recovery } });
  const cls = structuredClone(fighter); cls.featureIds = ['short', 'long', 'manual'];
  const cat = { ...catalog, classes: [cls], features: [feature('short', 'short'), feature('long', 'long'), feature('manual', 'manual')] }, c = character(); c.resourcesSpent = { short: 1, long: 2, manual: 1 }; c.hp.hitDiceUsed = { 'class-guerrero': 1 }; c.hp.current = 1;
  c.hp.temp = 5;
  const rested = applyRest(c, 'long', cat); assert.deepEqual(rested.resourcesSpent, { short: 0, long: 0, manual: 1 }); assert.equal(rested.hp.current, 12); assert.deepEqual(rested.hp.hitDiceUsed, { 'class-guerrero': 0 }); assert.equal(rested.hp.temp, 0); assert.equal(c.resourcesSpent.short, 1); assert.equal(c.hp.hitDiceUsed['class-guerrero'], 1);
});

test('equipped armor applies dex cap and shield while attacks expose trace', () => {
  const c = character(); c.inventory = [{ id: 'armor', name: 'Armadura de prueba', category: 'Armaduras', quantity: 1, weight: 1, equipped: true, attuned: false, description: '', notes: '', armorBase: 14, dexCap: 2 }, { id: 'shield', name: 'Escudo', category: 'Armaduras', quantity: 1, weight: 1, equipped: true, attuned: false, description: '', notes: '', shieldBonus: 2 }];
  assert.equal(deriveCharacter(c, catalog).ac.value, 18);
  const attack = deriveAttack(c, { id: 'a', name: 'Prueba', ability: 'str', proficient: true, bonus: 1, damage: '1d8', damageType: '', range: '', notes: '', favorite: false }, catalog);
  assert.equal(attack.attack.value, 5); assert.equal(attack.damageBonus, 2); assert.equal(attack.attack.breakdown.length, 3);
});

test('feat prerequisites handle numeric alternatives, race text and plural proficiencies', () => {
  const c = character(); assert.deepEqual(checkPrerequisites([{ type: 'proficiency', value: 'armadura media' }], c, catalog), []);
  assert.deepEqual(checkPrerequisites([{ type: 'any', options: [{ type: 'minimum_ability', ability: 'str', minimum: 18 }, { type: 'minimum_ability', ability: 'dex', minimum: 13 }] }], c, catalog), []);
  assert(checkPrerequisites([{ type: 'source_requirement', value: 'Tiefling' }], c, catalog).length);
});

test('JSON round trips and rejects corruption without leaking TypeErrors', () => {
  const c = character(); assert.deepEqual(importJSON(exportJSON(c), catalog), c);
  for (const value of [null, [], {}, { schemaVersion: 2 }, { ...c, abilities: null }, { ...c, classes: [null] }, { ...c, hp: { current: '12' } }, { ...c, deathSaves: { successes: 4, failures: 0 } }, { ...c, choices: { 'skills.class-guerrero': ['unknown-skill'] } }, { ...c, featIds: ['unknown'] }, { ...c, manualOverrides: { ac: Infinity } }, { ...c, spellSelections: { 'class-mago': { known: ['unknown'], prepared: [] } } }]) {
    assert.throws(() => importJSON(JSON.stringify(value), catalog), error => error instanceof Error && error.name === 'CharacterImportError');
  }
  assert.throws(() => importJSON('{bad-json'), /JSON válido/);
  assert.throws(() => importJSON(exportJSON(c).replace('"choices": {', '"choices": {"__proto__":[], ')), /clave no permitida/);
  assert(validateCharacterData({ ...c, manualOverrides: { ac: NaN } }).length > 0);
});

class MemoryStorage {
  readonly data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
  removeItem(key: string) { this.data.delete(key); }
}

test('old saved equipment labels display the current names without changing item IDs', () => {
  const c = createCharacter();
  c.inventory = [
    { id: 'quiver', equipmentId: 'equipment-equipo-aljaba', name: 'Aljaba' },
    { id: 'bow', equipmentId: 'equipment-armas-arco-corto', name: 'Arco pequeño' },
    { id: 'crowbar', equipmentId: 'equipment-equipo-palanca', name: 'Barreta' },
  ] as Character['inventory'];
  const normalized = normalizeEquipmentLabels(c);
  assert.deepEqual(normalized.inventory.map(item => item.name), ['Carcaj', 'Arco corto', 'Palanca']);
  assert.deepEqual(normalized.inventory.map(item => item.equipmentId), c.inventory.map(item => item.equipmentId));
  assert.equal(c.inventory[0].name, 'Aljaba');
});

test('unfinished character drafts survive reload and remain until explicitly deleted', () => {
  const storage = new MemoryStorage(), drafts = new LocalDraftRepository(catalog, storage), c = createCharacter();
  drafts.save({ character: c, step: 0 });
  const changed = { ...c, name: 'Pícaro en progreso', raceId: race.id };
  drafts.save({ character: changed, step: 4 });
  const reloaded = new LocalDraftRepository(catalog, storage);
  assert.equal(reloaded.list().length, 1);
  assert.equal(reloaded.list()[0].character.name, 'Pícaro en progreso');
  assert.equal(reloaded.list()[0].step, 4);
  assert.deepEqual(new LocalDraftRepository(catalog, storage, 'other-owner').list(), []);
  reloaded.delete(c.id);
  assert.deepEqual(drafts.list(), []);
});

test('invalid stored drafts are preserved without overwriting them', () => {
  const storage = new MemoryStorage(), drafts = new LocalDraftRepository(catalog, storage);
  drafts.save({ character: createCharacter(), step: 0 });
  const [key] = storage.data.keys();
  storage.data.set(key, '{invalid');
  assert.throws(() => drafts.list(), /sin sobrescribir/);
  assert.throws(() => drafts.save({ character: createCharacter(), step: 1 }), /sin sobrescribir/);
  assert.equal(storage.getItem(key), '{invalid');
});

test('repository isolates records and demo initialization never resurrects deleted characters', async () => {
  const storage = new MemoryStorage(), repo = new LocalCharacterRepository(catalog, storage), c = character();
  await repo.seedIfEmpty(c); assert.equal((await repo.list()).length, 1);
  const read = (await repo.get(c.id))!; read.name = 'Changed only in memory'; assert.equal((await repo.get(c.id))!.name, c.name);
  await repo.delete(c.id); await repo.seedIfEmpty(character()); assert.deepEqual(await repo.list(), []);
  const other = new LocalCharacterRepository(catalog, storage, 'other-owner'); assert.deepEqual(await other.list(), []); await assert.rejects(other.save(c), /propietario/);
});

test('corrupt storage and quota errors preserve the previous library', async () => {
  const storage = new MemoryStorage(), repo = new LocalCharacterRepository(catalog, storage), c = character();
  await repo.save(c); const [key, raw] = [...storage.data.entries()][0];
  storage.data.set(key, '{invalid'); await assert.rejects(repo.seedIfEmpty(c), /sin sobrescribir/); assert.equal(storage.getItem(key), '{invalid');
  storage.data.set(key, raw); storage.setItem = () => { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; };
  await assert.rejects(repo.save({ ...c, name: 'Not saved' }), /lleno o bloqueado/); assert.equal(storage.getItem(key), raw);
});

test('snapshot imports reject nested or foreign character snapshots', () => {
  const c = character(), plan = planLevelUp(c, 'class-guerrero', catalog); plan.next.hp.rolls[0].value = 4;
  const next = applyLevelUp(c, plan.next, catalog); assert.equal(importJSON(exportJSON(next), catalog).classes[0].level, 2);
  next.lastLevelSnapshot = JSON.stringify({ ...c, id: 'foreign' }); assert.throws(() => importJSON(JSON.stringify(next), catalog), /instantánea/);
});

test('history is bounded during repeated play actions', () => {
  let c = character(); for (let i = 0; i < 110; i++) c = applyDamage(c, 0); assert.equal(c.history.length, 100);
});

test('all six modifiers support odd and negative score modifiers', () => {
  const c = character(); c.abilities = { str: 9, dex: 9, con: 11, int: 17, wis: 1, cha: 20 }; const d = deriveCharacter(c, catalog);
  assert.deepEqual(ABILITIES.map(a => d.abilities[a.id].modifier), [-1, 0, 0, 3, -5, 5]);
});


test('level review uses the final ASI rather than the initial level plan', () => {
  const original = caster(3), draft = planLevelUp(original, 'class-mago', catalog).next;
  draft.hp.rolls.at(-1)!.value = 4;
  draft.choices['asi.class-mago.4'] = ['ability:int', 'ability:int'];
  const changes = summarizeLevelUp(original, draft, catalog);
  assert(changes.includes('Inteligencia: 16 → 18'));
  assert(changes.includes('Conjuros preparados: hasta 8'));
  assert(!changes.includes('Conjuros preparados: hasta 7'));
});

test('attack override is traceable and restoring automation returns the formula', () => {
  const c = character();
  const attack = { id: 'sword', name: 'Espada', ability: 'str' as const, proficient: true, bonus: 1, damage: '1d8', damageType: '', range: '', notes: '', favorite: false };
  c.manualOverrides['attack.sword'] = 9;
  const overridden = deriveAttack(c, attack, catalog).attack;
  assert.equal(overridden.value, 9);
  assert.equal(overridden.mode, 'override');
  assert.equal(overridden.breakdown.reduce((sum, row) => sum + row.value, 0), 9);
  delete c.manualOverrides['attack.sword'];
  assert.equal(deriveAttack(c, attack, catalog).attack.value, 5);
});

test('2014 unarmored AC uses 10 plus Dexterity and never adds a second AC formula', () => {
  const c = character();
  assert.equal(deriveCharacter(c, catalog).ac.value, 13);
  assert.equal(deriveCharacter(c, catalog).ac.mode, 'auto');
  const defense: Feature = { id: 'defense', originId: fighter.id, name: 'Defensa sin armadura', level: 1, description: '', source, effects: [{ type: 'unarmoredDefense', abilities: ['dex', 'con'], shieldAllowed: true }] };
  c.manual.features = [defense]; c.abilities.con = 8;
  assert.equal(deriveCharacter(c, catalog).ac.value, 13, 'ordinary AC is better with a negative Constitution modifier');
  c.abilities.con = 16;
  assert.equal(deriveCharacter(c, catalog).ac.value, 16);
  c.inventory = [{ id: 'shield', name: 'Escudo', category: 'Armaduras', quantity: 1, weight: 6, equipped: true, attuned: false, description: '', notes: '', shieldBonus: 2 }];
  assert.equal(deriveCharacter(c, catalog).ac.value, 18);
});

test('2014 later levels grant at least one HP with a very low Constitution score', () => {
  const c = character('class-guerrero', 3); c.abilities.con = 1;
  c.hp.rolls = [{ classId: fighter.id, value: 1 }, { classId: fighter.id, value: 4 }];
  const hp = deriveCharacter(c, catalog).hpMax;
  assert.equal(hp.value, 7); // First level 10 − 5; each later level gains 1.
  assert.equal(hp.breakdown.reduce((sum, row) => sum + row.value, 0), 7);
});

test('2014 multiclass contributions round each half or third caster down before adding', () => {
  const paladin = { ...structuredClone(ranger), id: 'class-paladin', name: 'Paladín' };
  const cat = { ...catalog, classes: [...catalog.classes, paladin] }, c = character(ranger.id, 3);
  c.classes.push({ classId: paladin.id, level: 3 });
  assert.deepEqual(deriveCharacter(c, cat).slots, MULTICLASS_SLOTS[2]);
  const thirdOne = { ...structuredClone(ranger), id: 'third-one', name: 'Tercio uno', spellcasting: { ...ranger.spellcasting!, progression: 'third' as const } };
  const thirdTwo = { ...structuredClone(thirdOne), id: 'third-two', name: 'Tercio dos' };
  c.classes = [{ classId: thirdOne.id, level: 5 }, { classId: thirdTwo.id, level: 5 }];
  assert.deepEqual(deriveCharacter(c, { ...catalog, classes: [thirdOne, thirdTwo] }).slots, MULTICLASS_SLOTS[2]);
  c.classes = [{ classId: paladin.id, level: 5 }, { classId: ranger.id, level: 1 }];
  assert.deepEqual(deriveCharacter(c, cat).slots, paladin.progression[4].slots, 'ranger level one has no Spellcasting to combine');
});

test('artificer prepared spells still use floor half-level while multiclass slots use ceiling', () => {
  const artificer = classFixture('class-artificiero', 'Artificiero', { spellcasting: { ability: 'int', mode: 'prepared', progression: 'half', preparedFormula: 'halfLevel+ability', recovery: 'long' } });
  artificer.progression = artificer.progression.map(row => ({ ...row, slots: MULTICLASS_SLOTS[Math.ceil(row.level / 2)] }));
  const cat = { ...catalog, classes: [...catalog.classes, artificer] }, c = character(artificer.id, 3);
  assert.equal(deriveCharacter(c, cat).spellcasting[0].preparedLimit, 4);
  c.classes.push({ classId: wizard.id, level: 1 });
  assert.deepEqual(deriveCharacter(c, cat).slots, MULTICLASS_SLOTS[3]);
});

test('long rest restores floor half of total hit dice, with a player-selected multiclass allocation', () => {
  const c = character(fighter.id, 3); c.classes.push({ classId: wizard.id, level: 2 });
  c.hp.hitDiceUsed = { [fighter.id]: 3, [wizard.id]: 2 };
  assert.deepEqual(longRestHitDiceRecovery(c, catalog), { [fighter.id]: 2, [wizard.id]: 0 });
  const rested = applyRest(c, 'long', catalog, { [fighter.id]: 0, [wizard.id]: 2 });
  assert.deepEqual(rested.hp.hitDiceUsed, { [fighter.id]: 3, [wizard.id]: 0 });
  assert.throws(() => applyRest(c, 'long', catalog, { [fighter.id]: 2, [wizard.id]: 1 }), /como máximo/);
  assert.throws(() => applyRest(c, 'long', catalog, { [wizard.id]: 3 }), /gastados/);
  assert.throws(() => applyRest(c, 'long', catalog, { [wizard.id]: -1 }), /gastados/);
  c.hp.current = 0;
  assert.throws(() => applyRest(c, 'long', catalog), /al menos 1 PG/);
  assert(restPreview(c, 'long', catalog)[0].includes('al menos 1 PG'));
});

test('short rest healing spends one actual hit die and adds Constitution, with zero as minimum', () => {
  const c = character(); c.hp.current = 1; c.hp.temp = 4;
  const healed = spendHitDie(c, fighter.id, 4, catalog);
  assert.equal(healed.hp.current, 7); assert.equal(healed.hp.hitDiceUsed[fighter.id], 1);
  assert.equal(healed.hp.temp, 4); assert.equal(c.hp.current, 1);
  assert.throws(() => spendHitDie(healed, fighter.id, 4, catalog), /No quedan/);
  assert.throws(() => spendHitDie(c, fighter.id, 11, catalog), /tirada válida/);
  const rested = applyRest(healed, 'short', catalog);
  assert.equal(rested.hp.current, 7); assert.equal(rested.hp.hitDiceUsed[fighter.id], 1);
  c.abilities.con = 1;
  assert.equal(spendHitDie(c, fighter.id, 1, catalog).hp.current, 1);
});

test('2014 exhaustion applies cumulative numeric effects and long rest requires food and water to remove a level', () => {
  const c = character(fighter.id, 5), base = deriveCharacter(c, catalog);
  c.exhaustionLevel = 2; c.conditions = ['Agotamiento'];
  let d = deriveCharacter(c, catalog); assert.equal(d.speed.value, 15); assert.equal(d.hpMax.value, base.hpMax.value); assert.equal(d.passivePerception.value, base.passivePerception.value - 5);
  c.exhaustionLevel = 4; d = deriveCharacter(c, catalog);
  assert.equal(d.hpMax.value, Math.floor(base.hpMax.value / 2));
  assert.equal(applyRest(c, 'long', catalog).exhaustionLevel, 4);
  const rested = applyRest(c, 'long', catalog, undefined, { foodAndWater: true });
  assert.equal(rested.exhaustionLevel, 3); assert.equal(rested.hp.current, base.hpMax.value);
  c.exhaustionLevel = 5; assert.equal(deriveCharacter(c, catalog).speed.value, 0);
  c.exhaustionLevel = 1; const recovered = applyRest(c, 'long', catalog, undefined, { foodAndWater: true });
  assert.equal(recovered.exhaustionLevel, 0); assert(!recovered.conditions.includes('Agotamiento'));
});

test('heavy armor Strength requirement reduces speed by ten feet, while dwarves retain their speed', () => {
  const c = character();
  c.inventory = [{ id: 'plate', equipmentId: 'plate', name: 'Placas', category: 'Armaduras', quantity: 1, weight: 65, equipped: true, attuned: false, description: '', notes: '', armorBase: 18, dexCap: 0 }];
  const cat = { ...catalog, equipment: [{ id: 'plate', name: 'Placas', category: 'Armaduras', description: '', source, armorCategory: 'Armaduras pesadas', strengthRequirement: 15 }] };
  assert.equal(deriveCharacter(c, cat).speed.value, 20);
  const dwarf = { ...race, name: 'Enano', speed: 25 };
  assert.equal(deriveCharacter(c, { ...cat, races: [dwarf] }).speed.value, 25);
  c.abilities.str = 15; assert.equal(deriveCharacter(c, cat).speed.value, 30);
  c.conditions = ['Agarrado']; assert.equal(deriveCharacter(c, cat).speed.value, 0);
});

test('healing resets death saves only after HP are actually regained and attack damage can be explicitly set to zero', () => {
  const c = character(); c.hp.current = 0; c.deathSaves = { successes: 1, failures: 2 };
  assert.deepEqual(applyHealing(c, 0, catalog).deathSaves, c.deathSaves);
  assert.deepEqual(applyHealing(c, 1, catalog).deathSaves, { successes: 0, failures: 0 });
  const attack = { id: 'off-hand', name: 'Segunda arma', ability: 'str' as const, proficient: true, bonus: 0, damage: '1d6', damageType: '', range: '', notes: '', favorite: false, damageBonus: 0 };
  assert.equal(deriveAttack(c, attack, catalog).damageBonus, 0);
});
