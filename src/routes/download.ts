import { Router, Request, Response } from 'express';
import { ApiResponse, DownloadRequest } from '../types';
import downloaderService from '../services/downloader';
import { validateDownloadRequest } from '../middleware/validation';
import { downloadRateLimit } from '../middleware/rateLimiter';
import { validateToken } from '../middleware/auth';

const router = Router();

/**
 * POST /api/download
 * Скачать видео и отправить в Telegram чат
 */
router.post(
  '/',
  validateToken,
  downloadRateLimit,
  validateDownloadRequest,
  async (req: Request, res: Response<ApiResponse>) => {
    try {
      const downloadRequest: DownloadRequest = req.body;

      // Сразу отвечаем клиенту, что запрос принят
      res.status(202).json({
        success: true,
        message: 'Запрос принят. Видео будет обработано и отправлено в указанный чат.',
      });

      // Обрабатываем запрос асинхронно
      downloaderService
        .processReelDownload(downloadRequest)
        .then((result) => {
          console.log('Обработка завершена:', result);
        })
        .catch((error) => {
          console.error('Ошибка при асинхронной обработке:', error);
        });
    } catch (error) {
      console.error('Ошибка в маршруте download:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при обработке запроса',
        error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
      });
    }
  }
);

export default router;
