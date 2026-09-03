import type { Env, HistoryType } from './types'
import { enrichHistory } from './types'
import * as openrouter from './openrouter'

export type TransformRequest = {
  operation?: string
  text?: string
  text1?: string
  text2?: string
  direction?: string
  mode?: string
  movie_name?: string
  language?: string
  style?: string
}

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function normalizeSlug(value?: string): string {
  if (!value) return ''
  const s = value.trim().toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-')
  return slugPattern.test(s) ? s : ''
}

function titleFromSlug(slug: string): string {
  return slug
    .split('-')
    .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p))
    .join(' ')
}

async function requireInstruction(env: Env, key: string) {
  const row = await env.DB.prepare('SELECT key FROM instructions WHERE key = ?').bind(key).first()
  if (!row) throw new Error(`instruction not found for key ${key}`)
}

async function resolveTransform(
  env: Env,
  req: TransformRequest,
  text: string,
): Promise<{ historyType: HistoryType; instructionKey: string; userText: string; metadata: Record<string, string> }> {
  const op = (req.operation || '').trim().toLowerCase()
  const metadata: Record<string, string> = {}

  switch (op) {
    case 'translate': {
      const dir = (req.direction || '').trim().toLowerCase()
      const mode = normalizeSlug(req.mode)
      if (!mode) throw new Error(`invalid translate mode: ${req.mode}`)
      let key = ''
      let historyType: HistoryType
      if (dir === 'en-fa') {
        key = `en-to-fa-${mode}`
        historyType = 'en_fa'
      } else if (dir === 'fa-en') {
        key = `fa-to-en-${mode}`
        historyType = 'fa_en'
      } else {
        throw new Error(`invalid translate direction: ${req.direction}`)
      }
      await requireInstruction(env, key)
      if (mode === 'movie') {
        const movie = (req.movie_name || '').trim()
        if (movie) {
          metadata.movie_name = movie
          return { historyType, instructionKey: key, userText: `Movie: ${movie}\n\n${text}`, metadata }
        }
      }
      return { historyType, instructionKey: key, userText: text, metadata }
    }
    case 'simplify': {
      const key = 'simplify-en'
      await requireInstruction(env, key)
      return { historyType: 'simplify', instructionKey: key, userText: text, metadata }
    }
    case 'term': {
      const lang = (req.language || '').trim().toLowerCase()
      const style = normalizeSlug(req.style)
      if (!style) throw new Error(`invalid term style: ${req.style}`)
      const key = `term-for-${style}`
      await requireInstruction(env, key)
      if (lang === 'en') {
        return {
          historyType: 'term_en',
          instructionKey: key,
          userText: `Find an English term for this description:\n\n${text}`,
          metadata,
        }
      }
      if (lang === 'fa') {
        return {
          historyType: 'term_fa',
          instructionKey: key,
          userText: `Find a Persian term for this description:\n\n${text}`,
          metadata,
        }
      }
      if (!lang) return { historyType: 'term_en', instructionKey: key, userText: text, metadata }
      throw new Error(`invalid term language: ${req.language}`)
    }
    case 'refine': {
      const style = normalizeSlug(req.style)
      if (!style) throw new Error(`invalid refine style: ${req.style}`)
      const key = `refine-to-${style}`
      await requireInstruction(env, key)
      return { historyType: 'refine', instructionKey: key, userText: text, metadata }
    }
    case 'symptoms': {
      const key = 'symptoms'
      await requireInstruction(env, key)
      return { historyType: 'symptoms', instructionKey: key, userText: text, metadata }
    }
    case 'compare': {
      let lang = (req.language || '').trim().toLowerCase() || 'en'
      const text1 = (req.text1 || '').trim()
      const text2 = (req.text2 || '').trim()
      metadata.text1 = text1
      metadata.text2 = text2
      metadata.language = lang
      const key = `compare-${lang}`
      await requireInstruction(env, key)
      const userMsg = `Compare these two words or phrases:\n\n1: ${text1}\n2: ${text2}`
      if (lang === 'en') return { historyType: 'compare_en', instructionKey: key, userText: userMsg, metadata }
      if (lang === 'fa') return { historyType: 'compare_fa', instructionKey: key, userText: userMsg, metadata }
      throw new Error(`invalid compare language: ${req.language}`)
    }
    case 'grammar': {
      let lang = (req.language || '').trim().toLowerCase() || 'en'
      metadata.language = lang
      const key = `grammar-${lang}`
      await requireInstruction(env, key)
      if (lang === 'en') return { historyType: 'grammar_en', instructionKey: key, userText: text, metadata }
      if (lang === 'fa') return { historyType: 'grammar_fa', instructionKey: key, userText: text, metadata }
      throw new Error(`invalid grammar language: ${req.language}`)
    }
    default:
      throw new Error(`invalid operation: ${req.operation}`)
  }
}

export async function transform(env: Env, req: TransformRequest) {
  const op = (req.operation || '').trim().toLowerCase()
  let inputText = ''
  if (op === 'compare') {
    const text1 = (req.text1 || '').trim()
    const text2 = (req.text2 || '').trim()
    if (!text1 || !text2) throw new Error('text1 and text2 are required')
    inputText = `${text1} vs ${text2}`
  } else {
    inputText = (req.text || '').trim()
    if (!inputText) throw new Error('text is required')
  }

  const resolved = await resolveTransform(env, req, inputText)
  const settings = await env.DB.prepare(
    'SELECT openrouter_api_key, model_name FROM app_settings WHERE id = 1',
  ).first<{ openrouter_api_key: string; model_name: string }>()
  if (!settings) throw new Error('settings not found')

  const instruction = await env.DB.prepare('SELECT content FROM instructions WHERE key = ?')
    .bind(resolved.instructionKey)
    .first<{ content: string }>()
  if (!instruction) throw new Error(`instruction not found for key ${resolved.instructionKey}`)

  const result = await openrouter.complete(
    settings.openrouter_api_key,
    settings.model_name,
    instruction.content.trim(),
    resolved.userText,
  )

  const id = crypto.randomUUID()
  const metadata =
    Object.keys(resolved.metadata).length > 0 ? JSON.stringify(resolved.metadata) : null
  await env.DB.prepare(
    `INSERT INTO history (id, type, input_text, result_text, model, instruction_key, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, resolved.historyType, inputText, result, settings.model_name, resolved.instructionKey, metadata)
    .run()

  const saved = await env.DB.prepare(
    `SELECT id, type, input_text, result_text, model, instruction_key, metadata, created_at FROM history WHERE id = ?`,
  )
    .bind(id)
    .first()
  return enrichHistory(saved as never)
}

type OptionItem = { value: string; label: string }
type DirectionOption = { value: string; label: string; modes: OptionItem[] }
type OperationOption = {
  value: string
  label: string
  directions?: DirectionOption[]
  styles?: OptionItem[]
  languages?: OptionItem[]
}

function sortedOptions(set: Set<string>): OptionItem[] {
  return [...set].sort().map((k) => ({ value: k, label: titleFromSlug(k) }))
}

function sortedLanguageOptions(set: Set<string>): OptionItem[] {
  return [...set].sort().map((k) => ({
    value: k,
    label: k === 'en' ? 'English' : k === 'fa' ? 'Persian' : titleFromSlug(k),
  }))
}

export async function getTransformOptions(env: Env) {
  const { results } = await env.DB.prepare('SELECT key FROM instructions').all<{ key: string }>()
  const enFaModes = new Set<string>()
  const faEnModes = new Set<string>()
  const refineStyles = new Set<string>()
  const termStyles = new Set<string>()
  const compareLangs = new Set<string>()
  const grammarLangs = new Set<string>()
  let hasSimplify = false
  let hasSymptoms = false

  for (const item of results ?? []) {
    const key = item.key
    if (key.startsWith('en-to-fa-')) enFaModes.add(key.slice('en-to-fa-'.length))
    else if (key.startsWith('fa-to-en-')) faEnModes.add(key.slice('fa-to-en-'.length))
    else if (key.startsWith('refine-to-')) refineStyles.add(key.slice('refine-to-'.length))
    else if (key.startsWith('term-for-')) termStyles.add(key.slice('term-for-'.length))
    else if (key.startsWith('compare-')) compareLangs.add(key.slice('compare-'.length))
    else if (key.startsWith('grammar-')) grammarLangs.add(key.slice('grammar-'.length))
    else if (key === 'simplify-en') hasSimplify = true
    else if (key === 'symptoms') hasSymptoms = true
  }

  const ops: OperationOption[] = []
  if (enFaModes.size || faEnModes.size) {
    const dirs: DirectionOption[] = []
    if (enFaModes.size) dirs.push({ value: 'en-fa', label: 'English → Persian', modes: sortedOptions(enFaModes) })
    if (faEnModes.size) dirs.push({ value: 'fa-en', label: 'Persian → English', modes: sortedOptions(faEnModes) })
    ops.push({ value: 'translate', label: 'Translate', directions: dirs })
  }
  if (hasSimplify) ops.push({ value: 'simplify', label: 'Simplify' })
  if (termStyles.size) {
    ops.push({
      value: 'term',
      label: 'Term',
      styles: sortedOptions(termStyles),
      languages: [
        { value: 'en', label: 'English' },
        { value: 'fa', label: 'Persian' },
      ],
    })
  }
  if (refineStyles.size) ops.push({ value: 'refine', label: 'Refine', styles: sortedOptions(refineStyles) })
  if (hasSymptoms) ops.push({ value: 'symptoms', label: 'Symptoms' })
  if (compareLangs.size) ops.push({ value: 'compare', label: 'Compare', languages: sortedLanguageOptions(compareLangs) })
  if (grammarLangs.size) ops.push({ value: 'grammar', label: 'Grammar', languages: sortedLanguageOptions(grammarLangs) })

  ops.sort((a, b) => a.label.localeCompare(b.label))
  for (const op of ops) op.directions?.sort((a, b) => a.label.localeCompare(b.label))
  return { operations: ops }
}

export async function buildInstructionKey(req: {
  operation?: string
  direction?: string
  mode?: string
  style?: string
  language?: string
}): Promise<string> {
  const op = (req.operation || '').trim().toLowerCase()
  switch (op) {
    case 'translate': {
      const dir = (req.direction || '').trim().toLowerCase()
      const mode = normalizeSlug(req.mode)
      if (!mode) throw new Error(`invalid mode: ${req.mode}`)
      if (dir === 'en-fa') return `en-to-fa-${mode}`
      if (dir === 'fa-en') return `fa-to-en-${mode}`
      throw new Error(`invalid direction: ${req.direction}`)
    }
    case 'refine': {
      let style = normalizeSlug(req.style) || normalizeSlug(req.mode)
      if (!style) throw new Error(`invalid style: ${req.style}`)
      return `refine-to-${style}`
    }
    case 'term': {
      let style = normalizeSlug(req.style) || normalizeSlug(req.mode)
      if (!style) throw new Error(`invalid style: ${req.style}`)
      return `term-for-${style}`
    }
    case 'simplify':
      return 'simplify-en'
    case 'symptoms':
      return 'symptoms'
    case 'compare': {
      let lang = (req.language || '').trim().toLowerCase() || normalizeSlug(req.mode)
      if (lang !== 'en' && lang !== 'fa') throw new Error(`invalid language: ${req.language}`)
      return `compare-${lang}`
    }
    case 'grammar': {
      let lang = (req.language || '').trim().toLowerCase() || 'en'
      if (lang !== 'en' && lang !== 'fa') throw new Error(`invalid language: ${req.language}`)
      return `grammar-${lang}`
    }
    default:
      throw new Error(`invalid operation: ${req.operation}`)
  }
}
