import assert from 'node:assert/strict';
import { test } from 'node:test';
import { composePreparedRolls, d20Notation, damageNotation, dicePlusNotation, labeledNotation, resolveRollMode, type PreparedRoll } from '../lib/owlbear-rolls';

test('Dice+ roll descriptions identify attacks and damage without changing the dice expression', () => {
  assert.equal(labeledNotation('1d20+8', 'Ataque con daga'), '1d20+8 # Ataque con daga');
  assert.equal(labeledNotation('1d4+5', 'Daño de daga'), '1d4+5 # Daño de daga');
  assert.equal(labeledNotation('2d6+6', 'Daño: daga + fuego, extra'), '2d6+6 # Daño daga fuego extra');
});

test('manual advantage and disadvantage combine with automatic roll modes', () => {
  assert.equal(resolveRollMode('advantage'), 'advantage');
  assert.equal(resolveRollMode('normal', 'disadvantage'), 'disadvantage');
  assert.equal(resolveRollMode('advantage', 'disadvantage'), 'normal');
  assert.equal(resolveRollMode('disadvantage', 'disadvantage'), 'disadvantage');
});

test('dagger and sneak attack damage become one total while the attack remains separate', () => {
  const rolls: PreparedRoll[] = [
    { id: 'hit', kind: 'd20', label: 'Ataque con daga', notation: '2d20kh1+8' },
    { id: 'dagger', kind: 'damage', label: 'Daño de daga', notation: '1d4+5' },
    { id: 'sneak', kind: 'damage', label: 'Daño de Ataque furtivo', notation: '2d6' },
  ];
  const entries = composePreparedRolls(rolls, true);
  assert.deepEqual(entries, [
    { label: 'Ataque con daga', notation: '2d20kh1+8' },
    { label: 'Daño de daga y Ataque furtivo', notation: '1d4+5+2d6' },
  ]);
  assert.equal(dicePlusNotation({ label: 'Tirada preparada', notation: entries.map(entry => entry.notation).join(', '), entries }), '2d20kh1+8 # Ataque con daga, 1d4+5+2d6 # Daño de daga y Ataque furtivo');
  assert.equal(composePreparedRolls(rolls, false).length, 3);
});

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
