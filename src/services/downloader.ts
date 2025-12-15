import { DownloadRequest, DownloadResponse, MessagingChannel, ReelInfo } from '../types';
import {
  getReelInfo,
  downloadReel,
  sanitizeFilename,
  checkFileSize,
  removeFile,
} from '../utils/ytdlp';
import config from '../config';
import { MessagingService, resolveMessagingService } from './messaging';

class NotifyService {
  private chatId: string;
  private fromId: string | undefined;
  private startTime: number;
  private currentState: string;
  private url: string;
  private readonly messagingService: MessagingService;
  constructor(
    chatId: string,
    fromId: string | undefined,
    url: string,
    messagingService: MessagingService
  ) {
    this.chatId = chatId;
    this.fromId = fromId;
    this.startTime = Date.now();
    this.currentState = 'START';
    this.url = url;
    this.messagingService = messagingService;
  }

  changeState(state: 'START' | 'IN_PROGRESS' | 'FINISHED') {
    this.currentState = state;
    return this.checkUpdate();
  }

  async checkUpdate() {
    const elapsedTime = Date.now() - this.startTime;

    if (elapsedTime < 30e3) {
      return;
    }

    switch (this.currentState) {
      case 'START':
        await this.messagingService.notifyStatus(
          this.fromId,
          'Начата обработка запроса',
          `URL: ${this.url}`
        );
        break;
      case 'IN_PROGRESS':
        await this.messagingService.notifyStatus(
          this.fromId,
          'В процессе обработки запроса',
          `URL: ${this.url}`
        );
        break;
      case 'FINISHED':
        await this.messagingService.notifyStatus(
          this.fromId,
          'Видео успешно отправлено',
          `В чат: ${this.chatId}`
        );
        break;
    }
  }
}

class DownloaderService {
  /**
   * Основная функция для скачивания и отправки видео
   */
  async processReelDownload(request: DownloadRequest): Promise<DownloadResponse> {
    const { url, chatId, fromId, channel } = request;

    const messagingService = resolveMessagingService(channel as MessagingChannel);

    const notifyService = new NotifyService(chatId, fromId, url, messagingService);

    try {
      await notifyService.changeState('START');

      // Проверяем доступность чата
      const chatAccessible = await messagingService.checkChatAccess(chatId);
      if (!chatAccessible) {
        await messagingService.notifyError(
          fromId,
          'Чат недоступен или бот не имеет доступа к нему',
          `Chat ID: ${chatId}`
        );
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

      await notifyService.changeState('IN_PROGRESS');

      // Проверяем размер файла
      const isFileSizeOk = await checkFileSize(videoPath, config.maxFileSizeMB);
      if (!isFileSizeOk) {
        await removeFile(videoPath);
        await messagingService.notifyError(
          fromId,
          `Файл слишком большой. Максимальный размер: ${config.maxFileSizeMB}MB`,
          `File: ${safeTitle}`
        );
        return {
          success: false,
          message: `Файл слишком большой. Максимальный размер: ${config.maxFileSizeMB}MB`,
          error: 'FILE_TOO_LARGE',
        };
      }

      // Формируем подпись для видео
      const caption = await this.createVideoCaption(reelInfo, fromId);

      // Отправляем видео в выбранный канал
      console.log(`Отправка видео в чат: ${chatId}`);
      await messagingService.sendVideo(chatId, videoPath, caption);

      // Удаляем файл после отправки
      await removeFile(videoPath);

      await notifyService.changeState('FINISHED');

      return {
        success: true,
        message: 'Видео успешно скачано и отправлено',
        videoPath,
      };
    } catch (error) {
      console.error('Ошибка обработки запроса:', error);
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';

      // Уведомляем админа об ошибке
      await messagingService.notifyError(fromId, errorMessage, `URL: ${url}, Chat: ${chatId}`);

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
  private async createVideoCaption(_: ReelInfo, fromId?: string): Promise<string> {
    // Если fromId не указан - возвращаем пустую подпись
    if (!fromId) {
      return '';
    }

    const parts: string[] = [];

    // // Получаем информацию о пользователе Telegram
    // const userInfo = await telegramService.getUserInfo(fromId);
    // let userDisplay = fromId; // fallback к ID если не удалось получить данные

    // if (userInfo) {
    //   if (userInfo.username) {
    //     userDisplay = `@${userInfo.username}`;
    //   } else if (userInfo.firstName) {
    //     userDisplay = userInfo.firstName;
    //   }
    // }

    // Добавляем информацию от кого запрос
    // parts.push(`👤 ${userDisplay}`);

    // if (reelInfo.title) {
    //   parts.push(`📝 ${reelInfo.title}`);
    // }

    // if (reelInfo.description && reelInfo.description.length < 100) {
    //   parts.push(`📄 ${reelInfo.description}`);
    // }

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
