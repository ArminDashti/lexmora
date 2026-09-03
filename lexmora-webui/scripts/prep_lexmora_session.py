"""Create assets-upload-session for Worker name `lexmora` and print session JSON."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
meta = json.loads((ROOT / "cloudflare-assets-manifest.json").read_text(encoding="utf-8"))
manifest = meta["manifest"]

# MCP execute payload written for the agent to run
code = f"""async () => {{
  const manifest = {json.dumps(manifest)};
  return await cloudflare.request({{
    method: 'POST',
    path: `/accounts/${{accountId}}/workers/scripts/lexmora/assets-upload-session`,
    body: {{ manifest }},
  }});
}}"""
Path(__file__).with_name("_mcp_lexmora_session.js").write_text(code, encoding="utf-8")
print("manifest entries", len(manifest))
print("wrote", Path(__file__).with_name("_mcp_lexmora_session.js"))
