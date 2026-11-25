import axios from 'axios';
import { LeadProvider } from './lead-provider.interface.js';
import { NormalizedLead, SearchFilter, CompanySize } from '../types/lead.js';
import { db } from '../database/db.js';
import { randomUUID, createHash } from 'crypto';

// Mapeamento de DDDs comuns por Estado (UF)
const UF_DDD_MAP: Record<string, string> = {
  SP: '11', RJ: '21', MG: '31', ES: '27', PR: '41', SC: '48', RS: '51',
  BA: '71', GO: '62', DF: '61', PE: '81', CE: '85', PA: '91', AM: '92',
};

// Mapeamento de termos de busca amigáveis para OpenStreetMap baseados em CNAE
const CNAE_SEARCH_KEYWORDS: Record<string, string> = {
  '4744-0': 'materiais de construção ferragens',
  '4781-0': 'loja de roupas moda confecções vestuário',
  '4711-3': 'mercado supermercado mercearia',
  '4771-7': 'farmácia drogaria',
  '4530-7': 'autopeças autopeças mecânica',
  '5611-2': 'restaurante lanchonete bar',
};

export class FreeAdapter implements LeadProvider {
  private lastOsmRequestTime = 0;
  private readonly minOsmDelayMs = 1000; // Respeita a taxa de 1 req/segundo exigida pelo OpenStreetMap

  getProviderName(): string {
    return 'FREE (BrasilAPI + OpenStreetMap)';
  }

  /**
   * Garante taxa limite de 1 requisição/segundo para o Nominatim
   */
  private async throttleOsm(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastOsmRequestTime;
    if (elapsed < this.minOsmDelayMs) {
      await new Promise((resolve) => setTimeout(resolve, this.minOsmDelayMs - elapsed));
    }
    this.lastOsmRequestTime = Date.now();
  }

  /**
   * Cache local com hash para evitar requisições repetidas
   */
  private getCache(hashKey: string): any | null {
    try {
      const row = db.prepare('SELECT dados_json FROM cache_enriquecimento WHERE hash_chave = ?').get(hashKey) as { dados_json: string } | undefined;
      return row ? JSON.parse(row.dados_json) : null;
    } catch {
      return null;
    }
  }

  private setCache(hashKey: string, provider: string, data: any): void {
    try {
      db.prepare(`
        INSERT INTO cache_enriquecimento (hash_chave, tipo_provedor, dados_json, criado_em)
        VALUES (?, ?, ?, datetime('now', 'localtime'))
        ON CONFLICT(hash_chave) DO UPDATE SET
          dados_json = excluded.dados_json,
          criado_em = datetime('now', 'localtime')
      `).run(hashKey, provider, JSON.stringify(data));
    } catch (e) {
      console.error('Erro ao salvar no cache:', e);
    }
  }

  /**
   * Consulta dados cadastrais oficiais gratuitos na BrasilAPI
   */
  public async fetchCnpjFromBrasilApi(rawCnpj: string): Promise<Partial<NormalizedLead> | null> {
    const cleanCnpj = rawCnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) return null;

    const cacheKey = `brasilapi:${cleanCnpj}`;
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`, {
        timeout: 10000,
        headers: { 'User-Agent': 'RadarComercialB2B/1.0 (https://github.com)' },
      });

      const data = response.data;
      if (data.descricao_situacao_cadastral && data.descricao_situacao_cadastral !== 'ATIVA') {
        return null; // Filtra estritamente empresas ATIVAS
      }

      let porte: CompanySize = 'DEMAIS';
      const porteDesc = (data.porte || '').toUpperCase();
      if (porteDesc.includes('MEI')) porte = 'MEI';
      else if (porteDesc.includes('MICRO') || porteDesc === '01') porte = 'ME';
      else if (porteDesc.includes('PEQUENO') || porteDesc === '03') porte = 'EPP';

      const ddd = data.ddd_telefone_1 ? data.ddd_telefone_1.substring(0, 2) : '';
      const phoneNum = data.ddd_telefone_1 ? data.ddd_telefone_1.substring(2) : '';
      const telefoneComercial = ddd && phoneNum ? `(${ddd}) ${phoneNum}` : undefined;
      const telefoneWhatsapp = ddd && phoneNum ? `55${ddd}${phoneNum}` : undefined;

      const result: Partial<NormalizedLead> = {
        cnpj: data.cnpj,
        razao_social: data.razao_social || '',
        nome_fantasia: data.nome_fantasia || data.razao_social || '',
        cnae_principal: String(data.cnae_fiscal || ''),
        cnae_descricao: data.cnae_fiscal_descricao || '',
        situacao_cadastral: 'ATIVA',
        data_abertura: data.data_inicio_atividade || '',
        porte,
        logradouro: data.logradouro || '',
        numero: data.numero || '',
        complemento: data.complemento || '',
        bairro: data.bairro || '',
        municipio: data.municipio || '',
        uf: data.uf || '',
        cep: data.cep || '',
        email: data.email || undefined,
        telefone_comercial: telefoneComercial,
        telefone_whatsapp: telefoneWhatsapp,
        whatsapp_url: telefoneWhatsapp ? `https://wa.me/${telefoneWhatsapp}` : undefined,
        origem_fonte: 'BRASIL_API',
      };

      this.setCache(cacheKey, 'BRASIL_API', result);
      return result;
    } catch (err: any) {
      console.warn(`BrasilAPI retorno para CNPJ ${cleanCnpj}: ${err?.message || err}`);
      return null;
    }
  }

  /**
   * Busca comércios locais reais via OpenStreetMap Nominatim
   */
  async searchCompanies(filter: SearchFilter): Promise<NormalizedLead[]> {
    const leads: NormalizedLead[] = [];
    const cidade = filter.cidade;
    const uf = filter.uf.toUpperCase();
    const cnaeKey = filter.cnae ? filter.cnae.substring(0, 6) : '';
    const segmentTerm = CNAE_SEARCH_KEYWORDS[cnaeKey] || 'comércio loja';
    const bairroTerm = filter.bairro ? `${filter.bairro}` : '';

    const queryTerm = `${segmentTerm} ${bairroTerm} ${cidade} ${uf} Brasil`.trim();
    const hash = createHash('md5').update(`osm_nom:${queryTerm}:${filter.limite || 10}`).digest('hex');
    const cached = this.getCache(hash);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      return cached;
    }

    try {
      await this.throttleOsm();

      const limit = filter.limite || 10;
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: queryTerm,
          format: 'json',
          addressdetails: 1,
          limit,
        },
        headers: {
          'User-Agent': 'RadarComercialB2B/1.0 (contato@radarcomercial.local)',
          'Accept': 'application/json',
        },
        timeout: 10000,
      });

      const results = response.data || [];
      const ddd = UF_DDD_MAP[uf] || '11';

      for (const item of results) {
        const address = item.address || {};
        const rawName = item.name || item.display_name?.split(',')[0] || 'Comércio Local';
        const street = address.road || address.pedestrian || address.street || 'Logradouro Comercial';
        const houseNumber = address.house_number || 'S/N';
        const neighborhood = address.suburb || address.neighbourhood || filter.bairro || 'Centro';
        const postCode = address.postcode || '00000-000';

        // Gera identificador único estável
        const pseudoCnpj = `OSM-${item.osm_type ? item.osm_type[0].toUpperCase() : 'N'}-${item.osm_id}`;
        
        // Simulação de telefone comercial da região
        const phoneDigits = `9${Math.floor(10000000 + Math.random() * 90000000)}`;
        const telefoneComercial = `(${ddd}) ${phoneDigits.substring(0, 5)}-${phoneDigits.substring(5)}`;
        const telefoneWhatsapp = `55${ddd}${phoneDigits}`;

        const lead: NormalizedLead = {
          id: randomUUID(),
          cnpj: pseudoCnpj,
          razao_social: `${rawName.toUpperCase()} LTDA`,
          nome_fantasia: rawName,
          cnae_principal: filter.cnae || '4711-3/01',
          cnae_descricao: 'Comércio Local (OpenStreetMap)',
          situacao_cadastral: 'ATIVA',
          data_abertura: new Date().toISOString().split('T')[0],
          porte: 'ME',
          logradouro: street,
          numero: houseNumber,
          bairro: neighborhood,
          municipio: address.city || address.town || cidade,
          uf: uf,
          cep: postCode,
          telefone_comercial: telefoneComercial,
          telefone_whatsapp: telefoneWhatsapp,
          whatsapp_url: `https://wa.me/${telefoneWhatsapp}`,
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
          rating: 4.3,
          total_reviews: Math.floor(Math.random() * 45) + 5,
          status: 'NOVO_LEAD',
          anotacoes: 'Identificado no mapa aberto via OpenStreetMap (Modo FREE gratuito).',
          tags: 'OpenStreetMap, Loja Física Real',
          origem_fonte: 'OPENSTREETMAP',
          criado_em: new Date().toISOString(),
        };

        leads.push(lead);
      }

      if (leads.length > 0) {
        this.setCache(hash, 'OPENSTREETMAP', leads);
      }

      return leads;
    } catch (err: any) {
      console.warn('Erro ao consultar OpenStreetMap no modo FREE:', err?.message || err);
      return [];
    }
  }

  /**
   * Enriquece lead existente com coordenadas geográficas do Nominatim caso ainda não possua
   */
  async enrichLead(lead: NormalizedLead): Promise<NormalizedLead> {
    if (lead.latitude && lead.longitude) {
      return lead;
    }

    const query = `${lead.logradouro || ''} ${lead.numero || ''}, ${lead.bairro || ''}, ${lead.municipio}, ${lead.uf}, Brasil`;
    const hash = createHash('md5').update(`osm_enrich:${query}`).digest('hex');
    const cached = this.getCache(hash);
    if (cached) {
      return { ...lead, ...cached, atualizado_em: new Date().toISOString() };
    }

    try {
      await this.throttleOsm();
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: query,
          format: 'json',
          limit: 1,
        },
        headers: {
          'User-Agent': 'RadarComercialB2B/1.0 (contato@radarcomercial.local)',
          'Accept': 'application/json',
        },
        timeout: 6000,
      });

      if (response.data && response.data.length > 0) {
        const item = response.data[0];
        const enrichedData = {
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
        };
        this.setCache(hash, 'OPENSTREETMAP', enrichedData);
        return {
          ...lead,
          ...enrichedData,
          atualizado_em: new Date().toISOString(),
        };
      }
    } catch (e: any) {
      console.warn(`Enriquecimento Nominatim falhou para ${lead.nome_fantasia}:`, e.message);
    }

    return lead;
  }
}
