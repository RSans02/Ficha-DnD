import { checkPrerequisites } from './engine';
import type { Catalog, Character, ChoiceOption } from './types';

export type InvocationStatus = 'all' | 'available' | 'selected' | 'locked';
export type InvocationPact = 'all' | 'none' | 'cadena' | 'hoja' | 'tomo' | 'talisman' | 'grimorio-profundo';
export interface InvocationFilters { query: string; status: InvocationStatus; pact: InvocationPact; level: number | null }

const fold = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');

export function invocationPact(option: ChoiceOption): Exclude<InvocationPact, 'all' | 'none'> | null {
  const features = (option.prerequisites ?? []).filter(requirement => requirement.type === 'feature').map(requirement => String(requirement.value ?? ''));
  if (features.some(id => id.includes('pacto-de-la-cadena'))) return 'cadena';
  if (features.some(id => id.includes('pacto-de-la-hoja'))) return 'hoja';
  if (features.some(id => id.includes('pacto-del-tomo'))) return 'tomo';
  if (features.some(id => id.includes('pacto-del-talisman'))) return 'talisman';
  if (features.some(id => id.includes('grimorio-profundo') || id.toLocaleLowerCase('es') === 'pacto del grimorio profundo')) return 'grimorio-profundo';
  return null;
}

export function invocationLevel(option: ChoiceOption): number | null {
  const levels = (option.prerequisites ?? []).filter(requirement => requirement.type === 'class' && requirement.value === 'class-brujo' && typeof requirement.minimum === 'number').map(requirement => requirement.minimum!);
  return levels.length ? Math.max(...levels) : null;
}

export function filterInvocationOptions(options: ChoiceOption[], selected: string[], character: Character, catalog: Catalog, filters: InvocationFilters): ChoiceOption[] {
  const query = fold(filters.query.trim());
  return options.map((option, index) => ({ option, index, selected: selected.includes(option.id), locked: checkPrerequisites(option.prerequisites ?? [], character, catalog).length > 0 }))
    .filter(({ option, selected: chosen, locked }) =>
      (!query || fold(`${option.name} ${option.description ?? ''}`).includes(query)) &&
      (filters.status === 'all' || filters.status === 'selected' && chosen || filters.status === 'available' && !locked || filters.status === 'locked' && locked) &&
      (filters.pact === 'all' || filters.pact === 'none' && !invocationPact(option) || invocationPact(option) === filters.pact) &&
      (filters.level === null || filters.level === 0 && invocationLevel(option) === null || invocationLevel(option) === filters.level))
    .sort((a, b) => Number(a.locked) - Number(b.locked) || Number(b.selected) - Number(a.selected) || a.option.name.localeCompare(b.option.name, 'es') || a.index - b.index)
    .map(({ option }) => option);
}
