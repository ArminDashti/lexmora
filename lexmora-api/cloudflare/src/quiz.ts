import type { Env, HistoryRow, HistoryType } from './types'
import { HISTORY_TYPE_DISPLAY } from './types'

type QuizQuestion = {
  history_id: string
  type: string
  type_display: string
  prompt: string
  answer: string
}

function quizPromptAnswer(row: HistoryRow): { prompt: string; answer: string } {
  const input = row.input_text.trim()
  const result = row.result_text.trim()
  if (row.type === 'en_fa') return { prompt: input, answer: result }
  if (row.type === 'fa_en') return { prompt: result, answer: input }
  return { prompt: '', answer: '' }
}

function pickNext(
  pool: HistoryRow[],
  shown: Map<string, number>,
  usedInQuiz: Set<string>,
): HistoryRow | null {
  if (!pool.length) return null
  let minAll = -1
  let minUnused = -1
  for (const row of pool) {
    const c = shown.get(row.id) ?? 0
    if (minAll < 0 || c < minAll) minAll = c
    if (!usedInQuiz.has(row.id) && (minUnused < 0 || c < minUnused)) minUnused = c
  }
  const preferUnused = minUnused >= 0
  const target = preferUnused ? minUnused : minAll
  const candidates = pool.filter((row) => {
    if ((shown.get(row.id) ?? 0) !== target) return false
    if (preferUnused && usedInQuiz.has(row.id)) return false
    return true
  })
  if (!candidates.length) return null
  return candidates[Math.floor(Math.random() * candidates.length)]
}

export async function createQuiz(env: Env, count: number) {
  if (count < 1 || count > 50) throw new Error('invalid count: must be between 1 and 50')
  let poolLimit = 500
  if (count * 10 > poolLimit) poolLimit = Math.min(count * 10, 500)

  const { results } = await env.DB.prepare(
    `SELECT id, type, input_text, result_text, model, instruction_key, metadata, created_at, quiz_shown_count
     FROM history
     WHERE type IN ('en_fa', 'fa_en')
       AND trim(input_text) <> ''
       AND trim(result_text) <> ''
     ORDER BY quiz_shown_count ASC
     LIMIT ?`,
  )
    .bind(poolLimit)
    .all<HistoryRow>()

  const pool = results ?? []
  if (!pool.length) throw new Error('no English-Persian history entries available for quiz')

  // Shuffle among same counts roughly like random()
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }

  const questions: QuizQuestion[] = []
  const selectedIDs: string[] = []
  const usedInQuiz = new Set<string>()
  const shown = new Map<string, number>()
  for (const row of pool) shown.set(row.id, row.quiz_shown_count ?? 0)

  while (questions.length < count) {
    const row = pickNext(pool, shown, usedInQuiz)
    if (!row) throw new Error('no English-Persian history entries available for quiz')
    const { prompt, answer } = quizPromptAnswer(row)
    if (!prompt || !answer) continue
    questions.push({
      history_id: row.id,
      type: row.type,
      type_display: HISTORY_TYPE_DISPLAY[row.type as HistoryType] ?? row.type,
      prompt,
      answer,
    })
    selectedIDs.push(row.id)
    usedInQuiz.add(row.id)
    shown.set(row.id, (shown.get(row.id) ?? 0) + 1)
  }

  for (const id of selectedIDs) {
    await env.DB.prepare('UPDATE history SET quiz_shown_count = quiz_shown_count + 1 WHERE id = ?')
      .bind(id)
      .run()
  }

  return { questions }
}
