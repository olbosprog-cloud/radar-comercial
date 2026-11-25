import { LeadProvider } from '../adapters/lead-provider.interface.js';
import { MockAdapter } from '../adapters/mock.adapter.js';
import { FreeAdapter } from '../adapters/free.adapter.js';
import { GooglePlacesAdapter } from '../adapters/google-places.adapter.js';
import { DataMode } from '../types/lead.js';
import { getConfigValue } from '../database/db.js';
import { ENV } from '../config/env.js';

export class ProviderFactory {
  private static mockInstance = new MockAdapter();
  private static freeInstance = new FreeAdapter();
  private static googlePlacesInstance = new GooglePlacesAdapter();

  /**
   * Obtém o modo de dados atualmente ativo (prioridade para a configuração no SQLite, fallback para .env)
   */
  public static getActiveMode(): DataMode {
    const dbMode = getConfigValue('DATA_MODE');
    if (dbMode === 'MOCK' || dbMode === 'FREE' || dbMode === 'PRODUCTION') {
      return dbMode as DataMode;
    }
    return ENV.DATA_MODE;
  }

  /**
   * Retorna a instância do LeadProvider conforme o modo ativo ou modo explicitamente solicitado
   */
  public static getProvider(overrideMode?: DataMode): LeadProvider {
    const mode = overrideMode || this.getActiveMode();

    switch (mode) {
      case 'PRODUCTION': {
        const apiKey = getConfigValue('GOOGLE_PLACES_API_KEY') || ENV.GOOGLE_PLACES_API_KEY;
        this.googlePlacesInstance.setApiKey(apiKey);
        return this.googlePlacesInstance;
      }
      case 'FREE':
        return this.freeInstance;
      case 'MOCK':
      default:
        return this.mockInstance;
    }
  }

  /**
   * Retorna os 3 adaptadores para testes ou diagnósticos
   */
  public static getAllProviders(): Record<DataMode, LeadProvider> {
    return {
      MOCK: this.mockInstance,
      FREE: this.freeInstance,
      PRODUCTION: this.googlePlacesInstance,
    };
  }
}
