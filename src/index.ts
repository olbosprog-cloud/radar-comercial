import fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import fs from 'fs';
import { ENV } from './config/env.js';
import { initDatabase } from './database/db.js';
import { configRoutes } from './routes/config.routes.js';
import { searchRoutes } from './routes/search.routes.js';
import { leadsRoutes } from './routes/leads.routes.js';
import { importRoutes } from './routes/import.routes.js';
import { testRoutes } from './routes/test.routes.js';
import { locationsRoutes } from './routes/locations.routes.js';
import { segmentsRoutes } from './routes/segments.routes.js';
import { ProviderFactory } from './services/provider.factory.js';

async function bootstrap() {
  const app = fastify({
    logger: true,
  });

  // 1. CORS
  await app.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // 2. Inicialização do Banco de Dados SQLite Local
  initDatabase();
  console.log('📦 Banco de Dados SQLite inicializado com sucesso!');
  console.log(`⚡ Modo de Dados Ativo: [${ProviderFactory.getActiveMode()}]`);

  // 3. Registro de Rotas da API
  await app.register(configRoutes);
  await app.register(searchRoutes);
  await app.register(leadsRoutes);
  await app.register(importRoutes);
  await app.register(testRoutes);
  await app.register(locationsRoutes);
  await app.register(segmentsRoutes);

  // 4. Servir Frontend estático (pasta public) se disponível
  const publicDir = path.resolve(process.cwd(), 'public');
  if (fs.existsSync(publicDir)) {
    await app.register(fastifyStatic, {
      root: publicDir,
      prefix: '/',
    });
  }

  // Rota raiz informativa
  app.get('/api', async () => {
    return {
      sistema: 'Radar Comercial B2B - API',
      status: 'ONLINE',
      versao: '1.0.0',
      modo_ativo: ProviderFactory.getActiveMode(),
      endpoints: {
        busca: 'POST /api/search',
        leads_crm: 'GET /api/leads',
        kanban: 'GET /api/leads/kanban',
        rotas_mapa: 'POST /api/leads/route',
        export_csv: 'GET /api/leads/export',
        importar_csv: 'POST /api/import',
        configuracoes: 'GET /api/config | POST /api/config',
        teste_provedores: 'GET /api/test/providers',
      },
    };
  });

  try {
    await app.listen({ port: ENV.PORT, host: ENV.HOST });
    console.log(`\n======================================================`);
    console.log(`🚀 RADAR COMERCIAL B2B RODANDO EM: http://localhost:${ENV.PORT}`);
    console.log(`📡 Modo de Dados Atual: ${ProviderFactory.getActiveMode()}`);
    console.log(`🧪 Teste de Provedores: http://localhost:${ENV.PORT}/api/test/providers`);
    console.log(`======================================================\n`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

bootstrap();
