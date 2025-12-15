import fs from 'fs-extra';
import path from 'path';
import config from '../config';
import { MessagingChannel } from '../types';

type MaxBotApiClient = {
  createFileUpload(payload: {
    file_name: string;
    content_type: string;
    size: number;
  }): Promise<{ upload_id: string; file_id?: string }>;
  uploadFilePart(payload: { upload_id: string; part_number: number; content: Buffer }): Promise<void>;
  completeFileUpload(payload: { upload_id: string }): Promise<void>;
  sendFileMessage(payload: { receiver_id: string; upload_id: string; text?: string }): Promise<void>;
  sendTextMessage(payload: { receiver_id: string; text: string }): Promise<void>;
  getReceiverInfo?(payload: { receiver_id: string }): Promise<unknown>;
};

type MaxBotApiConstructor = new (...args: unknown[]) => MaxBotApiClient;

let MaxBotApi: MaxBotApiConstructor | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  const imported = require('@maxhub/max-bot-api');
  MaxBotApi = (imported?.default || imported) as MaxBotApiConstructor;
} catch (error) {
  console.warn('Пакет @maxhub/max-bot-api недоступен. Max-канал будет отключен.', error);
}

interface MaxUploadDescriptor {
  uploadId: string;
  fileId?: string;
}

class MaxService {
  private client: MaxBotApiClient | undefined;
  private readonly chunkSize: number;
  readonly channel: MessagingChannel = 'max';

  constructor() {
    this.chunkSize = config.maxUploadChunkSizeMB * 1024 * 1024;

    if (!config.maxBotToken || !MaxBotApi) {
      console.warn('Max Bot клиент не будет инициализирован: отсутствует токен или зависимость.');
      return;
    }

    try {
      this.client = new MaxBotApi({
        token: config.maxBotToken,
        baseUrl: config.maxApiBaseUrl || undefined,
      });
    } catch (error) {
      console.error('Не удалось инициализировать Max Bot клиент:', error);
    }
  }

  private ensureClient() {
    if (!this.client) {
      throw new Error('Max Bot клиент не инициализирован. Проверьте MAX_BOT_TOKEN.');
    }
    return this.client;
  }

  async sendVideo(chatId: string, videoPath: string, caption?: string): Promise<void> {
    const client = this.ensureClient();

    const stats = await fs.stat(videoPath);
    const fileName = path.basename(videoPath);

    const uploadDescriptor: MaxUploadDescriptor = await this.createUpload(
      client,
      fileName,
      stats.size
    );

    await this.uploadFileParts(client, uploadDescriptor, videoPath);

    await client.sendFileMessage({
      receiver_id: chatId,
      upload_id: uploadDescriptor.uploadId,
      text: caption || '',
    });

    console.log(`Видео успешно отправлено в Max получателю ${chatId}`);
  }

  async sendMessage(chatId: string, text: string): Promise<void> {
    const client = this.ensureClient();
    await client.sendTextMessage({ receiver_id: chatId, text });
  }

  async checkChatAccess(chatId: string): Promise<boolean> {
    if (!this.client) {
      return false;
    }
    try {
      if (typeof this.client.getReceiverInfo === 'function') {
        await this.client.getReceiverInfo({ receiver_id: chatId });
      }
      return true;
    } catch (error) {
      console.error('Недоступен адресат Max:', error);
      return false;
    }
  }

  async notifyError(fromId: string | undefined, error: string, context?: string): Promise<void> {
    if (!fromId) {
      return;
    }

    const message = [`🚨 Ошибка: ${error}`];
    if (context) {
      message.push(`📍 Контекст: ${context}`);
    }

    await this.safeSendMessage(fromId, message.join('\n'));
  }

  async notifyStatus(fromId: string | undefined, status: string, details?: string): Promise<void> {
    if (!fromId) {
      return;
    }

    const message = [`📊 Статус: ${status}`];
    if (details) {
      message.push(`💬 ${details}`);
    }

    await this.safeSendMessage(fromId, message.join('\n'));
  }

  private async safeSendMessage(chatId: string, text: string) {
    try {
      await this.sendMessage(chatId, text);
    } catch (error) {
      console.error('Ошибка отправки сообщения в Max:', error);
    }
  }

  private async createUpload(
    client: MaxBotApiClient,
    fileName: string,
    fileSize: number
  ): Promise<MaxUploadDescriptor> {
    if (typeof client.createFileUpload !== 'function') {
      throw new Error('Клиент Max Bot не поддерживает загрузку файлов');
    }

    const upload = await client.createFileUpload({
      file_name: fileName,
      content_type: 'video/mp4',
      size: fileSize,
    });

    if (!upload || !upload.upload_id) {
      throw new Error('Не удалось создать закачку файла в Max');
    }

    return { uploadId: upload.upload_id, fileId: upload.file_id };
  }

  private async uploadFileParts(
    client: MaxBotApiClient,
    descriptor: MaxUploadDescriptor,
    filePath: string
  ) {
    const stream = fs.createReadStream(filePath, { highWaterMark: this.chunkSize });
    let partNumber = 0;

    for await (const chunk of stream) {
      partNumber += 1;
      await client.uploadFilePart({
        upload_id: descriptor.uploadId,
        part_number: partNumber,
        content: chunk,
      });
    }

    await client.completeFileUpload({ upload_id: descriptor.uploadId });
  }
}

export default new MaxService();
