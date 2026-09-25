import { catalog } from '@/lib/catalog';
export const dynamic = 'force-static';
export function GET(){return Response.json(catalog,{headers:{'Cache-Control':'public, max-age=3600'}})}
