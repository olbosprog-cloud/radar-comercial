import { FastifyInstance } from 'fastify';
import { SearchService } from '../services/search.service.js';
import { SearchFilter, DataMode } from '../types/lead.js';

export async function searchRoutes(app: FastifyInstance) {
  /**
   * Rota principal de busca e enriquecimento de leads
   */
  app.post<{
    Body: SearchFilter & {
      auto_enrich?: boolean;
      override_mode?: DataMode;
    };
  }>('/api/search', async (req, reply) => {
    const {
      uf,
      cidade,
      bairro,
      cnae,
      segmento,
      atividade,
      termo_atividade,
      porte,
      data_abertura_inicio,
      data_abertura_fim,
      limite,
      latitude,
      longitude,
      raio_km,
      auto_enrich = true,
      override_mode,
    } = req.body || {};

    // Se tiver coordenadas de GPS ou cidade/uf
    const hasGps = latitude !== undefined && longitude !== undefined;
    if (!hasGps && (!cidade || !uf)) {
      return reply.status(400).send({
        success: false,
        error: 'Cidade e UF (ou localização GPS) são obrigatórios para realizar a busca.',
      });
    }

    try {
      const filter: SearchFilter = {
        uf: uf ? uf.trim().toUpperCase() : 'GO',
        cidade: cidade ? cidade.trim() : 'Localização Atual',
        bairro: bairro && bairro !== 'TODOS' ? bairro.trim() : undefined,
        cnae: cnae ? cnae.trim() : undefined,
        segmento: segmento ? segmento.trim() : undefined,
        atividade: atividade ? atividade.trim() : undefined,
        termo_atividade: termo_atividade ? termo_atividade.trim() : undefined,
        porte: porte || 'TODOS',
        data_abertura_inicio,
        data_abertura_fim,
        limite: limite ? Number(limite) : 20,
        latitude: latitude ? Number(latitude) : undefined,
        longitude: longitude ? Number(longitude) : undefined,
        raio_km: raio_km ? Number(raio_km) : 3,
      };

      const result = await SearchService.executeSearch(filter, auto_enrich, override_mode);

      return {
        success: true,
        total: result.total,
        provider: result.providerUtilizado,
        mode: result.modoUtilizado,
        leads: result.leads,
      };
    } catch (err: any) {
      console.error('[SearchRoute Error]', err);
      return reply.status(500).send({
        success: false,
        error: err?.message || 'Falha ao executar busca de leads.',
      });
    }
  });

  /**
   * Histórico de buscas efetuadas
   */
  app.get('/api/search/history', async () => {
    const history = SearchService.getSearchHistory(20);
    return {
      success: true,
      history,
    };
  });
}
