import type { OwlbearSdk } from './owlbear-client';
import type { BridgeRoll, BridgeSource } from './owlbear-bridge-store';
import { dicePlusNotation } from './owlbear-rolls';

export const BRIDGE_METADATA_KEY = 'com.grimorio.sheet/bridge';
const SOURCE = 'grimorio.character-sheet';
const TOKEN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
export type BridgeWorkerStatus = { active: boolean; backgroundConnected: boolean; message: string };

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
      obr.broadcast.sendMessage('dice-plus/roll-request', { rollId: roll.id, playerId, playerName, rollTarget: roll.audience, diceNotation: dicePlusNotation(roll), showResults: true, timestamp: Date.now(), source: SOURCE }, { destination: 'ALL' })
    ).catch(error => finish(error instanceof Error ? error.message : 'No se pudo enviar la tirada.', true));
  });
}

/** Both the persistent background page and the visible popover can keep the sheet connected. */
export function runOwlbearBridge(obr: OwlbearSdk, source: BridgeSource, onStatus: (status: BridgeWorkerStatus) => void): () => void {
  let live = true;
  let timer: ReturnType<typeof setTimeout>;
  const poll = async () => {
    if (!live) return;
    try {
      const metadata = await obr.player.getMetadata();
      const token = metadata[BRIDGE_METADATA_KEY];
      if (typeof token !== 'string' || !TOKEN.test(token)) onStatus({ active: false, backgroundConnected: false, message: 'Esperando el código de la ficha.' });
      else {
        const response = await fetch(`/api/owlbear/bridge?role=owlbear&source=${source}&token=${encodeURIComponent(token)}`, { cache: 'no-store' });
        if (!response.ok) throw new Error(`El puente respondió HTTP ${response.status}.`);
        const data = await response.json() as { roll: BridgeRoll | null; backgroundConnected: boolean };
        if (!live) return;
        onStatus({ active: true, backgroundConnected: data.backgroundConnected, message: 'Puente con la ficha activo.' });
        if (data.roll) {
          const result = await execute(obr, data.roll);
          const posted = await fetch('/api/owlbear/bridge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'result', token, result: { id: data.roll.id, label: `${data.roll.character} · ${data.roll.label}`, ...result } }) });
          if (!posted.ok) throw new Error(`No se pudo devolver el resultado (HTTP ${posted.status}).`);
        }
      }
    } catch (error) { if (live) onStatus({ active: false, backgroundConnected: false, message: error instanceof Error ? error.message : 'Error de conexión con la ficha.' }); }
    if (live) timer = setTimeout(() => void poll(), 1000);
  };
  void poll();
  return () => { live = false; clearTimeout(timer); };
}
