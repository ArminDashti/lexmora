# Lexmora Web UI

Vue 3 frontend for the Lexmora app: dark-themed SPA for login, transforms, history, instructions, stats, and settings.

Companion API: [lexmora-api](https://github.com/ArminDashti/lexmora-api)

## Stack

- Vue 3, TypeScript, Vue Router, Pinia
- Tailwind CSS
- Vite
- nginx (production Docker image)

## Prerequisites

- Node.js 18+
- Running [lexmora-api](https://github.com/ArminDashti/lexmora-api) instance

## Setup

1. Install dependencies:

```bash
npm install
```

2. Optional: copy environment file for dev proxy target:

```bash
cp .env.example .env
```

3. Start the API (from `lexmora-api`), then run the dev server:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Vite proxies `/api` to `http://localhost:8080` by default (`VITE_API_PROXY_TARGET`).

### Production build

```bash
npm run build
```

Serve the `dist/` folder with any static host, or use the Docker image below (nginx proxies `/api` to the API container).

## Default login

| Field    | Value            |
|----------|------------------|
| Username | `armin`          |
| Password | `Translator@2024` |

Credentials are validated by the API; defaults are set in the API `.env`.

## Pages

- `/login` — authentication
- `/transform` — main operation UI
- `/history` — sortable table with detail modal
- `/instructions` — edit per-key AI prompts
- `/stats` — usage counts by period
- `/settings` — OpenRouter config and clear history

See [docs/modules/frontend.md](docs/modules/frontend.md).

## Docker

Ensure the API stack is running on the shared Docker network, then start the web UI:

```bash
docker network create lexmora-net
docker compose up -d --build
```

Open [http://localhost:8082](http://localhost:8082). nginx proxies `/api/` to `${API_HOST}:${API_PORT}` (defaults: `lexmora-api:8080`).

| Variable | Description |
|----------|-------------|
| `WEB_PUBLISH_PORT` | Host port for the UI (default `8082`) |
| `API_HOST` | API hostname on the Docker network |
| `API_PORT` | API port on the Docker network |
| `DOCKER_NETWORK` | Shared network name (default `lexmora-net`) |

## Project structure

```
src/views/            Page components
src/components/       Shared UI
src/api/client.ts     API client
src/router/           Vue Router
dist/                 Production build output
nginx.conf.template   nginx /api proxy config
```
