# Arquitectura de Grimorio

## Fuente y separación

Manual para Casi Todo, versión 30.03.25: 633 páginas. Se conserva el texto íntegro por página y el árbol de marcadores como material de auditoría local. Los registros de reglas incluyen identificadores estables y página de procedencia. Las versiones Legado, Multiverso y las procedentes de módulos tienen identidades diferentes. No se completa el manual con reglas de 2024 ni con otras fuentes.

Categorías: razas, subrazas, variantes, linajes, clases, subclases, rasgos, progresiones, trasfondos, equipo, dotes, multiclase, listas de hechizos y conjuros agrupados por fuente. Ver `source-audit.md` y los informes de cobertura para los recuentos y excepciones de extracción.

## Capas

1. `data/source`: extracción reproducible, índice y manifiesto de todas las páginas.
2. `data/rules`: catálogo normalizado, separado del estado y de React.
3. `lib/types.ts`: contratos del catálogo, elecciones, requisitos y estado de usuario.
4. `lib/engine.ts`: funciones puras; recibe personaje y catálogo, devuelve valores y desgloses. No accede al navegador.
5. `lib/persistence.ts`: contrato de repositorio asíncrono. Adaptador local inicial, sustituible por un repositorio remoto autenticado por `ownerId`.
6. `components`: presentación y formularios; los cálculos se delegan al motor.

## Estado

Personajes versionados con referencias `raceId`, `subraceId`, `classId`, `subclassId`, `featIds`, `spellIds`. Se guardan las elecciones, valores de características de base, incrementos, tiradas de PG, recursos gastados, espacios gastados, preparados, inventario, notas, historial y sustituciones explícitas. Los textos oficiales no se duplican dentro del personaje. Los rasgos y objetos personales sí pertenecen al personaje.

## Creación y progresión

Concepto → raza y versión → clase → características → competencias → elecciones genéricas → hechizos → identidad → equipo → revisión. Las selecciones pendientes se validan antes de confirmar. Subir de nivel crea una copia de trabajo, consulta la progresión, solicita las elecciones correspondientes y muestra una comparación antes de confirmar. Se conserva una instantánea previa para deshacer.

## Automatización y límites

El motor calcula modificadores, competencia, habilidades, salvaciones, iniciativa, percepción, PG, CA, recursos, características raciales verificadas y lanzamiento cuando existen datos estructurados suficientes. Cada valor importante incluye desglose; las sustituciones se marcan y pueden restaurarse. Los efectos narrativos o contextuales conservan su descripción completa. Los conflictos de la fuente no se corrigen con conocimientos externos. Las reglas generales ausentes (método de compra de puntos, recuperación general de descansos no descrita, etc.) permanecen manuales o deshabilitadas.

## Portabilidad

Next.js, React, TypeScript y Tailwind. Sin servicios de Astra/Sites ni almacenamiento propietario. Instalación con npm y despliegue estándar de Next.js en Vercel. Autenticación y base de datos remota son adaptaciones posteriores del repositorio; no forman parte del motor.
