const PERSIAN_OR_ARABIC = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/

/** True when the first non-whitespace character is in the Arabic/Persian script. */
export function startsWithPersian(text: string): boolean {
  const trimmed = text.trimStart()
  if (!trimmed) return false
  return PERSIAN_OR_ARABIC.test(trimmed[0])
}

export function textDir(text: string): 'rtl' | 'ltr' {
  return startsWithPersian(text) ? 'rtl' : 'ltr'
}
