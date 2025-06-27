# Dockerfile

FROM node:20-slim

# Установка нужных пакетов
RUN apt-get update && \
  apt-get install -y ffmpeg curl && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*

# Скачиваем yt-dlp напрямую
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
  chmod a+rx /usr/local/bin/yt-dlp

# Установка рабочего каталога
WORKDIR /app

# Копируем файлы конфигурации и зависимостей
COPY package*.json ./
COPY tsconfig.json ./
COPY .swcrc ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Устанавливаем dev зависимости для сборки
RUN npm ci

# Копируем исходный код
COPY src/ ./src/

# Сборка проекта
RUN npm run build

# Удаляем dev зависимости после сборки
RUN npm ci --only=production && npm cache clean --force

# Создаем папку для загрузок
RUN mkdir -p /app/downloads

# Открываем порт
EXPOSE 3000

# Проверка здоровья
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Запуск
CMD ["npm", "run", "start"]
