# Module 1: Docker Deploy Assets

## Responsibility
YAML-only deployment scripts and config for running the web UI with Docker Compose.

## Key scripts
- `.armin/docker-scripts/run-on-docker-local.ps1`
- `.armin/docker-scripts/run-on-docker-server.ps1`

## Key configs
- `.armin/docker-scripts/run-on-docker-local.yaml`
- `.armin/docker-scripts/run-on-docker-server.yaml`

## Dependencies / assumptions
- `docker-compose.yml` expects overrides via `WEB_IMAGE_TAG`, `WEB_PUBLISH_PORT`, `DOCKER_NETWORK`, `API_HOST`, and `API_PORT`.
- Local YAML requires `publish_port` (currently `8082`) and sets `delete_image: "yes"`.
- Scripts map YAML `image_tag` / `publish_port` / `docker_network` / `api_host` / `api_port` to those env vars.
- Compose up uses `--force-recreate --remove-orphans` so network and API host changes replace a stale container.
- Server YAML keeps `ssh` and `volume_dir` as placeholders until filled; `publish_port` may be empty behind a reverse proxy.
- Web UI and API must share the same external Docker network (`t3-net` by default).
