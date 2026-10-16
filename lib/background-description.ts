import type { Background, Catalog } from './types';
import { SKILLS } from './constants';

export interface BackgroundSection {
  heading: string;
  text: string;
  title?: string;
}

export function backgroundDisplayFacts(background: Background, catalog: Catalog): BackgroundSection[] {
  const ownFacts = backgroundDescriptionSections(background).facts;
  const parent = catalog.backgrounds.find(candidate => candidate.id === background.parentId);
  if (!parent) return ownFacts;

  const facts = [...backgroundDescriptionSections(parent).facts];
  for (const fact of ownFacts) {
    const index = facts.findIndex(candidate => candidate.heading === fact.heading);
    if (index < 0) facts.push(fact);
    else facts[index] = fact;
  }

  if (background.skillProficiencies?.length) {
    const names = background.skillProficiencies.map(id => SKILLS.find(skill => skill.id === id)?.name ?? id);
    const skills = { heading: 'Habilidades', text: names.join(', ') + '.' };
    const index = facts.findIndex(fact => fact.heading === 'Habilidades');
    if (index < 0) facts.unshift(skills);
    else facts[index] = skills;
  }

  if (background.name === 'Mercader de Gremio') {
    const index = facts.findIndex(fact => fact.heading === 'Herramientas');
    if (index >= 0) facts[index] = {
      heading: 'Herramientas',
      text: 'Un tipo de herramientas de artesano; puedes optar por herramientas de navegación o un idioma adicional en su lugar.',
    };
  }
  return facts;
}

function featureTitle(text: string): { title: string; text: string } | null {
  const words = [...text.matchAll(/\S+/g)];
  const connectors = new Set(['a', 'al', 'de', 'del', 'el', 'en', 'la', 'las', 'los', 'se', 'y']);
  const starters = new Set(['antes', 'aunque', 'como', 'conoces', 'debido', 'dado', 'escoge', 'gracias', 'mientras', 'recibes', 'saber', 'si', 'siempre', 'suelos', 'te', 'tienes', 'tu', 'cuando', 'no']);
  for (const fallback of [false, true]) {
    for (let index = 1; index < Math.min(words.length - 1, 9); index++) {
      const current = words[index][0].replace(/^[¿¡"'“]+/, '');
      const next = words[index + 1][0].replace(/^[¿¡"'“]+/, '');
      const startsSentence = starters.has(current.toLocaleLowerCase('es'));
      const capitalizationBoundary = /^[A-ZÁÉÍÓÚÑ]/u.test(current) && /^[a-záéíóúñ]/u.test(next) && !connectors.has(next.toLocaleLowerCase('es'));
      if (fallback ? !startsSentence : !capitalizationBoundary) continue;
      const title = text.slice(0, words[index].index).trim();
      if (title.length < 4) continue;
      return { title, text: text.slice(words[index].index).trim() };
    }
  }
  return null;
}

export function backgroundDescriptionSections(background: Background): {
  introduction: string;
  facts: BackgroundSection[];
  sections: BackgroundSection[];
} {
  let body = background.description.trim();
  if (body.toLocaleLowerCase('es').startsWith(background.name.toLocaleLowerCase('es'))) {
    body = body.slice(background.name.length).trim();
  }

  const headingPattern = /\b(Competencias?\s+(?:con|en)\s+habilidades|Competencias?\s+(?:con|en)\s+herramientas|Idiomas?|Equipo|Rasgo|Variante)\s*:/gi;
  const matches = [...body.matchAll(headingPattern)];
  const introduction = body.slice(0, matches[0]?.index ?? body.length).trim();
  const facts: BackgroundSection[] = [];
  const sections: BackgroundSection[] = [];

  for (let index = 0; index < matches.length; index++) {
    const match = matches[index];
    const text = body.slice(match.index! + match[0].length, matches[index + 1]?.index ?? body.length).trim();
    if (!text) continue;
    const heading = match[1].toLocaleLowerCase('es');
    if (heading.includes('habilidades')) facts.push({ heading: 'Habilidades', text });
    else if (heading.includes('herramientas')) facts.push({ heading: 'Herramientas', text });
    else if (heading === 'idioma' || heading === 'idiomas') facts.push({ heading: 'Idiomas', text });
    else if (heading === 'equipo') {
      const equipment = text.match(/^.*?\.(?=\s|$)/s)?.[0] ?? text;
      facts.push({ heading: 'Equipo inicial', text: equipment });
      const extra = text.slice(equipment.length).trim();
      if (extra) {
        const titled = featureTitle(extra);
        sections.push({ heading: 'Información adicional', title: titled?.title, text: titled?.text ?? extra });
      }
    } else if (heading === 'rasgo') {
      const feature = featureTitle(text);
      sections.push({ heading: 'Rasgo del trasfondo', title: feature?.title, text: feature?.text ?? text });
    } else {
      const detail = text.startsWith(background.name + ' ')
        ? text.slice(background.name.length).trim()
        : text;
      const titled = background.parentId ? null : featureTitle(detail);
      sections.push({ heading: 'Variante', title: titled?.title, text: titled?.text ?? detail });
    }
  }

  return { introduction, facts, sections };
}
