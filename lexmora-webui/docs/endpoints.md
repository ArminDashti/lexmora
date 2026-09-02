# Endpoints / Commands

## Docker deploy scripts

Entry point: `.armin/docker-scripts/` (YAML-only; no CLI flags).

| Command | Auth | Description |
|---------|------|-------------|
| `.\.armin\docker-scripts\run-on-docker-local.ps1` | No | Local deploy: build, force-recreate on `t3-net`, publish `publish_port` |
| `.\.armin\docker-scripts\run-on-docker-server.ps1` | SSH (`t3`) | Remote deploy to Irancell-T3; YAML has `ssh: "ssh t3"` + `volume_dir` |
| `.\create-image.ps1` | No | Build `lexmora-webui` image only |

# API Endpoints

Consumed from [lexmora-api](https://github.com/ArminDashti/lexmora-api). All authenticated routes require `Authorization: Bearer <jwt>`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/health` | No | Health check (not called by UI) |
| POST | `/api/v1/auth/login` | No | Login with username/password, returns JWT |
| POST | `/api/v1/transform` | Yes | Run a transform operation |
| GET | `/api/v1/transform/options` | Yes | Dynamic Operation / Direction / Mode catalog from instruction keys |
| GET | `/api/v1/history` | Yes | List history (`sort_by`, `sort_order`, `type`, `from`, `to`, `limit`, `offset`) |
| GET | `/api/v1/history/:id` | Yes | Get single history record |
| DELETE | `/api/v1/history/:id` | Yes | Delete history record |
| GET | `/api/v1/stats` | Yes | Request counts by period and type |
| GET | `/api/v1/instructions` | Yes | List all instruction keys |
| POST | `/api/v1/instructions` | Yes | Create instruction from operation / direction / mode |
| GET | `/api/v1/instructions/:key` | Yes | Get instruction content |
| PUT | `/api/v1/instructions/:key` | Yes | Update instruction content |
| GET | `/api/v1/settings` | Yes | Get OpenRouter token and model (optional `api_provider`, `cursor_api_key` when backend supports CursorAPI) |
| PATCH | `/api/v1/settings` | Yes | Update OpenRouter token and/or model (UI may also send `api_provider` / `cursor_api_key`; CursorAPI backend wiring pending) |
| GET | `/api/v1/settings/models` | Yes | Search OpenRouter models (`q`) |
| GET | `/api/v1/settings/credits` | Yes | Remaining OpenRouter credits / key usage |
| DELETE | `/api/v1/settings/data` | Yes | Delete all history rows |

## History filters

- `type` — exact history type code (`en_fa`, `simplify`, …)
- `from` / `to` — `YYYY-MM-DD` inclusive calendar days (local server TZ)

## Transform options — `GET /api/v1/transform/options`

Derived from instruction keys:

| Key pattern | UI |
|-------------|-----|
| `en-to-fa-{mode}` | Translate · English → Persian · mode |
| `fa-to-en-{mode}` | Translate · Persian → English · mode |
| `refine-to-{style}` | Refine · style |
| `term-for-{style}` | Term · style |
| `compare-{lang}` | Compare · language |
| `simplify-en` | Simplify |
| `symptoms` | Symptoms |

Create new modes/styles on the Instructions page (`POST /instructions` with `operation`, `direction`, `mode` / `style` / `language`).

## Transform — `POST /api/v1/transform`

### Full request body shape

```json
{
  "operation": "translate|simplify|term|refine|symptoms|compare",
  "text": "...",
  "text1": "...",
  "text2": "...",
  "direction": "en-fa|fa-en",
  "mode": "<slug matching an instruction key>",
  "movie_name": "...",
  "language": "en|fa",
  "style": "<slug matching an instruction key>"
}
```

Only include fields relevant to the selected operation. Modes/styles must exist as instruction keys.

### Operations

| Operation | Required fields | History type |
|-----------|-----------------|--------------|
| `translate` | `text`, `direction`, `mode` (+ `movie_name` if mode is `movie`) | `en_fa` / `fa_en` |
| `simplify` | `text` | `simplify` |
| `term` | `text`, `style` (`language` optional) | `term_en` / `term_fa` |
| `refine` | `text`, `style` | `refine` |
| `symptoms` | `text` | `symptoms` |
| `compare` | `text1`, `text2`, `language` | `compare_en` / `compare_fa` |

### Compare

Compare two words or phrases. Do not send `text`.

```json
{
  "operation": "compare",
  "text1": "ask",
  "text2": "request",
  "language": "en"
}
```

- `language`: explanation language (`en` or `fa`)
- History `input_text` is stored as `"ask vs request"`
- Instruction keys: `compare-en`, `compare-fa`

### Stats

`StatsBucket` includes: `simplify`, `en_fa`, `fa_en`, `term`, `refine`, `symptoms`, `compare`, `total`.
