import assert from 'node:assert/strict';
import test from 'node:test';
import { POST } from '../app/api/owlbear/bridge/route';
import { claimRoll } from '../lib/owlbear-bridge-store';

test('a prepared attack and combined damage reach Owlbear in one request', async () => {
  const token = crypto.randomUUID();
  const id = crypto.randomUUID();
  const entries = [
    { label: 'Ataque con daga', notation: '2d20kh1+8' },
    { label: 'Daño de daga y Ataque furtivo', notation: '1d4+5+2d6' },
  ];
  const response = await POST(new Request('http://localhost/api/owlbear/bridge', {
    method: 'POST',
    body: JSON.stringify({ token, action: 'roll', roll: { id, label: 'Tirada preparada', notation: entries.map(entry => entry.notation).join(', '), entries, audience: 'everyone', character: 'Pit' } }),
  }));
  assert.equal(response.status, 200);
  assert.deepEqual(claimRoll(token, 'panel').roll?.entries, entries);
});

test('the bridge rejects a batch with mismatched dice notation', async () => {
  const response = await POST(new Request('http://localhost/api/owlbear/bridge', {
    method: 'POST',
    body: JSON.stringify({ token: crypto.randomUUID(), action: 'roll', roll: { id: crypto.randomUUID(), label: 'Tirada preparada', notation: '1d20', entries: [{ label: 'Salvación', notation: '2d20kh1' }], audience: 'everyone', character: 'Pit' } }),
  }));
  assert.equal(response.status, 400);
});
