# Cobertura de clases del manual

Fuente exclusiva: Manual para Casi Todo de D&D 5e (V30.03.25).pdf, páginas físicas 102–393.

13 clases, 127 subclases, 1001 entradas de rasgos y referencias; 260 filas de progresión de clase y 40 filas de progresión de subclase.

| Clase | Páginas | Subclases | Rasgos de clase/opcionales | Tabla |
|---|---|---:|---:|---:|
| Artificiero | 103–119 | 4 | 13 | 104 |
| Bárbaro | 120–137 | 10 | 16 | 121 |
| Bardo | 138–157 | 9 | 13 | 140 |
| Brujo | 158–183 | 9 | 9 | 159 |
| Clérigo | 184–211 | 16 | 9 | 185 |
| Druida | 212–232 | 8 | 10 | 213 |
| Explorador | 233–254 | 8 | 21 | 234 |
| Guerrero | 255–279 | 10 | 9 | 256 |
| Hechicero | 280–303 | 9 | 9 | 281 |
| Mago | 304–327 | 14 | 7 | 305 |
| Monje | 328–349 | 11 | 23 | 329 |
| Paladín | 350–374 | 10 | 16 | 351 |
| Pícaro | 375–393 | 9 | 14 | 376 |

## Método y auditoría

El extractor consume todas las secciones de nivel 1, 2 y 3 del capítulo, con texto segmentado por columnas y marcadores del PDF. Conserva íntegro cada rasgo en description y la referencia física de página. Los encabezados accidentales de párrafos en las páginas 137 y 157 se excluyen como entidades, pero sus textos permanecen en la fuente y la introducción de subclase. Infusiones, invocaciones, opciones de Tasha y referencias de Xanathar se distinguen para impedir concesiones automáticas de opciones.

Las tablas rasterizadas de las páginas 104, 140, 159, 185, 213, 234, 281, 305 y 329, y las tablas de subclase de 259 y 382, se renderizaron y revisaron visualmente. Sus valores se transcriben en constantes explícitas del extractor. Las tablas de 121, 256, 351 y 376 tienen texto extraíble. No se han importado datos de internet, SRD ni otras ediciones.

Comprobaciones reproducibles: 13 clases, 20 niveles consecutivos por clase, unicidad de identificadores y referencias de rasgo resueltas. Los campos null indican que el dato no aplica o que el encabezado no especifica nivel; nunca se inventa un nivel.

## Límites de automatización y discrepancias de la fuente

- Artificiero: Multiclase: suma la mitad de niveles de artificiero redondeada hacia arriba (p. 105). La tabla llama Ingeniería Mágica al rasgo Arreglo Mágico.
- Bárbaro: Furia de nivel 20: usos ilimitados, representados por -1. La tabla concede Senda a nivel 10, omitido en el encabezado del rasgo. Juggernaut: Golpe Huracanado dice nivel 6 en encabezado y nivel 10 en texto; se conserva la discrepancia sin corregir el manual.
- Bardo: Inspiración recupera usos con descanso corto a partir de nivel 5 mediante Fuente de Inspiración; el recurso base conserva recuperación larga.
- Bardo: La tabla del PDF imprime 2 espacios de conjuro de nivel 4 entre los niveles de clase 9 y 17. Se conserva literalmente ese valor; a nivel 18 pasa a 3. No se sustituye por tablas de otras fuentes.
- Clérigo: La tabla del PDF imprime 2 espacios de conjuro de nivel 4 entre los niveles de clase 9 y 17. Se conserva literalmente ese valor; a nivel 18 pasa a 3. No se sustituye por tablas de otras fuentes.
- Druida: La lista impresa de armas incluye estoques; no se sustituye por una lista externa. Restricción: ninguna armadura ni escudo de metal. Archidruida elimina el límite de Forma Salvaje a nivel 20.
- Druida: La tabla del PDF imprime 2 espacios de conjuro de nivel 4 entre los niveles de clase 9 y 17. Se conserva literalmente ese valor; a nivel 18 pasa a 3. No se sustituye por tablas de otras fuentes.
- Explorador: La cabecera de Mejora de Puntuación incluye nivel 14, pero la tabla y el cuerpo del rasgo no lo incluyen. La progresión sigue la tabla. Las opciones de Tasha que reemplazan rasgos requieren elección explícita.
- Hechicero: La tabla del PDF imprime 2 espacios de conjuro de nivel 4 entre los niveles de clase 9 y 17. Se conserva literalmente ese valor; a nivel 18 pasa a 3. No se sustituye por tablas de otras fuentes.
- Mago: La tabla del PDF imprime 2 espacios de conjuro de nivel 4 entre los niveles de clase 9 y 17. Se conserva literalmente ese valor; a nivel 18 pasa a 3. No se sustituye por tablas de otras fuentes.

## Encabezados repetidos verificados

Se separan 11 pares de marcadores con el mismo título impreso en una página. Las coordenadas left/top del PDF se contrastaron con el texto físico; cada ocurrencia recibe su cuerpo y nivel propios. Se conservan los títulos repetidos y los IDs existentes, sin sustituirlos por nombres de otra fuente. El registro reproducible está en `data/rules/class-source-repairs.json`.

| Página física | Título impreso repetido | Cuerpos separados |
|---:|---|---|
| 116 | Arma Mejorada | Bonificador de arma / arma arrojadiza que vuelve a la mano |
| 130 | Escudo Espiritual | Consulta ancestral, nivel 10 / represalia, nivel 14 |
| 132 | Presencia Fanática | Inspiración, nivel 10 / resistir golpes fatales, nivel 14 |
| 165 | Resistencia Infernal | Resistencia, nivel 10 / viaje infernal, nivel 14 |
| 200 | Lanzamiento de Hechizos Potentes | Daño de trucos, nivel 8 / curación, nivel 17 |
| 241 | Furia Bestial | Dos ataques, nivel 11 / compartir conjuro, nivel 15 |
| 245 | Defensa Sobrenatural | Salvaciones, nivel 7 / frustrar magia, nivel 11 |
| 301 | Fenómeno Lunar | Hechicero de la Luna, nivel 18 / Runaestirpe, nivel 1 |
| 314 | Ilusiones Maleables | Cambiar ilusión, nivel 6 / duplicado defensivo, nivel 10 |
| 372 | Represión Vigilante | Represalia, nivel 15 / transformación, nivel 20 |
| 388 | Maniobra Elegante | Acrobacia o Atletismo, nivel 13 / repetir ataque, nivel 17 |

## Opciones y límites restantes

- Caballero Arcano: tercer truco a nivel 9 en tabla, nivel 10 en prosa. Se mantiene la tabla.
- Se estructuran como elecciones: 16 infusiones, 54 invocaciones, 4 pactos, 10 opciones de metamagia, estilos de combate y pericias de bardo/pícaro. Los cupos de infusiones e invocaciones se vinculan a la progresión mediante dynamicAmountResource. Los requisitos para multiclase proceden de la tabla de la página 450; Guerrero permite Fuerza O Destreza.
- No se automatizan todavía todas las decisiones contenidas en prosa (maniobras, modelos de armadura, tótems, escuelas y rasgos con selección de hechizos). Su texto íntegro está disponible. Las elecciones catalogadas no aplican por defecto.
- Las tablas insertadas como imagen dentro de rasgos (listas de hechizos, resultados aleatorios, estadísticas de compañeros) pueden no aparecer como texto en la extracción; la referencia de página y el PDF completo son la autoridad. Las tablas principales de progresión sí se transcribieron completas.

## Reproducir

Ejecutar primero el extractor de fuentes que genera data/source/sections.json y después `python scripts/extract_classes.py`. Los archivos JSON se regeneran de forma determinista.
