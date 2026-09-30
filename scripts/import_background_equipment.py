"""Equipo de trasfondo transcrito del PDF local (páginas 395–417).

No convierte valores de gemas en monedas ni otorga objetos por competencias.
Los objetos narrativos sin equivalencia inequívoca quedan sin peso/precio.
"""
import copy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
backgrounds = {x['id']: x for x in json.loads((ROOT / 'data/rules/backgrounds.json').read_text(encoding='utf-8'))}
result = {}


def gear(suffix, quantity=1, name=None, description=None):
    value = {'equipmentId': f'equipment-{suffix}', 'quantity': quantity}
    if name:
        value['name'] = name
    if description:
        value['description'] = description
    return value


def item(name, quantity=1, description=None):
    value = {'name': name, 'quantity': quantity}
    if description:
        value['description'] = description
    return value


def option(id, name, items=None, picks=None):
    value = {'id': id, 'name': name, 'items': items or []}
    if picks:
        value['picks'] = picks
    return value


def pick(category, name=None):
    return {'id': category, 'name': name or {'artisan-tool': 'Herramientas de artesano', 'instrument': 'Instrumento musical', 'gaming-set': 'Juego'}[category], 'quantity': 1, 'category': category}


def group(id, name, *options):
    return {'id': id, 'name': name, 'options': list(options)}


def choose(category, name=None):
    return group(category, name or pick(category)['name'], option('choose', 'De tu elección', picks=[pick(category, name)]))


bag = gear('equipo-bolsa')
common = gear('equipo-ropa-comun')
travel = gear('equipo-ropa-de-viajero')
fine = gear('equipo-ropa-fina')


def add(id, page, description, fixed, groups=None, gold=0, notes=None):
    result[f'background-{id}'] = {'source': {'page': page}, 'description': description, 'fixed': copy.deepcopy(fixed), 'groups': groups or [], 'coins': {'po': gold}}
    if notes:
        result[f'background-{id}']['notes'] = notes


add('acolito', 395,
    'Un símbolo sagrado (regalo del sacerdocio), un libro de oraciones o rueda de plegarias, 5 barritas de incienso, vestiduras, ropa común y una bolsa con 15 po.',
    [item('Símbolo sagrado', description='Regalo recibido al entrar en el sacerdocio.'), item('Barrita de incienso', 5), item('Vestiduras del sacerdocio'), common, bag],
    [group('plegarias', 'Oraciones', option('libro', 'Libro de oraciones', [gear('equipo-libro', name='Libro de oraciones')]), option('rueda', 'Rueda de plegarias', [item('Rueda de plegarias')]))], 15)

add('artesano-gremial', 396,
    'Herramientas de artesano de tu elección, una carta de introducción del gremio, ropa de viaje y una bolsa con 15 po.',
    [item('Carta de introducción del gremio'), travel, bag], [choose('artisan-tool')], 15)

add('mercader-de-gremio', 397,
    'Conservas el equipo del artesano gremial. Puedes sustituir sus herramientas de artesano por una mula y un carro.',
    [item('Carta de introducción del gremio'), travel, bag],
    [group('oficio', 'Equipo del gremio', option('herramientas', 'Herramientas de artesano', picks=[pick('artisan-tool')]), option('transporte', 'Mula y carro', [gear('monturas-burro-o-mula', name='Mula'), gear('equipo-carro')]))], 15,
    ['El equipo heredado del Artesano Gremial figura en la página 396; la sustitución de esta variante, en la 397.'])

artist = [item('Favor de un admirador', description='Una carta de amor, un mechón de pelo o una baratija; puedes detallar el recuerdo en el inventario.'), gear('equipo-ropa-de-disfraz', name='Traje de artista'), bag]
add('artista', 397,
    'Un instrumento musical de tu elección, el favor de un admirador, un traje y una bolsa con 15 po.',
    artist, [choose('instrument')], 15)
add('gladiador', 397,
    'Conservas el equipo del artista. Puedes sustituir su instrumento por un arma barata pero poco común, como un tridente o una red.',
    artist,
    [group('actuacion', 'Instrumento o arma de espectáculo', option('instrumento', 'Instrumento musical', picks=[pick('instrument')]), option('tridente', 'Tridente', [gear('armas-tridente')]), option('red', 'Red', [gear('armas-red')]), option('otra', 'Otra arma barata y poco común', [item('Arma barata y poco común de gladiador', description='Detalla el arma elegida en el inventario; la variante exige que sea barata y poco común.')]))], 15)

add('charlatan', 398,
    'Ropa fina, un kit de disfraz, herramientas de estafa de tu elección y una bolsa con 15 po.',
    [fine, gear('herramientas-kit-de-disfraz'), item('Herramientas de estafa', description='Escoge y detalla tu ardid: diez botellas con tapón llenas de líquido de color, dados cargados, cartas marcadas o un anillo de sello de un duque imaginario.'), bag], gold=15)
criminal = [gear('equipo-palanca', name='Barreta'), gear('equipo-ropa-comun', name='Ropa común oscura con capucha'), bag]
add('criminal', 398, 'Una barreta, ropa común oscura con capucha y una bolsa con 15 po.', criminal, gold=15)
add('espia', 399, 'La variante Espía conserva el equipo del Criminal: una barreta, ropa común oscura con capucha y una bolsa con 15 po.', criminal, gold=15, notes=['Equipo base en la página 398; la variante no lo sustituye.'])

add('ermitano', 399,
    'Un rollo de pergamino con notas de tus estudios o plegarias, una frazada de invierno, ropa común, un kit de herboristería y una bolsa con 5 po.',
    [item('Rollo de pergamino con estudios o plegarias'), gear('equipo-manta', name='Frazada de invierno'), common, gear('herramientas-kit-de-herboristeria'), bag], gold=5)
add('fronterizo', 401,
    'Un bastón, una trampa de caza, un trofeo de un animal que mataste, ropa de viajero y una bolsa con 10 po.',
    [gear('armas-baston'), gear('equipo-trampa-de-cazador'), item('Trofeo de un animal cazado'), travel, bag], gold=10)
add('heroe-de-pueblo', 401,
    'Herramientas de artesano de tu elección, una pala, una olla de hierro, ropa común y una bolsa con 10 po.',
    [gear('equipo-pala'), gear('equipo-olla-de-hierro'), common, bag], [choose('artisan-tool')], 10)
add('huerfano', 402,
    'Un pequeño cuchillo, un mapa de la ciudad en la que creciste, un ratón como mascota, un símbolo para recordar a tus padres, ropa común y una bolsa con 10 po.',
    [item('Pequeño cuchillo'), item('Mapa de la ciudad natal'), item('Ratón como mascota'), item('Recuerdo de tus padres'), common, bag], gold=10)
mariner = [item('Barra de madera o metal (clava)', description='El texto del trasfondo la denomina clava; no se le asignan estadísticas de otra arma.'), gear('equipo-cuerda-de-seda-50-pies'), item('Amuleto de la suerte', description='Una pata de conejo, una piedra con un agujero o una baratija de tu elección.'), common, bag]
add('marinero', 402,
    'Una barra de madera o metal (clava), 50 pies de cuerda de seda, un amuleto de la suerte o baratija, ropa común y una bolsa con 10 po.',
    mariner, gold=10)
add('pirata', 403,
    'La variante Pirata conserva el equipo del Marinero: clava, 50 pies de cuerda de seda, amuleto de la suerte, ropa común y una bolsa con 10 po.',
    mariner, gold=10, notes=['Equipo base en la página 402; la variante solo ofrece un rasgo alternativo.'])
noble = [fine, gear('equipo-anillo-de-sello'), item('Pergamino con tu genealogía'), item('Monedero')]
add('noble', 404,
    'Ropa fina, un anillo con sello, un pergamino con tu genealogía y un monedero con 25 po.', noble, gold=25)
add('caballero', 404,
    'Conservas el equipo del Noble. Puedes incluir un estandarte u otro símbolo de un señor o una dama a quien hayas entregado tu corazón.', noble, gold=25,
    notes=['El estandarte o símbolo cortesano es opcional: añádelo y descríbelo si forma parte de tu historia. Los seguidores son personajes, no objetos de inventario.'])
add('sabio', 404,
    'Un tintero, una pluma, un cuchillo pequeño, una carta de un colega muerto con una pregunta sin resolver, ropa común y una bolsa con 10 po.',
    [item('Tintero'), gear('equipo-pluma-de-escritura'), item('Cuchillo pequeño'), item('Carta de un colega muerto', description='Incluye una pregunta que todavía no has sido capaz de responder.'), common, bag], gold=10)
add('soldado', 405,
    'Una insignia de rango, un trofeo de un enemigo caído, dados de hueso o baraja de cartas, ropa común y una bolsa con 10 po.',
    [item('Insignia de rango'), item('Trofeo de un enemigo caído', description='Una daga, una hoja rota o un trozo de estandarte; detalla el trofeo en el inventario.'), common, bag],
    [group('juego', 'Juego de campaña', option('dados', 'Dados de hueso', [gear('herramientas-set-de-dados', name='Dados de hueso')]), option('cartas', 'Baraja de cartas', [gear('herramientas-set-de-baraja-de-cartas')]))], 10)

add('agente-de-una-faccion', 406,
    'Insignia o emblema de la facción, una copia de un texto influyente (o código de conducta de una facción encubierta), ropa común y una bolsa con 15 po.',
    [item('Insignia o emblema de la facción'), item('Texto de la facción', description='Un texto influyente para tu facción, o su código de conducta si es encubierta.'), common, bag], gold=15)
add('artesano-del-clan', 408,
    'Herramientas de artesano con las que seas competente, un cincel con la marca del creador, ropa de viaje y una bolsa con 5 po y una piedra preciosa valorada en 10 po.',
    [item('Cincel con la marca del clan'), travel, bag, item('Piedra preciosa (valor: 10 po)')], [choose('artisan-tool', 'Herramientas de artesano con las que seas competente')], 5,
    ['Escoge herramientas en las que tengas competencia. La piedra es un objeto; no añade 10 po a tu dinero.'])
add('caballero-de-la-orden', 409,
    'Ropa de viaje, un estandarte o sello que represente tu papel o rango en la orden y una bolsa con 10 po.',
    [travel, item('Estandarte o sello de la orden'), bag], gold=10)
add('cazarrecompensas-urbano', 410,
    'Una muda apropiada para tus deberes y una bolsa con 20 po.',
    [item('Muda apropiada para tus deberes'), bag], gold=20)
add('cortesano', 410,
    'Ropa elegante y una bolsa con 5 po.', [gear('equipo-ropa-fina', name='Ropa elegante'), bag], gold=5)
add('erudito-enclaustrado', 411,
    'Una túnica de erudito del claustro, un juego de escritura (bolsita con pluma, tinta, pergamino enrollado y cortaplumas), un libro prestado sobre tu estudio actual y una bolsa con 10 po.',
    [gear('equipo-tunica', name='Túnica de erudito del claustro'), item('Juego de escritura', description='Una bolsita con pluma, tinta, pergamino enrollado y un pequeño cortaplumas.'), gear('equipo-libro', name='Libro prestado de tu estudio actual'), bag], gold=10)
add('forastero-errante', 412,
    'Ropa de viaje, un instrumento o juego con el que tengas competencia, mapas de tu patria que muestran tu ubicación en Faerun, una joya de tu lugar de origen valorada en 10 po y una bolsa con 5 po.',
    [travel, item('Mapas trazados en tu patria'), item('Joya de tu lugar de origen (valor: 10 po)'), bag],
    [group('pasatiempo', 'Instrumento o juego con el que tengas competencia', option('instrumento', 'Instrumento musical', picks=[pick('instrument')]), option('juego', 'Juego', picks=[pick('gaming-set')]))], 5,
    ['Escoge un instrumento o juego en el que tengas competencia. La joya es un objeto; no añade 10 po a tu dinero.'])
guard = [item('Uniforme de la unidad con tu rango'), gear('herramientas-cuerno', name='Cuerno para pedir ayuda'), gear('equipo-esposas'), bag]
add('guardia-de-ciudad', 414,
    'Uniforme de la unidad que indique tu rango, un cuerno para pedir ayuda, un juego de esposas y una bolsa con 10 po.', guard, gold=10)
add('investigador', 414,
    'La variante Investigador conserva el equipo del Guardia de Ciudad: uniforme, cuerno para pedir ayuda, esposas y una bolsa con 10 po.', guard, gold=10)
add('heredero', 415,
    'Tu herencia, ropa de viaje, cualquier objeto con el que tengas competencia y una bolsa con 15 po.',
    [item('Herencia', description='Define su naturaleza y propiedades con tu Dungeon Master.'), travel, item('Objeto con el que tienes competencia', description='El manual no restringe su categoría: detalla el objeto elegido y comprueba su competencia.'), bag], gold=15,
    ['La herencia y el objeto competente se pueden concretar editándolos en el inventario. No se presupone su valor, peso ni propiedades mágicas.'])
add('mercenario-veterano', 416,
    'Uniforme de tu compañía (ropas de viaje de calidad), insignia de rango, piezas de un juego a tu elección y una bolsa con lo que queda de tu última paga: 10 po.',
    [gear('equipo-ropa-de-viajero', name='Uniforme de la compañía'), item('Insignia de rango'), bag], [choose('gaming-set')], 10)
add('miembro-de-una-tribu-uthgardt', 416,
    'Una trampa para cazar, un símbolo de tótem o tatuajes de lealtad a Uthgar y al tótem de la tribu, ropa de viaje y una bolsa con 10 po.',
    [gear('equipo-trampa-de-cazador'), item('Símbolo de tótem o tatuajes de lealtad', description='Elige y detalla un símbolo de tótem o los tatuajes que marcan tu lealtad a Uthgar y al tótem de tu tribu.'), travel, bag], gold=10)
add('noble-de-waterdeep', 417,
    'Ropa elegante, un anillo de sellar o broche, un pergamino con tu genealogía, una bota de buen zzar o vino y un monedero con 20 po.',
    [fine, item('Pergamino con tu genealogía'), item('Bota de buen zzar o vino'), item('Monedero')],
    [group('sello', 'Distintivo noble', option('anillo', 'Anillo de sellar', [gear('equipo-anillo-de-sello')]), option('broche', 'Broche', [item('Broche')]))], 20)

assert set(result) == set(backgrounds), (set(backgrounds) - set(result), set(result) - set(backgrounds))
(ROOT / 'data/rules/background-equipment.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'{len(result)} trasfondos con equipo inicial.')
