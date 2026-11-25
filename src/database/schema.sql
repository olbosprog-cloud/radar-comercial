-- ==============================================================================
-- SCHEMA DO BANCO DE DADOS LOCAL - RADAR COMERCIAL B2B (SQLite)
-- ==============================================================================

-- 1. Tabela Principal de Leads Cadastrados e Enriquecidos
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  cnpj TEXT UNIQUE NOT NULL,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT NOT NULL,
  cnae_principal TEXT NOT NULL,
  cnae_descricao TEXT,
  situacao_cadastral TEXT DEFAULT 'ATIVA',
  data_abertura TEXT,
  porte TEXT DEFAULT 'ME',
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  municipio TEXT NOT NULL,
  uf TEXT NOT NULL,
  cep TEXT,
  
  -- Contatos e Enriquecimento Local
  telefone_comercial TEXT,
  telefone_whatsapp TEXT,
  whatsapp_url TEXT,
  email TEXT,
  site_url TEXT,
  instagram_url TEXT,
  google_place_id TEXT,
  rating REAL DEFAULT 0.0,
  total_reviews INTEGER DEFAULT 0,
  latitude REAL,
  longitude REAL,
  
  -- Gestão Mini-CRM e Funil Kanban
  status TEXT DEFAULT 'NOVO_LEAD',
  anotacoes TEXT,
  tags TEXT,
  origem_fonte TEXT DEFAULT 'MOCK',
  
  criado_em TEXT DEFAULT (datetime('now', 'localtime')),
  atualizado_em TEXT DEFAULT (datetime('now', 'localtime'))
);

-- Índices de Alta Performance para buscas, filtros e agrupamentos
CREATE INDEX IF NOT EXISTS idx_leads_cnpj ON leads(cnpj);
CREATE INDEX IF NOT EXISTS idx_leads_municipio_uf ON leads(municipio, uf);
CREATE INDEX IF NOT EXISTS idx_leads_bairro ON leads(bairro);
CREATE INDEX IF NOT EXISTS idx_leads_cnae ON leads(cnae_principal);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_porte ON leads(porte);

-- 2. Tabela de Histórico de Buscas Realizadas
CREATE TABLE IF NOT EXISTS buscas_realizadas (
  id TEXT PRIMARY KEY,
  termo_busca TEXT,
  filtros_json TEXT NOT NULL,
  total_encontrados INTEGER DEFAULT 0,
  modo_utilizado TEXT NOT NULL,
  data_busca TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 3. Tabela de Configurações Dinâmicas do Sistema (Modo e Chaves)
CREATE TABLE IF NOT EXISTS configuracoes_api (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL,
  descricao TEXT,
  atualizado_em TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 4. Tabela de Cache de Enriquecimento (Evita requisições repetidas e poupa cotas)
CREATE TABLE IF NOT EXISTS cache_enriquecimento (
  hash_chave TEXT PRIMARY KEY,
  tipo_provedor TEXT NOT NULL,
  dados_json TEXT NOT NULL,
  criado_em TEXT DEFAULT (datetime('now', 'localtime')),
  expira_em TEXT
);

CREATE INDEX IF NOT EXISTS idx_cache_hash ON cache_enriquecimento(hash_chave);
