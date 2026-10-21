'use client';

import { useEffect, useState } from 'react';
import { connectOwlbear, type OwlbearSdk } from '@/lib/owlbear-client';
import type { BridgeRoll } from '@/lib/owlbear-bridge-store';
import { BRIDGE_METADATA_KEY } from './owlbear-panel';

const SOURCE = 'grimorio.character-sheet';
const TOKEN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

async function dicePlusReady(obr: OwlbearSdk): Promise<boolean> {
  const requestId = crypto.randomUUID();
  return new Promise(resolve => {
    let done = false;
    let timer: ReturnType<typeof setTimeout>;
    const finish = (ready: boolean) => { if (done) return; done = true; clearTimeout(timer); unsubscribe(); resolve(ready); };
    const unsubscribe = obr.broadcast.onMessage('dice-plus/isReady', event => {
      if (record(event.data) && event.data.requestId === requestId && event.data.ready === true) finish(true);
    });
    timer = setTimeout(() => finish(false), 1500);
    void obr.broadcast.sendMessage('dice-plus/isReady', { requestId, timestamp: Date.now() }, { destination: 'ALL' }).catch(() => finish(false));
  });
}

async function execute(obr: OwlbearSdk, roll: BridgeRoll): Promise<{ text: string; error: boolean }> {
  if (!await dicePlusReady(obr)) return { text: 'Activa Dice+ en esta sala de Owlbear.', error: true };
  return new Promise(resolve => {
    let done = false;
    let timer: ReturnType<typeof setTimeout>;
    const finish = (text: string, error: boolean) => { if (done) return; done = true; clearTimeout(timer); offResult(); offError(); resolve({ text, error }); };
    const offResult = obr.broadcast.onMessage(`${SOURCE}/roll-result`, event => {
      if (!record(event.data) || event.data.rollId !== roll.id) return;
      const result = event.data.result;
      const text = record(result) ? String(result.rollSummary ?? result.totalValue ?? 'Tirada completada') : 'Tirada completada';
      finish(text, false);
    });
    const offError = obr.broadcast.onMessage(`${SOURCE}/roll-error`, event => {
      if (record(event.data) && event.data.rollId === roll.id) finish(String(event.data.error ?? 'Error de Dice+'), true);
    });
    timer = setTimeout(() => finish('Dice+ no devolvió un resultado.', true), 20_000);
    void Promise.all([obr.player.getId(), obr.player.getName()]).then(([playerId, playerName]) =>
      obr.broadcast.sendMessage('dice-plus/roll-request', { rollId: roll.id, playerId, playerName, rollTarget: roll.audience, diceNotation: roll.notation, showResults: true, timestamp: Date.now(), source: SOURCE }, { destination: 'ALL' })
    ).catch(error => finish(error instanceof Error ? error.message : 'No se pudo enviar la tirada.', true));
  });
}

export function OwlbearBackground() {
  const [status, setStatus] = useState('Conectando con Owlbear…');
  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setTimeout>;
    void connectOwlbear().then(obr => {
      const poll = async () => {
        if (!live) return;
        try {
          const metadata = await obr.player.getMetadata();
          const token = metadata[BRIDGE_METADATA_KEY];
          if (typeof token !== 'string' || !TOKEN.test(token)) { setStatus('Esperando el código de la ficha.'); }
          else {
            const response = await fetch(`/api/owlbear/bridge?role=owlbear&token=${encodeURIComponent(token)}`, { cache: 'no-store' });
            if (!response.ok) throw new Error('No se pudo acceder al puente.');
            const data = await response.json() as { roll: BridgeRoll | null };
            setStatus('Ficha conectada.');
            if (data.roll) {
              const result = await execute(obr, data.roll);
              await fetch('/api/owlbear/bridge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'result', token, result: { id: data.roll.id, label: `${data.roll.character} · ${data.roll.label}`, ...result } }) });
            }
          }
        } catch (error) { setStatus(error instanceof Error ? error.message : 'Error de conexión.'); }
        if (live) timer = setTimeout(() => void poll(), 1000);
      };
      void poll();
    }).catch(error => { if (live) setStatus(error instanceof Error ? error.message : 'Owlbear no disponible.'); });
    return () => { live = false; clearTimeout(timer); };
  }, []);
  return <main className="owlbear-panel"><p className="owlbear-status">{status}</p></main>;
}
