export interface ReelInfo {
  id: string;
  title: string;
  uploader: string;
  description?: string;
  [key: string]: unknown;
}

export interface DownloadRequest {
  url: string;
  chatId: string;
  fromId?: string; // ID пользователя для уведомлений
}

export interface DownloadResponse {
  success: boolean;
  message: string;
  videoPath?: string;
  error?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message: string;
  error?: string;
}

export interface Config {
  telegramBotToken: string;
  token: string;
  port: number;
  nodeEnv: string;
  downloadsPath: string;
  maxFileSizeMB: number;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  proxyURL: string;
}
