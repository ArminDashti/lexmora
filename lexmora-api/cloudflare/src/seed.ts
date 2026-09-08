import type { Env } from './types'
import defaults from './instruction-defaults.json'

const OLD_KEY_MIGRATIONS: Record<string, string> = {
  'en-to-fa-general': 'translate-english-persian-general',
  'en-to-fa-movie': 'translate-english-persian-movie',
  'en-to-fa-formal': 'translate-english-persian-formal',
  'en-to-fa-scientific': 'translate-english-persian-scientific-general',
  'en-to-fa-music': 'translate-english-persian-music',
  'fa-to-en-general': 'translate-persian-english-general',
  'fa-to-en-formal': 'translate-persian-english-formal',
  'fa-to-en-scientific': 'translate-persian-english-scientific-general',
  'simplify-en': 'simplify-english-english',
  'refine-to-everyday': 'refine-english-english-everyday',
  'refine-to-formal': 'refine-english-english-formal',
  'refine-to-slang': 'refine-english-english-slang',
  symptoms: 'symptoms-english-english',
  'term-for-everyday': 'term-english-english-everyday',
  'term-for-formal': 'term-english-english-formal',
  'term-for-slang': 'term-english-english-slang',
  'compare-en': 'compare-english-english',
  'compare-fa': 'compare-persian-persian',
  'grammar-en': 'grammar-english-english',
  'grammar-fa': 'grammar-persian-persian',
}

export async function ensureSettingsRow(env: Env): Promise<void> {
  await env.DB.prepare(
    `INSERT OR IGNORE INTO app_settings (id, openrouter_api_key, model_name) VALUES (1, '', 'anthropic/claude-3.5-sonnet')`,
  ).run()
}

export async function ensureDefaultInstructions(env: Env): Promise<void> {
  for (const [oldKey, newKey] of Object.entries(OLD_KEY_MIGRATIONS)) {
    const old = await env.DB.prepare('SELECT content FROM instructions WHERE key = ?')
      .bind(oldKey)
      .first<{ content: string }>()
    if (!old) continue
    const existing = await env.DB.prepare('SELECT key FROM instructions WHERE key = ?')
      .bind(newKey)
      .first()
    if (!existing) {
      await env.DB.prepare(
        `INSERT INTO instructions (key, content, updated_at) VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`,
      )
        .bind(newKey, old.content)
        .run()
    }
    await env.DB.prepare('DELETE FROM instructions WHERE key = ?').bind(oldKey).run()
  }

  const entries = Object.entries(defaults as Record<string, string>)
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
