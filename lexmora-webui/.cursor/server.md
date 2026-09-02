# Irancell-T3 server inventory

Updated: 2026-07-24

| Setting | Value |
|---------|-------|
| Hostname | `t3-new` |
| Public IP | `2.144.27.74` |
| SSH | `ssh t3 -p 80` (`cloud-admin`, key `~/.ssh/id_ed25519_irancell`) |
| OS | Ubuntu, kernel `7.0.0-28-generic` |
| Resources | ~3.8 GiB RAM, ~48G disk (`/` ~21% used) |
| Docker network | `t3-net` (shared app + HAProxy) |

## Reverse proxy

- Container: `haproxy` (`haproxy:3.0-alpine`), publishes `0.0.0.0:443/tcp`
- Config bind: `/cloud-admin/docker-volumes/reverse-proxy/haproxy/config/haproxy.cfg`
- Certs: `/cloud-admin/docker-volumes/reverse-proxy/haproxy/certs/`
- Lexmora web: SNI/Host `lexmora.xaigrok.ir` → `lexmora-webui:80`
- Lexmora API: SNI/Host `lexmora-api.xaigrok.ir` → `lexmora-api:8080`

## Lexmora web UI deploy path

`/home/cloud-admin/docker/lexmora-webui` (compose + image via `.armin/docker-scripts/run-on-docker-server.ps1`)
