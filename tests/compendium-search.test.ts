import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog } from '../lib/catalog';
import { compendiumSearchEntries, matchesCompendiumEntry, searchCompendium } from '../lib/compendium-search';
import { mergeCatalog, validateBooks } from '../lib/homebrew';
import crusades from '../imports/cruzadas-de-los-panteones.json';

test('the compendium search includes imported subclasses and features with their owner', () => {
  const books = validateBooks(crusades, catalog);
  const entries = compendiumSearchEntries(mergeCatalog(catalog, books), books);
  const subclass = searchCompendium(entries, 'Ente cautivado').find(entry => entry.item.id === 'homebrew-subclass-brujo-ente-cautivado');
  assert.equal(subclass?.kind, 'subclasses');
  assert.equal(subclass?.compendium, 'Cruzadas de los panteones');
  assert.equal(searchCompendium(entries, 'Arrebato romantico')[0]?.compendium, 'Cruzadas de los panteones');
  assert.equal(searchCompendium(entries, 'Cruzadas panteones').length, 9);
  assert(searchCompendium(entries, 'nivel20.com/games/dnd-5/archetypes/8990').some(entry => entry.item.id === subclass?.item.id));
});

test('book search checks source fields and the owning compendium', () => {
  const books = validateBooks(crusades, catalog);
  const subclass = books[0].entries.subclasses![0];
  assert(matchesCompendiumEntry({ item: subclass, compendium: books[0].name }, 'panteones'));
  assert(matchesCompendiumEntry({ item: subclass, compendium: books[0].name }, 'nivel20.com'));
  assert(!matchesCompendiumEntry({ item: subclass, compendium: books[0].name }, 'dragón antiguo'));
});
