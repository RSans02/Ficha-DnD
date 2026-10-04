import type { Ability } from './types';

export const ABILITIES: { id: Ability; label: string; short: string }[] = [
  { id: 'str', label: 'Fuerza', short: 'FUE' }, { id: 'dex', label: 'Destreza', short: 'DES' },
  { id: 'con', label: 'Constitución', short: 'CON' }, { id: 'int', label: 'Inteligencia', short: 'INT' },
  { id: 'wis', label: 'Sabiduría', short: 'SAB' }, { id: 'cha', label: 'Carisma', short: 'CAR' },
];
export const SKILLS: { id: string; name: string; ability: Ability }[] = [
  { id: 'acrobatics', name: 'Acrobacias', ability: 'dex' }, { id: 'arcana', name: 'Conocimiento arcano', ability: 'int' },
  { id: 'athletics', name: 'Atletismo', ability: 'str' }, { id: 'deception', name: 'Engaño', ability: 'cha' },
  { id: 'history', name: 'Historia', ability: 'int' }, { id: 'performance', name: 'Interpretación', ability: 'cha' },
  { id: 'intimidation', name: 'Intimidación', ability: 'cha' }, { id: 'investigation', name: 'Investigación', ability: 'int' },
  { id: 'sleight-of-hand', name: 'Juego de manos', ability: 'dex' }, { id: 'medicine', name: 'Medicina', ability: 'wis' },
  { id: 'nature', name: 'Naturaleza', ability: 'int' }, { id: 'perception', name: 'Percepción', ability: 'wis' },
  { id: 'insight', name: 'Perspicacia', ability: 'wis' }, { id: 'persuasion', name: 'Persuasión', ability: 'cha' },
  { id: 'religion', name: 'Religión', ability: 'int' }, { id: 'stealth', name: 'Sigilo', ability: 'dex' },
  { id: 'survival', name: 'Supervivencia', ability: 'wis' }, { id: 'animal-handling', name: 'Trato con animales', ability: 'wis' },
];
export const STANDARD_LANGUAGES_2014 = ['Común', 'Enano', 'Élfico', 'Gigante', 'Gnómico', 'Goblin', 'Mediano', 'Orco'];
export const EXOTIC_LANGUAGES_2014 = ['Abisal', 'Celestial', 'Dracónico', 'Habla profunda', 'Infernal', 'Primordial', 'Silvano', 'Infracomún'];
export const CONDITIONS = ['Agarrado', 'Apresado', 'Asustado', 'Aturdido', 'Cegado', 'Derribado', 'Encantado', 'Envenenado', 'Incapacitado', 'Inconsciente', 'Invisible', 'Paralizado', 'Petrificado', 'Ensordecido', 'Agotamiento'];

/** Competencias al añadir una clase; tabla p.451. Las habilidades se resuelven mediante Choices. */
export const MULTICLASS_PROFICIENCIES: Record<string, string[]> = {
  artificiero: ['Armadura ligera', 'Armadura media', 'Escudos', 'Herramientas de ladrón', 'Herramientas de hojalatero'],
  barbaro: ['Escudos', 'Armas simples', 'Armas marciales'], bardo: ['Armadura ligera'], brujo: ['Armadura ligera', 'Armas simples'],
  clerigo: ['Armadura ligera', 'Armadura media', 'Escudos'], druida: ['Armadura ligera', 'Armadura media', 'Escudos'],
  explorador: ['Armadura ligera', 'Armadura media', 'Escudos', 'Armas simples', 'Armas marciales'], guerrero: ['Armadura ligera', 'Armadura media', 'Escudos', 'Armas simples', 'Armas marciales'],
  hechicero: [], mago: [], monje: ['Armas simples', 'Espadas cortas'], paladin: ['Armadura ligera', 'Armadura media', 'Escudos', 'Armas simples', 'Armas marciales'], picaro: ['Armadura ligera', 'Herramientas de ladrón'],
};

/** Tabla de lanzador multiclase: Manual Para Casi Todo, p. 452. */
export const MULTICLASS_SLOTS: number[][] = [[], [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1]];
