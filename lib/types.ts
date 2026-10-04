export type Ability = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
export type AbilityScores = Record<Ability, number>;
export interface Source { page: number; endPage?: number; title?: string; book?: string; url?: string }
export interface Entity { id: string; name: string; description: string; source: Source; automationNotes?: string[] }
export interface Effect { type: string; ability?: Ability; value?: number | string; category?: string; skill?: string; level?: number; spellId?: string; replaces?: string; [key: string]: unknown }
export interface Prerequisite { type: string; value?: string | number; ability?: Ability; minimum?: number; options?: Prerequisite[]; [key: string]: unknown }
export interface ChoiceOption { id: string; name: string; description?: string; effects?: Effect[]; prerequisites?: Prerequisite[] }
export interface Choice { id: string; type: string; name: string; amount: number; options: (ChoiceOption | string)[]; source?: Source; required?: boolean; distinctFrom?: string[]; classId?: string; level?: number; [key: string]: unknown }
export interface Feature extends Entity { originId: string; level: number | null; optional?: boolean; choices?: Choice[]; effects?: Effect[]; resource?: { max: number | { ability: string; min: number } | { byLevel: number[] }; recovery: 'short' | 'long' | 'manual' } }
export interface Race extends Entity { parentId: string | null; kind: 'race' | 'subrace' | 'lineage' | 'variant'; version: string; category: string; size: string | null; speed: number | null; abilityBonuses: Partial<AbilityScores>; languages: string[]; senses: string[]; resistances: string[]; immunities: string[]; featureIds: string[]; choices: Choice[]; effects: Effect[]; replacesParent?: boolean }
export interface Progression { level: number; proficiencyBonus: number | null; featureIds: string[]; featureNames: string[]; slots: number[]; cantrips: number | null; knownSpells: number | null; resources: Record<string, number> }
export interface Subclass extends Entity { featureIds: string[]; spellcasting?: Spellcasting; progression?: Progression[] }
export interface Spellcasting { ability: Ability; mode: 'known' | 'prepared' | 'spellbook' | 'pact'; progression: 'full' | 'half' | 'third' | 'pact'; preparedFormula?: 'level+ability' | 'halfLevel+ability'; recovery?: 'long' | 'short' }
export interface CharacterClass extends Entity { hitDie: number | null; primaryAbilities: string[]; savingThrows: string[]; armorProficiencies: string[]; weaponProficiencies: string[]; toolProficiencies: string[]; skillChoices: { amount: number; options: string[] }; subclassLevel: number | null; subclasses: Subclass[]; featureIds: string[]; progression: Progression[]; spellcasting: Spellcasting | null; multiclassRequirements?: { ability: Ability; minimum: number }[]; choices?: Choice[] }
export interface Spell extends Entity { level: number | null; school: string; castingTime: string; range: string; components: string; duration: string; concentration: boolean; ritual: boolean; higherLevels: string; availableToClasses: string[] }
export interface Feat extends Entity { prerequisiteText: string; prerequisites: Prerequisite[]; effects: Effect[]; choices: Choice[] }
export interface Background extends Entity { toolProficiencies?: string[]; skillProficiencies?: string[]; languages?: string[]; choices?: Choice[]; featureIds?: string[] }
export interface Equipment extends Entity { weaponCategory?: string; equipmentType?: string; category?: string; weight?: number | null; cost?: string; contentsText?: string; damage?: string; damageType?: string; armorClass?: number | null; dexterityCap?: number | null; shieldBonus?: number; armorCategory?: string; properties?: string[] }
export interface Catalog { races: Race[]; classes: CharacterClass[]; features: Feature[]; spells: Spell[]; feats: Feat[]; backgrounds: Background[]; equipment: Equipment[]; startingEquipment?: Record<string, StartingEquipmentDefinition>; backgroundEquipment?: Record<string, StartingEquipmentDefinition> }
export interface CharacterLevel { classId: string; level: number; subclassId?: string }
export interface Attack { id: string; name: string; ability: Ability; proficient: boolean; bonus: number; damage: string; damageBonus?: number; damageType: string; range: string; notes: string; favorite: boolean }
export interface InventoryItem { homebrew?: boolean; startingEquipmentOrigin?: string; id: string; equipmentId?: string; name: string; category: 'Armas' | 'Armaduras' | 'Equipo' | 'Objetos'; quantity: number; weight: number; equipped: boolean; attuned: boolean; description: string; notes: string; armorBase?: number; dexCap?: number; shieldBonus?: number }
export interface Note { id: string; title: string; category: string; content: string; date: string }
export interface HistoryEntry { id: string; date: string; text: string }
export interface Character {
  abilityGeneration?: { method: 'manual' | 'standard' | 'point-buy' | 'rolled'; rolls?: number[][] };
  exhaustionLevel?: number;
  startingEquipment?: StartingEquipmentSelection;
  schemaVersion: 1; id: string; ownerId: string; name: string; concept: string; portrait: string; isDemo: boolean;
  createdAt: string; updatedAt: string; raceId: string; subraceId: string; backgroundId: string; classes: CharacterLevel[];
  abilities: AbilityScores; abilityIncreases: Partial<AbilityScores>; skillRanks: Record<string, number>; skillBonuses: Record<string, number>;
  choices: Record<string, string[]>; featIds: string[]; spellSelections: Record<string, { known: string[]; prepared: string[] }>;
  hp: { current: number; temp: number; rolls: { classId: string; value: number }[]; hitDiceUsed: Record<string, number> };
  resourcesSpent: Record<string, number>; slotsSpent: Record<string, number>; conditions: string[]; inspiration: boolean; deathSaves: { successes: number; failures: number };
  attacks: Attack[]; inventory: InventoryItem[]; money: Record<string, number>; biography: Record<string, string>; notes: Note[];
  favorites: { spells: string[]; features: string[] }; manualOverrides: Record<string, number>; manual: { languages: string[]; senses: string[]; resistances: string[]; immunities: string[]; proficiencies: string[]; features: Feature[] };
  history: HistoryEntry[]; lastLevelSnapshot?: string;
}
export interface Breakdown { label: string; value: number }
export interface DerivedValue { value: number; mode: 'auto' | 'manual' | 'override'; breakdown: Breakdown[]; source?: Source }
export interface DerivedCharacter {
  level: number; proficiency: DerivedValue; abilities: Record<Ability, { base: number; bonus: number; total: number; modifier: number }>;
  saves: Record<Ability, DerivedValue>; skills: Record<string, DerivedValue>; hpMax: DerivedValue; ac: DerivedValue; initiative: DerivedValue; speed: DerivedValue; passivePerception: DerivedValue;
  features: Feature[]; resources: { id: string; name: string; max: number; spent: number; recovery: 'short' | 'long' | 'manual'; source: Source }[];
  spellcasting: { classId: string; ability: Ability; attack: DerivedValue; dc: DerivedValue; maxSpellLevel: number; cantrips: number | null; knownLimit: number | null; preparedLimit: number | null; slots: number[]; pact: boolean }[];
  slots: number[]; pactSlots: { classId: string; level: number; max: number }[]; languages: string[]; senses: string[]; resistances: string[]; immunities: string[]; proficiencies: string[]; warnings: string[];
}

export type EquipmentPickCategory = 'simple-weapon' | 'martial-weapon' | 'melee-martial-weapon' | 'simple-melee-weapon' | 'simple-ranged-weapon' | 'instrument' | 'artisan-tool' | 'gaming-set' | 'any-weapon';
export interface EquipmentGrant { equipmentId?: string; name?: string; quantity: number; description?: string }
export interface EquipmentPick { id: string; name: string; quantity: number; category: EquipmentPickCategory; requiresProficiency?: boolean }
export interface StartingEquipmentOption { id: string; name: string; items: EquipmentGrant[]; picks?: EquipmentPick[]; requiresProficiency?: string[] }
export interface StartingEquipmentGroup { id: string; name: string; options: StartingEquipmentOption[] }
export interface StartingEquipmentDefinition { source: Source; description: string; fixed: EquipmentGrant[]; groups: StartingEquipmentGroup[]; goldAlternative?: { diceCount: number; dieSides: number; multiplier: number; text: string }; coins?: Partial<Record<'po' | 'pp' | 'pc' | 'pe' | 'ppt', number>>; notes?: string[] }
export interface StartingEquipmentSelection { classId: string; backgroundId: string; mode: 'equipment' | 'gold'; selections: Record<string, string>; picks: Record<string, string[]>; verified: string[]; goldRoll?: number; applied?: boolean }
