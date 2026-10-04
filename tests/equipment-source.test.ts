import test from 'node:test';
import assert from 'node:assert/strict';
import equipment from '../data/rules/equipment.json';

test('source page 432 has seven distinct pack headings rather than ingredient text as names', () => {
  const packs = equipment.filter(item => item.category === 'Paquetes');
  assert.deepEqual(packs.map(item => item.name), [
    'Equipo de Ladrón', 'Equipo de Diplomático', 'Equipo para Dungeons',
    'Equipo de Actor', 'Equipo de Explorador', 'Equipo de Sacerdote', 'Equipo de Erudito',
  ]);
  assert(packs.every(item => item.source.page === 432));
});

test('the explorer pack retains its cooking kit and supplies without absorbing the priest pack', () => {
  const explorer = equipment.find(item => item.id === 'equipment-paquetes-equipo-de-explorador')!;
  const priest = equipment.find(item => item.id === 'equipment-paquetes-equipo-de-sacerdote')!;
  assert(explorer.description.includes('Equipo de cocina'));
  assert(explorer.description.includes('50 pies de cuerda de cáñamo'));
  assert(!explorer.description.includes('Sacerdote'));
  assert.equal(priest.cost, '19 po');
  assert(priest.description.startsWith('Equipo de Sacerdote (19 po).'));
  assert(priest.description.includes('caja de limosnas'));
  assert(priest.description.includes('incensario'));
  assert(!priest.description.includes('Equipo de cocina'));
});

test('2014 artisan-tool choices exclude thieves and navigators tools', () => {
  const artisanTools = equipment.filter(item => item.equipmentType === 'Herramientas de artesano');
  assert.equal(artisanTools.length, 17);
  assert(!artisanTools.some(item => ['equipment-herramientas-herramientas-de-ladron', 'equipment-herramientas-herramientas-de-navegacion'].includes(item.id)));
  for (const id of ['equipment-herramientas-herramientas-de-ladron', 'equipment-herramientas-herramientas-de-navegacion']) {
    assert.equal(equipment.find(item => item.id === id)?.equipmentType, 'Herramientas especializadas');
  }
});
