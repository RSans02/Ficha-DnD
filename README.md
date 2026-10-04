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
- **Navegación de la ficha:** ocho pestañas dentro de una ficha de ancho limitado, con PG, CA, inspiración y descansos siempre a mano. Las flechas del teclado cambian de pestaña; en móvil la barra se desplaza horizontalmente. Los colores y el emblema se adaptan a la primera clase del personaje.
- **Progresión:** trabajar sobre una copia, elegir clase y decisiones de nivel, revisar los cambios y confirmar. Se conserva una instantánea para deshacer la última subida; restaurarla también revierte los cambios posteriores a esa instantánea.
- **Compendio:** buscar razas, clases, subclases, conjuros, dotes, trasfondos y equipo con texto y páginas de procedencia.

Los valores calculados muestran su desglose. Las sustituciones manuales se identifican y pueden restaurarse. Los descansos siguen 2014: el corto permite gastar dados de golpe y el largo recupera PG y hasta la mitad de los dados (mínimo uno), además de recursos y espacios compatibles. Los efectos contextuales siguen bajo control del jugador.

## Reglas y fuente

La fuente del catálogo es **Manual para Casi Todo de D&D 5e (V30.03.25).pdf**, de 633 páginas. La base es **D&D 5e 2014 y el contenido posterior recopilado en ese PDF**. Las variantes y versiones se conservan separadas; no se aplican las reglas revisadas de 2024.

- Paladín y Explorador empiezan a lanzar conjuros a nivel 2. Se conservan las progresiones que coinciden con 2014; ese inicio no es una discrepancia. Los espacios de nivel 4 de lanzadores completos a niveles 9–17 se corrigen a tres conforme al SRD 5.1.
- En multiclase, el Artificiero aporta la mitad de sus niveles **redondeando hacia arriba**, conforme a la excepción de su apartado en la página 105. La fórmula general de la página 452 no lo enumera. Magia de Pacto se mantiene separada.
- Las 65 ampliaciones de listas de Tasha requieren activación explícita por clase. No forman parte de las listas base por defecto.
- El [SRD 5.1 oficial](https://media.dndbeyond.com/compendium-images/srd/5.1/SRD_CC_v5.1_ES.pdf) y las [reglas básicas de 2014](https://www.dndbeyond.com/sources/dnd/basic-rules-2014) completan reglas generales y corrigen erratas del PDF. La extracción original se conserva y las correcciones están documentadas en [la auditoría de 2014](docs/rules-2014-audit.md).
- La creación permite matriz estándar, compra opcional de 27 puntos, tiradas de 4d6 descartando el menor o entrada manual. Las bonificaciones raciales se aplican después.
- Las 13 clases y los 31 trasfondos tienen equipo inicial estructurado. Elegir oro sustituye los objetos y monedas iniciales de ambos. El equipo adicional se añade por buscador con cantidad; no descuenta dinero automáticamente. Los objetos homebrew permiten cantidad, peso, notas y CA configurable.

El catálogo contiene 126 registros raciales —82 raíces y 44 subrazas o variantes—, 13 clases, 127 subclases, 1.436 entradas de rasgos y referencias, 501 conjuros, 83 dotes, 31 trasfondos con variantes y 221 entradas de equipo. Estos recuentos describen la cobertura del catálogo, no el porcentaje de mecánicas automatizadas.

## Límites actuales

El texto importado y el motor tienen coberturas diferentes. Parte de las maniobras, transformaciones, elecciones de subclase, dotes complejas, hechizos raciales, formas de movimiento y efectos condicionales requieren consulta del rasgo y ajuste manual. Las decisiones narrativas de los trasfondos se conservan en su descripción.

La subida de nivel se confirma por decisión del jugador o del DM; no se fuerza por experiencia. El agotamiento registra seis niveles de 2014 y aplica sus límites de velocidad y PG. Las desventajas, las condiciones contextuales y las salvaciones contra muerte requieren aplicar las reglas al resolver las tiradas.

Se resolvieron con fuentes oficiales los conflictos de nivel de **Tormenta de Bolas de Nieve de Snilloc** (nivel 2) y **Libertad de los Vientos** (nivel 5), conservando los valores originales para la auditoría. El peso de la tienda de campaña para dos personas se completó con las 20 lb del SRD 5.1. Algunas tablas insertadas como imagen dentro de los rasgos pueden no estar disponibles como texto; las tablas principales de progresión sí se transcribieron y contrastaron.

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
python scripts/import_background_equipment.py
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

## Atribución SRD 5.1

This work includes material taken from the System Reference Document 5.1 ("SRD 5.1") by Wizards of the Coast LLC and available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.

Las correcciones de reglas, automatizaciones e interfaz son adaptaciones de esta aplicación. Esta atribución cubre el material SRD; el compendio aportado por el usuario conserva sus propias referencias.
# Compendios homebrew

En **Mis compendios** puedes crear colecciones locales de razas y subrazas, clases y subclases, rasgos, hechizos, dotes, trasfondos y equipo. Cada entrada parte de una plantilla JSON con los campos que usa el creador de personajes. Conserva el `id` generado al editarla. Para una subraza, indica `parentId` con el ID de su raza; para una subclase, añádela a `subclasses` de una clase; para conceder rasgos, crea primero la entrada en **Rasgos** y usa su ID en `featureIds`. Los hechizos deben indicar los IDs de sus clases en `availableToClasses`.

Los compendios se guardan en el navegador junto a los personajes y se incorporan al catálogo durante la creación y edición. Exporta el archivo de compendios además del personaje si lo vas a usar en otro dispositivo. Importar un archivo de compendios sustituye las colecciones locales, siempre que los personajes existentes sigan teniendo referencias válidas.

