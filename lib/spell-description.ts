import type { Spell } from './types';

// Some source descriptions include the printed heading and stat block. Keep the
// original when the boundary cannot be identified confidently.
function descriptionBody(spell: Spell): string {
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

export function spellDescriptionSections(spell: Spell): { effect: string; progression: string; progressionLabel: string } {
  const body = descriptionBody(spell);
  const higherLevels = spell.higherLevels.trim();
  if (higherLevels) {
    const effect = body.endsWith(higherLevels)
      ? body.slice(0, -higherLevels.length).replace(/\s*A niveles superiores\s*:\s*$/i, '').trim()
      : body;
    return { effect: effect || body, progression: higherLevels, progressionLabel: 'A niveles superiores' };
  }

  if (spell.level === 0) {
    const sentences = body.match(/[^.!?]+[.!?]?/g)?.map(sentence => sentence.trim()).filter(Boolean) ?? [];
    const first = sentences.findIndex(sentence => /\bnivel(?:es)?\s+(?:5|superiores)\b/i.test(sentence));
    if (first >= 0) {
      let last = first;
      while (last + 1 < sentences.length && last - first < 2 && !(/\bnivel\s+11\b/i.test(sentences.slice(first, last + 1).join(' ')) && /\bnivel\s+17\b/i.test(sentences.slice(first, last + 1).join(' ')))) last++;
      const progression = sentences.slice(first, last + 1).join(' ');
      if (/\bnivel\s+5\b/i.test(progression) && /\bnivel\s+11\b/i.test(progression) && /\bnivel\s+17\b/i.test(progression)) {
        const effect = [...sentences.slice(0, first), ...sentences.slice(last + 1)].join(' ').trim();
        if (effect) return { effect, progression, progressionLabel: 'Progresión por nivel de personaje' };
      }
    }
  }
  return { effect: body, progression: '', progressionLabel: '' };
}

export function spellEffect(spell: Spell): string { return spellDescriptionSections(spell).effect; }
