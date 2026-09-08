export interface InstructionContext {
  operation: string
  direction?: string
  mode?: string
  topic?: string
  style?: string
  language?: string
}

function normalizeSlug(value: string): string {
  const s = value.trim().toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-')
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) ? s : ''
}

function normalizeDirection(dir: string): string {
  switch (dir.trim().toLowerCase()) {
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

export function buildInstructionKey(ctx: InstructionContext): string | null {
  const op = ctx.operation.trim().toLowerCase()

  switch (op) {
    case 'translate': {
      const dir = normalizeDirection(ctx.direction ?? '')
      const mode = normalizeSlug(ctx.mode ?? '')
      if (!mode) return null
      if (dir !== 'english-persian' && dir !== 'persian-english') return null
      if (mode === 'scientific') {
        const topic = normalizeSlug(ctx.topic ?? '') || 'general'
        return `translate-${dir}-scientific-${topic}`
      }
      return `translate-${dir}-${mode}`
    }
    case 'cursor': {
      const dir = normalizeDirection(ctx.direction ?? '')
      const mode = normalizeSlug(ctx.mode ?? '')
      if (dir !== 'persian-english') return null
      if (mode !== 'skill' && mode !== 'agent') return null
      return `cursor-persian-english-${mode}`
    }
    case 'frontend': {
      const dir = normalizeDirection(ctx.direction ?? '')
      const mode = normalizeSlug(ctx.mode ?? '')
      if (mode !== 'for-agent') return null
      if (dir !== 'persian-english' && dir !== 'english-english') return null
      return `frontend-${dir}-for-agent`
    }
    case 'refine': {
      const style = normalizeSlug(ctx.style ?? ctx.mode ?? '')
      return style ? `refine-english-english-${style}` : null
    }
    case 'term': {
      const style = normalizeSlug(ctx.style ?? ctx.mode ?? '')
      return style ? `term-english-english-${style}` : null
    }
    case 'simplify':
      return 'simplify-english-english'
    case 'symptoms':
      return 'symptoms-english-english'
    case 'compare': {
      const lang = (ctx.language ?? 'en').trim().toLowerCase()
      if (lang === 'en') return 'compare-english-english'
      if (lang === 'fa') return 'compare-persian-persian'
      return null
    }
    case 'grammar': {
      const lang = (ctx.language ?? 'en').trim().toLowerCase()
      if (lang === 'en') return 'grammar-english-english'
      if (lang === 'fa') return 'grammar-persian-persian'
      return null
    }
    default:
      return null
  }
}

/** Title-Case each hyphen segment → Translate-English-Persian-General.md */
export function instructionKeyFilename(key: string): string {
  const titled = key
    .split('-')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join('-')
  return `${titled}.md`
}

export function buildInstructionQuery(ctx: InstructionContext): Record<string, string> {
  const q: Record<string, string> = { operation: ctx.operation }
  if (ctx.direction) q.direction = ctx.direction
  if (ctx.mode) q.mode = ctx.mode
  if (ctx.topic) q.topic = ctx.topic
  if (ctx.style) q.style = ctx.style
  if (ctx.language) q.language = ctx.language
  return q
}
