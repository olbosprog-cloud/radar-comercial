import { FastifyInstance } from 'fastify';
import { ProviderFactory } from '../services/provider.factory.js';
import { SearchFilter } from '../types/lead.js';

export async function testRoutes(app: FastifyInstance) {
  /**
   * Rota de diagnóstico para testar e validar o retorno dos 3 adaptadores (MOCK, FREE, PRODUCTION)
   */
  app.get('/api/test/providers', async (req, reply) => {
    const testFilter: SearchFilter = {
      cidade: 'Campinas',
      uf: 'SP',
      cnae: '4744-0/01', // Materiais de Construção e Ferragens
      limite: 3,
    };

    const providers = ProviderFactory.getAllProviders();
    const results: Record<string, any> = {};

    // 1. Testa MOCK
    try {
      const start = Date.now();
      const mockLeads = await providers.MOCK.searchCompanies(testFilter);
      const enrichedSample = mockLeads.length > 0 ? await providers.MOCK.enrichLead(mockLeads[0]) : null;
      results.MOCK = {
        status: 'OK',
        provider_name: providers.MOCK.getProviderName(),
        tempo_ms: Date.now() - start,
        total_retornado: mockLeads.length,
        lead_exemplo: enrichedSample,
      };
    } catch (e: any) {
      results.MOCK = { status: 'ERROR', error: e.message };
    }

    // 2. Testa FREE (OpenStreetMap / BrasilAPI)
    try {
      const start = Date.now();
      const freeLeads = await providers.FREE.searchCompanies(testFilter);
      results.FREE = {
        status: 'OK',
        provider_name: providers.FREE.getProviderName(),
        tempo_ms: Date.now() - start,
        total_retornado: freeLeads.length,
        lead_exemplo: freeLeads[0] || 'Nenhum lead retornado na área',
      };
    } catch (e: any) {
      results.FREE = { status: 'ERROR', error: e.message };
    }

    // 3. Testa PRODUCTION (Google Places API)
    try {
      const start = Date.now();
      const prodLeads = await providers.PRODUCTION.searchCompanies(testFilter);
      results.PRODUCTION = {
        status: 'OK',
        provider_name: providers.PRODUCTION.getProviderName(),
        tempo_ms: Date.now() - start,
        total_retornado: prodLeads.length,
        lead_exemplo: prodLeads[0] || null,
      };
    } catch (e: any) {
      // Se não tiver chave, reporta prontidão arquitetural
      results.PRODUCTION = {
        status: 'READY_WAITING_KEY',
        provider_name: providers.PRODUCTION.getProviderName(),
        nota: 'Adaptador pronto para uso. Requer GOOGLE_PLACES_API_KEY no .env ou na tela de configurações.',
        mensagem: e.message,
      };
    }

    return {
      success: true,
      timestamp: new Date().toISOString(),
      active_mode: ProviderFactory.getActiveMode(),
      diagnostico_adaptadores: results,
    };
  });
}
