"""Upload WebUI static assets using a Workers assets-upload-session JWT."""
from __future__ import annotations

import base64
import json
import mimetypes
import sys
import urllib.error
import urllib.request
from pathlib import Path

ACCOUNT = "0b9173381c4580ae6fc430fff3d08018"
ROOT = Path(__file__).resolve().parents[1]

# Cloudflare serves whatever Content-Type was set on each multipart part.
MIME_BY_SUFFIX = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".webmanifest": "application/manifest+json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".map": "application/json; charset=utf-8",
}


def content_type_for(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix in MIME_BY_SUFFIX:
        return MIME_BY_SUFFIX[suffix]
    guessed, _ = mimetypes.guess_type(str(path))
    return guessed or "application/octet-stream"


def main() -> int:
    if len(sys.argv) < 3:
        print("usage: upload_assets.py <jwt> <session.json>")
        return 2
    jwt = sys.argv[1]
    session = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
    meta = json.loads((ROOT / "cloudflare-assets-manifest.json").read_text(encoding="utf-8"))
    hash_to_file = {h: Path(info["file"]) for h, info in meta["files"].items()}

    completion = None
    for bi, bucket in enumerate(session["buckets"]):
        boundary = f"----AssetBucket{bi}"
        parts: list[bytes] = []
        for h in bucket:
            path = hash_to_file[h]
            data = base64.b64encode(path.read_bytes())
            ctype = content_type_for(path)
            parts.append(f"--{boundary}\r\n".encode())
            parts.append(f'Content-Disposition: form-data; name="{h}"; filename="{h}"\r\n'.encode())
            parts.append(f"Content-Type: {ctype}\r\n\r\n".encode())
            parts.append(data)
            parts.append(b"\r\n")
        parts.append(f"--{boundary}--\r\n".encode())
        body = b"".join(parts)
        url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT}/workers/assets/upload?base64=true"
        req = urllib.request.Request(
            url,
            data=body,
            method="POST",
            headers={
                "Authorization": f"Bearer {jwt}",
                "Content-Type": f"multipart/form-data; boundary={boundary}",
                "User-Agent": "LexmoraDeploy/1.0",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=300) as resp:
                result = json.load(resp)
        except urllib.error.HTTPError as e:
            print("HTTP", e.code, e.read()[:800])
            return 1
        print(
            "bucket",
            bi,
            "success",
            result.get("success"),
            "keys",
            list((result.get("result") or {}).keys()),
        )
        if result.get("result", {}).get("jwt"):
            completion = result["result"]["jwt"]
            jwt = completion  # subsequent buckets may need updated jwt
        if not result.get("success"):
            print(result)
            return 1

    if completion:
        Path("assets-completion.jwt").write_text(completion, encoding="utf-8")
        print("wrote assets-completion.jwt")
    else:
        Path("assets-completion.jwt").write_text(jwt, encoding="utf-8")
        print("wrote session jwt as completion fallback")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
