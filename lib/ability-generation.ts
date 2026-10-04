import { ABILITIES } from './constants';
import type { AbilityScores, Character } from './types';

export const STANDARD_ARRAY = [15,14,13,12,10,8];
export const POINT_COST: Record<number,number> = {8:0,9:1,10:2,11:3,12:4,13:5,14:7,15:9};
export const abilityScoresFrom = (values: number[]) => Object.fromEntries(ABILITIES.map((a,i) => [a.id,values[i]])) as AbilityScores;
export const rollScore = (roll: number[]) => [...roll].sort((a,b) => b-a).slice(0,3).reduce((a,b) => a+b,0);
export const pointBuyCost = (scores: AbilityScores) => ABILITIES.reduce((total,a) => total + (POINT_COST[scores[a.id]] ?? Infinity),0);
export function abilityGenerationIssues(c: Character): string[] {
  const values = ABILITIES.map(a => c.abilities[a.id]), method = c.abilityGeneration?.method ?? 'manual';
  if (values.some(value => !Number.isInteger(value) || value < 1 || value > 20)) return ['Introduce puntuaciones base enteras entre 1 y 20.'];
  if (method === 'point-buy' && pointBuyCost(c.abilities) > 27) return ['Compra de puntos: usa valores de 8 a 15 y un máximo de 27 puntos antes de los aumentos raciales.'];
  const rolls = c.abilityGeneration?.rolls;
  if (method === 'rolled' && (!rolls || rolls.length !== 6 || rolls.some(row => row.length !== 4 || row.some(die => !Number.isInteger(die) || die < 1 || die > 6)))) return ['Genera las seis tiradas de 4d6 para asignar tus puntuaciones.'];
  const expected = method === 'standard' ? STANDARD_ARRAY : method === 'rolled' ? rolls!.map(rollScore) : null;
  if (expected && [...expected].sort((a,b) => a-b).join() !== [...values].sort((a,b) => a-b).join()) return ['Asigna una vez cada puntuación obtenida; puedes intercambiarlas entre características.'];
  return [];
}
