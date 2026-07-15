import { useMemo, useState } from 'react'
import { Expand, MessageCircle, X } from 'lucide-react'
import { toAssetUrl } from '../lib/assets'

type ProfessorAdvertisementCardProps = {
  image?: string | null
  teacherName?: string | null
  subject?: string | null
  description?: string | null
  whatsapp?: string | null
  className?: string
}

const normalizeWhatsapp = (value?: string | null) => String(value || '').replace(/\D+/g, '')

const ProfessorAdvertisementCard = ({
  image,
  teacherName,
  subject,
  description,
  whatsapp,
  className = '',
}: ProfessorAdvertisementCardProps) => {
  const [isImageOpen, setIsImageOpen] = useState(false)
  const whatsappNumber = useMemo(() => normalizeWhatsapp(whatsapp), [whatsapp])
  const imageUrl = image ? toAssetUrl(image) : ''

  const hasContent = Boolean(
    imageUrl || teacherName?.trim() || subject?.trim() || description?.trim() || whatsappNumber
  )

  if (!hasContent) {
    return null
  }

  return (
    <>
      <section
        className={`rounded-3xl border border-black/5 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/5 ${className}`}
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="md:w-56 md:flex-shrink-0">
            {imageUrl ? (
              <button
                type="button"
                onClick={() => setIsImageOpen(true)}
                className="group relative block w-full overflow-hidden rounded-3xl bg-slate-100 dark:bg-white/10"
              >
                <img
                  src={imageUrl}
                  alt={teacherName?.trim() || 'Professor advertisement'}
                  className="h-72 w-full object-cover transition duration-300 group-hover:scale-[1.02] md:h-64"
                />
                <span className="absolute right-3 top-3 inline-flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white">
                  <Expand size={14} />
                  Enlarge
                </span>
              </button>
            ) : (
              <div className="flex h-56 items-center justify-center rounded-3xl bg-slate-100 text-sm text-slate-500 dark:bg-white/10 dark:text-slate-300">
                Professor Advertisement
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
                Professor Advertisement
              </p>
              {teacherName?.trim() && (
                <h3 className="text-2xl font-bold text-text-light dark:text-text">
                  {teacherName}
                </h3>
              )}
              {subject?.trim() && (
                <p className="text-sm font-semibold text-text-muted-light dark:text-text-muted">
                  {subject}
                </p>
              )}
            </div>

            {description?.trim() && (
              <p className="text-base leading-relaxed text-text-muted-light dark:text-text-muted">
                {description}
              </p>
            )}

            {whatsappNumber && (
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent px-5 py-3 font-semibold text-primary transition hover:scale-[1.02]"
              >
                <MessageCircle size={18} />
                <span>Contact on WhatsApp</span>
              </a>
            )}
          </div>
        </div>
      </section>

      {isImageOpen && imageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setIsImageOpen(false)}
        >
          <button
            type="button"
            onClick={() => setIsImageOpen(false)}
            className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Close enlarged advertisement image"
          >
            <X size={20} />
          </button>
          <img
            src={imageUrl}
            alt={teacherName?.trim() || 'Professor advertisement'}
            className="max-h-[90vh] max-w-full rounded-3xl object-contain shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}

export default ProfessorAdvertisementCard
