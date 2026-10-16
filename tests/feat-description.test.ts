import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog } from '../lib/catalog';
import { featDescriptionSections } from '../lib/feat-description';
import { readableParagraphs } from '../lib/readable-prose';

test('a feat prerequisite and title do not repeat in its description', () => {
  const feat = catalog.feats.find(item => item.name === 'Acechador');
  assert(feat);
  const sections = featDescriptionSections(feat);
  assert.match(sections.introduction, /^Eres un experto/i);
  assert.doesNotMatch(sections.introduction, /Acechador|Requisito/i);
  assert.equal(sections.benefits.length, 3);
  assert.match(sections.benefits[0], /^Puedes intentar esconderte/i);
});

test('a feat without bullets keeps its full prose', () => {
  const feat = catalog.feats.find(item => item.name === 'Afortunado');
  assert(feat);
  const sections = featDescriptionSections(feat);
  assert.equal(sections.benefits.length, 0);
  assert.match(sections.introduction, /^Tienes una suerte/i);
  assert.match(sections.introduction, /descanso largo\.$/i);
  const paragraphs = readableParagraphs(sections.introduction);
  assert(paragraphs.length > 1);
  assert.equal(paragraphs.join(' '), sections.introduction);
});

test('racial feat prerequisite uses the source heading', () => {
  const feat = catalog.feats.find(item => item.name === 'Constitución Infernal');
  assert(feat);
  const sections = featDescriptionSections(feat);
  assert.match(sections.introduction, /^La sangre diabólica/i);
  assert.doesNotMatch(sections.introduction, /Requisito Previo/i);
});

test('every catalog feat has readable content without a repeated prerequisite heading', () => {
  for (const feat of catalog.feats) {
    const {introduction,benefits} = featDescriptionSections(feat);
    assert(introduction || benefits.length, feat.name);
    if (feat.prerequisiteText) assert.doesNotMatch(introduction, /^Requisitos?(?:\s+previo)?\s*:/i, feat.name);
  }
});
