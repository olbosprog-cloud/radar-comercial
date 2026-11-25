import { db } from '../database/db.js';
import { NormalizedLead, LeadStatus } from '../types/lead.js';
import { RoutingService } from './routing.service.js';

export interface LeadFilterParams {
  status?: LeadStatus;
  bairro?: string;
  municipio?: string;
  uf?: string;
  search?: string;
  porte?: string;
  limit?: number;
  offset?: number;
}

export class LeadService {
  /**
   * Salva ou atualiza um lead no banco de dados.
   * Se o lead já existir, preserva status do CRM e anotações feitas pelo usuário.
   */
  public static saveLead(lead: NormalizedLead): void {
    const existing = db.prepare('SELECT id, status, anotacoes, tags FROM leads WHERE cnpj = ?').get(lead.cnpj) as
      | { id: string; status: LeadStatus; anotacoes?: string; tags?: string }
      | undefined;

    const finalStatus = existing ? existing.status : lead.status || 'NOVO_LEAD';
    const finalAnotacoes = existing?.anotacoes ? existing.anotacoes : lead.anotacoes;
    const finalTags = existing?.tags ? existing.tags : lead.tags;

    // Recalcula link do WhatsApp garantindo formato correto
    const whatsappUrl = RoutingService.generateWhatsAppUrl(lead);

    const stmt = db.prepare(`
      INSERT INTO leads (
        id, cnpj, razao_social, nome_fantasia, cnae_principal, cnae_descricao,
        situacao_cadastral, data_abertura, porte, logradouro, numero, complemento,
        bairro, municipio, uf, cep, telefone_comercial, telefone_whatsapp,
        whatsapp_url, email, site_url, instagram_url, google_place_id,
        rating, total_reviews, latitude, longitude, status, anotacoes, tags,
        origem_fonte, atualizado_em
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, datetime('now', 'localtime')
      )
      ON CONFLICT(cnpj) DO UPDATE SET
        razao_social = excluded.razao_social,
        nome_fantasia = excluded.nome_fantasia,
        cnae_principal = excluded.cnae_principal,
        cnae_descricao = coalesce(excluded.cnae_descricao, leads.cnae_descricao),
        situacao_cadastral = excluded.situacao_cadastral,
        porte = excluded.porte,
        logradouro = excluded.logradouro,
        numero = excluded.numero,
        complemento = excluded.complemento,
        bairro = excluded.bairro,
        municipio = excluded.municipio,
        uf = excluded.uf,
        cep = excluded.cep,
        telefone_comercial = coalesce(excluded.telefone_comercial, leads.telefone_comercial),
        telefone_whatsapp = coalesce(excluded.telefone_whatsapp, leads.telefone_whatsapp),
        whatsapp_url = coalesce(excluded.whatsapp_url, leads.whatsapp_url),
        email = coalesce(excluded.email, leads.email),
        site_url = coalesce(excluded.site_url, leads.site_url),
        instagram_url = coalesce(excluded.instagram_url, leads.instagram_url),
        google_place_id = coalesce(excluded.google_place_id, leads.google_place_id),
        rating = case when excluded.rating > 0 then excluded.rating else leads.rating end,
        total_reviews = case when excluded.total_reviews > 0 then excluded.total_reviews else leads.total_reviews end,
        latitude = coalesce(excluded.latitude, leads.latitude),
        longitude = coalesce(excluded.longitude, leads.longitude),
        atualizado_em = datetime('now', 'localtime')
    `);

    stmt.run(
      lead.id,
      lead.cnpj,
      lead.razao_social,
      lead.nome_fantasia,
      lead.cnae_principal,
      lead.cnae_descricao || null,
      lead.situacao_cadastral,
      lead.data_abertura || null,
      lead.porte,
      lead.logradouro || null,
      lead.numero || null,
      lead.complemento || null,
      lead.bairro || null,
      lead.municipio,
      lead.uf,
      lead.cep || null,
      lead.telefone_comercial || null,
      lead.telefone_whatsapp || null,
      whatsappUrl || null,
      lead.email || null,
      lead.site_url || null,
      lead.instagram_url || null,
      lead.google_place_id || null,
      lead.rating || 0,
      lead.total_reviews || 0,
      lead.latitude || null,
      lead.longitude || null,
      finalStatus,
      finalAnotacoes || null,
      finalTags || null,
      lead.origem_fonte
    );
  }

  /**
   * Salva múltiplos leads em lote (Batch / Transaction)
   */
  public static saveBatch(leads: NormalizedLead[]): number {
    const insertMany = db.transaction((items: NormalizedLead[]) => {
      let count = 0;
      for (const item of items) {
        this.saveLead(item);
        count++;
      }
      return count;
    });

    return insertMany(leads);
  }

  /**
   * Lista leads com filtros múltiplos
   */
  public static listLeads(params: LeadFilterParams = {}): { leads: NormalizedLead[]; total: number } {
    let whereClause = 'WHERE 1=1';
    const conditions: any[] = [];

    if (params.status) {
      whereClause += ' AND status = ?';
      conditions.push(params.status);
    }
    if (params.bairro) {
      whereClause += ' AND bairro LIKE ?';
      conditions.push(`%${params.bairro}%`);
    }
    if (params.municipio) {
      whereClause += ' AND municipio LIKE ?';
      conditions.push(`%${params.municipio}%`);
    }
    if (params.uf) {
      whereClause += ' AND uf = ?';
      conditions.push(params.uf.toUpperCase());
    }
    if (params.porte && params.porte !== 'TODOS') {
      whereClause += ' AND porte = ?';
      conditions.push(params.porte);
    }
    if (params.search) {
      whereClause += ' AND (razao_social LIKE ? OR nome_fantasia LIKE ? OR cnpj LIKE ? OR cnae_descricao LIKE ?)';
      const term = `%${params.search}%`;
      conditions.push(term, term, term, term);
    }

    const totalRow = db.prepare(`SELECT count(*) as count FROM leads ${whereClause}`).get(...conditions) as { count: number };
    const total = totalRow.count;

    const limit = params.limit || 100;
    const offset = params.offset || 0;

    const rows = db.prepare(`
      SELECT * FROM leads
      ${whereClause}
      ORDER BY atualizado_em DESC
      LIMIT ? OFFSET ?
    `).all(...conditions, limit, offset) as NormalizedLead[];

    return { leads: rows, total };
  }

  /**
   * Obtém estatísticas do Funil de Vendas (Kanban)
   */
  public static getKanbanMetrics(): Record<LeadStatus, number> {
    const rows = db.prepare(`
      SELECT status, count(*) as count
      FROM leads
      GROUP BY status
    `).all() as { status: LeadStatus; count: number }[];

    const result: Record<LeadStatus, number> = {
      NOVO_LEAD: 0,
      PRIMEIRO_CONTATO: 0,
      EM_NEGOCIACAO: 0,
      CLIENTE_FECHADO: 0,
      DESCARTADO: 0,
    };

    for (const r of rows) {
      if (result[r.status] !== undefined) {
        result[r.status] = r.count;
      }
    }

    return result;
  }

  /**
   * Atualiza status do lead no Kanban e anotações rápidas
   */
  public static updateLead(
    id: string,
    updates: {
      status?: LeadStatus;
      anotacoes?: string;
      tags?: string;
      telefone_comercial?: string;
      site_url?: string;
    }
  ): boolean {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.status) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.anotacoes !== undefined) {
      fields.push('anotacoes = ?');
      values.push(updates.anotacoes);
    }
    if (updates.tags !== undefined) {
      fields.push('tags = ?');
      values.push(updates.tags);
    }
    if (updates.telefone_comercial !== undefined) {
      fields.push('telefone_comercial = ?');
      values.push(updates.telefone_comercial);
      const clean = RoutingService.cleanWhatsAppNumber(updates.telefone_comercial);
      if (clean) {
        fields.push('telefone_whatsapp = ?', 'whatsapp_url = ?');
        values.push(clean, `https://wa.me/${clean}`);
      }
    }
    if (updates.site_url !== undefined) {
      fields.push('site_url = ?');
      values.push(updates.site_url);
    }

    if (fields.length === 0) return false;

    fields.push("atualizado_em = datetime('now', 'localtime')");
    values.push(id);

    const result = db.prepare(`UPDATE leads SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return result.changes > 0;
  }

  public static getLeadById(id: string): NormalizedLead | null {
    const row = db.prepare('SELECT * FROM leads WHERE id = ?').get(id) as NormalizedLead | undefined;
    return row || null;
  }

  public static deleteLead(id: string): boolean {
    const result = db.prepare('DELETE FROM leads WHERE id = ?').run(id);
    return result.changes > 0;
  }

  /**
   * Limpa todos os leads do banco de dados (Zera a busca / CRM)
   */
  public static clearAllLeads(): number {
    const result = db.prepare('DELETE FROM leads').run();
    return result.changes;
  }

  /**
   * Exporta leads filtrados para CSV
   */
  public static exportToCsv(params: LeadFilterParams = {}): string {
    const { leads } = this.listLeads({ ...params, limit: 10000 });
    const headers = [
      'CNPJ',
      'Nome Fantasia',
      'Razão Social',
      'CNAE',
      'Porte',
      'Status CRM',
      'WhatsApp',
      'Telefone',
      'Cidade',
      'UF',
      'Bairro',
      'Logradouro',
      'Número',
      'Nota',
      'Reviews',
      'Anotações',
    ];

    const escapeCsv = (val: any) => `"${String(val || '').replace(/"/g, '""')}"`;

    const rows = leads.map((l) => [
      escapeCsv(l.cnpj),
      escapeCsv(l.nome_fantasia),
      escapeCsv(l.razao_social),
      escapeCsv(l.cnae_principal),
      escapeCsv(l.porte),
      escapeCsv(l.status),
      escapeCsv(l.telefone_whatsapp),
      escapeCsv(l.telefone_comercial),
      escapeCsv(l.municipio),
      escapeCsv(l.uf),
      escapeCsv(l.bairro),
      escapeCsv(l.logradouro),
      escapeCsv(l.numero),
      escapeCsv(l.rating),
      escapeCsv(l.total_reviews),
      escapeCsv(l.anotacoes),
    ]);

    return [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
  }
}
