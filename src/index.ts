import app from './app';
import config from './config';

const startServer = async () => {
  try {
    // Создаем папку для загрузок
    const { ensureDir } = await import('fs-extra');
    await ensureDir(config.downloadsPath);

    // Запускаем сервер
    const server = app.listen(config.port, () => {
      console.log(`🚀 Сервер запущен на порту ${config.port}`);
      console.log(`📁 Папка для загрузок: ${config.downloadsPath}`);
      console.log(`🤖 Telegram Bot Token: ${config.telegramBotToken ? '✅ Настроен' : '❌ Не настроен'}`);
      console.log(`📡 Max Bot Token: ${config.maxBotToken ? '✅ Настроен' : '❌ Не настроен'}`);
      console.log(`🎯 Канал по умолчанию: ${config.defaultChannel}`);
      console.log(`🔧 Режим: ${config.nodeEnv}`);
      console.log(`📊 Health check: http://localhost:${config.port}/health`);
      console.log(`📚 API docs: http://localhost:${config.port}/api`);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      console.log(`\n${signal} получен. Выключение сервера...`);
      server.close(() => {
        console.log('HTTP сервер закрыт.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('❌ Ошибка запуска сервера:', error);
    process.exit(1);
  }
};

// Обработка необработанных ошибок
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

startServer(); 