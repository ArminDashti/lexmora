# Modules

| Module | Path | Role |
|--------|------|------|
| Frontend SPA | `src/` | Vue 3 views, router, API client, layout |
| API client | `src/api/client.ts` | Auth + REST calls to lexmora-api |
| Docker image | `Dockerfile`, `nginx.conf.template` | Static UI + `/api` proxy |
| Compose stack | `docker-compose.yml` | `lexmora-webui` on external `t3-net` |
| Docker deploy | `.armin/docker-scripts/` | Local/server YAML-driven deploy scripts |
| Docs | `docs/` | Description, tree, endpoints, module notes |
