import test from 'node:test';
import assert from 'node:assert/strict';
import classes from '../data/rules/classes.json';
import equipment from '../data/rules/equipment.json';
import startingEquipment from '../data/rules/starting-equipment.json';

type Grant = { equipmentId?: string; name?: string; quantity: number };
type Pick = { id: string; name: string; category: string; quantity: number };
type Option = { id: string; name: string; items: Grant[]; picks?: Pick[]; requiresProficiency?: string[] };
type Entry = { source: { page: number }; description: string; fixed: Grant[]; groups: { id: string; name: string; options: Option[] }[]; goldAlternative: { diceCount: number; dieSides: number; multiplier: number; text: string } };
const data = startingEquipment as Record<string, Entry>;
const ids = new Set(equipment.map(item => item.id));
const categories = new Set(['simple-weapon', 'martial-weapon', 'melee-martial-weapon', 'simple-melee-weapon', 'simple-ranged-weapon', 'instrument', 'artisan-tool', 'any-weapon']);
const grants = (entry: Entry) => [...entry.fixed, ...entry.groups.flatMap(group => group.options.flatMap(option => option.items))];

test('each of the 13 classes has a source-backed starting equipment entry', () => {
  assert.deepEqual(Object.keys(data).sort(), classes.map(cls => cls.id).sort());
  for (const cls of classes) {
    const entry = data[cls.id];
    assert.ok(entry.source.page >= cls.source.page && entry.source.page <= cls.source.page + 3, cls.name);
    assert.match(entry.description, /Comienzas con el siguiente equipo/);
    assert.match(entry.description, /para comprar tu equipo\./);
    assert.ok(entry.groups.length > 0);
  }
});

test('all grants resolve to the equipment catalog and quantities count catalog units', () => {
  for (const [classId, entry] of Object.entries(data)) {
    for (const grant of grants(entry)) {
      assert.ok(grant.equipmentId ? ids.has(grant.equipmentId) : grant.name, `${classId}: ${grant.equipmentId}`);
      assert.ok(Number.isInteger(grant.quantity) && grant.quantity > 0, classId);
      if (grant.equipmentId === 'equipment-equipo-flechas-20' || grant.equipmentId === 'equipment-equipo-virotes-de-ballesta-20') {
        assert.equal(grant.quantity, 1, 'One catalog bundle contains twenty pieces of ammunition');
      }
    }
    assert.equal(new Set(entry.groups.map(group => group.id)).size, entry.groups.length, `${classId}: unique group ids`);
    for (const group of entry.groups) {
      assert.equal(new Set(group.options.map(option => option.id)).size, group.options.length, `${classId}: unique option ids`);
      for (const option of group.options) {
        assert.ok(option.items.length > 0 || option.picks?.length, `${classId}: ${option.id} grants equipment`);
        for (const pick of option.picks ?? []) {
          assert.ok(categories.has(pick.category), pick.category);
          assert.ok(Number.isInteger(pick.quantity) && pick.quantity > 0);
        }
      }
    }
  }
});

test('rogue choices match the manual, including fixed tools, daggers and all three packs', () => {
  const rogue = data['class-picaro'];
  assert.equal(rogue.source.page, 377);
  assert.deepEqual(rogue.fixed, [
    { equipmentId: 'equipment-armaduras-cuero', quantity: 1 },
    { equipmentId: 'equipment-armas-daga', quantity: 2 },
    { equipmentId: 'equipment-herramientas-herramientas-de-ladron', quantity: 1 },
  ]);
  assert.deepEqual(rogue.groups[0].options.map(option => option.items[0].equipmentId), ['equipment-armas-estoque', 'equipment-armas-espada-corta']);
  assert.deepEqual(rogue.groups[1].options[0].items.map(item => item.equipmentId), ['equipment-armas-arco-corto', 'equipment-equipo-aljaba', 'equipment-equipo-flechas-20']);
  assert.equal(rogue.groups[2].options.length, 3);
  assert.equal(rogue.goldAlternative.diceCount, 4);
  assert.equal(rogue.goldAlternative.multiplier, 10);
});

test('gold alternatives use the printed class dice; monk has no tenfold multiplier', () => {
  const dice: Record<string, number> = { artificiero: 5, barbaro: 2, bardo: 5, brujo: 4, clerigo: 5, druida: 2, explorador: 5, guerrero: 5, hechicero: 3, mago: 4, monje: 5, paladin: 5, picaro: 4 };
  for (const [name, count] of Object.entries(dice)) {
    const alternative = data[`class-${name}`].goldAlternative;
    assert.equal(alternative.diceCount, count, name);
    assert.equal(alternative.dieSides, 4, name);
    assert.equal(alternative.multiplier, name === 'monje' ? 1 : 10, name);
    assert.match(alternative.text, /clase y de trasfondo/);
  }
});

test('class-specific qualifications and repeated weapon picks are retained', () => {
  const cleric = data['class-clerigo'];
  assert.deepEqual(cleric.groups[0].options[1].requiresProficiency, ['Martillo de guerra']);
  assert.deepEqual(cleric.groups[1].options[2].requiresProficiency, ['Armaduras pesadas']);
  assert.equal(data['class-druida'].groups[1].options[1].picks?.[0].category, 'simple-melee-weapon');
  assert.equal(data['class-artificiero'].groups[0].options[0].picks?.[0].quantity, 2);
  assert.equal(data['class-explorador'].groups[1].options[1].picks?.[0].quantity, 2);
  assert.equal(data['class-guerrero'].groups[1].options[1].picks?.[0].quantity, 2);
  assert.equal(data['class-paladin'].groups[0].options[1].picks?.[0].quantity, 2);
});

test('2014 starting gear resolves the druid and bard PDF discrepancies without losing the original text', () => {
  const druid = data['class-druida'];
  assert.match(druid.groups[1].options[1].name, /cuerpo a cuerpo/);
  assert.equal(data['class-bardo'].groups[2].options[0].items[0].equipmentId, 'equipment-herramientas-laud');
  assert.match(druid.description, /distancia/);
});
