import type { Catalog, Feature } from './types';

export type FeatureCategory = 'Raciales' | 'Clase' | 'Subclase' | 'Dotes' | 'Otros';

export function featureCategory(feature: Feature, catalog: Catalog): FeatureCategory {
  const originId = feature.originId;
  if (originId === 'manual') return feature.manualCategory ?? 'Otros';
  if (catalog.races.some(race => race.id === originId)) return 'Raciales';
  if (catalog.classes.some(cls => cls.subclasses.some(subclass => subclass.id === originId))) return 'Subclase';
  if (catalog.classes.some(cls => cls.id === originId)) return 'Clase';
  if (catalog.feats.some(feat => feat.id === originId)) return 'Dotes';
  return 'Otros';
}
