import type { Spell } from './types';

// Some source descriptions include the printed heading and stat block. Keep the
// original when the boundary cannot be identified confidently.
export function spellEffect(spell: Spell): string {
  const description = spell.description.trim();
  const lower = description.toLocaleLowerCase('es');
  if (!lower.startsWith(spell.name.trim().toLocaleLowerCase('es'))) return description;

  const labels = ['tiempo de lanzamiento:', 'alcance:', 'componentes:', 'duración:'];
  let position = spell.name.length;
  for (const label of labels) {
    const next = lower.indexOf(label, position);
    if (next < 0) return description;
    position = next + label.length;
  }

  const duration = spell.duration.trim().toLocaleLowerCase('es');
  const statedDuration = lower.slice(position).trimStart();
  if (!duration || !statedDuration.startsWith(duration)) return description;
  const leadingSpace = lower.slice(position).length - lower.slice(position).trimStart().length;
  const effect = description.slice(position + leadingSpace + duration.length).replace(/^[\s.:;–—-]+/, '').trim();
  return effect || description;
}
