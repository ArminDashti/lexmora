# Bugs / risks

- **Fixed (2026-07-24):** Login Bad Gateway — web UI was on `lexmora-net` while API was on `t3-net`. Redeploy via `.armin/docker-scripts/run-on-docker-local.ps1` (`docker_network: t3-net`, `publish_port: "8082"`, `delete_image: "yes"`) keeps them on the same network.
- **Fixed (2026-07-24):** Server YAML now uses `ssh t3` and `/home/cloud-admin/docker/lexmora-webui`; local-build + `delete_image` no longer deletes the freshly loaded image before `compose up`.
- **Open:** On T3, `lexmora-api` is not running — UI at `https://lexmora.xaigrok.ir` serves static assets but `/api/*` will 502 until API is deployed.
- Expired JWT may pass client route guard until first 401 from API.
- Missing `compare` field on older API stats responses shows as `undefined` in UI.
