"""Audit coverage of every physical page and every bookmark, without sampling."""
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "source"
pages = json.loads((OUT / "pages-reading-order.json").read_text(encoding="utf-8"))
sections = json.loads((OUT / "sections.json").read_text(encoding="utf-8"))
manifest = json.loads((OUT / "manifest.json").read_text(encoding="utf-8"))
categories = [
    (1, 2, "Portada e introducción"), (3, 3, "Información racial y linaje customizado"),
    (4, 11, "Razas comunes"), (12, 23, "Razas poco comunes"),
    (24, 31, "Razas monstruosas"), (32, 47, "Razas exóticas"),
    (48, 81, "Razas del Multiverso"), (82, 101, "Razas de módulos"),
    (102, 393, "Clases, subclases y progresiones"),
    (394, 405, "Trasfondos"), (406, 417, "Trasfondos extras"),
    (418, 432, "Equipo, moneda, armas, armaduras, herramientas y monturas"),
    (433, 442, "Dotes generales"), (443, 445, "Dotes raciales"),
    (446, 446, "Dotes dracónicos"), (447, 447, "Dote del cartomágico"),
    (448, 449, "Dotes de Tal’Dorei"), (450, 452, "Multiclase"),
    (453, 473, "Listas de hechizos y conversión de distancias"),
    (474, 579, "Hechizos del Manual del Jugador"),
    (580, 608, "Hechizos de Xanathar"), (609, 623, "Hechizos de Tasha"),
    (624, 626, "Hechizos de Fizban"), (627, 631, "Hechizos de Dunamancia"),
    (632, 632, "Hechizos de Tal’Dorei"), (633, 633, "Personalizar hechizos"),
]
page_audit = []
for page in pages:
    n = page["page"]
    category = next(name for start, end, name in categories if start <= n <= end)
    text = page["text"]
    titles = [section["title"] for section in sections if section["page"] == n]
    page_audit.append({"page": n, "category": category, "characters": len(text),
                       "bookmarks": titles, "status": "blank" if not text.strip() else "text-extracted",
                       "choiceMentions": len(re.findall(r"elig[ei]|elecci[oó]n|escog", text, re.I)),
                       "recoveryMentions": len(re.findall(r"descanso (?:corto|largo)", text, re.I)),
                       "prerequisiteMentions": len(re.findall(r"requisito|requerimiento", text, re.I)),
                       "tableRowCandidates": len(re.findall(r"^\s*(?:[1-9]|1[0-9]|20)\s+\+[2-6]", text, re.M))})
(OUT / "page-audit.json").write_text(json.dumps(page_audit, ensure_ascii=False, indent=2), encoding="utf-8")

report = """# Auditoría íntegra de la fuente

Fuente local: **Manual para Casi Todo de D&D 5e (V30.03.25).pdf**.

Se han recorrido programáticamente las **633 páginas físicas**, extraído su texto en dos modalidades y auditado los **2.066 marcadores**, sin limitar el análisis a una muestra. El texto completo tiene 2.707.903 caracteres en modo layout. La extracción no equivale a que todas las interacciones mecánicas estén automatizadas: cada catálogo mantiene sus límites y un informe de importación independiente.

Archivos reproducibles: `scripts/extract_source.py`, `scripts/segment_source.py`, `scripts/audit_source.py`. Datos de evidencia: `pages.json` (layout), `pages-reading-order.json` (lectura secuencial), `outline.json` (jerarquía y coordenadas), `sections.json` (segmentos completos), `manifest.json`, `segmentation-issues.json`, `page-audit.json` (una fila por cada página).

## Cobertura física y grandes categorías

| Categoría | Páginas físicas | Marcadores | Caracteres extraídos |
|---|---:|---:|---:|
"""
for start, end, name in categories:
    count = sum(start <= s["page"] <= end for s in sections)
    chars = sum(len(p["text"]) for p in pages if start <= p["page"] <= end)
    report += f"| {name} | {start}–{end} | {count} | {chars:,} |\n"

report += """
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
5. La fórmula combinada de espacios de p452 omite artificiero; hay que consultar además su apartado específico antes de automatizar esa combinación. Si no se encuentra allí, los espacios multiclase de esa combinación quedan manuales.
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
"""
(ROOT / "docs").mkdir(exist_ok=True)
(ROOT / "docs" / "source-audit.md").write_text(report, encoding="utf-8")
print(json.dumps({"pagesAudited": len(page_audit), "categories": len(categories), "bookmarksAudited": len(sections)}))
