# Verificación de entrega

Comprobaciones iniciales completadas el 25 de septiembre de 2026 en Windows, con Node.js 24.19.0 y Next.js 16.3.6. Última revisión de la ficha: 4 de octubre de 2026.

## Comprobaciones automáticas

- Instalación de dependencias con npm y archivo `package-lock.json` generado.
- TypeScript: `tsc --noEmit`, sin errores.
- Pruebas: `tsx --test tests/*.test.ts`, **106 aprobadas, 0 fallidas** en la última revisión.
- Catálogos: `python scripts/validate_catalogs.py`, validación aprobada.
- Producción: `npm run build`, compilación aprobada. Rutas generadas: `/`, `/_not-found` y `/api/catalog`.
- Servidor de producción iniciado y biblioteca abierta correctamente en el navegador.

Las pruebas cubren creación con las 13 clases, requisitos, multiclase, espacios de pacto, recuperación explícita, PG y Constitución retroactiva, mejoras de característica, deshacer nivel, persistencia, importaciones inválidas y separación de textos que comparten título en el PDF. Incluyen regresiones de Paladín/Explorador desde nivel 2, Artificiero con redondeo hacia arriba y ampliaciones opcionales de Tasha desactivadas por defecto.

También cubren Polivalente, Aura de Protección condicionada a estar consciente, armaduras naturales, movimiento de Monje/Bárbaro, pericia con herramientas, requisitos de invocaciones e infusiones, sustituciones de ataque y el resumen del borrador final de subida de nivel.

## Comprobaciones de interfaz

Se probó en navegador el flujo de creación de un Humano Guerrero, sus competencias y estilo de combate, equipar una cota de malla y obtener CA 17 con Defensa, gastar Nuevas Energías y recuperarlo mediante descanso corto. Se creó una nota y se verificó su persistencia tras recargar.

Con el personaje de ejemplo se comprobó daño con PG temporales, curación, subida de Mago 3 a 4 con mejora de Inteligencia y ampliación del libro, persistencia tras reabrir y restauración de la instantánea anterior. Se revisaron la ficha en escritorio y el diseño móvil de 390 × 844, incluyendo navegación y edición de notas. No se observó desbordamiento horizontal de la página móvil.

## Alcance

En la revisión del 4 de octubre volvieron a pasar TypeScript, las 106 pruebas y la compilación de producción. Las nuevas regresiones incluyen equipo inicial de clases y trasfondos, generación de características, descansos, agotamiento y correcciones del catálogo de 2014.

Se comprobó la ficha compacta en escritorio y a 390 × 844: apertura de personaje, cambio a Inventario, navegación por teclado a Hechizos, apertura y cancelación de Descanso corto desde esa pestaña, y acceso a Notas mediante la barra desplazable en móvil. La página móvil no desborda horizontalmente. Se revisaron visualmente el encabezado de clase, las pestañas y los controles de sesión. Estas comprobaciones de navegación no modificaron los datos del personaje.

Estas pruebas no equivalen a automatizar todas las mecánicas del manual. Las limitaciones de cobertura están en el README y en los documentos de auditoría. La impresión tiene una presentación específica, pero no se ha verificado un archivo PDF exportado mediante el diálogo de impresión. No se ha realizado un despliegue público ni una prueba de autenticación o base de datos externa.
