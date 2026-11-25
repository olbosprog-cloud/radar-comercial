# Radar Comercial B2B 🎯

Sistema desktop/web local de inteligência comercial e prospecção ativa de lojistas e comércios físicos para representantes comerciais e equipes de vendas externas.

---

## 🏗️ 1. Arquitetura do Projeto & Estrutura de Pastas

```
rastreador/
├── data/
│   └── radar_comercial.db          # Banco de dados SQLite persistente com WAL mode
├── public/                         # Interface Web Dark Mode (HTML5, Tailwind CSS, Lucide)
│   ├── index.html                  # Dashboard unificado (Filtros, Tabela, Kanban, Modais)
│   └── app.js                      # Reatividade do CRM, rotas no Maps e integrações
├── src/
│   ├── index.ts                    # Bootstrap do servidor Fastify + CORS + rotas
│   ├── config/
│   │   └── env.ts                  # Carregamento e tipagem das variáveis de ambiente (.env)
│   ├── database/
│   │   ├── db.ts                   # Instância Better-SQLite3, migrações e helpers chave-valor
│   │   └── schema.sql              # DDL das tabelas (leads, buscas, configs, cache)
│   ├── types/
│   │   └── lead.ts                 # Contratos e tipos (NormalizedLead, SearchFilter, DataMode)
│   ├── adapters/                   # Design Pattern Adapter / Strategy
│   │   ├── lead-provider.interface.ts # Interface padrão LeadProvider
│   │   ├── mock.adapter.ts         # Modo MOCK (Faker pt_BR, gerador de CNPJ válido, delays)
│   │   ├── free.adapter.ts         # Modo FREE (BrasilAPI + OpenStreetMap Nominatim)
│   │   └── google-places.adapter.ts# Modo PRODUCTION (Google Places Text Search & Details)
│   ├── services/
│   │   ├── provider.factory.ts     # Factory com chaveamento dinâmico em tempo de execução
│   │   ├── lead.service.ts         # Gestão de leads no CRM, métricas Kanban, exportação CSV
│   │   ├── search.service.ts       # Orquestrador de buscas, deduplicação e histórico
│   │   ├── routing.service.ts      # Links de WhatsApp e roteirização Google Maps multipontos
│   │   └── importer.service.ts     # Importador de CSV/JSON (Receita Federal / Casa dos Dados)
│   ├── routes/
│   │   ├── config.routes.ts        # GET/POST /api/config (chaveamento de modo e chaves)
│   │   ├── search.routes.ts        # POST /api/search & GET /api/search/history
│   │   ├── leads.routes.ts         # CRUD /api/leads, Kanban, anotações e rotas
│   │   ├── import.routes.ts        # POST /api/import (upload CSV/JSON)
│   │   └── test.routes.ts          # GET /api/test/providers (diagnóstico dos 3 adapters)
│   └── scripts/
│       └── test-providers.ts       # Script CLI de diagnóstico dos provedores
├── .env.example                    # Modelo de variáveis de ambiente
├── .env                            # Variáveis de ambiente ativas
├── package.json
└── tsconfig.json
```

---

## 🗄️ 2. Schema do Banco de Dados SQLite

O banco opera em modo **WAL (Write-Ahead Logging)** com índices otimizados para buscas territoriais e agrupamentos de funil.

### Tabelas Principais:

1. **`leads`**: Registro mestre dos estabelecimentos capturados e enriquecidos, com histórico de funil e anotações.
   - `cnpj` (TEXT UNIQUE)
   - `razao_social`, `nome_fantasia`
   - `cnae_principal`, `cnae_descricao`
   - `situacao_cadastral` (estritamente 'ATIVA')
   - `porte` (MEI, ME, EPP, DEMAIS)
   - `logradouro`, `numero`, `complemento`, `bairro`, `municipio`, `uf`, `cep`
   - `telefone_comercial`, `telefone_whatsapp` (formato 55DDDNÚMERO)
   - `whatsapp_url` (`https://wa.me/55...`)
   - `rating` (nota em estrelas), `total_reviews` (quantidade de avaliações)
   - `latitude`, `longitude` (coordenadas para mapa e roteirização)
   - `status` ('NOVO_LEAD' | 'PRIMEIRO_CONTATO' | 'EM_NEGOCIACAO' | 'CLIENTE_FECHADO' | 'DESCARTADO')
   - `anotacoes` (campo livre para observações comerciais)
   - `origem_fonte` ('MOCK' | 'BRASIL_API' | 'CSV_IMPORT' | 'GOOGLE_PLACES' | 'OPENSTREETMAP')

2. **`buscas_realizadas`**: Histórico auditável de pesquisas realizadas com filtros e total retornado.
3. **`configuracoes_api`**: Parâmetros do sistema persistidos (permite alternar `DATA_MODE` pela interface sem reiniciar o servidor).
4. **`cache_enriquecimento`**: Cache local baseado em hash para evitar requisições duplicadas e economizar cotas de API.

---

## 🔌 3. Padrão Adapter / Strategy de Provedores

Todos os provedores implementam a interface comum `LeadProvider`:

```typescript
export interface LeadProvider {
  getProviderName(): string;
  searchCompanies(filter: SearchFilter): Promise<NormalizedLead[]>;
  enrichLead(lead: NormalizedLead): Promise<NormalizedLead>;
}
```

### Modos Disponíveis:
- **`MOCK` (Offline / Desenvolvimento)**:
  - Gera lojistas fictícios realistas com `@faker-js/faker` pt_BR.
  - CNPJs matematicamente válidos calculados via Módulo 11.
  - Coordenadas geográficas reais próximas à cidade pesquisada.
  - Delay simulado de 500ms a 1500ms para teste de barras de progresso e UX.
- **`FREE` (Gratuito / Sem Custos de API)**:
  - Consulta CNPJ na **BrasilAPI**.
  - Enriquecimento geográfico e busca de lojas reais via **OpenStreetMap (Nominatim)** com controle de taxa (1 req/s).
  - Importador universal de CSV/JSON para listas da Receita Federal ou portais como Casa dos Dados.
- **`PRODUCTION` (Escala Comercial)**:
  - Google Places API (Text Search & Details) para telefones atualizados, links de site/Instagram, avaliações reais e coordenadas precisas.

---

## 🚀 4. Instalação e Execução Local

### Pré-requisitos:
- Node.js 18+ (testado no Node.js v24)
- NPM

### Passo a Passo:

1. **Clone ou acerte o diretório do projeto**:
   ```bash
   cd c:\Users\JSA\Desktop\rastreador
   ```

2. **Instale as dependências**:
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente**:
   Crie o arquivo `.env` (ou use o já criado):
   ```ini
   DATA_MODE=MOCK
   PORT=3333
   HOST=0.0.0.0
   GOOGLE_PLACES_API_KEY=
   SQLITE_DB_PATH=./data/radar_comercial.db
   ```

4. **Inicie o servidor**:
   ```bash
   npm run dev
   ```

5. **Acesse a aplicação no navegador**:
   👉 **`http://localhost:3333`**

6. **Executar Diagnóstico dos Provedores via Terminal**:
   ```bash
   npm run test:providers
   ```
