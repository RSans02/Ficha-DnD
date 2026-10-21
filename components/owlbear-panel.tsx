'use client';

import { useEffect, useState } from 'react';
import { connectOwlbear, type OwlbearSdk } from '@/lib/owlbear-client';
import { BRIDGE_METADATA_KEY, runOwlbearBridge, type BridgeWorkerStatus } from '@/lib/owlbear-bridge-worker';
import './owlbear-panel.css';

const TOKEN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function OwlbearPanel() {
  const [obr, setObr] = useState<OwlbearSdk | null>(null);
  const [token, setToken] = useState('');
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState('Conectando con Owlbear…');
  const [bridge, setBridge] = useState<BridgeWorkerStatus | null>(null);
  useEffect(() => {
    let live = true;
    void connectOwlbear().then(async sdk => {
      const metadata = await sdk.player.getMetadata();
      if (!live) return;
      setObr(sdk);
      const saved = metadata[BRIDGE_METADATA_KEY];
      if (typeof saved === 'string' && TOKEN.test(saved)) { setToken(saved); setDraft(saved); setMessage('Código guardado. Comprobando el puente…'); }
      else setMessage('Copia aquí el código que aparece en la ficha.');
    }).catch(error => { if (live) setMessage(error instanceof Error ? error.message : 'No se pudo conectar con Owlbear.'); });
    return () => { live = false; };
  }, []);
  useEffect(() => {
    if (!obr) return;
    return runOwlbearBridge(obr, 'panel', setBridge);
  }, [obr]);
  const save = async () => {
    if (!obr || !TOKEN.test(draft.trim())) { setMessage('Pega un código de enlace válido de la ficha.'); return; }
    try { await obr.player.setMetadata({ [BRIDGE_METADATA_KEY]: draft.trim() }); setToken(draft.trim()); setBridge(null); setMessage('Código guardado. Comprobando el puente…'); }
    catch (error) { setBridge(null); setMessage(error instanceof Error ? error.message : 'No se pudo guardar el enlace.'); }
  };
  return <main className="owlbear-panel"><div className="owlbear-header"><div><span>GRIMORIO · OWLBEAR</span><h1>Conectar ficha</h1></div></div>
    <p className="owlbear-hint">Abre tu ficha de Grimorio en otra pestaña. Pulsa «Conectar Owlbear» y copia el código de enlace.</p>
    <label>Código de la ficha<input value={draft} onChange={event => setDraft(event.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" /></label>
    <button className="owlbear-save" onClick={() => void save()} disabled={!obr || !TOKEN.test(draft.trim())}>Vincular ficha</button>
    <p className="owlbear-status" role="status">{bridge?.active ? 'Puente activo. La ficha debería indicar «Owlbear conectado».' : bridge?.message ?? message}</p>
    {token && bridge?.active && <p className="owlbear-hint">{bridge.backgroundConnected ? 'Puedes cerrar este panel: el puente sigue activo en segundo plano mientras la sala esté abierta.' : 'Deja este panel abierto para tirar. Si quieres cerrarlo, actualiza o vuelve a instalar la extensión Grimorio para activar el puente en segundo plano.'}</p>}
  </main>;
}
