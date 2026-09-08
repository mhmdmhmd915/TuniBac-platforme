import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Play } from 'lucide-react'
import type { PlatformOfferData } from '../../constants/platformOffer'
import { ResponsiveVideoPlayer, isVideoAvailable } from '../ui/ResponsiveVideoPlayer'

interface PlatformOfferViewProps {
  offer: PlatformOfferData
  ctaHref: string
  ctaState?: unknown
  previewMode?: boolean
}

export const PlatformOfferView = ({
  offer,
  ctaHref,
  ctaState,
  previewMode = false,
}: PlatformOfferViewProps) => {
  const howToSrc = offer.youtubeUrl && isVideoAvailable(offer.youtubeUrl)
    ? offer.youtubeUrl
    : offer.videoUrl && isVideoAvailable(offer.videoUrl)
    ? offer.videoUrl
    : null
  return (
    <div className="relative overflow-hidden bg-white dark:bg-[#0f172f]">
      <svg
        className="pointer-events-none absolute -top-32 -right-24 h-[480px] w-[480px] opacity-[0.08] dark:opacity-[0.12]"
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
        </defs>
        <path
          fill="url(#waveGrad)"
          d="M45.2,-58.1C58.7,-49.4,70.4,-38.2,75.8,-24.4C81.2,-10.6,80.3,5.8,74.7,20.1C69.1,34.4,58.7,46.5,45.6,55.7C32.5,64.9,16.3,71.2,0.1,71.1C-16.1,71,-32.1,64.5,-45.4,55.6C-58.7,46.7,-69.4,35.4,-75.1,21.9C-80.8,8.4,-81.5,-7.2,-76.6,-20.6C-71.7,-33.9,-61.1,-44.9,-48.1,-53.8C-35.1,-62.7,-19.7,-69.5,-3.6,-74.3C12.5,-79.1,31.7,-66.8,45.2,-58.1Z"
          transform="translate(100 100)"
        />
      </svg>
      <svg
        className="pointer-events-none absolute -bottom-40 -left-20 h-[520px] w-[520px] opacity-[0.06] dark:opacity-[0.09]"
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          fill="#3b82f6"
          d="M52.3,-64.4C67.3,-54.5,78.9,-40.4,82.7,-24.6C86.5,-8.8,82.5,8.8,76.4,24.7C70.3,40.6,62.1,54.7,49.6,64.9C37.1,75.1,20.3,81.4,3.1,80.5C-14.1,79.6,-29.5,71.5,-43,61.7C-56.5,51.9,-68.1,40.4,-74.1,26.6C-80.1,12.8,-80.5,-3.2,-76.9,-17.8C-73.3,-32.3,-65.7,-45.3,-53.8,-55.7C-41.9,-66.1,-25.7,-73.9,-9.1,-79.5C7.4,-85.1,23.7,-88.4,37.3,-74.4C42.9,-69.5,48.2,-68.1,52.3,-64.4Z"
          transform="translate(100 100)"
        />
      </svg>

      <div className="relative mx-auto max-w-7xl px-6 py-16 sm:py-20 lg:px-8 lg:py-24">
        {previewMode && (
          <div className="mb-6 inline-flex items-center rounded-full border border-blue-300/40 bg-blue-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700 dark:text-blue-200">
            Preview
          </div>
        )}

        <div className="flex flex-col gap-10 sm:flex-row sm:items-center sm:gap-12 lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex-1 space-y-6"
          >
            <h1 className="text-5xl font-black leading-[1.05] tracking-tight text-blue-700 dark:text-white md:text-7xl">
              حضّر للباك بطريقة أسهل 🚀
            </h1>
            <h2 className="text-2xl font-bold leading-snug text-slate-800 dark:text-slate-200 md:text-3xl">
              كل ما تحتاجو للمراجعة في بلاصة وحدة.
            </h2>

            <ul className="mt-8 space-y-4">
              <li className="flex items-center gap-3 text-xl font-semibold text-slate-700 dark:text-slate-300">
                <span className="text-2xl">📘🏋️</span>
                <span>Cours + Exercices corrigés</span>
              </li>
              <li className="flex items-center gap-3 text-xl font-semibold text-slate-700 dark:text-slate-300">
                <span className="text-2xl">📅</span>
                <span>Planning intelligent لمراجعة يومية</span>
              </li>
              <li className="flex items-center gap-3 text-xl font-semibold text-slate-700 dark:text-slate-300">
                <span className="text-2xl">📱</span>
                <span>يخدم فالكمبيوتر والموبايل</span>
              </li>
            </ul>

            <div className="pt-6">
              <Link
                to={ctaHref}
                state={ctaState}
                className="block rounded-2xl bg-blue-600 px-10 py-5 text-center text-xl font-bold text-white shadow-lg shadow-blue-600/25 transition-all hover:scale-[1.01] hover:bg-blue-700"
              >
                ابدأ توا وخلي مراجعتك منظمة.
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="w-full flex-1 sm:max-w-md"
          >
            <div className="rounded-3xl border border-blue-100 bg-blue-50 p-6 dark:border-white/10 dark:bg-white/5">
              <h3 className="text-2xl font-black text-blue-700 dark:text-white">
                Pourquoi TuniBac ?
              </h3>

              <ul className="mt-6 space-y-5">
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                    1
                  </span>
                  <span className="text-lg font-semibold leading-snug text-slate-700 dark:text-slate-200">
                    Matières + sections multiples
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                    2
                  </span>
                  <span className="text-lg font-semibold leading-snug text-slate-700 dark:text-slate-200">
                    Progression en temps réel
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                    3
                  </span>
                  <span className="text-lg font-semibold leading-snug text-slate-700 dark:text-slate-200">
                    Accès 24h/24 & hors ligne
                  </span>
                </li>
              </ul>

              <div className="mt-8 rounded-2xl border border-blue-200/60 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                <p className="text-center text-base font-bold text-blue-700 dark:text-blue-200">
                  🇹🇳 Fait en Tunisie pour les bacheliers tunisiens.
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.16 }}
          className="mt-16 md:mt-20"
          dir="rtl"
        >
          <div className="text-center mb-8 space-y-3">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-[#071840] dark:text-white">
              كيفاش تستعمل TuniBac؟
            </h2>
            <p className="text-base md:text-xl font-semibold text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              دليل فيديو سريع على أقسام المنصة وكيفاش تستفيد منه أكتر ما يمكن في مراجعتك.
            </p>
          </div>

          <div className="max-w-5xl mx-auto">
            {howToSrc ? (
              <ResponsiveVideoPlayer
                src={howToSrc}
                title="كيفاش تستعمل TuniBac - فيديو شرح"
              />
            ) : (
              <div className="w-full aspect-video rounded-3xl border-2 border-dashed border-blue-200 bg-blue-50/50 flex flex-col items-center justify-center p-6 md:p-10 text-center shadow-[0_18px_40px_-20px_rgba(7,24,64,0.15)]">
                <Play size={56} className="text-blue-700/40 mb-4" strokeWidth={1.5} />
                <h3 className="text-2xl md:text-3xl font-black text-[#071840] mb-2 leading-tight">
                  فيديو شرح المنصة قادم قريباً 🚀
                </h3>
                <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
                  الإدارة تضيف حالياً فيديو تعليمي يشرح كيفاش تستعمل TuniBac خطوة بخطوة.
                  عد لاحقاً أو سجل داباً لتبدأ مراجعتك!
                </p>
                <div className="mt-6 flex flex-wrap gap-3 justify-center">
                  <Link
                    to={ctaHref}
                    state={ctaState}
                    className="inline-flex items-center gap-2 rounded-full bg-[#071840] px-7 py-3 text-base font-extrabold text-white shadow-[0_18px_40px_-14px_rgba(7,24,64,0.75)] transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_46px_-14px_rgba(7,24,64,0.9)]"
                  >
                    إبدأ توا
                  </Link>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
