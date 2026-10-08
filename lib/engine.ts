import { ABILITIES, SKILLS, MULTICLASS_SLOTS, MULTICLASS_PROFICIENCIES } from './constants';
import type { Ability, Attack, Catalog, Character, Choice, ChoiceOption, DerivedCharacter, DerivedValue, Effect, Feature, Prerequisite, Source, Spell } from './types';
import subclassSpellGrants from '../data/rules/subclass-spell-grants.json';
import subclassSpellAccess from '../data/rules/subclass-spell-access.json';
import subclassLandSpells from '../data/rules/subclass-land-spells.json';
import genieExpandedSpells from '../data/rules/genie-expanded-spells.json';
import subclassDirectSpellGrants from '../data/rules/subclass-direct-spell-grants.json';

export const abilityModifier = (score: number) => Math.floor((score - 10) / 2);
export const totalLevel = (c: Character) => c.classes.reduce((sum, cl) => sum + cl.level, 0);
const unique = <T,>(values: T[]) => [...new Set(values)];
const clone = <T,>(value: T): T => structuredClone(value);
const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const skillId = (s: string) => ({ animalHandling: 'animal-handling', sleightOfHand: 'sleight-of-hand' }[s] ?? SKILLS.find(k => norm(k.name) === norm(s))?.id ?? s);
const abilityId = (s: string) => ABILITIES.find(a => a.id === s || norm(a.label) === norm(s))?.id;
const optionId = (o: ChoiceOption | string) => typeof o === 'string' ? o : o.id;
const numeric = (e: Effect) => typeof e.value === 'number' && Number.isFinite(e.value) ? e.value : 0;
const GRIMOIRE_FEATURE_ID = 'homebrew-feature-brujo-grimorio-profundo';
const GRIMOIRE_SLOT_GAINS = [{ level: 1, slot: 1 }, { level: 3, slot: 2 }, { level: 5, slot: 3 }, { level: 7, slot: 4 }, { level: 9, slot: 5 }, { level: 11, slot: 5 }];
const PROFICIENCY_LABELS: Record<string, string> = { light: 'Armaduras ligeras', medium: 'Armaduras medias', heavy: 'Armaduras pesadas', shield: 'Escudos', simple: 'Armas sencillas', martial: 'Armas marciales', 'thieves-tools': 'Herramientas de ladrón', 'hand-crossbow': 'Ballesta de mano', 'light-crossbow': 'Ballesta ligera', longsword: 'Espada larga', shortsword: 'Espada corta', rapier: 'Estoque', quarterstaff: 'Bastón', scimitar: 'Cimitarra', sickle: 'Hoz', club: 'Garrote', dagger: 'Daga', dart: 'Dardo', sling: 'Honda', javelin: 'Jabalina', spear: 'Lanza', mace: 'Maza' };
const proficiencyLabel = (name: string) => PROFICIENCY_LABELS[name] ?? name;
const proficiencyName = (name: string) => norm(proficiencyLabel(name));
const newId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
const srdSource = (page: number): Source => ({ page, book: 'SRD 5.1 · 2014', url: 'https://media.dndbeyond.com/compendium-images/srd/5.1/SRD_CC_v5.1_ES.pdf' });

export function createCharacter(): Character {
  const now = new Date().toISOString();
  return { schemaVersion: 1, id: newId(), ownerId: 'local', name: '', concept: '', portrait: '', isDemo: false,
    createdAt: now, updatedAt: now, raceId: '', subraceId: '', backgroundId: '', classes: [],
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, abilityIncreases: {}, skillRanks: {}, skillBonuses: {}, choices: {}, featIds: [], spellSelections: {},
    hp: { current: 0, temp: 0, rolls: [], hitDiceUsed: {} }, resourcesSpent: {}, slotsSpent: {}, conditions: [], inspiration: false, deathSaves: { successes: 0, failures: 0 },
    attacks: [], inventory: [], money: { pc: 0, pp: 0, pe: 0, po: 0, ppt: 0 }, biography: {}, notes: [], favorites: { spells: [], features: [] }, manualOverrides: {},
    manual: { languages: [], senses: [], resistances: [], immunities: [], proficiencies: [], features: [] }, history: [] };
}

export function withHistory(c: Character, text: string): Character {
  const date = new Date().toISOString();
  return { ...c, updatedAt: date, history: [...c.history, { id: newId(), date, text }].slice(-40) };
}

function races(c: Character, catalog: Catalog) {
  const base = catalog.races.find(r => r.id === c.raceId);
  const sub = catalog.races.find(r => r.id === c.subraceId && r.parentId === c.raceId);
  return sub?.replacesParent ? [sub] : [base, sub].filter(r => r != null);
}

export function selectedFeatIds(c: Character, catalog?: Catalog): string[] {
  const originChoices = catalog ? [...races(c, catalog).flatMap(r => r.choices), ...(catalog.backgrounds.find(b => b.id === c.backgroundId)?.choices ?? [])].filter(ch => ch.type === 'choose_feat').map(ch => ch.id) : Object.keys(c.choices).filter(id => id.endsWith('.feat'));
  const asi = Object.entries(c.choices).filter(([id]) => id.startsWith('asi.') && c.classes.some(cl => id.startsWith(`asi.${cl.classId}.`) && Number(id.split('.').at(-1)) <= cl.level)).flatMap(([, values]) => values.filter(v => v.startsWith('feat:')).map(v => v.slice(5)));
  return unique([...c.featIds, ...asi, ...originChoices.flatMap(id => (c.choices[id] ?? []).map(value => value.replace(/^feat:/, '')))]);
}

function classData(c: Character, catalog: Catalog) {
  return c.classes.flatMap(entry => {
    const cls = catalog.classes.find(cl => cl.id === entry.classId);
    if (!cls) return [];
    const sub = cls.subclasses.find(s => s.id === entry.subclassId);
    const casting = sub?.spellcasting ?? cls.spellcasting;
    const progression = sub?.spellcasting && sub.progression?.length ? sub.progression : cls.progression;
    const row = progression.find(r => r.level === entry.level);
    const classRow = cls.progression.find(r => r.level === entry.level);
    return [{ entry, cls, sub, casting, row, classRow }];
  });
}

function activeFeatures(c: Character, catalog: Catalog): Feature[] {
  const ids = new Set(races(c, catalog).flatMap(r => r.featureIds));
  const levels = new Map<string, number>();
  for (const { entry, cls, sub } of classData(c, catalog)) {
    levels.set(cls.id, entry.level);
    if (sub) levels.set(sub.id, entry.level);
    [...cls.featureIds, ...(sub?.featureIds ?? []), ...cls.progression.filter(row => row.level <= entry.level).flatMap(row => row.featureIds)].forEach(id => ids.add(id));
  }
  catalog.backgrounds.find(b => b.id === c.backgroundId)?.featureIds?.forEach(id => ids.add(id));
  const all = [...catalog.features, ...c.manual.features];
  const active = all.filter(f => (ids.has(f.id) || c.manual.features.some(m => m.id === f.id)) && (f.level === null || f.level <= (levels.get(f.originId) ?? totalLevel(c))) && !(f as Feature & { selectionOnly?: boolean }).selectionOnly && !f.optional);
  // Feature choices may unlock further choices. Bounded closure avoids loops in source references.
  const seen = new Set(active.map(f => f.id));
  for (let pass = 0; pass < 10; pass++) {
    const choices = [...races(c, catalog).flatMap(r => r.choices), ...active.flatMap(f => f.choices ?? []), ...classData(c, catalog).flatMap(d => (d.cls.choices ?? []).filter(ch => !ch.level || ch.level <= d.entry.level)), ...catalog.feats.filter(f => selectedFeatIds(c, catalog).includes(f.id)).flatMap(f => f.choices)];
    const selected = choices.flatMap(ch => ch.options.filter(o => c.choices[ch.id]?.includes(optionId(o))).flatMap(o => typeof o === 'string' ? [] : o.effects ?? []));
    const unlocked = selected.filter(e => e.type === 'feature' && typeof e.featureId === 'string').map(e => all.find(f => f.id === e.featureId)).filter((f): f is Feature => !!f && !seen.has(f.id));
    if (!unlocked.length) break;
    unlocked.forEach(f => { active.push(f); seen.add(f.id); });
  }
  return active.map(feature => c.featureOverrides?.[feature.id] ? { ...feature, ...c.featureOverrides[feature.id] } : feature);
}

/** Every applicable choice, including completed choices, for generic UI rendering. */
export function getAllChoices(c: Character, catalog: Catalog): Choice[] {
  const features = activeFeatures(c, catalog);
  const background = catalog.backgrounds.find(b => b.id === c.backgroundId);
  const choices: Choice[] = [...races(c, catalog).flatMap(r => r.choices), ...(catalog.backgrounds.find(b => b.id === c.backgroundId)?.choices ?? []), ...features.flatMap(f => f.choices ?? []), ...catalog.feats.filter(f => selectedFeatIds(c, catalog).includes(f.id)).flatMap(f => f.choices)];
  if (c.classes.some(entry => entry.subclassId === 'subclass-druida-circulo-de-la-tierra' && entry.level >= 3)) choices.push({ id: 'subclass-land.druid', type: 'subclass_land', name: 'Tierra del Círculo', amount: 1, required: true, classId: 'class-druida', level: 3, source: catalog.features.find(feature => feature.id === 'feature-druida-circulo-de-la-tierra-hechizos-del-circulo')?.source, options: Object.keys(subclassLandSpells).map(id => ({ id, name: ({ artico: 'Ártico', montana: 'Montaña', pradera: 'Pradera', underdark: 'Underdark' } as Record<string, string>)[id] ?? id[0].toUpperCase() + id.slice(1) })) });
  if (c.classes.some(entry => entry.subclassId === 'subclass-brujo-el-genio')) choices.push({ id: 'subclass-genie.warlock', type: 'subclass_genie', name: 'Tipo de genio', amount: 1, required: true, classId: 'class-brujo', level: 1, source: catalog.features.find(feature => feature.id === 'feature-brujo-el-genio-lista-de-hechizos-expandida')?.source, options: Object.keys(genieExpandedSpells).filter(id => id !== 'common').map(id => ({ id, name: ({ dao: 'Dao', djinni: 'Djinni', efreeti: 'Efreeti', marid: 'Marid' } as Record<string, string>)[id] })) });
  classData(c, catalog).forEach(({ cls, entry }, index) => {
    choices.push(...(cls.choices ?? []).filter(ch => !ch.level || ch.level <= entry.level).map(ch => ({ ...ch, classId: cls.id, amount: typeof ch.dynamicAmountResource === 'string' ? cls.progression.find(row => row.level === entry.level)?.resources[ch.dynamicAmountResource] ?? ch.amount : ch.amount })));
    const multiclassSkill = /bardo|explorador|picaro/.test(norm(cls.name));
    const skillAmount = index === 0 ? cls.skillChoices.amount : multiclassSkill ? 1 : 0;
    if (index === 0) cls.toolProficiencies.filter(name => /elecci[oó]n/.test(name)).forEach((name, toolIndex) => {
      const options = catalog.equipment.filter(item => /instrument/.test(norm(name)) && /instrument/.test(norm(item.equipmentType ?? '')) || /artesano/.test(norm(name)) && /artesano/.test(norm(item.equipmentType ?? ''))).map(item => ({ id: item.name, name: item.name, effects: [{ type: 'proficiency', value: item.name }] }));
      choices.push({ id: `tools.${cls.id}.${toolIndex}`, type: 'choose_tool', name, amount: /^tres/i.test(name) ? 3 : 1, options, required: true, classId: cls.id, source: cls.source });
    });
    if (skillAmount) choices.push({ id: `skills.${cls.id}`, type: 'skills', name: `Habilidades de ${cls.name}`, amount: skillAmount, classId: cls.id, required: true, source: index === 0 ? cls.source : { page: 451 }, options: (index > 0 && /bardo/.test(norm(cls.name)) ? SKILLS.map(s => s.id) : cls.skillChoices.options).map(id => ({ id: skillId(id), name: SKILLS.find(s => s.id === skillId(id))?.name ?? id, effects: [{ type: 'skill_proficiency', skill: skillId(id) }] })) });
    if (index > 0 && norm(cls.name) === 'bardo') choices.push({ id: `instrument.${cls.id}`, type: 'choose_tool', name: 'Instrumento musical de multiclase bardo', amount: 1, required: true, options: catalog.equipment.filter(item => /instrument/.test(norm(item.equipmentType ?? ''))).map(item => ({ id: item.name, name: item.name, effects: [{ type: 'proficiency', value: item.name }] })), classId: cls.id, source: { page: 451 } });
    if (cls.subclassLevel && entry.level >= cls.subclassLevel) choices.push({ id: `subclass.${cls.id}`, type: 'subclass', name: `Subclase de ${cls.name}`, amount: 1, options: cls.subclasses.map(s => ({ id: s.id, name: s.name })), classId: cls.id, required: true, source: cls.source });
    cls.progression.filter(row => row.level <= entry.level && row.featureNames.some(name => /mejora.*caracter|aumento.*caracter/i.test(norm(name)))).forEach(row => {
      choices.push({ id: `asi.${cls.id}.${row.level}`, type: 'asi', name: `Mejora de características · ${cls.name} ${row.level}`, amount: 2, classId: cls.id, level: row.level, required: true, source: cls.source, options: [...ABILITIES.map(a => ({ id: `ability:${a.id}`, name: `${a.label} +1` })), ...catalog.feats.map(f => ({ id: `feat:${f.id}`, name: f.name, prerequisites: f.prerequisites }))] });
    });
  });
  const backgroundChoices = new Set(background?.choices?.map(ch => ch.id));
  const otherChoices = choices.filter(ch => !backgroundChoices.has(ch.id));
  const selectedEffects = otherChoices.flatMap(ch => ch.options.flatMap(option => typeof option !== 'string' && c.choices[ch.id]?.includes(option.id) ? option.effects ?? [] : []));
  const otherEffects = [...races(c, catalog).flatMap(r => r.effects), ...features.flatMap(f => f.effects ?? []), ...catalog.feats.filter(f => selectedFeatIds(c, catalog).includes(f.id)).flatMap(f => f.effects), ...selectedEffects];
  const priorLanguages = [...races(c, catalog).flatMap(r => r.languages), ...c.manual.languages, ...otherEffects.filter(e => e.type === 'language').map(e => String(e.value)), ...otherChoices.filter(ch => ch.type === 'choose_language').flatMap(ch => c.choices[ch.id] ?? [])].map(norm);
  const skillSources = new Map<string, Set<string>>();
  const addSkillSource = (id: string, label: string) => {
    const key = skillId(id);
    if (!skillSources.has(key)) skillSources.set(key, new Set());
    skillSources.get(key)!.add(label);
  };
  Object.entries(c.skillRanks).filter(([, rank]) => rank > 0).forEach(([id]) => addSkillSource(id, 'ajuste manual'));
  races(c, catalog).forEach(r => r.effects.filter(e => e.type === 'skill_proficiency').forEach(e => addSkillSource(e.skill ?? String(e.value), r.name)));
  features.forEach(f => (f.effects ?? []).filter(e => e.type === 'skill_proficiency').forEach(e => addSkillSource(e.skill ?? String(e.value), f.name)));
  catalog.feats.filter(f => selectedFeatIds(c, catalog).includes(f.id)).forEach(f => f.effects.filter(e => e.type === 'skill_proficiency').forEach(e => addSkillSource(e.skill ?? String(e.value), f.name)));
  otherChoices.forEach(ch => ch.options.forEach(option => {
    if (typeof option === 'string' || !c.choices[ch.id]?.includes(option.id)) return;
    (option.effects ?? []).filter(e => e.type === 'skill_proficiency').forEach(e => addSkillSource(e.skill ?? String(e.value), ch.classId ? catalog.classes.find(cls => cls.id === ch.classId)?.name ?? ch.name : ch.name));
  }));
  const otherSkills = new Set(skillSources.keys());
  const backgroundSkills = background?.skillProficiencies?.map(skillId) ?? [];
  const duplicateSkills = backgroundSkills.filter(id => otherSkills.has(id));
  duplicateSkills.forEach(id => choices.push({ id: `replacement.background.skill.${id}`, type: 'choose_skill', name: `Competencia repetida: ${[...skillSources.get(id)!].join(', ')} y ${background?.name ?? 'trasfondo'} otorgan ${SKILLS.find(s => s.id === id)?.name ?? id}; elige otra habilidad`, amount: 1, required: true, source: srdSource(61), distinctFrom: duplicateSkills.filter(other => other !== id).map(other => `replacement.background.skill.${other}`), options: SKILLS.filter(s => !otherSkills.has(s.id) && !backgroundSkills.includes(s.id)).map(s => ({ id: s.id, name: s.name, effects: [{ type: 'skill_proficiency', skill: s.id }] })) }));
  const priorTools = new Set([...(classData(c, catalog)[0]?.cls.toolProficiencies ?? []), ...classData(c, catalog).slice(1).flatMap(cl => MULTICLASS_PROFICIENCIES[norm(cl.cls.name)] ?? []), ...c.manual.proficiencies, ...otherEffects.filter(e => e.type === 'proficiency').map(e => String(e.value))].map(proficiencyName));
  const backgroundTools = unique([...(background?.toolProficiencies ?? []), ...(background?.choices ?? []).flatMap(ch => ch.options.flatMap(option => typeof option !== 'string' && c.choices[ch.id]?.includes(option.id) ? (option.effects ?? []).filter(e => e.type === 'proficiency').map(e => String(e.value)) : []))]);
  const duplicateTools = backgroundTools.filter(name => priorTools.has(proficiencyName(name)));
  const toolReplacementId = (name: string) => `replacement.background.tool.${norm(name).replace(/[^a-z0-9]+/g, '-')}`;
  duplicateTools.forEach(name => {
    const toolSources = [...classData(c, catalog).filter(({ cls }) => cls.toolProficiencies.some(tool => proficiencyName(tool) === proficiencyName(name))).map(({ cls }) => cls.name), ...(c.manual.proficiencies.some(tool => proficiencyName(tool) === proficiencyName(name)) ? ['ajuste manual'] : []), ...otherChoices.filter(ch => ch.options.some(option => typeof option !== 'string' && c.choices[ch.id]?.includes(option.id) && (option.effects ?? []).some(e => e.type === 'proficiency' && proficiencyName(String(e.value)) === proficiencyName(name)))).map(ch => ch.classId ? catalog.classes.find(cls => cls.id === ch.classId)?.name ?? ch.name : ch.name)];
    const label = `Competencia repetida: ${unique(toolSources).join(', ') || 'otra fuente'} y ${background?.name ?? 'trasfondo'} otorgan ${name}; elige otra herramienta`;
    choices.push({ id: toolReplacementId(name), type: 'choose_tool', name: label, amount: 1, required: true, source: srdSource(61), distinctFrom: duplicateTools.filter(other => other !== name).map(toolReplacementId), options: catalog.equipment.filter(item => /herramientas|instrumentos|kits|set de juego/i.test(item.equipmentType ?? '') && !priorTools.has(proficiencyName(item.name)) && !backgroundTools.some(tool => proficiencyName(tool) === proficiencyName(item.name))).map(item => ({ id: item.name, name: item.name, effects: [{ type: 'proficiency', value: item.name }] })) });
  });
  return [...new Map(choices.filter(ch => ch.amount > 0 && (typeof ch.replacementForLanguage !== 'string' || priorLanguages.includes(norm(ch.replacementForLanguage)))).map(ch => {
    let options = ch.options;
    if (ch.type === 'choose_feat' && !options.length) options = catalog.feats.map(f => ({ id: f.id, name: f.name, description: f.description, prerequisites: f.prerequisites }));
    if (ch.type === 'choose_cantrip' && !options.length) options = catalog.spells.filter(s => s.level === 0 && (!ch.classId || spellClassAllowed(s, ch.classId, c, catalog))).map(s => ({ id: s.id, name: s.name, effects: [{ type: 'grant_spell', spellId: s.id }] }));
    return [ch.id, { ...ch, options }] as const;
  })).values()];
}

function effectsFor(c: Character, catalog: Catalog, features: Feature[]) {
  const tagged: { effect: Effect; label: string }[] = [];
  const add = (effects: Effect[] | undefined, label: string) => effects?.filter(e => !e.level || e.level <= totalLevel(c)).forEach(effect => tagged.push({ effect, label }));
  races(c, catalog).forEach(r => add(r.effects, r.name));
  features.forEach(f => add(f.effects, f.name));
  catalog.feats.filter(f => selectedFeatIds(c, catalog).includes(f.id)).forEach(f => add(f.effects, f.name));
  getAllChoices(c, catalog).forEach(ch => {
    (c.choices[ch.id] ?? []).forEach(id => {
      const option = ch.options.find(o => optionId(o) === id);
      if (option && typeof option !== 'string') add(option.effects, `${ch.name}: ${option.name}`);
      if (ch.type === 'choose_language') tagged.push({ effect: { type: 'language', value: id }, label: ch.name });
      if (ch.type === 'choose_tool' && !ch.options.length) tagged.push({ effect: { type: 'proficiency', value: id }, label: ch.name });
      if (ch.type === 'asi' && id.startsWith('ability:')) {
        const ability = abilityId(id.slice(8));
        if (ability) tagged.push({ effect: { type: 'ability_bonus', ability, value: 1 }, label: ch.name });
      }
    });
  });
  return tagged;
}

export function deriveCharacter(c: Character, catalog: Catalog): DerivedCharacter {
  const level = totalLevel(c), warnings: string[] = [], raceData = races(c, catalog), classes = classData(c, catalog), features = activeFeatures(c, catalog);
  const tagged = effectsFor(c, catalog, features);
  const effectRows = (type: string) => tagged.filter(({ effect }) => effect.type === type);
  const value = (key: string, rows: { label: string; value: number }[], mode: DerivedValue['mode'] = 'auto', source?: Source): DerivedValue => {
    const auto = rows.reduce((n, row) => n + row.value, 0), override = c.manualOverrides[key];
    return Number.isFinite(override) ? { value: override, mode: 'override', breakdown: [...rows, { label: 'Sustitución manual (diferencia)', value: override - auto }], source } : { value: auto, mode, breakdown: rows, source };
  };
  const abilities = Object.fromEntries(ABILITIES.map(a => {
    const bonus = raceData.reduce((sum, r) => sum + (r.abilityBonuses[a.id] ?? 0), 0) + (c.abilityIncreases[a.id] ?? 0) + effectRows('ability_bonus').filter(x => x.effect.ability === a.id).reduce((sum, x) => sum + numeric(x.effect), 0);
    const total = c.abilities[a.id] + bonus;
    return [a.id, { base: c.abilities[a.id], bonus, total, modifier: abilityModifier(total) }];
  })) as DerivedCharacter['abilities'];
  const pb = catalog.classes.flatMap(cl => cl.progression).find(row => row.level === level && row.proficiencyBonus !== null)?.proficiencyBonus ?? 0;
  const proficiency = value('proficiency', [{ label: `Competencia por nivel total ${level}`, value: pb }], pb ? 'auto' : 'manual', classes[0]?.cls.source);
  if (level && !pb) warnings.push('Bonificador de competencia sin fila de progresión disponible: introdúcelo manualmente.');
  const ranks: Record<string, number> = Object.fromEntries(Object.entries(c.skillRanks).map(([id, rank]) => [skillId(id), rank]));
  const background = catalog.backgrounds.find(b => b.id === c.backgroundId);
  background?.skillProficiencies?.forEach(id => { ranks[skillId(id)] = Math.max(1, ranks[skillId(id)] ?? 0); });
  tagged.forEach(({ effect: e }) => {
    if (['skill_proficiency', 'skill_expertise', 'expertise'].includes(e.type) && (e.skill || typeof e.value === 'string')) {
      const id = skillId(e.skill ?? String(e.value)); ranks[id] = Math.max(ranks[id] ?? 0, e.type === 'skill_proficiency' ? 1 : 2);
    }
  });
  const halfProficiency = effectRows('half_proficiency_untrained').slice(0, 1).map(x => ({ label: x.label, value: Math.floor(proficiency.value / 2) }));
  const skills = Object.fromEntries(SKILLS.map(s => [s.id, value(`skill.${s.id}`, [{ label: ABILITIES.find(a => a.id === s.ability)!.label, value: abilities[s.ability].modifier }, { label: (ranks[s.id] ?? 0) >= 2 ? 'Pericia' : 'Competencia', value: (ranks[s.id] ?? 0) * proficiency.value }, ...((ranks[s.id] ?? 0) === 0 ? halfProficiency : []), { label: 'Bonificación manual', value: c.skillBonuses[s.id] ?? 0 }, ...effectRows('skill_bonus').filter(x => skillId(x.effect.skill ?? '') === s.id).map(x => ({ label: x.label, value: numeric(x.effect) }))])]));
  const auraBonuses = effectRows('save_ability_bonus').filter(x => x.effect.condition !== 'conscious' || !c.conditions.some(condition => norm(condition) === 'inconsciente')).map(x => ({ label: `${x.label} (personal)`, value: Math.max(typeof x.effect.minimum === 'number' ? x.effect.minimum : 0, abilities[x.effect.ability ?? 'cha'].modifier) }));
  const saveAbilities = classes[0]?.cls.savingThrows.map(abilityId) ?? [];
  const saves = Object.fromEntries(ABILITIES.map(a => {
    const proficient = saveAbilities.includes(a.id) || tagged.some(x => ['save_proficiency', 'saving_throw_proficiency'].includes(x.effect.type) && (x.effect.ability === a.id || x.effect.value === a.id));
    return [a.id, value(`save.${a.id}`, [{ label: a.label, value: abilities[a.id].modifier }, { label: 'Competencia de salvación', value: proficient ? proficiency.value : 0 }, ...auraBonuses, ...effectRows('save_bonus').filter(x => !x.effect.ability || x.effect.ability === a.id).map(x => ({ label: x.label, value: numeric(x.effect) }))])];
  })) as DerivedCharacter['saves'];
  const firstDie = classes[0]?.cls.hitDie ?? 0;
  if (c.hp.rolls.length !== Math.max(0, level - 1)) warnings.push('Faltan tiradas de puntos de golpe de niveles posteriores al primero.');
  const minimumHp = c.hp.rolls.reduce((sum, roll) => sum + Math.max(0, 1 - (roll.value + abilities.con.modifier)), 0);
  const hpRows = [{ label: 'Dado máximo del primer nivel', value: firstDie }, { label: 'PG elegidos en niveles posteriores', value: c.hp.rolls.reduce((sum, roll) => sum + roll.value, 0) }, { label: `Constitución × ${level} niveles`, value: abilities.con.modifier * level }, ...(minimumHp ? [{ label: 'Mínimo de 1 PG por nivel posterior al primero', value: minimumHp }] : []), ...effectRows('hp_per_level').map(x => ({ label: `${x.label} × ${level} niveles`, value: numeric(x.effect) * level })), ...effectRows('hp_bonus').map(x => ({ label: x.label, value: numeric(x.effect) })), ...(c.hpMaxAdjustments ?? []).map(row => ({ label: row.label || 'Modificador de PG máximos', value: row.value }))];
  const exhaustion = c.exhaustionLevel ?? 0;
  if (exhaustion >= 4) hpRows.push({ label: 'Agotamiento: PG máximos a la mitad', value: -Math.ceil(hpRows.reduce((sum, row) => sum + row.value, 0) / 2) });
  const hpMax = value('hpMax', hpRows, !firstDie && level ? 'manual' : 'auto');
  const armor = c.inventory.filter(item => item.equipped && typeof item.armorBase === 'number');
  const shields = c.inventory.filter(item => item.equipped && typeof item.shieldBonus === 'number');
  if (armor.length > 1) warnings.push('Hay varias armaduras equipadas: se utiliza la primera.');
  if (shields.length > 1) warnings.push('Hay varios escudos equipados: solo se aplica el primero.');
  // Multiclass p.452: only the first acquired Unarmored Defense feature applies.
  const unarmored = effectRows('unarmoredDefense').sort((a, b) => {
    const origin = (label: string) => features.find(f => f.name === label)?.originId;
    return c.classes.findIndex(cl => cl.classId === origin(a.label)) - c.classes.findIndex(cl => cl.classId === origin(b.label));
  })[0];
  const unarmoredAllowed = !armor.length && unarmored && (unarmored.effect.shieldAllowed === true || !shields.length);
  let armorRows = armor.length ? [{ label: armor[0].name, value: armor[0].armorBase! }, { label: 'Destreza aplicable', value: armor[0].dexCap === 0 ? 0 : Math.min(abilities.dex.modifier, armor[0].dexCap ?? Infinity) }] : [{ label: 'CA base sin armadura', value: 10 }, { label: 'Destreza', value: abilities.dex.modifier }];
  if (unarmoredAllowed) {
    const rows = [{ label: unarmored.label, value: 10 }, ...(Array.isArray(unarmored.effect.abilities) ? unarmored.effect.abilities : []).flatMap(a => typeof a === 'string' && abilityId(a) ? [{ label: ABILITIES.find(x => x.id === abilityId(a))!.label, value: abilities[abilityId(a)!].modifier }] : [])];
    if (rows.reduce((n, row) => n + row.value, 0) >= armorRows.reduce((n, row) => n + row.value, 0)) armorRows = rows;
  }
  const naturalArmor = effectRows('natural_armor');
  const ignoresWornArmor = naturalArmor.some(x => x.effect.ignoresWornArmor === true);
  if (ignoresWornArmor && armor.length) {
    armorRows = [];
    warnings.push('Tu armadura natural no obtiene beneficios de una armadura equipada.');
  }
  let armorSource: Source | undefined = armor.length ? { page: 419, endPage: 420 } : { page: 14, book: 'Manual del Jugador · 2014', url: 'https://www.dndbeyond.com/sources/dnd/sac/sage-advice-compendium#HowdoyoucalculateacreaturesArmorClassAC' };
  for (const natural of naturalArmor) {
    const rows = [{ label: natural.label, value: numeric(natural.effect) }, ...(Array.isArray(natural.effect.abilities) ? natural.effect.abilities : []).flatMap(id => typeof id === 'string' && abilityId(id) ? [{ label: ABILITIES.find(a => a.id === abilityId(id))!.label, value: abilities[abilityId(id)!].modifier }] : [])];
    if (!armorRows.length || rows.reduce((n, row) => n + row.value, 0) > armorRows.reduce((n, row) => n + row.value, 0)) {
      armorRows = rows;
      const source = features.find(f => f.name === natural.label && f.effects?.some(e => e.type === 'natural_armor'))?.source;
      armorSource = source ? { page: source.page, endPage: source.endPage ?? source.page } : undefined;
    }
  }
  const ac = value('ac', [...armorRows, ...shields.slice(0, 1).map(s => ({ label: s.name, value: s.shieldBonus! })), ...effectRows('ac_bonus').map(x => ({ label: x.label, value: numeric(x.effect) })), ...(armor.length && !ignoresWornArmor ? effectRows('conditional_ac_bonus').filter(x => x.effect.condition === 'wearing-armor').map(x => ({ label: x.label, value: numeric(x.effect) })) : [])], armorRows.length ? 'auto' : 'manual', armorSource);
  const initiative = value('initiative', [{ label: 'Destreza', value: abilities.dex.modifier }, ...halfProficiency, ...effectRows('initiative_bonus').map(x => ({ label: x.label, value: numeric(x.effect) }))]);
  const speedBase = [...raceData].reverse().find(r => r.speed !== null)?.speed;
  const speedEffects = [...effectRows('speed_bonus'), ...effectRows('speed')].filter(x => {
    if (!x.effect.condition) return true;
    if (x.effect.condition === 'not-heavy-armor') {
      if (!armor.length) return true;
      const equipment = catalog.equipment.find(e => e.id === armor[0].equipmentId);
      const category = norm(equipment?.armorCategory ?? equipment?.category ?? '');
      if (/pesada|heavy/.test(category)) return false;
      if (/ligera|media|light|medium/.test(category)) return true;
      warnings.push(`${x.label}: movimiento condicional requiere verificar que la armadura no sea pesada; usa una sustitución manual si procede.`);
    }
    return false;
  });
  const monkMovement = !armor.length && !shields.length ? classes.flatMap(cl => {
    const feature = features.find(f => f.originId === cl.cls.id && f.id === 'feature-monje-movimiento-sin-armadura');
    const bonus = cl.classRow?.resources.unarmoredMovement;
    return feature && bonus ? [{ label: feature.name, value: bonus }] : [];
  }) : [];
  const speedRows = [{ label: 'Velocidad racial (pies)', value: speedBase ?? 0 }, ...speedEffects.map(x => ({ label: x.label, value: numeric(x.effect) })), ...monkMovement];
  const equippedArmor = catalog.equipment.find(item => item.id === armor[0]?.equipmentId) as (typeof catalog.equipment[number] & { strengthRequirement?: number | null }) | undefined;
  const dwarfArmorSpeed = raceData.some(race => /enano/.test(norm(race.name)));
  if (equippedArmor?.strengthRequirement && abilities.str.total < equippedArmor.strengthRequirement && !dwarfArmorSpeed && !ignoresWornArmor) speedRows.push({ label: 'Fuerza insuficiente para la armadura pesada', value: -10 });
  const cannotMove = c.conditions.some(condition => ['agarrado', 'apresado', 'aturdido', 'inconsciente', 'paralizado', 'petrificado'].includes(norm(condition))) || exhaustion >= 5;
  if (cannotMove) speedRows.push({ label: 'Condición que impide moverse', value: -speedRows.reduce((sum, row) => sum + row.value, 0) });
  else if (exhaustion >= 2) speedRows.push({ label: 'Agotamiento: velocidad a la mitad', value: -Math.ceil(speedRows.reduce((sum, row) => sum + row.value, 0) / 2) });
  const speed = value('speed', speedRows, speedBase === undefined ? 'manual' : 'auto');
  const passiveDisadvantage = exhaustion >= 1 || c.conditions.some(condition => norm(condition) === 'envenenado');
  const passivePerception = value('passivePerception', [{ label: 'Base pasiva', value: 10 }, { label: 'Percepción', value: skills.perception.value }, ...effectRows('passive_perception_bonus').map(x => ({ label: x.label, value: numeric(x.effect) })), ...(passiveDisadvantage ? [{ label: 'Desventaja en pruebas: percepción pasiva', value: -5 }] : [])]);
  if (exhaustion >= 1) warnings.push('Agotamiento 1+: desventaja en pruebas de característica.');
  if (exhaustion >= 3) warnings.push('Agotamiento 3+: desventaja en ataques y tiradas de salvación.');
  if (exhaustion >= 6) warnings.push('Agotamiento 6: el personaje muere según las reglas de 2014.');
  if (!exhaustion && c.conditions.includes('Agotamiento')) warnings.push('Selecciona el nivel de agotamiento (1–6) para aplicar sus efectos de 2014.');
  if (c.conditions.some(condition => ['aturdido', 'inconsciente', 'paralizado', 'petrificado'].includes(norm(condition)))) warnings.push('La condición activa incluye incapacitación: no puedes realizar acciones ni reacciones.');
  if (c.conditions.some(condition => ['aturdido', 'inconsciente', 'paralizado'].includes(norm(condition)))) warnings.push('Fallas automáticamente las salvaciones de Fuerza y Destreza mientras dure esta condición.');
  const resources = features.filter(f => f.resource).map(f => {
    const max = f.resource!.max;
    const own = classes.find(cl => cl.cls.id === f.originId || cl.sub?.id === f.originId);
    const featureLevel = own?.entry.level ?? level;
    let maximum = typeof max === 'number' ? max : 'byLevel' in max ? max.byLevel[Math.max(0, featureLevel - 1)] ?? 0 : Math.max(max.min, abilities[abilityId(max.ability) ?? 'cha'].modifier);
    const resourceKey = (f as Feature & { resourceKey?: string }).resourceKey;
    if (resourceKey && own?.classRow?.resources[resourceKey] !== undefined) maximum = own.classRow.resources[resourceKey];
    let recovery = f.resource!.recovery;
    if (norm(f.name).includes('inspiracion de bardo') && own && own.entry.level >= 5 && features.some(feature => norm(feature.name).includes('fuente de inspiracion'))) recovery = 'short';
    if (norm(f.name) === 'forma salvaje' && features.some(feature => norm(feature.name) === 'archidruida')) maximum = -1;
    return { id: f.id, name: f.name, max: maximum, spent: c.resourcesSpent[f.id] ?? 0, recovery, source: f.source };
  });
  const spellcasting: DerivedCharacter['spellcasting'] = [];
  for (const { entry, cls, casting, row } of classes) {
    if (!casting || !row) continue;
    const slots = [...row.slots], maxSpellLevel = slots.reduce((max, count, i) => count > 0 ? i + 1 : max, 0);
    if (!maxSpellLevel && !(row.cantrips && row.cantrips > 0)) continue;
    const modifier = abilities[casting.ability].modifier;
    const preparedLimit = casting.preparedFormula ? Math.max(1, (casting.preparedFormula === 'halfLevel+ability' ? Math.floor(entry.level / 2) : entry.level) + modifier) : null;
    spellcasting.push({ classId: cls.id, ability: casting.ability, attack: value(`spellAttack.${cls.id}`, [{ label: ABILITIES.find(a => a.id === casting.ability)!.label, value: modifier }, { label: 'Competencia', value: proficiency.value }]), dc: value(`spellDC.${cls.id}`, [{ label: 'Base', value: 8 }, { label: ABILITIES.find(a => a.id === casting.ability)!.label, value: modifier }, { label: 'Competencia', value: proficiency.value }]), maxSpellLevel, cantrips: row.cantrips, knownLimit: row.knownSpells, preparedLimit, slots, pact: casting.mode === 'pact' || casting.progression === 'pact' });
  }
  const casters = spellcasting.filter(s => !s.pact);
  let slots: number[] = casters[0]?.slots ?? [];
  if (casters.length > 1) {
    const casterData = classes.filter(cl => casters.some(sc => sc.classId === cl.cls.id));
    {
      const full = casterData.filter(cl => cl.casting?.progression === 'full').reduce((n, cl) => n + cl.entry.level, 0);
      // Artificer exception explicitly printed on p.105; the shared table is p.452.
      const artificer = casterData.filter(cl => /artificiero/.test(norm(cl.cls.name))).reduce((n, cl) => n + Math.ceil(cl.entry.level / 2), 0);
      const half = casterData.filter(cl => cl.casting?.progression === 'half' && !/artificiero/.test(norm(cl.cls.name))).reduce((n, cl) => n + Math.floor(cl.entry.level / 2), 0);
      const third = casterData.filter(cl => cl.casting?.progression === 'third').reduce((n, cl) => n + Math.floor(cl.entry.level / 3), 0);
      slots = [...(MULTICLASS_SLOTS[Math.min(20, full + half + third + artificer)] ?? [])];
    }
  }
  slots = Array.from({ length: Math.max(slots.length, ...Object.keys(c.manualOverrides).filter(k => /^slotMax\.\d$/.test(k)).map(k => Number(k.slice(8))), 0) }, (_, i) => c.manualOverrides[`slotMax.${i + 1}`] ?? slots[i] ?? 0);
  const pactSlots = spellcasting.filter(s => s.pact).map(s => ({ classId: s.classId, level: s.maxSpellLevel, max: s.slots[s.maxSpellLevel - 1] ?? 0 }));
  const warlockLevel = c.classes.find(entry => entry.classId === 'class-brujo')?.level ?? 0;
  const grimoireSlots = features.some(feature => feature.id === GRIMOIRE_FEATURE_ID)
    ? Array.from({ length: 5 }, (_, index) => GRIMOIRE_SLOT_GAINS.filter(gain => gain.level <= warlockLevel && gain.slot === index + 1).length)
    : [];
  const strings = (kind: 'languages' | 'senses' | 'resistances' | 'immunities', effect: string) => unique([...raceData.flatMap(r => r[kind]), ...c.manual[kind], ...effectRows(effect).flatMap(x => typeof x.effect.value === 'string' ? [x.effect.value] : [])]);
  const first = classes[0]?.cls;
  const proficiencies = unique([...(first ? [...first.armorProficiencies, ...first.weaponProficiencies, ...first.toolProficiencies.filter(name => !/elecci[oó]n/.test(name))] : []), ...(background?.toolProficiencies ?? []), ...classes.slice(1).flatMap(cl => MULTICLASS_PROFICIENCIES[norm(cl.cls.name)] ?? []), ...c.manual.proficiencies, ...effectRows('proficiency').flatMap(x => typeof x.effect.value === 'string' ? [x.effect.value] : [])].map(proficiencyLabel));
  warnings.push(...raceData.flatMap(r => r.automationNotes ?? []), ...classes.flatMap(d => d.cls.automationNotes ?? []), ...catalog.feats.filter(f => selectedFeatIds(c, catalog).includes(f.id)).flatMap(f => f.automationNotes ?? []));
  // Channel Divinity multiclass p.451 grants new effects, never additive uses.
  const divinity = resources.filter(r => norm(r.name) === 'canalizar divinidad');
  const mergedResources = divinity.length > 1 ? resources.filter(r => !divinity.slice(1).some(other => other.id === r.id)).map(r => r.id === divinity[0].id ? { ...r, max: Math.max(...divinity.map(x => x.max)), spent: Math.max(...divinity.map(x => x.spent)) } : r) : resources;
  return { level, proficiency, abilities, saves, skills, hpMax, ac, initiative, speed, passivePerception, features, resources: mergedResources, spellcasting, slots, pactSlots, grimoireSlots, languages: unique([...strings('languages', 'language'), ...(background?.languages ?? [])]), senses: strings('senses', 'sense'), resistances: strings('resistances', 'resistance'), immunities: strings('immunities', 'immunity'), proficiencies, warnings: unique(warnings) };
}

function spellClassAllowed(spell: Spell, classId: string, c: Character, catalog: Catalog) {
  const cls = catalog.classes.find(cl => cl.id === classId);
  const metadata = spell as Spell & { optionalForClasses?: string[]; availableToSubclasses?: string[]; dmAccessForClasses?: string[] };
  const optional = metadata.optionalForClasses ?? [], subclass = c.classes.find(cl => cl.classId === classId)?.subclassId;
  const direct = spell.availableToClasses.some(id => id === classId || (cls && norm(id) === norm(cls.name)));
  const referenceClass = cls?.spellListClassId ? catalog.classes.find(item => item.id === cls.spellListClassId) : undefined;
  const referenceAccess = referenceClass && spell.availableToClasses.some(id => id === referenceClass.id || norm(id) === norm(referenceClass.name)) && (!optional.includes(referenceClass.id) || !!c.choices[`optional-spells.${classId}`]?.includes('enabled'));
  const genieAccess = subclass === 'subclass-brujo-el-genio' && (genieExpandedSpells.common.includes(spell.id) || (genieExpandedSpells as Record<string, string[]>)[c.choices['subclass-genie.warlock']?.[0]]?.includes(spell.id));
  const expanded = cls?.subclasses.find(item => item.id === subclass)?.expandedSpellIds;
  const subclassAccess = !!subclass && (metadata.availableToSubclasses?.includes(subclass) || (subclassSpellAccess as Record<string, string[]>)[subclass]?.includes(spell.id) || expanded?.includes(spell.id) || genieAccess);
  const dmAccess = metadata.dmAccessForClasses?.includes(classId) && c.choices[`optional-spells.${classId}`]?.includes('enabled');
  return !!(direct || referenceAccess || subclassAccess || dmAccess) && (!optional.includes(classId) || !!c.choices[`optional-spells.${classId}`]?.includes('enabled'));
}

/** Racial and selected feat cantrips remain separate from class known/prepared limits. */
export function getGrantedSpells(c: Character, catalog: Catalog): Spell[] {
  const ids = [...effectsFor(c, catalog, activeFeatures(c, catalog)).filter(x => ['grant_spell', 'spell'].includes(x.effect.type)).map(x => x.effect.spellId), ...c.classes.flatMap(entry => {
    const subclass = catalog.classes.find(cls => cls.id === entry.classId)?.subclasses.find(sub => sub.id === entry.subclassId);
    return (subclass?.featureIds ?? []).flatMap(id => [...((subclassSpellGrants as Record<string, {level:number;spellId:string}[]>)[id] ?? []), ...((subclassDirectSpellGrants as Record<string, {level:number;spellId:string}[]>)[id] ?? [])].filter(grant => grant.level <= entry.level).map(grant => grant.spellId));
  }), ...c.classes.filter(entry => entry.subclassId === 'subclass-druida-circulo-de-la-tierra').flatMap(entry => (subclassLandSpells as Record<string, {level:number;spellId:string}[]>)[c.choices['subclass-land.druid']?.[0]]?.filter(grant => grant.level <= entry.level).map(grant => grant.spellId) ?? [])];
  return catalog.spells.filter(spell => ids.includes(spell.id));
}

export function getClassGrantedSpells(c: Character, classId: string, catalog: Catalog): Spell[] {
  const entry = c.classes.find(cl => cl.classId === classId);
  const subclass = catalog.classes.find(cls => cls.id === classId)?.subclasses.find(sub => sub.id === entry?.subclassId);
  if (!entry || !subclass) return [];
  const ids = [...subclass.featureIds.flatMap(id => {
    const feature = catalog.features.find(item => item.id === id);
    if (feature?.level !== null && feature?.level !== undefined && feature.level > entry.level) return [];
    return [...(feature?.effects ?? []).filter(effect => ['grant_spell', 'spell'].includes(effect.type) && (!effect.level || effect.level <= entry.level)).map(effect => effect.spellId), ...[...((subclassSpellGrants as Record<string, {level:number;spellId:string}[]>)[id] ?? []), ...((subclassDirectSpellGrants as Record<string, {level:number;spellId:string}[]>)[id] ?? [])].filter(grant => grant.level <= entry.level).map(grant => grant.spellId)];
  }), ...(subclass.id === 'subclass-druida-circulo-de-la-tierra' ? (subclassLandSpells as Record<string, {level:number;spellId:string}[]>)[c.choices['subclass-land.druid']?.[0]]?.filter(grant => grant.level <= entry.level).map(grant => grant.spellId) ?? [] : [])];
  return catalog.spells.filter(spell => ids.includes(spell.id));
}

export function isAttackSpell(spell: Spell): boolean {
  return /(?:haz|realiza|realizar|efectúa|haces|realizas)\s+(?:un|una)\s+ataque(?:\s+\w+){0,5}\s+(?:de|con)\s+conjuro/i.test(spell.description) || /(?:haz|realiza|efectúa)\s+una\s+tirada\s+de\s+ataque\s+de\s+conjuro/i.test(spell.description);
}

/** Fixed subclass cantrips occupy one of that subclass's known-cantrip slots. */
export function getFixedClassCantrips(c: Character, classId: string, catalog: Catalog): Spell[] {
  const subclassId = c.classes.find(entry => entry.classId === classId)?.subclassId;
  if (!subclassId) return [];
  const ids = activeFeatures(c, catalog).filter(feature => feature.originId === subclassId).flatMap(feature => (feature.effects ?? []).filter(effect => effect.type === 'grant_spell').map(effect => effect.spellId));
  return catalog.spells.filter(spell => spell.level === 0 && ids.includes(spell.id));
}

export function deriveAttack(c: Character, attack: Attack, catalog: Catalog): { attack: DerivedValue; damageBonus: number } {
  const d = deriveCharacter(c, catalog), modifier = attack.ability === 'none' ? 0 : d.abilities[attack.ability].modifier;
  const breakdown = [{ label: attack.ability === 'none' ? 'Sin característica' : ABILITIES.find(a => a.id === attack.ability)!.label, value: modifier }, { label: 'Competencia', value: attack.proficient ? d.proficiency.value : 0 }, ...(attack.magicBonus ? [{ label: 'Bonificación mágica', value: attack.magicBonus }] : []), { label: 'Bonificación adicional manual', value: attack.bonus }];
  const automatic = breakdown.reduce((sum, row) => sum + row.value, 0), override = c.manualOverrides[`attack.${attack.id}`];
  const overridden = Number.isFinite(override);
  if (overridden) breakdown.push({ label: 'Sustitución manual (diferencia)', value: override - automatic });
  return { attack: { value: overridden ? override : automatic, mode: overridden ? 'override' : 'auto', breakdown }, damageBonus: (attack.damageBonus ?? modifier) + (attack.magicBonus ?? 0) };
}

/** Source p.307–308: six at first wizard level, two per later wizard level; copying has no maximum. */
export function spellbookMinimum(c: Character, classId: string, catalog: Catalog): number | null {
  const data = classData(c, catalog).find(cl => cl.cls.id === classId);
  return data?.casting?.mode === 'spellbook' && norm(data.cls.name) === 'mago' ? 6 + 2 * (data.entry.level - 1) : null;
}

export function validSpells(c: Character, classId: string, catalog: Catalog): Spell[] {
  const casting = deriveCharacter(c, catalog).spellcasting.find(s => s.classId === classId);
  if (!casting) return [];
  const data = classData(c, catalog).find(cl => cl.cls.id === classId);
  const spellClass = data?.sub?.spellcasting && !data.cls.spellcasting ? catalog.classes.find(cl => norm(cl.name) === 'mago')?.id ?? classId : classId;
  return catalog.spells.filter(s => s.level !== null && s.level <= casting.maxSpellLevel && spellClassAllowed(s, spellClass, c, catalog));
}

export function checkPrerequisites(reqs: Prerequisite[], c: Character, catalog: Catalog): string[] {
  if (!reqs.length) return [];
  const d = deriveCharacter(c, catalog);
  const check = (r: Prerequisite): string[] => {
    switch (r.type) {
      case 'ability': case 'minimum_ability': return r.ability && d.abilities[r.ability].total < (r.minimum ?? Number(r.value) ?? 0) ? [`Requiere ${ABILITIES.find(a => a.id === r.ability)!.label} ${r.minimum ?? r.value}.`] : [];
      case 'any': return (r.options ?? []).some(o => !check(o).length) ? [] : [`Requiere una alternativa: ${(r.options ?? []).flatMap(check).join(' ')}`];
      case 'all': return (r.options ?? []).flatMap(check);
      case 'level': case 'minimum_level': return d.level < (r.minimum ?? Number(r.value)) ? [`Requiere nivel ${r.minimum ?? r.value}.`] : [];
      case 'class': return c.classes.some(cl => (cl.classId === r.value || norm(catalog.classes.find(x => x.id === cl.classId)?.name ?? '') === norm(String(r.value))) && cl.level >= (r.minimum ?? 1)) ? [] : [`Requiere ${r.value}${r.minimum ? ` de nivel ${r.minimum}` : ''}.`];
      case 'race': return races(c, catalog).some(x => x.id === r.value || norm(x.name) === norm(String(r.value)) || (Array.isArray(r.values) && r.values.includes(x.id))) ? [] : [`Requiere raza ${r.value ?? (Array.isArray(r.values) ? r.values.join(' / ') : '')}.`];
      case 'spellcasting': return d.spellcasting.length || getGrantedSpells(c, catalog).length ? [] : ['Requiere capacidad de lanzar conjuros.'];
      case 'proficiency': {
        const words = (text: string) => norm(text).split(/\W+/).filter(w => !['de', 'con', 'en', 'la', 'las', 'los', 'el'].includes(w)).map(w => w.replace(/s$/, ''));
        return d.proficiencies.some(p => words(String(r.value)).every(w => words(p).includes(w))) ? [] : [`Requiere competencia: ${r.value}.`];
      }
      case 'skill_proficiency': {
        const skill = d.skills[skillId(String(r.value))];
        return skill?.breakdown.some(row => /competencia|pericia/i.test(row.label) && row.value > 0) ? [] : [`Requiere competencia en ${SKILLS.find(s => s.id === r.value)?.name ?? r.value}.`];
      }
      case 'source_requirement': {
        const required = norm(String(r.value)), current = races(c, catalog);
        const has = (name: string) => current.some(race => norm(race.name).includes(name));
        const matches = required === 'enano o una raza pequena' ? has('enano') || current.some(race => /pequen/.test(norm(race.size ?? ''))) : required === 'elfo (drow)' ? has('drow') : required === 'elfo (bosque)' ? current.some(race => /elfo.*bosque|bosque.*elfo/.test(norm(race.name))) : required === 'elfo (alto)' ? current.some(race => /alto.*elfo|elfo.*alto/.test(norm(race.name))) : required.split(/,|\s+o\s+/).some(name => has(name.trim()));
        return matches ? [] : [`Requiere ${r.value}.`];
      }
      case 'feat': return selectedFeatIds(c, catalog).includes(String(r.value)) ? [] : [`Requiere dote ${r.value}.`];
      case 'feature': return d.features.some(f => f.id === r.value || norm(f.name) === norm(String(r.value))) ? [] : [`Requiere rasgo ${catalog.features.find(f => f.id === r.value)?.name ?? r.value}.`];
      case 'spell': return Object.values(c.spellSelections).some(s => s.known.includes(String(r.value)) || s.prepared.includes(String(r.value))) || getGrantedSpells(c, catalog).some(s => s.id === r.value) ? [] : [`Requiere conocer el conjuro ${r.value}.`];
      case 'requires_manual_verification': return typeof r.verificationChoiceId === 'string' && c.choices[r.verificationChoiceId]?.includes('confirmed') ? [] : [`Requiere verificar en el manual: ${r.value ?? r.description ?? 'requisito sin estructurar'}.`];
      // Unknown requirements must never authorize an option silently.
      default: return [`Requisito pendiente de verificación: ${r.value ?? r.type}.`];
    }
  };
  return reqs.flatMap(check);
}

function choiceSelected(c: Character, choice: Choice) {
  return choice.type === 'subclass' ? [c.classes.find(cl => cl.classId === choice.classId)?.subclassId ?? ''].filter(Boolean) : c.choices[choice.id] ?? [];
}

export function eligibleExpertiseOptions(c: Character, choice: Choice, catalog: Catalog): string[] {
  const before = { ...c, choices: { ...c.choices, [choice.id]: [] } };
  const derived = deriveCharacter(before, catalog);
  const used = new Set(getAllChoices(c, catalog).filter(other => other.id !== choice.id).flatMap(other => (c.choices[other.id] ?? []).filter(id => other.type === 'expertise' || (other.options.find(option => optionId(option) === id) as ChoiceOption | undefined)?.effects?.some(effect => effect.type === 'skill_expertise'))));
  return choice.options.map(optionId).filter(id => {
    if (used.has(id)) return false;
    const skill = derived.skills[skillId(id)];
    return skill
      ? skill.breakdown.some(row => /competencia|pericia/i.test(row.label) && row.value > 0)
      : derived.proficiencies.some(proficiency => proficiencyName(proficiency) === proficiencyName(id));
  });
}

function choiceErrors(c: Character, choice: Choice, catalog: Catalog): string[] {
  const selected = choiceSelected(c, choice), errors: string[] = [], allowed = choice.options.map(optionId);
  if (choice.type === 'asi') {
    if (!(selected.length === 1 && selected[0].startsWith('feat:')) && !(selected.length === 2 && selected.every(id => id.startsWith('ability:')))) errors.push(`${choice.name}: elige dos aumentos de +1 o una dote.`);
  } else {
    if (selected.length < choice.amount && choice.required !== false) errors.push(`${choice.name}: faltan ${choice.amount - selected.length} elecciones.`);
    if (selected.length > choice.amount) errors.push(`${choice.name}: se permiten ${choice.amount} elecciones.`);
    if (new Set(selected).size !== selected.length) errors.push(`${choice.name}: hay elecciones repetidas.`);
    if (choice.distinctCategories) {
      const categories = selected.flatMap(id => { const option = choice.options.find(o => optionId(o) === id); return option && typeof option !== 'string' ? (option.effects ?? []).flatMap(e => e.category ? [e.category] : []) : []; });
      if (new Set(categories).size !== categories.length) errors.push(`${choice.name}: elige opciones de categorías distintas.`);
    }
  }
  selected.forEach(id => {
    const freeText = !allowed.length && ['choose_language', 'choose_tool'].includes(choice.type);
    if (!(freeText ? id.trim().length > 0 && id.length <= 200 : allowed.includes(id))) errors.push(`${choice.name}: opción no válida (${id}).`);
    const option = choice.options.find(o => optionId(o) === id);
    if (option && typeof option !== 'string') {
      const checkCharacter = option.effects?.some(effect => effect.type === 'skill_expertise') ? { ...c, choices: { ...c.choices, [choice.id]: [] } } : c;
      errors.push(...checkPrerequisites(option.prerequisites ?? [], checkCharacter, catalog).map(e => `${option.name}: ${e}`));
    }
    if (choice.distinctFrom?.some(other => c.choices[other]?.includes(id))) errors.push(`${choice.name}: ${id} ya se ha elegido en otra selección incompatible.`);
    const selectedLanguages = choice.type === 'choose_language' ? [id] : option && typeof option !== 'string' ? (option.effects ?? []).filter(effect => effect.type === 'language').map(effect => String(effect.value)) : [];
    if (selectedLanguages.length) {
      const before = { ...c, choices: { ...c.choices, [choice.id]: [] } };
      const known = deriveCharacter(before, catalog).languages.map(norm);
      selectedLanguages.forEach(language => { if (known.includes(norm(language))) errors.push(`${choice.name}: ya conoces ${language}; elige otro idioma.`); });
    }
    if (choice.type === 'expertise') {
      const alreadyExpert = getAllChoices(c, catalog).some(other => other.type === 'expertise' && other.id !== choice.id && c.choices[other.id]?.includes(id));
      if (alreadyExpert) errors.push(`${choice.name}: la pericia ${id} ya está elegida.`);
      if (!alreadyExpert && !eligibleExpertiseOptions(c, choice, catalog).includes(id)) errors.push(`${choice.name}: necesitas competencia previa en ${SKILLS.find(s => s.id === id)?.name ?? id}.`);
    }
  });
  return errors;
}

export function getPendingChoices(c: Character, catalog: Catalog): Choice[] {
  const pending = getAllChoices(c, catalog).filter(ch => choiceErrors(c, ch, catalog).length > 0);
  const d = deriveCharacter(c, catalog);
  for (const caster of d.spellcasting) {
    const selection = c.spellSelections[caster.classId] ?? { known: [], prepared: [] };
    const options = validSpells(c, caster.classId, catalog);
    const grantedIds = new Set(getClassGrantedSpells(c, caster.classId, catalog).map(spell => spell.id));
    const fixedCantrips = getFixedClassCantrips(c, caster.classId, catalog);
    if (caster.cantrips !== null && unique([...selection.known.filter(id => catalog.spells.find(s => s.id === id)?.level === 0), ...fixedCantrips.map(s => s.id)]).length !== caster.cantrips) pending.push({ id: `cantrips.${caster.classId}`, type: 'cantrips', name: 'Trucos conocidos', amount: caster.cantrips, classId: caster.classId, required: true, options: options.filter(s => s.level === 0 && !fixedCantrips.some(fixed => fixed.id === s.id)).map(s => ({ id: s.id, name: s.name })) });
    if (caster.knownLimit !== null && selection.known.filter(id => !grantedIds.has(id) && (catalog.spells.find(s => s.id === id)?.level ?? 0) > 0).length !== caster.knownLimit) pending.push({ id: `known.${caster.classId}`, type: 'spells', name: 'Conjuros conocidos', amount: caster.knownLimit, classId: caster.classId, required: true, options: options.filter(s => s.level! > 0 && !grantedIds.has(s.id)).map(s => ({ id: s.id, name: s.name })) });
    const bookMinimum = spellbookMinimum(c, caster.classId, catalog);
    if (bookMinimum !== null && selection.known.filter(id => (catalog.spells.find(s => s.id === id)?.level ?? 0) > 0).length < bookMinimum) pending.push({ id: `book.${caster.classId}`, type: 'spells', name: 'Conjuros en el libro (mínimo)', amount: bookMinimum, minimum: true, classId: caster.classId, required: true, source: { page: 307, endPage: 308 }, options: options.filter(s => s.level! > 0).map(s => ({ id: s.id, name: s.name })) });
    if (caster.preparedLimit !== null && !selection.prepared.length && caster.preparedLimit > 0) pending.push({ id: `prepared.${caster.classId}`, type: 'prepared', name: 'Conjuros preparados', amount: caster.preparedLimit, classId: caster.classId, required: false, options: options.filter(s => s.level! > 0).map(s => ({ id: s.id, name: s.name })) });
  }
  return pending;
}

function multiclassErrors(c: Character, catalog: Catalog) {
  if (c.classes.length < 2) return [];
  const d = deriveCharacter(c, catalog), errors: string[] = [];
  classData(c, catalog).forEach(({ cls }) => {
    const requirements = cls.multiclassRequirements;
    if (!requirements?.length) return;
    if (/guerrero/.test(norm(cls.name))) {
      if (d.abilities.str.total < 13 && d.abilities.dex.total < 13) errors.push('Multiclase guerrero: requiere Fuerza 13 o Destreza 13 (p. 450).');
    } else requirements.forEach(r => { if (d.abilities[r.ability].total < r.minimum) errors.push(`Multiclase ${cls.name}: requiere ${ABILITIES.find(a => a.id === r.ability)!.label} ${r.minimum} (p. 450).`); });
  });
  return errors;
}

export function validateCharacter(c: Character, catalog: Catalog): string[] {
  const errors: string[] = [], d = deriveCharacter(c, catalog);
  if (!c.name.trim()) errors.push('Introduce un nombre para el personaje.');
  const race = catalog.races.find(r => r.id === c.raceId);
  if (!race) errors.push('Selecciona una raza o linaje válido.');
  if (catalog.races.some(r => r.parentId === c.raceId && r.kind === 'subrace') && !c.subraceId) errors.push('Selecciona una subraza.');
  if (c.subraceId && !catalog.races.some(r => r.id === c.subraceId && r.parentId === c.raceId)) errors.push('La subraza no pertenece a la raza elegida.');
  if (!c.classes.length) errors.push('Selecciona una clase.');
  if (d.level > 20 || d.level < 1) errors.push('El nivel total debe estar entre 1 y 20.');
  if (new Set(c.classes.map(cl => cl.classId)).size !== c.classes.length) errors.push('Cada clase debe aparecer una sola vez.');
  c.classes.forEach(cl => {
    const cls = catalog.classes.find(x => x.id === cl.classId);
    if (!cls) errors.push(`Clase no disponible: ${cl.classId}.`);
    if (!Number.isInteger(cl.level) || cl.level < 1 || cl.level > 20) errors.push('Nivel de clase inválido.');
    if (cl.subclassId && (!cls?.subclasses.some(s => s.id === cl.subclassId) || (cls.subclassLevel && cl.level < cls.subclassLevel))) errors.push(`Subclase inválida para ${cls?.name ?? cl.classId} y su nivel.`);
  });
  ABILITIES.forEach(a => {
    if (!Number.isInteger(c.abilities[a.id]) || c.abilities[a.id] < 1 || c.abilities[a.id] > 30) errors.push(`${a.label}: introduce una puntuación base entre 1 y 30.`);
    const asi = getAllChoices(c, catalog).filter(ch => ch.type === 'asi').some(ch => c.choices[ch.id]?.includes(`ability:${a.id}`));
    if (asi && d.abilities[a.id].total > 20) errors.push(`${a.label}: una mejora de característica no puede superar 20.`);
  });
  if (c.hp.rolls.length !== Math.max(0, d.level - 1)) errors.push('Completa los PG de cada nivel posterior al primero.');
  c.hp.rolls.forEach((roll, i) => {
    const die = catalog.classes.find(cl => cl.id === roll.classId)?.hitDie;
    if (!c.classes.some(cl => cl.classId === roll.classId) || !Number.isInteger(roll.value) || roll.value < 1 || (die && roll.value > die)) errors.push(`PG del nivel ${i + 2}: elige una tirada válida${die ? ` entre 1 y ${die}` : ''}.`);
  });
  c.classes.forEach((cl, i) => { if (c.hp.rolls.filter(roll => roll.classId === cl.classId).length !== cl.level - (i === 0 ? 1 : 0)) errors.push(`PG: el número de tiradas de ${catalog.classes.find(x => x.id === cl.classId)?.name ?? cl.classId} no coincide con sus niveles.`); });
  for (const ch of getAllChoices(c, catalog)) errors.push(...choiceErrors(c, ch, catalog));
  selectedFeatIds(c, catalog).forEach(id => { const feat = catalog.feats.find(f => f.id === id); errors.push(...(feat ? checkPrerequisites(feat.prerequisites, c, catalog).map(e => `${feat.name}: ${e}`) : [`Dote no disponible: ${id}.`])); });
  Object.entries(c.spellSelections).forEach(([classId, selection]) => {
    const caster = d.spellcasting.find(sc => sc.classId === classId);
    if (!caster) { if (selection.known.length || selection.prepared.length) errors.push(`La clase ${classId} no dispone de lanzamiento de conjuros a este nivel.`); return; }
    const valid = new Set([...validSpells(c, classId, catalog), ...getClassGrantedSpells(c, classId, catalog)].map(s => s.id));
    unique([...selection.known, ...selection.prepared]).forEach(id => { if (!valid.has(id)) errors.push(`Conjuro no disponible para clase y nivel: ${catalog.spells.find(s => s.id === id)?.name ?? id}.`); });
    if (new Set(selection.known).size !== selection.known.length || new Set(selection.prepared).size !== selection.prepared.length) errors.push('No se pueden repetir conjuros en una misma lista.');
    if (selection.prepared.some(id => catalog.spells.find(s => s.id === id)?.level === 0)) errors.push('Los trucos se conocen, no se preparan.');
    if (caster.preparedLimit !== null && selection.prepared.length > caster.preparedLimit) errors.push(`Demasiados conjuros preparados: máximo ${caster.preparedLimit}.`);
    const mode = classData(c, catalog).find(x => x.cls.id === classId)?.casting?.mode;
    if (mode === 'spellbook' && selection.prepared.some(id => !selection.known.includes(id))) errors.push('Solo puedes preparar conjuros presentes en tu libro.');
  });
  getPendingChoices(c, catalog).filter(ch => ch.type === 'cantrips' || ch.type === 'spells').forEach(ch => errors.push(`${ch.name}: selecciona ${ch.amount} para ${catalog.classes.find(cl => cl.id === ch.classId)?.name ?? ch.classId}.`));
  return unique([...errors, ...multiclassErrors(c, catalog)]);
}

export function planLevelUp(c: Character, classId: string, catalog: Catalog): { next: Character; changes: string[]; choices: Choice[]; errors: string[] } {
  const cls = catalog.classes.find(cl => cl.id === classId), next = clone(c), errors: string[] = [];
  if (!cls) return { next, changes: [], choices: [], errors: ['Clase no disponible.'] };
  if (totalLevel(c) >= 20) return { next, changes: [], choices: [], errors: ['El personaje ya ha alcanzado nivel 20.'] };
  const entry = next.classes.find(cl => cl.classId === classId);
  if (entry) entry.level++; else next.classes.push({ classId, level: 1 });
  if (totalLevel(c) > 0) next.hp.rolls.push({ classId, value: 0 });
  errors.push(...multiclassErrors(next, catalog));
  return { next, changes: summarizeLevelUp(c, next, catalog), choices: getPendingChoices(next, catalog), errors };
}

/** Recompute the review from the actual draft, including ASIs and spell choices. */
export function summarizeLevelUp(c: Character, next: Character, catalog: Catalog): string[] {
  const before = deriveCharacter(c, catalog), after = deriveCharacter(next, catalog);
  const changes = [`Nivel total ${before.level} → ${after.level}`];
  next.classes.filter(cl => cl.level !== c.classes.find(old => old.classId === cl.classId)?.level).forEach(cl => {
    const cls = catalog.classes.find(x => x.id === cl.classId);
    changes.push(`${cls?.name ?? cl.classId} ${cl.level}`, `+1 dado de golpe d${cls?.hitDie ?? '?'}`);
  });
  ABILITIES.forEach(a => { if (before.abilities[a.id].total !== after.abilities[a.id].total) changes.push(`${a.label}: ${before.abilities[a.id].total} → ${after.abilities[a.id].total}`); });
  if (before.hpMax.value !== after.hpMax.value) changes.push(`PG máximos: ${before.hpMax.value} → ${after.hpMax.value}`);
  after.features.filter(f => !before.features.some(old => old.id === f.id)).forEach(f => changes.push(`Rasgo: ${f.name}`));
  if (before.proficiency.value !== after.proficiency.value) changes.push(`Competencia +${before.proficiency.value} → +${after.proficiency.value}`);
  if (JSON.stringify(before.slots) !== JSON.stringify(after.slots)) changes.push(`Espacios de conjuro: ${after.slots.flatMap((n, i) => n ? [`${n} de nivel ${i + 1}`] : []).join(', ')}`);
  if (JSON.stringify(before.pactSlots) !== JSON.stringify(after.pactSlots)) after.pactSlots.forEach(p => changes.push(`Magia de pacto: ${p.max} espacios de nivel ${p.level}`));
  after.resources.forEach(r => { const old = before.resources.find(x => x.id === r.id); if (!old || old.max !== r.max) changes.push(`${r.name}: ${old?.max ?? 0} → ${r.max} usos`); });
  after.spellcasting.forEach(sc => { const old = before.spellcasting.find(x => x.classId === sc.classId); if (sc.cantrips !== old?.cantrips) changes.push(`Trucos: ${sc.cantrips ?? 'manual'}`); if (sc.knownLimit !== old?.knownLimit) changes.push(`Conjuros conocidos: ${sc.knownLimit ?? 'manual'}`); if (sc.preparedLimit !== old?.preparedLimit) changes.push(`Conjuros preparados: hasta ${sc.preparedLimit ?? 'manual'}`); });
  after.spellcasting.forEach(sc => { const minimum = spellbookMinimum(next, sc.classId, catalog); if (minimum !== null && minimum !== spellbookMinimum(c, sc.classId, catalog)) changes.push(`Libro de conjuros: al menos ${minimum} hechizos de nivel 1 o superior`); });
  return changes;
}

/** A level increases current HP by the same amount as maximum HP, preserving damage. */
export function levelUpCurrentHp(original: Character, draft: Character, catalog: Catalog): number {
  const previousMax = deriveCharacter(original, catalog).hpMax.value;
  const newMax = deriveCharacter(draft, catalog).hpMax.value;
  return Math.max(0, Math.min(newMax, original.hp.current + newMax - previousMax));
}

export function applyLevelUp(original: Character, draft: Character, catalog: Catalog): Character {
  if (original.id !== draft.id || totalLevel(draft) !== totalLevel(original) + 1) throw new Error('La subida debe conservar el personaje y añadir exactamente un nivel.');
  const differences = draft.classes.filter(cl => cl.level !== (original.classes.find(old => old.classId === cl.classId)?.level ?? 0));
  if (differences.length !== 1 || differences[0].level !== (original.classes.find(cl => cl.classId === differences[0].classId)?.level ?? 0) + 1 || original.classes.some(cl => !draft.classes.some(next => next.classId === cl.classId))) throw new Error('La subida solo puede incrementar una clase.');
  const errors = validateCharacter(draft, catalog);
  if (errors.length) throw new Error(errors.join('\n'));
  const previous = clone(original); delete previous.lastLevelSnapshot; delete previous.lastLevelAppliedSnapshot;
  const next = clone(draft);
  next.hp.current = levelUpCurrentHp(original, draft, catalog);
  if (original.hp.current === 0 && next.hp.current > 0) next.deathSaves = { successes: 0, failures: 0 };
  delete next.lastLevelSnapshot; delete next.lastLevelAppliedSnapshot;
  next.lastLevelAppliedSnapshot = JSON.stringify(next);
  next.lastLevelSnapshot = JSON.stringify(previous);
  return withHistory(next, `Subió a nivel ${totalLevel(next)} · ${catalog.classes.find(cl => cl.id === differences[0].classId)?.name ?? differences[0].classId} ${differences[0].level}`);
}

export function undoLevelUp(c: Character, catalog?: Catalog): Character {
  if (!c.lastLevelSnapshot) return c;
  let previous: Character;
  try { previous = JSON.parse(c.lastLevelSnapshot) as Character; } catch { throw new Error('No se puede leer la instantánea de nivel.'); }
  if (previous.schemaVersion !== 1 || previous.id !== c.id || !Array.isArray(previous.classes) || totalLevel(previous) !== totalLevel(c) - 1) throw new Error('La instantánea de nivel no es válida.');
  if (!c.lastLevelAppliedSnapshot) throw new Error('Esta subida se guardó antes del deshacer seguro. No se puede restaurar sin riesgo de borrar cambios posteriores.');
  let applied: Character;
  try { applied = JSON.parse(c.lastLevelAppliedSnapshot) as Character; } catch { throw new Error('No se puede leer el resultado de la subida.'); }
  if (applied.id !== c.id || totalLevel(applied) !== totalLevel(c)) throw new Error('El resultado de la subida no coincide con este personaje.');
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
  const merge = (before: unknown, after: unknown, now: unknown, path = ''): unknown => {
    if (same(before, after)) return now;
    if (path === 'classes') {
      const oldClasses = before as Character['classes'], newClasses = after as Character['classes'];
      const current = clone(now as Character['classes']);
      const leveled = newClasses.find(entry => entry.level !== (oldClasses.find(old => old.classId === entry.classId)?.level ?? 0));
      if (!leveled) throw new Error('No se identifica la clase de la subida.');
      const old = oldClasses.find(entry => entry.classId === leveled.classId);
      if (!old) return current.filter(entry => entry.classId !== leveled.classId);
      const entry = current.find(item => item.classId === leveled.classId);
      if (!entry || entry.level !== leveled.level) throw new Error('La clase cambió después de la subida; revísala antes de deshacer.');
      entry.level = old.level;
      if (old.subclassId !== leveled.subclassId) entry.subclassId = old.subclassId;
      return current;
    }
    if (path === 'hp.rolls') return (now as Character['hp']['rolls']).slice(0, (before as Character['hp']['rolls']).length);
    if (Array.isArray(after) && Array.isArray(now)) {
      const old = Array.isArray(before) ? before : [];
      if (path === 'featIds' || /^spellSelections\.[^.]+\.(known|prepared)$/.test(path)) {
        const added = after.filter(value => !old.includes(value));
        return [...old.filter(value => !after.includes(value)), ...now.filter(value => !added.includes(value))];
      }
      return same(now, after) ? before : now;
    }
    if (isRecord(before) || isRecord(after)) {
      const old = isRecord(before) ? before : {}, result: Record<string, unknown> = isRecord(now) ? clone(now) : {};
      const newer = isRecord(after) ? after : {};
      for (const key of new Set([...Object.keys(old), ...Object.keys(newer)])) {
        if (same(old[key], newer[key])) continue;
        const childPath = path ? `${path}.${key}` : key;
        if (path === 'choices' && !(key in old)) { delete result[key]; continue; }
        const merged = merge(old[key], newer[key], result[key], childPath);
        if (merged === undefined) delete result[key]; else result[key] = merged;
      }
      return result;
    }
    return same(now, after) ? before : now;
  };
  const result = merge(previous, applied, c) as Character;
  delete result.lastLevelSnapshot; delete result.lastLevelAppliedSnapshot;
  if (catalog) {
    const issues = validateCharacter(result, catalog);
    if (issues.length) throw new Error(`La ficha necesita revisión antes de deshacer el nivel: ${issues[0]}`);
  }
  return withHistory(result, 'Se deshizo la última subida de nivel, conservando los cambios posteriores compatibles.');
}

export function applyDamage(c: Character, amount: number, _catalog?: Catalog): Character {
  if (!Number.isFinite(amount) || amount < 0) throw new Error('El daño debe ser una cantidad positiva.');
  const next = clone(c), damage = Math.floor(amount), absorbed = Math.min(next.hp.temp, damage);
  next.hp.temp -= absorbed; next.hp.current = Math.max(0, next.hp.current - (damage - absorbed));
  return withHistory(next, `Recibió ${damage} puntos de daño${absorbed ? ` (${absorbed} absorbidos por PG temporales)` : ''}.`);
}

export function applyHealing(c: Character, amount: number, catalog: Catalog): Character {
  if ((c.exhaustionLevel ?? 0) >= 6) throw new Error('El agotamiento de nivel 6 causa la muerte; la curación normal no resucita al personaje.');
  if (!Number.isFinite(amount) || amount < 0) throw new Error('La curación debe ser una cantidad positiva.');
  const next = clone(c); next.hp.current = Math.max(0, Math.min(deriveCharacter(c, catalog).hpMax.value, next.hp.current + Math.floor(amount)));
  if (next.hp.current > 0 && next.hp.current > c.hp.current) next.deathSaves = { successes: 0, failures: 0 };
  return withHistory(next, `Recibió ${Math.floor(amount)} puntos de curación.`);
}

function restTargets(c: Character, type: 'short' | 'long', catalog: Catalog) {
  const d = deriveCharacter(c, catalog);
  const resources = d.resources.filter(r => r.recovery !== 'manual' && (r.recovery === type || type === 'long' && r.recovery === 'short') && r.spent > 0);
  const casters = classData(c, catalog).filter(x => x.casting?.recovery === type || type === 'long' && x.casting?.recovery === 'short');
  const keys = unique([...casters.flatMap(cl => cl.casting?.mode === 'pact' ? [`pact.${cl.cls.id}`] : d.slots.map((_, i) => String(i + 1))), ...(type === 'long' ? d.grimoireSlots.map((_, i) => `grimoire.${i + 1}`) : [])]);
  return { resources, keys: keys.filter(key => (c.slotsSpent[key] ?? 0) > 0) };
}

/** The player may change this suggestion when several kinds of Hit Dice are spent. */
export function longRestHitDiceRecovery(c: Character, catalog: Catalog): Record<string, number> {
  let remaining = Math.max(1, Math.floor(totalLevel(c) / 2));
  const recovered: Record<string, number> = {};
  const classes = [...c.classes].sort((a, b) => (catalog.classes.find(cl => cl.id === b.classId)?.hitDie ?? 0) - (catalog.classes.find(cl => cl.id === a.classId)?.hitDie ?? 0));
  for (const cl of classes) {
    recovered[cl.classId] = Math.min(remaining, cl.level, c.hp.hitDiceUsed[cl.classId] ?? 0);
    remaining -= recovered[cl.classId];
  }
  return recovered;
}

function validateHitDiceRecovery(c: Character, recovered: Record<string, number>) {
  let count = 0;
  for (const [classId, amount] of Object.entries(recovered)) {
    const cls = c.classes.find(cl => cl.classId === classId);
    if (!cls || !Number.isInteger(amount) || amount < 0 || amount > Math.min(cls.level, c.hp.hitDiceUsed[classId] ?? 0)) throw new Error('Solo puedes recuperar dados de golpe gastados de tus clases.');
    count += amount;
  }
  if (count > Math.max(1, Math.floor(totalLevel(c) / 2))) throw new Error('El descanso largo recupera como máximo la mitad de tus dados de golpe, redondeando hacia abajo (mínimo 1).');
}

export function spendHitDie(c: Character, classId: string, roll: number, catalog: Catalog): Character {
  if ((c.exhaustionLevel ?? 0) >= 6) throw new Error('El agotamiento de nivel 6 causa la muerte; gastar dados de golpe no resucita al personaje.');
  const cls = c.classes.find(cl => cl.classId === classId), die = catalog.classes.find(cl => cl.id === classId)?.hitDie;
  if (!cls || !die || !Number.isInteger(roll) || roll < 1 || roll > die) throw new Error('Introduce una tirada válida del dado de golpe de esa clase.');
  if ((c.hp.hitDiceUsed[classId] ?? 0) >= cls.level) throw new Error('No quedan dados de golpe disponibles de esa clase.');
  const next = clone(c), d = deriveCharacter(c, catalog), healing = Math.max(0, roll + d.abilities.con.modifier);
  next.hp.hitDiceUsed[classId] = (next.hp.hitDiceUsed[classId] ?? 0) + 1;
  next.hp.current = Math.min(d.hpMax.value, next.hp.current + healing);
  if (next.hp.current > 0 && next.hp.current > c.hp.current) next.deathSaves = { successes: 0, failures: 0 };
  return withHistory(next, `Descanso corto: gastó 1d${die} (${roll}) + Constitución (${d.abilities.con.modifier}) y recuperó ${Math.max(0, next.hp.current - c.hp.current)} PG.`);
}

export interface RestOptions { foodAndWater?: boolean }

export function restPreview(c: Character, type: 'short' | 'long', catalog: Catalog, recoveredHitDice?: Record<string, number>, options: RestOptions = {}): string[] {
  if ((c.exhaustionLevel ?? 0) >= 6) return ['El agotamiento de nivel 6 causa la muerte. Un descanso no resucita al personaje.'];
  if (type === 'long' && c.hp.current < 1) return ['Necesitas al menos 1 PG al comenzar un descanso largo para obtener sus beneficios.'];
  const { resources, keys } = restTargets(c, type, catalog);
  const rows = [...resources.map(r => `${r.name}: recupera ${r.max === -1 ? r.spent : Math.min(r.spent, r.max)} usos.`), ...keys.map(key => key.startsWith('pact.') ? 'Recupera los espacios de magia de pacto.' : key.startsWith('grimoire.') ? `Recupera las ranuras de Grimorio Profundo de nivel ${key.slice(9)}.` : `Recupera los espacios de conjuro de nivel ${key}.`)];
  if (type === 'short') return [...rows, 'Descanso corto: al menos 1 hora. Puedes gastar dados de golpe para recuperar PG; no recuperas los dados gastados.'];
  const recovered = recoveredHitDice ?? longRestHitDiceRecovery(c, catalog);
  return [...rows, 'Recupera todos los PG perdidos. Los PG temporales expiran, salvo que su rasgo establezca otra duración.', `Recupera ${Object.values(recovered).reduce((sum, n) => sum + n, 0)} dados de golpe (máximo ${Math.max(1, Math.floor(totalLevel(c) / 2))}).`, ...((c.exhaustionLevel ?? 0) > 0 ? [options.foodAndWater ? 'Reduce el agotamiento en 1 nivel al haber comido y bebido lo necesario.' : 'El agotamiento requiere comida y agua suficientes para reducirse.'] : []), 'Confirma que se ha completado el descanso: normalmente 8 horas, salvo un rasgo específico, y como máximo uno con beneficios cada 24 horas.'];
}

export function applyRest(c: Character, type: 'short' | 'long', catalog: Catalog, recoveredHitDice?: Record<string, number>, options: RestOptions = {}): Character {
  if ((c.exhaustionLevel ?? 0) >= 6) throw new Error('El agotamiento de nivel 6 causa la muerte; un descanso no resucita al personaje.');
  if (type === 'long' && c.hp.current < 1) throw new Error('Necesitas al menos 1 PG al comenzar el descanso largo.');
  const next = clone(c), { resources, keys } = restTargets(c, type, catalog);
  resources.forEach(r => { next.resourcesSpent[r.id] = 0; }); keys.forEach(key => { next.slotsSpent[key] = 0; });
  if (resources.some(r => norm(r.name) === 'canalizar divinidad')) activeFeatures(c, catalog).filter(f => norm(f.name) === 'canalizar divinidad').forEach(f => { next.resourcesSpent[f.id] = 0; });
  if (type === 'long') {
    const recovered = recoveredHitDice ?? longRestHitDiceRecovery(c, catalog);
    validateHitDiceRecovery(c, recovered);
    for (const [classId, amount] of Object.entries(recovered)) next.hp.hitDiceUsed[classId] = (next.hp.hitDiceUsed[classId] ?? 0) - amount;
    if (options.foodAndWater && (next.exhaustionLevel ?? 0) > 0) {
      next.exhaustionLevel = next.exhaustionLevel! - 1;
      if (next.exhaustionLevel === 0) next.conditions = next.conditions.filter(condition => condition !== 'Agotamiento');
    }
    next.hp.current = deriveCharacter(next, catalog).hpMax.value;
    next.hp.temp = 0;
    next.deathSaves = { successes: 0, failures: 0 };
  }
  return withHistory(next, `Descanso ${type === 'short' ? 'corto' : 'largo'} completado según las reglas de 2014.`);
}
