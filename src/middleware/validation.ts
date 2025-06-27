import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';
import downloaderService from '../services/downloader';

export const validateDownloadRequest = (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  const { url, chatId, fromId } = req.body;

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

  // Валидация chatId (должен быть числом или начинаться с -)
  if (!/^-?\d+$/.test(chatId)) {
    return res.status(400).json({
      success: false,
      message: 'Неверный формат chatId',
      error: 'INVALID_CHAT_ID',
    });
  }

  // Валидация fromId (опционально, но если есть - должен быть числом)
  if (fromId && !/^-?\d+$/.test(fromId)) {
    return res.status(400).json({
      success: false,
      message: 'Неверный формат fromId',
      error: 'INVALID_FROM_ID',
    });
  }

  next();
};
