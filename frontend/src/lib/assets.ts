import { isBundledBrandAsset } from './brand'

const DEFAULT_LOCAL_API_BASE_URL = 'http://localhost:5000/api'
const DEFAULT_PROD_API_BASE_URL = 'https://tunibac-platforme.onrender.com/api'

const normalizeApiBaseUrl = (value?: string) => {
  const trimmed = String(value || '').trim()

  if (!trimmed) {
    return import.meta.env.PROD ? DEFAULT_PROD_API_BASE_URL : DEFAULT_LOCAL_API_BASE_URL
  }

  let url: URL | null = null
  try {
    url = new URL(trimmed)
  } catch {
    url = null
  }

  if (!url) {
    return import.meta.env.PROD ? DEFAULT_PROD_API_BASE_URL : DEFAULT_LOCAL_API_BASE_URL
  }

  if (import.meta.env.PROD && /(^|\.)tunibac-frontend\.onrender\.com$/i.test(url.hostname)) {
    return DEFAULT_PROD_API_BASE_URL
  }

  const normalizedPath = url.pathname.replace(/\/+$/, '')
  url.pathname = normalizedPath.endsWith('/api') ? normalizedPath : `${normalizedPath || ''}/api`
  url.search = ''
  url.hash = ''
  return url.toString().replace(/\/$/, '')
}

export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL)

export const BACKEND_URL = API_BASE_URL.replace(/\/api$/, '')

export const toAssetUrl = (value?: string | null): string => {
  if (!value) return ''
  if (value.startsWith('http')) return value
  if (isBundledBrandAsset(value)) return value
  return `${BACKEND_URL}/${value.replace(/^\/+/, '')}`
}
