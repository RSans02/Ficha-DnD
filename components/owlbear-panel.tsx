'use client';

import { useEffect, useState } from 'react';
import { connectOwlbear, type OwlbearSdk } from '@/lib/owlbear-client';
import './owlbear-panel.css';

export const BRIDGE_METADATA_KEY = 'com.grimorio.sheet/bridge';
const TOKEN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function OwlbearPanel() {
  const [obr, setObr] = useState<OwlbearSdk | null>(null);
  const [token, setToken] = useState('');
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState('Conectando con Owlbear…');
  useEffect(() => {
    let live = true;
    void connectOwlbear().then(async sdk => {
      const metadata = await sdk.player.getMetadata();
      if (!live) return;
      setObr(sdk);
      const saved = metadata[BRIDGE_METADATA_KEY];
      if (typeof saved === 'string' && TOKEN.test(saved)) { setToken(saved); setDraft(saved); setMessage('Ficha vinculada. Ya puedes tirar desde su pestaña.'); }
      else setMessage('Copia aquí el código que aparece en la ficha.');
    }).catch(error => { if (live) setMessage(error instanceof Error ? error.message : 'No se pudo conectar con Owlbear.'); });
    return () => { live = false; };
  }, []);
  const save = async () => {
    if (!obr || !TOKEN.test(draft.trim())) { setMessage('Pega un código de enlace válido de la ficha.'); return; }
    try { await obr.player.setMetadata({ [BRIDGE_METADATA_KEY]: draft.trim() }); setToken(draft.trim()); setMessage('Ficha vinculada. Ya puedes tirar desde su pestaña.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo guardar el enlace.'); }
  };
  return <main className="owlbear-panel"><div className="owlbear-header"><div><span>GRIMORIO · OWLBEAR</span><h1>Conectar ficha</h1></div></div>
    <p className="owlbear-hint">Abre tu ficha de Grimorio en otra pestaña. Pulsa «Conectar Owlbear» y copia el código de enlace.</p>
    <label>Código de la ficha<input value={draft} onChange={event => setDraft(event.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" /></label>
    <button className="owlbear-save" onClick={() => void save()} disabled={!obr || !TOKEN.test(draft.trim())}>Vincular ficha</button>
    <p className="owlbear-status" role="status">{message}</p>
    {token && <p className="owlbear-hint">Las tiradas se hacen desde la ficha. Este panel puede cerrarse; la extensión sigue conectada mientras la sala esté abierta.</p>}
  </main>;
}
