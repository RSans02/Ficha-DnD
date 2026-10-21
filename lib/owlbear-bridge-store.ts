export type BridgeRoll = { id: string; label: string; notation: string; audience: 'everyone' | 'self' | 'dm'; character: string };
export type BridgeResult = { id: string; label: string; text: string; error: boolean; at: number };
type Session = { heartbeat: number; queue: BridgeRoll[]; result: BridgeResult | null; touched: number };

const state = globalThis as typeof globalThis & { __grimorioBridge?: Map<string, Session> };
const sessions = state.__grimorioBridge ??= new Map<string, Session>();
const TOKEN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validToken(token: unknown): token is string { return typeof token === 'string' && TOKEN.test(token); }
function session(token: string): Session {
  const now = Date.now();
  for (const [key, value] of sessions) if (now - value.touched > 30 * 60_000) sessions.delete(key);
  let value = sessions.get(token);
  if (!value) { value = { heartbeat: 0, queue: [], result: null, touched: now }; sessions.set(token, value); }
  value.touched = now;
  return value;
}
export function sheetStatus(token: string) { const value = session(token); return { connected: Date.now() - value.heartbeat < 6_000, result: value.result }; }
export function claimRoll(token: string) { const value = session(token); value.heartbeat = Date.now(); return value.queue.shift() ?? null; }
export function queueRoll(token: string, roll: BridgeRoll) { const value = session(token); if (value.queue.length >= 10) return false; value.queue.push(roll); return true; }
export function finishRoll(token: string, result: BridgeResult) { session(token).result = result; }
