import fs from 'fs-extra';
import { DownloadRequest, DownloadResponse } from '../types';
import telegramService from './telegram';
import config from '../config';

class NotifyService {
  private chatId: string;
  private fromId: string | undefined;
  private startTime: number;
  private currentState: string;
  private url: string;
  constructor(chatId: string, fromId: string | undefined, url: string) {
    this.chatId = chatId;
    this.fromId = fromId;
    this.startTime = Date.now();
    this.currentState = 'START';
    this.url = url;
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
        await telegramService.notifyStatus(
          this.fromId,
          'Начата обработка запроса',
          `URL: ${this.url}`
        );
        break;
      case 'IN_PROGRESS':
        await telegramService.notifyStatus(
          this.fromId,
          'В процессе обработки запроса',
          `URL: ${this.url}`
        );
        break;
      case 'FINISHED':
        await telegramService.notifyStatus(
          this.fromId,
          'Видео успешно отправлено',
          `В чат: ${this.chatId}`
        );
        break;
    }
  }
}

class SimpleDownloaderService {
  /**
   * Основная функция для скачивания и отправки видео
   */
  async processReelDownload(request: DownloadRequest): Promise<DownloadResponse> {
    const { url, chatId, fromId } = request;

    const notifyService = new NotifyService(chatId, fromId, url);

    try {
      await notifyService.changeState('START');

      // Проверяем доступность чата
      const chatAccessible = await telegramService.checkChatAccess(chatId);
      if (!chatAccessible) {
        await telegramService.notifyError(
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

      const proxyUrl = this.convertUrlToProxy(url);
      const filename = `${config.downloadsPath}/${Date.now()}_video.mp4`;

      await fs.ensureDir(config.downloadsPath);

      console.log(`Скачивание видео через proxy: ${proxyUrl}`);
      await this.downloadVideo(proxyUrl, filename);

      await notifyService.changeState('IN_PROGRESS');

      // Отправляем видео в Telegram
      console.log(`Отправка видео в чат: ${chatId}`);
      await telegramService.sendVideo(chatId, filename, '');

      // Удаляем файл после отправки
      // await fs.remove(filename);

      await notifyService.changeState('FINISHED');

      return {
        success: true,
        message: 'Видео успешно скачано и отправлено',
        videoPath: filename,
      };
    } catch (error) {
      console.error('Ошибка обработки запроса:', error);
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';

      // Уведомляем админа об ошибке
      await telegramService.notifyError(fromId, errorMessage, `URL: ${url}, Chat: ${chatId}`);

      return {
        success: false,
        message: 'Ошибка при обработке видео',
        error: errorMessage,
      };
    }
  }

  private convertUrlToProxy(url: string): string {
    // https://www.instagram.com/reel/:hash -> https://kkinstagram.com/reel/:hash
    return url.replace('instagram.com', 'kkinstagram.com').replace('www.', '');
  }

  private async downloadVideo(videoUrl: string, filename: string): Promise<string> {
    try {
      // Используем User-Agent как у Telegram, чтобы обойти возможные ограничения
      const response = await fetch(videoUrl, {
        headers: {
          'User-Agent': 'TelegramBot (like TwitterBot)',
          'Accept': 'video/mp4, video/*,*/*;q=0.8',
          'Accept-Language': 'en-US, en; q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
        },
        redirect: 'follow',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Проверяем, что файл не пустой
      if (buffer.length === 0) {
        throw new Error('Скачанный файл пустой');
      }

      await fs.writeFile(filename, buffer);
      console.log(`Файл сохранен, размер: ${buffer.length} байт`);
      return filename;
    } catch (error) {
      console.error('Ошибка при скачивании видео:', error);
      throw error;
    }
  }

    /**
   * Валидация URL (дублируем логику или используем более простую проверку)
   */
  isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('instagram.com');
    } catch {
      return false;
    }
  }
}

export default new SimpleDownloaderService();
