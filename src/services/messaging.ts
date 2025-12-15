import config from '../config';
import { MessagingChannel } from '../types';
import maxService from './max';
import telegramService from './telegram';

export interface MessagingService {
  sendVideo(chatId: string, videoPath: string, caption?: string): Promise<void>;
  sendMessage(chatId: string, text: string): Promise<void>;
  checkChatAccess(chatId: string): Promise<boolean>;
  notifyError(fromId: string | undefined, error: string, context?: string): Promise<void>;
  notifyStatus(fromId: string | undefined, status: string, details?: string): Promise<void>;
  channel: MessagingChannel;
}

const services: Record<MessagingChannel, MessagingService> = {
  telegram: telegramService,
  max: maxService,
};

export const resolveMessagingService = (channel?: MessagingChannel): MessagingService => {
  const normalizedChannel = (channel || config.defaultChannel || 'telegram') as MessagingChannel;
  if (normalizedChannel === 'max' && !config.maxBotToken) {
    return telegramService;
  }

  if (normalizedChannel === 'telegram' && !config.telegramBotToken && config.maxBotToken) {
    return maxService;
  }

  return services[normalizedChannel] || telegramService;
};
