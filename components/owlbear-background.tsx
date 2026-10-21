'use client';

import { useEffect, useState } from 'react';
import { connectOwlbear } from '@/lib/owlbear-client';
import { runOwlbearBridge } from '@/lib/owlbear-bridge-worker';
import './owlbear-panel.css';

export function OwlbearBackground() {
  const [status, setStatus] = useState('Conectando con Owlbear…');
  useEffect(() => {
    let live = true;
    let stop: (() => void) | undefined;
    void connectOwlbear().then(obr => { if (live) stop = runOwlbearBridge(obr, 'background', value => setStatus(value.message)); })
      .catch(error => { if (live) setStatus(error instanceof Error ? error.message : 'Owlbear no disponible.'); });
    return () => { live = false; stop?.(); };
  }, []);
  return <main className="owlbear-panel"><p className="owlbear-status">{status}</p></main>;
}
