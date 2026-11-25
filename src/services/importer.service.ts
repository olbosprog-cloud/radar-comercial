import { parse } from 'csv-parse/sync';
import { NormalizedLead, CompanySize } from '../types/lead.js';
import { randomUUID } from 'crypto';
import { RoutingService } from './routing.service.js';

export class ImporterService {
  /**
   * Converte conteúdo de arquivo CSV (de portais como Casa dos Dados ou Dados Abertos da Receita) em NormalizedLead[]
   */
  public static parseCsv(csvContent: string): NormalizedLead[] {
    // Detecta delimitador (, ou ;)
    const firstLine = csvContent.split('\n')[0] || '';
    const delimiter = firstLine.includes(';') ? ';' : ',';

    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter,
    }) as Record<string, string>[];

    const leads: NormalizedLead[] = [];

    for (const row of records) {
      // Normaliza nomes de colunas independentemente de maiúsculas/acentos
      const getVal = (...keys: string[]): string => {
        for (const k of keys) {
          for (const rowKey of Object.keys(row)) {
            if (rowKey.trim().toLowerCase() === k.toLowerCase()) {
              return String(row[rowKey] || '').trim();
            }
          }
        }
        return '';
      };

      const cnpj = getVal('cnpj', 'numero_de_inscricao', 'nr_cnpj');
      if (!cnpj) continue;

      const razaoSocial = getVal('razao_social', 'nome_empresarial', 'razao');
      const nomeFantasia = getVal('nome_fantasia', 'fantasia') || razaoSocial;
      const cnae = getVal('cnae', 'cnae_principal', 'cnae_fiscal');
      const cnaeDesc = getVal('cnae_descricao', 'descricao_cnae', 'cnae_fiscal_descricao');
      const situacao = getVal('situacao', 'situacao_cadastral') || 'ATIVA';

      // Filtra apenas empresas ativas
      if (situacao.toUpperCase() !== 'ATIVA') continue;

      const logradouro = getVal('logradouro', 'rua', 'endereco');
      const numero = getVal('numero', 'num') || 'S/N';
      const complemento = getVal('complemento');
      const bairro = getVal('bairro', 'distrito') || 'Centro';
      const municipio = getVal('municipio', 'cidade');
      const uf = (getVal('uf', 'estado') || 'SP').toUpperCase();
      const cep = getVal('cep');

      const rawPhone = getVal('telefone', 'telefone_1', 'celular', 'ddd_telefone_1');
      const cleanPhone = RoutingService.cleanWhatsAppNumber(rawPhone);
      const email = getVal('email', 'correio_eletronico');

      const porteRaw = getVal('porte').toUpperCase();
      let porte: CompanySize = 'ME';
      if (porteRaw.includes('MEI')) porte = 'MEI';
      else if (porteRaw.includes('EPP')) porte = 'EPP';
      else if (porteRaw.includes('DEMAIS')) porte = 'DEMAIS';

      const lead: NormalizedLead = {
        id: randomUUID(),
        cnpj,
        razao_social: razaoSocial || nomeFantasia,
        nome_fantasia: nomeFantasia || razaoSocial,
        cnae_principal: cnae || '4711-3/01',
        cnae_descricao: cnaeDesc || undefined,
        situacao_cadastral: 'ATIVA',
        data_abertura: getVal('data_abertura', 'data_inicio_atividade') || undefined,
        porte,
        logradouro,
        numero,
        complemento: complemento || undefined,
        bairro,
        municipio,
        uf,
        cep,
        telefone_comercial: rawPhone || undefined,
        telefone_whatsapp: cleanPhone || undefined,
        whatsapp_url: cleanPhone ? `https://wa.me/${cleanPhone}` : undefined,
        email: email || undefined,
        status: 'NOVO_LEAD',
        origem_fonte: 'CSV_IMPORT',
        anotacoes: 'Importado de arquivo externo (Dados Abertos / Casa dos Dados).',
        criado_em: new Date().toISOString(),
      };

      leads.push(lead);
    }

    return leads;
  }

  /**
   * Converte conteúdo JSON em NormalizedLead[]
   */
  public static parseJson(jsonContent: string): NormalizedLead[] {
    const rawData = JSON.parse(jsonContent);
    const items = Array.isArray(rawData) ? rawData : [rawData];
    const leads: NormalizedLead[] = [];

    for (const item of items) {
      if (!item.cnpj) continue;
      const cleanPhone = RoutingService.cleanWhatsAppNumber(item.telefone_whatsapp || item.telefone_comercial || item.telefone);

      leads.push({
        id: item.id || randomUUID(),
        cnpj: item.cnpj,
        razao_social: item.razao_social || item.nome_fantasia || 'Sem Razão Social',
        nome_fantasia: item.nome_fantasia || item.razao_social || 'Sem Nome Fantasia',
        cnae_principal: item.cnae_principal || item.cnae || '4711-3/01',
        cnae_descricao: item.cnae_descricao,
        situacao_cadastral: 'ATIVA',
        data_abertura: item.data_abertura,
        porte: item.porte || 'ME',
        logradouro: item.logradouro || '',
        numero: item.numero || 'S/N',
        complemento: item.complemento,
        bairro: item.bairro || 'Centro',
        municipio: item.municipio || item.cidade || '',
        uf: (item.uf || 'SP').toUpperCase(),
        cep: item.cep || '',
        telefone_comercial: item.telefone_comercial || item.telefone,
        telefone_whatsapp: cleanPhone || undefined,
        whatsapp_url: cleanPhone ? `https://wa.me/${cleanPhone}` : undefined,
        email: item.email,
        site_url: item.site_url,
        instagram_url: item.instagram_url,
        rating: item.rating ? Number(item.rating) : 0,
        total_reviews: item.total_reviews ? Number(item.total_reviews) : 0,
        latitude: item.latitude ? Number(item.latitude) : undefined,
        longitude: item.longitude ? Number(item.longitude) : undefined,
        status: item.status || 'NOVO_LEAD',
        origem_fonte: 'CSV_IMPORT',
        anotacoes: item.anotacoes || 'Importado via JSON',
        criado_em: new Date().toISOString(),
      });
    }

    return leads;
  }
}
