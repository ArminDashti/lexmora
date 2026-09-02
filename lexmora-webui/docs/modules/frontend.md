# Frontend module

**Directory:** repo root (`src/`)

Vue 3 SPA with dark theme, Vue Router, and Tailwind CSS.

## Pages

- `/login` — authentication
- `/transform` — main operation UI (translate, simplify, term, refine, symptoms, compare)
- `/history` — sortable table, row modal, delete
- `/instructions` — edit per-key AI prompts (including `compare-en` / `compare-fa`)
- `/stats` — usage counts by period (includes compare)
- `/settings` — OpenRouter config and clear history

## Transform operations

| Operation | UI fields sent |
|-----------|----------------|
| translate | `text`, `direction`, `mode`, optional `movie_name` |
| simplify / symptoms | `text` |
| term | `text`, `language`, `style` |
| refine | `text`, `style` |
| compare | `text1`, `text2`, `language` (no `text`) |

## Dev proxy

Vite proxies `/api` to `localhost:8080` during `npm run dev`.

## PWA

- PWA integration is configured in `vite.config.ts` via `vite-plugin-pwa`.
- Manifest metadata includes standalone display mode, dark theme colors, and app icons from `public/`.
- Service worker is registered in `src/main.ts` using `virtual:pwa-register` with `immediate: true`.
- Runtime caching explicitly keeps `/api/*` as `NetworkOnly` to avoid stale auth or translation responses.
- Offline support is shell-only: HTML, JS, CSS, and static assets are precached; API-backed views still require connectivity.
