import type { ReactNode } from 'react';

export default function OwlbearLayout({ children }: { children: ReactNode }) {
  return <><script dangerouslySetInnerHTML={{ __html: `window.addEventListener('message',function(e){if(e.source===window.parent&&e.data&&e.data.id==='OBR_READY'){window.__grimorioReadyEvent={origin:e.origin,data:e.data}}})` }} />{children}</>;
}
