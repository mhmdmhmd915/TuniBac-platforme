import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Square, X, Video } from 'lucide-react';
import {
  formatRemainingTime,
  formatUploadSpeed,
  type MultipartVideoUploadState,
} from '../../lib/uploads/multipartVideo';
import { logger } from '../../lib/logger';

interface VideoUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  onUpload: (
    file: File,
    options: {
      signal: AbortSignal;
      onProgress?: (state: MultipartVideoUploadState) => void;
    }
  ) => Promise<string>;
  placeholder?: string;
  maxSizeBytes?: number;
}

export const VideoUploader = ({
  value,
  onChange,
  onUpload,
  placeholder = 'Click or drag video here (up to 5 GB)',
  maxSizeBytes = 5 * 1024 * 1024 * 1024,
}: VideoUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadState, setUploadState] = useState<MultipartVideoUploadState | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortControllerRef.current?.abort(), []);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await handleFile(file);
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      setFeedback({ type: 'error', text: 'Please upload a valid video file.' });
      return;
    }
    if (file.size > maxSizeBytes) {
      setFeedback({ type: 'error', text: 'File size must be 5 GB or less.' });
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsUploading(true);
    setUploadState(null);
    setFeedback({ type: 'info', text: 'Starting upload...' });

    try {
      const url = await onUpload(file, {
        signal: controller.signal,
        onProgress: (state) => {
          setUploadState(state);
          if (state.status === 'retrying') {
            setFeedback({ type: 'info', text: state.message });
          }
        },
      });
      onChange(url);
      setFeedback({ type: 'success', text: 'Video uploaded successfully.' });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setFeedback({ type: 'info', text: 'Upload cancelled.' });
      } else {
        logger.error('Video upload failed', error);
        setFeedback({
          type: 'error',
          text: error instanceof Error ? error.message : 'Video upload failed. Please try again.',
        });
      }
    } finally {
      setIsUploading(false);
      setUploadState((current) => {
        if (!current) return null;
        return current.status === 'success' ? current : null;
      });
      abortControllerRef.current = null;
    }
  };

  const removeVideo = () => {
    onChange('');
  };

  const cancelUpload = () => {
    abortControllerRef.current?.abort();
  };

  const uploadProgress = uploadState?.progress || 0;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => {
        if (!isUploading) {
          fileInputRef.current?.click()
        }
      }}
      className={`
        relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer
        transition-all duration-200
        ${
          isDragging
            ? 'border-[#FFD700] bg-[#FFD700]/10'
            : 'border-gray-300 dark:border-gray-600 hover:border-[#FFD700]'
        }
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.currentTarget.value = '';
          if (file) await handleFile(file);
        }}
      />

      {value ? (
        <div className="relative">
          <video
            src={value}
            controls
            className="max-h-64 mx-auto rounded-xl"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeVideo();
            }}
            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="p-4 bg-gray-100 dark:bg-white/5 rounded-full w-fit mx-auto">
            {isUploading ? (
              <div className="space-y-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FFD700] mx-auto"></div>
                <div className="w-40 h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#FFD700] transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500">{uploadProgress}%</p>
                <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                  <p>{uploadState?.message || 'Uploading video...'}</p>
                  <p>
                    Speed: {formatUploadSpeed(uploadState?.speedMbps || 0)} | Remaining:{' '}
                    {formatRemainingTime(uploadState?.estimatedRemainingSeconds ?? null)}
                  </p>
                  <p>
                    Parts: {uploadState?.completedParts || 0}/{uploadState?.totalParts || 0}
                    {uploadState?.retryCount ? ` | Retries: ${uploadState.retryCount}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    cancelUpload()
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white hover:bg-red-600"
                >
                  <Square size={12} />
                  Cancel Upload
                </button>
              </div>
            ) : (
              <Video className="text-gray-400" size={32} />
            )}
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            {isUploading ? 'Uploading directly to Cloudflare R2...' : placeholder}
          </p>
          {feedback && (
            <div
              className={`mx-auto max-w-md rounded-xl px-3 py-2 text-xs ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : feedback.type === 'error'
                  ? 'bg-red-500/10 text-red-400'
                  : 'bg-sky-500/10 text-sky-400'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                {uploadState?.retryCount ? <RotateCcw size={12} /> : null}
                <span>{feedback.text}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
