import { FastifyInstance } from 'fastify';
import { BRAZILIAN_CITIES, GOIANIA_SETORES, APARECIDA_SETORES } from '../data/locations.js';

export async function locationsRoutes(app: FastifyInstance) {
  /**
   * Retorna lista de cidades (com filtro opcional por UF)
   */
  app.get<{
    Querystring: { uf?: string };
  }>('/api/locations/cities', async (req) => {
    const { uf } = req.query;
    let list = BRAZILIAN_CITIES;

    if (uf) {
      const cleanUf = uf.trim().toUpperCase();
      list = BRAZILIAN_CITIES.filter((c) => c.uf === cleanUf);
    }

    return {
      success: true,
      total: list.length,
      cities: list.map((c) => ({
        id: c.id,
        nome: c.nome,
        uf: c.uf,
        ddd: c.ddd,
        has_sectors: Boolean(c.setores && c.setores.length > 0),
        total_sectors: c.setores?.length || 0,
      })),
    };
  });

  /**
   * Retorna os setores/bairros de uma cidade específica
   */
  app.get<{
    Querystring: { city?: string; uf?: string };
  }>('/api/locations/sectors', async (req) => {
    const { city, uf } = req.query;
    const cleanCity = (city || '').trim().toLowerCase();

    if (cleanCity.includes('aparecida')) {
      return {
        success: true,
        cidade: 'Aparecida de Goiânia',
        uf: 'GO',
        total: APARECIDA_SETORES.length,
        sectors: APARECIDA_SETORES,
      };
    }

    if (cleanCity.includes('goiânia') || cleanCity.includes('goiania')) {
      return {
        success: true,
        cidade: 'Goiânia',
        uf: 'GO',
        total: GOIANIA_SETORES.length,
        sectors: GOIANIA_SETORES,
      };
    }

    // Busca na lista geral de cidades
    const matched = BRAZILIAN_CITIES.find(
      (c) => c.nome.toLowerCase() === cleanCity && (!uf || c.uf === uf.toUpperCase())
    );

    return {
      success: true,
      cidade: matched ? matched.nome : city,
      uf: matched ? matched.uf : uf,
      total: matched?.setores?.length || 0,
      sectors: matched?.setores || [],
    };
  });
}
