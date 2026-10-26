# Reels Downloader

A small HTTP service that downloads Instagram reels and sends them to a Telegram chat.

## Run locally

Requires Node.js 20 or newer and FFmpeg.

```sh
npm ci
cp .env.example .env
# Set TELEGRAM_BOT_TOKEN and TOKEN in .env.
npm run dev
```

Send an authenticated request:

```sh
curl -X POST 'http://localhost:3000/api/download?token=YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://www.instagram.com/reel/EXAMPLE/","chatId":"YOUR_CHAT_ID"}'
```

The service returns 202 when processing starts. Requests without a valid token
return an empty 404. GET/HEAD `/health` is available without a token only through
a direct loopback connection for container health checks.

```sh
npm test
npm run build
```

## Deployment

The workflow builds a Linux AMD64 container tagged with the full commit SHA and
deploys it through Coolify. Deployment settings belong in GitHub's `production`
environment; application tokens belong in the runtime environment.

Required deployment secrets: `COOLIFY_TOKEN`, `COOLIFY_APP_UUID`,
`COOLIFY_SSH_HOST`, `COOLIFY_SSH_PORT`, `COOLIFY_SSH_USER`, `COOLIFY_SSH_KEY`,
and `COOLIFY_SSH_KNOWN_HOSTS`. The SSH host key is verified and the management
API is accessed through an SSH tunnel. Only `main` may deploy.
