import { FastifyInstance } from 'fastify';
import { ImporterService } from '../services/importer.service.js';
import { LeadService } from '../services/lead.service.js';

export async function importRoutes(app: FastifyInstance) {
  /**
   * Importação via texto CSV (copiar/colar ou upload via payload)
   */
  app.post<{
    Body: {
      csv_text?: string;
      json_data?: any;
    };
  }>('/api/import', async (req, reply) => {
    const { csv_text, json_data } = req.body || {};

    try {
      let leads = [];

      if (csv_text && csv_text.trim()) {
        leads = ImporterService.parseCsv(csv_text);
      } else if (json_data) {
        const jsonStr = typeof json_data === 'string' ? json_data : JSON.stringify(json_data);
        leads = ImporterService.parseJson(jsonStr);
      } else {
        return reply.status(400).send({
          success: false,
          error: 'Envie "csv_text" com o conteúdo do arquivo CSV ou "json_data".',
        });
      }

      if (leads.length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'Nenhum lead com CNPJ válido e situação ATIVA foi identificado.',
        });
      }

      const insertedCount = LeadService.saveBatch(leads);

      return {
        success: true,
        message: `${insertedCount} leads processados e salvos com sucesso!`,
        total_importados: insertedCount,
        leads_amostra: leads.slice(0, 5),
      };
    } catch (err: any) {
      console.error('[Import Error]', err);
      return reply.status(500).send({
        success: false,
        error: `Erro ao importar arquivo: ${err?.message || err}`,
      });
    }
  });
}
