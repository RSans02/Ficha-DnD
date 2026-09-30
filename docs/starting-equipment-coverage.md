# Equipo inicial de clase

`data/rules/starting-equipment.json` contiene las elecciones y concesiones fijas de las 13 clases del **Manual para Casi Todo de D&D 5e (V30.03.25)**. Se transcribieron desde `data/source/pages-reading-order.json`; no se utilizaron listas de las reglas de 2024.

| Clase | Páginas del PDF | Oro en lugar del equipo de clase y trasfondo |
|---|---:|---:|
| Artificiero | 104–105 | 5d4 × 10 po |
| Bárbaro | 122 | 2d4 × 10 po |
| Bardo | 140 | 5d4 × 10 po |
| Brujo | 160 | 4d4 × 10 po |
| Clérigo | 185–186 | 5d4 × 10 po |
| Druida | 214 | 2d4 × 10 po |
| Explorador | 235 | 5d4 × 10 po |
| Guerrero | 257 | 5d4 × 10 po |
| Hechicero | 282 | 3d4 × 10 po |
| Mago | 306 | 4d4 × 10 po |
| Monje | 330 | 5d4 po |
| Paladín | 352 | 5d4 × 10 po |
| Pícaro | 377 | 4d4 × 10 po |

## Unidades y equivalencias

- Las concesiones apuntan a identificadores existentes del catálogo. Flechas (20) y Virotes de ballesta (20) se conceden como **un paquete**, con el peso de un paquete, no como veinte paquetes.
- «Arco pequeño» del pícaro corresponde a Arco corto; «carcaj» a Aljaba. «Equipo de estudioso» del mago corresponde a Equipo de Erudito. Las variantes «dungeon», «dungeons» y «mazmorras» apuntan al mismo Equipo para Dungeons.
- La cantidad de dos armas elegibles representa dos elecciones; es válido escoger dos unidades del mismo tipo de arma.
- El escudo del druida conserva el nombre y la descripción «Escudo de madera» y utiliza las estadísticas del escudo del catálogo.
- Los focos arcanos y druídicos y los símbolos sagrados permiten elegir una de sus formas catalogadas. Cada elección concede un solo objeto.
- Los paquetes se conceden como objetos del catálogo; el JSON de equipo inicial no expande sus contenidos y no concede a la vez el paquete y sus componentes.

## Restricciones conservadas

El martillo de guerra y la cota de malla del clérigo incluyen `requiresProficiency` y mantienen la condición «si eres competente». La opción de oro sustituye tanto el equipo inicial de clase como el de trasfondo; no debe sumar el oro y ambos conjuntos de objetos.

El texto del druida en la página 214 ofrece «cualquier arma simple a distancia». Se conserva con la categoría `simple-ranged-weapon`. La línea del hechicero sobre paquetes omite la conjunción «o» entre ambos; se presenta como una elección entre Equipo para Dungeons y Equipo de Explorador y se documenta esta normalización en la entrada.

## Verificación

`tests/starting-equipment-data.test.ts` comprueba cobertura de las 13 clases, referencias válidas, cantidades de munición, identidad de elecciones, equipo fijo del pícaro, dados de oro, requisitos del clérigo y cantidades de armas elegibles.
