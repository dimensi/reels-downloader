import { Telegraf, Input } from 'telegraf';
import config from '../config';
import { getVideoMetadata } from '../utils/videoMetadata';

class TelegramService {
  private bot: Telegraf;

  constructor() {
    this.bot = new Telegraf(config.telegramBotToken);

    // Регистрация команды /get_id
    this.bot.command('get_id', async (ctx) => {
      await ctx.reply(`Ваш ID чата: ${ctx.chat.id}`);
    });

    // Запуск polling (асинхронно, без await)
    this.bot.launch();

    // Graceful shutdown
    process.on('SIGTERM', () => this.bot.stop('SIGTERM'));
    process.on('SIGINT', () => this.bot.stop('SIGINT'));
  }

  /**
   * Отправить видео в чат
   */
  async sendVideo(chatId: string, videoBuffer: Buffer, caption?: string): Promise<void> {
    try {
      // Получаем метаданные видео для правильного соотношения сторон
      const metadata = await getVideoMetadata(videoBuffer);

      // Логируем метаданные если удалось их получить
      if (metadata) {
        console.log(
          `Метаданные видео: ${metadata.width}x${metadata.height}, длительность: ${metadata.duration.toFixed(2)}с`
        );
      }

      // Отправляем видео с помощью Telegraf
      await this.bot.telegram.sendVideo(chatId, Input.fromBuffer(videoBuffer), {
        caption: caption || '',
        supports_streaming: true,
        ...(metadata?.width && { width: metadata.width }),
        ...(metadata?.height && { height: metadata.height }),
      });

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
      await this.bot.telegram.sendMessage(chatId, text);
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
      await this.bot.telegram.getChat(chatId);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Отправить уведомление администратору
   */
  async notifyAdmin(fromId: string | undefined, message: string): Promise<void> {
    if (!fromId) {
      return;
    }
    try {
      await this.bot.telegram.sendMessage(fromId, `🔔 Уведомление:\n${message}`);
    } catch (error) {
      console.error('Ошибка отправки уведомления администратору:', error);
    }
  }

  /**
   * Отправить ошибку администратору
   */
  async notifyError(fromId: string | undefined, error: string, context?: string): Promise<void> {
    if (!fromId) {
      return;
    }
    try {
      let message = `🚨 Ошибка: ${error}`;
      if (context) {
        message += `\n📍 Контекст: ${context}`;
      }
      await this.bot.telegram.sendMessage(fromId, message);
    } catch (err) {
      console.error('Ошибка отправки ошибки администратору:', err);
    }
  }

  /**
   * Отправить статус обработки
   */
  async notifyStatus(fromId: string | undefined, status: string, details?: string): Promise<void> {
    if (!fromId) {
      return;
    }
    try {
      let message = `📊 Статус: ${status}`;
      if (details) {
        message += `\n💬 ${details}`;
      }
      await this.bot.telegram.sendMessage(fromId, message);
    } catch (error) {
      console.error('Ошибка отправки статуса администратору:', error);
    }
  }

  /**
   * Получить информацию о пользователе
   */
  async getUserInfo(userId: string): Promise<{ username?: string; firstName?: string } | null> {
    try {
      const chat = await this.bot.telegram.getChat(userId);
      // В Telegraf chat типизирован корректно
      const result: { username?: string; firstName?: string } = {};

      if ('username' in chat && chat.username) {
        result.username = chat.username;
      }
      if ('first_name' in chat && chat.first_name) {
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
