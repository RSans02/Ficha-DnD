import type { Feat } from './types';

export function featDescriptionSections(feat: Feat): { introduction: string; benefits: string[] } {
  let body = feat.description.trim();
  if (body.toLocaleLowerCase('es').startsWith(feat.name.toLocaleLowerCase('es'))) {
    body = body.slice(feat.name.length).trim();
  }

  const prerequisite = feat.prerequisiteText.trim().replace(/[.!?]+$/, '');
  if (prerequisite) {
    const prefix = body.match(/^Requisitos?(?:\s+previo)?\s*:\s*/i)?.[0];
    if (prefix && body.slice(prefix.length).toLocaleLowerCase('es').startsWith(prerequisite.toLocaleLowerCase('es'))) {
      body = body.slice(prefix.length + prerequisite.length).replace(/^[\s.!?]+/, '').trim();
    }
  }

  const [introduction = '', ...benefits] = body.split(/\s*•\s*/);
  return { introduction: introduction.trim(), benefits: benefits.map(benefit => benefit.trim()).filter(Boolean) };
}

