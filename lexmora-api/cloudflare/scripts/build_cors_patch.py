from pathlib import Path

code = r"""async () => {
  const b = '----S' + Date.now();
  const settings = {
    bindings: [
      { type: 'plain_text', name: 'CORS_ORIGINS', text: 'http://localhost:5173,http://127.0.0.1:5173,https://lexmora.armindashti.workers.dev' },
      { type: 'd1', name: 'DB', database_id: '3ba3926f-5411-43fd-85a3-bdd66645cd88' },
      { type: 'inherit', name: 'DEFAULT_PASSWORD' },
      { type: 'plain_text', name: 'DEFAULT_USERNAME', text: 'armin' },
      { type: 'inherit', name: 'JWT_SECRET' },
    ],
  };
  const body = [
    `--${b}`,
    'Content-Disposition: form-data; name="settings"',
    'Content-Type: application/json',
    '',
    JSON.stringify(settings),
    `--${b}--`,
    '',
  ].join('\r\n');
  const patch = await cloudflare.request({
    method: 'PATCH',
    path: `/accounts/${accountId}/workers/scripts/lexmora-api/settings`,
    body,
    contentType: `multipart/form-data; boundary=${b}`,
    rawBody: true,
  });
  const sub = await cloudflare.request({
    method: 'POST',
    path: `/accounts/${accountId}/workers/scripts/lexmora-api/subdomain`,
    body: { enabled: true, previews_enabled: true },
  });
  return {
    patchSuccess: patch.success,
    patchErrors: patch.errors,
    cors: (patch.result?.bindings || []).find((x) => x.name === 'CORS_ORIGINS'),
    subdomain: sub.result,
  };
}"""
Path(__file__).with_name("_mcp_patch_cors.js").write_text(code, encoding="utf-8")
print("wrote", len(code))
