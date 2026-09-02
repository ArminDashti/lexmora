# Architecture (technical)

- **SPA:** Vue 3 + TypeScript + Pinia + Vue Router; Vite builds `dist/`.
- **Prod image:** multi-stage Dockerfile (`node:22-alpine` build → `nginx:alpine`).
- **Proxy:** `nginx.conf.template` uses `API_HOST` / `API_PORT` (defaults `lexmora-api:8080`).
- **Compose:** external network `t3-net`; image override via `WEB_IMAGE_TAG`; host port via `WEB_PUBLISH_PORT` (default 8082).
- **Deploy:** `.armin/docker-scripts/*.ps1` read sibling YAML only; map `image_tag` → `WEB_IMAGE_TAG`, `publish_port` → `WEB_PUBLISH_PORT`, `docker_network` → `DOCKER_NETWORK`, `api_host`/`api_port` → `API_*`. Local YAML requires `publish_port` and sets `delete_image: "yes"`. Server mode supports `build_image_on: local|server` over SSH.
