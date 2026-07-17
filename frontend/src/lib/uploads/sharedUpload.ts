import axios, { type AxiosProgressEvent } from 'axios'
import { api } from '../api/http'

type RetryableUploadOptions = {
  retries?: number
  retryDelayMs?: number
  signal?: AbortSignal
}

type UploadToSignedUrlArgs = RetryableUploadOptions & {
  uploadUrl: string
  body: Blob | File
  contentType?: string
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void
}

type UploadFileViaBackendArgs<T> = RetryableUploadOptions & {
  method?: 'post' | 'put' | 'patch'
  endpoint: string
  formData: FormData
  mapResponse: (data: any) => T
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void
}

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

export const getCurrentUploadOrigin = () =>
  typeof window !== 'undefined' ? window.location.origin : 'your frontend origin'

export const isAbortError = (error: unknown) =>
  axios.isCancel(error) ||
  (error instanceof DOMException && error.name === 'AbortError') ||
  (typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    String((error as { code?: string }).code || '') === 'ERR_CANCELED')

export const isTemporaryUploadError = (error: unknown) => {
  if (!axios.isAxiosError(error)) {
    return false
  }

  if (error.code === 'ERR_CANCELED') {
    return false
  }

  if (!error.response) {
    return error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED' || error.code === undefined
  }

  return [408, 409, 425, 429].includes(error.response.status) || error.response.status >= 500
}

export const isLikelyCorsUploadError = (error: unknown) =>
  axios.isAxiosError(error) && error.code === 'ERR_NETWORK' && !error.response

export const retryUploadOperation = async <T>(
  operation: () => Promise<T>,
  { retries = 2, retryDelayMs = 500, signal }: RetryableUploadOptions = {}
): Promise<T> => {
  for (let attempt = 0; ; attempt += 1) {
    if (signal?.aborted) {
      throw new DOMException('Upload aborted', 'AbortError')
    }

    try {
      return await operation()
    } catch (error) {
      if (isAbortError(error) || !isTemporaryUploadError(error) || attempt >= retries) {
        throw error
      }

      const delayMs = Math.min(5000, retryDelayMs * 2 ** attempt)
      await wait(delayMs)
    }
  }
}

export const uploadToSignedUrl = async ({
  uploadUrl,
  body,
  contentType,
  onUploadProgress,
  retries = 2,
  retryDelayMs = 500,
  signal,
}: UploadToSignedUrlArgs) =>
  retryUploadOperation(
    () =>
      axios.put(uploadUrl, body, {
        signal,
        headers: {
          'Content-Type': contentType || (body instanceof File ? body.type : 'application/octet-stream'),
        },
        onUploadProgress,
      }),
    { retries, retryDelayMs, signal }
  )

export const uploadFileViaBackend = async <T>({
  method = 'post',
  endpoint,
  formData,
  mapResponse,
  onUploadProgress,
  retries = 2,
  retryDelayMs = 500,
  signal,
}: UploadFileViaBackendArgs<T>): Promise<{ data: T }> =>
  retryUploadOperation(
    async () => {
      const response = await api.request({
        method,
        url: endpoint,
        data: formData,
        signal,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress,
      })

      return {
        data: mapResponse(response.data),
      }
    },
    { retries, retryDelayMs, signal }
  )
