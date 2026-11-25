import axios from 'axios';
import { LeadProvider } from './lead-provider.interface.js';
import { NormalizedLead, SearchFilter } from '../types/lead.js';
import { db } from '../database/db.js';
import { createHash, randomUUID } from 'crypto';

export class GooglePlacesAdapter implements LeadProvider {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GOOGLE_PLACES_API_KEY || '';
  }

  getProviderName(): string {
    return 'PRODUCTION (Google Places API)';
  }

  public setApiKey(key: string): void {
    this.apiKey = key.trim();
  }

  private getCache(hashKey: string): any | null {
    try {
      const row = db.prepare('SELECT dados_json FROM cache_enriquecimento WHERE hash_chave = ?').get(hashKey) as { dados_json: string } | undefined;
      return row ? JSON.parse(row.dados_json) : null;
    } catch {
      return null;
    }
  }

  private setCache(hashKey: string, data: any): void {
    try {
      db.prepare(`
        INSERT INTO cache_enriquecimento (hash_chave, tipo_provedor, dados_json, criado_em)
        VALUES (?, 'GOOGLE_PLACES', ?, datetime('now', 'localtime'))
        ON CONFLICT(hash_chave) DO UPDATE SET
          dados_json = excluded.dados_json,
          criado_em = datetime('now', 'localtime')
      `).run(hashKey, JSON.stringify(data));
    } catch (e) {
      console.error('Erro ao gravar cache Google Places:', e);
    }
  }

  /**
   * Busca empresas na Google Places API (com suporte nativo à Nova Places API v1 e Fallback Legacy)
   */
  async searchCompanies(filter: SearchFilter): Promise<NormalizedLead[]> {
    if (!this.apiKey) {
      throw new Error(
        'GOOGLE_PLACES_API_KEY não configurada. Cole sua chave no arquivo .env ou no modal de Configurações.'
      );
    }

    const cleanSector = filter.bairro && filter.bairro !== 'TODOS'
      ? filter.bairro.replace(/\s*\([^)]*\)/g, '').trim()
      : '';
    const sector = cleanSector;
    const cleanCity = filter.cidade.replace(/\s*\([^)]*\)/g, '').trim();
    const activity = filter.termo_atividade || filter.atividade || filter.cnae || 'comércio';
    const query = `${activity} ${cleanSector} ${cleanCity} ${filter.uf}`.replace(/\s+/g, ' ').trim();

    const hash = createHash('md5').update(`gplaces_v1:${query}:${filter.limite || 15}`).digest('hex');
    const cached = this.getCache(hash);
    if (cached) return cached;

    // 1. Tentativa com a Nova Google Places API (Places API New - recomendada e ativada pelo usuário)
    try {
      console.log(`[GooglePlacesAdapter] Consultando Places API (New) para: "${query}"`);
      const newApiUrl = 'https://places.googleapis.com/v1/places:searchText';
      const response = await axios.post(
        newApiUrl,
        {
          textQuery: query,
          languageCode: 'pt-BR',
          maxResultCount: filter.limite && filter.limite <= 20 ? filter.limite : 15,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': this.apiKey,
            'X-Goog-FieldMask':
              'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri',
          },
          timeout: 12000,
        }
      );

      const places = response.data?.places || [];
      const leads: NormalizedLead[] = [];

      for (const place of places) {
        const name = place.displayName?.text || 'Comércio Local';
        const phone = place.nationalPhoneNumber || place.internationalPhoneNumber;
        let whatsappNum: string | undefined = undefined;

        if (phone) {
          const digits = phone.replace(/\D/g, '');
          if (digits.length >= 10) {
            whatsappNum = digits.startsWith('55') ? digits : `55${digits}`;
          }
        }

        // Tenta extrair número e logradouro do endereço formatado
        const addressParts = (place.formattedAddress || '').split(',');
        const street = addressParts[0] || 'Avenida Comercial';
        const numPart = addressParts[1] ? addressParts[1].trim().split(' ')[0] : 'S/N';

        const lead: NormalizedLead = {
          id: randomUUID(),
          cnpj: `GPLACES-${place.id.substring(0, 10)}`,
          razao_social: name,
          nome_fantasia: name,
          cnae_principal: filter.cnae || '4711-3/01',
          cnae_descricao: filter.termo_atividade || 'Comércio Físico Local',
          situacao_cadastral: 'ATIVA',
          porte: 'ME',
          logradouro: street,
          numero: numPart,
          bairro: sector || 'Setor Comercial',
          municipio: filter.cidade,
          uf: filter.uf.toUpperCase(),
          cep: '74000-000',
          telefone_comercial: phone,
          telefone_whatsapp: whatsappNum,
          whatsapp_url: whatsappNum ? `https://wa.me/${whatsappNum}` : undefined,
          site_url: place.websiteUri,
          google_place_id: place.id,
          rating: place.rating || 0,
          total_reviews: place.userRatingCount || 0,
          latitude: place.location?.latitude,
          longitude: place.location?.longitude,
          status: 'NOVO_LEAD',
          anotacoes: `Localizado em tempo real no Google Maps (${place.formattedAddress || ''}).`,
          tags: 'Google Maps Real, Loja Física Verificada',
          origem_fonte: 'GOOGLE_PLACES',
          criado_em: new Date().toISOString(),
        };

        leads.push(lead);
      }

      if (leads.length > 0) {
        this.setCache(hash, leads);
        return leads;
      }
    } catch (newApiErr: any) {
      console.warn('[GooglePlacesAdapter] Places API (New) retorno:', newApiErr?.response?.data || newApiErr.message);
    }

    // 2. Fallback para Google Places Text Search Legacy
    try {
      console.log(`[GooglePlacesAdapter] Tentando Fallback Legacy para: "${query}"`);
      const legacyUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${this.apiKey}&language=pt-BR`;
      const legacyRes = await axios.get(legacyUrl, { timeout: 10000 });

      if (legacyRes.data.status === 'OK') {
        const results = legacyRes.data.results || [];
        const leads: NormalizedLead[] = [];

        for (const place of results.slice(0, 15)) {
          const lead: NormalizedLead = {
            id: randomUUID(),
            cnpj: `GPLACES-${place.place_id.substring(0, 10)}`,
            razao_social: place.name,
            nome_fantasia: place.name,
            cnae_principal: filter.cnae || '4711-3/01',
            cnae_descricao: 'Comércio Local (Google Maps)',
            situacao_cadastral: 'ATIVA',
            porte: 'ME',
            logradouro: place.formatted_address || '',
            numero: 'S/N',
            bairro: sector || 'Setor Comercial',
            municipio: filter.cidade,
            uf: filter.uf.toUpperCase(),
            cep: '74000-000',
            google_place_id: place.place_id,
            rating: place.rating || 0,
            total_reviews: place.user_ratings_total || 0,
            latitude: place.geometry?.location?.lat,
            longitude: place.geometry?.location?.lng,
            status: 'NOVO_LEAD',
            origem_fonte: 'GOOGLE_PLACES',
            criado_em: new Date().toISOString(),
          };
          leads.push(lead);
        }

        if (leads.length > 0) {
          this.setCache(hash, leads);
          return leads;
        }
      }
    } catch (legacyErr: any) {
      console.error('[GooglePlacesAdapter] Erro no fallback legacy:', legacyErr.message);
    }

    return [];
  }

  async enrichLead(lead: NormalizedLead): Promise<NormalizedLead> {
    if (lead.telefone_comercial && lead.site_url) {
      return lead;
    }

    if (!this.apiKey || !lead.google_place_id) {
      return lead;
    }

    try {
      const detailsUrl = `https://places.googleapis.com/v1/places/${lead.google_place_id}`;
      const res = await axios.get(detailsUrl, {
        headers: {
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'nationalPhoneNumber,internationalPhoneNumber,websiteUri,rating,userRatingCount',
        },
        timeout: 8000,
      });

      const data = res.data;
      const phone = data.nationalPhoneNumber || data.internationalPhoneNumber;
      let whatsapp: string | undefined = undefined;

      if (phone) {
        const clean = phone.replace(/\D/g, '');
        if (clean.length >= 10) {
          whatsapp = clean.startsWith('55') ? clean : `55${clean}`;
        }
      }

      return {
        ...lead,
        telefone_comercial: phone || lead.telefone_comercial,
        telefone_whatsapp: whatsapp || lead.telefone_whatsapp,
        whatsapp_url: whatsapp ? `https://wa.me/${whatsapp}` : lead.whatsapp_url,
        site_url: data.websiteUri || lead.site_url,
        rating: data.rating || lead.rating,
        total_reviews: data.userRatingCount || lead.total_reviews,
        atualizado_em: new Date().toISOString(),
      };
    } catch {
      return lead;
    }
  }
}
