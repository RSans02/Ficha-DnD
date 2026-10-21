export type BridgeRoll = { id: string; label: string; notation: string; audience: 'everyone' | 'self' | 'dm'; character: string };
export type BridgeResult = { id: string; label: string; text: string; error: boolean; at: number };
export type BridgeSource = 'background' | 'panel';
type Session = { heartbeat: Record<BridgeSource, number>; queue: BridgeRoll[]; result: BridgeResult | null; touched: number };

const state = globalThis as typeof globalThis & { __grimorioBridge?: Map<string, Session> };
const sessions = state.__grimorioBridge ??= new Map<string, Session>();
const TOKEN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validToken(token: unknown): token is string { return typeof token === 'string' && TOKEN.test(token); }
function session(token: string): Session {
  const now = Date.now();
  for (const [key, value] of sessions) if (now - value.touched > 30 * 60_000) sessions.delete(key);
  let value = sessions.get(token);
  if (!value) { value = { heartbeat: { background: 0, panel: 0 }, queue: [], result: null, touched: now }; sessions.set(token, value); }
  else if (typeof value.heartbeat === 'number') {
    // Next dev retains globalThis across hot reloads; migrate sessions created by the previous bridge.
    value.heartbeat = { background: value.heartbeat, panel: 0 };
  }
  value.touched = now;
  return value;
}
export function sheetStatus(token: string) { const value = session(token); const now = Date.now(); return { connected: now - value.heartbeat.background < 6_000 || now - value.heartbeat.panel < 6_000, backgroundConnected: now - value.heartbeat.background < 6_000, result: value.result }; }
export function claimRoll(token: string, source: BridgeSource) { const value = session(token); value.heartbeat[source] = Date.now(); return { roll: value.queue.shift() ?? null, backgroundConnected: Date.now() - value.heartbeat.background < 6_000 }; }
export function queueRoll(token: string, roll: BridgeRoll) { const value = session(token); if (value.queue.length >= 10) return false; value.queue.push(roll); return true; }
export function finishRoll(token: string, result: BridgeResult) { session(token).result = result; }
