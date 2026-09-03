import type { Env } from './types'

// Defaults come from T3 migration (or empty until then). Keys are created on demand via API.
const defaults: Record<string, string> = {}

export async function ensureSettingsRow(env: Env): Promise<void> {
  await env.DB.prepare(
    `INSERT OR IGNORE INTO app_settings (id, openrouter_api_key, model_name) VALUES (1, '', 'anthropic/claude-3.5-sonnet')`,
  ).run()
}

export async function ensureDefaultInstructions(env: Env): Promise<void> {
  const entries = Object.entries(defaults)
  for (const [key, content] of entries) {
    const existing = await env.DB.prepare('SELECT content FROM instructions WHERE key = ?')
      .bind(key)
      .first<{ content: string }>()
    if (existing) continue
    await env.DB.prepare(
      `INSERT INTO instructions (key, content, updated_at) VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`,
    )
      .bind(key, content)
      .run()
  }
}
