const BASE = 'https://openrouter.ai/api/v1'

async function doFetch(
  method: string,
  path: string,
  apiKey: string,
  body?: unknown,
): Promise<{ status: number; text: string }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  return { status: res.status, text: await res.text() }
}

export async function complete(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userText: string,
): Promise<string> {
  if (!apiKey.trim()) throw new Error('openrouter API key is not configured')
  if (!model.trim()) throw new Error('model is not configured')

  const { status, text } = await doFetch('POST', '/chat/completions', apiKey, {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userText },
    ],
  })
  if (status >= 400) throw new Error(`openrouter status ${status}: ${text}`)

  const parsed = JSON.parse(text) as {
    choices?: { message?: { content?: string } }[]
    error?: { message?: string }
  }
  if (parsed.error?.message) throw new Error(`openrouter error: ${parsed.error.message}`)
  const content = parsed.choices?.[0]?.message?.content
  if (!content) throw new Error('openrouter returned no choices')
  return content.trim().replace(/^```/, '').replace(/```$/, '').trim()
}

export type OpenRouterModel = {
  id: string
  name: string
  context_length: number
}

export async function listModels(
  apiKey: string,
  q: string,
  limit = 50,
): Promise<OpenRouterModel[]> {
  if (!apiKey.trim()) throw new Error('openrouter API key is not configured')
  const capped = Math.min(Math.max(limit, 1), 200)
  const params = new URLSearchParams({ limit: String(capped) })
  if (q.trim()) params.set('q', q.trim())
  const { status, text } = await doFetch('GET', `/models?${params}`, apiKey)
  if (status >= 400) throw new Error(`openrouter status ${status}: ${text}`)
  const parsed = JSON.parse(text) as {
    data?: { id: string; name?: string; context_length?: number }[]
  }
  return (parsed.data ?? []).map((m) => ({
    id: m.id,
    name: m.name || m.id,
    context_length: m.context_length ?? 0,
  }))
}

export type CreditsInfo = {
  source: string
  remaining?: number
  total_credits?: number
  total_usage?: number
  limit_remaining?: number
  usage?: number
}

export async function getCredits(apiKey: string): Promise<CreditsInfo> {
  if (!apiKey.trim()) throw new Error('openrouter API key is not configured')

  const credits = await doFetch('GET', '/credits', apiKey)
  if (credits.status < 400) {
    const parsed = JSON.parse(credits.text) as {
      data: { total_credits: number; total_usage: number }
    }
    const total = parsed.data.total_credits
    const usage = parsed.data.total_usage
    return {
      source: 'credits',
      remaining: total - usage,
      total_credits: total,
      total_usage: usage,
    }
  }

  const key = await doFetch('GET', '/key', apiKey)
  if (key.status >= 400) throw new Error(`openrouter status ${key.status}: ${key.text}`)
  const parsed = JSON.parse(key.text) as {
    data: { limit_remaining?: number; usage: number }
  }
  const info: CreditsInfo = {
    source: 'key',
    usage: parsed.data.usage,
    limit_remaining: parsed.data.limit_remaining,
  }
  if (parsed.data.limit_remaining != null) info.remaining = parsed.data.limit_remaining
  return info
}
