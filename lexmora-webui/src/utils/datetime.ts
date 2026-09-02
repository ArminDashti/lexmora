/** Format an ISO UTC timestamp as local `YYYY-MM-DD HH:mm`. */
export function formatLocalDateTime(iso?: string | null, fallback?: string | null): string {
  const raw = iso?.trim() || fallback?.trim()
  if (!raw) return ''

  let date = new Date(raw)
  if (Number.isNaN(date.getTime())) {
    // Legacy server format: 2026:07:24 15:04 (UTC-like, colon date)
    const legacy = raw.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')
    date = new Date(legacy.includes('T') || /[Z+-]\d{2}/.test(legacy) ? legacy : legacy.replace(' ', 'T') + 'Z')
  }
  if (Number.isNaN(date.getTime())) return raw

  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${hh}:${mm}`
}
