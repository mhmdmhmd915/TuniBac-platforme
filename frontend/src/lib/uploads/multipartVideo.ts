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
  statusPath: string
  completePath: string
  abortPath: string
  mapCompleteResponse: (data: any) => T
  onProgress?: (state: MultipartVideoUploadState) => void
  signal?: AbortSignal
}

type PersistedMultipartSession = {
  version: 1
  initiatePath: string
  uploadId: string
  key: string
  partSize: number
  totalParts: number
  fileName: string
  fileSize: number
  fileType: string
  lastModified: number
  updatedAt: number
}

const RESUMABLE_SESSION_PREFIX = 'tunibac.multipart-video.'

const getFileFingerprint = (file: File) => [file.name, file.size, file.type, file.lastModified].join(':')

const getSessionStorageKey = (file: File, initiatePath: string) =>
  `${RESUMABLE_SESSION_PREFIX}${encodeURIComponent(`${initiatePath}:${getFileFingerprint(file)}`)}`

const readPersistedSession = (storageKey: string): PersistedMultipartSession | null => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as Partial<PersistedMultipartSession> | null
    if (
      !parsed ||
      parsed.version !== 1 ||
      !parsed.uploadId ||
      !parsed.key ||
      !Number.isFinite(parsed.partSize) ||
      !Number.isFinite(parsed.totalParts)
    ) {
      window.localStorage.removeItem(storageKey)
      return null
    }

    return parsed as PersistedMultipartSession
  } catch {
    return null
  }
}

const writePersistedSession = (storageKey: string, session: PersistedMultipartSession) => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(session))
  } catch {
    // Best effort only.
  }
}

const clearPersistedSession = (storageKey: string) => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.removeItem(storageKey)
  } catch {
    // Best effort only.
  }
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
  statusPath,
  completePath,
  abortPath,
  mapCompleteResponse,
  onProgress,
  signal,
}: UploadMultipartVideoArgs<T>): Promise<{ data: T }> => {
  const storageKey = getSessionStorageKey(file, initiatePath)
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
  let partSize = 0
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
    const speedMbps =
      elapsedSeconds > 0 ? (lastSample.uploadedBytes - firstSample.uploadedBytes) / 1024 / 1024 / elapsedSeconds : 0
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

  const persistCurrentSession = () => {
    if (!uploadId || !key || !partSize || totalParts < 1) {
      return
    }

    writePersistedSession(storageKey, {
      version: 1,
      initiatePath,
      uploadId,
      key,
      partSize,
      totalParts,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      lastModified: file.lastModified,
      updatedAt: Date.now(),
    })
  }

  const abortRemoteUpload = async () => {
    if (!uploadId || !key) {
      return
    }

    try {
      await api.post(
        abortPath,
        { key, uploadId },
        {
          timeout: 0,
        }
      )
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

    const completedPartNumbers = new Set<number>()
    const restoredSession = readPersistedSession(storageKey)

    if (
      restoredSession &&
      restoredSession.fileName === file.name &&
      restoredSession.fileSize === file.size &&
      restoredSession.fileType === file.type &&
      restoredSession.lastModified === file.lastModified
    ) {
      emit('preparing', 'Resuming previous upload...')

      try {
        const statusResponse = await retryUploadOperation(
          () =>
            api.post(
              statusPath,
              {
                key: restoredSession.key,
                uploadId: restoredSession.uploadId,
              },
              {
                signal,
                timeout: 0,
              }
            ),
          { retries: 1, signal }
        )

        uploadId = String(restoredSession.uploadId || '')
        key = String(restoredSession.key || '')
        partSize = Number(restoredSession.partSize || 0)
        totalParts = Math.max(1, Number(restoredSession.totalParts || 0))

        const uploadedParts = Array.isArray(statusResponse.data?.uploadedParts) ? statusResponse.data.uploadedParts : []
        for (const uploadedPart of uploadedParts) {
          const partNumber = Number(uploadedPart?.partNumber || 0)
          const size = Number(uploadedPart?.size || 0)

          if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > totalParts) {
            continue
          }

          completedPartNumbers.add(partNumber)
          completedBytes += Math.max(0, size)
        }

        completedParts = completedPartNumbers.size
        emit(
          'uploading',
          completedPartNumbers.size > 0
            ? `Resuming upload from part ${Math.min(totalParts, completedPartNumbers.size + 1)}/${totalParts}...`
            : 'Resuming upload...'
        )
      } catch {
        clearPersistedSession(storageKey)
        uploadId = ''
        key = ''
        partSize = 0
        totalParts = 0
        completedBytes = 0
        completedParts = 0
      }
    }

    if (!uploadId || !key || !partSize || totalParts < 1) {
      const initiateResponse = await retryUploadOperation(
        () =>
          api.post(
            initiatePath,
            {
              filename: file.name,
              contentType: file.type,
              sizeBytes: file.size,
            },
            {
              signal,
              timeout: 0,
            }
          ),
        { retries: 2, signal }
      )

      uploadId = String(initiateResponse.data.uploadId || '')
      key = String(initiateResponse.data.key || '')
      partSize = Number(initiateResponse.data.partSize || 0)
      totalParts = Math.max(1, Number(initiateResponse.data.totalParts || Math.ceil(file.size / partSize)))
      persistCurrentSession()
    }

    if (!uploadId || !key || !partSize || totalParts < 1) {
      throw new Error('Invalid multipart upload session')
    }

    const maxRetries = 4
    const maxConcurrency = 3
    const pendingPartNumbers = Array.from({ length: totalParts }, (_, index) => index + 1).filter(
      (partNumber) => !completedPartNumbers.has(partNumber)
    )
    let nextPartIndex = 0

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
          emit(
            attempt > 0 ? 'retrying' : 'uploading',
            attempt > 0
              ? `Retrying part ${partNumber}/${totalParts}...`
              : `Uploading part ${partNumber}/${totalParts}...`
          )

          const signedPartResponse = await api.post(
            signPartPath,
            {
              key,
              uploadId,
              partNumber,
            },
            {
              signal: controller.signal,
              timeout: 0,
            }
          )

          await axios.put(String(signedPartResponse.data.uploadUrl || ''), chunk, {
            headers: {
              'Content-Type': file.type || 'application/octet-stream',
            },
            signal: controller.signal,
            timeout: 0,
            maxBodyLength: Number.POSITIVE_INFINITY,
            maxContentLength: Number.POSITIVE_INFINITY,
            onUploadProgress: (progressEvent) => {
              loadedByPart.set(partNumber, progressEvent.loaded || 0)
              emit('uploading', `Uploading part ${partNumber}/${totalParts}...`)
            },
          })

          if (!completedPartNumbers.has(partNumber)) {
            completedBytes += chunk.size
            completedParts += 1
            completedPartNumbers.add(partNumber)
            persistCurrentSession()
          }

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
          emit('retrying', `Network issue on part ${partNumber}/${totalParts}. Retrying chunk...`)
        }
      }
    }

    const worker = async () => {
      while (nextPartIndex < pendingPartNumbers.length) {
        const currentPartNumber = pendingPartNumbers[nextPartIndex]
        nextPartIndex += 1
        await uploadSinglePart(currentPartNumber)
      }
    }

    await Promise.all(Array.from({ length: Math.min(maxConcurrency, pendingPartNumbers.length || 1) }, () => worker()))

    if (aborted) {
      throw new DOMException('Upload aborted', 'AbortError')
    }

    emit('finalizing', 'Finalizing upload...')

    const completeResponse = await retryUploadOperation(
      () =>
        api.post(
          completePath,
          {
            key,
            uploadId,
            partNumbers: Array.from(completedPartNumbers).sort((a, b) => a - b),
            filename: file.name,
            contentType: file.type,
            sizeBytes: file.size,
          },
          {
            signal,
            timeout: 0,
          }
        ),
      { retries: 2, signal }
    )

    clearPersistedSession(storageKey)
    emit('success', 'Upload complete')

    return {
      data: mapCompleteResponse(completeResponse.data),
    }
  } catch (error) {
    if (aborted || isAbortError(error)) {
      await abortRemoteUpload()
      clearPersistedSession(storageKey)
      emit('cancelled', 'Upload cancelled')
      throw new DOMException('Upload cancelled', 'AbortError')
    }

    const resumableMessage =
      error instanceof Error
        ? `${error.message} Upload progress is saved. Re-select the same file to resume.`
        : 'Upload paused. Re-select the same file to resume.'

    emit('error', resumableMessage)
    throw new Error(resumableMessage)
  } finally {
    abortAllControllers()
    signal?.removeEventListener('abort', onAbort)
  }
}
