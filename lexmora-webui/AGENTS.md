## Learned User Preferences

- Prefer Transform submit via Enter, with Shift+Enter for a new line (not Ctrl+Enter).
- Prefer Mode to default to General whenever that option exists.
- Prefer Instructions access via an Instruction button on Transform that navigates to the `/instructions` edit page; keep Instructions out of the main nav.
- Prefer History empty state to show only the table/grid card; hide the filters card when there is nothing to show.
- Prefer History bulk delete with row checkboxes (and select-all) driving a Delete action.
- Prefer Instructions UI to show English / Persian labels instead of raw `en` / `fa` (API values stay unchanged).
- Prefer Settings to offer OpenRouter vs CursorAPI as selectable providers; CursorAPI may be UI-ready until the backend supports it.
- Always ask before installing dependencies.

## Learned Workspace Facts

- This repo is the Vue 3 + TypeScript Lexmora web UI; the companion API is lexmora-api.
- Transform/translate and term flows auto-detect Persian input to set direction (`fa-en` / `en-fa`) or term language (`fa` / `en`).
- History delete uses per-id `DELETE /history/:id` (no dedicated bulk-delete endpoint).
- Settings CursorAPI fields and `api_provider` are sent when possible; provider choice may also be persisted in the browser until backend CursorAPI wiring exists.
