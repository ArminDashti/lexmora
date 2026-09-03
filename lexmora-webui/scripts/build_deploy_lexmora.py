import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
jwt = (ROOT / "assets-completion.jwt").read_text(encoding="utf-8").strip()
script = (ROOT / "worker.js").read_text(encoding="utf-8")
headers_file = (ROOT / "public" / "_headers").read_text(encoding="utf-8")

code = f"""async () => {{
  const completionJwt = {json.dumps(jwt)};
  const script = {json.dumps(script)};
  const headersFile = {json.dumps(headers_file)};
  const metadata = {{
    main_module: 'worker.js',
    compatibility_date: '2026-08-31',
    assets: {{
      jwt: completionJwt,
      config: {{
        not_found_handling: 'single-page-application',
        run_worker_first: true,
        _headers: headersFile,
      }},
    }},
    bindings: [{{ type: 'assets', name: 'ASSETS' }}],
  }};
  const b = '----B' + Date.now();
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
    path: `/accounts/${{accountId}}/workers/scripts/lexmora`,
    query: {{ include_subdomain_availability: 'true', excludeScript: 'true' }},
    body,
    contentType: `multipart/form-data; boundary=${{b}}`,
    rawBody: true,
  }});
  // enable workers.dev
  const sub = await cloudflare.request({{
    method: 'POST',
    path: `/accounts/${{accountId}}/workers/scripts/lexmora/subdomain`,
    body: {{ enabled: true, previews_enabled: true }},
  }});
  return {{
    uploadSuccess: upload.success,
    uploadErrors: upload.errors,
    deployment_id: upload.result?.deployment_id,
    subdomain: sub.result,
  }};
}}"""
Path(__file__).with_name("_mcp_deploy_lexmora.js").write_text(code, encoding="utf-8")
print(len(code))
