const TUNISIAN_MOBILE_REGEX = /^[2459]\d{7}$/

export const sanitizeTunisianPhoneInput = (value: string) => {
  const digitsOnly = String(value || '').replace(/\D/g, '')

  if (!digitsOnly) {
    return ''
  }

  let localDigits = digitsOnly

  if (digitsOnly.startsWith('00216')) {
    localDigits = digitsOnly.slice(5)
  } else if (digitsOnly.startsWith('216') && digitsOnly.length > 8) {
    localDigits = digitsOnly.slice(3)
  }

  return localDigits.slice(0, 8)
}

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
