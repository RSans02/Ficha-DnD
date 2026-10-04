"""Structured background proficiencies for the 2014 rules and local supplements.

Called by import_reference_catalogs, so regenerating the source catalogs preserves
the choices. Equipment ownership is deliberately independent of proficiency.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LANGUAGES = ['Común', 'Enano', 'Élfico', 'Gigante', 'Gnómico', 'Goblin', 'Mediano', 'Orco',
             'Abisal', 'Celestial', 'Dracónico', 'Habla de las profundidades', 'Infernal',
             'Primordial', 'Silvano', 'Infracomún']


def enrich_backgrounds(rows):
    equipment = json.loads((ROOT / 'data/rules/equipment.json').read_text(encoding='utf-8'))
    special_tools = {'equipment-herramientas-herramientas-de-ladron', 'equipment-herramientas-herramientas-de-navegacion'}
    tool_types = {'artisan': 'Herramientas de artesano', 'instrument': 'Instrumentos musicales', 'game': 'Set de juego'}

    def tool_options(*categories):
        return [
            {'id': item['name'], 'name': item['name'], 'effects': [{'type': 'proficiency', 'value': item['name'], 'category': category}]}
            for category in categories for item in equipment
            if item.get('equipmentType') == tool_types[category] and item['id'] not in special_tools
        ]

    # Language counts and fixed tool proficiencies are from the printed fields.
    # Folk Hero does not gain a language in 2014 (the PDF includes a stray line).
    language_counts = {
        'acolito': 2, 'artesano-gremial': 1, 'mercader-de-gremio': 1,
        'ermitano': 1, 'fronterizo': 1, 'noble': 1, 'caballero': 1, 'sabio': 2,
        'agente-de-una-faccion': 2, 'caballero-de-la-orden': 1, 'cortesano': 2,
        'erudito-enclaustrado': 2, 'forastero-errante': 1, 'guardia-de-ciudad': 2,
        'investigador': 2, 'heredero': 1, 'miembro-de-una-tribu-uthgardt': 1,
        'noble-de-waterdeep': 1,
    }
    fixed_tools = {
        'artista': ['Kit de disfraz'], 'gladiador': ['Kit de disfraz'],
        'charlatan': ['Kit de disfraz', 'Kit de falsificación'],
        'criminal': ['Herramientas de ladrón'], 'espia': ['Herramientas de ladrón'],
        'ermitano': ['Kit de herboristería'], 'heroe-de-pueblo': ['Vehículos terrestres'],
        'huerfano': ['Kit de disfraz', 'Herramientas de ladrón'],
        'marinero': ['Herramientas de navegación', 'Vehículos acuáticos'],
        'pirata': ['Herramientas de navegación', 'Vehículos acuáticos'],
        'soldado': ['Vehículos terrestres'], 'mercenario-veterano': ['Vehículos terrestres'],
    }
    choices_by_background = {
        'artesano-gremial': ('artisan',), 'artista': ('instrument',), 'gladiador': ('instrument',),
        'criminal': ('game',), 'espia': ('game',), 'fronterizo': ('instrument',),
        'heroe-de-pueblo': ('artisan',), 'noble': ('game',), 'caballero': ('game',),
        'soldado': ('game',), 'artesano-del-clan': ('artisan',),
        'caballero-de-la-orden': ('instrument', 'game'), 'forastero-errante': ('instrument', 'game'),
        'heredero': ('instrument', 'game'), 'mercenario-veterano': ('game',),
        'miembro-de-una-tribu-uthgardt': ('artisan', 'instrument'), 'noble-de-waterdeep': ('instrument', 'game'),
    }
    for row in rows:
        suffix = row['id'].removeprefix('background-')
        # Keep the original skill choices and replace only this module's entries.
        choices = [choice for choice in row.get('choices', []) if choice['type'] == 'choose_skill']
        row['languages'] = ['Enano'] if suffix == 'artesano-del-clan' else []
        row['toolProficiencies'] = fixed_tools.get(suffix, [])
        row['choices'] = choices

        def choice(kind, name, amount=1, options=None, **metadata):
            value = {'id': row['id'] + '.' + kind, 'type': kind, 'name': name + ' · ' + row['name'],
                     'amount': amount, 'options': options or [], 'required': True, 'source': row['source'], **metadata}
            choices.append(value)
            return value

        count = language_counts.get(suffix, 0)
        if count:
            choice('choose_language', 'Idiomas del trasfondo', count)
        if suffix in choices_by_background:
            choice('choose_tool', 'Competencia con herramientas', options=tool_options(*choices_by_background[suffix]))
        if suffix == 'artesano-del-clan':
            choice('choose_language', 'Otro idioma porque ya conoces Enano', replacementForLanguage='Enano')
        if suffix == 'mercader-de-gremio':
            options = tool_options('artisan') + [{'id': 'Herramientas de navegación', 'name': 'Herramientas de navegación', 'effects': [{'type': 'proficiency', 'value': 'Herramientas de navegación'}]}]
            options += [{'id': 'language:' + name, 'name': 'Idioma: ' + name, 'description': 'Alternativa a la competencia con herramientas. Los idiomas exóticos necesitan permiso del DM.', 'effects': [{'type': 'language', 'value': name}]} for name in LANGUAGES]
            choice('choose_proficiency', 'Herramientas del gremio o idioma adicional', options=options)
        if suffix == 'cazarrecompensas-urbano':
            options = tool_options('instrument', 'game') + [{'id': 'Herramientas de ladrón', 'name': 'Herramientas de ladrón', 'effects': [{'type': 'proficiency', 'value': 'Herramientas de ladrón', 'category': 'thieves-tools'}]}]
            choice('choose_tool', 'Dos competencias de categorías diferentes', 2, options, distinctCategories=True)
        row['automationNotes'] = ['Las competencias fijas y las elecciones de habilidades, herramientas e idiomas están estructuradas. El equipo inicial se elige por separado; poseer un objeto no concede competencia.']
        if suffix == 'heroe-de-pueblo':
            row['automationNotes'].append('Regla base de 2014: Héroe de Pueblo no concede un idioma adicional. La línea de idioma del PDF no se aplica.')
        if suffix == 'artesano-del-clan':
            row['automationNotes'].append('Concede Enano; si otra fuente ya lo concede, permite escoger otro idioma.')
    return rows


if __name__ == '__main__':
    path = ROOT / 'data/rules/backgrounds.json'
    rows = enrich_backgrounds(json.loads(path.read_text(encoding='utf-8')))
    path.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'{len(rows)} trasfondos con competencias y elecciones estructuradas.')
