import test from 'node:test';
import assert from 'node:assert/strict';
import features from '../data/rules/class-features.json';
import repairs from '../data/rules/class-source-repairs.json';

const repeatedHeadings: [number, string, number | null, number | null, string][] = [
  [116, 'Arma Mejorada', null, null, 'vuelve a la mano'],
  [130, 'Escudo Espiritual', 10, 14, 'represalias'],
  [132, 'Presencia Fanática', 10, 14, 'golpes fatales'],
  [165, 'Resistencia Infernal', 10, 14, '10d10'],
  [200, 'Lanzamiento de Hechizos Potentes', 8, 17, 'curar a los vivos'],
  [241, 'Furia Bestial', 11, 15, 'conjuro dirigido a ti mismo'],
  [245, 'Defensa Sobrenatural', 7, 11, 'frustrar la magia'],
  [301, 'Fenómeno Lunar', 18, 1, 'runa de esencia'],
  [314, 'Ilusiones Maleables', 6, 10, 'copia ilusoria'],
  [372, 'Represión Vigilante', 15, 20, 'visión verdadera'],
  [388, 'Maniobra Elegante', 13, 17, 'nuevamente con ventaja'],
];

for (const [page, title, firstLevel, secondLevel, secondBody] of repeatedHeadings) {
  test(`physical PDF page ${page}: repeated ${title} bookmarks retain distinct bodies and levels`, () => {
    const pair = features.filter(feature => feature.source.page === page && feature.name === title);
    assert.equal(pair.length, 2);
    assert.equal(pair[0].level, firstLevel);
    assert.equal(pair[1].level, secondLevel);
    assert.notEqual(pair[0].description, pair[1].description);
    assert(pair[1].description.includes(secondBody));
    assert(!pair[0].description.includes(secondBody), 'The first feature must not absorb the second feature');
    assert(pair.every(feature => feature.source.endPage === page));
    const anchors = repairs.filter(repair => repair.page === page && repair.title === title);
    assert.equal(anchors.length, 2);
    assert(anchors[0].startOffset < anchors[1].startOffset);
    assert(anchors[0].left < anchors[1].left || anchors[0].top > anchors[1].top);
  });
}

test('Runechild level one is not replaced by the preceding Lunar Sorcery capstone', () => {
  const runa = features.find(feature => feature.id === 'feature-hechicero-runaestirpe-fenomeno-lunar')!;
  assert.equal(runa.originId, 'subclass-hechicero-runaestirpe');
  assert.equal(runa.level, 1);
  assert(runa.description.includes('runas cargadas'));
  assert(!runa.description.includes('Luna llena'));
});
