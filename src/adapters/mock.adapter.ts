import { fakerPT_BR as faker } from '@faker-js/faker';
import { LeadProvider } from './lead-provider.interface.js';
import { NormalizedLead, SearchFilter, CompanySize } from '../types/lead.js';
import { BRAZILIAN_CITIES, GOIANIA_SETORES, APARECIDA_SETORES } from '../data/locations.js';
import { randomUUID } from 'crypto';

// Mapeamento de DDDs comuns por Estado (UF)
const UF_DDD_MAP: Record<string, string[]> = {
  GO: ['62', '64'],
  DF: ['61'],
  SP: ['11', '19', '16', '12', '13', '14', '15', '17', '18'],
  RJ: ['21', '22', '24'],
  MG: ['31', '32', '33', '34', '35', '37', '38'],
  ES: ['27', '28'],
  PR: ['41', '42', '43', '44', '45', '46'],
  SC: ['48', '47', '49'],
  RS: ['51', '53', '54', '55'],
  BA: ['71', '73', '74', '75', '77'],
  PE: ['81', '87'],
  CE: ['85', '88'],
  PA: ['91', '93', '94'],
  AM: ['92', '97'],
};

// Coordenadas centrais de referência por cidade
const CITY_COORDINATES: Record<string, { lat: number; lng: number; ddd: string }> = {
  'goiânia': { lat: -16.6869, lng: -49.2648, ddd: '62' },
  'goiania': { lat: -16.6869, lng: -49.2648, ddd: '62' },
  'aparecida de goiânia': { lat: -16.8228, lng: -49.2482, ddd: '62' },
  'aparecida de goiania': { lat: -16.8228, lng: -49.2482, ddd: '62' },
  'anápolis': { lat: -16.3267, lng: -48.9534, ddd: '62' },
  'anapolis': { lat: -16.3267, lng: -48.9534, ddd: '62' },
  'rio verde': { lat: -17.7928, lng: -50.9192, ddd: '64' },
  'senador canedo': { lat: -16.7083, lng: -49.0944, ddd: '62' },
  'trindade': { lat: -16.6508, lng: -49.4889, ddd: '62' },
  'brasília': { lat: -15.7975, lng: -47.8919, ddd: '61' },
  'brasilia': { lat: -15.7975, lng: -47.8919, ddd: '61' },
  'são paulo': { lat: -23.5505, lng: -46.6333, ddd: '11' },
  'sao paulo': { lat: -23.5505, lng: -46.6333, ddd: '11' },
  'campinas': { lat: -22.9056, lng: -47.0608, ddd: '19' },
};

export class MockAdapter implements LeadProvider {
  getProviderName(): string {
    return 'MOCK (Gerador Realista pt_BR)';
  }

  /**
   * Gera um CNPJ válido com dígitos verificadores matematicamente corretos (Módulo 11)
   */
  private generateValidCnpj(): string {
    const randomDigits = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 9));
    const n = randomDigits(8);
    const order = [0, 0, 0, 1]; // Matriz padrão 0001
    const base = [...n, ...order];

    const calcDigit = (slice: number[], weights: number[]) => {
      const sum = slice.reduce((acc, digit, idx) => acc + digit * weights[idx], 0);
      const rest = sum % 11;
      return rest < 2 ? 0 : 11 - rest;
    };

    const d1 = calcDigit(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const d2 = calcDigit([...base, d1], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

    const digits = [...base, d1, d2];
    return `${digits.slice(0, 2).join('')}.${digits.slice(2, 5).join('')}.${digits.slice(5, 8).join('')}/${digits.slice(8, 12).join('')}-${digits.slice(12, 14).join('')}`;
  }

  /**
   * Simula delay de rede (500ms a 1500ms)
   */
  private async simulateNetworkDelay(): Promise<void> {
    const delay = Math.floor(Math.random() * 800) + 400;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  async searchCompanies(filter: SearchFilter): Promise<NormalizedLead[]> {
    await this.simulateNetworkDelay();

    const uf = (filter.uf || 'GO').toUpperCase();
    const rawCity = (filter.cidade || 'Goiânia').trim();
    const cityKey = rawCity.toLowerCase();

    // Determina coordenadas e DDD com altíssima fidelidade
    const cityConfig = CITY_COORDINATES[cityKey] || {
      lat: uf === 'GO' ? -16.6869 : -23.5505,
      lng: uf === 'GO' ? -49.2648 : -46.6333,
      ddd: uf === 'GO' ? '62' : '11',
    };

    // Determina lista de setores para amostragem
    let setoresDisponiveis: string[] = [];
    if (cityKey.includes('aparecida')) {
      setoresDisponiveis = APARECIDA_SETORES;
    } else if (cityKey.includes('goiânia') || cityKey.includes('goiania')) {
      setoresDisponiveis = GOIANIA_SETORES;
    } else {
      const matchedCity = BRAZILIAN_CITIES.find((c) => c.nome.toLowerCase() === cityKey);
      setoresDisponiveis = matchedCity?.setores || ['Centro', 'Bairro Comercial', 'Setor Sul', 'Setor Norte'];
    }

    // Prefixo e Sufixo baseados na Atividade Comercial escolhida pelo usuário
    const activityName = filter.termo_atividade || filter.atividade || 'Comércio Geral';
    const cleanActivity = activityName.replace(/Lojas de|Comércio de|Venda de/gi, '').trim();

    const prefixes = [
      `${cleanActivity} & Cia`,
      `Central ${cleanActivity}`,
      `Comercial ${cleanActivity}`,
      `Depósito ${cleanActivity}`,
      `Mega ${cleanActivity}`,
      `Ponto do ${cleanActivity}`,
      `Distribuidora ${cleanActivity}`,
      `União ${cleanActivity}`,
    ];

    const sufixes = [
      'Ltda',
      'Comércio Varejista',
      '& Filhos Ltda',
      'Distribuição e Varejo',
      'Comércio e Serviços',
    ];

    const count = filter.limite && filter.limite <= 25 ? filter.limite : Math.floor(Math.random() * 11) + 10;
    const leads: NormalizedLead[] = [];
    const portes: CompanySize[] = ['MEI', 'ME', 'EPP', 'DEMAIS'];

    for (let i = 0; i < count; i++) {
      const familyName = faker.person.lastName();
      const prefix = prefixes[i % prefixes.length];
      const sufix = sufixes[i % sufixes.length];

      const nomeFantasia = `${prefix} ${familyName}`;
      const razaoSocial = `${nomeFantasia} ${sufix}`;

      // Bairro / Setor: usa o selecionado ou sorteia entre os setores da cidade
      const bairro = (filter.bairro && filter.bairro !== 'TODOS')
        ? filter.bairro
        : setoresDisponiveis[Math.floor(Math.random() * setoresDisponiveis.length)];

      // Variação de coordenadas realistas próximas ao polo da cidade
      const latOffset = (Math.random() - 0.5) * 0.04;
      const lngOffset = (Math.random() - 0.5) * 0.04;
      const latitude = Number((cityConfig.lat + latOffset).toFixed(6));
      const longitude = Number((cityConfig.lng + lngOffset).toFixed(6));

      // Telefone celular com DDD 62 ou regional
      const phoneDigits = `9${Math.floor(10000000 + Math.random() * 90000000)}`;
      const telefoneComercial = `(${cityConfig.ddd}) ${phoneDigits.substring(0, 5)}-${phoneDigits.substring(5)}`;
      const telefoneWhatsapp = `55${cityConfig.ddd}${phoneDigits}`;
      const whatsappUrl = `https://wa.me/${telefoneWhatsapp}`;

      // Avaliações
      const rating = Number((Math.random() * 1.3 + 3.7).toFixed(1));
      const totalReviews = Math.floor(Math.random() * 180) + 15;

      const porte: CompanySize = (filter.porte && filter.porte !== 'TODOS')
        ? filter.porte
        : portes[Math.floor(Math.random() * portes.length)];

      const lead: NormalizedLead = {
        id: randomUUID(),
        cnpj: this.generateValidCnpj(),
        razao_social: razaoSocial,
        nome_fantasia: nomeFantasia,
        cnae_principal: filter.cnae || '4744-0/01',
        cnae_descricao: filter.termo_atividade || 'Comércio Varejista',
        situacao_cadastral: 'ATIVA',
        data_abertura: faker.date.past({ years: 5 }).toISOString().split('T')[0],
        porte,
        logradouro: `Avenida ${faker.location.street()}`,
        numero: String(Math.floor(Math.random() * 2500) + 10),
        complemento: Math.random() > 0.5 ? `Quadra ${Math.floor(Math.random() * 40) + 1}, Lote ${Math.floor(Math.random() * 20) + 1}` : undefined,
        bairro,
        municipio: rawCity,
        uf,
        cep: `74${Math.floor(100 + Math.random() * 899)}-${Math.floor(100 + Math.random() * 899)}`,
        telefone_comercial: telefoneComercial,
        telefone_whatsapp: telefoneWhatsapp,
        whatsapp_url: whatsappUrl,
        email: `contato@${nomeFantasia.toLowerCase().replace(/[^a-z0-9]/g, '')}.com.br`,
        site_url: `https://www.${nomeFantasia.toLowerCase().replace(/[^a-z0-9]/g, '')}.com.br`,
        instagram_url: `https://instagram.com/${nomeFantasia.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        google_place_id: `mock_place_${randomUUID().substring(0, 8)}`,
        rating,
        total_reviews: totalReviews,
        latitude,
        longitude,
        status: 'NOVO_LEAD',
        anotacoes: `Lead capturado em ${rawCity} (${bairro}) - Segmento: ${cleanActivity}.`,
        tags: `${cleanActivity}, ${rawCity}`,
        origem_fonte: 'MOCK',
        criado_em: new Date().toISOString(),
      };

      leads.push(lead);
    }

    return leads;
  }

  async enrichLead(lead: NormalizedLead): Promise<NormalizedLead> {
    await this.simulateNetworkDelay();
    return {
      ...lead,
      rating: lead.rating || Number((Math.random() * 1.2 + 3.8).toFixed(1)),
      total_reviews: lead.total_reviews || Math.floor(Math.random() * 150) + 20,
      atualizado_em: new Date().toISOString(),
    };
  }
}
