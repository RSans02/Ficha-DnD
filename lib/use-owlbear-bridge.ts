'use client';

import { useEffect, useRef, useState } from 'react';
import type { BridgeResult } from './owlbear-bridge-store';
import { dicePlusNotation, type RollEntry } from './owlbear-rolls';

const STORAGE_KEY = 'grimorio.owlbear.bridge-token';
type Audience = 'everyone' | 'self' | 'dm';

export function useOwlbearBridge(onNotify: (message: string, error?: boolean) => void) {
  const [token, setToken] = useState('');
  const [connected, setConnected] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const requested = useRef(new Map<string, { started: number; label: string }>());
  const notify = useRef(onNotify);
  useEffect(() => { notify.current = onNotify; }, [onNotify]);
  useEffect(() => {
    try { const saved = localStorage.getItem(STORAGE_KEY); const value = saved || crypto.randomUUID(); setToken(value); if (!saved) localStorage.setItem(STORAGE_KEY, value); }
    catch { setToken(crypto.randomUUID()); }
  }, []);
  useEffect(() => {
    if (!token) return;
    let live = true;
    let disconnectTimer: ReturnType<typeof setTimeout> | undefined;
    const updateConnection = (online: boolean) => {
      if (!live) return;
      if (online) {
        if (disconnectTimer) clearTimeout(disconnectTimer);
        disconnectTimer = undefined;
        setConnected(true);
      } else if (!disconnectTimer) {
        // A single failed poll does not mean the Owlbear room has closed.
        disconnectTimer = setTimeout(() => { disconnectTimer = undefined; if (live) setConnected(false); }, 10_000);
      }
    };
    const poll = async () => {
      try {
        const response = await fetch(`/api/owlbear/bridge?token=${encodeURIComponent(token)}`, { cache: 'no-store' });
        if (!response.ok) throw new Error();
        const data = await response.json() as { connected: boolean; result: BridgeResult | null };
        if (!live) return;
        updateConnection(data.connected);
        const now = Date.now();
        for (const [id, request] of requested.current) if (now - request.started >= 60_000) requested.current.delete(id);
        if (data.result) {
          const request = requested.current.get(data.result.id);
          if (request) {
            requested.current.delete(data.result.id);
            setPending(current => current === data.result?.id ? null : current);
            if (now - request.started < 30_000) notify.current(`${request.label}: ${data.result.text}`, data.result.error);
          }
        }
      } catch { updateConnection(false); }
    };
    void poll();
    const timer = setInterval(() => void poll(), 1500);
    return () => { live = false; clearInterval(timer); if (disconnectTimer) clearTimeout(disconnectTimer); };
  }, [token]);
  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => { const timedOut = requested.current.delete(pending); setPending(current => current === pending ? null : current); if (timedOut) notify.current('La tirada no ha recibido respuesta de Owlbear.', true); }, 30_000);
    return () => clearTimeout(timer);
  }, [pending]);
  const copyCode = async () => {
    if (!token) { notify.current('El código de enlace aún se está preparando.', true); return; }
    let copied = false;
    try { await navigator.clipboard.writeText(token); copied = true; }
    catch {
      const field = document.createElement('textarea');
      try {
        field.value = token;
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.appendChild(field);
        field.select();
        copied = document.execCommand('copy');
      } catch { copied = false; }
      finally { field.remove(); }
    }
    notify.current(copied ? 'Código de Owlbear copiado. Pégalo en la extensión Grimorio.' : `Copia este código para Owlbear: ${token}`, !copied);
  };
  const submit = async (label: string, notation: string, character: string, entries?: RollEntry[], displayLabel = label): Promise<boolean> => {
    if (!connected) { await copyCode(); return false; }
    const id = crypto.randomUUID();
    requested.current.set(id, { started: Date.now(), label: `${character} · ${displayLabel}` });
    setPending(id);
    try {
      const response = await fetch('/api/owlbear/bridge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, action: 'roll', roll: { id, label, notation, entries, audience: 'everyone' satisfies Audience, character } }) });
      if (!response.ok) throw new Error((await response.json() as { error?: string }).error || 'No se pudo enviar la tirada.');
      return true;
    } catch (error) { requested.current.delete(id); setPending(current => current === id ? null : current); notify.current(error instanceof Error ? error.message : 'No se pudo enviar la tirada.', true); return false; }
  };
  const roll = (label: string, notation: string, character: string) => submit(label, notation, character);
  // The notation carries each label so an already-open older Owlbear bridge can forward it unchanged.
  const rollBatch = (entries: RollEntry[], character: string) => submit('', dicePlusNotation({ label: '', notation: '', entries }), character, entries, entries.map(entry => entry.label).join(' + '));
  return { connected, copyCode, roll, rollBatch, pending: Boolean(pending) };
}
