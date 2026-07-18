const TUNISIAN_MOBILE_REGEX = /^[2459]\d{7}$/

export const normalizeTunisianPhone = (value: string) => {
  const raw = String(value || '').trim()
  if (!raw) {
    return null
  }

  const sanitized = raw.replace(/[\s()-]/g, '')

  let localDigits = sanitized

  if (sanitized.startsWith('+216')) {
    localDigits = sanitized.slice(4)
  } else if (sanitized.startsWith('00216')) {
    localDigits = sanitized.slice(5)
  } else if (sanitized.startsWith('216') && sanitized.length === 11) {
    localDigits = sanitized.slice(3)
  }

  if (!/^\d{8}$/.test(localDigits)) {
    return null
  }

  if (!TUNISIAN_MOBILE_REGEX.test(localDigits)) {
    return null
  }

  return `+216${localDigits}`
}
