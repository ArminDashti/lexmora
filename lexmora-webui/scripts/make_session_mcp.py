import json
from pathlib import Path

manifest = json.loads(Path("dist-manifest-only.json").read_text(encoding="utf-8"))
code = f"""async () => {{
  const manifest = {json.dumps(manifest)};
  const session = await cloudflare.request({{
    method: 'POST',
    path: `/accounts/${{accountId}}/workers/scripts/lexmora-webui/assets-upload-session`,
    body: {{ manifest }},
  }});
  return session;
}}"""
Path("mcp_assets_session.js").write_text(code, encoding="utf-8")
print(len(code))
