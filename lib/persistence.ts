import { ABILITIES, SKILLS } from './constants';
import type { Catalog, Character } from './types';

export interface CharacterRepository {
  list(): Promise<Character[]>;
  get(id: string): Promise<Character | null>;
  save(character: Character): Promise<void>;
  delete(id: string): Promise<void>;
}

/** Keep old saved names readable after catalog terminology changes. */
export function normalizeEquipmentLabels(character: Character): Character {
  const names: Record<string, Record<string, string>> = {
    'equipment-equipo-aljaba': { Aljaba: 'Carcaj' },
    'equipment-armas-arco-corto': { 'Arco pequeño': 'Arco corto' },
    'equipment-equipo-palanca': { Barreta: 'Palanca' },
  };
  const correctedWeights: Record<string, number> = {
    'equipment-equipo-antorcha': 1,
    'equipment-vehiculos-bote-de-remos': 100,
  };
  const packPartWeights: Record<string, number> = { Yesquero: 1, Traje: 4 };
  const oldCatalogNote = 'Peso no disponible en la fuente; ajústalo si es necesario.';
  const oldPackNote = 'Contenido del paquete; peso no disponible en la fuente.';
  return { ...character, inventory: character.inventory.map(item => {
    const next = { ...item, name: names[item.equipmentId ?? '']?.[item.name] ?? item.name };
    if (next.notes === oldCatalogNote) {
      const corrected = correctedWeights[next.equipmentId ?? ''];
      if (corrected !== undefined && next.weight === 0) next.weight = corrected;
      next.notes = corrected !== undefined || next.isContainer || next.weight !== 0 ? '' : 'Las reglas oficiales de 2014 no indican un peso fijo para este objeto.';
    } else if (next.notes === oldPackNote) {
      const corrected = packPartWeights[next.name];
      if (corrected !== undefined && next.weight === 0) next.weight = corrected;
      next.notes = corrected !== undefined || next.weight !== 0 ? '' : 'Las reglas oficiales de 2014 no indican un peso para este componente del paquete.';
    }
    return next;
  }) };
}

export class CharacterImportError extends Error {
  constructor(public readonly issues: string[]) {
    super(`No se pudo importar el personaje:\n${issues.slice(0, 12).join('\n')}${issues.length > 12 ? '\n…' : ''}`);
    this.name = 'CharacterImportError';
  }
}

type Obj = Record<string, unknown>;
const plain = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v) && (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);
const own = (o: Obj, key: string) => Object.prototype.hasOwnProperty.call(o, key);
const MAX_JSON = 8_000_000;
const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

/** Runtime validation is separate from rule validation: a saved draft may be incomplete. */
export function validateCharacterData(input: unknown, catalog?: Catalog, snapshot = false): string[] {
  const errors: string[] = [];
  const fail = (path: string, detail: string) => { if (errors.length < 100) errors.push(`${path}: ${detail}`); };
  const object = (v: unknown, path: string): Obj => { if (!plain(v)) { fail(path, 'debe ser un objeto'); return {}; } return v; };
  const str = (v: unknown, path: string, max = 2000, empty = true) => { if (typeof v !== 'string' || v.length > max || (!empty && !v.trim()) || (typeof v === 'string' && /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(v))) fail(path, `texto inválido (máximo ${max} caracteres)`); };
  const num = (v: unknown, path: string, min: number, max: number, integer = true) => { if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max || (integer && !Number.isInteger(v))) fail(path, `número inválido; permitido ${min}–${max}`); };
  const bool = (v: unknown, path: string) => { if (typeof v !== 'boolean') fail(path, 'debe ser verdadero o falso'); };
  const arr = (v: unknown, path: string, max: number): unknown[] => { if (!Array.isArray(v) || v.length > max) { fail(path, `lista inválida (máximo ${max})`); return []; } return v; };
  const strings = (v: unknown, path: string, max = 500, itemMax = 200, distinct = true) => {
    const list = arr(v, path, max); list.forEach((s, i) => str(s, `${path}[${i}]`, itemMax, false));
    if (distinct && new Set(list).size !== list.length) fail(path, 'contiene valores repetidos'); return list;
  };
  const records = (v: unknown, path: string, check: (val: unknown, key: string) => void, max = 1000) => {
    const obj = object(v, path), entries = Object.entries(obj);
    if (entries.length > max) fail(path, `demasiadas entradas (máximo ${max})`);
    entries.slice(0, max).forEach(([key, val]) => { str(key, `${path}.clave`, 250, false); check(val, `${path}.${key}`); }); return obj;
  };
  const safeTree = (v: unknown, path: string, depth: number) => {
    if (depth > 24) { fail(path, 'estructura demasiado profunda'); return; }
    if (v && typeof v === 'object') {
      if (!Array.isArray(v) && !plain(v)) { fail(path, 'tipo de objeto no permitido'); return; }
      Object.entries(v).slice(0, 10_000).forEach(([key, val]) => { if (FORBIDDEN_KEYS.has(key)) fail(path, `clave no permitida: ${key}`); else safeTree(val, `${path}.${key}`, depth + 1); });
    } else if (typeof v === 'number' && !Number.isFinite(v)) fail(path, 'no se permiten números no finitos');
  };
  safeTree(input, 'personaje', 0);
  if (!plain(input)) return ['El archivo debe contener un objeto de personaje.'];
  const c = input;
  if (c.schemaVersion !== 1) fail('schemaVersion', 'versión no compatible; se requiere 1');
  ['id', 'ownerId'].forEach(key => str(c[key], key, 150, false));
  ['name', 'raceId', 'subraceId', 'backgroundId'].forEach(key => str(c[key], key, 200));
  str(c.concept, 'concept', 20_000); str(c.portrait, 'portrait', 3_000_000);
  if (typeof c.portrait === 'string' && c.portrait && !/^(https?:\/\/|data:image\/(?:png|jpe?g|webp|gif|avif);base64,|\/[^/])/i.test(c.portrait)) fail('portrait', 'usa una imagen local, data:image o una URL http(s)');
  ['createdAt', 'updatedAt'].forEach(key => { str(c[key], key, 100, false); if (typeof c[key] === 'string' && !Number.isFinite(Date.parse(c[key]))) fail(key, 'fecha inválida'); });
  bool(c.isDemo, 'isDemo'); bool(c.inspiration, 'inspiration');
  if (own(c, 'exhaustionLevel')) num(c.exhaustionLevel, 'exhaustionLevel', 0, 6);
  if (own(c, 'abilityGeneration')) {
    const generation = object(c.abilityGeneration, 'abilityGeneration');
    if (!['manual', 'standard', 'point-buy', 'rolled'].includes(String(generation.method))) fail('abilityGeneration.method', 'método desconocido');
    if (own(generation, 'rolls')) arr(generation.rolls, 'abilityGeneration.rolls', 6).forEach((roll, index) => {
      const dice = arr(roll, `abilityGeneration.rolls[${index}]`, 4);
      if (dice.length !== 4) fail('abilityGeneration.rolls', 'cada tirada requiere cuatro dados');
      dice.forEach(die => num(die, 'abilityGeneration.rolls.die', 1, 6));
    });
  }
  if (own(c, 'startingEquipment')) {
    const equipment = object(c.startingEquipment, 'startingEquipment');
    ['classId', 'backgroundId'].forEach(key => str(equipment[key], `startingEquipment.${key}`, 200));
    if (!['equipment', 'gold'].includes(String(equipment.mode))) fail('startingEquipment.mode', 'modo desconocido');
    records(equipment.selections, 'startingEquipment.selections', (v, path) => str(v, path, 300), 100);
    records(equipment.picks, 'startingEquipment.picks', (v, path) => arr(v, path, 100).forEach((value, index) => str(value, `${path}[${index}]`, 300)), 100);
    strings(equipment.verified, 'startingEquipment.verified', 100, 500);
    if (own(equipment, 'goldRoll')) num(equipment.goldRoll, 'startingEquipment.goldRoll', 0, 1000);
    if (own(equipment, 'applied')) bool(equipment.applied, 'startingEquipment.applied');
  }
  const classes = arr(c.classes, 'classes', 13).map((v, i) => {
    const cl = object(v, `classes[${i}]`); str(cl.classId, `classes[${i}].classId`, 150, false); num(cl.level, `classes[${i}].level`, 1, 20);
    if (own(cl, 'subclassId')) str(cl.subclassId, `classes[${i}].subclassId`, 200);
    if (catalog) {
      const cls = catalog.classes.find(x => x.id === cl.classId);
      if (!cls) fail(`classes[${i}].classId`, 'referencia desconocida');
      if (cl.subclassId && !cls?.subclasses.some(s => s.id === cl.subclassId)) fail(`classes[${i}].subclassId`, 'subclase incompatible');
    }
    return cl;
  });
  if (new Set(classes.map(cl => cl.classId)).size !== classes.length) fail('classes', 'clases repetidas');
  const level = classes.reduce((sum, cl) => sum + (typeof cl.level === 'number' ? cl.level : 0), 0);
  if (level > 20) fail('classes', 'el nivel total supera 20');
  const abilities = object(c.abilities, 'abilities'); ABILITIES.forEach(a => num(abilities[a.id], `abilities.${a.id}`, 1, 30));
  const increases = records(c.abilityIncreases, 'abilityIncreases', (v, path) => num(v, path, -30, 30), 6);
  if (Object.keys(increases).some(k => !ABILITIES.some(a => a.id === k))) fail('abilityIncreases', 'característica desconocida');
  const ranks = records(c.skillRanks, 'skillRanks', (v, path) => num(v, path, 0, 2), 30);
  const bonuses = records(c.skillBonuses, 'skillBonuses', (v, path) => num(v, path, -100, 100), 30);
  [...Object.keys(ranks), ...Object.keys(bonuses)].forEach(key => { if (!SKILLS.some(s => s.id === key) && !['animalHandling', 'sleightOfHand'].includes(key)) fail('skills', `habilidad desconocida: ${key}`); });
  records(c.choices, 'choices', (v, path) => strings(v, path, 100, 300, false));
  const featIds = strings(c.featIds, 'featIds', 100);
  const spells = records(c.spellSelections, 'spellSelections', (v, path) => {
    const selection = object(v, path);
    for (const type of ['known', 'prepared']) {
      const ids = strings(selection[type], `${path}.${type}`, 1000);
      if (catalog) ids.forEach(id => { if (!catalog.spells.some(spell => spell.id === id)) fail(`${path}.${type}`, `conjuro desconocido: ${id}`); });
    }
  }, 13);
  Object.keys(spells).forEach(id => { if (!classes.some(cl => cl.classId === id)) fail('spellSelections', `clase ajena al personaje: ${id}`); });
  const hp = object(c.hp, 'hp'); num(hp.current, 'hp.current', 0, 1_000_000); num(hp.temp, 'hp.temp', 0, 1_000_000);
  arr(hp.rolls, 'hp.rolls', 19).forEach((v, i) => {
    const roll = object(v, `hp.rolls[${i}]`); str(roll.classId, `hp.rolls[${i}].classId`, 150, false); num(roll.value, `hp.rolls[${i}].value`, 0, 100);
    if (!classes.some(cl => cl.classId === roll.classId)) fail(`hp.rolls[${i}].classId`, 'clase ajena al personaje');
    const die = catalog?.classes.find(cl => cl.id === roll.classId)?.hitDie;
    if (die && typeof roll.value === 'number' && roll.value > die) fail(`hp.rolls[${i}].value`, 'supera el dado de golpe');
  });
  records(hp.hitDiceUsed, 'hp.hitDiceUsed', (v, path) => num(v, path, 0, 20), 30);
  if (own(c, 'hpMaxAdjustments')) arr(c.hpMaxAdjustments, 'hpMaxAdjustments', 100).forEach((entry, i) => { const row = object(entry, `hpMaxAdjustments[${i}]`); str(row.id, `hpMaxAdjustments[${i}].id`, 200); str(row.label, `hpMaxAdjustments[${i}].label`, 250); num(row.value, `hpMaxAdjustments[${i}].value`, -100000, 100000); });
  records(c.resourcesSpent, 'resourcesSpent', (v, path) => num(v, path, 0, 1_000_000));
  records(c.slotsSpent, 'slotsSpent', (v, path) => num(v, path, 0, 1000), 100);
  strings(c.conditions, 'conditions', 100);
  const death = object(c.deathSaves, 'deathSaves'); num(death.successes, 'deathSaves.successes', 0, 3); num(death.failures, 'deathSaves.failures', 0, 3);
  arr(c.attacks, 'attacks', 500).forEach((v, i) => {
    const a = object(v, `attacks[${i}]`); ['id', 'name', 'damage', 'damageType', 'range'].forEach(k => str(a[k], `attacks[${i}].${k}`, 500)); str(a.notes, `attacks[${i}].notes`, 20_000);
    if (a.ability !== 'none' && !ABILITIES.some(b => b.id === a.ability)) fail(`attacks[${i}].ability`, 'característica inválida');
    num(a.bonus, `attacks[${i}].bonus`, -100, 100); bool(a.proficient, `attacks[${i}].proficient`); bool(a.favorite, `attacks[${i}].favorite`);
    if (own(a, 'damageBonus')) num(a.damageBonus, `attacks[${i}].damageBonus`, -100, 100);
    if (own(a, 'magicBonus')) num(a.magicBonus, `attacks[${i}].magicBonus`, -100, 100);
    if (own(a, 'extraDamage')) arr(a.extraDamage, `attacks[${i}].extraDamage`, 20).forEach((extra, j) => { const row = object(extra, `attacks[${i}].extraDamage[${j}]`); str(row.dice, `attacks[${i}].extraDamage[${j}].dice`, 100); str(row.damageType, `attacks[${i}].extraDamage[${j}].damageType`, 100); if (own(row, 'condition')) str(row.condition, `attacks[${i}].extraDamage[${j}].condition`, 500); });
  });
  arr(c.inventory, 'inventory', 2000).forEach((v, i) => {
    const item = object(v, `inventory[${i}]`); ['id', 'name'].forEach(k => str(item[k], `inventory[${i}].${k}`, 500)); ['description', 'notes'].forEach(k => str(item[k], `inventory[${i}].${k}`, 50_000));
    if (!['Armas', 'Armaduras', 'Equipo', 'Objetos'].includes(String(item.category))) fail(`inventory[${i}].category`, 'categoría inválida');
    num(item.quantity, `inventory[${i}].quantity`, 0, 1_000_000); num(item.weight, `inventory[${i}].weight`, 0, 1_000_000, false);
    bool(item.equipped, `inventory[${i}].equipped`); bool(item.attuned, `inventory[${i}].attuned`);
    if (own(item, 'homebrew')) bool(item.homebrew, `inventory[${i}].homebrew`);
    if (own(item, 'isContainer')) bool(item.isContainer, `inventory[${i}].isContainer`);
    if (own(item, 'requiresAttunement')) bool(item.requiresAttunement, `inventory[${i}].requiresAttunement`);
    if (own(item, 'containerId') && item.containerId !== undefined) str(item.containerId, `inventory[${i}].containerId`, 200);
    if (own(item, 'rarity') && item.rarity !== undefined && !['Común', 'Poco común', 'Raro', 'Muy raro', 'Legendario', 'Artefacto'].includes(String(item.rarity))) fail(`inventory[${i}].rarity`, 'rareza inválida');
    if (own(item, 'attack') && item.attack !== undefined) {
      const attack = object(item.attack, `inventory[${i}].attack`);
      if (attack.ability !== 'none' && !ABILITIES.some(ability => ability.id === attack.ability)) fail(`inventory[${i}].attack.ability`, 'característica inválida');
      ['damage', 'damageType', 'range', 'notes'].forEach(key => str(attack[key], `inventory[${i}].attack.${key}`, 500));
      num(attack.bonus, `inventory[${i}].attack.bonus`, -100, 100); bool(attack.proficient, `inventory[${i}].attack.proficient`);
      if (own(attack, 'damageBonus')) num(attack.damageBonus, `inventory[${i}].attack.damageBonus`, -100, 100);
      if (own(attack, 'magicBonus')) num(attack.magicBonus, `inventory[${i}].attack.magicBonus`, -100, 100);
      if (own(attack, 'extraDamage')) arr(attack.extraDamage, `inventory[${i}].attack.extraDamage`, 20).forEach((extra, j) => { const row = object(extra, `inventory[${i}].attack.extraDamage[${j}]`); str(row.dice, `inventory[${i}].attack.extraDamage[${j}].dice`, 100); str(row.damageType, `inventory[${i}].attack.extraDamage[${j}].damageType`, 100); if (own(row, 'condition')) str(row.condition, `inventory[${i}].attack.extraDamage[${j}].condition`, 500); });
    }
    if (own(item, 'startingEquipmentOrigin')) str(item.startingEquipmentOrigin, `inventory[${i}].startingEquipmentOrigin`, 200);
    ['armorBase', 'dexCap', 'shieldBonus'].forEach(k => { if (own(item, k)) num(item[k], `inventory[${i}].${k}`, 0, 100); });
    if (own(item, 'equipmentId')) { str(item.equipmentId, `inventory[${i}].equipmentId`, 200); if (catalog && item.equipmentId && !catalog.equipment.some(e => e.id === item.equipmentId)) fail(`inventory[${i}].equipmentId`, 'equipo desconocido'); }
  });
  const inventoryItems = Array.isArray(c.inventory) ? c.inventory as Record<string, unknown>[] : [];
  inventoryItems.forEach((item, i) => { if (typeof item.containerId === 'string' && !inventoryItems.some(parent => parent.id === item.containerId && parent.isContainer === true && parent.id !== item.id)) fail(`inventory[${i}].containerId`, 'contenedor desconocido'); });
  records(c.money, 'money', (v, path) => num(v, path, 0, 1_000_000_000, false), 50);
  if (own(c, 'sheetSpellAttackIds')) strings(c.sheetSpellAttackIds, 'sheetSpellAttackIds', 1000, 200);
  if (own(c, 'inventoryOptions')) {
    const options = object(c.inventoryOptions, 'inventoryOptions');
    bool(options.coinsHaveWeight, 'inventoryOptions.coinsHaveWeight');
  }
  records(c.biography, 'biography', (v, path) => str(v, path, 100_000), 100);
  arr(c.notes, 'notes', 2000).forEach((v, i) => { const note = object(v, `notes[${i}]`); ['id', 'title', 'category', 'date'].forEach(k => str(note[k], `notes[${i}].${k}`, 500)); str(note.content, `notes[${i}].content`, 100_000); });
  const favorites = object(c.favorites, 'favorites');
  const favoriteSpells = strings(favorites.spells, 'favorites.spells', 1000), favoriteFeatures = strings(favorites.features, 'favorites.features', 2000);
  records(c.manualOverrides, 'manualOverrides', (v, path) => num(v, path, -1_000_000, 1_000_000, false), 500);
  if (own(c, 'featureOverrides')) records(c.featureOverrides, 'featureOverrides', (entry, path) => { const row = object(entry, path); str(row.name, `${path}.name`, 250); str(row.description, `${path}.description`, 100_000); if (own(row, 'manualCategory') && !['Raciales', 'Clase', 'Subclase', 'Dotes', 'Otros'].includes(String(row.manualCategory))) fail(`${path}.manualCategory`, 'tipo de rasgo inválido'); }, 500);
  const manual = object(c.manual, 'manual'); ['languages', 'senses', 'resistances', 'immunities', 'proficiencies'].forEach(k => strings(manual[k], `manual.${k}`, 500, 1000));
  const manualFeatures = arr(manual.features, 'manual.features', 500).map((v, i) => {
    const f = object(v, `manual.features[${i}]`); ['id', 'name', 'originId'].forEach(k => str(f[k], `manual.features[${i}].${k}`, 250)); str(f.description, `manual.features[${i}].description`, 100_000);
    const source = object(f.source, `manual.features[${i}].source`); num(source.page, `manual.features[${i}].source.page`, 0, 10_000);
    if (f.level !== null) num(f.level, `manual.features[${i}].level`, 0, 20);
    if (own(f, 'manualCategory') && !['Raciales', 'Clase', 'Subclase', 'Dotes', 'Otros'].includes(String(f.manualCategory))) fail(`manual.features[${i}].manualCategory`, 'tipo de rasgo inválido');
    if (own(f, 'optional')) bool(f.optional, `manual.features[${i}].optional`);
    // Custom features are descriptive. Imported automation is restricted to the documented effect schema.
    if (own(f, 'effects')) arr(f.effects, `manual.features[${i}].effects`, 100).forEach((v, j) => {
      const effect = object(v, `manual.features[${i}].effects[${j}]`); str(effect.type, 'effect.type', 100, false);
      if (own(effect, 'ability') && !ABILITIES.some(a => a.id === effect.ability)) fail('effect.ability', 'característica inválida');
      if (own(effect, 'value')) { if (typeof effect.value === 'number') num(effect.value, 'effect.value', -1000, 1000, false); else str(effect.value, 'effect.value', 1000); }
      if (own(effect, 'level')) num(effect.level, 'effect.level', 0, 20);
    });
    if (own(f, 'resource')) {
      const r = object(f.resource, `manual.features[${i}].resource`);
      if (!['short', 'long', 'manual'].includes(String(r.recovery))) fail('resource.recovery', 'recuperación inválida');
      if (typeof r.max === 'number') num(r.max, 'resource.max', -1, 1_000_000);
      else { const max = object(r.max, 'resource.max'); if (own(max, 'byLevel')) arr(max.byLevel, 'resource.max.byLevel', 20).forEach(v => num(v, 'resource.max.byLevel', -1, 1_000_000)); else { if (!ABILITIES.some(a => a.id === max.ability)) fail('resource.max.ability', 'característica inválida'); num(max.min, 'resource.max.min', 0, 100); } }
    }
    if (own(f, 'choices') && (!Array.isArray(f.choices) || f.choices.length > 0)) fail(`manual.features[${i}].choices`, 'las elecciones de rasgos personalizados se gestionan mediante notas, no mediante JSON importado');
    return f;
  });
  arr(c.history, 'history', 100).forEach((v, i) => { const h = object(v, `history[${i}]`); ['id', 'date'].forEach(k => str(h[k], `history[${i}].${k}`, 150, false)); str(h.text, `history[${i}].text`, 20_000); });
  if (catalog) {
    if (c.raceId && !catalog.races.some(r => r.id === c.raceId && r.kind !== 'subrace')) fail('raceId', 'raza desconocida o subraza usada como raza');
    if (c.subraceId && !catalog.races.some(r => r.id === c.subraceId && r.parentId === c.raceId)) fail('subraceId', 'subraza incompatible');
    if (c.backgroundId && !catalog.backgrounds.some(b => b.id === c.backgroundId)) fail('backgroundId', 'trasfondo desconocido');
    featIds.forEach(id => { if (!catalog.feats.some(f => f.id === id)) fail('featIds', `dote desconocida: ${id}`); });
    favoriteSpells.forEach(id => { if (!catalog.spells.some(s => s.id === id)) fail('favorites.spells', `conjuro desconocido: ${id}`); });
    favoriteFeatures.forEach(id => { if (!catalog.features.some(f => f.id === id) && !manualFeatures.some(f => f.id === id) && !catalog.feats.some(f => f.id === id)) fail('favorites.features', `rasgo desconocido: ${id}`); });
    const allChoices = [...catalog.races.flatMap(r => r.choices), ...catalog.classes.flatMap(cl => cl.choices ?? []), ...catalog.features.flatMap(f => f.choices ?? []), ...catalog.feats.flatMap(f => f.choices), ...catalog.backgrounds.flatMap(b => b.choices ?? [])];
    if (plain(c.choices)) Object.entries(c.choices).forEach(([id, values]) => {
      if (!Array.isArray(values) || values.some(v => typeof v !== 'string')) return;
      const choice = allChoices.find(ch => ch.id === id);
      let valid: (v: unknown) => boolean;
      if (choice) {
        if (choice.type === 'choose_feat') valid = v => catalog.feats.some(f => f.id === String(v).replace(/^feat:/, ''));
        else if (choice.type === 'choose_cantrip') valid = v => catalog.spells.some(s => s.id === v && s.level === 0);
        else if (!choice.options.length && ['choose_language', 'choose_tool'].includes(choice.type)) valid = v => typeof v === 'string' && !!v.trim();
        else valid = v => choice.options.some(o => (typeof o === 'string' ? o : o.id) === v);
      } else if (catalog.classes.some(cl => `optional-spells.${cl.id}` === id)) valid = v => v === 'enabled';
      else if (catalog.classes.some(cl => `skills.${cl.id}` === id)) valid = v => SKILLS.some(s => s.id === v);
      else if (catalog.classes.some(cl => `subclass.${cl.id}` === id)) valid = v => catalog.classes.some(cl => cl.subclasses.some(s => s.id === v));
      else if (catalog.classes.some(cl => `instrument.${cl.id}` === id)) valid = v => typeof v === 'string' && !!v.trim();
      else if (catalog.classes.some(cl => cl.toolProficiencies.filter(name => /elecci[oó]n/.test(name)).some((_,index) => `tools.${cl.id}.${index}` === id))) valid = v => catalog.equipment.some(item => item.name === v && /instrument|artesano/i.test(item.equipmentType ?? ''));
      else if (SKILLS.some(skill => `replacement.background.skill.${skill.id}` === id)) valid = v => SKILLS.some(skill => skill.id === v);
      else if (id.startsWith('replacement.background.tool.') && /^[a-z0-9-]+$/.test(id.slice('replacement.background.tool.'.length))) valid = v => catalog.equipment.some(item => item.name === v && /herramientas|instrumentos|kits|set de juego/i.test(item.equipmentType ?? ''));
      else if (catalog.classes.some(cl => id.startsWith(`asi.${cl.id}.`) && /^\d+$/.test(id.slice(`asi.${cl.id}.`.length)) && Number(id.split('.').at(-1)) >= 1 && Number(id.split('.').at(-1)) <= 20)) valid = v => ABILITIES.some(a => `ability:${a.id}` === v) || catalog.feats.some(f => `feat:${f.id}` === v);
      else { fail('choices', `elección desconocida: ${id}`); return; }
      values.forEach(v => { if (!valid(v)) fail(`choices.${id}`, `referencia de opción desconocida: ${v}`); });
    });
  }
  if (own(c, 'lastLevelSnapshot')) {
    if (snapshot) fail('lastLevelSnapshot', 'una instantánea no puede contener otra instantánea');
    else {
      str(c.lastLevelSnapshot, 'lastLevelSnapshot', MAX_JSON / 2, false);
      if (typeof c.lastLevelSnapshot === 'string' && c.lastLevelSnapshot.length <= MAX_JSON / 2) {
        try {
          const prev: unknown = JSON.parse(c.lastLevelSnapshot); const issues = validateCharacterData(prev, catalog, true);
          if (issues.length) fail('lastLevelSnapshot', issues[0]);
          else if (plain(prev) && (prev.id !== c.id || (prev.classes as { level: number }[]).reduce((sum, cl) => sum + cl.level, 0) !== level - 1)) fail('lastLevelSnapshot', 'la instantánea no es del nivel anterior de este personaje');
        } catch { fail('lastLevelSnapshot', 'JSON inválido'); }
      }
    }
  }
  if (own(c, 'lastLevelAppliedSnapshot')) {
    if (snapshot || !own(c, 'lastLevelSnapshot')) fail('lastLevelAppliedSnapshot', 'resultado de subida sin instantánea anterior');
    else {
      str(c.lastLevelAppliedSnapshot, 'lastLevelAppliedSnapshot', MAX_JSON / 2, false);
      if (typeof c.lastLevelAppliedSnapshot === 'string' && c.lastLevelAppliedSnapshot.length <= MAX_JSON / 2) {
        try {
          const applied: unknown = JSON.parse(c.lastLevelAppliedSnapshot); const issues = validateCharacterData(applied, catalog, true);
          if (issues.length) fail('lastLevelAppliedSnapshot', issues[0]);
          else if (plain(applied) && (applied.id !== c.id || (applied.classes as { level: number }[]).reduce((sum, cl) => sum + cl.level, 0) !== level)) fail('lastLevelAppliedSnapshot', 'el resultado no es de esta subida');
        } catch { fail('lastLevelAppliedSnapshot', 'JSON inválido'); }
      }
    }
  }
  return errors;
}

export function importJSON(text: string, catalog?: Catalog): Character {
  if (typeof text !== 'string' || text.length > MAX_JSON) throw new CharacterImportError(['El archivo no es texto JSON o supera 8 MB.']);
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new CharacterImportError(['El archivo no contiene JSON válido.']); }
  const errors = validateCharacterData(value, catalog);
  if (errors.length) throw new CharacterImportError(errors);
  return normalizeEquipmentLabels(value as Character);
}

export function exportJSON(character: Character): string {
  const errors = validateCharacterData(character);
  if (errors.length) throw new CharacterImportError(errors);
  return JSON.stringify(character, null, 2);
}

export const importCharacter = importJSON;
export const exportCharacter = exportJSON;

type LocalStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface CharacterDraft { character: Character; step: number }

export class LocalDraftRepository {
  private readonly key: string;
  constructor(private readonly catalog?: Catalog, private readonly providedStorage?: LocalStore, private readonly ownerId = 'local') { this.key = `grimorio.drafts.v1.${ownerId}`; }
  private storage(): LocalStore {
    try { const storage = this.providedStorage ?? globalThis.localStorage; if (storage) return storage; } catch { /* browser denied storage */ }
    throw new Error('El almacenamiento local no está disponible. Permite el almacenamiento de este sitio para guardar borradores.');
  }
  list(): CharacterDraft[] {
    const raw = this.storage().getItem(this.key);
    if (!raw) return [];
    try {
      const data: unknown = JSON.parse(raw);
      if (!plain(data) || data.schemaVersion !== 1 || !Array.isArray(data.drafts) || data.drafts.length > 2000) throw new Error('Formato de borradores inválido.');
      const drafts = data.drafts.map((entry: unknown) => {
        if (!plain(entry) || !Number.isInteger(entry.step) || (entry.step as number) < 0 || (entry.step as number) > 9) throw new Error('Paso del borrador inválido.');
        const errors = validateCharacterData(entry.character, this.catalog);
        if (errors.length) throw new Error(`Borrador inválido: ${errors.slice(0, 3).join('; ')}`);
        const character = entry.character as Character;
        if (character.ownerId !== this.ownerId) throw new Error('El propietario del borrador no coincide.');
        return { character, step: entry.step as number };
      });
      if (new Set(drafts.map(draft => draft.character.id)).size !== drafts.length) throw new Error('Identificadores de borrador repetidos.');
      return structuredClone(drafts).sort((a, b) => b.character.updatedAt.localeCompare(a.character.updatedAt));
    } catch (error) { throw new Error(`No se pueden leer los borradores guardados. Se han conservado sin sobrescribir. ${error instanceof Error ? error.message : ''}`); }
  }
  save(draft: CharacterDraft): void {
    if (!Number.isInteger(draft.step) || draft.step < 0 || draft.step > 9) throw new Error('Paso del borrador inválido.');
    const errors = validateCharacterData(draft.character, this.catalog);
    if (errors.length) throw new Error(`No se pudo guardar el borrador: ${errors.slice(0, 3).join('; ')}`);
    if (draft.character.ownerId !== this.ownerId) throw new Error('El propietario del borrador no coincide.');
    const drafts = this.list(), index = drafts.findIndex(item => item.character.id === draft.character.id);
    if (index < 0) drafts.push(structuredClone(draft)); else drafts[index] = structuredClone(draft);
    this.write(drafts);
  }
  delete(id: string): void { this.write(this.list().filter(draft => draft.character.id !== id)); }
  private write(drafts: CharacterDraft[]): void {
    try { this.storage().setItem(this.key, JSON.stringify({ schemaVersion: 1, drafts })); }
    catch (error) { throw new Error(`No se pudo guardar el borrador en este navegador. ${error instanceof Error ? error.message : ''}`); }
  }
}

/** Only this adapter knows localStorage. Swap the repository for authenticated server storage later. */
export class LocalCharacterRepository implements CharacterRepository {
  private readonly key: string;
  constructor(private readonly catalog?: Catalog, private readonly providedStorage?: LocalStore, private readonly ownerId = 'local') { this.key = `grimorio.characters.v1.${ownerId}`; }
  private storage(): LocalStore {
    try { const storage = this.providedStorage ?? globalThis.localStorage; if (storage) return storage; } catch { /* browser denied storage */ }
    throw new Error('El almacenamiento local no está disponible. Permite el almacenamiento de este sitio para guardar personajes.');
  }
  private read(): Character[] {
    const raw = this.storage().getItem(this.key);
    if (!raw) return [];
    try {
      const data: unknown = JSON.parse(raw);
      if (!plain(data) || data.schemaVersion !== 1 || !Array.isArray(data.characters) || data.characters.length > 2000) throw new Error('Formato de biblioteca inválido.');
      const characters = data.characters.map(c => {
        const errors = validateCharacterData(c, this.catalog);
        if (errors.length) throw new CharacterImportError(errors);
        if ((c as Character).ownerId !== this.ownerId) throw new Error('El propietario del personaje no coincide.');
        return normalizeEquipmentLabels(c as Character);
      });
      if (new Set(characters.map(c => c.id)).size !== characters.length) throw new Error('Identificadores de personaje repetidos.');
      return characters;
    } catch (error) { throw new Error(`No se puede leer la biblioteca guardada. Se ha conservado sin sobrescribir. ${error instanceof Error ? error.message : ''}`); }
  }
  private write(characters: Character[]): void {
    try { this.storage().setItem(this.key, JSON.stringify({ schemaVersion: 1, initialized: true, characters })); }
    catch (error) {
      if (error instanceof Error && /quota|storage|almacenamiento/i.test(`${error.name} ${error.message}`)) throw new Error('No se pudo guardar: el almacenamiento local está lleno o bloqueado. Exporta tus personajes y reduce el tamaño de los retratos.');
      throw error;
    }
  }
  async list(): Promise<Character[]> { return structuredClone(this.read()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); }
  async get(id: string): Promise<Character | null> { return structuredClone(this.read().find(c => c.id === id) ?? null); }
  async save(character: Character): Promise<void> {
    const errors = validateCharacterData(character, this.catalog);
    if (errors.length) throw new CharacterImportError(errors);
    if (character.ownerId !== this.ownerId) throw new Error('El propietario del personaje no coincide con el repositorio.');
    const list = this.read(), index = list.findIndex(c => c.id === character.id);
    if (index < 0) list.push(normalizeEquipmentLabels(structuredClone(character))); else list[index] = normalizeEquipmentLabels(structuredClone(character));
    this.write(list);
  }
  async delete(id: string): Promise<void> { this.write(this.read().filter(c => c.id !== id)); }
  async seedIfEmpty(character: Character): Promise<void> {
    // The library record is the initialization marker: deletion writes an empty record.
    // A read is always performed first so malformed stored data can never be replaced by a demo.
    const list = this.read();
    if (this.storage().getItem(this.key) !== null || list.length) return;
    await this.save(character);
  }
}
