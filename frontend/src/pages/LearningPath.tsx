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
  Target,
  User,
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

const ProgressDots: React.FC<{ percent: number }> = ({ percent }) => {
  const status = percent >= 100 ? 'done' : percent > 0 ? 'progress' : 'empty'
  return (
    <div className="flex items-center gap-2">
      {status === 'done' ? (
        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
          <CheckCircle2 size={15} /> Terminé
        </span>
      ) : status === 'progress' ? (
        <span className="flex items-center gap-1 text-xs font-semibold text-brand-blue">
          <Circle size={12} className="fill-brand-blue/30" /> {percent}%
        </span>
      ) : (
        <span className="flex items-center gap-1 text-xs font-medium text-text-muted-light dark:text-text-muted">
          <Circle size={12} /> Pas commencé
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
  const Icon = (icon && STEP_ICONS[icon]) || MapPin
  const sz = large ? 28 : 22
  const box = large ? 'h-16 w-16 rounded-2xl' : 'h-14 w-14 rounded-2xl'
  return (
    <div className="relative">
      <span
        className={`absolute inset-0 rounded-2xl opacity-25 ${box}`}
        style={{ backgroundColor: color || '#071840' }}
      />
      <span
        className={`relative flex ${box} items-center justify-center rounded-2xl text-white shadow-[0_8px_24px_-8px_rgba(7,24,64,0.45)] ring-4 ring-white dark:ring-[#0f172f]`}
        style={{ backgroundColor: color || '#071840' }}
      >
        <Icon size={sz} strokeWidth={2.1} />
      </span>
    </div>
  )
}

const SubjectIcon: React.FC<{ color?: string | null }> = ({ color }) => (
  <div className="relative">
    <span
      className="absolute inset-0 rounded-xl opacity-20 h-11 w-11"
      style={{ backgroundColor: color || '#1d4ed8' }}
    />
    <span
      className="relative flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-[0_6px_18px_-8px_rgba(29,78,216,0.55)] ring-2 ring-white dark:ring-[#0f172f]"
      style={{ backgroundColor: color || '#1d4ed8' }}
    >
      <BookMarked size={19} strokeWidth={2.1} />
    </span>
  </div>
)

const ItemStatus: React.FC<{ completed: boolean }> = ({ completed }) =>
  completed ? (
    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
  ) : (
    <Circle size={16} className="text-text-muted-light/40 dark:text-text-muted/40 shrink-0" />
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
    ? 'bg-emerald-500 text-white'
    : inProgress
    ? 'bg-sky-500 text-white'
    : 'bg-sky-500 text-white'
  return (
    <span className={`relative flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${base}`}>
      <Icon size={15} />
      <span
        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white dark:ring-[#0f172f] ${
          completed
            ? 'bg-emerald-500'
            : inProgress
            ? 'bg-sky-500'
            : 'bg-slate-300'
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
    ? 'bg-emerald-500 text-white'
    : inProgress
    ? 'bg-sky-500 text-white'
    : 'bg-emerald-600 text-white'
  return (
    <span className={`relative flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${base}`}>
      <Icon size={15} />
      <span
        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white dark:ring-[#0f172f] ${
          completed
            ? 'bg-emerald-500'
            : inProgress
            ? 'bg-sky-500'
            : 'bg-slate-300'
        }`}
      />
    </span>
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
    percent >= 100 ? 'bg-emerald-500' : percent > 0 ? 'bg-sky-500' : 'bg-slate-300'
  return <span className={`shrink-0 rounded-full ${cls} ${color}`} />
}

const ProgressRing: React.FC<{ percent: number; size?: number }> = ({
  percent,
  size = 110,
}) => {
  const stroke = 10
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, percent))
  const offset = circ - (circ * clamped) / 100
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#progGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
        <defs>
          <linearGradient id="progGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#071840" />
            <stop offset="60%" stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#0ea5e9" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-black text-[#071840]">
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

interface ObjectiveItem {
  id: string
  title: string
  description?: string | null
  stepId?: string | null
  subjectId?: string | null
  courseId?: string | null
  exerciseId?: string | null
  targetDate?: string | null
  progress?: number
  createdAt?: string
}

const ProgressDashboard: React.FC<{
  loading: boolean
  aggregate: AggregateProgress | null
  objectives: ObjectiveItem[]
  hideGoals?: boolean
}> = ({ loading, aggregate, objectives, hideGoals = false }) => {
  const percent = aggregate?.overallPercent ?? 0
  const recent = objectives.slice(0, 3)

  if (loading) {
    return (
      <div className={`mb-8 ${hideGoals ? '' : 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]'} overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm`}>
        <div className="h-52 animate-pulse rounded-xl bg-slate-100" />
        {!hideGoals && (
          <div className="space-y-3">
            <div className="h-8 w-40 animate-pulse rounded-lg bg-slate-100" />
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-20 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        )}
      </div>
    )
  }

  const currentGoal = objectives.find((o) => (o.progress || 0) < 100)

  return (
    <div className={`mb-8 ${hideGoals ? '' : 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]'} overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm`}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <ProgressRing percent={percent} />
        <div className="flex-1 space-y-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Progression globale
            </div>
            <div className="mt-1 text-2xl font-black text-[#071840]">
              Ton avancement vers le Bac
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-sky-700">
                <PlayCircle size={13} /> Cours
              </div>
              <div className="mt-1 text-lg font-black text-slate-800">
                {aggregate?.coursesCompleted ?? 0}/
                {aggregate?.coursesTotal ?? 0}
              </div>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                <Pencil size={13} /> Exercices
              </div>
              <div className="mt-1 text-lg font-black text-slate-800">
                {aggregate?.exercisesCompleted ?? 0}/
                {aggregate?.exercisesTotal ?? 0}
              </div>
            </div>
          </div>

          {!hideGoals && currentGoal && (
            <div className="rounded-xl border border-amber-200/60 bg-gradient-to-br from-amber-50 to-white p-3">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-amber-700">
                <Target size={13} /> Objectif en cours
              </div>
              <div className="line-clamp-1 font-bold text-amber-900">
                {currentGoal.title}
              </div>
            </div>
          )}
        </div>
      </div>

      {!hideGoals && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-sm font-black text-slate-800">
              <Target size={15} className="text-brand-blue" /> Tes derniers objectifs
            </h3>
            <span className="text-[11px] font-bold text-slate-400">
              {objectives.length} total
            </span>
          </div>
          {recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500">
              <Target size={24} className="text-slate-300" />
              <p>
                Objectifs & نصائح pour le Bac — gestionnés dans ton Profil.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {recent.map((obj) => {
                const p = obj.progress ?? 0
                return (
                  <li
                    key={obj.id}
                    className="rounded-xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="line-clamp-1 font-bold text-slate-800">
                        {obj.title}
                      </span>
                      {obj.targetDate && (
                        <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-slate-900/5 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          <CalendarDays size={10} />{' '}
                          {new Date(obj.targetDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="mt-2">
                      <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-slate-500">
                        <span>Progression</span>
                        <span>{Math.round(p)}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#071840] via-brand-blue to-sky-500"
                          style={{ width: `${p}%` }}
                        />
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

const CourseExerciseItems: React.FC<{
  subject: PathSubjectNode
  onOpen: (type: 'course' | 'exercise', id: string) => void
  aggregate: AggregateProgress | null
}> = ({ subject, onOpen, aggregate }) => {
  const [showCourses, setShowCourses] = useState(true)
  const [showExercises, setShowExercises] = useState(false)

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <div className="rounded-2xl border border-sky-100 dark:border-sky-500/15 bg-sky-50/40 dark:bg-sky-500/5 p-4">
        <button
          onClick={() => {
            setShowCourses((v) => !v)
            setShowExercises(false)
          }}
          className="flex w-full items-center justify-between"
        >
          <span className="flex items-center gap-2 font-semibold text-sky-900 dark:text-sky-100">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500 text-white">
              <BookOpenCheck size={15} />
            </span>
            Cours
            <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-xs font-bold text-sky-700 dark:text-sky-300">
              {subject.courseCount}
            </span>
          </span>
          <ChevronDown
            size={16}
            className={`text-sky-700 dark:text-sky-300 transition-transform ${showCourses ? 'rotate-180' : ''}`}
          />
        </button>
        <AnimatePresence initial={false}>
          {showCourses && (
            <motion.ul
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={{
                visible: {
                  opacity: 1,
                  height: 'auto',
                  transition: { staggerChildren: 0.04, duration: 0.3, delayChildren: 0.02 },
                },
                hidden: { opacity: 0, height: 0 },
              }}
              className="overflow-hidden"
            >
              {subject.courses.length === 0 && (
                <motion.li
                  variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}
                  className="pt-3 text-sm text-text-muted-light dark:text-text-muted"
                >
                  Aucun cours pour le moment.
                </motion.li>
              )}
              {subject.courses.map((course) => {
                const courseAgg = aggregate?.byCourse?.[course.id]
                const completed = courseAgg?.completed ?? course.completed
                const inProgress = !completed && (courseAgg?.lastReadPos ?? 0) > 0
                return (
                  <motion.li
                    key={course.id}
                    variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  >
                    <button
                      onClick={() => onOpen('course', course.id)}
                      className="group mt-2 flex w-full items-center justify-between gap-2 rounded-xl border border-transparent bg-white/70 dark:bg-white/5 px-3 py-2 text-left text-sm hover:border-sky-400/40 hover:bg-sky-500/5 transition-all"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <CourseItemIcon
                          hasVideo={course.hasVideo}
                          hasPdf={course.hasPdf}
                          hasLink={course.hasLink}
                          completed={completed}
                          inProgress={inProgress}
                        />
                        <span className="line-clamp-1 group-hover:text-sky-700 dark:group-hover:text-sky-300 transition-colors">
                          {course.title}
                        </span>
                      </span>
                      <ItemStatus completed={completed} />
                    </button>
                  </motion.li>
                )
              })}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      <div className="rounded-2xl border border-emerald-100 dark:border-emerald-500/15 bg-emerald-50/40 dark:bg-emerald-500/5 p-4">
        <button
          onClick={() => {
            setShowExercises((v) => !v)
            setShowCourses(false)
          }}
          className="flex w-full items-center justify-between"
        >
          <span className="flex items-center gap-2 font-semibold text-emerald-900 dark:text-emerald-100">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <Pencil size={15} />
            </span>
            Exercices
            <span className="rounded-full bg-emerald-600/15 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
              {subject.exerciseCount}
            </span>
          </span>
          <ChevronDown
            size={16}
            className={`text-emerald-800 dark:text-emerald-300 transition-transform ${showExercises ? 'rotate-180' : ''}`}
          />
        </button>
        <AnimatePresence initial={false}>
          {showExercises && (
            <motion.ul
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={{
                visible: {
                  opacity: 1,
                  height: 'auto',
                  transition: { staggerChildren: 0.04, duration: 0.3, delayChildren: 0.02 },
                },
                hidden: { opacity: 0, height: 0 },
              }}
              className="overflow-hidden"
            >
              {subject.exercises.length === 0 && (
                <motion.li
                  variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}
                  className="pt-3 text-sm text-text-muted-light dark:text-text-muted"
                >
                  Aucun exercice pour le moment.
                </motion.li>
              )}
              {subject.exercises.map((exercise) => {
                const exAgg = aggregate?.byExercise?.[exercise.id]
                const completed = exAgg?.completed ?? exercise.completed
                const inProgress = !completed && (exAgg?.lastReadPos ?? 0) > 0
                return (
                  <motion.li
                    key={exercise.id}
                    variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  >
                    <button
                      onClick={() => onOpen('exercise', exercise.id)}
                      className="group mt-2 flex w-full items-center justify-between gap-2 rounded-xl border border-transparent bg-white/70 dark:bg-white/5 px-3 py-2 text-left text-sm hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <ExerciseItemIcon completed={completed} inProgress={inProgress} />
                        <span className="line-clamp-1 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                          {exercise.title}
                        </span>
                      </span>
                      <ItemStatus completed={completed} />
                    </button>
                  </motion.li>
                )
              })}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

const SubjectBranch: React.FC<{
  subject: PathSubjectNode
  expanded: boolean
  onToggle: () => void
  onOpen: (type: 'course' | 'exercise', id: string) => void
  aggregate: AggregateProgress | null
}> = ({ subject, expanded, onToggle, onOpen, aggregate }) => {
  const subjPercent = aggregate?.bySubject?.[subject.id]?.percent ?? subject.progress.percent
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={`flex w-full items-center gap-3 rounded-2xl border bg-white/95 dark:bg-white/5 p-4 text-left shadow-sm transition-all hover:shadow-md ${
          expanded
            ? 'border-brand-blue/60 ring-2 ring-brand-blue/10 shadow-brand-blue/10'
            : 'border-gray-200 dark:border-white/10 hover:border-brand-blue/40'
        }`}
      >
        <div className="relative">
          <SubjectIcon color={subject.color} />
          <span className="absolute -bottom-0.5 -right-0.5">
            <StatusDot size="sm" percent={subjPercent} />
          </span>
        </div>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-text-light dark:text-text">
            {subject.name}
          </span>
          <span className="block text-xs text-text-muted-light dark:text-text-muted">
            {subject.courseCount} cours · {subject.exerciseCount} exercices
          </span>
        </span>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 dark:bg-white/10 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:text-slate-300">
            {Math.round(subjPercent)}%
          </span>
          <ProgressDots percent={subjPercent} />
        </div>
        <ChevronDown
          size={18}
          className={`shrink-0 text-brand-blue transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <CourseExerciseItems subject={subject} onOpen={onOpen} aggregate={aggregate} />
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
  onOpen: (type: 'course' | 'exercise', id: string) => void
  aggregate: AggregateProgress | null
}> = ({ step, index, total, expanded, onToggle, expandedSubjectId, onToggleSubject, onOpen, aggregate }) => {
  const stepColor = step.color || '#071840'
  const stepPercent = step.progress.percent ?? 0
  return (
    <div className="relative pl-2">
      {/* Connector line */}
      {index < total - 1 && (
        <div
          className="absolute left-[38px] top-16 bottom-[-20px] w-0.5 rounded-full bg-gradient-to-b from-[#071840]/40 to-transparent"
        />
      )}
      <div
        className={`relative rounded-3xl border p-5 transition-all duration-300 ${
          expanded
            ? 'border-[#071840]/50 bg-gradient-to-br from-white to-blue-50/60 dark:from-[#101a36] dark:to-[#0f172f] shadow-[0_20px_60px_-24px_rgba(7,24,64,0.35)]'
            : 'border-gray-200 dark:border-white/10 bg-white/90 dark:bg-white/5'
        }`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="relative">
              <StepIcon icon={step.icon} color={stepColor} large />
              <span className="absolute -bottom-0.5 -right-0.5">
                <StatusDot size="md" percent={stepPercent} />
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-extrabold text-[#071840] dark:text-white">
                  {step.title}
                </h3>
                {stepPercent >= 100 && (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/20">
                    ✓ Terminé
                  </span>
                )}
              </div>
              {step.description && (
                <p className="mt-0.5 line-clamp-1 text-sm text-slate-600 dark:text-slate-400">
                  {step.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-1 flex-wrap items-center justify-between gap-3 sm:justify-end">
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-white/10 px-2 py-0.5 font-bold text-slate-700 dark:text-slate-300">
                {Math.round(stepPercent)}%
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-1 font-semibold text-blue-700 dark:text-blue-300">
                <BookMarked size={13} /> {step.subjectCount} matières
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2.5 py-1 font-semibold text-sky-700 dark:text-sky-300">
                <PlayCircle size={13} /> {step.courseCount} cours
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 font-semibold text-emerald-700 dark:text-emerald-300">
                <Pencil size={13} /> {step.exerciseCount} exercices
              </span>
            </div>
            <div className="w-36">
              <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400">
                <span>Progrès</span>
                <span>{Math.round(stepPercent)}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#071840] via-brand-blue to-sky-500 transition-all duration-500"
                  style={{ width: `${stepPercent}%` }}
                />
              </div>
            </div>
            <button
              onClick={onToggle}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-all ${
                expanded
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-[#071840]'
                  : 'bg-[#071840] text-white hover:shadow-[0_12px_30px_-10px_rgba(7,24,64,0.55)]'
              }`}
            >
              {expanded ? 'Replier' : 'Commencer'}
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
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="mt-5 border-t border-slate-200/70 dark:border-white/10 pt-5">
                <div id={`step-subjects-${step.id}`}>
                  {step.subjects.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-text-muted-light dark:text-text-muted">
                      <MapIcon size={28} className="opacity-40" />
                      Aucune matière pour ce palier pour l’instant.
                    </div>
                  ) : (
                    <motion.div
                      className="mt-4 grid gap-3 md:grid-cols-2"
                      initial="hidden"
                      animate="visible"
                      variants={{
                        visible: {
                          opacity: 1,
                          transition: { staggerChildren: 0.06, delayChildren: 0.05 },
                        },
                        hidden: { opacity: 0 },
                      }}
                    >
                      {step.subjects.map((subject) => (
                        <motion.div
                          key={subject.id}
                          variants={{
                            hidden: { opacity: 0, y: 10 },
                            visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
                          }}
                        >
                          <SubjectBranch
                            subject={subject}
                            expanded={expandedSubjectId === subject.id}
                            onToggle={() =>
                              expandedSubjectId === subject.id
                                ? onToggleSubject(null)
                                : onToggleSubject(subject.id)
                            }
                            onOpen={onOpen}
                            aggregate={aggregate}
                          />
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// Expanded subject state shared across the roadmap

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
    <aside className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-white/5 p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text-light dark:text-text">
        <Megaphone size={19} className="text-accent" /> Annonces
      </h2>
      {loading && (
        <div className="mt-4 flex justify-center py-6">
          <Loader2 size={22} className="animate-spin text-text-muted-light" />
        </div>
      )}
      <ul className="mt-3 space-y-3">
        {items.map((item: any) => (
          <li
            key={item.id}
            className={`rounded-2xl border p-3 ${
              item.isPinned
                ? 'border-amber-300/40 dark:border-amber-400/30 bg-amber-50/60 dark:bg-amber-400/10'
                : 'border-gray-100 dark:border-white/10 bg-background-light dark:bg-white/5'
            }`}
          >
            <div className="mb-1 flex items-center gap-2">
              {item.isPinned && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  <Pin size={10} /> Épinglé
                </span>
              )}
              {item.title && (
                <span className="line-clamp-1 text-sm font-semibold text-text-light dark:text-text">
                  {item.title}
                </span>
              )}
            </div>
            <p
              className="prose-sm text-sm text-text-light dark:text-text"
              dir="auto"
              dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(item.contentHtml) }}
            />
            {item.externalLink && (
              <a
                href={item.externalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
              >
                En savoir plus <ExternalLink size={12} />
              </a>
            )}
          </li>
        ))}
        {!loading && items.length === 0 && (
          <li className="py-4 text-center text-sm text-text-muted-light dark:text-text-muted">
            Pas encore d’annonces.
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
    <aside className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-white/5 p-5">
      <h2 className="flex items-center justify-between font-bold text-text-light dark:text-text mb-3">
        <span className="flex items-center gap-2">
          <GraduationCap size={18} className="text-accent" /> Annonces Profs
        </span>
        <ChevronRight size={14} className="text-slate-400" />
      </h2>
      {loading ? (
        <div className="h-24 animate-pulse rounded-2xl bg-black/5 dark:bg-white/5" />
      ) : (
        <div className="space-y-3">
          {preview.map((ad) => {
            const wa = formatWhatsAppLink(ad.whatsapp)
            return (
              <article key={ad.id} className="space-y-2">
                {ad.image && (
                  <img
                    src={toAssetUrl(ad.image)}
                    alt={ad.teacherName || 'Teacher ad'}
                    className="h-32 w-full rounded-2xl object-cover"
                  />
                )}
                <div>
                  <p className="font-semibold text-sm text-text-light dark:text-text">
                    {ad.teacherName}
                  </p>
                  {ad.subject && (
                    <p className="text-xs font-semibold text-accent">{ad.subject}</p>
                  )}
                  {ad.description && (
                    <p className="mt-1 text-xs text-text-muted-light dark:text-text-muted line-clamp-2">
                      {ad.description}
                    </p>
                  )}
                </div>
                {wa && (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-500/15"
                  >
                    <MessageCircle size={12} /> WhatsApp
                  </a>
                )}
              </article>
            )
          })}
          {ads.length > 1 && (
            <p className="text-xs text-text-muted-light dark:text-text-muted pt-1">
              +{ads.length - 1} autre annonce{ads.length - 1 > 1 ? 's' : ''} disponible
              {ads.length - 1 > 1 ? 's' : ''} sur la page d’accueil.
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
    <aside className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-white/5 p-5">
      <h2 className="flex items-center justify-between font-bold text-text-light dark:text-text mb-3">
        <span className="flex items-center gap-2">
          <ShoppingBag size={18} className="text-accent" /> Boutique TuniBac
        </span>
        <ChevronRight size={14} className="text-slate-400" />
      </h2>
      {loading ? (
        <div className="h-24 animate-pulse rounded-2xl bg-black/5 dark:bg-white/5" />
      ) : (
        <div className="space-y-3">
          {preview.map((product) => {
            const wa = formatWhatsAppLink(product.whatsapp)
            return (
              <article key={product.id} className="space-y-2">
                {product.image && (
                  <img
                    src={toAssetUrl(product.image)}
                    alt={product.name || 'Shop product'}
                    className="h-28 w-full rounded-2xl object-cover"
                  />
                )}
                <div>
                  <p className="font-semibold text-sm text-text-light dark:text-text">{product.name}</p>
                  {typeof product.price === 'number' && (
                    <p className="text-xs font-bold text-accent">{product.price.toFixed(2)} TND</p>
                  )}
                  {product.description && (
                    <p className="mt-1 text-xs text-text-muted-light dark:text-text-muted line-clamp-2">
                      {product.description}
                    </p>
                  )}
                </div>
                {(wa || product.externalLink) && (
                  <a
                    href={wa || product.externalLink || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent hover:bg-accent/15"
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

const LearningPath: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tree, setTree] = useState<LearningPathTree | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedStepId, setExpandedStep] = useState<string | null>(null)
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null)
  const [aggregate, setAggregate] = useState<AggregateProgress | null>(null)
  const [objectivesList] = useState<ObjectiveItem[]>([])
  const [progressLoading, setProgressLoading] = useState(true)

  useEffect(() => {
    learningPathAPI
      .getTree()
      .then((res) => setTree(res.data))
      .catch(() => setError('Impossible de charger ton parcours. Réessaie plus tard.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    let active = true
    setProgressLoading(true)
    Promise.allSettled([
      progressAPI.getAggregate?.().catch(() => null) as any,
    ]).then(([aggRes]) => {
      if (!active) return
      const aggData = aggRes.status === 'fulfilled' ? (aggRes.value ?? null) : null
      setAggregate(aggData as any)
      setProgressLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  const openContent = (type: 'course' | 'exercise', id: string) => {
    navigate(type === 'course' ? `/courses/${id}` : `/exercises/${id}`, {
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
      list.push({ label: expandedStep.title, onClick: () => setExpandedStep(expandedStep.id) })
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
        <Loader2 size={30} className="animate-spin text-accent" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <p className="text-red-500">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-full bg-accent px-6 py-2 font-semibold text-primary"
        >
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-text-light dark:text-text sm:text-3xl">
            <GraduationCap size={26} className="text-accent" />
            Mon parcours vers le Bac
          </h1>
          <p className="mt-1 text-sm text-text-muted-light dark:text-text-muted">
            Révise pas à pas, matière par matière. Avance étape par étape jusqu’au Bac.
          </p>
        </div>
        <button
          onClick={goBack}
          className="flex items-center gap-2 rounded-full border border-gray-200 dark:border-white/10 px-4 py-2 text-sm font-medium text-text-light dark:text-text hover:border-accent/50 hover:text-accent transition-colors"
        >
          <ArrowLeft size={15} /> Retour
        </button>
      </div>

      {crumbs.length > 0 && <Breadcrumbs crumbs={crumbs} className="mb-6" />}

      <ProgressDashboard loading={progressLoading} aggregate={aggregate} objectives={objectivesList} hideGoals />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          {tree?.steps.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-gray-300 dark:border-white/15 py-16 text-center">
              <Layers size={36} className="text-text-muted-light/50" />
              <p className="text-text-muted-light dark:text-text-muted">
                Le parcours n’est pas encore prêt. Reviens bientôt !
              </p>
            </div>
          )}
          <div className="space-y-6">
            {tree?.steps.map((step, index) => (
              <StepRoadmapItem
                key={step.id}
                step={step}
                index={index}
                total={tree.steps.length}
                expanded={expandedStepId === step.id}
                onToggle={() =>
                  expandedStepId === step.id
                    ? setExpandedStep(null)
                    : setExpandedStep(step.id)
                }
                expandedSubjectId={expandedSubject}
                onToggleSubject={setExpandedSubject}
                onOpen={openContent}
                aggregate={aggregate}
              />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <AnnouncementsPanel />
          <TeacherAdsSidebar />
          <ShopSidebar />
          <div className="rounded-3xl border border-amber-200/60 dark:border-amber-500/20 bg-gradient-to-br from-amber-50 to-white dark:from-amber-500/10 dark:to-[#0f172f] p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-bold text-text-light dark:text-text mb-1">
              <CalendarDays size={19} className="text-amber-600 dark:text-amber-400" /> Planificateur
            </h2>
            <p className="text-sm text-text-muted-light dark:text-text-muted">
              نظّم وقتك وخلي المراجعة واضحة.
            </p>
            <button
              onClick={() => navigate('/study-planner')}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-amber-700 transition-colors"
            >
              <CalendarDays size={14} /> Ouvrir le planificateur
            </button>
          </div>
          <div className="rounded-3xl border border-sky-200/60 dark:border-sky-500/20 bg-gradient-to-br from-sky-50 to-white dark:from-sky-500/10 dark:to-[#0f172f] p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-bold text-text-light dark:text-text mb-1">
              <BarChart3 size={19} className="text-sky-700 dark:text-sky-400" /> Progression
            </h2>
            <p className="text-sm text-text-muted-light dark:text-text-muted">
              شوف تقدمك خطوة بخطوة.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1"><MapPin size={12} /> Palier global</span>
                  <span>—</span>
                </div>
                <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                  <div className="h-full w-[45%] rounded-full bg-gradient-to-r from-sky-600 to-sky-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1"><Pencil size={12} /> Exercices</span>
                  <span>—</span>
                </div>
                <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                  <div className="h-full w-[32%] rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400" />
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-teal-200/60 dark:border-teal-500/20 bg-gradient-to-br from-teal-50 to-white dark:from-teal-500/10 dark:to-[#0f172f] p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-bold text-text-light dark:text-text mb-1">
              <User size={19} className="text-teal-700 dark:text-teal-400" /> Enseignants
            </h2>
            <p className="text-sm text-text-muted-light dark:text-text-muted">
              إلقى الأستاذ اللي يناسبك.
            </p>
            <Link
              to="/teachers"
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-teal-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-teal-700 transition-colors"
            >
              Voir les profs <ChevronRight size={14} />
            </Link>
          </div>
          <div className="rounded-3xl border border-rose-200/60 dark:border-rose-500/20 bg-gradient-to-br from-rose-50 to-white dark:from-rose-500/10 dark:to-[#0f172f] p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-bold text-text-light dark:text-text mb-1">
              <ShoppingCart size={19} className="text-rose-700 dark:text-rose-400" /> Boutique
            </h2>
            <p className="text-sm text-text-muted-light dark:text-text-muted">
              Calculatrices et fournitures.
            </p>
            <Link
              to="/shop"
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-rose-700 transition-colors"
            >
              Commander <ShoppingCart size={14} />
            </Link>
          </div>
          <div className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-white/5 p-5">
            <h2 className="flex items-center gap-2 font-bold text-text-light dark:text-text">
              <GraduationCap size={18} className="text-brand-blue" /> Section
            </h2>
            <p className="mt-1 text-sm text-text-muted-light dark:text-text-muted">
              {user?.bacSection ? `Bac ${user.bacSection.replace(/_/g, ' ')}` : '—'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LearningPath
