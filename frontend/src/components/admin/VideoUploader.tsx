import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Square, X, Video, Youtube } from 'lucide-react';
import {
  formatRemainingTime,
  formatUploadSpeed,
  type MultipartVideoUploadState,
} from '../../lib/uploads/multipartVideo';
import { logger } from '../../lib/logger';
import {
  formatYouTubeValidationText,
  isYouTubeUrl,
} from '../../lib/youtube';
import { ResponsiveVideoPlayer } from '../ui/ResponsiveVideoPlayer';

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
  allowYouTube?: boolean;
}

type VideoMode = 'upload' | 'youtube';

export const VideoUploader = ({
  value,
  onChange,
  onUpload,
  placeholder = 'Click or drag video here (up to 10 GB)',
  maxSizeBytes = 10 * 1024 * 1024 * 1024,
  allowYouTube = true,
}: VideoUploaderProps) => {
  const initialMode: VideoMode = allowYouTube && value && isYouTubeUrl(value) ? 'youtube' : 'upload';
  const [mode, setMode] = useState<VideoMode>(initialMode);
  const [ytDraft, setYtDraft] = useState<string>((allowYouTube && value && isYouTubeUrl(value) && value) || '');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadState, setUploadState] = useState<MultipartVideoUploadState | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (allowYouTube && value && isYouTubeUrl(value)) {
      setMode('youtube');
      setYtDraft(value);
    } else if (value) {
      setMode('upload');
    }
  }, [allowYouTube, value]);

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
      setFeedback({ type: 'error', text: 'File size must be 10 GB or less.' });
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
      abortControllerRef.current = null;
    }
  };

  const removeVideo = () => {
    setYtDraft('');
    onChange('');
  };

  const cancelUpload = () => {
    abortControllerRef.current?.abort();
  };

  const uploadProgress = uploadState?.progress || 0;

  const applyYoutubeDraft = () => {
    if (isYouTubeUrl(ytDraft)) {
      onChange(ytDraft.trim());
      setFeedback({ type: 'success', text: 'Lien YouTube appliqué avec succès.' });
    } else {
      setFeedback({ type: 'error', text: 'Veuillez coller un lien YouTube valide.' });
    }
  };

  const ytValidation = formatYouTubeValidationText(ytDraft);

  const hasValue = Boolean(value && String(value).trim());
  const isYtValue = allowYouTube && Boolean(value && isYouTubeUrl(value));

  return (
    <div className="space-y-3">
      {allowYouTube && (
        <div className="inline-flex items-center rounded-2xl bg-gray-100 dark:bg-white/5 p-1 gap-1 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              mode === 'upload'
                ? 'bg-white dark:bg-[#0B5ED7]/20 text-[#071840] dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Video size={16} />
            Upload to R2
          </button>
          <button
            type="button"
            onClick={() => setMode('youtube')}
            className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              mode === 'youtube'
                ? 'bg-white dark:bg-[#0B5ED7]/20 text-[#071840] dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Youtube size={16} />
            YouTube URL
          </button>
        </div>
      )}

      {mode === 'upload' ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => {
            if (!isUploading) {
              fileInputRef.current?.click();
            }
          }}
          className={`
            relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer
            transition-all duration-200
            ${
              isDragging
                ? 'border-[#0B5ED7] bg-[#0B5ED7]/10'
                : 'border-gray-300 dark:border-gray-600 hover:border-[#0B5ED7]'
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

          {hasValue && !isYtValue && !isUploading ? (
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <ResponsiveVideoPlayer src={value} className="max-h-64" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeVideo();
                }}
                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 z-10"
                type="button"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-4 bg-gray-100 dark:bg-white/5 rounded-full w-fit mx-auto">
                {isUploading ? (
                  <div className="space-y-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0B5ED7] mx-auto"></div>
                    <div className="w-40 h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#0B5ED7] transition-all duration-300"
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
                        event.stopPropagation();
                        cancelUpload();
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
                {isUploading ? uploadState?.message || 'Uploading video...' : placeholder}
              </p>
              {feedback && (
                <div
                  className={`mx-auto max-w-md rounded-xl px-3 py-2 text-xs ${
                    feedback.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : feedback.type === 'error'
                      ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                      : 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
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
      ) : (
        <div
          className={`
            relative border-2 border-dashed rounded-2xl p-6 text-left
            transition-all duration-200
            border-gray-300 dark:border-gray-600
          `}
        >
          <div className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 inline-flex items-center gap-2">
                <Youtube size={16} className="text-rose-600" />
                Collez un lien YouTube
              </span>
              <input
                type="url"
                value={ytDraft}
                onChange={(e) => setYtDraft(e.target.value)}
                onPaste={(e) => setYtDraft(e.clipboardData.getData('text') || ytDraft)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full rounded-2xl bg-gray-50 dark:bg-white/5 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5ED7]/40"
              />
              <div className="flex items-center justify-between gap-3 flex-wrap pt-0.5">
                <p
                  className={`text-xs font-medium ${
                    ytValidation.valid
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {ytValidation.text}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setYtDraft('');
                      removeVideo();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
                  >
                    <X size={12} />
                    Effacer
                  </button>
                  <button
                    type="button"
                    disabled={!ytValidation.valid}
                    onClick={applyYoutubeDraft}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-bold text-white transition-all ${
                      ytValidation.valid
                        ? 'bg-[#0B5ED7] hover:bg-[#071840] hover:-translate-y-0.5 shadow-[0_10px_24px_-12px_rgba(11,94,215,0.8)]'
                        : 'bg-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Utiliser ce lien
                  </button>
                </div>
              </div>
            </label>

            {isYtValue && value ? (
              <div className="pt-2 space-y-2">
                <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Aperçu vidéo YouTube</div>
                <div className="relative">
                  <ResponsiveVideoPlayer src={value} className="max-h-64" />
                  <button
                    type="button"
                    onClick={removeVideo}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 z-10"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ) : ytValidation.valid ? (
              <div className="pt-2 space-y-2">
                <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Aperçu avant validation</div>
                <ResponsiveVideoPlayer src={ytDraft} className="max-h-64" />
              </div>
            ) : null}

            {feedback && (
              <div
                className={`mt-1 rounded-xl px-3 py-2 text-xs ${
                  feedback.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : feedback.type === 'error'
                    ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                    : 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                }`}
              >
                <span>{feedback.text}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
