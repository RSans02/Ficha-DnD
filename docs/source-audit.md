# Auditoría íntegra de la fuente

Fuente local: **Manual para Casi Todo de D&D 5e (V30.03.25).pdf**.

Se han recorrido programáticamente las **633 páginas físicas**, extraído su texto en dos modalidades y auditado los **2.066 marcadores**, sin limitar el análisis a una muestra. El texto completo tiene 2.707.903 caracteres en modo layout. La extracción no equivale a que todas las interacciones mecánicas estén automatizadas: cada catálogo mantiene sus límites y un informe de importación independiente.

Archivos reproducibles: `scripts/extract_source.py`, `scripts/segment_source.py`, `scripts/audit_source.py`. Datos de evidencia: `pages.json` (layout), `pages-reading-order.json` (lectura secuencial), `outline.json` (jerarquía y coordenadas), `sections.json` (segmentos completos), `manifest.json`, `segmentation-issues.json`, `page-audit.json` (una fila por cada página).

## Cobertura física y grandes categorías

| Categoría | Páginas físicas | Marcadores | Caracteres extraídos |
|---|---:|---:|---:|
| Portada e introducción | 1–2 | 5 | 3,256 |
| Información racial y linaje customizado | 3–3 | 2 | 3,475 |
| Razas comunes | 4–11 | 20 | 16,294 |
| Razas poco comunes | 12–23 | 27 | 27,438 |
| Razas monstruosas | 24–31 | 9 | 13,350 |
| Razas exóticas | 32–47 | 25 | 27,616 |
| Razas del Multiverso | 48–81 | 45 | 77,019 |
| Razas de módulos | 82–101 | 21 | 47,032 |
| Clases, subclases y progresiones | 102–393 | 1130 | 875,026 |
| Trasfondos | 394–405 | 14 | 35,014 |
| Trasfondos extras | 406–417 | 13 | 36,779 |
| Equipo, moneda, armas, armaduras, herramientas y monturas | 418–432 | 14 | 43,961 |
| Dotes generales | 433–442 | 58 | 32,409 |
| Dotes raciales | 443–445 | 16 | 10,096 |
| Dotes dracónicos | 446–446 | 4 | 3,591 |
| Dote del cartomágico | 447–447 | 2 | 1,299 |
| Dotes de Tal’Dorei | 448–449 | 8 | 5,164 |
| Multiclase | 450–452 | 12 | 10,604 |
| Listas de hechizos y conversión de distancias | 453–473 | 86 | 49,753 |
| Hechizos del Manual del Jugador | 474–579 | 372 | 408,241 |
| Hechizos de Xanathar | 580–608 | 106 | 106,884 |
| Hechizos de Tasha | 609–623 | 31 | 40,394 |
| Hechizos de Fizban | 624–626 | 14 | 9,421 |
| Hechizos de Dunamancia | 627–631 | 26 | 17,594 |
| Hechizos de Tal’Dorei | 632–632 | 5 | 2,253 |
| Personalizar hechizos | 633–633 | 1 | 3,455 |

## Entidades detectadas y relaciones

- Razas: comunes, poco comunes, monstruosas, exóticas, versiones del Multiverso y módulos (Theros, Ravnica, Ravenloft y Spelljammer). Incluye linaje customizado, subrazas, variantes y versiones marcadas Legado. Deben conservarse como entidades distintas; el apartado de Multiverso añade reglas compartidas de creación en p48.
- 13 clases: Artificiero, Bárbaro, Bardo, Brujo, Clérigo, Druida, Explorador, Guerrero, Hechicero, Mago, Monje, Paladín y Pícaro. Sus bloques contienen progresiones 1–20, competencias, equipo inicial, rasgos, subclases y opciones. No se debe interpretar cada marcador anidado como una subclase: también hay rasgos, tablas, opciones y dos marcadores de párrafo defectuosos.
- 25 trasfondos principales (13 del bloque base y 12 extras), con variantes dentro de sus descripciones, competencias, idiomas/herramientas, equipo y tablas narrativas.
- Equipo: moneda y cambio, 13 armaduras/escudo, armas simples/marciales, propiedades, equipo de aventura, herramientas, monturas, vehículos y 7 paquetes iniciales. La tabla de aventura contiene dos tablas paralelas: necesita separación por coordenadas para no mezclar objetos.
- 83 dotes indexadas: 57 generales, 15 raciales, 3 dracónicas, 1 cartomágica y 7 de Tal’Dorei. Hay requisitos y efectos cuantificables junto a efectos narrativos/condicionales.
- 501 hechizos indexados, repartidos entre Manual del Jugador, Xanathar, Tasha, Fizban, Dunamancia y Tal’Dorei. Cada versión conserva origen; las listas de clase son relaciones separadas y no deben inferirse por el nombre o por conocimiento externo.
- 9 listas de hechizos de clase (p454–473). Artificiero sí tiene lista aunque la introducción de p453 omite su nombre. Los colores distinguen ampliaciones opcionales de Tasha: el texto plano por sí solo no conserva esa señal y debe contrastarse con atributos de color.
- Multiclase p450–452: requisitos de 13 clases, competencias parciales, PG/dados, competencia por nivel total, no acumulación de ataques extra/defensa sin armadura, conocidos/preparados individuales, tabla de espacios combinados y Magia de Pacto separada.

## Automatización sustentada por la fuente

- Modificadores de características: fórmula explícita del encargo; bonificaciones raciales a partir de cada versión concreta.
- Competencia por nivel: tablas de progresión, y nivel total para multiclase según p451.
- PG/dados de golpe: reglas de cada clase y p451; las tiradas de PG son entradas del jugador. Deben conservarse por nivel para recomputar cambios de Constitución.
- CA de armadura y escudo: pp419–420, con límites de Destreza, desventaja y requisito de Fuerza. Defensa sin armadura solo donde un rasgo aplicable la define.
- Competencias, habilidades, salvaciones, idiomas, velocidades, visión y resistencias que indiquen los bloques concretos; elecciones pendientes se conservan separadas de efectos concedidos.
- Lanzamiento: atributo, ataque/CD, conocidos/preparados, espacios y recuperación definidos por la clase; referencias a listas p454–473.
- Recuperación: únicamente cuando el rasgo/recurso define descanso corto/largo; no se infiere recuperación global de todos los recursos.
- Subida de nivel: tablas y descripciones de rasgos, con selección de subclase/mejoras/dotes/opciones en los niveles documentados.

## Ausencias, ambigüedades y límites que deben quedar explícitos

1. La introducción p2 declara que no incluye reglas generales del juego ni catálogo de objetos mágicos. No se añade material de 2024 ni reglas de fuentes externas.
2. No se ha encontrado un procedimiento completo de compra de puntos, presupuesto de 27 puntos, matriz estándar ni generación por 4d6. La creación usa puntuaciones manuales y tiradas introducidas por el jugador; esos otros métodos no deben presentarse como procedentes del PDF.
3. No contiene la tabla general de experiencia: p450 remite al capítulo 1 de otro libro. Subida por decisión del jugador; umbrales XP no disponibles.
4. Las reglas generales de descanso, recuperación global de PG/dados de golpe, muerte y condiciones no están expuestas de forma integral. Los contadores y el registro manual son posibles; la recuperación se automatiza solo cuando exista una cláusula aplicable.
5. La fórmula combinada de p452 no enumera al artificiero, pero su apartado de p105 aporta la excepción: suma la mitad de sus niveles redondeada hacia arriba. El motor aplica esa excepción al total de lanzador.
6. Dunamancia p627 restringe acceso automático a subclases de mago Cronurgia/Graviturgia; otras clases requieren consentimiento del DM. No se incorpora silenciosamente a todas las listas.
7. Tal’Dorei p632 autoriza acceso de otras clases condicionado al DJ. **Libertad de los Vientos** está bajo el encabezado de nivel 5, pero su ficha dice «Nivel 3, Abjuración». Es conflicto de fuente: conservar ambos valores y requerir resolución manual.
8. En p427, el peso de «Tienda de campaña para dos personas» figura «Lb» sin cantidad. Debe ser `null`, nunca inventar un peso.
9. Las páginas 211 y 232 no tienen texto ni imágenes; son páginas vacías, no un fallo de OCR. La portada p1 sí tiene texto extraíble.
10. Cuatro marcadores no coinciden exactamente: tablas p420/p427 con espaciado defectuoso se reconocen de forma aproximada; dos marcadores p137/p157 contienen párrafos truncados, no títulos. Están señalados en `segmentation-issues.json` y no deben generar opciones falsas.
11. El texto secuencial preserva mejor el orden de las columnas que layout; tablas usan la extracción layout o coordenadas. Descripciones originales se mantienen completas para poder revisar cada efecto.

## Plan y criterio de importación

1. Crear todos los registros del índice con IDs estables, origen/páginas y descripción íntegra; registrar anclas que no puedan resolverse.
2. Hechizos: segmentar por sus 501 títulos; extraer campos de sus cabeceras, separar efectos a niveles superiores y contrastar nivel de ficha vs encabezado. Vincular listas por nombres normalizados y enlaces del PDF cuando hay divergencia; conservar color para opcionales.
3. Dotes: importar las 83, requisitos textuales y estructurados que puedan demostrarse, mejoras fijas y elecciones; efectos condicionales permanecen textuales hasta que tengan soporte en el motor.
4. Trasfondos: importar 25 con variantes y narrativa completas; dividir competencias/idiomas/herramientas/equipo mediante etiquetas de la fuente.
5. Equipo: tablas de armas/armaduras/herramientas/monturas; separar tabla doble de aventura por coordenadas, detectar filas sin cifras y conservar `null`.
6. Validar cardinalidades, unicidad, todas las referencias, páginas de origen y campos faltantes. Tener texto completo no implica que su efecto esté automatizado: cada efecto debe declarar si es automático o manual.

## Base de reglas confirmada

Se utiliza D&D 5e 2014 y el contenido posterior recopilado en el PDF. Paladín y Explorador comienzan su lanzamiento de conjuros en nivel 2; esto no es una discrepancia. Las progresiones de espacios se conservan según las tablas del PDF, sin aplicar reglas revisadas de 2024. Las 65 relaciones adicionales de Tasha permanecen desactivadas hasta la elección explícita por clase.
