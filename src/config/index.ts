import dotenv from 'dotenv';
import { Config } from '../types';

dotenv.config();

const config: Config = {
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  token: process.env.TOKEN || '',
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  downloadsPath: process.env.DOWNLOADS_PATH || './downloads',
  maxFileSizeMB: Number(process.env.MAX_FILE_SIZE_MB) || 50,
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 минут
  rateLimitMaxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 10,
  proxyURL: process.env.PROXY_URL || '',
};

// Валидация обязательных переменных
if (!config.telegramBotToken) {
  throw new Error('TELEGRAM_BOT_TOKEN обязательная переменная окружения');
}

if (!config.token) {
  throw new Error('TOKEN обязательная переменная окружения');
}

export default config;
