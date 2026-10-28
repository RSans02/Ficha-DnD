import assert from 'node:assert/strict';
import test from 'node:test';
import { claimRoll, finishRoll, queueRoll, sheetStatus } from '../lib/owlbear-bridge-store';

test('the visible Owlbear panel can connect the sheet without a background page', () => {
  const token = crypto.randomUUID();
  assert.equal(sheetStatus(token).connected, false);
  const state = claimRoll(token, 'panel');
  assert.equal(state.backgroundConnected, false);
  assert.equal(sheetStatus(token).connected, true);
  assert.equal(sheetStatus(token).backgroundConnected, false);
});

test('a background worker is reported separately and claims queued rolls', () => {
  const token = crypto.randomUUID();
  const roll = { id: crypto.randomUUID(), label: 'Iniciativa', notation: '1d20+5', audience: 'everyone' as const, character: 'Pit' };
  assert.equal(queueRoll(token, roll), true);
  assert.deepEqual(claimRoll(token, 'background').roll, roll);
  assert.equal(sheetStatus(token).backgroundConnected, true);
});

test('sessions retained by Next dev from the previous bridge are migrated', () => {
  const token = crypto.randomUUID();
  const state = globalThis as typeof globalThis & { __grimorioBridge?: Map<string, unknown> };
  state.__grimorioBridge?.set(token, { heartbeat: Date.now(), queue: [], result: null, touched: Date.now() });
  assert.equal(claimRoll(token, 'panel').roll, null);
  assert.equal(sheetStatus(token).connected, true);
});

test('completed rolls stop appearing in sheet polling after thirty seconds', () => {
  const token = crypto.randomUUID();
  const result = { id: crypto.randomUUID(), label: 'Pit · Daga', text: '17', error: false, at: Date.now() };
  finishRoll(token, result);
  assert.deepEqual(sheetStatus(token).result, result);
  finishRoll(token, { ...result, at: Date.now() - 31_000 });
  assert.equal(sheetStatus(token).result, null);
  assert.equal(sheetStatus(token).result, null);
});
