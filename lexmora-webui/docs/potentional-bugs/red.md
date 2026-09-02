# Critical / production risks

## Fixed: wrong Docker network caused Bad Gateway / restart loop

**[lexmora-webui]** — Container on `lexmora-net` while `lexmora-api` is on `t3-net`. nginx cannot resolve `lexmora-api` → `502 Bad Gateway` on `/api/v1/*` (e.g. login). Older builds also restarted forever when upstream was a literal hostname.

**Mitigation:** Keep both on the same `docker_network` (`t3-net` in `.armin/docker-scripts/*.yaml`). Deploy scripts use `--force-recreate`; nginx resolves the API via Docker DNS at request time. If 502 returns, check `docker inspect` networks and `docker logs lexmora-webui` for `could not be resolved`.
