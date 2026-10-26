import { spawn } from 'child_process';

export interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
}

/**
 * Получить метаданные видео через ffprobe.
 * Принимает либо путь к файлу, либо Buffer (для экономии диска/времени).
 */
export async function getVideoMetadata(input: string | Buffer): Promise<VideoMetadata | null> {
  try {
    const args = [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=width,height,duration',
      '-of',
      'json',
    ];

    const useStdin = Buffer.isBuffer(input);
    if (useStdin) {
      args.push('-i', 'pipe:0');
    } else {
      args.push(input);
    }

    return new Promise((resolve) => {
      const ffprobe = spawn('ffprobe', args);
      const timeout = setTimeout(() => {
        ffprobe.kill('SIGKILL');
      }, 10000);

      let stdout = '';
      let stderr = '';

      ffprobe.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      ffprobe.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      if (useStdin) {
        // Пишем буфер в stdin; глушим EPIPE, если ffprobe закрыл stdin раньше (не валимся по uncaught)
        ffprobe.stdin.on('error', (err) => {
          if ('code' in err && err.code !== 'EPIPE') {
            console.error('ffprobe stdin error:', err);
          }
        });
        ffprobe.stdin.write(input, () => ffprobe.stdin.end());
      }

      ffprobe.on('close', (code) => {
        clearTimeout(timeout);
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
        clearTimeout(timeout);
        console.error('Ошибка запуска ffprobe:', error);
        resolve(null);
      });
    });
  } catch (error) {
    console.error('Ошибка получения метаданных видео:', error);
    return null;
  }
}
