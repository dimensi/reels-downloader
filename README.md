# Reels Downloader

Микросервис для скачивания видео с Instagram, TikTok, YouTube и отправки в Telegram чаты.

## 🚀 Быстрый старт

### 1. Создайте Telegram бота

1. Напишите [@BotFather](https://t.me/botfather) в Telegram
2. Отправьте команду `/newbot`
3. Следуйте инструкциям и сохраните токен

### 2. Получите ID чата

**Для группы/канала:**
- Добавьте бота в группу/канал
- Дайте боту права администратора  
- ID группы имеет формат `-1001234567890`

**Для приватного чата:**
- Начните диалог с ботом (`/start`)
- ID приватного чата - это ваш Telegram ID

### 3. Сгенерируйте токен доступа

Создайте случайный токен (до 8 символов):
```bash
# Пример генерации токена
echo $RANDOM | md5sum | head -c 8  # Linux/macOS
```
Или используйте любую случайную строку: `abc123`, `qwerty`, `x7m9p2`

### 4. Настройте переменные окружения

Создайте файл `.env`:
```bash
TELEGRAM_BOT_TOKEN=123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw
TOKEN=abc123
PORT=3000
MAX_FILE_SIZE_MB=50
DEFAULT_CHANNEL=telegram
# Max Bot (опционально)
MAX_BOT_TOKEN=your-max-token
MAX_API_BASE_URL=https://api.max.bot
MAX_UPLOAD_CHUNK_SIZE_MB=5
```

### 5. Запустите сервис

**Локально:**
```bash
npm install
npm run dev
```

**Docker:**
```bash
docker-compose up -d
```

### 6. Используйте API

```bash
curl -X POST "http://localhost:3000/api/download?token=abc123" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.instagram.com/reel/...",
    "chatId": "ВАШ_CHAT_ID",
    "fromId": "ВАШ_TELEGRAM_ID",
    "channel": "telegram" 
  }'
```

**Параметры:**
- `token` (query param) - токен доступа из .env файла
- `url` - URL видео для скачивания
- `chatId` - ID чата куда отправить видео
- `fromId` (опционально) - ваш Telegram/Max ID для уведомлений
- `channel` (опционально) - `telegram` или `max` (по умолчанию берется из `DEFAULT_CHANNEL`)

### Отправка в Max Bot

1. Укажите `MAX_BOT_TOKEN` (и при необходимости `MAX_API_BASE_URL`) в `.env`.
2. Поставьте `DEFAULT_CHANNEL=max` либо добавьте `channel=max` в тело запроса или query-параметр.
3. `chatId` должен соответствовать адресу/ID получателя в Max.

Сервис использует многочастичную загрузку файлов (chunk) через официальный Max Bot API. При отсутствии токена Max запрос автоматически уйдет в Telegram.

## 🔔 Мониторинг

С параметром `fromId` вы получите уведомления:
- 📊 Начало обработки  
- 🚨 Ошибки (недоступный чат, большой файл)
- ✅ Успешная отправка

## 🐛 Частые проблемы

- **Токен обязателен** - добавьте `?token=ВАШ_ТОКЕН` в URL запроса
- **Неверный токен** - проверьте токен в .env файле
- **Чат недоступен** - добавьте бота в чат и дайте права администратора
- **Файл слишком большой** - видео превышает 50MB  
- **yt-dlp ошибка** - URL недоступен или защищен

## ⚙️ Настройки

Основные переменные окружения:

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `TELEGRAM_BOT_TOKEN` | Токен Telegram бота | обязательно |
| `TOKEN` | Токен доступа к API | обязательно |
| `PORT` | Порт сервера | 3000 |
| `MAX_FILE_SIZE_MB` | Максимальный размер файла | 50 |
| `DEFAULT_CHANNEL` | Канал по умолчанию (`telegram` или `max`) | telegram |
| `MAX_BOT_TOKEN` | Токен Max Bot | опционально |
| `MAX_API_BASE_URL` | Кастомный base URL Max API | опционально |
| `MAX_UPLOAD_CHUNK_SIZE_MB` | Размер чанка при загрузке в Max | 5 |