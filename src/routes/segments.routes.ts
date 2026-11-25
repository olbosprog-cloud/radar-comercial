import { FastifyInstance } from 'fastify';
import { COMMERCIAL_SEGMENTS } from '../data/commercial-segments.js';

export async function segmentsRoutes(app: FastifyInstance) {
  /**
   * Retorna os segmentos de comércio e todas as atividades comerciais associadas
   */
  app.get('/api/segments', async () => {
    return {
      success: true,
      total: COMMERCIAL_SEGMENTS.length,
      segments: COMMERCIAL_SEGMENTS,
    };
  });
}
