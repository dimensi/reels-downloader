import { spawn } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import { ReelInfo } from '../types';
import config from '../config';

/**
 * Получить метаинформацию о рилсе
 */
export async function getReelInfo(url: string): Promise<ReelInfo> {
  return new Promise((resolve, reject) => {
    const ytdlp = spawn('yt-dlp', [
      '--dump-json',
      '--cookies',
      'cookies.txt',
      '--no-warnings',
      url,
    ]);

    let data = '';
    let error = '';

    ytdlp.stdout.on('data', (chunk) => {
      data += chunk.toString();
    });

    ytdlp.stderr.on('data', (chunk) => {
      error += chunk.toString();
    });

    ytdlp.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`yt-dlp exited with code ${code}: ${error}`));
      }
      try {
        const info = JSON.parse(data);
        resolve(info);
      } catch (e) {
        reject(new Error('Ошибка парсинга JSON: ' + e));
      }
    });

    ytdlp.on('error', (err) => {
      reject(new Error(`Ошибка запуска yt-dlp: ${err.message}`));
    });
  });
}

/**
 * Скачать рилс с заданным именем файла
 */
export async function downloadReel(
  url: string,
  filename: string,
  outputFolder = './downloads'
): Promise<string> {
  await fs.ensureDir(outputFolder);

  return new Promise<string>((resolve, reject) => {
    const outputPath = path.join(outputFolder, filename);

    const args = [
      '-f',
      'mp4',
      '-o',
      outputPath,
      url,
      '--no-playlist',
      '--no-warnings',
      ...(config.proxyURL ? ['--proxy', config.proxyURL] : []),
      '--cookies',
      'cookies.txt',
    ].flat();

    const ytdlp = spawn('yt-dlp', args);

    ytdlp.stdout.on('data', (data) => {
      console.log(data.toString());
    });

    ytdlp.stderr.on('data', (data) => {
      console.error(data.toString());
    });

    ytdlp.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Ошибка скачивания, код: ${code}`));
      }
      resolve(outputPath);
    });

    ytdlp.on('error', (err) => {
      reject(new Error(`Ошибка запуска yt-dlp: ${err.message}`));
    });
  });
}

/**
 * Очистить название файла от запрещённых символов
 */
export function sanitizeFilename(name: string): string {
  // Убираем запрещенные символы для имен файлов
  return name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/[\u0000-\u001F]/g, '')
    .slice(0, 100);
}

/**
 * Проверить размер файла
 */
export async function checkFileSize(filePath: string, maxSizeMB: number): Promise<boolean> {
  try {
    // Если путь содержит %(ext)s, ищем реальный файл
    if (filePath.includes('%(ext)s')) {
      const basePath = filePath.replace('.%(ext)s', '');
      const files = await fs.readdir(path.dirname(basePath));
      const fileName = path.basename(basePath);
      const realFile = files.find((file) => file.startsWith(fileName + '.'));

      if (!realFile) {
        return false;
      }

      filePath = path.join(path.dirname(basePath), realFile);
    }

    const stats = await fs.stat(filePath);
    const fileSizeMB = stats.size / (1024 * 1024);
    return fileSizeMB <= maxSizeMB;
  } catch {
    return false;
  }
}

/**
 * Удалить файл
 */
export async function removeFile(filePath: string): Promise<void> {
  try {
    // Если путь содержит %(ext)s, ищем реальный файл
    if (filePath.includes('%(ext)s')) {
      const basePath = filePath.replace('.%(ext)s', '');
      const files = await fs.readdir(path.dirname(basePath));
      const fileName = path.basename(basePath);
      const realFile = files.find((file) => file.startsWith(fileName + '.'));

      if (realFile) {
        filePath = path.join(path.dirname(basePath), realFile);
      }
    }

    await fs.remove(filePath);
  } catch (error) {
    console.error(`Ошибка удаления файла ${filePath}:`, error);
  }
}
