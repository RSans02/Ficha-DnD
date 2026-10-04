import type { Background, Catalog } from './types';

export function backgroundParentName(background: Background, catalog: Catalog): string | null {
  if (!background.parentId) return null;
  return catalog.backgrounds.find(candidate => candidate.id === background.parentId)?.name ?? null;
}

export function backgroundDisplayName(background: Background, catalog: Catalog): string {
  const parent = backgroundParentName(background, catalog);
  return parent ? `${background.name} (variante de ${parent})` : background.name;
}
