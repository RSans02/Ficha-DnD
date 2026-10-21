import type { OwlbearSdk } from './owlbear-client';

export function configureOwlbearAction(obr: OwlbearSdk): void {
  // Update existing installations when their saved manifest still has the old action settings.
  void Promise.allSettled([
    obr.action.setIcon(new URL('/owlbear-icon.svg', window.location.href).href),
    obr.action.setHeight(540),
  ]);
}
