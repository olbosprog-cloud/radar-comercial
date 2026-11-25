import { FastifyInstance } from 'fastify';
import { LeadService } from '../services/lead.service.js';
import { RoutingService } from '../services/routing.service.js';
import { LeadStatus } from '../types/lead.js';

export async function leadsRoutes(app: FastifyInstance) {
  /**
   * Listagem de leads com filtros
   */
  app.get<{
    Querystring: {
      status?: LeadStatus;
      bairro?: string;
      municipio?: string;
      uf?: string;
      search?: string;
      porte?: string;
      limit?: string;
      offset?: string;
    };
  }>('/api/leads', async (req) => {
    const query = req.query;
    const { leads, total } = LeadService.listLeads({
      status: query.status,
      bairro: query.bairro,
      municipio: query.municipio,
      uf: query.uf,
      search: query.search,
      porte: query.porte,
      limit: query.limit ? parseInt(query.limit, 10) : 100,
      offset: query.offset ? parseInt(query.offset, 10) : 0,
    });

    return {
      success: true,
      total,
      leads,
    };
  });

  /**
   * Visão Kanban: Agrupa leads por status e traz contadores
   */
  app.get('/api/leads/kanban', async () => {
    const metrics = LeadService.getKanbanMetrics();
    const { leads } = LeadService.listLeads({ limit: 500 });

    const kanbanColumns: Record<LeadStatus, any[]> = {
      NOVO_LEAD: [],
      PRIMEIRO_CONTATO: [],
      EM_NEGOCIACAO: [],
      CLIENTE_FECHADO: [],
      DESCARTADO: [],
    };

    for (const lead of leads) {
      if (kanbanColumns[lead.status]) {
        kanbanColumns[lead.status].push(lead);
      } else {
        kanbanColumns['NOVO_LEAD'].push(lead);
      }
    }

    return {
      success: true,
      metrics,
      columns: kanbanColumns,
    };
  });

  /**
   * Atualização de status Kanban, notas e dados de contato
   */
  app.put<{
    Params: { id: string };
    Body: {
      status?: LeadStatus;
      anotacoes?: string;
      tags?: string;
      telefone_comercial?: string;
      site_url?: string;
    };
  }>('/api/leads/:id', async (req, reply) => {
    const { id } = req.params;
    const updated = LeadService.updateLead(id, req.body);

    if (!updated) {
      return reply.status(404).send({ success: false, error: 'Lead não encontrado ou nenhum campo alterado.' });
    }

    const lead = LeadService.getLeadById(id);
    return {
      success: true,
      message: 'Lead atualizado com sucesso!',
      lead,
    };
  });

  /**
   * Limpeza de todos os leads cadastrados
   */
  app.delete('/api/leads/clear', async () => {
    const totalRemoved = LeadService.clearAllLeads();
    return {
      success: true,
      message: `${totalRemoved} leads removidos com sucesso! A tela de busca foi limpa.`,
      total_removidos: totalRemoved,
    };
  });

  /**
   * Exclusão de lead individual
   */
  app.delete<{ Params: { id: string } }>('/api/leads/:id', async (req, reply) => {
    const { id } = req.params;
    const deleted = LeadService.deleteLead(id);

    if (!deleted) {
      return reply.status(404).send({ success: false, error: 'Lead não encontrado.' });
    }

    return {
      success: true,
      message: 'Lead removido com sucesso!',
    };
  });

  /**
   * Exportação para arquivo CSV
   */
  app.get('/api/leads/export', async (req, reply) => {
    const csvData = LeadService.exportToCsv();

    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', 'attachment; filename="leads_radar_comercial.csv"');
    return reply.send('\uFEFF' + csvData); // BOM para acentuação correta no Excel
  });

  /**
   * Roteirização no Google Maps e Agrupamento por Bairro
   */
  app.post<{
    Body: {
      lead_ids?: string[];
      bairro?: string;
    };
  }>('/api/leads/route', async (req) => {
    const { lead_ids, bairro } = req.body || {};
    let selectedLeads: any[] = [];

    if (lead_ids && lead_ids.length > 0) {
      const placeholders = lead_ids.map(() => '?').join(',');
      const rows = LeadService.listLeads({ limit: 1000 }).leads.filter((l) => lead_ids.includes(l.id));
      selectedLeads = rows;
    } else {
      const { leads } = LeadService.listLeads({ bairro, limit: 20 });
      selectedLeads = leads;
    }

    const routeData = RoutingService.generateGoogleMapsRouteUrl(selectedLeads);
    const groupedByNeighborhood = RoutingService.groupByNeighborhood(selectedLeads);

    return {
      success: true,
      google_maps_url: routeData.url,
      total_pontos: routeData.waypointsCount,
      agrupamento_bairros: groupedByNeighborhood,
      leads: selectedLeads,
    };
  });
}
