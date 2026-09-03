export type Env = {
  DB: D1Database
  JWT_SECRET: string
  DEFAULT_USERNAME?: string
  DEFAULT_PASSWORD?: string
  CORS_ORIGINS?: string
}

export type HistoryType =
  | 'simplify'
  | 'en_fa'
  | 'fa_en'
  | 'term_en'
  | 'term_fa'
  | 'refine'
  | 'symptoms'
  | 'compare_en'
  | 'compare_fa'
  | 'grammar_en'
  | 'grammar_fa'

export const HISTORY_TYPE_DISPLAY: Record<HistoryType, string> = {
  simplify: 'Simplify',
  en_fa: 'English-Persian',
  fa_en: 'Persian-English',
  term_en: 'Term English',
  term_fa: 'Term Persian',
  refine: 'Refine',
  symptoms: 'Symptoms',
  compare_en: 'Compare English',
  compare_fa: 'Compare Persian',
  grammar_en: 'Grammar English',
  grammar_fa: 'Grammar Persian',
}

export type UserRow = {
  id: string
  username: string
  password_hash: string
  created_at: string
}

export type SettingsRow = {
  openrouter_api_key: string
  model_name: string
  updated_at: string
}

export type InstructionRow = {
  key: string
  content: string
  updated_at: string
}

export type HistoryRow = {
  id: string
  type: HistoryType
  input_text: string
  result_text: string
  model: string
  instruction_key: string
  metadata: string | null
  created_at: string
  quiz_shown_count?: number
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}:${pad(d.getUTCMonth() + 1)}:${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}

export function enrichHistory(row: HistoryRow) {
  let metadata: unknown
  if (row.metadata) {
    try {
      metadata = JSON.parse(row.metadata)
    } catch {
      metadata = row.metadata
    }
  }
  return {
    id: row.id,
    type: row.type,
    type_display: HISTORY_TYPE_DISPLAY[row.type] ?? row.type,
    input_text: row.input_text,
    result_text: row.result_text,
    model: row.model,
    instruction_key: row.instruction_key,
    metadata,
    created_at: row.created_at,
    formatted_date: formatDateTime(row.created_at),
  }
}
