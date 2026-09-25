import type { Catalog, Character } from './types';
import { createCharacter, deriveCharacter, getAllChoices, withHistory } from './engine';
export function createDemo(catalog:Catalog):Character {
  const c=createCharacter();
  c.name='Elyndra Susurrolunar'; c.concept='Guardiana de los secretos olvidados'; c.isDemo=true;c.portrait='/images/elf-wizard.webp';c.color='#587065';
  c.raceId='race-elfo';c.subraceId='race-alto-elfo';c.classes=[{classId:'class-mago',level:3,subclassId:catalog.classes.find(x=>x.id==='class-mago')?.subclasses[0]?.id}];
  c.abilities={str:8,dex:14,con:13,int:15,wis:12,cha:10};c.hp.rolls=[{classId:'class-mago',value:4},{classId:'class-mago',value:4}];
  c.choices['skills.class-mago']=['arcana','investigation'];
  for(const ch of getAllChoices(c,catalog)){
    if(ch.type==='choose_language')c.choices[ch.id]=['Dracónico'];
    if(ch.type==='choose_cantrip')c.choices[ch.id]=['spell-luz'];
  }
  const options=catalog.spells.filter(s=>s.availableToClasses.includes('class-mago')&&s.level!==null&&s.level<=2);
  const cantrips=options.filter(s=>s.level===0).slice(0,3).map(s=>s.id);
  const preferred=['spell-proyectil-magico','spell-escudo','spell-detectar-magia','spell-armadura-de-mago','spell-dormir','spell-encontrar-familiar','spell-paso-brumoso','spell-invisibilidad','spell-rayo-abrasador','spell-imagen-multiple'];
  const selected=[...preferred.filter(id=>options.some(s=>s.id===id)),...options.filter(s=>s.level!>0&&!preferred.includes(s.id)).map(s=>s.id)].slice(0,10);
  c.spellSelections['class-mago']={known:[...cantrips,...selected],prepared:selected.slice(0,6)};c.favorites.spells=selected.slice(0,3);
  c.attacks=[{id:crypto.randomUUID(),name:'Bastón de viaje',ability:'str',proficient:true,bonus:0,damage:'1d6',damageType:'Contundente',range:'5 pies',notes:'Arma de la tabla del manual, p. 423.',favorite:true}];
  c.inventory=[{id:crypto.randomUUID(),name:'Libro de conjuros',category:'Equipo',quantity:1,weight:3,equipped:true,attuned:false,description:'Un libro de tapas verdes y notas escritas con tinta dorada.',notes:'Objeto del personaje demo.'}];
  c.money.po=15; c.manualOverrides.ac=13;
  c.biography={edad:'127 años',alineamiento:'Neutral bueno',ojos:'Verde grisáceo',cabello:'Blanco plateado',historia:'Elyndra abandonó las torres de su pueblo para recuperar las páginas dispersas de un grimorio ancestral. Cada ruina es una pregunta. Cada viaje, una nueva posibilidad.',personalidad:'Escucha con atención y siempre lleva un cuaderno a mano.',ideales:'El conocimiento debe proteger, nunca someter.',vinculos:'Una promesa a su antigua maestra.',defectos:'Le cuesta abandonar una pregunta sin respuesta.'};
  c.notes=[{id:crypto.randomUUID(),title:'El mapa de la torre',category:'Misión',content:'El posadero habla de una torre al otro lado del bosque. Buscar a la cartógrafa antes de partir.\n\nEsta es una nota de ejemplo: puedes editarla o eliminarla.',date:new Date().toISOString().slice(0,10)}];
  c.hp.current=deriveCharacter(c,catalog).hpMax.value;
  return withHistory(c,'Personaje DEMO creado para explorar el grimorio.');
}
