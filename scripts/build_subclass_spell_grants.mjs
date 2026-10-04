import fs from 'node:fs';

const features = JSON.parse(fs.readFileSync('data/rules/class-features.json', 'utf8'));
const spells = JSON.parse(fs.readFileSync('data/rules/spells.json', 'utf8'));
const fold = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[.,:;()]/g, ' ').replace(/\s+/g, ' ').trim();
const aliases = {
  'conocer las leyendas': 'Conocimiento de Leyendas',
  'escudo de la fe': 'Escudo de Fe',
  'circulo de teletransportacion': 'Circulo de Teletransporte',
  'restauracion menor': 'Restablecimiento Menor',
  'ceguera/ sordera': 'Ceguera/Sordera',
  'alterar propio aspecto': 'Alterar el Propio Aspecto',
  'crear comida y agua': 'Crear Comida y Bebida',
};
const names = [...spells.map(spell => ({ id: spell.id, name: fold(spell.name) })), ...Object.entries(aliases).map(([name, canonical]) => ({ id: spells.find(spell => fold(spell.name) === fold(canonical))?.id, name }))].filter(spell => spell.id).sort((a, b) => b.name.length - a.name.length);
const exclusions = new Set([
  'feature-druida-circulo-de-la-tierra-hechizos-del-circulo',
  'feature-explorador-errante-feerico-magia-del-errante-feerico',
]);
const isTable = feature => feature.originId?.startsWith('subclass-') && !exclusions.has(feature.id) && (
  /^feature-(artificiero|clerigo|druida|paladin)-.*hechizos-(de|del)-/.test(feature.id) ||
  feature.id === 'feature-druida-circulo-de-las-esporas-companero-salvaje' ||
  /^feature-explorador-.*magia-del-/.test(feature.id) ||
  /hechizos-(psionicos|mecanicos)$/.test(feature.id) ||
  /encarnacion-de-la-luna$/.test(feature.id)
);
const grants = {};
const unresolved = [];
for (const feature of features.filter(isTable)) {
  const text = fold(feature.description);
  const header = [...text.matchAll(/nivel de (?:artificiero|clerigo|druida|explorador|paladin|hechicero) hechizos?(?: de luna llena hechizos de luna nueva hechizos de luna creciente)?/g)].at(-1);
  if (!header) { unresolved.push(`${feature.id}: falta tabla`); continue; }
  const body = text.slice(header.index + header[0].length).split(' ademas consulta la tabla de manifestaciones')[0];
  const markers = [...body.matchAll(/(?:^|\s)(1|2|3|5|7|9|13|17)°?\s+/g)];
  if (!markers.length) { unresolved.push(`${feature.id}: faltan niveles`); continue; }
  const entries = [];
  for (let i = 0; i < markers.length; i++) {
    const level = Number(markers[i][1]);
    let row = body.slice(markers[i].index + markers[i][0].length, markers[i + 1]?.index ?? body.length).trim();
    const count = feature.id.endsWith('encarnacion-de-la-luna') || feature.id.endsWith('hechizos-psionicos') && level === 1 ? 3 : feature.id.includes('explorador-') || feature.id.includes('circulo-de-las-esporas') && level === 2 ? 1 : 2;
    for (let j = 0; j < count; j++) {
      row = row.replace(/^[\s,./-]+/, '');
      const match = names.find(spell => row === spell.name || row.startsWith(`${spell.name} `) || row.startsWith(`${spell.name},`));
      if (!match) { unresolved.push(`${feature.id} nivel ${level}: ${row.slice(0, 75)}`); break; }
      entries.push({ level, spellId: match.id });
      row = row.slice(match.name.length);
    }
  }
  if (entries.length) grants[feature.id] = entries;
}
console.log(`Tablas: ${Object.keys(grants).length}; concesiones: ${Object.values(grants).reduce((sum, rows) => sum + rows.length, 0)}`);
if (unresolved.length) console.log(unresolved.join('\n'));
if (process.argv.includes('--write') && !unresolved.length) fs.writeFileSync('data/rules/subclass-spell-grants.json', JSON.stringify(grants, null, 2) + '\n');

const expanded = {};
const accessIssues = [];
for (const feature of features.filter(item => item.originId?.startsWith('subclass-') && item.id.endsWith('-lista-de-hechizos-expandida') && item.originId !== 'subclass-brujo-el-genio')) {
  const text = fold(feature.description).replace('invocar elemental solo de agua', 'invocar elemental').replace('la mano de bigby parece un tentaculo', 'la mano de bigby');
  const header = [...text.matchAll(/nivel de hechizo hechizos?/g)].at(-1);
  if (!header) { accessIssues.push(`${feature.id}: sin tabla de lista ampliada`); continue; }
  const body = text.slice(header.index + header[0].length);
  const markers = [...body.matchAll(/(?:^|\s)([1-5])\s+/g)];
  const ids = [];
  for (let i = 0; i < markers.length; i++) {
    let row = body.slice(markers[i].index + markers[i][0].length, markers[i + 1]?.index ?? body.length).trim();
    for (let j = 0; j < 2; j++) {
      row = row.replace(/^[\s,./-]+/, '');
      const match = names.find(spell => row === spell.name || row.startsWith(`${spell.name} `) || row.startsWith(`${spell.name},`));
      if (!match) { accessIssues.push(`${feature.id}: ${row.slice(0, 75)}`); break; }
      ids.push(match.id);
      row = row.slice(match.name.length);
    }
  }
  if (ids.length) expanded[feature.originId] = [...new Set(ids)];
}
console.log(`Listas ampliadas: ${Object.keys(expanded).length}; opciones: ${Object.values(expanded).reduce((sum, ids) => sum + ids.length, 0)}`);
if (accessIssues.length) console.log(accessIssues.join('\n'));
if (process.argv.includes('--write') && !accessIssues.length) fs.writeFileSync('data/rules/subclass-spell-access.json', JSON.stringify(expanded, null, 2) + '\n');

const landFeature = features.find(feature => feature.id === 'feature-druida-circulo-de-la-tierra-hechizos-del-circulo');
const landText = fold(landFeature.description);
const landHeaders = [...landText.matchAll(/nivel de druida hechizos (?:del|de la) (bosque|costa|desierto|underdark|montana|pantano|pradera|artico)/g)];
const lands = {};
for (let i = 0; i < landHeaders.length; i++) {
  const land = landHeaders[i][1];
  const body = landText.slice(landHeaders[i].index + landHeaders[i][0].length, landHeaders[i + 1]?.index ?? landText.length);
  const markers = [...body.matchAll(/(?:^|\s)(3|5|7|9)\s+/g)];
  const rows = [];
  for (let j = 0; j < markers.length; j++) {
    let row = body.slice(markers[j].index + markers[j][0].length, markers[j + 1]?.index ?? body.length).trim();
    for (let k = 0; k < 2; k++) {
      row = row.replace(/^[\s,./-]+/, '');
      const match = names.find(spell => row === spell.name || row.startsWith(`${spell.name} `) || row.startsWith(`${spell.name},`));
      if (!match) { accessIssues.push(`tierra ${land}: ${row.slice(0, 75)}`); break; }
      rows.push({ level: Number(markers[j][1]), spellId: match.id });
      row = row.slice(match.name.length);
    }
  }
  lands[land] = rows;
}
console.log(`Tierras: ${Object.keys(lands).length}; conjuros: ${Object.values(lands).reduce((sum, rows) => sum + rows.length, 0)}`);
if (accessIssues.length) console.log(accessIssues.join('\n'));
if (process.argv.includes('--write') && !accessIssues.length) fs.writeFileSync('data/rules/subclass-land-spells.json', JSON.stringify(lands, null, 2) + '\n');
