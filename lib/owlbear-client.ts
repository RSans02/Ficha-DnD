export type OwlbearSdk = typeof import('@owlbear-rodeo/sdk').default;

declare global { interface Window { __grimorioReadyEvent?: { origin: string; data: unknown } } }

export async function connectOwlbear(): Promise<OwlbearSdk> {
  const { default: sdk } = await import('@owlbear-rodeo/sdk');
  if (!sdk.isAvailable) throw new Error('Abre este panel desde una sala de Owlbear Rodeo.');
  if (!sdk.isReady && window.__grimorioReadyEvent) {
    const ready = window.__grimorioReadyEvent;
    window.dispatchEvent(new MessageEvent('message', { origin: ready.origin, data: ready.data, source: window.parent }));
  }
  if (sdk.isReady) return sdk;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Owlbear no respondió. Cierra y vuelve a abrir la extensión.')), 8000);
    sdk.onReady(() => { clearTimeout(timer); resolve(sdk); });
  });
}
