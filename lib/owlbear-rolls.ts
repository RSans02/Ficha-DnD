export type RollMode = 'normal' | 'advantage' | 'disadvantage';

/** Dice+ displays a trailing # description alongside the roll result. */
export function labeledNotation(notation: string, label: string): string {
  const description = label.replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 80).trim();
  return description ? `${notation} # ${description}` : notation;
}

export function d20Notation(modifier: number, mode: RollMode = 'normal'): string {
  if (!Number.isInteger(modifier) || Math.abs(modifier) > 10000) throw new Error('Bonificador de tirada inválido.');
  const die = mode === 'advantage' ? '2d20kh1' : mode === 'disadvantage' ? '2d20kl1' : '1d20';
  return `${die}${modifier > 0 ? `+${modifier}` : modifier < 0 ? modifier : ''}`;
}

/** Dice+ accepts richer syntax, but sheet damage is free text. Only pass unambiguous arithmetic. */
export function damageNotation(damage: string, bonus = 0): string | null {
  if (!Number.isInteger(bonus) || Math.abs(bonus) > 10000) return null;
  const compact = damage.replace(/\s+/g, '').toLowerCase();
  if (!compact || compact.length > 100 || !/^(?:(?:[1-9]\d?)?d(?:4|6|8|10|12|20|100)|\d{1,4})(?:[+-](?:(?:[1-9]\d?)?d(?:4|6|8|10|12|20|100)|\d{1,4}))*$/.test(compact)) return null;
  return `${compact}${bonus > 0 ? `+${bonus}` : bonus < 0 ? bonus : ''}`;
}
