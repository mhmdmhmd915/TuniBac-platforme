import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  BarChart3,
  BookMarked,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  PlayCircle,
  ExternalLink,
  FileCheck,
  FileText,
  Flag,
  GraduationCap,
  Layers,
  Link2,
  Loader2,
  Map as MapIcon,
  MapPin,
  Megaphone,
  MessageCircle,
  Pencil,
  Pin,
  ShoppingBag,
  ShoppingCart,
  User,
  Sparkles,
  Rocket,
  Lock,
  Trophy,
  Flame,
  Star,
  Compass,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  learningPathAPI,
  communicationsAPI,
  teacherAdsAPI,
  shopAPI,
  progressAPI,
} from '../services/api'
import type { LearningPathTree, PathStepNode, PathSubjectNode } from '../features/learningPath/types'
import Breadcrumbs from '../components/Breadcrumbs'
import { sanitizeRichHtml } from '../lib/sanitizeHtml'
import { toAssetUrl } from '../lib/assets'

interface SidebarTeacherAd {
  id: string
  image?: string | null
  teacherName: string
  subject?: string | null
  description?: string | null
  whatsapp?: string | null
  externalLink?: string | null
}

interface SidebarShopProduct {
  id: string
  name: string
  description?: string | null
  image?: string | null
  price?: number | null
  whatsapp?: string | null
  externalLink?: string | null
}

const formatWhatsAppLink = (value?: string | null) => {
  if (!value) return ''
  const digits = String(value).replace(/\D+/g, '')
  if (digits.length === 0) return ''
  const fullNumber = digits.length === 8 ? `216${digits}` : digits
  return `https://wa.me/${fullNumber}`
}

const STEP_ICONS: Record<string, typeof GraduationCap> = {
  milestone: MapPin,
  trophy: GraduationCap,
  'file-text': Flag,
  'graduation-cap': GraduationCap,
  target: Flag,
  book: BookMarked,
  roadmap: MapPin,
  trimestre: Layers,
}

const HERO_ILLUSTRATION =
  'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=premium%20anime%20style%20illustration%20of%20a%20Tunisian%20high%20school%20student%20studying%20at%20a%20mahogany%20desk%20at%20sunset%2C%20open%20textbooks%20about%20mathematics%20and%20physics%2C%20holding%20a%20pen%2C%20coffee%20steam%20rising%2C%20dark%20blue%20golden%20hour%20lighting%2C%20soft%20bokeh%20classroom%20window%20background%2C%20motivational%20dreamy%20atmosphere%2C%20graduation%20cap%20silhouette%20on%20bookshelf%2C%20cinematic%20composition%2C%208k%20anime%20key%20visual&image_size=landscape_4_3'

const TRIMESTRE_TRANSITION_ILLUSTRATION =
  'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=premium%20anime%20style%20illustration%20of%20a%20student%20walking%20toward%20a%20majestic%20Tunisian%20lycee%20building%20at%20dawn%2C%20carrying%20a%20stack%20of%20textbooks%2C%20cherry%20blossom%20petals%20floating%20in%20the%20wind%2C%20rosy%20morning%20sky%2C%20soft%20graduation%20cap%20silhouette%20in%20clouds%2C%20hope%20and%20academic%20ambiance%2C%20cinematic%20anime%20key%20visual%2C%20wide%20shot&image_size=landscape_16_9'

const COMPLETION_ILLUSTRATION =
  'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=premium%20anime%20illustration%20of%20a%20proud%20Tunisian%20Baccalaureat%20graduate%20wearing%20academic%20regalia%20holding%20diploma%20in%20front%20of%20a%20beautiful%20university%20gate%20at%20golden%20hour%2C%20family%20celebrating%2C%20confetti%2C%20tears%20of%20joy%2C%20dark%20navy%20sky%20transition%2C%20motivational%20graduation%20moment%2C%20anime%20cinematic&image_size=portrait_4_3'

const ProgressDots: React.FC<{ percent: number }> = ({ percent }) => {
  const status = percent >= 100 ? 'done' : percent > 0 ? 'progress' : 'empty'
  return (
    <div className="flex items-center gap-2">
      {status === 'done' ? (
        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-300">
          <CheckCircle2 size={15} /> خلّصتها
        </span>
      ) : status === 'progress' ? (
        <span className="flex items-center gap-1 text-xs font-semibold text-sky-300">
          <Circle size={12} className="fill-sky-400/40" /> {percent}%
        </span>
      ) : (
        <span className="flex items-center gap-1 text-xs font-medium text-slate-400">
          <Circle size={12} /> ما بديتش
        </span>
      )}
    </div>
  )
}

const StepIcon: React.FC<{ icon?: string | null; color?: string | null; large?: boolean }> = ({
  icon,
  color,
  large,
}) => {
  const Icon = (icon && STEP_ICONS[icon]) || Compass
  const sz = large ? 30 : 22
  const box = large ? 'h-16 w-16 rounded-3xl' : 'h-12 w-12 rounded-2xl'
  return (
    <div className="relative">
      <span
        className={`absolute inset-0 rounded-3xl opacity-30 blur-[6px] ${box}`}
        style={{ backgroundColor: color || '#1e3a8a' }}
      />
      <span
        className={`relative flex ${box} items-center justify-center rounded-3xl text-white shadow-[0_10px_30px_-10px_rgba(30,58,138,0.8)] ring-[3px] ring-white/10`}
        style={{
          background: `linear-gradient(135deg, ${color || '#1e3a8a'} 0%, ${
            color || '#071840'
          } 100%)`,
        }}
      >
        <Icon size={sz} strokeWidth={2.1} />
      </span>
    </div>
  )
}

const SubjectIcon: React.FC<{ color?: string | null; name?: string | null; large?: boolean }> = ({
  color,
  large,
}) => {
  const sz = large ? 22 : 18
  const box = large ? 'h-14 w-14 rounded-2xl' : 'h-11 w-11 rounded-2xl'
  return (
    <div className="relative">
      <span
        className={`absolute inset-0 rounded-2xl opacity-30 blur-sm ${box}`}
        style={{ backgroundColor: color || '#1d4ed8' }}
      />
      <span
        className={`relative flex ${box} items-center justify-center rounded-2xl text-white shadow-[0_8px_20px_-8px_rgba(29,78,216,0.7)] ring-2 ring-white/10`}
        style={{
          background: `linear-gradient(135deg, ${color || '#1d4ed8'} 0%, ${
            color || '#071840'
          } 100%)`,
        }}
      >
        <BookMarked size={sz} strokeWidth={2.1} />
      </span>
    </div>
  )
}

const ItemStatus: React.FC<{ completed: boolean }> = ({ completed }) =>
  completed ? (
    <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
  ) : (
    <Circle size={16} className="text-slate-500/40 shrink-0" />
  )

const CourseItemIcon: React.FC<{
  hasVideo?: boolean
  hasPdf?: boolean
  hasLink?: boolean
  completed?: boolean
  inProgress?: boolean
}> = ({ hasVideo, hasPdf, hasLink, completed, inProgress }) => {
  const Icon = hasVideo ? PlayCircle : hasPdf ? FileText : hasLink ? Link2 : BookOpenCheck
  const base = completed
    ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white'
    : inProgress
    ? 'bg-gradient-to-br from-sky-500 to-sky-600 text-white'
    : 'bg-gradient-to-br from-sky-500 to-indigo-600 text-white'
  return (
    <span
      className={`relative flex h-10 w-10 items-center justify-center rounded-xl shrink-0 shadow-md ${base}`}
    >
      <Icon size={17} />
      <span
        className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-[#071840] ${
          completed
            ? 'bg-emerald-400'
            : inProgress
            ? 'bg-sky-400'
            : 'bg-slate-500/50'
        }`}
      />
    </span>
  )
}

const ExerciseItemIcon: React.FC<{ completed?: boolean; inProgress?: boolean }> = ({
  completed,
  inProgress,
}) => {
  const Icon = completed ? FileCheck : Pencil
  const base = completed
    ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white'
    : inProgress
    ? 'bg-gradient-to-br from-sky-500 to-sky-600 text-white'
    : 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white'
  return (
    <span
      className={`relative flex h-10 w-10 items-center justify-center rounded-xl shrink-0 shadow-md ${base}`}
    >
      <Icon size={17} />
      <span
        className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-[#071840] ${
          completed
            ? 'bg-emerald-400'
            : inProgress
            ? 'bg-sky-400'
            : 'bg-slate-500/50'
        }`}
      />
    </span>
  )
}

const DevoirItemIcon: React.FC<{
  hasVideo?: boolean
  hasPdf?: boolean
  hasLink?: boolean
}> = ({ hasVideo, hasPdf, hasLink }) => {
  const Icon = hasVideo ? PlayCircle : hasPdf ? FileText : hasLink ? Link2 : FileCheck
  return (
    <span className="relative flex h-10 w-10 items-center justify-center rounded-xl shrink-0 bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md">
      <Icon size={17} />
      <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-[#071840] bg-amber-300/70" />
    </span>
  )
}

const BacDiplomaSVG: React.FC<{ size?: number; className?: string }> = ({
  size = 80,
  className = '',
}) => {
  return (
    <svg
      viewBox="0 0 120 96"
      width={size}
      height={(size * 96) / 120}
      className={`shrink-0 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Baccalauréat Tunisien — objectif final"
      role="img"
    >
      <defs>
        <linearGradient id="bacDiplomaFrame" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#f59e0b" />
          <stop offset="0.55" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="bacDiplomaPaper" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fffbeb" />
          <stop offset="1" stopColor="#fde68a" />
        </linearGradient>
        <linearGradient id="bacRibbon" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ef4444" />
          <stop offset="1" stopColor="#b91c1c" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="120" height="96" rx="8" fill="url(#bacDiplomaFrame)" />
      <rect x="6" y="6" width="108" height="84" rx="4" fill="#0b1b5b" />
      <rect x="10" y="10" width="100" height="76" rx="3" fill="url(#bacDiplomaPaper)" />
      <rect x="14" y="14" width="92" height="68" rx="2" fill="none" stroke="#d97706" strokeWidth="1.2" strokeDasharray="2 1.2" opacity="0.7" />
      <g opacity="0.92" transform="translate(60 20)">
        <path d="M-4 0 C-6.5 -5, 0 -7.5, 0 -2 C0 -7.5, 6.5 -5, 4 0 C6.5 5, 0 7.5, 0 2 C0 7.5, -6.5 5, -4 0 Z" fill="#fbbf24" stroke="#b45309" strokeWidth="0.5" />
        <path d="M0 -10 C2 -2, 4 -1, 5 3 C3 1, 1 1, 0 9 C-1 1, -3 1, -5 3 C-4 -1, -2 -2, 0 -10 Z" fill="#e70013" />
      </g>
      <g stroke="#b45309" strokeWidth="1.1" fill="none" opacity="0.85">
        <path d="M20 40 C28 32, 40 30, 60 32 C80 30, 92 32, 100 40" />
        <path d="M20 52 C40 44, 80 44, 100 52" />
        <path d="M20 64 C32 58, 46 56, 60 58 C74 56, 88 58, 100 64" />
      </g>
      <text
        x="60"
        y="44"
        textAnchor="middle"
        fontFamily="ui-serif, Georgia, serif"
        fontSize="9.2"
        fontWeight="700"
        fill="#78350f"
      >
        Baccalauréat
      </text>
      <text
        x="60"
        y="56"
        textAnchor="middle"
        fontFamily="ui-serif, Georgia, serif"
        fontSize="8.4"
        fontWeight="600"
        fill="#92400e"
      >
        Tunisien
      </text>
      <text
        x="60"
        y="70"
        textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui"
        fontSize="4.2"
        fill="#a16207"
        letterSpacing="1.2"
      >
        OBJECTIF FINAL
      </text>
      <g transform="translate(14 56)">
        <path
          d="M4 30 C4 20, 12 14, 12 4 C12 -2, 8 -2, 8 4 C8 -2, 4 -2, 4 4 C4 14, 12 20, 12 30 C12 20, 4 20, 4 30 Z"
          fill="#16a34a"
          opacity="0.88"
        />
      </g>
      <g transform="translate(90 56) scale(-1 1)">
        <path
          d="M4 30 C4 20, 12 14, 12 4 C12 -2, 8 -2, 8 4 C8 -2, 4 -2, 4 4 C4 14, 12 20, 12 30 C12 20, 4 20, 4 30 Z"
          fill="#16a34a"
          opacity="0.88"
        />
      </g>
      <g transform="translate(54 80)">
        <path d="M0 0 L12 -14 L12 2 Z" fill="url(#bacRibbon)" />
        <path d="M12 0 L12 -14 L24 0 L20 4 L16 0 L12 4 Z" fill="url(#bacRibbon)" opacity="0.88" />
      </g>
    </svg>
  )
}

const StatusDot: React.FC<{ size?: 'sm' | 'md' | 'lg'; percent: number }> = ({
  size = 'md',
  percent,
}) => {
  const cls =
    size === 'sm'
      ? 'h-2.5 w-2.5'
      : size === 'lg'
      ? 'h-4 w-4'
      : 'h-3 w-3'
  const color =
    percent >= 100 ? 'bg-emerald-400' : percent > 0 ? 'bg-sky-400' : 'bg-slate-500/40'
  return <span className={`shrink-0 rounded-full shadow-[0_0_8px_currentColor] ${cls} ${color}`} />
}

const ProgressRing: React.FC<{ percent: number; size?: number }> = ({
  percent,
  size = 120,
}) => {
  const stroke = 11
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, percent))
  const offset = circ - (circ * clamped) / 100
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-sky-400/10 via-indigo-500/5 to-transparent blur-md" />
      <svg viewBox={`0 0 ${size} ${size}`} className="relative h-full w-full -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(148,163,184,0.15)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#progGradLarge)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
        <defs>
          <linearGradient id="progGradLarge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="40%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Total
        </span>
        <span className="text-2xl font-black text-white drop-shadow-lg">
          {Math.round(clamped)}%
        </span>
      </div>
    </div>
  )
}

interface AggregateProgress {
  overallPercent?: number
  coursesTotal?: number
  coursesCompleted?: number
  exercisesTotal?: number
  exercisesCompleted?: number
  bySubject?: Record<string, { percent: number }>
  byCourse?: Record<string, { completed: boolean; lastReadPos: number }>
  byExercise?: Record<string, { completed: boolean; lastReadPos: number }>
}

type TrimestreStatus = 'done' | 'active' | 'locked' | 'upcoming'

function getTrimestreStatus(step: PathStepNode, index: number, all: PathStepNode[]): TrimestreStatus {
  const pct = step.progress.percent ?? 0
  if (pct >= 100) return 'done'
  // first trimestre with >0 progress or first isPublished
  if (all.findIndex(s => (s.progress.percent ?? 0) > 0) === index) return 'active'
  if (index > 0 && (all[index - 1].progress.percent ?? 0) < 100 && pct === 0) {
    if (!step.isPublished) return 'locked'
    return 'upcoming'
  }
  // first published trimestre with no progress
  if (index === 0 && pct === 0) return 'active'
  return pct > 0 ? 'active' : step.isPublished ? 'upcoming' : 'locked'
}

const JourneyHero: React.FC<{
  tree: LearningPathTree
  aggregate: AggregateProgress | null
  firstName?: string | null
  bacSection?: string | null
  loadingProgress: boolean
}> = ({ tree, aggregate, firstName, bacSection, loadingProgress }) => {
  const overall = aggregate?.overallPercent ?? 0
  const steps = tree.steps
  const activeStep =
    steps.find((s) => (s.progress.percent ?? 0) > 0 && (s.progress.percent ?? 0) < 100) ||
    steps.find((s) => (s.progress.percent ?? 0) >= 100) ||
    steps[0]

  const activeIndex = activeStep ? steps.findIndex((s) => s.id === activeStep.id) : 0
  const currentTrimesterNumber = Math.min(activeIndex + 1, steps.length || 1)
  const completedTrimestres = steps.filter((s) => (s.progress.percent ?? 0) >= 100).length

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-[#050d2a] via-[#0a1847] to-[#0b1b5b] p-6 sm:p-8 lg:p-10 shadow-[0_30px_80px_-30px_rgba(59,130,246,0.6)]">
      {/* Decorative glows */}
      <div className="pointer-events-none absolute -top-32 -left-24 h-80 w-80 rounded-full bg-indigo-500/25 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-amber-400/10 blur-[110px]" />
      <div className="pointer-events-none absolute top-10 right-40 h-40 w-40 rounded-full bg-sky-400/15 blur-[70px]" />

      {/* Subtle stars */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        {[...Array(30)].map((_, i) => (
          <span
            key={i}
            className="absolute block h-0.5 w-0.5 rounded-full bg-white/70"
            style={{
              top: `${(i * 37) % 100}%`,
              left: `${(i * 53) % 100}%`,
              opacity: 0.3 + ((i * 13) % 70) / 100,
            }}
          />
        ))}
      </div>

      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center">
        {/* Left: text + progress */}
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-gradient-to-r from-amber-400/10 via-orange-400/10 to-amber-400/10 px-4 py-1.5 shadow-[0_0_0_1px_rgba(251,191,36,0.08)] backdrop-blur-sm">
            <Sparkles size={14} className="text-amber-300" />
            <span className="text-[11px] font-bold tracking-[0.16em] text-amber-200/90">
              Parcours académique · {bacSection || 'Bac'}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.05]">
            {firstName ? (
              <>
                <span dir="rtl" className="inline-block">أهلاً بك</span>{' '}
                <span className="bg-gradient-to-r from-amber-300 via-sky-300 to-indigo-300 bg-clip-text text-transparent">{firstName}</span>,
                <br />
              </>
            ) : null}
            <span dir="rtl">مساري في <span className="bg-gradient-to-r from-sky-300 via-indigo-300 to-amber-200 bg-clip-text text-transparent">القراية</span></span>
          </h1>

          <p dir="rtl" className="mt-4 max-w-xl text-base text-slate-300/90 leading-relaxed">
            كل كور، كل تمرين وكل دفوار يقرّبك أكثر لهدفك.
            <br className="sm:hidden" />
            <span dir="rtl"> خطوة بخطوة، توصل للنجاح! — <span className="text-white font-semibold">البكالوريا في نهاية المسار.</span></span>
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-4">
              <ProgressRing percent={overall} />
              <div className="min-w-0 space-y-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    Trimestre actuel
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm font-black text-white backdrop-blur ring-1 ring-white/15">
                      <Rocket size={14} className="text-sky-300" />
                      Trimestre {currentTrimesterNumber}
                      {activeStep ? <span className="text-slate-300/80 font-semibold text-xs ml-1">· {activeStep.title}</span> : null}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 min-w-[280px]">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 backdrop-blur">
                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-sky-300/90">
                      <BookMarked size={10} /> Cours
                    </div>
                    <div className="mt-0.5 text-base font-black text-white">
                      {aggregate?.coursesCompleted ?? 0}
                      <span className="text-slate-400 font-semibold text-sm">/{aggregate?.coursesTotal ?? 0}</span>
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 backdrop-blur">
                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300/90">
                      <Pencil size={10} /> Exercices
                    </div>
                    <div className="mt-0.5 text-base font-black text-white">
                      {aggregate?.exercisesCompleted ?? 0}
                      <span className="text-slate-400 font-semibold text-sm">/{aggregate?.exercisesTotal ?? 0}</span>
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 backdrop-blur">
                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-amber-300/90">
                      <Trophy size={10} /> Trimestres
                    </div>
                    <div className="mt-0.5 text-base font-black text-white">
                      {completedTrimestres}
                      <span className="text-slate-400 font-semibold text-sm">/{steps.length || 3}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {loadingProgress ? (
            <div className="mt-6 h-2 w-full max-w-md animate-pulse overflow-hidden rounded-full bg-white/10" />
          ) : (
            <div className="mt-6 max-w-md">
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Flame size={12} className="text-orange-300" /> Ma progression
                </span>
                <span className="text-white">{Math.round(overall)}%</span>
              </div>
              <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-white/10 ring-1 ring-white/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${overall}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-400 via-sky-400 to-indigo-500 shadow-[0_0_20px_rgba(56,189,248,0.5)]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Right: anime illustration */}
        <div className="relative order-first lg:order-last">
          <div className="absolute -inset-4 rounded-[36px] bg-gradient-to-br from-sky-400/20 via-indigo-400/20 to-amber-400/10 blur-2xl" />
          <div className="relative overflow-hidden rounded-[28px] border border-white/10 ring-1 ring-white/10 shadow-[0_30px_80px_-20px_rgba(15,23,42,0.9)] min-h-[280px] lg:min-h-[340px] aspect-[4/3] bg-[#061234]">
            {/* Fallback academic gradient scene (shows while CDN image loads or if it fails) */}
            <div className="pointer-events-none absolute inset-0 z-0">
              <div className="absolute inset-0 bg-gradient-to-br from-[#0a1e5c] via-[#0b2573] to-[#050d2a]" />
              <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-sky-500/25 blur-3xl" />
              <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-amber-400/20 blur-3xl" />
              <div className="absolute inset-0 opacity-60" style={{ backgroundImage: 'radial-gradient(circle at 20% 25%, rgba(255,255,255,0.18) 0.5px, transparent 1px), radial-gradient(circle at 70% 65%, rgba(255,255,255,0.12) 0.5px, transparent 1px)', backgroundSize: '42px 42px, 36px 36px' }} />
              <svg viewBox="0 0 400 300" className="absolute inset-0 h-full w-full opacity-80">
                <defs>
                  <linearGradient id="heroFbDesk" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stopColor="#7c3aed" stopOpacity="0.6" />
                    <stop offset="1" stopColor="#0ea5e9" stopOpacity="0.2" />
                  </linearGradient>
                  <linearGradient id="heroFbBook" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0" stopColor="#fbbf24" />
                    <stop offset="1" stopColor="#f97316" />
                  </linearGradient>
                </defs>
                {/* Mahogany desk horizon */}
                <rect x="0" y="220" width="400" height="80" fill="url(#heroFbDesk)" />
                {/* Open book */}
                <g transform="translate(70,175)" opacity="0.95">
                  <path d="M0 40 C30 0 90 0 130 40 L130 55 C90 15 30 15 0 55 Z" fill="url(#heroFbBook)" />
                  <path d="M130 40 C170 0 230 0 260 40 L260 55 C230 15 170 15 130 55 Z" fill="#f59e0b" />
                  <line x1="130" y1="20" x2="130" y2="55" stroke="#7c2d12" strokeWidth="2" />
                </g>
                {/* Graduation cap silhouette */}
                <g transform="translate(275,70)" opacity="0.85">
                  <polygon points="0,20 45,0 90,20 45,28" fill="#1e293b" />
                  <rect x="42" y="28" width="6" height="30" fill="#1e293b" />
                  <circle cx="48" cy="60" r="3.5" fill="#fbbf24" />
                </g>
                {/* Coffee steam */}
                <g transform="translate(310,190)" opacity="0.7">
                  <rect x="0" y="30" width="28" height="28" rx="4" fill="#334155" />
                  <path d="M6 28 C6 16, 12 20, 12 8 C12 2, 18 8, 18 -2" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6" />
                  <path d="M18 28 C18 16, 24 20, 24 8" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.45" />
                </g>
                {/* Pen */}
                <g transform="translate(40,220) rotate(-25)" opacity="0.9">
                  <rect x="0" y="0" width="70" height="7" rx="3" fill="#0ea5e9" />
                  <polygon points="70,0 88,3.5 70,7" fill="#1e293b" />
                </g>
                {/* Window light rays */}
                <g opacity="0.3">
                  <polygon points="20,0 150,0 260,300 -50,300" fill="#fef3c7" />
                </g>
              </svg>
            </div>
            <img
              src={HERO_ILLUSTRATION}
              alt="Étudiant anime préparant son Bac"
              className="relative z-10 h-full w-full object-cover"
              loading="eager"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#050d2a]/80 via-[#050d2a]/10 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
              <div className="inline-flex items-center gap-3 rounded-2xl border border-amber-400/30 bg-gradient-to-br from-[#0a1847]/90 via-[#0b1e58]/90 to-[#0a1847]/90 px-3.5 py-2.5 backdrop-blur-md shadow-[0_15px_40px_-15px_rgba(251,191,36,0.55)] ring-1 ring-white/15">
                <div className="relative shrink-0">
                  <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-amber-400/25 via-sky-400/20 to-indigo-400/20 blur-xl" />
                  <BacDiplomaSVG size={56} className="relative" />
                </div>
                <div className="leading-tight min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200/90">
                    Objectif
                  </div>
                  <div className="text-sm font-black text-white whitespace-nowrap">
                    Baccalauréat <span className="text-amber-200">Tunisien</span>
                  </div>
                  <div className="mt-0.5 text-[10px] font-semibold text-slate-300/80">
                    Ton but final, étape par étape
                  </div>
                </div>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1.5 shadow-[0_10px_30px_-8px_rgba(251,191,36,0.6)] shrink-0">
                <Star size={12} className="text-[#071840]" />
                <span dir="rtl" className="text-xs font-black text-[#071840]">
                  إنت قريب بزاف!
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

const TrimestreRoadmapHeader: React.FC<{ steps: PathStepNode[] }> = ({ steps }) => {
  return (
    <section className="mt-8 relative">
      {/* Transition banner illustration on mobile or wide */}
      <div className="mb-6 hidden lg:block relative overflow-hidden rounded-3xl border border-white/10 shadow-xl bg-[#061234] h-44">
        {/* Fallback academic journey SVG scene */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a1e5c] via-[#0c2a78] to-[#0a1847]" />
          <div className="absolute top-0 left-1/3 h-64 w-64 -translate-y-1/3 rounded-full bg-rose-400/15 blur-3xl" />
          <div className="absolute bottom-0 right-10 h-56 w-56 translate-y-1/3 rounded-full bg-amber-300/25 blur-3xl" />
          <div className="absolute inset-0 opacity-50" style={{ backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(255,255,255,0.18) 0.5px, transparent 1px)', backgroundSize: '28px 28px' }} />
          <svg viewBox="0 0 900 176" className="absolute inset-0 h-full w-full opacity-90">
            {/* Lycée building silhouette */}
            <g transform="translate(540,30)" opacity="0.85">
              <rect x="0" y="40" width="220" height="110" fill="#1e293b" rx="4" />
              <polygon points="-10,40 110,-10 230,40" fill="#0f172a" />
              <rect x="100" y="60" width="20" height="90" fill="#fbbf24" opacity="0.4" />
              <rect x="20" y="60" width="22" height="22" fill="#fde68a" opacity="0.55" />
              <rect x="60" y="60" width="22" height="22" fill="#fde68a" opacity="0.55" />
              <rect x="150" y="60" width="22" height="22" fill="#fde68a" opacity="0.55" />
              <rect x="188" y="60" width="22" height="22" fill="#fde68a" opacity="0.55" />
            </g>
            {/* Student walking silhouette w/ books */}
            <g transform="translate(170,92)" opacity="0.95">
              <circle cx="16" cy="14" r="14" fill="#0f172a" />
              <rect x="6" y="26" width="20" height="44" rx="5" fill="#1e3a8a" />
              {/* Book stack */}
              <rect x="-8" y="55" width="52" height="8" fill="#f59e0b" rx="1" />
              <rect x="-4" y="47" width="44" height="8" fill="#ef4444" rx="1" />
              <rect x="0" y="39" width="36" height="8" fill="#0ea5e9" rx="1" />
              {/* Legs walking */}
              <rect x="8" y="68" width="6" height="22" fill="#0f172a" />
              <rect x="20" y="68" width="6" height="22" fill="#0f172a" transform="skewX(8)" />
            </g>
            {/* Cherry petals floating */}
            <g fill="#fecaca" opacity="0.75">
              <circle cx="80" cy="30" r="3.5" />
              <circle cx="260" cy="60" r="2.8" />
              <circle cx="350" cy="28" r="3.2" />
              <circle cx="460" cy="70" r="2.5" />
              <circle cx="500" cy="40" r="3" />
              <circle cx="720" cy="25" r="3" />
              <circle cx="830" cy="90" r="2.6" />
            </g>
            {/* Graduation cap in clouds */}
            <g transform="translate(720,36)" opacity="0.6">
              <polygon points="0,14 32,0 64,14 32,20" fill="#1e293b" />
              <rect x="30" y="20" width="4" height="22" fill="#1e293b" />
              <circle cx="34" cy="44" r="2.5" fill="#fbbf24" />
            </g>
          </svg>
        </div>
        <img
          src={TRIMESTRE_TRANSITION_ILLUSTRATION}
          alt="Chemin académique"
          className="relative z-10 h-44 w-full object-cover"
          loading="lazy"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#050d2a] via-[#050d2a]/70 to-transparent" />
        <div className="absolute inset-0 flex items-center px-8">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 backdrop-blur">
              <Compass size={12} className="text-sky-300" />
              <span className="text-[10px] font-bold tracking-widest text-slate-200">
                Roadmap académique
              </span>
            </div>
            <h2 className="mt-2 text-2xl font-black text-white tracking-tight">
              Trois trimestres.{' '}
              <span className="bg-gradient-to-r from-sky-300 to-amber-200 bg-clip-text text-transparent">
                Une seule victoire.
              </span>
            </h2>
            <p className="mt-1 text-sm text-slate-300/80 max-w-lg">
              Chaque étape est un tremplin. Termine{' '}
              <span className="font-semibold text-white">Trimestre 1</span>, puis débloque la suite.
            </p>
          </div>
        </div>
      </div>

      {/* 3-pill visual journey */}
      <div className="relative">
        <div className="hidden md:block absolute left-[17%] right-[17%] top-[62px] h-1.5">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500/40 via-sky-500/40 to-indigo-500/30 blur-sm" />
          <div className="relative h-full rounded-full bg-gradient-to-r from-emerald-500/80 via-sky-500/70 to-indigo-400/30 opacity-80" />
        </div>
        <div className="grid gap-4 md:grid-cols-3 relative">
          {steps.map((step, idx) => {
            const status = getTrimestreStatus(step, idx, steps)
            const pct = step.progress.percent ?? 0
            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.1, ease: 'easeOut' }}
                className="relative"
              >
                <div
                  className={`relative overflow-hidden rounded-3xl border p-5 backdrop-blur transition-all ${
                    status === 'done'
                      ? 'border-emerald-400/40 bg-gradient-to-br from-emerald-500/15 via-[#0a1847]/80 to-[#0a1847] shadow-[0_15px_40px_-15px_rgba(16,185,129,0.5)]'
                      : status === 'active'
                      ? 'border-sky-400/60 bg-gradient-to-br from-sky-500/20 via-[#0a1847]/90 to-[#0a1847] shadow-[0_20px_60px_-20px_rgba(56,189,248,0.65)] ring-2 ring-sky-400/30'
                      : status === 'upcoming'
                      ? 'border-white/10 bg-gradient-to-br from-white/5 via-[#0a1847]/70 to-[#0a1847]/60'
                      : 'border-white/10 bg-gradient-to-br from-white/5 via-[#071840]/60 to-[#071840]/70 opacity-80'
                  }`}
                >
                  {/* Number badge */}
                  <div className="flex items-start justify-between">
                    <div
                      className={`relative flex h-14 w-14 items-center justify-center rounded-3xl text-lg font-black shadow-lg ${
                        status === 'done'
                          ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white'
                          : status === 'active'
                          ? 'bg-gradient-to-br from-sky-400 to-indigo-500 text-white'
                          : status === 'upcoming'
                          ? 'bg-white/10 text-slate-300 ring-1 ring-white/15'
                          : 'bg-white/5 text-slate-500 ring-1 ring-white/10'
                      }`}
                    >
                      {status === 'done' ? (
                        <CheckCircle2 size={24} className="text-white" />
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                      {status === 'active' && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-sky-400 ring-4 ring-[#0a1847] animate-pulse shadow-[0_0_12px_rgba(56,189,248,0.8)]" />
                      )}
                      {status === 'locked' && (
                        <Lock size={14} className="absolute -bottom-1 -right-1 text-amber-400 bg-[#0a1847] rounded-full p-0.5" />
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${
                        status === 'done'
                          ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/20'
                          : status === 'active'
                          ? 'bg-sky-500/15 text-sky-200 ring-1 ring-sky-400/30'
                          : status === 'upcoming'
                          ? 'bg-white/5 text-slate-300 ring-1 ring-white/10'
                          : 'bg-white/5 text-slate-500 ring-1 ring-white/10'
                      }`}
                    >
                      {status === 'done'
                        ? 'خلّصتها'
                        : status === 'active'
                        ? 'باش تعملها دلوقتي'
                        : status === 'upcoming'
                        ? 'بعدين'
                        : 'مقفولة'}
                    </span>
                  </div>

                  <div className="mt-4">
                    <h3 className="text-lg font-black text-white tracking-tight leading-tight">
                      {step.title || `Trimestre ${idx + 1}`}
                    </h3>
                    {step.description ? (
                      <p className="mt-1 text-xs text-slate-300/80 line-clamp-2">{step.description}</p>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-xl bg-white/5 px-2 py-1 text-[10px] font-bold text-slate-200 ring-1 ring-white/10">
                      <BookMarked size={10} /> {step.subjectCount} matières
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-xl bg-sky-500/10 px-2 py-1 text-[10px] font-bold text-sky-200 ring-1 ring-sky-400/15">
                      <PlayCircle size={10} /> {step.courseCount}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-200 ring-1 ring-emerald-400/15">
                      <Pencil size={10} /> {step.exerciseCount}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-xl bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-200 ring-1 ring-amber-400/15">
                      <FileCheck size={10} /> {step.devoirCount}
                    </span>
                  </div>

                  <div className="mt-4">
                    <div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      <span>Progrès</span>
                      <span className="text-white">{Math.round(pct)}%</span>
                    </div>
                    <div className="relative h-2 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/5">
                      <div
                        className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ${
                          status === 'done'
                            ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                            : 'bg-gradient-to-r from-sky-400 via-indigo-400 to-amber-300'
                        } shadow-[0_0_10px_currentColor]`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

type ContentCategory = 'courses' | 'exercises' | 'devoirs'

const DifficultyBadge: React.FC<{ difficulty?: string | null }> = ({ difficulty }) => {
  if (!difficulty) return null
  const d = difficulty.toLowerCase()
  const color =
    d.includes('facile') || d.startsWith('easy') || d.includes('sahla') || d.includes('سهلة')
      ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/20'
      : d.includes('moyen') || d.startsWith('medium') || d.includes('وسطى') || d.includes('moyenne')
      ? 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-400/20'
      : d.includes('difficile') || d.startsWith('hard') || d.includes('صعبة') || d.includes('difficile')
      ? 'bg-rose-500/10 text-rose-300 ring-1 ring-rose-400/20'
      : 'bg-white/5 text-slate-200 ring-1 ring-white/10'
  return (
    <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${color}`}>
      {difficulty}
    </span>
  )
}

const CourseExerciseDevoirItems: React.FC<{
  subject: PathSubjectNode
  onOpen: (type: 'course' | 'exercise' | 'devoir', id: string) => void
  aggregate: AggregateProgress | null
}> = ({ subject, onOpen, aggregate }) => {
  const getDefaultCategory = (): ContentCategory => {
    if (subject.courseCount > 0) return 'courses'
    if (subject.exerciseCount > 0) return 'exercises'
    return 'devoirs'
  }

  const [activeCategory, setActiveCategory] = useState<ContentCategory>(getDefaultCategory())
  const subjPercent = aggregate?.bySubject?.[subject.id]?.percent ?? subject.progress.percent

  const categories: {
    key: ContentCategory
    label: string
    count: number
    icon: typeof BookOpenCheck
    activeCls: string
    inactiveCls: string
    accentBg: string
    glow: string
  }[] = [
    {
      key: 'courses',
      label: 'Cours',
      count: subject.courseCount,
      icon: BookOpenCheck,
      activeCls:
        'bg-gradient-to-br from-sky-500 to-indigo-600 text-white ring-2 ring-sky-400/40 shadow-[0_10px_30px_-10px_rgba(56,189,248,0.8)]',
      inactiveCls:
        'bg-white/5 text-slate-300 ring-1 ring-white/10 hover:bg-white/10 hover:text-white transition',
      accentBg: 'from-sky-500/10 via-indigo-500/5 to-transparent',
      glow: 'shadow-[0_0_40px_-10px_rgba(56,189,248,0.4)]',
    },
    {
      key: 'exercises',
      label: 'Exercices',
      count: subject.exerciseCount,
      icon: Pencil,
      activeCls:
        'bg-gradient-to-br from-emerald-500 to-teal-600 text-white ring-2 ring-emerald-400/40 shadow-[0_10px_30px_-10px_rgba(16,185,129,0.7)]',
      inactiveCls:
        'bg-white/5 text-slate-300 ring-1 ring-white/10 hover:bg-white/10 hover:text-white transition',
      accentBg: 'from-emerald-500/10 via-teal-500/5 to-transparent',
      glow: 'shadow-[0_0_40px_-10px_rgba(16,185,129,0.4)]',
    },
    {
      key: 'devoirs',
      label: 'Devoirs',
      count: subject.devoirCount,
      icon: FileCheck,
      activeCls:
        'bg-gradient-to-br from-amber-500 to-orange-600 text-white ring-2 ring-amber-400/40 shadow-[0_10px_30px_-10px_rgba(245,158,11,0.7)]',
      inactiveCls:
        'bg-white/5 text-slate-300 ring-1 ring-white/10 hover:bg-white/10 hover:text-white transition',
      accentBg: 'from-amber-500/10 via-orange-500/5 to-transparent',
      glow: 'shadow-[0_0_40px_-10px_rgba(245,158,11,0.4)]',
    },
  ]

  const active = categories.find((c) => c.key === activeCategory)!

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="mt-6"
    >
      <div
        className={`relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-[#0a1847] via-[#0a1847] to-[#08133a] shadow-[0_25px_60px_-25px_rgba(0,0,0,0.7)] ${active.glow}`}
      >
        {/* Decorative gradient header */}
        <div className={`absolute inset-x-0 top-0 h-64 bg-gradient-to-b ${active.accentBg} pointer-events-none`} />

        {/* Subject header */}
        <div className="relative px-6 pt-6 pb-5 sm:px-7 sm:pt-7 sm:pb-6 border-b border-white/5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <SubjectIcon color={subject.color} name={subject.name} large />
              <div className="min-w-0">
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                  {subject.name}
                </h3>
                <p dir="rtl" className="mt-1 text-sm text-slate-300/80 font-medium">
                  <span className="font-bold text-white">{subject.name}</span> — مسارك في المادة
                </p>
                {subject.description && (
                  <p className="mt-1.5 text-xs text-slate-400/80 line-clamp-2">
                    {subject.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Progression
                </span>
                <span className="text-3xl font-black text-white leading-none">
                  {Math.round(subjPercent)}%
                </span>
              </div>
              <div className="w-14 h-14 relative shrink-0">
                <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
                  <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth="5" />
                  <circle
                    cx="28"
                    cy="28"
                    r="22"
                    fill="none"
                    stroke={subject.color || '#38bdf8'}
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 22}
                    strokeDashoffset={
                      2 * Math.PI * 22 * (1 - Math.max(0, Math.min(100, subjPercent)) / 100)
                    }
                    className="transition-[stroke-dashoffset] duration-700"
                    style={{
                      filter: `drop-shadow(0 0 6px ${subject.color || '#38bdf8'})`,
                    }}
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="relative px-6 pb-4 pt-4 sm:px-7">
          <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-white/5 ring-1 ring-white/10 backdrop-blur">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.key
              const CatIcon = cat.icon
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`
                    relative flex-1 min-w-[120px] sm:flex-1 sm:min-w-0 flex items-center justify-center gap-2 rounded-xl px-3 py-2.5
                    text-sm font-bold transition-all duration-200 ease-out
                    ${isActive ? cat.activeCls : cat.inactiveCls}
                  `}
                >
                  <CatIcon size={16} strokeWidth={2.1} />
                  <span>{cat.label}</span>
                  <span
                    className={`
                      inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-black
                      ${isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-white/5 text-slate-300 ring-1 ring-white/10'
                      }
                    `}
                  >
                    {cat.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="relative px-6 py-5 sm:px-7 sm:py-6">
          <AnimatePresence mode="wait">
            {activeCategory === 'courses' && (
              <motion.div
                key="courses"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
              >
                {subject.courses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                    <div className="w-20 h-20 rounded-3xl flex items-center justify-center bg-gradient-to-br from-sky-500/20 to-indigo-500/10 text-sky-300 mb-5 ring-1 ring-sky-400/20">
                      <BookOpenCheck size={32} strokeWidth={1.8} />
                    </div>
                    <p dir="rtl" className="text-base font-bold text-white">
                      ما فماش دروس متاحة توا في هاذي المادة.
                    </p>
                    <p dir="rtl" className="mt-1 text-sm text-slate-400">
                      الدروس باش تضاف قريباً — تفرّج مرة أخرى بعدين.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {subject.courses.map((course, idx) => {
                      const courseAgg = aggregate?.byCourse?.[course.id]
                      const completed = courseAgg?.completed ?? course.completed
                      const inProgress = !completed && (courseAgg?.lastReadPos ?? 0) > 0
                      return (
                        <motion.li
                          key={course.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.32, ease: 'easeOut', delay: idx * 0.035 }}
                        >
                          <button
                            onClick={() => onOpen('course', course.id)}
                            className="group relative w-full flex items-stretch gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left hover:border-sky-400/50 hover:bg-white/[0.07] hover:shadow-[0_15px_40px_-15px_rgba(56,189,248,0.5)] hover:-translate-y-0.5 transition-all duration-200"
                          >
                            <CourseItemIcon
                              hasVideo={course.hasVideo}
                              hasPdf={course.hasPdf}
                              hasLink={course.hasLink}
                              completed={completed}
                              inProgress={inProgress}
                            />
                            <div className="min-w-0 flex-1 flex flex-col">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-black text-white text-base leading-tight group-hover:text-sky-300 transition-colors">
                                    {course.title}
                                  </h4>
                                  {course.description && (
                                    <p className="mt-1 text-sm text-slate-400/90 line-clamp-2 leading-relaxed">
                                      {course.description}
                                    </p>
                                  )}
                                </div>
                                <ItemStatus completed={completed} />
                              </div>
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <DifficultyBadge difficulty={course.difficulty} />
                                {course.hasVideo && (
                                  <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] font-bold text-slate-200 ring-1 ring-white/10">
                                    <PlayCircle size={11} /> Vidéo
                                  </span>
                                )}
                                {course.hasPdf && (
                                  <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] font-bold text-slate-200 ring-1 ring-white/10">
                                    <FileText size={11} /> PDF
                                  </span>
                                )}
                                {inProgress && !completed && (
                                  <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-sky-500/10 ring-1 ring-sky-400/30 px-2.5 py-0.5 text-[10px] font-bold text-sky-200">
                                    باش تعملها دلوقتي
                                  </span>
                                )}
                                {completed && (
                                  <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 ring-1 ring-emerald-400/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-200">
                                    <CheckCircle2 size={11} /> خلّصتها
                                  </span>
                                )}
                              </div>
                              <div className="mt-3 flex items-center justify-between">
                                <span
                                  className={`inline-flex items-center rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                                    completed
                                      ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white'
                                      : inProgress
                                      ? 'bg-gradient-to-br from-sky-500 to-indigo-600 text-white'
                                      : 'bg-gradient-to-br from-sky-500 to-indigo-600 text-white group-hover:brightness-110'
                                  } shadow-md`}
                                >
                                  {completed ? 'راجع' : inProgress ? 'كمّل' : 'إبدا'}
                                  <ChevronRight size={13} className="ml-1" />
                                </span>
                              </div>
                            </div>
                          </button>
                        </motion.li>
                      )
                    })}
                  </ul>
                )}
              </motion.div>
            )}

            {activeCategory === 'exercises' && (
              <motion.div
                key="exercises"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
              >
                {subject.exercises.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                    <div className="w-20 h-20 rounded-3xl flex items-center justify-center bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-300 mb-5 ring-1 ring-emerald-400/20">
                      <Pencil size={32} strokeWidth={1.8} />
                    </div>
                    <p dir="rtl" className="text-base font-bold text-white">
                      مفيهاش تمارين متاحة توا في هاذي المادة.
                    </p>
                    <p dir="rtl" className="mt-1 text-sm text-slate-400">
                      التمارين قريباً — جهّز دفاترك!
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {subject.exercises.map((exercise, idx) => {
                      const exAgg = aggregate?.byExercise?.[exercise.id]
                      const completed = exAgg?.completed ?? exercise.completed
                      const inProgress = !completed && (exAgg?.lastReadPos ?? 0) > 0
                      return (
                        <motion.li
                          key={exercise.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.32, ease: 'easeOut', delay: idx * 0.035 }}
                        >
                          <button
                            onClick={() => onOpen('exercise', exercise.id)}
                            className="group relative w-full flex items-stretch gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left hover:border-emerald-400/50 hover:bg-white/[0.07] hover:shadow-[0_15px_40px_-15px_rgba(16,185,129,0.55)] hover:-translate-y-0.5 transition-all duration-200"
                          >
                            <ExerciseItemIcon completed={completed} inProgress={inProgress} />
                            <div className="min-w-0 flex-1 flex flex-col">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-black text-white text-base leading-tight group-hover:text-emerald-300 transition-colors">
                                    {exercise.title}
                                  </h4>
                                  {exercise.groupTitle && (
                                    <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                                      {exercise.groupTitle}
                                    </p>
                                  )}
                                  {exercise.description && (
                                    <p className="mt-1.5 text-sm text-slate-400/90 line-clamp-2 leading-relaxed">
                                      {exercise.description}
                                    </p>
                                  )}
                                </div>
                                <ItemStatus completed={completed} />
                              </div>
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <DifficultyBadge difficulty={exercise.difficulty} />
                                {inProgress && !completed && (
                                  <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-sky-500/10 ring-1 ring-sky-400/30 px-2.5 py-0.5 text-[10px] font-bold text-sky-200">
                                    باش تعملها دلوقتي
                                  </span>
                                )}
                                {completed && (
                                  <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 ring-1 ring-emerald-400/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-200">
                                    <CheckCircle2 size={11} /> خلّصتها
                                  </span>
                                )}
                              </div>
                              <div className="mt-3 flex items-center justify-between">
                                <span
                                  className={`inline-flex items-center rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                                    completed
                                      ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white'
                                      : inProgress
                                      ? 'bg-gradient-to-br from-sky-500 to-indigo-600 text-white'
                                      : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white group-hover:brightness-110'
                                  } shadow-md`}
                                >
                                  {completed ? 'شوف التصحيح' : inProgress ? 'كمّل' : 'حلّ'}
                                  <ChevronRight size={13} className="ml-1" />
                                </span>
                              </div>
                            </div>
                          </button>
                        </motion.li>
                      )
                    })}
                  </ul>
                )}
              </motion.div>
            )}

            {activeCategory === 'devoirs' && (
              <motion.div
                key="devoirs"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
              >
                {subject.devoirs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                    <div className="w-20 h-20 rounded-3xl flex items-center justify-center bg-gradient-to-br from-amber-500/20 to-orange-500/10 text-amber-300 mb-5 ring-1 ring-amber-400/20">
                      <FileCheck size={32} strokeWidth={1.8} />
                    </div>
                    <p dir="rtl" className="text-base font-bold text-white">
                      مفيهاش واجبات متاحة توا في هاذي المادة.
                    </p>
                    <p dir="rtl" className="mt-1 text-sm text-slate-400">
                      الدفوار قريباً — صبّر شوية!
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {subject.devoirs.map((devoir, idx) => (
                      <motion.li
                        key={devoir.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.32, ease: 'easeOut', delay: idx * 0.035 }}
                      >
                        <button
                          onClick={() => onOpen('devoir', devoir.id)}
                          className="group relative w-full flex items-stretch gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left hover:border-amber-400/60 hover:bg-white/[0.07] hover:shadow-[0_15px_40px_-15px_rgba(245,158,11,0.6)] hover:-translate-y-0.5 transition-all duration-200"
                        >
                          <DevoirItemIcon
                            hasVideo={devoir.hasVideo}
                            hasPdf={devoir.hasPdf}
                            hasLink={devoir.hasLink}
                          />
                          <div className="min-w-0 flex-1 flex flex-col">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <h4 className="font-black text-white text-base leading-tight group-hover:text-amber-300 transition-colors">
                                  {devoir.title}
                                </h4>
                                {devoir.description && (
                                  <p className="mt-1 text-sm text-slate-400/90 line-clamp-2 leading-relaxed">
                                    {devoir.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <DifficultyBadge difficulty={devoir.difficulty} />
                              {devoir.hasVideo && (
                                <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] font-bold text-slate-200 ring-1 ring-white/10">
                                  <PlayCircle size={11} /> Vidéo
                                </span>
                              )}
                              {devoir.hasPdf && (
                                <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] font-bold text-slate-200 ring-1 ring-white/10">
                                  <FileText size={11} /> PDF
                                </span>
                              )}
                              {devoir.hasLink && (
                                <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] font-bold text-slate-200 ring-1 ring-white/10">
                                  <Link2 size={11} /> Lien
                                </span>
                              )}
                            </div>
                            <div className="mt-3 flex items-center justify-between">
                              <span className="inline-flex items-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white px-3.5 py-1.5 text-xs font-bold group-hover:brightness-110 transition-all shadow-md">
                                إقرأ الدفوار
                                <ChevronRight size={13} className="ml-1" />
                              </span>
                            </div>
                          </div>
                        </button>
                      </motion.li>
                    ))}
                  </ul>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

const SubjectBranch: React.FC<{
  subject: PathSubjectNode
  expanded: boolean
  onToggle: () => void
  onOpen: (type: 'course' | 'exercise' | 'devoir', id: string) => void
  aggregate: AggregateProgress | null
  index: number
}> = ({ subject, expanded, onToggle, onOpen, aggregate, index }) => {
  const subjPercent = aggregate?.bySubject?.[subject.id]?.percent ?? subject.progress.percent
  return (
    <div className="relative">
      <motion.button
        onClick={onToggle}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, delay: index * 0.05, ease: 'easeOut' }}
        whileHover={{ y: -3 }}
        className={`group relative flex w-full items-stretch gap-4 rounded-[26px] border p-5 text-left overflow-hidden transition-all duration-300 ${
          expanded
            ? 'border-sky-400/50 bg-gradient-to-br from-[#0a1847] via-[#0a1847] to-[#0b1f5f] shadow-[0_25px_60px_-20px_rgba(56,189,248,0.55)] ring-2 ring-sky-400/30'
            : 'border-white/10 bg-gradient-to-br from-white/5 via-[#0a1847]/80 to-[#0a1847] hover:border-white/20 hover:shadow-[0_20px_50px_-20px_rgba(15,23,42,0.9)]'
        }`}
      >
        {/* Colored subject gradient side accent */}
        <span
          className="absolute left-0 inset-y-0 w-1.5 opacity-80"
          style={{
            background: `linear-gradient(to bottom, ${subject.color || '#1d4ed8'}, transparent)`,
            filter: `drop-shadow(0 0 8px ${subject.color || '#1d4ed8'})`,
          }}
        />

        <div className="pl-3 flex items-start gap-4 flex-1">
          <div className="relative shrink-0">
            <SubjectIcon color={subject.color} />
            <span className="absolute -bottom-0.5 -right-0.5">
              <StatusDot size="sm" percent={subjPercent} />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h4 className="truncate font-extrabold text-white text-lg leading-tight tracking-tight group-hover:text-sky-200 transition-colors">
                  {subject.name}
                </h4>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-xl bg-sky-500/10 px-2 py-0.5 text-[11px] font-bold text-sky-200 ring-1 ring-sky-400/15">
                    <PlayCircle size={10} /> {subject.courseCount}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-200 ring-1 ring-emerald-400/15">
                    <Pencil size={10} /> {subject.exerciseCount}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-xl bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-200 ring-1 ring-amber-400/15">
                    <FileCheck size={10} /> {subject.devoirCount}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="hidden sm:flex flex-col items-end">
                  <ProgressDots percent={subjPercent} />
                  <span className="text-sm font-black text-white mt-1 leading-none">
                    {Math.round(subjPercent)}%
                  </span>
                </div>
                <span className="sm:hidden rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-white ring-1 ring-white/10">
                  {Math.round(subjPercent)}%
                </span>
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-white transition-all duration-300 ${
                    expanded
                      ? 'rotate-180 bg-white/10 ring-1 ring-white/15'
                      : 'bg-gradient-to-br from-sky-500 to-indigo-600 shadow-lg group-hover:brightness-110'
                  }`}
                >
                  <ChevronDown size={16} />
                </div>
              </div>
            </div>

            <div className="mt-3 sm:hidden">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-400"
                  style={{ width: `${subjPercent}%` }}
                />
              </div>
            </div>
            <div className="mt-3 hidden sm:block">
              <div className="h-2 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-400 via-indigo-400 to-amber-300 transition-[width] duration-700 shadow-[0_0_10px_rgba(56,189,248,0.4)]"
                  style={{ width: `${subjPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <CourseExerciseDevoirItems subject={subject} onOpen={onOpen} aggregate={aggregate} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const StepRoadmapItem: React.FC<{
  step: PathStepNode
  index: number
  total: number
  expanded: boolean
  onToggle: () => void
  expandedSubjectId: string | null
  onToggleSubject: (id: string | null) => void
  onOpen: (type: 'course' | 'exercise' | 'devoir', id: string) => void
  aggregate: AggregateProgress | null
}> = ({ step, index, total, expanded, onToggle, expandedSubjectId, onToggleSubject, onOpen, aggregate }) => {
  const stepColor = step.color || '#1e3a8a'
  const stepPercent = step.progress.percent ?? 0
  const realSteps = (globalThis as any).__currentSteps || [step]
  const realStatus = getTrimestreStatus(step, index, realSteps as PathStepNode[])

  return (
    <section id={`trimestre-${index + 1}`} className="relative scroll-mt-20">
      {/* Connecting line to next */}
      {index < total - 1 && (
        <div className="hidden sm:block absolute left-1/2 -translate-x-1/2 bottom-[-30px] w-0.5 h-12 bg-gradient-to-b from-sky-400/60 via-indigo-400/40 to-transparent" />
      )}

      <div
        className={`relative rounded-[32px] border p-6 sm:p-7 transition-all duration-500 ${
          expanded
            ? 'border-sky-400/50 bg-gradient-to-br from-[#0a1847] via-[#0b1b5b] to-[#08133a] shadow-[0_30px_80px_-25px_rgba(56,189,248,0.5)] ring-2 ring-sky-400/20'
            : realStatus === 'done'
            ? 'border-emerald-400/30 bg-gradient-to-br from-[#071840] via-[#0a1847] to-[#0a1847] hover:border-emerald-400/50 hover:shadow-[0_20px_60px_-30px_rgba(16,185,129,0.55)]'
            : realStatus === 'active'
            ? 'border-sky-400/40 bg-gradient-to-br from-[#0a1847] via-[#0b1e58] to-[#0a1847] hover:shadow-[0_20px_60px_-30px_rgba(56,189,248,0.55)]'
            : realStatus === 'locked'
            ? 'border-white/10 bg-[#071840]/70 opacity-80'
            : 'border-white/10 bg-gradient-to-br from-[#071840]/80 to-[#0a1847] hover:border-white/20'
        }`}
      >
        {/* Status corner ribbon */}
        <div className="absolute top-5 right-5 sm:top-6 sm:right-6 flex items-center gap-2 z-10">
          {realStatus === 'done' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-bold tracking-widest text-emerald-200 ring-1 ring-emerald-400/30 backdrop-blur">
              <CheckCircle2 size={12} /> خلّصتها
            </span>
          )}
          {realStatus === 'active' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-sky-500/20 to-amber-400/15 px-3 py-1 text-[11px] font-bold tracking-widest text-sky-200 ring-1 ring-sky-400/30 backdrop-blur">
              <Flame size={12} className="text-orange-300" /> باش تعملها دلوقتي
            </span>
          )}
          {realStatus === 'locked' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1 text-[11px] font-bold tracking-widest text-slate-400 ring-1 ring-white/10 backdrop-blur">
              <Lock size={12} /> مقفولة
            </span>
          )}
          {realStatus === 'upcoming' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1 text-[11px] font-bold tracking-widest text-slate-300 ring-1 ring-white/10 backdrop-blur">
              <Rocket size={12} /> بعدين
            </span>
          )}
        </div>

        {/* Row header */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="relative">
              <StepIcon icon={step.icon} color={stepColor} large />
              <span className="absolute -bottom-0.5 -right-0.5">
                <StatusDot size="md" percent={stepPercent} />
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Trimestre {index + 1} / {total}
                </div>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight mt-0.5">
                {step.title}
              </h3>
              {step.description && (
                <p className="mt-1 line-clamp-1 text-sm text-slate-300/80">{step.description}</p>
              )}
            </div>
          </div>

          <div className="flex flex-1 flex-wrap items-center justify-between gap-3 sm:justify-end">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 font-bold text-white ring-1 ring-white/10">
                {Math.round(stepPercent)}%
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/12 px-2.5 py-1 font-semibold text-indigo-200 ring-1 ring-indigo-400/20">
                <BookMarked size={13} /> {step.subjectCount} matières
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/12 px-2.5 py-1 font-semibold text-sky-200 ring-1 ring-sky-400/20">
                <PlayCircle size={13} /> {step.courseCount}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2.5 py-1 font-semibold text-emerald-200 ring-1 ring-emerald-400/20">
                <Pencil size={13} /> {step.exerciseCount}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/12 px-2.5 py-1 font-semibold text-amber-200 ring-1 ring-amber-400/20">
                <FileCheck size={13} /> {step.devoirCount}
              </span>
            </div>

            <div className="w-44">
              <div className="mb-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-slate-400">
                <span>Progrès trimestre</span>
                <span className="text-white">{Math.round(stepPercent)}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/5">
                <div
                  className={`h-full rounded-full transition-[width] duration-700 ${
                    realStatus === 'done'
                      ? 'bg-gradient-to-r from-emerald-400 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.45)]'
                      : 'bg-gradient-to-r from-sky-400 via-indigo-400 to-amber-300 shadow-[0_0_12px_rgba(56,189,248,0.45)]'
                  }`}
                  style={{ width: `${stepPercent}%` }}
                />
              </div>
            </div>

            <button
              onClick={onToggle}
              disabled={realStatus === 'locked'}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-all duration-200 ${
                expanded
                  ? 'bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15'
                  : realStatus === 'locked'
                  ? 'bg-white/5 text-slate-500 ring-1 ring-white/10 cursor-not-allowed'
                  : 'bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-[0_12px_30px_-10px_rgba(56,189,248,0.7)] hover:brightness-110 hover:-translate-y-0.5'
              }`}
            >
              {expanded
                ? 'Replier'
                : realStatus === 'locked'
                ? 'Débloqué bientôt'
                : stepPercent > 0 || index === 0
                ? 'Continuer'
                : 'Commencer'}
              <ChevronDown size={15} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="mt-7 border-t border-white/10 pt-7">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="inline-flex items-center gap-2 text-sm font-black tracking-widest text-slate-300">
                    <Layers size={14} className="text-sky-300" /> Matières du trimestre
                  </h4>
                  <span className="text-xs text-slate-400">
                    {step.subjects.length} matière(s)
                  </span>
                </div>

                {step.subjects.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-slate-400 rounded-2xl border border-dashed border-white/10 bg-white/[0.02]">
                    <MapIcon size={28} className="opacity-50 text-slate-400" />
                    <span dir="rtl">ما فماش مواد متاحة توا في هاذا المستوى.</span>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {step.subjects.map((subject, i) => (
                      <SubjectBranch
                        key={subject.id}
                        subject={subject}
                        expanded={expandedSubjectId === subject.id}
                        onToggle={() =>
                          expandedSubjectId === subject.id
                            ? onToggleSubject(null)
                            : onToggleSubject(subject.id)
                        }
                        onOpen={onOpen}
                        aggregate={aggregate}
                        index={i}
                      />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}

const AnnouncementsPanel: React.FC = () => {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    communicationsAPI
      .getStudentFeed({ limit: 6 })
      .then((res) => setItems(res.data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <aside className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-[#0a1847]/90 via-[#0a1847] to-[#0b1b5b] p-5 shadow-xl backdrop-blur">
      <div className="pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full bg-amber-400/10 blur-3xl" />
      <h2 className="relative flex items-center gap-2 text-lg font-bold text-white">
        <Megaphone size={19} className="text-amber-300" /> Annonces
      </h2>
      {loading && (
        <div className="mt-4 flex justify-center py-6">
          <Loader2 size={22} className="animate-spin text-sky-300" />
        </div>
      )}
      <ul className="relative mt-4 space-y-3">
        {items.map((item: any) => (
          <li
            key={item.id}
            className={`rounded-2xl border p-3.5 transition hover:-translate-y-0.5 ${
              item.isPinned
                ? 'border-amber-400/25 bg-gradient-to-br from-amber-500/10 via-[#0a1847]/90 to-[#0a1847]'
                : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
            }`}
          >
            <div className="mb-1.5 flex items-center gap-2">
              {item.isPinned && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200 ring-1 ring-amber-400/25">
                  <Pin size={10} /> Épinglé
                </span>
              )}
              {item.title && (
                <span className="line-clamp-1 text-sm font-bold text-white">{item.title}</span>
              )}
            </div>
            <p
              className="prose-sm text-sm text-slate-300/90"
              dir="auto"
              dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(item.contentHtml) }}
            />
            {item.externalLink && (
              <a
                href={item.externalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-sky-300 hover:text-sky-200 hover:underline"
              >
                En savoir plus <ExternalLink size={12} />
              </a>
            )}
          </li>
        ))}
        {!loading && items.length === 0 && (
          <li className="py-4 text-center text-sm text-slate-400 rounded-2xl border border-dashed border-white/10 bg-white/[0.02]">
            Pas encore d'annonces.
          </li>
        )}
      </ul>
    </aside>
  )
}

const TeacherAdsSidebar: React.FC = () => {
  const [ads, setAds] = useState<SidebarTeacherAd[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    teacherAdsAPI
      .getPublic()
      .then((res) => setAds((res.data as any)?.ads || (res.data as any)?.items || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const preview = ads.slice(0, 1)
  if (!loading && preview.length === 0) return null

  return (
    <aside className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-[#0a1847]/90 via-[#08133a] to-[#0a1847] p-5 shadow-xl backdrop-blur">
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-teal-500/10 blur-3xl" />
      <h2 className="relative flex items-center justify-between font-bold text-white mb-4">
        <span className="flex items-center gap-2">
          <GraduationCap size={18} className="text-teal-300" /> Annonces Profs
        </span>
        <ChevronRight size={14} className="text-slate-400" />
      </h2>
      {loading ? (
        <div className="h-28 animate-pulse rounded-2xl bg-white/5" />
      ) : (
        <div className="space-y-3">
          {preview.map((ad) => {
            const wa = formatWhatsAppLink(ad.whatsapp)
            return (
              <article key={ad.id} className="relative space-y-3">
                {ad.image && (
                  <div className="relative overflow-hidden rounded-2xl ring-1 ring-white/10">
                    <img
                      src={toAssetUrl(ad.image)}
                      alt={ad.teacherName || 'Teacher ad'}
                      className="h-36 w-full object-cover"
                      loading="lazy"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#071840]/70 to-transparent" />
                  </div>
                )}
                <div>
                  <p className="font-bold text-sm text-white">{ad.teacherName}</p>
                  {ad.subject && (
                    <p className="text-xs font-bold text-teal-300">{ad.subject}</p>
                  )}
                  {ad.description && (
                    <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                      {ad.description}
                    </p>
                  )}
                </div>
                {wa && (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-200 ring-1 ring-emerald-400/25 hover:bg-emerald-500/20 transition"
                  >
                    <MessageCircle size={12} /> WhatsApp
                  </a>
                )}
              </article>
            )
          })}
          {ads.length > 1 && (
            <p className="text-xs text-slate-400 pt-1">
              +{ads.length - 1} autre annonce(s) supplémentaire(s) sur la page d'accueil.
            </p>
          )}
        </div>
      )}
    </aside>
  )
}

const ShopSidebar: React.FC = () => {
  const [products, setProducts] = useState<SidebarShopProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    shopAPI
      .getPublic()
      .then((res) => setProducts((res.data as any)?.products || (res.data as any)?.items || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const preview = products.slice(0, 1)
  if (!loading && preview.length === 0) return null

  return (
    <aside className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-[#0a1847]/90 via-[#08133a] to-[#0a1847] p-5 shadow-xl backdrop-blur">
      <div className="pointer-events-none absolute -top-10 right-0 h-40 w-40 rounded-full bg-rose-500/10 blur-3xl" />
      <h2 className="relative flex items-center justify-between font-bold text-white mb-4">
        <span className="flex items-center gap-2">
          <ShoppingBag size={18} className="text-rose-300" /> Boutique TuniBac
        </span>
        <ChevronRight size={14} className="text-slate-400" />
      </h2>
      {loading ? (
        <div className="h-28 animate-pulse rounded-2xl bg-white/5" />
      ) : (
        <div className="space-y-3">
          {preview.map((product) => {
            const wa = formatWhatsAppLink(product.whatsapp)
            return (
              <article key={product.id} className="space-y-3">
                {product.image && (
                  <div className="relative overflow-hidden rounded-2xl ring-1 ring-white/10">
                    <img
                      src={toAssetUrl(product.image)}
                      alt={product.name || 'Shop product'}
                      className="h-32 w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
                <div>
                  <p className="font-bold text-sm text-white">{product.name}</p>
                  {typeof product.price === 'number' && (
                    <p className="text-xs font-black text-rose-300">
                      {product.price.toFixed(2)} TND
                    </p>
                  )}
                  {product.description && (
                    <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                      {product.description}
                    </p>
                  )}
                </div>
                {(wa || product.externalLink) && (
                  <a
                    href={wa || product.externalLink || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-3 py-1 text-xs font-bold text-rose-200 ring-1 ring-rose-400/25 hover:bg-rose-500/20 transition"
                  >
                    <ShoppingBag size={12} /> Commander
                  </a>
                )}
              </article>
            )
          })}
        </div>
      )}
    </aside>
  )
}

const MotivationCard: React.FC<{
  overallPercent: number
}> = ({ overallPercent }) => {
  const encouragement =
    overallPercent >= 90
      ? "🎯 إنت قريب بزاف من الغاية. آخر ضربات القلم، والباك هو لك!"
      : overallPercent >= 60
      ? "🔥 إنت جايت بالفعل أغلب المسار. كمّل هكّا، كل خطوة تعملها تقرّبك أكثر لهدفك."
      : overallPercent >= 30
      ? "⭐ إنت ماشي في الثنية الصحيحة! كل حصة نص ساعة تحسب. صبّر شوية."
      : "🚀 خطوة صغيرة اليوم، نجاح كبير غدوة! كل يوم شي خطوة، حتّى توصل للغاية."
  return (
    <aside className="relative overflow-hidden rounded-[28px] border border-amber-400/25 bg-gradient-to-br from-[#0a1847] via-[#0b1e58] to-[#0a1847] p-5 shadow-xl backdrop-blur">
      <div className="pointer-events-none absolute -top-14 right-0 h-48 w-48 rounded-full bg-amber-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-14 left-0 h-44 w-44 rounded-full bg-indigo-500/15 blur-3xl" />
      <h2 className="relative flex items-center gap-2 font-bold text-white mb-2">
        <Sparkles size={18} className="text-amber-300" /> Motivation du jour
      </h2>
      <p dir="rtl" className="relative text-sm text-amber-100/90 leading-relaxed">
        {encouragement}
      </p>
      <div className="relative mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
          <Trophy size={12} className="text-amber-300" /> Objectif Bac
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 via-sky-400 to-indigo-500 transition-[width] duration-700"
            style={{ width: `${overallPercent}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-xs font-bold text-white">
          <span className="text-slate-400">Progression</span>
          <span>{Math.round(overallPercent)}%</span>
        </div>
      </div>
    </aside>
  )
}

const LearningPath: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tree, setTree] = useState<LearningPathTree | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedStepId, setExpandedStep] = useState<string | null>(null)
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null)
  const [aggregate, setAggregate] = useState<AggregateProgress | null>(null)
  const [progressLoading, setProgressLoading] = useState(true)

  useEffect(() => {
    learningPathAPI
      .getTree()
      .then((res) => {
        const data = res.data as LearningPathTree
        setTree(data)
        // Expose steps so trimestre status helper can evaluate real hierarchy
        ;(globalThis as any).__currentSteps = data?.steps || []
        // Auto-expand first active/unfinished trimestre
        const active =
          (data?.steps || []).find((s) => (s.progress.percent ?? 0) > 0 && (s.progress.percent ?? 0) < 100) ||
          (data?.steps || [])[0]
        if (active) setExpandedStep(active.id)
      })
      .catch(() => setError('Impossible de charger ton parcours. Réessaie plus tard.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    let active = true
    setProgressLoading(true)
    Promise.allSettled([progressAPI.getAggregate?.().catch(() => null) as any]).then(([aggRes]) => {
      if (!active) return
      const aggData = aggRes.status === 'fulfilled' ? (aggRes.value ?? null) : null
      setAggregate(aggData as any)
      setProgressLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  const openContent = (type: 'course' | 'exercise' | 'devoir', id: string) => {
    const path =
      type === 'course'
        ? `/courses/${id}`
        : type === 'exercise'
        ? `/exercises/${id}`
        : `/devoirs/${id}`
    navigate(path, {
      state: { fromLearningPath: true },
    })
  }

  const expandedStep = useMemo(
    () => tree?.steps.find((s) => s.id === expandedStepId) || null,
    [tree, expandedStepId]
  )

  const crumbs = useMemo(() => {
    const list: Array<{ label: string; to?: string; onClick?: () => void }> = []
    if (expandedStep) {
      list.push({
        label: expandedStep.title,
        onClick: () => setExpandedStep(expandedStep.id),
      })
      const subject = expandedStep.subjects.find((s) => s.id === expandedSubject)
      if (subject) {
        list.push({ label: subject.name, onClick: () => setExpandedSubject(subject.id) })
      }
    }
    return list
  }, [expandedStep, expandedSubject])

  const goBack = () => {
    if (expandedSubject) {
      setExpandedSubject(null)
      return
    }
    if (expandedStepId) {
      setExpandedStep(null)
      return
    }
    navigate('/dashboard')
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-sky-400/30 blur-xl" />
            <Loader2 size={38} className="relative animate-spin text-sky-400" />
          </div>
          <p className="text-sm font-bold text-slate-400">
            Chargement de ton parcours académique…
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <p className="text-rose-400 font-semibold">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 px-6 py-2.5 font-bold text-white shadow-lg hover:brightness-110 transition"
        >
          Réessayer
        </button>
      </div>
    )
  }

  const steps = tree?.steps || []

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#04091f] via-[#071238] to-[#050d2a] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* Top header bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
              <Link to="/dashboard" className="hover:text-sky-300 transition">
                Dashboard
              </Link>{' '}
              · Roadmap académique
            </div>
          </div>
          <button
            onClick={goBack}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:border-sky-400/50 hover:text-sky-200 hover:bg-white/10 transition"
          >
            <ArrowLeft size={15} /> Retour
          </button>
        </div>

        <JourneyHero
          tree={tree!}
          aggregate={aggregate}
          firstName={user?.firstName}
          bacSection={user?.bacSection}
          loadingProgress={progressLoading}
        />

        {crumbs.length > 0 && (
          <div className="mt-7">
            <Breadcrumbs crumbs={crumbs} className="!mb-0 !bg-white/5 !border-white/10" />
          </div>
        )}

        <TrimestreRoadmapHeader steps={steps} />

        <div className="mt-10 grid gap-7 xl:grid-cols-[1fr_340px]">
          {/* Main: trimestres */}
          <div className="space-y-10">
            {steps.length === 0 && (
              <div className="flex flex-col items-center gap-4 rounded-[28px] border border-dashed border-white/15 py-20 text-center bg-white/[0.02]">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-sky-400/20 blur-xl" />
                  <Layers size={44} className="relative text-sky-300" />
                </div>
                <div>
                  <p className="text-xl font-black text-white">
                    Le parcours n'est pas encore prêt.
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Reviens bientôt — ton chemin académique est en construction.
                  </p>
                </div>
              </div>
            )}

            {steps.map((step, index) => (
              <StepRoadmapItem
                key={step.id}
                step={step}
                index={index}
                total={steps.length}
                expanded={expandedStepId === step.id}
                onToggle={() =>
                  expandedStepId === step.id ? setExpandedStep(null) : setExpandedStep(step.id)
                }
                expandedSubjectId={expandedSubject}
                onToggleSubject={setExpandedSubject}
                onOpen={openContent}
                aggregate={aggregate}
              />
            ))}

            {/* Completion milestone banner */}
            {steps.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="relative overflow-hidden rounded-[32px] border border-amber-400/25 bg-gradient-to-br from-[#0a1847] via-[#0a1847] to-[#08133a] p-7 sm:p-9 shadow-[0_30px_80px_-30px_rgba(251,191,36,0.35)]"
              >
                <div className="pointer-events-none absolute -top-24 right-0 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl" />
                <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:items-center">
                  <div>
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400/15 to-rose-400/10 px-3.5 py-1.5 ring-1 ring-amber-400/30 backdrop-blur">
                      <Trophy size={14} className="text-amber-300" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200">
                        Destination finale
                      </span>
                    </div>
                    <h3 className="mt-4 text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight">
                      Baccalauréat 2026 —{' '}
                      <span className="bg-gradient-to-r from-amber-300 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
                        La ligne d'arrivée
                      </span>
                    </h3>
                    <p dir="rtl" className="mt-3 max-w-xl text-base text-slate-300/90 leading-relaxed">
                      كل تريماستر خلّصتو، كل مادة اتقنتها، كل تمرين صحّحتو يقرّبوك أكثر من هاذا
                      اللحظة. السنة متاعك هي — وإنت وحدك ما زالش في هاذا المسار.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs font-bold text-white ring-1 ring-white/10">
                        <CheckCircle2 size={12} className="text-emerald-300" /> Trimestres validés
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs font-bold text-white ring-1 ring-white/10">
                        <BookMarked size={12} className="text-sky-300" /> Cours + exercices
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs font-bold text-white ring-1 ring-white/10">
                        <GraduationCap size={12} className="text-amber-300" /> Diplôme final
                      </span>
                    </div>
                  </div>

                  <div className="relative lg:justify-self-end">
                    <div className="absolute -inset-4 rounded-[36px] bg-gradient-to-br from-amber-400/20 via-sky-400/15 to-indigo-400/20 blur-2xl" />
                    <div className="relative overflow-hidden rounded-[28px] border border-white/10 ring-1 ring-white/10 shadow-[0_25px_70px_-25px_rgba(251,191,36,0.45)] bg-[#061234] h-72">
                      {/* Bac diploma goal milestone overlay (top-right) */}
                      <div className="absolute top-4 right-4 z-20 pointer-events-none">
                        <div className="relative">
                          <div className="absolute -inset-3 rounded-2xl bg-gradient-to-br from-amber-400/35 via-sky-400/25 to-rose-400/20 blur-2xl" />
                          <div className="relative flex items-center gap-2.5 rounded-2xl border border-amber-400/35 bg-gradient-to-br from-[#0a1847]/92 via-[#0b1e58]/92 to-[#0a1847]/92 px-3 py-2.5 backdrop-blur-md shadow-[0_18px_50px_-18px_rgba(251,191,36,0.65)] ring-1 ring-white/15">
                            <BacDiplomaSVG size={50} />
                            <div className="leading-tight">
                              <div className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-200/90">
                                Étape finale
                              </div>
                              <div className="text-xs font-black text-white whitespace-nowrap">
                                Bac <span className="text-amber-200">Tunisien</span>
                              </div>
                              <div className="text-[9px] font-semibold text-slate-300/80 mt-0.5">
                                🎯 Objectif final
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Fallback graduation scene SVG */}
                      <div className="pointer-events-none absolute inset-0 z-0">
                        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1e5c] via-[#0a1847] to-[#050d2a]" />
                        <div className="absolute top-0 left-1/4 h-72 w-72 -translate-y-1/3 rounded-full bg-amber-400/20 blur-3xl" />
                        <div className="absolute bottom-0 right-0 h-72 w-72 translate-y-1/4 rounded-full bg-rose-500/15 blur-3xl" />
                        <div className="absolute inset-0 opacity-50" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.15) 0.5px, transparent 1px), radial-gradient(circle at 70% 40%, rgba(251,191,36,0.25) 1px, transparent 1.5px)', backgroundSize: '32px 32px, 50px 50px' }} />
                        <svg viewBox="0 0 360 288" className="absolute inset-0 h-full w-full opacity-90">
                          {/* University gate */}
                          <g transform="translate(70,90)" opacity="0.9">
                            <rect x="0" y="0" width="28" height="160" fill="#334155" />
                            <rect x="200" y="0" width="28" height="160" fill="#334155" />
                            <rect x="-10" y="-14" width="258" height="22" fill="#1e293b" />
                            <path d="M28 0 Q 114 -50 200 0 L 200 20 Q 114 -22 28 20 Z" fill="#0f172a" />
                            <g transform="translate(90,30)">
                              <circle cx="10" cy="130" r="2.5" fill="#fbbf24" />
                            </g>
                          </g>
                          {/* Graduate silhouette holding diploma */}
                          <g transform="translate(145,120)" opacity="0.98">
                            {/* Graduation cap */}
                            <polygon points="0,8 45,-8 90,8 45,16" fill="#1e293b" />
                            <rect x="42" y="16" width="6" height="26" fill="#1e293b" />
                            <circle cx="45" cy="44" r="4" fill="#fbbf24" />
                            {/* Head */}
                            <circle cx="45" cy="58" r="18" fill="#1e293b" />
                            {/* Gown */}
                            <path d="M10 140 Q 10 80 45 76 Q 80 80 80 140 L 70 160 L 20 160 Z" fill="#1e3a8a" />
                            {/* Diploma */}
                            <rect x="62" y="100" width="50" height="22" rx="3" fill="#fbbf24" />
                            <rect x="62" y="100" width="6" height="22" fill="#f59e0b" />
                            <rect x="106" y="100" width="6" height="22" fill="#f59e0b" />
                            <line x1="72" y1="108" x2="104" y2="108" stroke="#92400e" strokeWidth="1" />
                            <line x1="72" y1="113" x2="100" y2="113" stroke="#92400e" strokeWidth="1" />
                          </g>
                          {/* Confetti */}
                          <g opacity="0.9">
                            <rect x="30" y="40" width="6" height="12" fill="#f59e0b" transform="rotate(-20 30 40)" />
                            <rect x="310" y="30" width="6" height="12" fill="#ef4444" transform="rotate(18 310 30)" />
                            <rect x="60" y="220" width="6" height="12" fill="#0ea5e9" transform="rotate(28 60 220)" />
                            <rect x="320" y="200" width="6" height="12" fill="#a78bfa" transform="rotate(-30 320 200)" />
                            <circle cx="200" cy="40" r="3" fill="#f472b6" />
                            <circle cx="120" cy="70" r="2.5" fill="#34d399" />
                            <circle cx="300" cy="130" r="2.5" fill="#fde047" />
                            <circle cx="40" cy="140" r="3" fill="#f43f5e" />
                            <circle cx="330" cy="80" r="2.5" fill="#38bdf8" />
                            <circle cx="170" cy="240" r="3" fill="#c084fc" />
                          </g>
                        </svg>
                      </div>
                      <img
                        src={COMPLETION_ILLUSTRATION}
                        alt="Remise des diplômes du Bac"
                        className="relative z-10 h-72 w-full object-cover"
                        loading="lazy"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#050d2a]/70 via-[#050d2a]/10 to-transparent" />
                      <div className="absolute bottom-5 left-5 right-5 z-20">
                        <div className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-400 to-rose-500 px-4 py-2 shadow-[0_12px_30px_-8px_rgba(251,191,36,0.6)]">
                          <Star size={15} className="text-[#071840]" />
                          <span className="text-sm font-black text-[#071840]">
                            🇹🇳 Tu l'auras, inch'Allah !
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.section>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <MotivationCard overallPercent={aggregate?.overallPercent ?? 0} />
            <AnnouncementsPanel />
            <TeacherAdsSidebar />
            <ShopSidebar />

            {/* Quick actions */}
            <Link
              to="/study-planner"
              className="group block rounded-[28px] border border-amber-400/25 bg-gradient-to-br from-amber-500/15 via-[#0a1847] to-[#0a1847] p-5 shadow-xl hover:-translate-y-0.5 hover:shadow-[0_20px_60px_-25px_rgba(245,158,11,0.6)] transition"
            >
              <h2 className="flex items-center gap-2 font-bold text-white mb-1">
                <CalendarDays size={19} className="text-amber-300" /> Planificateur
              </h2>
              <p dir="rtl" className="text-sm text-slate-300/80">نظّم وقتك وخلي المراجعة واضحة.</p>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 px-4 py-2 text-sm font-bold text-white shadow-lg group-hover:brightness-110 transition">
                <CalendarDays size={14} /> Ouvrir le planificateur
              </span>
            </Link>

            <Link
              to="/live-study"
              className="group block rounded-[28px] border border-sky-400/25 bg-gradient-to-br from-sky-500/15 via-[#0a1847] to-[#0a1847] p-5 shadow-xl hover:-translate-y-0.5 hover:shadow-[0_20px_60px_-25px_rgba(56,189,248,0.6)] transition"
            >
              <h2 className="flex items-center gap-2 font-bold text-white mb-1">
                <BarChart3 size={19} className="text-sky-300" /> Étudier en direct
              </h2>
              <p dir="rtl" className="text-sm text-slate-300/80">إدخل قاعة الدراسة واقرا مع رفاقك.</p>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-lg group-hover:brightness-110 transition">
                Live Study <ChevronRight size={14} />
              </span>
            </Link>

            <Link
              to="/teachers"
              className="group block rounded-[28px] border border-teal-400/25 bg-gradient-to-br from-teal-500/15 via-[#0a1847] to-[#0a1847] p-5 shadow-xl hover:-translate-y-0.5 hover:shadow-[0_20px_60px_-25px_rgba(20,184,166,0.6)] transition"
            >
              <h2 className="flex items-center gap-2 font-bold text-white mb-1">
                <User size={19} className="text-teal-300" /> Enseignants
              </h2>
              <p dir="rtl" className="text-sm text-slate-300/80">إلقى الأستاذ اللي يناسبك.</p>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-lg group-hover:brightness-110 transition">
                Voir les profs <ChevronRight size={14} />
              </span>
            </Link>

            <Link
              to="/shop"
              className="group block rounded-[28px] border border-rose-400/25 bg-gradient-to-br from-rose-500/15 via-[#0a1847] to-[#0a1847] p-5 shadow-xl hover:-translate-y-0.5 hover:shadow-[0_20px_60px_-25px_rgba(244,63,94,0.6)] transition"
            >
              <h2 className="flex items-center gap-2 font-bold text-white mb-1">
                <ShoppingCart size={19} className="text-rose-300" /> Boutique
              </h2>
              <p dir="rtl" className="text-sm text-slate-300/80">آلات حساب & لوازم مدرسية.</p>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 px-4 py-2 text-sm font-bold text-white shadow-lg group-hover:brightness-110 transition">
                Commander <ShoppingCart size={14} />
              </span>
            </Link>

            <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-[#0a1847] to-[#08133a] p-5 shadow-xl">
              <h2 className="flex items-center gap-2 font-bold text-white">
                <GraduationCap size={18} className="text-indigo-300" /> Ma section
              </h2>
              <p className="mt-1 text-sm text-slate-300/90">
                {user?.bacSection
                  ? `Bac ${user.bacSection.replace(/_/g, ' ')}`
                  : '—'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Adapté automatiquement à ton parcours.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LearningPath
