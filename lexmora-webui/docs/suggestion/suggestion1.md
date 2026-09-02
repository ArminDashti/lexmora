# Suggestions

## Align compose env vars with skill defaults
`docker-compose.yml` uses `WEB_IMAGE_TAG` / `WEB_PUBLISH_PORT`, while the generic docker-deploy skill documents `IMAGE_TAG` / `PUBLISH_PORT`. Current `.armin/docker-scripts` scripts map YAML keys to `WEB_*` so overrides work.

**Further:** either rename compose vars to match the skill, or document the mapping as the project contract.

**Effort:** small

## History list has no pagination UI
The API supports `limit` / `offset` on `GET /api/v1/history`, but the web UI only sends sort params. Add pagination or infinite scroll once history grows.

**Effort:** small–medium
