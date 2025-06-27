import TelegramBot from 'node-telegram-bot-api';
import * as fs from 'fs-extra';
import * as path from 'path';
import config from '../config';

class TelegramService {
  private bot: TelegramBot;

  constructor() {
    this.bot = new TelegramBot(config.telegramBotToken);
    this.bot.startPolling();

    this.bot.onText(/\/get_id/, async (msg) => {
      this.bot.sendMessage(msg.chat.id, `Ваш ID чата: ${msg.chat.id}`);
    });

    process.on('SIGTERM', () => this.bot.stopPolling());
    process.on('SIGINT', () => this.bot.stopPolling());
  }

  /**
   * Отправить видео в чат
   */
  async sendVideo(chatId: string, videoPath: string, caption?: string): Promise<void> {
    try {
      let realVideoPath = videoPath;

      // Если путь содержит %(ext)s, ищем реальный файл
      if (videoPath.includes('%(ext)s')) {
        const basePath = videoPath.replace('.%(ext)s', '');
        const files = await fs.readdir(path.dirname(basePath));
        const fileName = path.basename(basePath);
        const realFile = files.find((file) => file.startsWith(fileName + '.'));

        if (!realFile) {
          throw new Error(`Файл не найден: ${videoPath}`);
        }

        realVideoPath = path.join(path.dirname(basePath), realFile);
      }

      // Проверяем, существует ли файл
      const exists = await fs.pathExists(realVideoPath);
      if (!exists) {
        throw new Error(`Файл не найден: ${realVideoPath}`);
      }

      // Отправляем видео с правильным content-type
      await this.bot.sendVideo(
        chatId,
        realVideoPath,
        {
          caption: caption || '',
        },
        {
          contentType: 'video/mp4',
          filename: path.basename(realVideoPath),
        }
      );

      console.log(`Видео успешно отправлено в чат ${chatId}`);
    } catch (error) {
      console.error('Ошибка отправки видео в Telegram:', error);
      throw new Error(`Не удалось отправить видео: ${error}`);
    }
  }

  /**
   * Отправить сообщение в чат
   */
  async sendMessage(chatId: string, text: string): Promise<void> {
    try {
      await this.bot.sendMessage(chatId, text);
    } catch (error) {
      console.error('Ошибка отправки сообщения в Telegram:', error);
      throw new Error(`Не удалось отправить сообщение: ${error}`);
    }
  }

  /**
   * Проверить, доступен ли чат
   */
  async checkChatAccess(chatId: string): Promise<boolean> {
    try {
      await this.bot.getChat(chatId);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Отправить уведомление администратору
   */
  async notifyAdmin(fromId: string, message: string): Promise<void> {
    try {
      await this.bot.sendMessage(fromId, `🔔 Уведомление:\n${message}`);
    } catch (error) {
      console.error('Ошибка отправки уведомления администратору:', error);
    }
  }

  /**
   * Отправить ошибку администратору
   */
  async notifyError(fromId: string, error: string, context?: string): Promise<void> {
    try {
      let message = `🚨 Ошибка: ${error}`;
      if (context) {
        message += `\n📍 Контекст: ${context}`;
      }
      await this.bot.sendMessage(fromId, message);
    } catch (err) {
      console.error('Ошибка отправки ошибки администратору:', err);
    }
  }

  /**
   * Отправить статус обработки
   */
  async notifyStatus(fromId: string, status: string, details?: string): Promise<void> {
    try {
      let message = `📊 Статус: ${status}`;
      if (details) {
        message += `\n💬 ${details}`;
      }
      await this.bot.sendMessage(fromId, message);
    } catch (error) {
      console.error('Ошибка отправки статуса администратору:', error);
    }
  }

  /**
   * Получить информацию о пользователе
   */
  async getUserInfo(userId: string): Promise<{ username?: string; firstName?: string } | null> {
    try {
      const chat = await this.bot.getChat(userId);
      const result: { username?: string; firstName?: string } = {};

      if (chat.username) {
        result.username = chat.username;
      }
      if (chat.first_name) {
        result.firstName = chat.first_name;
      }

      return result;
    } catch (error) {
      console.error('Ошибка получения информации о пользователе:', error);
      return null;
    }
  }
}

export default new TelegramService();
