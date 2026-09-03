"""Upload worker.min.js to Cloudflare Worker via D1 chunks + MCP is manual.
Instead: use Cloudflare API with API token from env CLOUDFLARE_API_TOKEN if set,
or from wrangler config after login.
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ACCOUNT = "0b9173381c4580ae6fc430fff3d08018"
DB = "3ba3926f-5411-43fd-85a3-bdd66645cd88"
SCRIPT = "lexmora-api"


def token() -> str:
    t = os.environ.get("CLOUDFLARE_API_TOKEN") or os.environ.get("CF_API_TOKEN")
    if t:
        return t
    # wrangler oauth config
    candidates = [
        Path.home() / "AppData/Roaming/xdg.config/.wrangler/config/default.toml",
        Path.home() / ".wrangler/config/default.toml",
        Path.home() / ".config/.wrangler/config/default.toml",
    ]
    for p in candidates:
        if p.exists():
            text = p.read_text(encoding="utf-8", errors="ignore")
            for line in text.splitlines():
                if "oauth_token" in line or "api_token" in line:
                    return line.split("=", 1)[-1].strip().strip('"')
    raise SystemExit("No Cloudflare token. Run: npx wrangler login --device")


def cf(method: str, path: str, body: bytes | None = None, content_type: str | None = None):
    headers = {"Authorization": f"Bearer {token()}", "User-Agent": "lexmora-deploy"}
    if content_type:
        headers["Content-Type"] = content_type
    req = urllib.request.Request(
        f"https://api.cloudflare.com/client/v4{path}",
        data=body,
        method=method,
        headers=headers,
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8", errors="replace")
        raise SystemExit(f"HTTP {e.code}: {err}") from e


def deploy() -> None:
    script = Path("dist/worker.min.js").read_text(encoding="utf-8")
    env = {}
    for line in Path("../.env").read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    jwt = env.get("JWT_SECRET", "change-me-to-a-long-random-string")
    password = env.get("DEFAULT_PASSWORD", "dopadopa123")
    metadata = {
        "main_module": "worker.js",
        "compatibility_date": "2026-08-31",
        "compatibility_flags": ["nodejs_compat"],
        "bindings": [
            {"type": "d1", "name": "DB", "id": DB},
            {"type": "secret_text", "name": "JWT_SECRET", "text": jwt},
            {"type": "secret_text", "name": "DEFAULT_PASSWORD", "text": password},
            {"type": "plain_text", "name": "DEFAULT_USERNAME", "text": "armin"},
            {
                "type": "plain_text",
                "name": "CORS_ORIGINS",
                "text": "http://localhost:5173,http://127.0.0.1:5173,https://lexmora-webui.arminonline71.workers.dev",
            },
        ],
    }
    b = f"----FormBoundary{os.getpid()}"
    body = "\r\n".join(
        [
            f"--{b}",
            'Content-Disposition: form-data; name="metadata"',
            "Content-Type: application/json",
            "",
            json.dumps(metadata),
            f"--{b}",
            'Content-Disposition: form-data; name="worker.js"; filename="worker.js"',
            "Content-Type: application/javascript+module",
            "",
            script,
            f"--{b}--",
            "",
        ]
    ).encode("utf-8")
    result = cf(
        "PUT",
        f"/accounts/{ACCOUNT}/workers/scripts/{SCRIPT}",
        body=body,
        content_type=f"multipart/form-data; boundary={b}",
    )
    print("upload", result.get("success"), result.get("errors"))
    sub = cf(
        "POST",
        f"/accounts/{ACCOUNT}/workers/scripts/{SCRIPT}/subdomain",
        body=json.dumps({"enabled": True}).encode(),
        content_type="application/json",
    )
    print("subdomain", sub.get("success"), sub.get("result"))


if __name__ == "__main__":
    deploy()
