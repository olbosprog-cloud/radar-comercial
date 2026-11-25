import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { ENV } from '../config/env.js';
import { SCHEMA_SQL } from './schema.js';

const dbPath = path.resolve(ENV.SQLITE_DB_PATH);
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(dbPath);

// Ativa foreign keys e modo WAL para excelente concorrência e performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(SCHEMA_SQL);

  // Inicializa configurações padrão se ainda não existirem
  const insertConfig = db.prepare(`
    INSERT OR IGNORE INTO configuracoes_api (chave, valor, descricao)
    VALUES (?, ?, ?)
  `);

  insertConfig.run('DATA_MODE', ENV.DATA_MODE, 'Modo de dados ativo: MOCK, FREE ou PRODUCTION');
  insertConfig.run('GOOGLE_PLACES_API_KEY', ENV.GOOGLE_PLACES_API_KEY, 'Chave de API do Google Places');
  insertConfig.run('DEFAULT_WHATSAPP_TEMPLATE', ENV.DEFAULT_WHATSAPP_TEMPLATE, 'Template padrão para links de WhatsApp');
  insertConfig.run('BRASILAPI_CACHE_DIAS', '30', 'Dias de retenção de cache cadastral da BrasilAPI');
  insertConfig.run('OSM_DELAY_MS', '1000', 'Delay em ms entre requisições ao OpenStreetMap para cumprir a política da API');
}

export function getConfigValue(chave: string, fallbackDefault = ''): string {
  try {
    const row = db.prepare('SELECT valor FROM configuracoes_api WHERE chave = ?').get(chave) as { valor: string } | undefined;
    return row ? row.valor : fallbackDefault;
  } catch {
    return fallbackDefault;
  }
}

export function setConfigValue(chave: string, valor: string): void {
  db.prepare(`
    INSERT INTO configuracoes_api (chave, valor, atualizado_em)
    VALUES (?, ?, datetime('now', 'localtime'))
    ON CONFLICT(chave) DO UPDATE SET
      valor = excluded.valor,
      atualizado_em = datetime('now', 'localtime')
  `).run(chave, valor);
}
