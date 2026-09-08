export function parseYouTubeId(url: string): string | null {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()
  if (!trimmed) return null

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|m\.youtube\.com\/watch\?v=)([A-Za-z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([A-Za-z0-9_-]{11})/,
  ]

  for (const pattern of patterns) {
    const match = trimmed.match(pattern)
    if (match && match[1] && /^[A-Za-z0-9_-]{11}$/.test(match[1])) {
      return match[1]
    }
  }

  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) {
    return trimmed
  }

  return null
}

export function isYouTubeUrl(url: string): boolean {
  return parseYouTubeId(url) !== null
}

export function toYouTubeEmbedUrl(urlOrId: string): string | null {
  const id = parseYouTubeId(urlOrId)
  if (!id) return null
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1`
}

export function formatYouTubeValidationText(url: string): { valid: boolean; text: string } {
  if (!url || !url.trim()) {
    return { valid: false, text: 'Collez un lien YouTube ci-dessus' }
  }
  const ok = isYouTubeUrl(url)
  return ok
    ? { valid: true, text: '✅ Lien YouTube valide' }
    : { valid: false, text: '⚠ Lien YouTube invalide (ex: https://www.youtube.com/watch?v=...)' }
}
