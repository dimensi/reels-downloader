# Dockerfile

# Стадия 1: Базовый образ с yt-dlp и системными зависимостями
FROM node:24-slim AS base

# Установка системных пакетов
RUN apt-get update && \
  apt-get install -y ffmpeg curl && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*

# Скачиваем yt-dlp
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
  chmod a+rx /usr/local/bin/yt-dlp

# Стадия 2: Сборка проекта
FROM node:24-slim AS builder

WORKDIR /app

# Копируем файлы конфигурации
COPY package*.json ./
COPY tsconfig.json ./
COPY .swcrc ./

# Устанавливаем все зависимости (включая dev)
RUN npm ci

# Копируем исходный код
COPY src/ ./src/

# Сборка проекта
RUN npm run build

# Стадия 3: Production образ
FROM base AS production

WORKDIR /app

# Копируем только package.json и package-lock.json для установки prod зависимостей
COPY package*.json ./

# Устанавливаем только production зависимости
RUN npm ci --only=production && npm cache clean --force

# Копируем собранный проект из builder стадии
COPY --from=builder /app/dist ./dist

# Опционально: копируем cookies.txt если существует (для локальной сборки)
# При CI/CD сборке этот файл не копируется, cookies можно примонтировать через volume
# COPY cookies.txt ./cookies.txt

# Создаем папку для загрузок
RUN mkdir -p /app/downloads

# Открываем порт
EXPOSE 3000

# Запуск
CMD ["npm", "run", "start"]
