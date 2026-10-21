import type { Equipment } from './types';

// Denominaciones del SRD 5.1 en español. Las claves del catálogo no cambian.
const OFFICIAL_NAMES: Record<string, string> = {
  'Armaduras:Camisote de malla': 'Camisa de malla',
  'Armaduras:Placas y malla': 'Media armadura',
  'Armaduras:Cota de anillas': 'Cota guarnecida',
  'Armaduras:Laminada': 'Armadura de bandas',
  'Armaduras:Placas': 'Armadura de placas',
  'Armas:Garrote': 'Garrote grande',
  'Armas:Porra': 'Garrote',
  'Armas:Gran hacha': 'Hacha a dos manos',
  'Armas:Mazo': 'Maza a dos manos',
  'Armas:Pico de cuervo': 'Pico de guerra',
  'Equipo:Carcaj': 'Aljaba',
  'Equipo:Anillo de sello': 'Anillo de sellar',
  'Equipo:Aparejo de pesca': 'Caña de pescar',
  'Equipo:Aparejo de poleas': 'Polipasto',
  'Equipo:Cesto': 'Cesta',
  'Equipo:Cuerda de cáñamo (50 pies)': 'Cuerda de cáñamo (15 m)',
  'Equipo:Cuerda de seda (50 pies)': 'Cuerda de seda (15 m)',
  'Equipo:Escalera (10 pies)': 'Escalera (3 m)',
  'Equipo:Espejo de acero': 'Espejito de acero',
  'Equipo:Estuche para mapas o pergaminos': 'Estuche para mapa o pergamino',
  'Equipo:Fiambrera': 'Utensilios de cocina',
  'Equipo:Cetro': 'Vara',
  'Equipo:Ramo de muérdago': 'Rama de muérdago',
  'Equipo:Frasco o jarra de metal': 'Frasco o jarra',
  'Equipo:Jarro o jarra': 'Jarro o cántaro',
  'Equipo:Kit de escalada': 'Útiles de escalada',
  'Equipo:Kit de sanador': 'Útiles de sanador',
  'Equipo:Lata de yesca': 'Yesquero',
  'Equipo:Lente de aumento': 'Lupa',
  'Equipo:Linterna con capuchón': 'Linterna sorda',
  'Equipo:Odre': 'Cantimplora',
  'Equipo:Palanca': 'Palanqueta',
  'Equipo:Pértiga (10 pies)': 'Vara (3 m)',
  'Equipo:Piquetas de hierro (10)': 'Pinchos de hierro (10)',
  'Equipo:Pluma de escritura': 'Pluma (para escribir)',
  'Equipo:Ropa común': 'Ropas comunes',
  'Equipo:Ropa fina': 'Ropas de calidad',
  'Equipo:Ropa de viajero': 'Ropas de viaje',
  'Equipo:Ropa de disfraz': 'Ropas, disfraz',
  'Equipo:Saco de dormir': 'Petate',
  'Equipo:Silbato de señales': 'Silbato de supervivencia',
  'Equipo:Tienda de campaña para dos personas': 'Tienda para dos personas',
  'Equipo:Tinta (botella de 1 onza)': 'Tinta (frasco de 30 ml)',
  'Equipo:Trampa de cazador': 'Trampa para cazar',
  'Equipo:Agujas de cerbatanas (50)': 'Dardos de cerbatana (50)',
  'Equipo:Bolsa de componentes': 'Saquito de componentes',
  'Herramientas:Herramientas de peletero': 'Herramientas de curtidor',
  'Herramientas:Herramientas de tallista': 'Herramientas de ebanista',
  'Herramientas:Herramientas de hojalatero': 'Herramientas de manitas',
  'Herramientas:Materiales de pintor': 'Suministros de pintor',
  'Herramientas:Materiales alquímicos': 'Suministros de alquimista',
  'Herramientas:Materiales de cervecería': 'Suministros de cervecero',
  'Herramientas:Materiales de caligrafía': 'Suministros de calígrafo',
  'Herramientas:Utensilios de cocina': 'Útiles de cocinero',
  'Herramientas:Herramientas de navegación': 'Herramientas de navegante',
  'Herramientas:Caramillo': 'Chirimía',
  'Herramientas:Dulcimer': 'Dulcémele',
  'Herramientas:Kit de disfraz': 'Útiles para disfrazarse',
  'Herramientas:Kit de envenenador': 'Útiles de envenenador',
  'Herramientas:Kit de falsificación': 'Útiles para falsificar',
  'Herramientas:Kit de herboristería': 'Útiles de herborista',
  'Herramientas:Set de baraja de cartas': 'Naipes',
  'Herramientas:Set de dados': 'Dados',
  'Equipo:Comida (por día)': 'Alimento (por día)',
  'Equipo:Establo (por día)': 'Estabulado (por día)',
  'Equipo:Carreta': 'Carro',
  'Equipo:Carro': 'Carreta',
  'Equipo:Cuadriga': 'Carro de guerra',
  'Equipo:Silla de montar: De carga': 'Silla de tiro',
  'Equipo:Silla de montar: De montar': 'Silla de monta',
  'Vehículos:Chalupa': 'Barcaza',
  'Vehículos:Nave larga': 'Drakkar',
  'Paquetes:Equipo de Ladrón': 'Paquete de ladrón',
  'Paquetes:Equipo de Diplomático': 'Paquete de diplomático',
  'Paquetes:Equipo para Dungeons': 'Paquete de explorador de mazmorras',
  'Paquetes:Equipo de Actor': 'Paquete de artista',
  'Paquetes:Equipo de Explorador': 'Paquete de explorador',
  'Paquetes:Equipo de Sacerdote': 'Paquete de sacerdote',
  'Paquetes:Equipo de Erudito': 'Paquete de erudito',
};

export function equipmentDisplayName(equipment: Equipment): string {
  return OFFICIAL_NAMES[`${equipment.category}:${equipment.name}`] ?? equipment.name;
}

export function equipmentWeight(weight: number | null | undefined): string | null {
  if (weight == null) return null;
  const kilograms = weight / 2;
  const formatter = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 });
  return kilograms < 0.5 ? `${formatter.format(kilograms * 1000)} g` : `${formatter.format(kilograms)} kg`;
}

export function equipmentSpeed(text: string | undefined): string | null {
  if (!text) return null;
  const feet = text.match(/^(\d+) pies$/);
  if (feet) return `${Number(feet[1]) * 0.3} m`;
  const miles = text.match(/^([\d,]+) millas\/hora$/);
  if (miles) return `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(Number(miles[1].replace(',', '.')) * 1.5)} km/h`;
  return text;
}

export function equipmentProperty(property: string): string {
  return property
    .replace(/^Alcance$/, 'Gran alcance')
    .replace(/^Carga$/, 'Recarga')
    .replace(/\(distancia (\d+)\/(\d+)\)/, (_, short: string, long: string) => `(alcance ${Number(short) * 0.3}/${Number(long) * 0.3} m)`);
}

export const PACK_CONTENTS: Record<string, string[]> = {
  'equipment-paquetes-equipo-de-ladron': ['Mochila', 'Bolsa de 1000 bolas de metal', 'Cordel (3 m)', 'Campana', '5 velas', 'Palanqueta', 'Martillo', '10 pitones', 'Linterna sorda', '2 frascos de aceite', 'Raciones para 5 días', 'Yesquero', 'Cantimplora', 'Cuerda de cáñamo (15 m)'],
  'equipment-paquetes-equipo-de-diplomatico': ['Cofre', '2 estuches para mapa o pergamino', 'Ropas de calidad', 'Frasco de tinta', 'Pluma', 'Lámpara', '2 frascos de aceite', '5 hojas de papel', 'Vial de perfume', 'Lacre', 'Jabón'],
  'equipment-paquetes-equipo-para-dungeons': ['Mochila', 'Petate', 'Palanqueta', 'Martillo', '10 pitones', '10 antorchas', 'Yesquero', 'Raciones para 10 días', 'Cantimplora', 'Cuerda de cáñamo (15 m)'],
  'equipment-paquetes-equipo-de-actor': ['Mochila', 'Petate', '2 disfraces', '5 velas', 'Raciones para 5 días', 'Cantimplora', 'Útiles para disfrazarse'],
  'equipment-paquetes-equipo-de-explorador': ['Mochila', 'Petate', 'Utensilios de cocina', 'Yesquero', '10 antorchas', 'Raciones para 10 días', 'Cantimplora', 'Cuerda de cáñamo (15 m)'],
  'equipment-paquetes-equipo-de-sacerdote': ['Mochila', 'Manta', '10 velas', 'Yesquero', 'Caja para limosnas', '2 barras de incienso', 'Incensario', 'Vestiduras', 'Raciones para 2 días', 'Cantimplora'],
  'equipment-paquetes-equipo-de-erudito': ['Mochila', 'Libro de consulta', 'Frasco de tinta', 'Pluma', '10 hojas de pergamino', 'Bolsa de arena', 'Cuchillo pequeño'],
};
