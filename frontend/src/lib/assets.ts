export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export const BACKEND_URL = API_BASE_URL.replace(/\/api$/, '')

export const toAssetUrl = (value?: string | null): string => {
  if (!value) return ''
  if (value.startsWith('http')) return value
  return `${BACKEND_URL}/${value.replace(/^\/+/, '')}`
}
