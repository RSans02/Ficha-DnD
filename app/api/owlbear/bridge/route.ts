import { claimRoll, finishRoll, queueRoll, sheetStatus, validToken } from '@/lib/owlbear-bridge-store';
import { dicePlusNotation, MAX_PREPARED_ROLLS, type RollEntry } from '@/lib/owlbear-rolls';

export const runtime = 'nodejs';
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
const validNotation = (value: unknown, max: number): value is string => typeof value === 'string' && value.length > 0 && value.length <= max && /^[\p{L}\p{N}_+\-# .(),]+$/u.test(value);
const validEntry = (value: unknown): value is RollEntry => !!value && typeof value === 'object' && !Array.isArray(value) && typeof (value as RollEntry).label === 'string' && (value as RollEntry).label.trim().length > 0 && (value as RollEntry).label.length <= 120 && validNotation((value as RollEntry).notation, 1000);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  if (!validToken(token)) return json({ error: 'Código de enlace inválido.' }, 400);
  if (url.searchParams.get('role') === 'owlbear') return json(claimRoll(token, url.searchParams.get('source') === 'panel' ? 'panel' : 'background'));
  return json(sheetStatus(token));
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { const parsed: unknown = await request.json(); if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error(); body = parsed as Record<string, unknown>; } catch { return json({ error: 'Solicitud inválida.' }, 400); }
  if (!validToken(body.token)) return json({ error: 'Código de enlace inválido.' }, 400);
  if (body.action === 'roll') {
    const roll = body.roll as Record<string, unknown> | null;
    if (!roll || !validToken(roll.id) || typeof roll.label !== 'string' || roll.label.length > 120 || typeof roll.character !== 'string' || roll.character.length > 100 || !validNotation(roll.notation, roll.entries === undefined ? 120 : 1000) || !['everyone', 'self', 'dm'].includes(String(roll.audience))) return json({ error: 'Tirada inválida.' }, 400);
    let entries: RollEntry[] | undefined;
    if (roll.entries !== undefined) {
      if (!Array.isArray(roll.entries) || roll.entries.length < 1 || roll.entries.length > MAX_PREPARED_ROLLS || !roll.entries.every(validEntry)) return json({ error: 'Tirada combinada inválida.' }, 400);
      entries = roll.entries as RollEntry[];
      const plain = entries.map(entry => entry.notation).join(', ');
      const labeled = dicePlusNotation({ label: '', notation: '', entries });
      if (roll.notation !== plain && roll.notation !== labeled) return json({ error: 'Tirada combinada inválida.' }, 400);
    }
    if (!queueRoll(body.token, { id: roll.id, label: roll.label, notation: roll.notation, entries, audience: roll.audience as 'everyone' | 'self' | 'dm', character: roll.character })) return json({ error: 'Hay demasiadas tiradas pendientes.' }, 429);
    return json({ ok: true });
  }
  if (body.action === 'result') {
    const result = body.result as Record<string, unknown> | null;
    if (!result || !validToken(result.id) || typeof result.label !== 'string' || result.label.length > 120 || typeof result.text !== 'string' || result.text.length > 500 || typeof result.error !== 'boolean') return json({ error: 'Resultado inválido.' }, 400);
    finishRoll(body.token, { id: result.id, label: result.label, text: result.text, error: result.error, at: Date.now() });
    return json({ ok: true });
  }
  return json({ error: 'Acción inválida.' }, 400);
}
