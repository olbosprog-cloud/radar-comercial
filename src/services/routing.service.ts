import { NormalizedLead } from '../types/lead.js';
import { getConfigValue } from '../database/db.js';

export class RoutingService {
  /**
   * Formata e limpa o número de telefone brasileiro para o padrão internacional do WhatsApp:
   * Ex: "(11) 98765-4321" -> "5511987654321"
   */
  public static cleanWhatsAppNumber(rawPhone: string): string | null {
    if (!rawPhone) return null;
    const digits = rawPhone.replace(/\D/g, '');

    if (digits.length === 10 || digits.length === 11) {
      return `55${digits}`;
    }
    if (digits.length === 12 || digits.length === 13) {
      if (digits.startsWith('55')) return digits;
    }
    return digits.length >= 10 ? digits : null;
  }

  /**
   * Gera o link do WhatsApp preenchendo automaticamente variáveis no template da mensagem
   */
  public static generateWhatsAppUrl(lead: NormalizedLead, customTemplate?: string): string {
    const rawPhone = lead.telefone_whatsapp || lead.telefone_comercial || '';
    const cleanPhone = this.cleanWhatsAppNumber(rawPhone);

    if (!cleanPhone) {
      return '';
    }

    const template = customTemplate ||
      getConfigValue('DEFAULT_WHATSAPP_TEMPLATE') ||
      'Olá, {nome_fantasia}! Tudo bem? Sou representante comercial e atendo a região de {cidade} ({bairro}).';

    const message = template
      .replace(/{nome_fantasia}/gi, lead.nome_fantasia || lead.razao_social)
      .replace(/{razao_social}/gi, lead.razao_social)
      .replace(/{cidade}/gi, lead.municipio)
      .replace(/{bairro}/gi, lead.bairro || 'Centro')
      .replace(/{cnae}/gi, lead.cnae_descricao || lead.cnae_principal);

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  }

  /**
   * Gera um link de rota no Google Maps com múltiplos pontos para visitas presenciais na rua
   * Formato: https://www.google.com/maps/dir/?api=1&origin=...&destination=...&waypoints=...
   */
  public static generateGoogleMapsRouteUrl(leads: NormalizedLead[]): { url: string; waypointsCount: number } {
    // Filtra apenas leads que possuem coordenadas válidas
    const validLeads = leads.filter((l) => typeof l.latitude === 'number' && typeof l.longitude === 'number');

    if (validLeads.length === 0) {
      return { url: '', waypointsCount: 0 };
    }

    if (validLeads.length === 1) {
      const single = validLeads[0];
      return {
        url: `https://www.google.com/maps/search/?api=1&query=${single.latitude},${single.longitude}`,
        waypointsCount: 1,
      };
    }

    const origin = `${validLeads[0].latitude},${validLeads[0].longitude}`;
    const destination = `${validLeads[validLeads.length - 1].latitude},${validLeads[validLeads.length - 1].longitude}`;

    // Google Maps suporta até 8-9 waypoints na URL direta sem custo
    const intermediateLeads = validLeads.slice(1, validLeads.length - 1).slice(0, 8);
    const waypoints = intermediateLeads
      .map((l) => `${l.latitude},${l.longitude}`)
      .join('|');

    const waypointsParam = waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : '';
    const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}${waypointsParam}&travelmode=driving`;

    return {
      url,
      waypointsCount: validLeads.length,
    };
  }

  /**
   * Agrupa leads por bairro para planejamento e roteirização territorial de visitas
   */
  public static groupByNeighborhood(leads: NormalizedLead[]): Record<string, NormalizedLead[]> {
    return leads.reduce((acc, lead) => {
      const bairro = lead.bairro || 'Sem Bairro Definido';
      if (!acc[bairro]) {
        acc[bairro] = [];
      }
      acc[bairro].push(lead);
      return acc;
    }, {} as Record<string, NormalizedLead[]>);
  }
}
