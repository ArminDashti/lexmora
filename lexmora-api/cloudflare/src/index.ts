import { Hono } from 'hono'
import { cors } from 'hono/cors'
import {
  createToken,
  ensureDefaultUser,
  validateToken,
  verifyPassword,
} from './auth'
import * as openrouter from './openrouter'
import { createQuiz } from './quiz'
import { ensureDefaultInstructions, ensureSettingsRow } from './seed'
import {
  buildInstructionKey,
  getTransformOptions,
  transform,
  type TransformRequest,
} from './transform'
import type { Env, HistoryRow, HistoryType } from './types'
import { enrichHistory } from './types'

type Vars = { userId: string; username: string }

const app = new Hono<{ Bindings: Env; Variables: Vars }>()

let bootstrapped = false

async function bootstrap(env: Env) {
  if (bootstrapped) return
  if (!env.JWT_SECRET) throw new Error('JWT_SECRET is required')
  await ensureSettingsRow(env)
  await ensureDefaultInstructions(env)
  await ensureDefaultUser(env)
  bootstrapped = true
}

app.use('*', async (c, next) => {
  await bootstrap(c.env)
  await next()
})

app.use('*', async (c, next) => {
  const origins = (c.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const handler = cors({
    origin: (origin) => {
      if (!origin) return origins[0] || '*'
      if (origins.includes(origin)) return origin
      if (origin.endsWith('.workers.dev') && (origin.includes('lexmora.armindashti') || origin.includes('lexmora-webui'))) return origin
      if (origins.includes('*')) return origin
      return origins[0] || ''
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Authorization', 'Content-Type'],
    credentials: true,
  })
  return handler(c, next)
})

function apiError(error: string, code: string, status: number) {
  return Response.json({ error, code }, { status })
}

function mapError(err: unknown): Response {
  const message = err instanceof Error ? err.message : String(err)
  if (message.includes('invalid username or password')) {
    return apiError(message, 'INVALID_CREDENTIALS', 401)
  }
  if (message.includes('not found') && !message.includes('instruction not found for key')) {
    return apiError(message, 'NOT_FOUND', 404)
  }
  if (message.includes('not configured')) {
    return apiError(message, 'VALIDATION_ERROR', 400)
  }
  if (message.includes('openrouter')) {
    return apiError(message, 'OPENROUTER_ERROR', 502)
  }
  if (
    message.includes('required') ||
    message.includes('invalid') ||
    message.includes('not found for key') ||
    message.includes('not enough')
  ) {
    return apiError(message, 'VALIDATION_ERROR', 400)
  }
  return apiError(message, 'INTERNAL_ERROR', 500)
}

async function requireAuth(
  c: { req: { header: (n: string) => string | undefined }; env: Env; set: (k: keyof Vars, v: string) => void },
) {
  const header = c.req.header('Authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) throw new Error('unauthorized')
  const claims = await validateToken(c.env, token)
  c.set('userId', claims.user_id)
  c.set('username', claims.username)
}

const auth = new Hono<{ Bindings: Env; Variables: Vars }>()
auth.use('*', async (c, next) => {
  try {
    await requireAuth(c)
    await next()
  } catch {
    return apiError('Unauthorized', 'UNAUTHORIZED', 401)
  }
})

app.get('/api/v1/health', (c) => c.json({ status: 'ok' }))

app.post('/api/v1/auth/login', async (c) => {
  try {
    const body = await c.req.json<{ username?: string; password?: string }>()
    const username = (body.username || '').trim()
    const password = body.password || ''
    const user = await c.env.DB.prepare(
      'SELECT id, username, password_hash FROM users WHERE username = ?',
    )
      .bind(username)
      .first<{ id: string; username: string; password_hash: string }>()
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      throw new Error('invalid username or password')
    }
    const token = await createToken(c.env, user)
    return c.json({ token, username: user.username })
  } catch (err) {
    return mapError(err)
  }
})

auth.post('/transform', async (c) => {
  try {
    const body = (await c.req.json()) as TransformRequest
    const result = await transform(c.env, body)
    return c.json(result)
  } catch (err) {
    return mapError(err)
  }
})

auth.get('/transform/options', async (c) => {
  try {
    return c.json(await getTransformOptions(c.env))
  } catch (err) {
    return mapError(err)
  }
})

auth.get('/history', async (c) => {
  try {
    const sortBy = (c.req.query('sort_by') || 'datetime').toLowerCase()
    const sortOrder = (c.req.query('sort_order') || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC'
    let col = 'created_at'
    if (sortBy === 'type') col = 'type'
    else if (sortBy === 'model') col = 'model'

    let limit = Number(c.req.query('limit') || 50)
    let offset = Number(c.req.query('offset') || 0)
    if (!Number.isFinite(limit) || limit <= 0) limit = 50
    if (limit > 200) limit = 200
    if (!Number.isFinite(offset) || offset < 0) offset = 0

    const types = (c.req.queries('type') || [])
      .flatMap((t) => t.split(','))
      .map((t) => t.trim())
      .filter(Boolean)

    const from = c.req.query('from')?.trim()
    const to = c.req.query('to')?.trim()

    const where: string[] = ['1=1']
    const binds: unknown[] = []
    if (types.length) {
      where.push(`type IN (${types.map(() => '?').join(',')})`)
      binds.push(...types)
    }
    if (from) {
      where.push('created_at >= ?')
      binds.push(`${from}T00:00:00.000Z`)
    }
    if (to) {
      const d = new Date(`${to}T00:00:00.000Z`)
      d.setUTCDate(d.getUTCDate() + 1)
      where.push('created_at < ?')
      binds.push(d.toISOString())
    }

    const whereSql = where.join(' AND ')
    const totalRow = await c.env.DB.prepare(`SELECT COUNT(*) AS c FROM history WHERE ${whereSql}`)
      .bind(...binds)
      .first<{ c: number }>()
    const { results } = await c.env.DB.prepare(
      `SELECT id, type, input_text, result_text, model, instruction_key, metadata, created_at
       FROM history WHERE ${whereSql}
       ORDER BY ${col} ${sortOrder}
       LIMIT ? OFFSET ?`,
    )
      .bind(...binds, limit, offset)
      .all<HistoryRow>()

    return c.json({
      items: (results ?? []).map(enrichHistory),
      total: totalRow?.c ?? 0,
      limit,
      offset,
    })
  } catch (err) {
    return mapError(err)
  }
})

auth.get('/history/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const row = await c.env.DB.prepare(
      `SELECT id, type, input_text, result_text, model, instruction_key, metadata, created_at FROM history WHERE id = ?`,
    )
      .bind(id)
      .first<HistoryRow>()
    if (!row) throw new Error('not found')
    return c.json(enrichHistory(row))
  } catch (err) {
    return mapError(err)
  }
})

auth.delete('/history/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const res = await c.env.DB.prepare('DELETE FROM history WHERE id = ?').bind(id).run()
    if (!res.meta.changes) throw new Error('not found')
    return c.body(null, 204)
  } catch (err) {
    return mapError(err)
  }
})

auth.post('/quiz', async (c) => {
  try {
    const body = await c.req.json<{ count?: number }>()
    return c.json(await createQuiz(c.env, Number(body.count)))
  } catch (err) {
    return mapError(err)
  }
})

function addToBucket(
  b: Record<string, number>,
  type: HistoryType,
  count: number,
) {
  switch (type) {
    case 'simplify':
      b.simplify += count
      break
    case 'en_fa':
      b.en_fa += count
      break
    case 'fa_en':
      b.fa_en += count
      break
    case 'term_en':
    case 'term_fa':
      b.term += count
      break
    case 'refine':
      b.refine += count
      break
    case 'symptoms':
      b.symptoms += count
      break
    case 'compare_en':
    case 'compare_fa':
      b.compare += count
      break
    case 'grammar_en':
    case 'grammar_fa':
      b.grammar += count
      break
    case 'cursor':
      b.cursor += count
      break
    case 'frontend':
      b.frontend += count
      break
  }
  b.total =
    b.simplify +
    b.en_fa +
    b.fa_en +
    b.term +
    b.refine +
    b.symptoms +
    b.compare +
    b.grammar +
    b.cursor +
    b.frontend
}

async function countByPeriod(env: Env, since?: string, until?: string) {
  const where = ['1=1']
  const binds: unknown[] = []
  if (since) {
    where.push('created_at >= ?')
    binds.push(since)
  }
  if (until) {
    where.push('created_at < ?')
    binds.push(until)
  }
  const { results } = await env.DB.prepare(
    `SELECT type, COUNT(*) AS c FROM history WHERE ${where.join(' AND ')} GROUP BY type`,
  )
    .bind(...binds)
    .all<{ type: HistoryType; c: number }>()
  const bucket = {
    simplify: 0,
    en_fa: 0,
    fa_en: 0,
    term: 0,
    refine: 0,
    symptoms: 0,
    compare: 0,
    grammar: 0,
    cursor: 0,
    frontend: 0,
    total: 0,
  }
  for (const row of results ?? []) addToBucket(bucket, row.type, row.c)
  return bucket
}

function startOfDayISO(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString()
}

auth.get('/stats', async (c) => {
  try {
    const now = new Date()
    const startToday = startOfDayISO(now)
    const startYesterday = new Date(startToday)
    startYesterday.setUTCDate(startYesterday.getUTCDate() - 1)
    const startWeek = new Date(startToday)
    startWeek.setUTCDate(startWeek.getUTCDate() - 6)
    const startMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()

    return c.json({
      today: await countByPeriod(c.env, startToday),
      yesterday: await countByPeriod(c.env, startYesterday.toISOString(), startToday),
      week: await countByPeriod(c.env, startWeek.toISOString()),
      month: await countByPeriod(c.env, startMonth),
      all_time: await countByPeriod(c.env),
    })
  } catch (err) {
    return mapError(err)
  }
})

auth.get('/instructions', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT key, content, updated_at FROM instructions ORDER BY key',
    ).all()
    return c.json(results ?? [])
  } catch (err) {
    return mapError(err)
  }
})

auth.post('/instructions', async (c) => {
  try {
    const body = await c.req.json<{
      operation?: string
      direction?: string
      mode?: string
      style?: string
      language?: string
      content?: string
    }>()
    const key = await buildInstructionKey(body)
    const content = (body.content || '').trim() || 'You are a careful language assistant.'
    await c.env.DB.prepare(
      `INSERT INTO instructions (key, content, updated_at) VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
       ON CONFLICT(key) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at`,
    )
      .bind(key, content)
      .run()
    const row = await c.env.DB.prepare('SELECT key, content, updated_at FROM instructions WHERE key = ?')
      .bind(key)
      .first()
    return c.json(row)
  } catch (err) {
    return mapError(err)
  }
})

auth.get('/instructions/:key', async (c) => {
  try {
    const row = await c.env.DB.prepare('SELECT key, content, updated_at FROM instructions WHERE key = ?')
      .bind(c.req.param('key'))
      .first()
    if (!row) throw new Error('not found')
    return c.json(row)
  } catch (err) {
    return mapError(err)
  }
})

auth.put('/instructions/:key', async (c) => {
  try {
    const key = c.req.param('key')
    const body = await c.req.json<{ content?: string }>()
    const content = body.content ?? ''
    await c.env.DB.prepare(
      `INSERT INTO instructions (key, content, updated_at) VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
       ON CONFLICT(key) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at`,
    )
      .bind(key, content)
      .run()
    const row = await c.env.DB.prepare('SELECT key, content, updated_at FROM instructions WHERE key = ?')
      .bind(key)
      .first()
    return c.json(row)
  } catch (err) {
    return mapError(err)
  }
})

auth.get('/settings', async (c) => {
  try {
    const row = await c.env.DB.prepare(
      'SELECT openrouter_api_key, model_name, updated_at FROM app_settings WHERE id = 1',
    ).first()
    if (!row) throw new Error('not found')
    return c.json(row)
  } catch (err) {
    return mapError(err)
  }
})

auth.patch('/settings', async (c) => {
  try {
    const body = await c.req.json<{ openrouter_api_key?: string; model_name?: string }>()
    const current = await c.env.DB.prepare(
      'SELECT openrouter_api_key, model_name FROM app_settings WHERE id = 1',
    ).first<{ openrouter_api_key: string; model_name: string }>()
    if (!current) throw new Error('not found')
    const apiKey = body.openrouter_api_key ?? current.openrouter_api_key
    const model = body.model_name ?? current.model_name
    await c.env.DB.prepare(
      `UPDATE app_settings SET openrouter_api_key = ?, model_name = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = 1`,
    )
      .bind(apiKey, model)
      .run()
    const row = await c.env.DB.prepare(
      'SELECT openrouter_api_key, model_name, updated_at FROM app_settings WHERE id = 1',
    ).first()
    return c.json(row)
  } catch (err) {
    return mapError(err)
  }
})

auth.delete('/settings/data', async (c) => {
  try {
    await c.env.DB.prepare('DELETE FROM history').run()
    return c.body(null, 204)
  } catch (err) {
    return mapError(err)
  }
})

auth.get('/settings/models', async (c) => {
  try {
    const settings = await c.env.DB.prepare(
      'SELECT openrouter_api_key FROM app_settings WHERE id = 1',
    ).first<{ openrouter_api_key: string }>()
    if (!settings?.openrouter_api_key.trim()) throw new Error('openrouter API key is not configured')
    const q = c.req.query('q') || ''
    const models = await openrouter.listModels(settings.openrouter_api_key, q, 50)
    return c.json(models)
  } catch (err) {
    return mapError(err)
  }
})

auth.get('/settings/credits', async (c) => {
  try {
    const settings = await c.env.DB.prepare(
      'SELECT openrouter_api_key FROM app_settings WHERE id = 1',
    ).first<{ openrouter_api_key: string }>()
    if (!settings?.openrouter_api_key.trim()) throw new Error('openrouter API key is not configured')
    return c.json(await openrouter.getCredits(settings.openrouter_api_key))
  } catch (err) {
    return mapError(err)
  }
})

app.route('/api/v1', auth)

export default app
