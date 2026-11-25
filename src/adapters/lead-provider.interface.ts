import { NormalizedLead, SearchFilter } from '../types/lead.js';

export interface LeadProvider {
  /**
   * Nome de identificação do provedor de dados
   */
  getProviderName(): string;

  /**
   * Busca empresas ativas com base nos filtros cadastrais informados
   */
  searchCompanies(filter: SearchFilter): Promise<NormalizedLead[]>;

  /**
   * Enriquece os dados de um lead com contatos comerciais, presença web e reputação
   */
  enrichLead(lead: NormalizedLead): Promise<NormalizedLead>;
}
