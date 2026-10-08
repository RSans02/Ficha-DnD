import type { Catalog, Character, Choice } from './types';
import { getPendingChoices } from './engine';
import { abilityGenerationIssues } from './ability-generation';
import { startingEquipmentIssues } from './equipment';

export interface CreationIssue { step: number; id: string; text: string }

const competenceTypes = new Set(['skills', 'choose_skill', 'choose_proficiency', 'choose_tool', 'choose_language']);
export const creationChoiceStep = (choice: Choice): number =>
  ['cantrips', 'spells', 'prepared'].includes(choice.type) ? 6 : competenceTypes.has(choice.type) ? 4 : 5;

export function getCreationIssues(character: Character, catalog: Catalog): CreationIssue[] {
  const issues: CreationIssue[] = [];
  const add = (step: number, id: string, text: string) => issues.push({ step, id, text });
  if (!character.name.trim()) add(0, 'name', 'Ponle un nombre al personaje.');
  const race = catalog.races.find(entry => entry.id === character.raceId);
  if (!race) add(1, 'race', 'Elige una raza o linaje.');
  else if (catalog.races.some(entry => entry.parentId === race.id && entry.kind === 'subrace') && !character.subraceId) add(1, 'subrace', 'Elige una subraza.');
  if (!character.classes.length) add(2, 'class', 'Elige una clase.');
  abilityGenerationIssues(character).forEach((text, index) => add(3, `ability-${index}`, text));
  if (race && character.classes.length) {
    getPendingChoices(character, catalog).filter(choice => choice.required !== false).forEach(choice => {
      const className = choice.classId && ['cantrips', 'spells', 'prepared'].includes(choice.type)
        ? catalog.classes.find(entry => entry.id === choice.classId)?.name
        : undefined;
      add(creationChoiceStep(choice), choice.id, className ? `${choice.name} · ${className}` : choice.name);
    });
    startingEquipmentIssues(character, catalog).forEach((text, index) => add(8, `equipment-${index}`, text));
  }
  return issues;
}
