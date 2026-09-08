# Transform module

**Package:** `internal/service/transform.go` + `internal/handler/transform.go`

Maps UI operation selections to instruction keys (must exist in DB), calls OpenRouter, and saves history.

Dropdown options are **not hardcoded** — `GET /transform/options` builds them from instruction keys.

## Key pattern

`<operation>-<direction>-<mode>[-<topic>]`

Directions: `english-persian`, `persian-english`, `english-english`, `persian-persian` (aliases `en-fa` / `fa-en` accepted).

## Operation → instruction key mapping

| Operation | Params | Instruction key | History type |
|-----------|--------|-----------------|--------------|
| translate | direction + mode (+ topic when scientific) | `translate-{dir}-{mode}` or `…-scientific-{topic}` | en_fa / fa_en |
| cursor | persian-english + skill\|agent | `cursor-persian-english-{mode}` | cursor |
| frontend | persian-english\|english-english + for-agent | `frontend-{dir}-for-agent` | frontend |
| simplify | — | `simplify-english-english` | Simplify |
| term | style (+ optional language) | `term-english-english-{style}` | Term English / Persian |
| refine | style | `refine-english-english-{style}` | Refine |
| symptoms | — | `symptoms-english-english` | Symptoms |
| compare | language optional (default `en`) | `compare-english-english` / `compare-persian-persian` | Compare English / Persian |
| grammar | language | `grammar-english-english` / `grammar-persian-persian` | Grammar English / Persian |

New modes/styles are created via `POST /instructions`.

## Dependencies

- `SettingsService` for API key and model
- `InstructionService` for system prompts
- `OpenRouterClient` for LLM calls
- `HistoryRepository` for persistence
