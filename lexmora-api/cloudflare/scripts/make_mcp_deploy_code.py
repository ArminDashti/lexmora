from pathlib import Path
js = Path("dist/worker.min.js").read_text(encoding="utf-8")
# Escape for JS template literal carefully using JSON
import json
js_lit = json.dumps(js)
code = f"""async () => {{
  const script = {js_lit};
  const dbId = '3ba3926f-5411-43fd-85a3-bdd66645cd88';
  const jwt = 'change-me-to-a-long-random-string';
  const defaultPassword = 'IUpe8SqXxtJrEJxZ';
  const cors = 'http://localhost:5173,http://127.0.0.1:5173,https://lexmora-webui.arminonline71.workers.dev';
  const metadata = {{
    main_module: 'worker.js',
    compatibility_date: '2026-08-31',
    compatibility_flags: ['nodejs_compat'],
    bindings: [
      {{ type: 'd1', name: 'DB', id: dbId }},
      {{ type: 'secret_text', name: 'JWT_SECRET', text: jwt }},
      {{ type: 'secret_text', name: 'DEFAULT_PASSWORD', text: defaultPassword }},
      {{ type: 'plain_text', name: 'DEFAULT_USERNAME', text: 'armin' }},
      {{ type: 'plain_text', name: 'CORS_ORIGINS', text: cors }},
    ],
  }};
  const b = '----FormBoundary' + Date.now();
  const body = [
    `--${{b}}`,
    'Content-Disposition: form-data; name=\"metadata\"',
    'Content-Type: application/json',
    '',
    JSON.stringify(metadata),
    `--${{b}}`,
    'Content-Disposition: form-data; name=\"worker.js\"; filename=\"worker.js\"',
    'Content-Type: application/javascript+module',
    '',
    script,
    `--${{b}}--`,
    '',
  ].join('\\r\\n');
  const upload = await cloudflare.request({{
    method: 'PUT',
    path: `/accounts/${{accountId}}/workers/scripts/lexmora-api`,
    body,
    contentType: `multipart/form-data; boundary=${{b}}`,
    rawBody: true,
  }});
  const subdomain = await cloudflare.request({{
    method: 'POST',
    path: `/accounts/${{accountId}}/workers/scripts/lexmora-api/subdomain`,
    body: {{ enabled: true }},
  }});
  return {{ uploadSuccess: upload.success, uploadErrors: upload.errors, subdomain }};
}}"""
Path("dist/mcp_deploy_code.js").write_text(code, encoding="utf-8")
print("wrote", Path("dist/mcp_deploy_code.js").stat().st_size)
