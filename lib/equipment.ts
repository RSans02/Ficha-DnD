import type { Attack, Catalog, Character, Equipment, EquipmentPickCategory, InventoryItem, StartingEquipmentDefinition, StartingEquipmentSelection } from './types';
import { deriveCharacter } from './engine';

export const foldEquipment = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
export function withoutContainerId(item: InventoryItem): InventoryItem {
  const next = { ...item };
  delete next.containerId;
  return next;
}
/** Each physical container needs its own identity so its contents can be managed separately. */
export function separateContainerUnits(item: InventoryItem): InventoryItem[] {
  if (!item.isContainer || item.quantity === 1) return [item];
  if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50) throw new Error('Crea entre 1 y 50 contenedores por vez.');
  return Array.from({ length: item.quantity }, (_, index) => ({ ...item, id: index === 0 ? item.id : crypto.randomUUID(), quantity: 1 }));
}
/** Reorder container tabs while leaving every non-container inventory row intact. */
export function reorderContainerRows(items: InventoryItem[], sourceId: string, targetId: string): InventoryItem[] {
  const containers = items.filter(item => item.isContainer);
  const from = containers.findIndex(item => item.id === sourceId);
  const to = containers.findIndex(item => item.id === targetId);
  if (from < 0 || to < 0 || from === to) return items;
  const ordered = [...containers];
  ordered.splice(to, 0, ordered.splice(from, 1)[0]);
  let index = 0;
  return items.map(item => item.isContainer ? ordered[index++] : item);
}
type PackPart = { id?: string; name?: string; quantity?: number };
const part = (id: string, quantity = 1): PackPart => ({ id: `equipment-equipo-${id}`, quantity });
const tinderbox: PackPart = { id: 'equipment-equipo-lata-de-yesca', name: 'Yesquero' };
const PACK_CONTENTS: Record<string, PackPart[]> = {
  'equipment-paquetes-equipo-de-ladron': [part('bolas-de-metal-bolsa-de-1000'), { name: 'Hilo (10 pies)' }, part('campana'), part('vela', 5), part('palanca'), part('martillo'), part('piton', 10), part('linterna-con-capuchon'), part('aceite-frasco', 2), part('raciones-1-dia', 5), tinderbox, part('odre'), part('cuerda-de-canamo-50-pies')],
  'equipment-paquetes-equipo-de-diplomatico': [part('estuche-para-mapas-o-pergaminos', 2), part('ropa-fina'), part('tinta-botella-de-1-onza'), part('pluma-de-escritura'), part('lampara'), part('aceite-frasco', 2), part('papel-una-hoja', 5), part('perfume-vial'), part('lacre'), part('jabon')],
  'equipment-paquetes-equipo-para-dungeons': [part('saco-de-dormir'), part('palanca'), part('martillo'), part('piton', 10), part('antorcha', 10), tinderbox, part('raciones-1-dia', 10), part('odre'), part('cuerda-de-canamo-50-pies')],
  'equipment-paquetes-equipo-de-actor': [part('saco-de-dormir'), { id: 'equipment-equipo-ropa-de-disfraz', name: 'Traje', quantity: 2 }, part('vela', 5), part('raciones-1-dia', 5), part('odre'), { id: 'equipment-herramientas-kit-de-disfraz' }],
  'equipment-paquetes-equipo-de-explorador': [part('saco-de-dormir'), { id: 'equipment-herramientas-utensilios-de-cocina' }, tinderbox, part('antorcha', 10), part('raciones-1-dia', 10), part('odre'), part('cuerda-de-canamo-50-pies')],
  'equipment-paquetes-equipo-de-sacerdote': [part('manta'), part('vela', 10), tinderbox, { name: 'Caja de limosnas' }, { name: 'Barra de incienso', quantity: 2 }, { name: 'Incensario' }, { name: 'Vestimentas' }, part('raciones-1-dia', 2), part('odre')],
  'equipment-paquetes-equipo-de-erudito': [{ name: 'Libro de conocimiento' }, part('tinta-botella-de-1-onza'), part('pluma-de-escritura'), part('pergamino-una-hoja', 10), { name: 'Bolsa pequeña de arena' }, { name: 'Cuchillo pequeño' }],
};

export function inventorySummary(c: Character) {
  const itemWeight = c.inventory.reduce((sum,item) => sum + item.quantity * item.weight,0);
  const coinWeight = c.inventoryOptions?.coinsHaveWeight === false ? 0 : ['pc','pp','pe','po','ppt'].reduce((sum,coin) => sum + (c.money[coin] ?? 0),0) / 50;
  const artificer = c.classes.find(cl => cl.classId === 'class-artificiero')?.level ?? 0;
  const attunementLimit = c.manualOverrides.attunementLimit ?? (artificer >= 18 ? 6 : artificer >= 14 ? 5 : artificer >= 10 ? 4 : 3);
  return { itemWeight, coinWeight, totalWeight:itemWeight+coinWeight, attuned:c.inventory.filter(item=>item.attuned).reduce((sum,item)=>sum+item.quantity,0), attunementLimit };
}

export function equippedAttacks(c: Character, catalog: Catalog): Attack[] {
  const derived = deriveCharacter(c, catalog);
  const proficiencies = derived.proficiencies.map(foldEquipment);
  return c.inventory.filter(item => item.equipped).flatMap(item => {
    if (item.attack) return [{ ...item.attack, id: `item.${item.id}`, name: item.name, favorite: true }];
    const weapon = catalog.equipment.find(entry => entry.id === item.equipmentId);
    if (!weapon?.damage) return [];
    const category = foldEquipment(weapon.weaponCategory ?? '');
    const properties = (weapon.properties ?? []).map(foldEquipment);
    const ranged = category.includes('distancia');
    const finesse = properties.some(property => property.includes('sutil'));
    const ability = ranged || (finesse && derived.abilities.dex.modifier > derived.abilities.str.modifier) ? 'dex' : 'str';
    const proficient = proficiencies.includes(foldEquipment(weapon.name)) || category.includes('simples') && proficiencies.includes('armas sencillas') || category.includes('marciales') && proficiencies.includes('armas marciales');
    return [{ id: `item.${item.id}`, name: item.name, ability, proficient, bonus: 0, damage: weapon.damage, damageType: weapon.damageType ?? '', range: (weapon as Equipment & {range?:string}).range || (ranged ? 'A distancia' : 'Cuerpo a cuerpo'), notes: item.notes, favorite: true }];
  });
}

export function inventoryFromEquipment(e: Equipment, quantity = 1): InventoryItem {
  return {
    id: crypto.randomUUID(), equipmentId: e.id, name: e.name,
    category: e.category === 'Armaduras' ? 'Armaduras' : e.category === 'Armas' ? 'Armas' : 'Equipo',
    quantity, weight: PACK_CONTENTS[e.id] ? 0 : e.weight ?? 0, equipped: false, attuned: false,
    ...(PACK_CONTENTS[e.id] ? { isContainer: true } : {}),
    description: e.description, notes: e.weight == null && !PACK_CONTENTS[e.id] ? 'Las reglas oficiales de 2014 no indican un peso fijo para este objeto.' : '',
    ...(e.shieldBonus ? { shieldBonus: e.shieldBonus } : typeof e.armorClass === 'number' ? { armorBase: e.armorClass, ...(typeof e.dexterityCap === 'number' ? { dexCap: e.dexterityCap } : {}) } : {}),
  };
}

/** Pack contents are real inventory rows kept inside their source pack. */
export function inventoryEntriesFromEquipment(e: Equipment, quantity = 1, catalog?: Catalog): InventoryItem[] {
  const contents = PACK_CONTENTS[e.id];
  if (!contents) return [inventoryFromEquipment(e, quantity)];
  return Array.from({ length: quantity }, () => {
    const bag = inventoryFromEquipment(e);
    const children = contents.map(entry => {
      const source = catalog?.equipment.find(item => item.id === entry.id);
      const child = source ? { ...inventoryFromEquipment(source, entry.quantity ?? 1), name: entry.name ?? source.name } : { id: crypto.randomUUID(), name: entry.name ?? 'Objeto del paquete', category: 'Equipo' as const, quantity: entry.quantity ?? 1, weight: 0, equipped: false, attuned: false, description: '', notes: 'Las reglas oficiales de 2014 no indican un peso para este componente del paquete.' };
      return { ...child, containerId: bag.id };
    });
    return [bag, ...children];
  }).flat();
}

export function equipmentCountInScope(items: InventoryItem[], equipmentId: string, containerId?: string): number {
  return items.filter(item => item.equipmentId === equipmentId && (item.isContainer || (item.containerId ?? null) === (containerId ?? null))).reduce((total, item) => total + item.quantity, 0);
}

export function addOneEquipment(items: InventoryItem[], equipment: Equipment, catalog: Catalog, containerId?: string): InventoryItem[] {
  const entries = inventoryEntriesFromEquipment(equipment, 1, catalog).map(item => containerId && !item.isContainer && !item.containerId ? { ...item, containerId } : item);
  const root = entries[0];
  if (!root.isContainer) {
    const existing = items.findLastIndex(item => item.equipmentId === equipment.id && (item.containerId ?? null) === (containerId ?? null) && !item.isContainer && !item.homebrew && !item.equipped && !item.attuned && !item.attack && item.name === root.name && item.weight === root.weight && item.description === root.description && item.notes === root.notes);
    if (existing >= 0) return items.map((item, index) => index === existing ? { ...item, quantity: item.quantity + 1 } : item);
  }
  return [...items, ...entries];
}

export function removeOneEquipment(items: InventoryItem[], equipmentId: string, containerId?: string): InventoryItem[] {
  const index = items.findLastIndex(item => item.equipmentId === equipmentId && (item.isContainer || (item.containerId ?? null) === (containerId ?? null)));
  if (index < 0) return items;
  const target = items[index];
  if (target.quantity > 1 && !target.isContainer) return items.map((item, row) => row === index ? { ...item, quantity: item.quantity - 1 } : item);
  return items.filter(item => item.id !== target.id && (!target.isContainer || item.containerId !== target.id));
}

export function equipmentForPick(equipment: Equipment[], category: EquipmentPickCategory): Equipment[] {
  return equipment.filter(e => {
    const weapon = foldEquipment(e.weaponCategory ?? ''), tool = foldEquipment(e.equipmentType ?? '');
    switch (category) {
      case 'any-weapon': return e.category === 'Armas';
      case 'simple-weapon': return weapon.includes('simple');
      case 'martial-weapon': return weapon.includes('marcial');
      case 'melee-martial-weapon': return weapon.includes('marcial') && weapon.includes('cuerpo');
      case 'simple-melee-weapon': return weapon.includes('simple') && weapon.includes('cuerpo');
      case 'simple-ranged-weapon': return weapon.includes('simple') && weapon.includes('distancia');
      case 'instrument': return tool.includes('instrument');
      case 'artisan-tool': return tool.includes('artesano');
      case 'gaming-set': return tool.includes('juego');
    }
  });
}

export function startingEquipmentSelection(c: Character): StartingEquipmentSelection {
  const classId = c.classes[0]?.classId ?? '';
  if (c.startingEquipment?.classId === classId && c.startingEquipment.backgroundId === c.backgroundId) return c.startingEquipment;
  return { classId, backgroundId: c.backgroundId, mode: 'equipment', selections: {}, picks: {}, verified: [] };
}

export function startingEquipmentSources(c: Character, catalog: Catalog): { id: string; name: string; definition: StartingEquipmentDefinition }[] {
  const cl = catalog.classes.find(cl => cl.id === c.classes[0]?.classId), bg = catalog.backgrounds.find(bg => bg.id === c.backgroundId);
  return [cl && catalog.startingEquipment?.[cl.id] ? { id: cl.id, name: cl.name, definition: catalog.startingEquipment[cl.id] } : null, bg && catalog.backgroundEquipment?.[bg.id] ? { id: bg.id, name: bg.name, definition: catalog.backgroundEquipment[bg.id] } : null].filter((item): item is NonNullable<typeof item> => item !== null);
}

export function missingEquipmentProficiencies(required: string[], c: Character, catalog: Catalog): string[] {
  const proficiencies = deriveCharacter(c, catalog).proficiencies.map(foldEquipment);
  return required.filter(requirement => {
    const label = foldEquipment(requirement);
    if (proficiencies.includes(label)) return false;
    const weapon = catalog.equipment.find(e => foldEquipment(e.name) === label);
    if (weapon?.weaponCategory?.includes('marciales') && proficiencies.includes('armas marciales')) return false;
    if (weapon?.weaponCategory?.includes('simples') && proficiencies.includes('armas sencillas')) return false;
    return true;
  });
}

export function startingEquipmentIssues(c: Character, catalog: Catalog): string[] {
  const state = startingEquipmentSelection(c), sources = startingEquipmentSources(c, catalog), errors: string[] = [];
  if (state.mode === 'gold') {
    const formula = catalog.startingEquipment?.[state.classId]?.goldAlternative;
    if (!formula) return ['Tu clase no ofrece una alternativa de oro en esta fuente.'];
    if (!Number.isInteger(state.goldRoll) || state.goldRoll! < formula.diceCount || state.goldRoll! > formula.diceCount * formula.dieSides) return [`Oro inicial: introduce la suma de ${formula.diceCount}d${formula.dieSides}, entre ${formula.diceCount} y ${formula.diceCount * formula.dieSides}.`];
    return [];
  }
  for (const { id, name, definition } of sources) for (const group of definition.groups) {
    const key = `${id}.${group.id}`, option = group.options.find(o => o.id === state.selections[key]) ?? (group.options.length === 1 ? group.options[0] : undefined);
    if (!option) { errors.push(`${name}: resuelve «${group.name}».`); continue; }
    if (missingEquipmentProficiencies(option.requiresProficiency ?? [], c, catalog).length && !state.verified.includes(`${key}.${option.id}`)) errors.push(`${name}: confirma la competencia necesaria para ${option.name}.`);
    for (const pick of option.picks ?? []) {
      const picked = state.picks[`${key}.${option.id}.${pick.id}`] ?? [], allowed = equipmentForPick(catalog.equipment, pick.category);
      if (picked.length !== pick.quantity || picked.some(item => !allowed.some(e => e.id === item))) errors.push(`${name}: elige ${pick.quantity} en «${pick.name}».`);
      if (pick.requiresProficiency) picked.forEach((item,index) => {
        const equipment = allowed.find(e => e.id === item);
        if (equipment && missingEquipmentProficiencies([equipment.name],c,catalog).length && !state.verified.includes(`${key}.${option.id}.${pick.id}.${index}`)) errors.push(`${name}: confirma tu competencia con ${equipment.name}.`);
      });
    }
  }
  return errors;
}

/** Resolves a creation preview without modifying extras, coins or the original character. */
export function resolveStartingEquipment(c: Character, catalog: Catalog): { items: InventoryItem[]; coins: Record<string, number> } {
  const state = startingEquipmentSelection(c), items: InventoryItem[] = [], coins: Record<string, number> = {};
  if (state.mode === 'gold') {
    const formula = catalog.startingEquipment?.[state.classId]?.goldAlternative;
    if (formula && Number.isInteger(state.goldRoll) && state.goldRoll! >= formula.diceCount && state.goldRoll! <= formula.diceCount * formula.dieSides) coins.po = state.goldRoll! * formula.multiplier;
    return { items, coins };
  }
  for (const { id, definition } of startingEquipmentSources(c, catalog)) {
    Object.entries(definition.coins ?? {}).forEach(([coin, amount]) => { coins[coin] = (coins[coin] ?? 0) + amount; });
    const grants = [...definition.fixed];
    for (const group of definition.groups) {
      const key = `${id}.${group.id}`, option = group.options.find(o => o.id === state.selections[key]) ?? (group.options.length === 1 ? group.options[0] : undefined);
      if (!option) continue;
      grants.push(...option.items);
      for (const pick of option.picks ?? []) for (const equipmentId of state.picks[`${key}.${option.id}.${pick.id}`] ?? []) {
        if (equipmentForPick(catalog.equipment, pick.category).some(e => e.id === equipmentId)) grants.push({ equipmentId, quantity: 1 });
      }
    }
    grants.forEach((grant, index) => {
      const source = catalog.equipment.find(e => e.id === grant.equipmentId);
      const entries: InventoryItem[] = source ? inventoryEntriesFromEquipment(source, grant.quantity, catalog) : [{ id: '', name: grant.name ?? 'Objeto de origen', quantity: grant.quantity, category: 'Equipo', weight: 0, equipped: false, attuned: false, description: grant.description ?? '', notes: `Equipo inicial del manual, p. ${definition.source.page}. Peso por completar.` }];
      const stableIds = new Map(entries.map((item, entryIndex) => [item.id, `${c.id}.starting.${id}.${index}.${entryIndex}`]));
      entries.forEach((item, entryIndex) => {
        if (grant.name && entryIndex === 0) item.name = grant.name;
        if (grant.description && entryIndex === 0) item.description = `${item.description}\n${grant.description}`.trim();
        if (item.containerId) item.containerId = stableIds.get(item.containerId);
        item.id = stableIds.get(item.id)!;
        item.startingEquipmentOrigin = id;
        items.push(item);
      });
    });
  }
  return { items, coins };
}

export function applyStartingEquipment(c: Character, catalog: Catalog): Character {
  if (c.startingEquipment?.applied) return c;
  const errors = startingEquipmentIssues(c, catalog);
  if (errors.length) throw new Error(errors.join('\n'));
  const initial = resolveStartingEquipment(c, catalog), money = { ...c.money };
  Object.entries(initial.coins).forEach(([coin, value]) => { money[coin] = (money[coin] ?? 0) + value; });
  return { ...c, inventory: [...initial.items, ...c.inventory], money, startingEquipment: { ...startingEquipmentSelection(c), applied: true } };
}
