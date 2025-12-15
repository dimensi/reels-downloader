import dotenv from 'dotenv';
import { Config, MessagingChannel } from '../types';

dotenv.config();

const envChannel = process.env.DEFAULT_CHANNEL as MessagingChannel;
const defaultChannel: MessagingChannel = envChannel === 'max' ? 'max' : 'telegram';

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
  useLegacyDownloader: process.env.USE_LEGACY_DOWNLOADER === 'true',
  defaultChannel,
  maxBotToken: process.env.MAX_BOT_TOKEN || '',
  maxApiBaseUrl: process.env.MAX_API_BASE_URL || '',
  maxUploadChunkSizeMB: Number(process.env.MAX_UPLOAD_CHUNK_SIZE_MB) || 5,
};

// Валидация обязательных переменных
if (!config.token) {
  throw new Error('TOKEN обязательная переменная окружения');
}

if (config.defaultChannel === 'telegram' && !config.telegramBotToken) {
  throw new Error('TELEGRAM_BOT_TOKEN обязательная переменная окружения');
}

if (config.defaultChannel === 'max' && !config.maxBotToken) {
  throw new Error('MAX_BOT_TOKEN обязательная переменная окружения для канала Max');
}

export default config;
