# Grimorio

Aplicación en español para crear y gestionar personajes de D&D 5e, construida con Next.js, React, TypeScript y Tailwind CSS. Incluye biblioteca de personajes, asistente de creación, ficha de juego, progresión de nivel, compendio y almacenamiento local con importación y exportación JSON.

## Ejecutar en local

Requiere Node.js 20.9 o posterior y npm. Desde la carpeta del proyecto:

```sh
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). La primera apertura añade un personaje de ejemplo a la biblioteca. No se necesitan cuentas, claves ni variables de entorno; `.env.example` documenta esta configuración.

Para comprobar la versión de producción:

```sh
npm run build
npm run start
```

Detén el servidor de desarrollo antes de iniciar producción en el mismo puerto. El repositorio incluye `package-lock.json`; en CI puede usarse `npm ci` para instalar las versiones bloqueadas.

## Uso

- **Mis personajes:** crear, abrir, duplicar, borrar y transferir fichas mediante JSON.
- **Creación:** elegir raza y versión, clase, características, competencias, opciones, conjuros, identidad y equipo; revisar elecciones pendientes antes de guardar.
- **Ficha:** consultar desgloses, registrar daño y curación, PG temporales, dados de golpe, recursos, condiciones, ataques, conjuros conocidos/preparados y espacios gastados. Incluye inventario, monedas, notas, biografía y vista de impresión.
- **Progresión:** trabajar sobre una copia, elegir clase y decisiones de nivel, revisar los cambios y confirmar. Se conserva una instantánea para deshacer la última subida; restaurarla también revierte los cambios posteriores a esa instantánea.
- **Compendio:** buscar razas, clases, subclases, conjuros, dotes, trasfondos y equipo con texto y páginas de procedencia.

Los valores calculados muestran su desglose. Las sustituciones manuales se identifican y pueden restaurarse. Las acciones de descanso recuperan únicamente los recursos cuya regla estructurada indica esa recuperación; los ajustes restantes corresponden al jugador.

## Reglas y fuente

La fuente del catálogo es **Manual para Casi Todo de D&D 5e (V30.03.25).pdf**, de 633 páginas. La base es **D&D 5e 2014 y el contenido posterior recopilado en ese PDF**. Las variantes y versiones se conservan separadas; no se aplican las reglas revisadas de 2024.

- Paladín y Explorador empiezan a lanzar conjuros a nivel 2. Se conservan las progresiones de espacios del PDF; ese inicio no se considera una discrepancia.
- En multiclase, el Artificiero aporta la mitad de sus niveles **redondeando hacia arriba**, conforme a la excepción de su apartado en la página 105. La fórmula general de la página 452 no lo enumera. Magia de Pacto se mantiene separada.
- Las 65 ampliaciones de listas de Tasha requieren activación explícita por clase. No forman parte de las listas base por defecto.
- Las reglas ausentes o ambiguas no se completan silenciosamente con otras publicaciones. Los registros incluyen notas y referencias para revisar la decisión.

El catálogo contiene 126 registros raciales —82 raíces y 44 subrazas o variantes—, 13 clases, 127 subclases, 1.436 entradas de rasgos y referencias, 501 conjuros, 83 dotes, 31 trasfondos con variantes y 221 entradas de equipo. Estos recuentos describen la cobertura del catálogo, no el porcentaje de mecánicas automatizadas.

## Límites actuales

El texto importado y el motor tienen coberturas diferentes. Parte de las maniobras, transformaciones, elecciones de subclase, dotes complejas, hechizos raciales, formas de movimiento y efectos condicionales requieren consulta del rasgo y ajuste manual. No todas las opciones de herramientas, idiomas y equipo de los trasfondos se han convertido en decisiones ejecutables.

El PDF no presenta reglas generales completas de compra de puntos, matriz estándar, experiencia o recuperación de descansos. Las características y las tiradas de PG se introducen manualmente; no hay progresión automática por experiencia. Los contadores de condiciones y salvaciones contra muerte no sustituyen sus reglas de resolución.

Dos conjuros conservan un conflicto interno de nivel y quedan fuera de la selección automática hasta resolverlo: **Tormenta de Bolas de Nieve de Snilloc** (p. 588) y **Libertad de los Vientos** (p. 632). Algunas tablas insertadas como imagen dentro de los rasgos pueden no estar disponibles como texto; las tablas principales de progresión sí se transcribieron y contrastaron. El peso de la tienda de campaña para dos personas está ausente en el PDF y requiere entrada manual si se desea incluirlo en el total.

La creación en curso se conserva al cambiar de paso, pero no es un borrador persistente tras recargar la página. La sincronización entre dispositivos, autenticación y base de datos remota no están implementadas.

Los detalles y excepciones están en [auditoría de fuente](docs/source-audit.md), [cobertura de clases](docs/classes-coverage.md), [cobertura racial](docs/races-coverage.md) y [cobertura de catálogos](docs/reference-coverage.md).

## Datos y persistencia

`LocalCharacterRepository` guarda los personajes en `localStorage`, dentro del navegador y del origen desde el que se abre la aplicación. Cambiar de navegador, de puerto o de dominio crea un almacén distinto. Publicar la aplicación no transfiere los personajes locales al servidor: usa la exportación e importación JSON para trasladarlos o conservar copias.

Cada personaje tiene `schemaVersion`, `ownerId`, referencias al catálogo, elecciones, recursos gastados, historial y sustituciones. La importación comprueba estructura, límites y referencias; una biblioteca corrupta se conserva sin sobrescribir. Los retratos también ocupan almacenamiento local y están sujetos a la cuota del navegador.

El contrato asíncrono `CharacterRepository` de `lib/persistence.ts` expone `list`, `get`, `save` y `delete`. Permite sustituir el adaptador local por uno remoto sin trasladar las reglas a los componentes. `ownerId` prepara la separación de propietarios, pero en esta fase no es autenticación ni control de acceso remoto; un adaptador de base de datos debe obtener el propietario de la sesión y verificarlo en el servidor.

## Estructura

| Ruta | Responsabilidad |
|---|---|
| `app/` | Entrada de Next.js, estilos y endpoint de catálogo |
| `components/` | Biblioteca, asistente, ficha y compendio |
| `lib/types.ts` | Contratos de personajes y reglas |
| `lib/engine.ts` | Cálculos puros, requisitos, progresión y descansos |
| `lib/persistence.ts` | Validación JSON y adaptador de almacenamiento |
| `data/rules/` | Catálogos normalizados usados por la aplicación |
| `data/source/` | Evidencia de extracción y auditoría del PDF |
| `scripts/` | Extractores y validación de catálogos |
| `tests/` | Pruebas del motor, persistencia y catálogos |
| `docs/` | Arquitectura, cobertura y decisiones de fuente |

Consulta [la arquitectura](docs/architecture.md) para ampliar el motor o añadir un repositorio remoto. Antes de modificar integración de Next.js, sigue `AGENTS.md` y las guías de la versión instalada en `node_modules/next/dist/docs/`.

## Comprobaciones

```sh
npm run typecheck
npm test
npm run build
```

Estas órdenes ejecutan la comprobación de TypeScript, las pruebas de `tests/*.test.ts` y la compilación de producción. La revisión visual de escritorio/móvil y de los flujos de usuario es una comprobación adicional; estos comandos no la sustituyen.

La [verificación de entrega](docs/validation.md) recoge los resultados ejecutados y el alcance de las pruebas de interfaz.

## Reproducir los catálogos

La aplicación funciona con los JSON ya generados de `data/rules/`; el PDF y Python no son necesarios para ejecutarla o desplegarla. Para reconstruir la evidencia, coloca el PDF original con su nombre indicado en la raíz e instala Python con `pypdf` y `pdfplumber`. Ejecuta desde la raíz:

```sh
python -m pip install pypdf pdfplumber
python scripts/extract_source.py "Manual para Casi Todo de D&D 5e (V30.03.25).pdf"
python scripts/segment_source.py
python scripts/audit_source.py
python scripts/extract_spell_links.py
python scripts/import_reference_catalogs.py
python scripts/import_equipment.py
python scripts/extract_races.py
python scripts/extract_classes.py
python scripts/validate_catalogs.py
```

Las transcripciones verificadas de tablas rasterizadas forman parte del extractor de clases. Regenerar los archivos no realiza una nueva revisión visual de esas tablas. El PDF original y la extracción íntegra no se sirven desde `public/`.

## Despliegue

El proyecto es una aplicación Next.js portable. Puede ejecutarse en un servidor Node.js con las órdenes de producción anteriores; no depende de un servicio de generación o alojamiento propietario.

Para desplegarlo manualmente en Vercel:

1. Sube el proyecto a un repositorio, incluyendo `package-lock.json`, `data/rules/` y `public/`. Excluye `node_modules/`, `.next/` y archivos de entorno privados conforme a `.gitignore`.
2. Importa ese repositorio en Vercel y selecciona la raíz de la aplicación con el framework Next.js.
3. Usa `npm ci` para instalar y `npm run build` para compilar. Mantén la salida predeterminada del framework y una versión de Node.js compatible con `package.json`.
4. No añadas variables de entorno para la fase local actual. Publica y abre la URL que asigne Vercel.
5. Importa en ese dominio los personajes que quieras trasladar desde la instalación local.

Estas instrucciones no configuran una cuenta ni implican que exista ya un despliegue público.
