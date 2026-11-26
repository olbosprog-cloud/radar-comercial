export type DataMode = 'MOCK' | 'FREE' | 'PRODUCTION';

export type LeadStatus =
  | 'NOVO_LEAD'
  | 'PRIMEIRO_CONTATO'
  | 'EM_NEGOCIACAO'
  | 'CLIENTE_FECHADO'
  | 'DESCARTADO';

export type CompanySize = 'MEI' | 'ME' | 'EPP' | 'DEMAIS';

export interface NormalizedLead {
  id: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  cnae_principal: string;
  cnae_descricao?: string;
  situacao_cadastral: 'ATIVA' | 'INAPTA' | 'SUSPENSA' | 'BAIXADA' | 'NULA';
  data_abertura?: string; // Formato YYYY-MM-DD
  porte: CompanySize;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  
  // Enriquecimento de Contato e Presença Local
  telefone_comercial?: string; // Ex: "(11) 98765-4321" ou fixo
  telefone_whatsapp?: string;  // Formato internacional limpo: 5511987654321
  whatsapp_url?: string;       // Link direto wa.me/55...
  email?: string;
  site_url?: string;
  instagram_url?: string;
  
  // Avaliações e Métricas do Local
  google_place_id?: string;
  rating?: number;             // 1.0 a 5.0
  total_reviews?: number;      // Número de reviews
  latitude?: number;
  longitude?: number;
  distancia_metros?: number;
  distancia_formatada?: string;
  
  // Mini-CRM
  status: LeadStatus;
  anotacoes?: string;
  tags?: string;               // Separadas por vírgula
  origem_fonte: 'MOCK' | 'BRASIL_API' | 'CSV_IMPORT' | 'GOOGLE_PLACES' | 'OPENSTREETMAP';
  
  criado_em?: string;
  atualizado_em?: string;
}

export interface SearchFilter {
  uf: string;
  cidade: string;
  bairro?: string;
  cnae?: string;
  segmento?: string;
  atividade?: string;
  termo_atividade?: string;
  porte?: CompanySize | 'TODOS';
  data_abertura_inicio?: string;
  data_abertura_fim?: string;
  limite?: number;
  latitude?: number;
  longitude?: number;
  raio_km?: number;
}

export interface SearchHistoryRecord {
  id: string;
  termo_busca: string;
  filtros_json: string;
  total_encontrados: number;
  modo_utilizado: DataMode;
  data_busca: string;
}

export interface SystemConfig {
  data_mode: DataMode;
  google_places_api_key?: string;
  whatsapp_template_padrao: string;
  brasilapi_cache_dias: number;
  osm_delay_ms: number;
}
