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
  topic?: string
  movie_name?: string
  language?: string
  style?: string
}

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const knownDirections = [
  'english-persian',
  'persian-english',
  'english-english',
  'persian-persian',
] as const

function normalizeSlug(value?: string): string {
  if (!value) return ''
  const s = value.trim().toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-')
  return slugPattern.test(s) ? s : ''
}

function normalizeDirection(dir?: string): string {
  switch ((dir || '').trim().toLowerCase()) {
    case 'en-fa':
    case 'english-persian':
      return 'english-persian'
    case 'fa-en':
    case 'persian-english':
      return 'persian-english'
    case 'en-en':
    case 'english-english':
      return 'english-english'
    case 'fa-fa':
    case 'persian-persian':
      return 'persian-persian'
    default:
      return ''
  }
}

function directionLabel(dir: string): string {
  switch (dir) {
    case 'english-persian':
      return 'English → Persian'
    case 'persian-english':
      return 'Persian → English'
    case 'english-english':
      return 'English → English'
    case 'persian-persian':
      return 'Persian → Persian'
    default:
      return titleFromSlug(dir)
  }
}

function titleFromSlug(slug: string): string {
  return slug
    .split('-')
    .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p))
    .join(' ')
}

function translateInstructionKey(dir: string, mode: string, topic?: string): string {
  if (mode === 'scientific') {
    const t = normalizeSlug(topic) || 'general'
    return `translate-${dir}-scientific-${t}`
  }
  return `translate-${dir}-${mode}`
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
      const dir = normalizeDirection(req.direction)
      const mode = normalizeSlug(req.mode)
      if (!mode) throw new Error(`invalid translate mode: ${req.mode}`)
      if (dir !== 'english-persian' && dir !== 'persian-english') {
        throw new Error(`invalid translate direction: ${req.direction}`)
      }
      const historyType: HistoryType = dir === 'english-persian' ? 'en_fa' : 'fa_en'
      const key = translateInstructionKey(dir, mode, req.topic)
      if (mode === 'scientific') {
        metadata.topic = normalizeSlug(req.topic) || 'general'
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
    case 'cursor': {
      const dir = normalizeDirection(req.direction)
      const mode = normalizeSlug(req.mode)
      if (dir !== 'persian-english') throw new Error(`invalid cursor direction: ${req.direction}`)
      if (mode !== 'skill' && mode !== 'agent') throw new Error(`invalid cursor mode: ${req.mode}`)
      const key = `cursor-persian-english-${mode}`
      await requireInstruction(env, key)
      return { historyType: 'cursor', instructionKey: key, userText: text, metadata }
    }
    case 'frontend': {
      const dir = normalizeDirection(req.direction)
      const mode = normalizeSlug(req.mode)
      if (mode !== 'for-agent') throw new Error(`invalid frontend mode: ${req.mode}`)
      if (dir !== 'persian-english' && dir !== 'english-english') {
        throw new Error(`invalid frontend direction: ${req.direction}`)
      }
      const key = `frontend-${dir}-for-agent`
      await requireInstruction(env, key)
      return { historyType: 'frontend', instructionKey: key, userText: text, metadata }
    }
    case 'simplify': {
      const key = 'simplify-english-english'
      await requireInstruction(env, key)
      return { historyType: 'simplify', instructionKey: key, userText: text, metadata }
    }
    case 'term': {
      const lang = (req.language || '').trim().toLowerCase()
      const style = normalizeSlug(req.style)
      if (!style) throw new Error(`invalid term style: ${req.style}`)
      const key = `term-english-english-${style}`
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
      const key = `refine-english-english-${style}`
      await requireInstruction(env, key)
      return { historyType: 'refine', instructionKey: key, userText: text, metadata }
    }
    case 'symptoms': {
      const key = 'symptoms-english-english'
      await requireInstruction(env, key)
      return { historyType: 'symptoms', instructionKey: key, userText: text, metadata }
    }
    case 'compare': {
      const lang = (req.language || '').trim().toLowerCase() || 'en'
      const text1 = (req.text1 || '').trim()
      const text2 = (req.text2 || '').trim()
      metadata.text1 = text1
      metadata.text2 = text2
      metadata.language = lang
      const key = lang === 'en' ? 'compare-english-english' : lang === 'fa' ? 'compare-persian-persian' : ''
      if (!key) throw new Error(`invalid compare language: ${req.language}`)
      await requireInstruction(env, key)
      const userMsg = `Compare these two words or phrases:\n\n1: ${text1}\n2: ${text2}`
      if (lang === 'en') return { historyType: 'compare_en', instructionKey: key, userText: userMsg, metadata }
      return { historyType: 'compare_fa', instructionKey: key, userText: userMsg, metadata }
    }
    case 'grammar': {
      const lang = (req.language || '').trim().toLowerCase() || 'en'
      metadata.language = lang
      const key = lang === 'en' ? 'grammar-english-english' : lang === 'fa' ? 'grammar-persian-persian' : ''
      if (!key) throw new Error(`invalid grammar language: ${req.language}`)
      await requireInstruction(env, key)
      if (lang === 'en') return { historyType: 'grammar_en', instructionKey: key, userText: text, metadata }
      return { historyType: 'grammar_fa', instructionKey: key, userText: text, metadata }
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
type ModeOption = { value: string; label: string; topics?: OptionItem[] }
type DirectionOption = { value: string; label: string; modes: ModeOption[] }
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

function splitOpDirMode(rest: string): { dir: string; mode: string; topic: string } | null {
  for (const d of knownDirections) {
    if (rest === d) return { dir: d, mode: '', topic: '' }
    const prefix = `${d}-`
    if (!rest.startsWith(prefix)) continue
    const modePart = rest.slice(prefix.length)
    if (!modePart) return { dir: d, mode: '', topic: '' }
    if (modePart.startsWith('scientific-')) {
      const topic = modePart.slice('scientific-'.length)
      if (!topic) return null
      return { dir: d, mode: 'scientific', topic }
    }
    return { dir: d, mode: modePart, topic: '' }
  }
  return null
}

function buildDirectionOptions(store: Map<string, Map<string, Set<string>>>): DirectionOption[] {
  const dirs: DirectionOption[] = []
  for (const [dir, modes] of store) {
    const modeOpts: ModeOption[] = [...modes.keys()].sort().map((m) => {
      const topics = modes.get(m)!
      const opt: ModeOption = { value: m, label: titleFromSlug(m) }
      if (topics.size > 0 || m === 'scientific') {
        opt.topics = [...topics].sort().map((t) => ({ value: t, label: titleFromSlug(t) }))
      }
      return opt
    })
    dirs.push({ value: dir, label: directionLabel(dir), modes: modeOpts })
  }
  return dirs
}

function ensureMode(
  store: Map<string, Map<string, Set<string>>>,
  dir: string,
  mode: string,
  topic: string,
) {
  if (!store.has(dir)) store.set(dir, new Map())
  const modes = store.get(dir)!
  if (!modes.has(mode)) modes.set(mode, new Set())
  if (topic) modes.get(mode)!.add(topic)
}

export async function getTransformOptions(env: Env) {
  const { results } = await env.DB.prepare('SELECT key FROM instructions').all<{ key: string }>()
  const translateDirs = new Map<string, Map<string, Set<string>>>()
  const cursorDirs = new Map<string, Map<string, Set<string>>>()
  const frontendDirs = new Map<string, Map<string, Set<string>>>()
  const refineStyles = new Set<string>()
  const termStyles = new Set<string>()
  const compareLangs = new Set<string>()
  const grammarLangs = new Set<string>()
  let hasSimplify = false
  let hasSymptoms = false

  for (const item of results ?? []) {
    const key = item.key
    if (key.startsWith('translate-')) {
      const parsed = splitOpDirMode(key.slice('translate-'.length))
      if (parsed) ensureMode(translateDirs, parsed.dir, parsed.mode, parsed.topic)
    } else if (key.startsWith('cursor-')) {
      const parsed = splitOpDirMode(key.slice('cursor-'.length))
      if (parsed) ensureMode(cursorDirs, parsed.dir, parsed.mode, parsed.topic)
    } else if (key.startsWith('frontend-')) {
      const parsed = splitOpDirMode(key.slice('frontend-'.length))
      if (parsed) ensureMode(frontendDirs, parsed.dir, parsed.mode, parsed.topic)
    } else if (key.startsWith('refine-english-english-')) {
      refineStyles.add(key.slice('refine-english-english-'.length))
    } else if (key.startsWith('term-english-english-')) {
      termStyles.add(key.slice('term-english-english-'.length))
    } else if (key === 'compare-english-english') compareLangs.add('en')
    else if (key === 'compare-persian-persian') compareLangs.add('fa')
    else if (key === 'grammar-english-english') grammarLangs.add('en')
    else if (key === 'grammar-persian-persian') grammarLangs.add('fa')
    else if (key === 'simplify-english-english') hasSimplify = true
    else if (key === 'symptoms-english-english') hasSymptoms = true
  }

  const ops: OperationOption[] = []
  if (translateDirs.size) ops.push({ value: 'translate', label: 'Translate', directions: buildDirectionOptions(translateDirs) })
  if (cursorDirs.size) ops.push({ value: 'cursor', label: 'Cursor', directions: buildDirectionOptions(cursorDirs) })
  if (frontendDirs.size) ops.push({ value: 'frontend', label: 'Frontend', directions: buildDirectionOptions(frontendDirs) })
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
  topic?: string
  style?: string
  language?: string
}): Promise<string> {
  const op = (req.operation || '').trim().toLowerCase()
  switch (op) {
    case 'translate': {
      const dir = normalizeDirection(req.direction)
      const mode = normalizeSlug(req.mode)
      if (!mode) throw new Error(`invalid mode: ${req.mode}`)
      if (dir !== 'english-persian' && dir !== 'persian-english') {
        throw new Error(`invalid direction: ${req.direction}`)
      }
      return translateInstructionKey(dir, mode, req.topic)
    }
    case 'cursor': {
      const dir = normalizeDirection(req.direction)
      const mode = normalizeSlug(req.mode)
      if (dir !== 'persian-english') throw new Error(`invalid direction: ${req.direction}`)
      if (mode !== 'skill' && mode !== 'agent') throw new Error(`invalid mode: ${req.mode}`)
      return `cursor-persian-english-${mode}`
    }
    case 'frontend': {
      const dir = normalizeDirection(req.direction)
      const mode = normalizeSlug(req.mode)
      if (mode !== 'for-agent') throw new Error(`invalid mode: ${req.mode}`)
      if (dir !== 'persian-english' && dir !== 'english-english') {
        throw new Error(`invalid direction: ${req.direction}`)
      }
      return `frontend-${dir}-for-agent`
    }
    case 'refine': {
      const style = normalizeSlug(req.style) || normalizeSlug(req.mode)
      if (!style) throw new Error(`invalid style: ${req.style}`)
      return `refine-english-english-${style}`
    }
    case 'term': {
      const style = normalizeSlug(req.style) || normalizeSlug(req.mode)
      if (!style) throw new Error(`invalid style: ${req.style}`)
      return `term-english-english-${style}`
    }
    case 'simplify':
      return 'simplify-english-english'
    case 'symptoms':
      return 'symptoms-english-english'
    case 'compare': {
      const lang = (req.language || '').trim().toLowerCase() || normalizeSlug(req.mode)
      if (lang === 'en') return 'compare-english-english'
      if (lang === 'fa') return 'compare-persian-persian'
      throw new Error(`invalid language: ${req.language}`)
    }
    case 'grammar': {
      const lang = (req.language || '').trim().toLowerCase() || 'en'
      if (lang === 'en') return 'grammar-english-english'
      if (lang === 'fa') return 'grammar-persian-persian'
      throw new Error(`invalid language: ${req.language}`)
    }
    default:
      throw new Error(`invalid operation: ${req.operation}`)
  }
}
