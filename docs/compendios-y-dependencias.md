# Catálogo incluido y dependencias de personajes

## Objetivo

La distribución de la aplicación incluirá únicamente contenido de 5e 2014 con permiso de redistribución comprobado. El SRD 5.1 en español, publicado bajo CC BY 4.0, es la fuente base verificable. Las reglas básicas de 2014 se pueden enlazar como referencia externa; su acceso gratuito no se usará como prueba de permiso para copiar textos. Tasha, Xanathar y cualquier otra fuente fuera de la base se incorporarán solo mediante compendios que importe o cree cada persona.

## Comportamiento de personajes

- Una ficha conserva sus identificadores al exportarse e importarse. Nunca se sustituye una referencia ausente por otra con nombre parecido.
- Si faltan compendios, la ficha permanece en la biblioteca y se puede exportar. La interfaz señala que falta contenido y no calcula la ficha ni permite abrirla para jugar hasta restaurar las referencias.
- El borrado de un compendio desde la aplicación se bloquea cuando introduce referencias ausentes en personajes o borradores existentes. Si ya falta otra referencia, eso no impide cambios independientes en los compendios.
- Reimportar un compendio con los mismos identificadores restaura el acceso. Para futuros cambios incompatibles conviene añadir versión y huella de contenido al manifiesto del compendio y al listado de dependencias del personaje.

## Auditoría necesaria antes de separar los datos

El catálogo actual procede de un PDF recopilatorio. Solo los 501 conjuros tienen `sourceBook` individual: 361 figuran como Manual del Jugador, 95 Xanathar, 21 Tasha, 15 Dunamancia, 7 Fizban y 2 Tal’Dorei. Las 126 razas, 13 clases, 127 subclases, 1.436 rasgos, 83 dotes, 31 trasfondos y 221 entradas de equipo carecen de ese campo. La página del PDF no demuestra qué licencia cubre el texto.

La migración debe clasificar cada entrada y sus dependencias: raza y rasgos, clase y progresión, subclase y rasgos, dote y efectos, conjuro y listas, trasfondo y equipo. Hay que comparar cada entrada que vaya a permanecer en la base con el SRD 5.1 en español y usar el texto autorizado de esa fuente. Una entrada sin procedencia comprobada queda fuera de la distribución base.

No basta con ocultar opciones en la interfaz. Los archivos JSON de `data/rules`, la extracción de `data/source` y el PDF original contienen material adicional; la publicación final debe excluir de los artefactos distribuidos todo el contenido fuera de la base. Los módulos de Tasha y Xanathar no se empaquetarán con la aplicación si se pretende que los aporte el usuario.

## Criterios de aceptación de la migración

1. El catálogo base funciona sin compendios importados y cada entrada incluida tiene procedencia y permiso documentados.
2. El creador, la ficha, la subida de nivel y la búsqueda usan solo el catálogo base más los módulos que haya importado el usuario.
3. Una ficha que depende de un módulo ausente sigue visible y exportable, muestra las referencias que faltan y recupera su uso al importar el módulo correcto.
4. Borrar un módulo usado muestra los personajes afectados y no destruye ni transforma sus elecciones.
5. Los artefactos de producción y los datos que se publiquen no incluyen el texto del PDF recopilatorio ni suplementos fuera de la base.
