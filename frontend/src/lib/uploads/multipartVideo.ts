import axios from 'axios'
import { api } from '../api/http'
import {
  getCurrentUploadOrigin,
  isAbortError,
  isLikelyCorsUploadError,
  isTemporaryUploadError,
  retryUploadOperation,
} from './sharedUpload'

export type MultipartVideoUploadState = {
  progress: number
  uploadedBytes: number
  totalBytes: number
  speedMbps: number
  estimatedRemainingSeconds: number | null
  activeParts: number
  completedParts: number
  totalParts: number
  retryCount: number
  status: 'preparing' | 'uploading' | 'retrying' | 'finalizing' | 'success' | 'error' | 'cancelled'
  message: string
}

type UploadMultipartVideoArgs<T> = {
  file: File
  initiatePath: string
  signPartPath: string
  completePath: string
  abortPath: string
  mapCompleteResponse: (data: any) => T
  onProgress?: (state: MultipartVideoUploadState) => void
  signal?: AbortSignal
}

export const formatUploadSpeed = (speedMbps: number) => `${speedMbps.toFixed(speedMbps >= 10 ? 0 : 1)} MB/s`

export const formatRemainingTime = (seconds: number | null) => {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) {
    return '--'
  }

  if (seconds < 60) {
    return `${Math.max(1, Math.round(seconds))}s`
  }

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)
  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}

export const uploadMultipartVideo = async <T>({
  file,
  initiatePath,
  signPartPath,
  completePath,
  abortPath,
  mapCompleteResponse,
  onProgress,
  signal,
}: UploadMultipartVideoArgs<T>): Promise<{ data: T }> => {
  const progressSamples: Array<{ time: number; uploadedBytes: number }> = []
  const loadedByPart = new Map<number, number>()
  const activePartNumbers = new Set<number>()
  const activeControllers = new Map<number, AbortController>()
  let retryCount = 0
  let completedBytes = 0
  let completedParts = 0
  let totalParts = 0
  let uploadId = ''
  let key = ''
  let aborted = false

  const emit = (status: MultipartVideoUploadState['status'], message: string) => {
    const activeUploadedBytes = Array.from(activePartNumbers).reduce(
      (sum, partNumber) => sum + (loadedByPart.get(partNumber) || 0),
      0
    )
    const uploadedBytes = Math.min(file.size, completedBytes + activeUploadedBytes)
    const now = Date.now()

    progressSamples.push({ time: now, uploadedBytes })
    while (progressSamples.length > 2 && now - progressSamples[0].time > 10000) {
      progressSamples.shift()
    }

    const firstSample = progressSamples[0]
    const lastSample = progressSamples[progressSamples.length - 1]
    const elapsedSeconds = firstSample && lastSample ? Math.max((lastSample.time - firstSample.time) / 1000, 0.001) : 0
    const speedMbps = elapsedSeconds > 0 ? (lastSample.uploadedBytes - firstSample.uploadedBytes) / 1024 / 1024 / elapsedSeconds : 0
    const remainingBytes = Math.max(file.size - uploadedBytes, 0)
    const estimatedRemainingSeconds = speedMbps > 0 ? remainingBytes / 1024 / 1024 / speedMbps : null

    onProgress?.({
      progress: file.size > 0 ? Math.min(100, Math.round((uploadedBytes / file.size) * 100)) : 0,
      uploadedBytes,
      totalBytes: file.size,
      speedMbps,
      estimatedRemainingSeconds,
      activeParts: activePartNumbers.size,
      completedParts,
      totalParts,
      retryCount,
      status,
      message,
    })
  }

  const abortRemoteUpload = async () => {
    if (!uploadId || !key) {
      return
    }
    try {
      await api.post(abortPath, { key, uploadId })
    } catch {
      // Best effort cleanup only.
    }
  }

  const abortAllControllers = () => {
    activeControllers.forEach((controller) => controller.abort())
    activeControllers.clear()
  }

  const onAbort = () => {
    aborted = true
    abortAllControllers()
  }

  signal?.addEventListener('abort', onAbort)

  try {
    emit('preparing', 'Preparing multipart upload...')

    const initiateResponse = await retryUploadOperation(
      () =>
        api.post(initiatePath, {
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
        }),
      { retries: 2, signal }
    )

    uploadId = String(initiateResponse.data.uploadId || '')
    key = String(initiateResponse.data.key || '')
    const partSize = Number(initiateResponse.data.partSize || 0)
    const maxRetries = Number(initiateResponse.data.maxRetries || 4)
    const maxConcurrency = Math.max(1, Math.min(4, Number(initiateResponse.data.maxConcurrency || 3)))
    totalParts = Math.max(1, Number(initiateResponse.data.totalParts || Math.ceil(file.size / partSize)))

    if (!uploadId || !key || !partSize || totalParts < 1) {
      throw new Error('Invalid multipart upload session')
    }

    let nextPartNumber = 1
    const completedPartNumbers: number[] = []

    const uploadSinglePart = async (partNumber: number) => {
      const start = (partNumber - 1) * partSize
      const end = Math.min(start + partSize, file.size)
      const chunk = file.slice(start, end)

      for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
        if (aborted) {
          throw new DOMException('Upload aborted', 'AbortError')
        }

        const controller = new AbortController()
        activeControllers.set(partNumber, controller)
        activePartNumbers.add(partNumber)
        loadedByPart.set(partNumber, 0)

        try {
          if (attempt > 0) {
            emit('retrying', `Retrying part ${partNumber}/${totalParts}...`)
          } else {
            emit('uploading', `Uploading part ${partNumber}/${totalParts}...`)
          }

          const signedPartResponse = await retryUploadOperation(
            () =>
              api.post(signPartPath, {
                key,
                uploadId,
                partNumber,
              }),
            { retries: maxRetries, signal: controller.signal }
          )

          await retryUploadOperation(
            () =>
              axios.put(String(signedPartResponse.data.uploadUrl || ''), chunk, {
                headers: {
                  'Content-Type': file.type || 'application/octet-stream',
                },
                signal: controller.signal,
                onUploadProgress: (progressEvent) => {
                  loadedByPart.set(partNumber, progressEvent.loaded || 0)
                  emit('uploading', `Uploading part ${partNumber}/${totalParts}...`)
                },
              }),
            { retries: maxRetries, signal: controller.signal }
          )

          completedBytes += chunk.size
          completedParts += 1
          completedPartNumbers.push(partNumber)
          loadedByPart.delete(partNumber)
          activePartNumbers.delete(partNumber)
          activeControllers.delete(partNumber)
          emit('uploading', `Uploaded part ${partNumber}/${totalParts}`)
          return
        } catch (error) {
          loadedByPart.delete(partNumber)
          activePartNumbers.delete(partNumber)
          activeControllers.delete(partNumber)

          if (aborted || isAbortError(error)) {
            throw error
          }

          if (isLikelyCorsUploadError(error)) {
            const origin = getCurrentUploadOrigin()
            throw new Error(
              `Direct upload blocked by Cloudflare R2 CORS. Allow PUT, GET, HEAD and headers * from ${origin}.`
            )
          }

          if (!isTemporaryUploadError(error) || attempt >= maxRetries) {
            throw error
          }

          retryCount += 1
          emit('retrying', `Network issue on part ${partNumber}/${totalParts}. Retrying...`)
        }
      }
    }

    const worker = async () => {
      while (nextPartNumber <= totalParts) {
        const currentPartNumber = nextPartNumber
        nextPartNumber += 1
        await uploadSinglePart(currentPartNumber)
      }
    }

    await Promise.all(Array.from({ length: Math.min(maxConcurrency, totalParts) }, () => worker()))

    if (aborted) {
      throw new DOMException('Upload aborted', 'AbortError')
    }

    emit('finalizing', 'Finalizing upload...')

    const completeResponse = await retryUploadOperation(
      () =>
        api.post(completePath, {
          key,
          uploadId,
          partNumbers: completedPartNumbers.sort((a, b) => a - b),
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
        }),
      { retries: 2, signal }
    )

    emit('success', 'Upload complete')

    return {
      data: mapCompleteResponse(completeResponse.data),
    }
  } catch (error) {
    await abortRemoteUpload()

    if (aborted || isAbortError(error)) {
      emit('cancelled', 'Upload cancelled')
      throw new DOMException('Upload cancelled', 'AbortError')
    }

    emit('error', error instanceof Error ? error.message : 'Upload failed')
    throw error
  } finally {
    abortAllControllers()
    signal?.removeEventListener('abort', onAbort)
  }
}
