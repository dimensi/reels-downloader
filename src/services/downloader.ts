import { DownloadRequest, DownloadResponse, ReelInfo } from '../types';
import {
  getReelInfo,
  downloadReel,
  sanitizeFilename,
  checkFileSize,
  removeFile,
} from '../utils/ytdlp';
import telegramService from './telegram';
import config from '../config';

class DownloaderService {
  /**
   * Основная функция для скачивания и отправки видео
   */
  async processReelDownload(request: DownloadRequest): Promise<DownloadResponse> {
    const { url, chatId, fromId } = request;

    try {
      // Уведомляем админа о начале обработки
      if (fromId) {
        await telegramService.notifyStatus(fromId, 'Начата обработка запроса', `URL: ${url}`);
      }

      // Проверяем доступность чата
      const chatAccessible = await telegramService.checkChatAccess(chatId);
      if (!chatAccessible) {
        if (fromId) {
          await telegramService.notifyError(
            fromId,
            'Чат недоступен или бот не имеет доступа к нему',
            `Chat ID: ${chatId}`
          );
        }
        return {
          success: false,
          message: 'Чат недоступен или бот не имеет доступа к нему',
          error: 'CHAT_NOT_ACCESSIBLE',
        };
      }

      // Получаем информацию о видео
      console.log(`Получение информации о видео: ${url}`);
      const reelInfo: ReelInfo = await getReelInfo(url);

      // Создаем безопасное имя файла
      const safeTitle = sanitizeFilename(reelInfo.title || reelInfo.id || 'video');
      const filename = `${safeTitle}.%(ext)s`;

      // Скачиваем видео
      console.log(`Скачивание видео: ${safeTitle}`);

      const videoPath = await downloadReel(url, filename, config.downloadsPath);

      // Проверяем размер файла
      const isFileSizeOk = await checkFileSize(videoPath, config.maxFileSizeMB);
      if (!isFileSizeOk) {
        await removeFile(videoPath);
        if (fromId) {
          await telegramService.notifyError(
            fromId,
            `Файл слишком большой. Максимальный размер: ${config.maxFileSizeMB}MB`,
            `File: ${safeTitle}`
          );
        }
        return {
          success: false,
          message: `Файл слишком большой. Максимальный размер: ${config.maxFileSizeMB}MB`,
          error: 'FILE_TOO_LARGE',
        };
      }

      // Формируем подпись для видео
      const caption = await this.createVideoCaption(reelInfo, fromId);

      // Отправляем видео в Telegram
      console.log(`Отправка видео в чат: ${chatId}`);
      await telegramService.sendVideo(chatId, videoPath, caption);

      // Удаляем файл после отправки
      await removeFile(videoPath);

      // Уведомляем админа об успехе
      if (fromId) {
        await telegramService.notifyStatus(fromId, 'Видео успешно отправлено', `В чат: ${chatId}`);
      }

      return {
        success: true,
        message: 'Видео успешно скачано и отправлено',
        videoPath,
      };
    } catch (error) {
      console.error('Ошибка обработки запроса:', error);
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';

      // Уведомляем админа об ошибке
      if (fromId) {
        await telegramService.notifyError(fromId, errorMessage, `URL: ${url}, Chat: ${chatId}`);
      }

      // Уведомляем пользователя об ошибке только если есть fromId
      if (fromId) {
        try {
          await telegramService.sendMessage(chatId, `❌ Ошибка обработки видео: ${errorMessage}`);
        } catch (telegramError) {
          console.error('Ошибка отправки сообщения об ошибке:', telegramError);
          await telegramService.notifyError(
            fromId,
            'Не удалось отправить сообщение об ошибке в чат',
            `Telegram Error: ${telegramError}`
          );
        }
      }

      return {
        success: false,
        message: 'Ошибка при обработке видео',
        error: errorMessage,
      };
    }
  }

  /**
   * Создать подпись для видео
   */
  private async createVideoCaption(reelInfo: ReelInfo, fromId?: string): Promise<string> {
    // Если fromId не указан - возвращаем пустую подпись
    if (!fromId) {
      return '';
    }

    const parts: string[] = [];

    // Получаем информацию о пользователе Telegram
    const userInfo = await telegramService.getUserInfo(fromId);
    let userDisplay = fromId; // fallback к ID если не удалось получить данные

    if (userInfo) {
      if (userInfo.username) {
        userDisplay = `@${userInfo.username}`;
      } else if (userInfo.firstName) {
        userDisplay = userInfo.firstName;
      }
    }

    // Добавляем информацию от кого запрос
    parts.push(`👤 ${userDisplay}`);

    if (reelInfo.title) {
      parts.push(`📝 ${reelInfo.title}`);
    }

    if (reelInfo.description && reelInfo.description.length < 100) {
      parts.push(`📄 ${reelInfo.description}`);
    }

    return parts.join('\n');
  }

  /**
   * Валидация URL
   */
  isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      // Проверяем, что это поддерживаемые платформы
      const supportedDomains = [
        'instagram.com',
        'tiktok.com',
        'youtube.com',
        'youtu.be',
        'twitter.com',
        'x.com',
        'facebook.com',
        'vk.com',
      ];

      return supportedDomains.some((domain) => urlObj.hostname.includes(domain));
    } catch {
      return false;
    }
  }
}

export default new DownloaderService();
