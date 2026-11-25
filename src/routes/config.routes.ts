import { FastifyInstance } from 'fastify';
import { getConfigValue, setConfigValue } from '../database/db.js';
import { ProviderFactory } from '../services/provider.factory.js';
import { DataMode } from '../types/lead.js';

export async function configRoutes(app: FastifyInstance) {
  /**
   * Retorna as configurações do sistema
   */
  app.get('/api/config', async () => {
    const activeMode = ProviderFactory.getActiveMode();
    const googleApiKey = getConfigValue('GOOGLE_PLACES_API_KEY');
    const whatsappTemplate = getConfigValue('DEFAULT_WHATSAPP_TEMPLATE');

    return {
      success: true,
      data: {
        data_mode: activeMode,
        has_google_key: Boolean(googleApiKey && googleApiKey.trim().length > 10),
        google_places_api_key_masked: googleApiKey
          ? `${googleApiKey.substring(0, 4)}...${googleApiKey.substring(googleApiKey.length - 4)}`
          : '',
        default_whatsapp_template: whatsappTemplate,
        available_modes: [
          {
            id: 'MOCK',
            label: 'Modo MOCK (Simulação Realista pt_BR)',
            description: 'Gera leads fictícios de comércios físicos com CNPJs matematicamente válidos. Não consome internet nem cotas.',
            badge: 'Offline / Grátis',
          },
          {
            id: 'FREE',
            label: 'Modo FREE (BrasilAPI + OpenStreetMap)',
            description: 'Consulta dados públicos da Receita/BrasilAPI e comércios no OpenStreetMap (Nominatim/Overpass). 100% gratuito.',
            badge: 'Online / Sem Custo',
          },
          {
            id: 'PRODUCTION',
            label: 'Modo PRODUCTION (Google Places API)',
            description: 'Usa a API oficial do Google Places para máxima precisão de telefone, reviews reais e dados cadastrais.',
            badge: 'Escala Comercial',
          },
        ],
      },
    };
  });

  /**
   * Atualiza as configurações em tempo de execução
   */
  app.post<{
    Body: {
      data_mode?: DataMode;
      google_places_api_key?: string;
      default_whatsapp_template?: string;
    };
  }>('/api/config', async (req, reply) => {
    const { data_mode, google_places_api_key, default_whatsapp_template } = req.body || {};

    if (data_mode) {
      if (!['MOCK', 'FREE', 'PRODUCTION'].includes(data_mode)) {
        return reply.status(400).send({
          success: false,
          error: 'Modo inválido. Valores aceitos: MOCK, FREE, PRODUCTION.',
        });
      }
      setConfigValue('DATA_MODE', data_mode);
      console.log(`[Config] DATA_MODE alterado para: ${data_mode}`);
    }

    if (google_places_api_key !== undefined) {
      setConfigValue('GOOGLE_PLACES_API_KEY', google_places_api_key.trim());
    }

    if (default_whatsapp_template !== undefined) {
      setConfigValue('DEFAULT_WHATSAPP_TEMPLATE', default_whatsapp_template);
    }

    return {
      success: true,
      message: 'Configurações atualizadas com sucesso!',
      active_mode: ProviderFactory.getActiveMode(),
    };
  });
}
