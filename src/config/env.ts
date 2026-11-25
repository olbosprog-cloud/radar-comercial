import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const ENV = {
  DATA_MODE: (process.env.DATA_MODE || 'PRODUCTION') as 'MOCK' | 'FREE' | 'PRODUCTION',
  PORT: parseInt(process.env.PORT || '3333', 10),
  HOST: process.env.HOST || '0.0.0.0',
  NODE_ENV: process.env.NODE_ENV || 'development',
  GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY || 'AIzaSyAB_gFzBjAZlXuVJeViG1J8Sw03O4f9Dcg',
  SQLITE_DB_PATH: process.env.SQLITE_DB_PATH || path.resolve(process.cwd(), 'data', 'radar_comercial.db'),
  DEFAULT_WHATSAPP_TEMPLATE: process.env.DEFAULT_WHATSAPP_TEMPLATE ||
    'Olá, {nome_fantasia}! Tudo bem? Sou representante comercial e atendo lojistas na região de {cidade} ({bairro}). Gostaria de apresentar nossas soluções exclusivas. Poderíamos conversar 2 minutos?',
};
