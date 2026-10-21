import { claimRoll, finishRoll, queueRoll, sheetStatus, validToken } from '@/lib/owlbear-bridge-store';

export const runtime = 'nodejs';
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  if (!validToken(token)) return json({ error: 'Código de enlace inválido.' }, 400);
  return json(url.searchParams.get('role') === 'owlbear' ? { roll: claimRoll(token) } : sheetStatus(token));
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { const parsed: unknown = await request.json(); if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error(); body = parsed as Record<string, unknown>; } catch { return json({ error: 'Solicitud inválida.' }, 400); }
  if (!validToken(body.token)) return json({ error: 'Código de enlace inválido.' }, 400);
  if (body.action === 'roll') {
    const roll = body.roll as Record<string, unknown> | null;
    if (!roll || !validToken(roll.id) || typeof roll.label !== 'string' || roll.label.length > 120 || typeof roll.character !== 'string' || roll.character.length > 100 || typeof roll.notation !== 'string' || roll.notation.length > 120 || !/^[\w\d+\-# .(),]+$/.test(roll.notation) || !['everyone', 'self', 'dm'].includes(String(roll.audience))) return json({ error: 'Tirada inválida.' }, 400);
    if (!queueRoll(body.token, { id: roll.id, label: roll.label, notation: roll.notation, audience: roll.audience as 'everyone' | 'self' | 'dm', character: roll.character })) return json({ error: 'Hay demasiadas tiradas pendientes.' }, 429);
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
