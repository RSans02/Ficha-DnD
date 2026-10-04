# Auditoría de reglas de 2014

La aplicación usa D&D 5e de 2014. El Manual para Casi Todo aporta su catálogo y los suplementos de esa edición. SRD 5.1 y Basic Rules (2014) completan las reglas generales y resuelven erratas comprobadas; no se incorporan las reglas revisadas de 2024.

Las correcciones siguientes modifican los valores efectivos y conservan la descripción, página y datos originales del PDF. Los extractores las reproducen, de modo que volver a importar el manual no restaura las erratas.

## Correcciones de datos

| Apartado | Valor efectivo | Evidencia |
|---|---|---|
| Bardo, clérigo, druida, hechicero y mago | Tres espacios de nivel 4 desde nivel de clase 9; el PDF imprime dos entre los niveles 9–17 | SRD 5.1 español, tablas pp. 11, 21, 25, 36 y 40 |
| Druida: armas competentes | Hoz en lugar de estoque | SRD 5.1 español, p. 25 |
| Druida: equipo inicial | Cimitarra o arma simple cuerpo a cuerpo; el PDF dice a distancia | SRD 5.1 español, p. 25 |
| Bardo: instrumento inicial nombrado | Laúd; la alternativa sigue permitiendo cualquier otro instrumento, incluida lira | SRD 5.1 español, p. 11 |
| Caballero Arcano: tercer truco | Nivel 10, siguiendo la prosa del rasgo; la tabla del PDF lo adelanta a 9 | Manual suministrado, p. 259, Lanzamiento de Hechizos |
| Genasi del Agua legado | +1 Sabiduría; el PDF imprime Inteligencia | Elemental Evil Player’s Companion, p. 10 |
| Herramientas de artesano | Se excluyen herramientas de ladrón y navegación de esta categoría | SRD 5.1 español, p. 72 |
| Tienda de campaña para dos personas | 20 lb; el PDF omite la cifra | SRD 5.1 inglés, p. 69 |
| Tormenta de Bolas de Nieve de Snilloc | Nivel 2; el PDF imprime 3 en la ficha y 2 en el índice | Elemental Evil Player’s Companion, p. 22 |
| Libertad de los Vientos | Nivel 5; el PDF imprime 3 en la ficha y 5 en el índice | Tal’Dorei Campaign Setting Reborn, p. 176, ficha del editor en D&D Beyond |
| Guía | Escuela Adivinación | SRD 5.1 español, p. 163 |
| Toque Helado | Escuela Nigromancia | SRD 5.1 español, p. 204 |
| Truco de la Cuerda | Escuela Transmutación | SRD 5.1 español, p. 206 |
| Zona de la Verdad | Escuela Encantamiento | SRD 5.1 español, p. 208 |
| Curar Heridas en Masa | Escuela Evocación | SRD 5.1 español, p. 145 |

El registro `reference-import-issues.json` conserva los conflictos de nivel resueltos, sus valores impresos y referencias de corrección. Los hechizos mantienen `printedLevel` y `sectionLevel`; las escuelas corregidas añaden `printedSchool`. Las notas de automatización explican la diferencia al consultar cada entrada.

## Valores de 2014 conservados

Paladín y Explorador empiezan su lanzamiento a nivel 2. Sus tablas de espacios ya coinciden con 2014 y no se consideran discrepancias. El Artificiero del suplemento comienza a nivel 1 y aporta la mitad de sus niveles, redondeada hacia arriba, al cálculo multiclase de espacios; la preparación de conjuros usa su fórmula propia. Magia de Pacto conserva espacios separados.

Se mantienen los niveles de subclase de 2014: brujo, clérigo y hechicero a nivel 1; druida y mago a nivel 2; las demás clases en su nivel correspondiente. Las 65 ampliaciones de listas de Tasha requieren activación explícita por clase. Los conjuros de Dunamancia y Tal’Dorei mantienen las condiciones de acceso de sus fuentes.

Las tablas de las 37 armas y 13 armaduras/escudo se contrastaron en daño, CA, peso, precio y propiedades con la base de 2014. La unidad interna de peso sigue siendo la libra; el SRD español expresa pesos redondeados en kilogramos y no debe utilizarse para reconvertirlos con un factor físico exacto.

El equipo inicial de las 13 clases conserva alternativas, cantidades y oro inicial por clase. Elegir oro sustituye el equipo de clase y de trasfondo. El monje conserva 5d4 po, sin multiplicador de diez. Las cantidades de munición se expresan en paquetes del catálogo: una entrada de flechas (20) representa veinte flechas.

## Alcance y verificaciones

Se revisaron las 260 filas de progresión de clase, las progresiones de las dos subclases lanzadoras parciales, los valores estructurados de competencias, el equipo inicial y los conflictos documentados de la importación. Se compararon nivel y escuela de 199 hechizos que tienen el mismo título normalizado en el SRD español. Se descartó una coincidencia de traducción engañosa: el «Mal de Ojo» de nivel 1 del PDF es *Hex*, mientras el título homónimo del SRD designa *Eyebite*, de nivel 6.

Los 501 hechizos proceden de Manual del Jugador, Xanathar, Tasha, Fizban, Wildemount/Dunamancia y Tal’Dorei. Se conservan las versiones anteriores a la revisión: Curar Heridas sana 1d8, Palabra Curativa 1d4, Conjurar Animales invoca bestias y Toque Helado sigue siendo un ataque a distancia de 120 pies. Esto no constituye una comprobación frase por frase de los 501 textos contra todas las publicaciones originales ni automatiza todos sus efectos.

Las pruebas de `tests/rules-2014-data.test.ts` comprueban cada fila de espacios completos, niveles iniciales de lanzamiento, niveles de subclase, cantrips del Caballero Arcano, las correcciones raciales y de hechizos y los valores distintivos de 2014. `tests/starting-equipment-data.test.ts` y `tests/equipment-source.test.ts` cubren alternativas, cantidades y categorías de herramientas.

La mecánica básica calculada y los descansos se comprueban por separado en las pruebas del motor. Maniobras, transformaciones, efectos situacionales, tablas aleatorias y decisiones narrativas que no tienen automatización siguen consultables en su texto y requieren registro manual. Las diferencias no verificadas de suplementos no se presentan como resueltas.

## Fuentes y atribución

- [SRD 5.1 en español](https://media.dndbeyond.com/compendium-images/srd/5.1/SRD_CC_v5.1_ES.pdf).
- [SRD 5.1 en inglés](https://media.dndbeyond.com/compendium-images/srd/5.1/SRD_CC_v5.1.pdf).
- [Elemental Evil Player’s Companion](https://media.wizards.com/2016/downloads/DND/EE-Players-Companion.pdf), pp. 10 y 22.
- [Freedom of the Winds en D&D Beyond](https://www.dndbeyond.com/spells/1343171-freedom-of-the-winds), Tal’Dorei Campaign Setting Reborn, p. 176.

Esta obra incluye materiales extraídos del Documento de referencia del sistema 5.1 (“SRD 5.1”) de Wizards of the Coast LLC, que está disponible en https://dnd.wizards.com/es/resources/systems-reference-document. El SRD 5.1 tiene la licencia Creative Commons Atribución/Reconocimiento 4.0 Licencia Pública Internacional, que está disponible en https://creativecommons.org/licenses/by/4.0/legalcode.es.
