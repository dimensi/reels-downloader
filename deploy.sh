#!/bin/bash

# Настройки
SERVER_IP=datacheap
PROJECT_DIR=reels-downloader
REMOTE_DIR=/root/$PROJECT_DIR

# echo "Создаем куки для yt-dlp"
# yt-dlp --cookies-from-browser chrome --cookies cookies.txt
# Удаляем все куки, кроме нужных доменов
# echo "🧹 Очищаем файл cookies.txt от ненужных доменов..."
# head -n 3 cookies.txt > cookies.txt.tmp
# tail -n +3 cookies.txt | grep -E '\.(facebook|instagram|google|youtube)\.' >> cookies.txt.tmp
# mv cookies.txt.tmp cookies.txt


# Создаем временную папку для копирования
TEMP_DIR=$(mktemp -d)
echo "📁 Создаем временную папку: $TEMP_DIR"

# Копируем проект во временную папку, исключая ненужные директории
echo "📦 Копируем файлы проекта во временную папку..."
rsync -av --exclude 'dist' --exclude 'downloads' --exclude 'node_modules' --exclude '.git' ./ $TEMP_DIR/

# Явно копируем .env файл, если он существует
if [ -f .env ]; then
  echo "📄 Копируем .env файл..."
  cp .env $TEMP_DIR/
else
  echo "⚠️ .env файл не найден!"
fi

echo "🚀 Копируем проект на сервер..."
scp -r $TEMP_DIR/* $SERVER_IP:$REMOTE_DIR

# Проверяем, что .env файл успешно скопирован
echo "🔍 Проверяем наличие .env файла на сервере..."
if ssh $SERVER_IP "[ -f $REMOTE_DIR/.env ]"; then
  echo "✅ .env файл успешно скопирован на сервер"
else
  echo "❌ .env файл не найден на сервере! Пробуем скопировать отдельно..."
  scp .env $SERVER_IP:$REMOTE_DIR/
  if ssh $SERVER_IP "[ -f $REMOTE_DIR/.env ]"; then
    echo "✅ .env файл успешно скопирован на сервер при повторной попытке"
  else
    echo "❌ Не удалось скопировать .env файл на сервер!"
  fi
fi

# Удаляем временную папку
rm -rf $TEMP_DIR

echo "🔄 Перезапускаем сервис на сервере с использованием Docker Compose..."
ssh $SERVER_IP << EOF
  cd $REMOTE_DIR
  
  echo "🛑 Останавливаем существующие контейнеры..."
  docker compose down
  
  echo "🏗️ Собираем и запускаем новые контейнеры..."
  docker compose up --build --force-recreate -d
  
  echo "✅ Проверка запуска контейнеров..."
  docker compose ps
EOF

echo "✅ Деплой завершен!"