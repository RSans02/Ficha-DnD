# Cobertura y validación de catálogos

La fuente tiene **633 páginas**. Se conserva texto íntegro y procedencia por página. Esta auditoría valida registros y relaciones; no presenta los efectos textuales como mecánicas automatizadas.

## Registros importados

| Catálogo | Registros |
|---|---:|
| races | 126 |
| rootRaces | 82 |
| subracesAndVariants | 44 |
| classes | 13 |
| subclasses | 127 |
| features | 1436 |
| racialFeatures | 435 |
| classFeatures | 1001 |
| spells | 501 |
| spellLists | 9 |
| spellListEntries | 1317 |
| optionalTashaRelations | 65 |
| feats | 83 |
| backgrounds | 31 |
| baseBackgrounds | 25 |
| backgroundVariants | 6 |
| equipment | 221 |

## Verificación

- Los 501 hechizos del índice tienen descripción completa y las cinco cabeceras estructuradas. Dos niveles contradictorios están en `null`, con los valores impresos y de sección conservados.
- Las 9 listas contienen 1.317 relaciones únicas. Se contrastaron 1.318 hipervínculos originales: uno está duplicado. Las 65 ampliaciones Tasha se identifican con el color del PDF, no por inferencia.
- Se auditaron siete vínculos erróneos del PDF y se preservaron las relaciones determinadas por el nombre exacto. Los 38 alias de traducción entre listas y títulos se justifican con el vínculo del PDF. No quedan referencias de listas sin resolver.
- Los 83 dotes y los 25 trasfondos principales coinciden con el índice. Hay 6 variantes adicionales. Solo se generan efectos cuantificables con evidencia literal; se mantiene el texto de todos los demás.
- Equipo incluye 13 armaduras/escudo y 37 armas. La tabla doble de aventura se separó por coordenadas. Pesos en libras; cifras ausentes no se sustituyen por valores oficiales externos.
- IDs únicos, descripciones no vacías, fuentes válidas y todas las referencias clase/subclase/rasgo/hechizo comprobadas por `scripts/validate_catalogs.py`.
- Regresión racial: Genasi MPMM hereda un único conjunto de aumentos y un único idioma; Alto Elfo +1 INT; Tritón legado +1 FUE/CON/CAR; linaje customizado no concede visión sin elegirla.

## Correcciones de extracción racial

Se reconocen aumentos de subrazas aunque no tengan bloque Tamaño/Edad, nombres completos y abreviados de características, velocidades descritas en prosa y títulos reales al inicio de línea. Se excluyen cabeceras/filas de tablas que antes aparecían como rasgos. Draconblood y Ravenite se clasifican como variantes de Wildemount con sustituciones documentadas; no reciben dos aumentos raciales. Semielfo Variante no obtiene simultáneamente el rasgo de habilidades que sustituye. No se corrigen mediante otras publicaciones las peculiaridades del PDF (por ejemplo +1 INT de Genasi del Agua legado).

## Huecos concretos y trabajo manual

- El texto completo extraído no equivale a automatización de todas sus mecánicas.
- Dos hechizos tienen conflicto interno de nivel y quedan en modo manual: Tormenta de Bolas de Nieve de Snilloc (p588) y Libertad de los Vientos (p632).
- Dunamancia solo tiene acceso automático documentado para Magia Cronúrgica/Gravitúrgica; otras clases requieren consentimiento del DM.
- Las 65 ampliaciones opcionales de Tasha conservan su condición opcional por clase; no equivalen a acceso base.
- El PDF omite reglas generales completas de compra de puntos, matriz estándar, experiencia, condiciones y descanso. No se incorporan reglas externas.
- Dotes complejas, transformaciones raciales, recursos condicionales, linajes con sustituciones y parte de las elecciones de rasgos siguen siendo texto y ajuste manual.
- Los 25 trasfondos y 6 variantes preservan narrativa y competencias; herramientas/idiomas/equipo elegibles no están todos convertidos en decisiones ejecutables.
- El peso de Tienda de campaña para dos personas está ausente en el PDF. Los pesos numéricos de equipo se expresan en lb.
- La CA especial, vuelo/nado/escalada, armas naturales y hechizos raciales no están automatizados de manera exhaustiva; consultar el rasgo y los overrides.
- Las variantes agregadas de Tiefling y la ascendencia de Semielfo Variante precisan resolver las opciones y sustituciones manualmente. Sus descripciones completas permanecen accesibles.
- Los efectos por nivel y requisitos de subclase no expresados inequívocamente por tablas/cabeceras permanecen explícitamente pendientes o manuales.

## Reproducibilidad

Ejecutar, en orden, `extract_source.py`, `segment_source.py`, `audit_source.py`, `extract_spell_links.py`, `import_reference_catalogs.py`, `import_equipment.py`, `extract_races.py`, el importador de clases y `validate_catalogs.py`. Los JSON de cobertura se regeneran desde los catálogos actuales. El PDF original y la extracción completa no se copian a `public`.
