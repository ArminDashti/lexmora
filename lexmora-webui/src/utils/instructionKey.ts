export interface InstructionContext {
  operation: string
  direction?: string
  mode?: string
  style?: string
  language?: string
}

function normalizeSlug(value: string): string {
  const s = value.trim().toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-')
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) ? s : ''
}

export function buildInstructionKey(ctx: InstructionContext): string | null {
  const op = ctx.operation.trim().toLowerCase()

  switch (op) {
    case 'translate': {
      const dir = (ctx.direction ?? '').trim().toLowerCase()
      const mode = normalizeSlug(ctx.mode ?? '')
      if (!mode) return null
      if (dir === 'en-fa') return `en-to-fa-${mode}`
      if (dir === 'fa-en') return `fa-to-en-${mode}`
      return null
    }
    case 'refine': {
      const style = normalizeSlug(ctx.style ?? ctx.mode ?? '')
      return style ? `refine-to-${style}` : null
    }
    case 'term': {
      const style = normalizeSlug(ctx.style ?? ctx.mode ?? '')
      return style ? `term-for-${style}` : null
    }
    case 'simplify':
      return 'simplify-en'
    case 'symptoms':
      return 'symptoms'
    case 'compare': {
      const lang = (ctx.language ?? 'en').trim().toLowerCase()
      return lang === 'en' || lang === 'fa' ? `compare-${lang}` : null
    }
    case 'grammar': {
      const lang = (ctx.language ?? 'en').trim().toLowerCase()
      return lang === 'en' || lang === 'fa' ? `grammar-${lang}` : null
    }
    default:
      return null
  }
}

export function instructionKeyFilename(key: string): string {
  return `${key}.md`
}

export function buildInstructionQuery(ctx: InstructionContext): Record<string, string> {
  const q: Record<string, string> = { operation: ctx.operation }
  if (ctx.direction) q.direction = ctx.direction
  if (ctx.mode) q.mode = ctx.mode
  if (ctx.style) q.style = ctx.style
  if (ctx.language) q.language = ctx.language
  return q
}
