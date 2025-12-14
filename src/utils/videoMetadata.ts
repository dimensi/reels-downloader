import { spawn } from 'child_process';
import * as fs from 'fs-extra';

export interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
}

/**
 * Получить метаданные видео через ffprobe
 */
export async function getVideoMetadata(videoPath: string): Promise<VideoMetadata | null> {
  try {
    // Проверяем существование файла
    const exists = await fs.pathExists(videoPath);
    if (!exists) {
      console.error(`Файл не найден: ${videoPath}`);
      return null;
    }

    return new Promise((resolve) => {
      const ffprobe = spawn('ffprobe', [
        '-v',
        'error',
        '-select_streams',
        'v:0',
        '-show_entries',
        'stream=width,height,duration',
        '-of',
        'json',
        videoPath,
      ]);

      let stdout = '';
      let stderr = '';

      ffprobe.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      ffprobe.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code !== 0) {
          console.error(`ffprobe ошибка (код ${code}): ${stderr}`);
          resolve(null);
          return;
        }

        try {
          const result = JSON.parse(stdout);
          const stream = result.streams?.[0];

          if (!stream || !stream.width || !stream.height) {
            console.error('Не удалось получить метаданные видео из ffprobe');
            resolve(null);
            return;
          }

          resolve({
            width: Number(stream.width),
            height: Number(stream.height),
            duration: stream.duration ? Number(stream.duration) : 0,
          });
        } catch (parseError) {
          console.error('Ошибка парсинга JSON от ffprobe:', parseError);
          resolve(null);
        }
      });

      ffprobe.on('error', (error) => {
        console.error('Ошибка запуска ffprobe:', error);
        resolve(null);
      });
    });
  } catch (error) {
    console.error('Ошибка получения метаданных видео:', error);
    return null;
  }
}
