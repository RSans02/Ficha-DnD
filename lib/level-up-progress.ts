import type { Catalog, Character } from './types';
import { getLevelUpChoices, getPendingChoices, planLevelUp } from './engine';

export interface LevelUpIssue { step: 0 | 1 | 2; id: string; text: string }

export function getLevelUpIssues(original: Character, draft: Character | null, classId: string, catalog: Catalog): LevelUpIssue[] {
  const issues: LevelUpIssue[] = planLevelUp(original, classId, catalog).errors.map((text, index) => ({ step: 0, id: `class-${index}`, text }));
  if (!draft) return issues;

  const roll = draft.hp.rolls.at(-1);
  const die = catalog.classes.find(cls => cls.id === classId)?.hitDie;
  if (!roll || roll.classId !== classId || !Number.isInteger(roll.value) || roll.value < 1 || (die && roll.value > die)) {
    issues.push({ step: 1, id: 'hp', text: `Elige una tirada de PG entre 1 y ${die ?? 20}.` });
  }

  const available = new Set(getLevelUpChoices(original, draft, catalog).map(choice => choice.id));
  getPendingChoices(draft, catalog).filter(choice => choice.required !== false && (choice.type !== 'asi' || available.has(choice.id))).forEach(choice => {
    const step = ['cantrips', 'spells', 'prepared'].includes(choice.type) ? 2 : 1;
    const className = step === 2 ? catalog.classes.find(cls => cls.id === choice.classId)?.name : undefined;
    issues.push({ step, id: choice.id, text: className ? `${choice.name} · ${className}` : choice.name });
  });
  return issues;
}
