import assert from 'node:assert/strict';
import { test } from 'node:test';
import { d20Notation, damageNotation } from '../lib/owlbear-rolls';

test('d20 notation covers ordinary rolls, advantage, disadvantage and signed modifiers', () => {
  assert.equal(d20Notation(5), '1d20+5');
  assert.equal(d20Notation(-2, 'advantage'), '2d20kh1-2');
  assert.equal(d20Notation(0, 'disadvantage'), '2d20kl1');
});

test('damage notation accepts arithmetic and rejects descriptive attack text', () => {
  assert.equal(damageNotation('2d6 + 1d4', 3), '2d6+1d4+3');
  assert.equal(damageNotation('1d8', -1), '1d8-1');
  assert.equal(damageNotation('1d8 (versátil 1d10)', 2), null);
  assert.equal(damageNotation('2d6 fuego', 2), null);
  assert.equal(damageNotation('0d6', 2), null);
});
