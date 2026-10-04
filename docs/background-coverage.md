# Trasfondos de 2014 y ampliaciones del manual

Los 31 trasfondos del catálogo (25 principales y 6 variantes) tienen competencias y elecciones estructuradas, además de equipo inicial. La narrativa del PDF se conserva con sus páginas. La base normativa es D&D 5e de 2014; los trasfondos posteriores del manual no reciben aumentos de características ni dotes de origen propios de las reglas revisadas de 2024.

`scripts/background_rules.py` completa herramientas, idiomas y alternativas sobre la extracción de habilidades de `scripts/import_reference_catalogs.py`. `scripts/import_background_equipment.py` genera los objetos y monedas de `data/rules/background-equipment.json` desde las páginas 395–417. Ambos pasos son reproducibles.

## Decisiones y correcciones

- Cada trasfondo resuelve dos habilidades y dos competencias con herramientas o idiomas. Las elecciones de habilidades de Agente de una Facción, Caballero de la Orden, Cazarrecompensas Urbano, Erudito Enclaustrado y Heredero no se conceden como si todas sus opciones fueran competencias fijas.
- Héroe de Pueblo no recibe el idioma añadido por error en el PDF. Sus beneficios de 2014 son Trato con animales, Supervivencia, una herramienta de artesano y vehículos terrestres. Contrastado con [Basic Rules 2014, Folk Hero](https://www.dndbeyond.com/sources/dnd/basic-rules-2014/personality-and-background#FolkHero).
- Artesano del Clan concede Enano; la elección de otro idioma solo procede si Enano ya llega por otra fuente. La decisión lleva `replacementForLanguage` para esa condición.
- Mercader de Gremio permite conservar la herramienta de artesano, sustituirla por herramientas de navegación o elegir un idioma adicional. Cazarrecompensas Urbano debe escoger dos categorías diferentes entre juego, instrumento y herramientas de ladrón; se identifica con `distinctCategories`.
- Las variantes Espía, Pirata, Gladiador y Caballero mantienen las competencias de su trasfondo base. Investigador sustituye Atletismo por Investigación. Las sustituciones de equipo del Mercader y Gladiador son alternativas, no objetos acumulados.
- Tener competencia no entrega automáticamente la herramienta: Criminal es competente con herramientas de ladrón, pero su equipo inicial no las incluye. Poseer un instrumento tampoco concede competencia.
- Artesano del Clan y Forastero Errante requieren competencia con el objeto que se elige. Sus elecciones de equipo llevan `requiresProficiency`.
- Las gemas de Artesano del Clan y Forastero Errante son objetos de valor 10 po; el monedero contiene 5 po. No se suman las gemas al dinero. La alternativa de oro de la clase renuncia al equipo y monedas del trasfondo.

## Objetos narrativos

Recuerdos, cartas, insignias, herencias y otros objetos que no tienen una equivalencia inequívoca en la tabla de equipo se incluyen con su nombre y descripción. Su peso queda pendiente de completar; no se supone valor económico ni propiedades mágicas. Heredero conserva la herencia y un objeto competente por concretar con el DM. Los seguidores del Caballero se describen como personajes, no se introducen como objetos.

Los rasgos sociales y narrativos de los trasfondos permanecen disponibles en su descripción. No se simulan automáticamente favores, contactos o servicios del DM. Las reglas generales de trasfondos de 2014 permiten personalización y sustitución de competencias repetidas; la ficha conserva ajustes manuales para los acuerdos de la mesa.

## Comprobación

`tests/backgrounds-2014.test.ts` verifica cobertura de los 31 registros, cantidades de competencias, variantes, concesión real de herramientas e idiomas, condiciones de las elecciones, referencias de equipo, categorías elegibles y la separación entre gemas, monedas, competencias y objetos.
