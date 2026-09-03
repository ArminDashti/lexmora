"""Build Workers Static Assets manifest and print paths for upload."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

DIST = Path(__file__).resolve().parents[1] / "dist"


def file_hash(data: bytes) -> str:
    # Wrangler uses sha256 hex truncated to 32 chars for asset hashes.
    return hashlib.sha256(data).hexdigest()[:32]


def main() -> None:
    manifest = {}
    files = {}
    for path in DIST.rglob("*"):
        if not path.is_file():
            continue
        rel = "/" + path.relative_to(DIST).as_posix()
        data = path.read_bytes()
        h = file_hash(data)
        manifest[rel] = {"hash": h, "size": len(data)}
        files[h] = {"path": rel, "file": str(path), "size": len(data)}
    out = Path(__file__).resolve().parents[1] / "cloudflare-assets-manifest.json"
    # write next to webui
    out = DIST.parent / "cloudflare-assets-manifest.json"
    out.write_text(json.dumps({"manifest": manifest, "files": files}, indent=2), encoding="utf-8")
    print("files", len(manifest), "out", out)


if __name__ == "__main__":
    main()
