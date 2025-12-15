import { Request, Response, NextFunction } from 'express';
import { ApiResponse, MessagingChannel } from '../types';
import config from '../config';
import downloaderService from '../services/downloader';

export const validateDownloadRequest = (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  const { url, chatId, fromId } = req.body;
  const channel = ((req.query.channel as string) || req.body.channel || config.defaultChannel) as
    | MessagingChannel
    | undefined;

  if (channel && !['telegram', 'max'].includes(channel)) {
    return res.status(400).json({
      success: false,
      message: 'Неверный канал доставки. Доступны: telegram, max',
      error: 'INVALID_CHANNEL',
    });
  }

  // Проверка наличия обязательных полей
  if (!url || !chatId) {
    return res.status(400).json({
      success: false,
      message: 'URL и chatId обязательны',
      error: 'MISSING_REQUIRED_FIELDS',
    });
  }

  // Валидация типов
  if (typeof url !== 'string' || typeof chatId !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'URL и chatId должны быть строками',
      error: 'INVALID_FIELD_TYPES',
    });
  }

  // Валидация URL
  if (!downloaderService.isValidUrl(url)) {
    return res.status(400).json({
      success: false,
      message: 'Неподдерживаемый URL или неверный формат',
      error: 'INVALID_URL',
    });
  }

  // Валидация chatId
  const normalizedChannel = (channel || config.defaultChannel) as MessagingChannel;
  if (normalizedChannel === 'telegram' && !/^-?\d+$/.test(chatId)) {
    return res.status(400).json({
      success: false,
      message: 'Неверный формат chatId для Telegram',
      error: 'INVALID_CHAT_ID',
    });
  }

  // Валидация fromId (опционально)
  if (fromId && normalizedChannel === 'telegram' && !/^-?\d+$/.test(fromId)) {
    return res.status(400).json({
      success: false,
      message: 'Неверный формат fromId',
      error: 'INVALID_FROM_ID',
    });
  }

  req.body.channel = normalizedChannel;

  next();
};
