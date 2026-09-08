# API Endpoints

All authenticated routes require `Authorization: Bearer <jwt>`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/health` | No | Health check |
| POST | `/api/v1/auth/login` | No | Login with username/password, returns JWT |
| POST | `/api/v1/transform` | Yes | Run a transform operation |
| GET | `/api/v1/transform/options` | Yes | Dynamic Operation / Direction / Mode catalog from instruction keys |
| GET | `/api/v1/history` | Yes | Paginated history (`sort_by`, `sort_order`, `type` comma-separated multi, `from`, `to`, `limit` default 50, `offset`) |
| GET | `/api/v1/history/:id` | Yes | Get single history record |
| DELETE | `/api/v1/history/:id` | Yes | Delete history record |
| POST | `/api/v1/quiz` | Yes | Build a multiple-choice quiz from history |
| GET | `/api/v1/stats` | Yes | Request counts by period and type |
| GET | `/api/v1/instructions` | Yes | List all instruction keys |
| POST | `/api/v1/instructions` | Yes | Create instruction from operation / direction / mode |
| GET | `/api/v1/instructions/:key` | Yes | Get instruction content |
| PUT | `/api/v1/instructions/:key` | Yes | Update instruction content |
| GET | `/api/v1/settings` | Yes | Get OpenRouter token and model |
| PATCH | `/api/v1/settings` | Yes | Update OpenRouter token and/or model |
| GET | `/api/v1/settings/models` | Yes | Search OpenRouter models (`q`) |
| GET | `/api/v1/settings/credits` | Yes | Remaining OpenRouter credits / key usage |
| DELETE | `/api/v1/settings/data` | Yes | Delete all history rows |

## History filters

- `type` — one or more history type codes (`en_fa`, `simplify`, …). Comma-separated (`type=en_fa,fa_en`) and/or repeated `type=` params. Empty = all types.
- `from` / `to` — `YYYY-MM-DD` inclusive calendar days (server local TZ; `to` is end-of-day inclusive)

Response:

```json
{
  "items": [ /* HistoryRecord[] */ ],
  "total": 237,
  "limit": 50,
  "offset": 0
}
```

## Quiz — `POST /api/v1/quiz`

Builds a multiple-choice quiz from history rows.

Request:

```json
{
  "types": ["en_fa", "fa_en"],
  "count": 10
}
```

- `types` — optional; empty/omit = all history types
- `count` — required; 1–50

Each question uses `input_text` as the prompt and `result_text` as the correct option, plus 3 distractors from other history results (4 options total).

Response:

```json
{
  "questions": [
    {
      "history_id": "...",
      "type": "en_fa",
      "type_display": "English-Persian",
      "prompt": "<input_text>",
      "options": ["...", "...", "...", "..."],
      "correct_index": 2
    }
  ]
}
```

Returns 400 if there is not enough history or not enough distinct results to build the quiz.

## Transform options — `GET /api/v1/transform/options`

Derived from instruction keys (not hardcoded allow-lists):

| Key pattern | UI |
|-------------|-----|
| `translate-english-persian-{mode}` | Translate · English → Persian · mode |
| `translate-english-persian-scientific-{topic}` | Translate · English → Persian · Scientific · topic |
| `translate-persian-english-{mode}` | Translate · Persian → English · mode |
| `cursor-persian-english-{mode}` | Cursor · Persian → English · skill/agent |
| `frontend-{dir}-for-agent` | Frontend · direction · for-agent |
| `refine-english-english-{style}` | Refine · style |
| `term-english-english-{style}` | Term · style |
| `compare-english-english` / `compare-persian-persian` | Compare · language |
| `grammar-english-english` / `grammar-persian-persian` | Grammar · language |
| `simplify-english-english` | Simplify |
| `symptoms-english-english` | Symptoms |

Create new modes/styles via `POST /instructions`.

## Transform — `POST /api/v1/transform`

### Full request body shape

```json
{
  "operation": "translate|cursor|frontend|simplify|term|refine|symptoms|compare|grammar",
  "text": "...",
  "text1": "...",
  "text2": "...",
  "direction": "english-persian|persian-english|english-english|persian-persian",
  "mode": "<slug matching an instruction key>",
  "topic": "<scientific topic when mode is scientific>",
  "movie_name": "...",
  "language": "en|fa",
  "style": "<slug matching an instruction key>"
}
```

Only include fields relevant to the selected operation. Modes/styles must exist as instruction keys.

### Operations

| Operation | Required fields | History type |
|-----------|-----------------|--------------|
| `translate` | `text`, `direction`, `mode` (`topic` when scientific; `movie_name` optional when movie) | `en_fa` / `fa_en` |
| `cursor` | `text`, `direction` (`persian-english`), `mode` (`skill`\|`agent`) | `cursor` |
| `frontend` | `text`, `direction`, `mode` (`for-agent`) | `frontend` |
| `simplify` | `text` | `simplify` |
| `term` | `text`, `style` (`language` optional) | `term_en` / `term_fa` |
| `refine` | `text`, `style` | `refine` |
| `symptoms` | `text` | `symptoms` |
| `compare` | `text1`, `text2` (`language` optional; defaults to `en`) | `compare_en` / `compare_fa` |
| `grammar` | `text` (`language` optional; defaults to `en`) | `grammar_en` / `grammar_fa` |

### Compare

```json
{
  "operation": "compare",
  "text1": "ask",
  "text2": "request",
  "language": "en"
}
```

- Do not send `text` for this operation
- History `input_text` is stored as `"ask vs request"`
- Instruction keys: `compare-english-english`, `compare-persian-persian`

### Transform response

```json
{
  "id": "uuid",
  "type": "compare_en",
  "type_display": "Compare English",
  "input_text": "ask vs request",
  "result_text": "...",
  "model": "anthropic/claude-3.5-sonnet",
  "instruction_key": "compare-english-english",
  "created_at": "2026-07-16T17:00:00Z",
  "formatted_date": "2026:07:16 17:00"
}
```

### Stats

`StatsBucket` includes: `simplify`, `en_fa`, `fa_en`, `term`, `refine`, `symptoms`, `compare`, `grammar`, `cursor`, `frontend`, `total`.

## Settings — models and credits

### `GET /api/v1/settings/models?q=`

Proxies OpenRouter `GET /models`. Returns `{ id, name, context_length }[]`. Requires a configured API key.

### `GET /api/v1/settings/credits`

Tries OpenRouter `GET /credits` (management key) for account remaining (`total_credits - total_usage`). Falls back to `GET /key` for normal API keys (`usage`, optional `limit_remaining`).

## Create instruction — `POST /api/v1/instructions`

```json
{
  "operation": "translate",
  "direction": "en-fa",
  "mode": "poetry",
  "content": "optional custom prompt; default seed used if omitted"
}
```

Also supports `style` (refine/term) and `language` (compare).
