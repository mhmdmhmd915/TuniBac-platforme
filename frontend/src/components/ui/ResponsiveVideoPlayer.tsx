import { Play } from 'lucide-react'
import { isYouTubeUrl, toYouTubeEmbedUrl } from '../../lib/youtube'

interface ResponsiveVideoPlayerProps {
  src?: string | null
  title?: string
  className?: string
  allowFullScreen?: boolean
}

export function isVideoAvailable(src: string | null | undefined): src is string {
  return Boolean(src && String(src).trim())
}

export function ResponsiveVideoPlayer({
  src,
  title = 'Lecture vidéo',
  className = '',
  allowFullScreen = true,
}: ResponsiveVideoPlayerProps) {
  if (!isVideoAvailable(src)) {
    return (
      <div
        className={`w-full aspect-video rounded-3xl border-2 border-dashed border-blue-200 bg-blue-50/40 flex flex-col items-center justify-center p-8 text-center ${className}`}
      >
        <Play size={56} className="text-blue-700/40 mb-3" strokeWidth={1.5} />
        <h4 className="text-xl font-bold text-[#071840] mb-1">Vidéo non disponible</h4>
        <p className="text-sm text-slate-600 max-w-md">
          Aucune vidéo n'a été configurée pour cette section pour l'instant.
        </p>
      </div>
    )
  }

  const yt = isYouTubeUrl(src) ? toYouTubeEmbedUrl(src) : null

  if (yt) {
    return (
      <div
        className={`w-full aspect-video rounded-3xl overflow-hidden border border-blue-100 shadow-[0_18px_40px_-20px_rgba(7,24,64,0.35)] bg-black ${className}`}
      >
        <iframe
          src={yt}
          title={title}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen={allowFullScreen}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    )
  }

  return (
    <div
      className={`w-full aspect-video rounded-3xl overflow-hidden border border-blue-100 shadow-[0_18px_40px_-20px_rgba(7,24,64,0.35)] bg-black ${className}`}
    >
      <video
        src={src}
        controls
        playsInline
        preload="metadata"
        className="w-full h-full"
        title={title}
      />
    </div>
  )
}

export default ResponsiveVideoPlayer
