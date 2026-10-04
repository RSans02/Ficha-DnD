import type { Catalog, Character, Equipment, EquipmentPickCategory, InventoryItem, StartingEquipmentDefinition, StartingEquipmentSelection } from './types';
import { deriveCharacter } from './engine';

export const foldEquipment = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');

export function inventorySummary(c: Character) {
  const itemWeight = c.inventory.reduce((sum,item) => sum + item.quantity * item.weight,0);
  const coinWeight = ['pc','pp','pe','po','ppt'].reduce((sum,coin) => sum + (c.money[coin] ?? 0),0) / 50;
  const artificer = c.classes.find(cl => cl.classId === 'class-artificiero')?.level ?? 0;
  const attunementLimit = c.manualOverrides.attunementLimit ?? (artificer >= 18 ? 6 : artificer >= 14 ? 5 : artificer >= 10 ? 4 : 3);
  return { itemWeight, coinWeight, totalWeight:itemWeight+coinWeight, attuned:c.inventory.filter(item=>item.attuned).reduce((sum,item)=>sum+item.quantity,0), attunementLimit };
}

export function inventoryFromEquipment(e: Equipment, quantity = 1): InventoryItem {
  return {
    id: crypto.randomUUID(), equipmentId: e.id, name: e.name,
    category: e.category === 'Armaduras' ? 'Armaduras' : e.category === 'Armas' ? 'Armas' : 'Equipo',
    quantity, weight: e.weight ?? 0, equipped: false, attuned: false,
    description: e.description, notes: e.weight == null ? 'Peso no disponible en la fuente; ajústalo si es necesario.' : '',
    ...(e.shieldBonus ? { shieldBonus: e.shieldBonus } : typeof e.armorClass === 'number' ? { armorBase: e.armorClass, ...(typeof e.dexterityCap === 'number' ? { dexCap: e.dexterityCap } : {}) } : {}),
  };
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
      const item: InventoryItem = source ? inventoryFromEquipment(source, grant.quantity) : { id: '', name: grant.name ?? 'Objeto de origen', quantity: grant.quantity, category: 'Equipo', weight: 0, equipped: false, attuned: false, description: grant.description ?? '', notes: `Equipo inicial del manual, p. ${definition.source.page}. Peso por completar.` };
      if (grant.name) item.name = grant.name;
      if (grant.description) item.description = `${item.description}\n${grant.description}`.trim();
      item.id = `${c.id}.starting.${id}.${index}`;
      item.startingEquipmentOrigin = id;
      items.push(item);
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
