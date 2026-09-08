import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Check,
  Lightbulb,
  Pencil,
  PlayCircle,
  Target,
  Loader2,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  progressAPI,
  objectivesAPI,
  tipsAPI,
} from '../services/api'

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

interface TipItem {
  id: string
  title?: string | null
  content: string
  stepId?: string | null
  subjectId?: string | null
  bacSection?: string | null
  order?: number
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
          stroke="url(#progGradProfile)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
        <defs>
          <linearGradient id="progGradProfile" x1="0" y1="0" x2="1" y2="1">
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

const ProgressDashboard: React.FC<{
  loading: boolean
  aggregate: AggregateProgress | null
  objectives: ObjectiveItem[]
}> = ({ loading, aggregate, objectives }) => {
  const percent = aggregate?.overallPercent ?? 0
  const recent = objectives.slice(0, 5)

  if (loading) {
    return (
      <div className="mb-8 grid gap-6 overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <div className="h-52 animate-pulse rounded-xl bg-slate-100" />
        <div className="space-y-3">
          <div className="h-8 w-40 animate-pulse rounded-lg bg-slate-100" />
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="h-20 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      </div>
    )
  }

  const currentGoal = objectives.find((o) => (o.progress || 0) < 100)

  return (
    <div className="mb-8 grid gap-6 overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
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

          {currentGoal && (
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

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-black text-slate-800">
            <Target size={15} className="text-brand-blue" /> Tes objectifs
          </h3>
          <span className="text-[11px] font-bold text-slate-400">
            {objectives.length} total
          </span>
        </div>
        {recent.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500">
            <Target size={24} className="text-slate-300" />
            <p>
              ما عندكش objectifs pour l'instant — يمكنك إضافة هدفك من قسم "Tous tes objectifs" en bas.
            </p>
          </div>
        ) : (
          <ul className="space-y-3 max-h-[420px] overflow-auto pr-1">
            {recent.map((obj) => {
              const p = obj.progress ?? 0
              return (
                <li
                  key={obj.id}
                  className="rounded-xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="line-clamp-2 font-bold text-slate-800 text-sm">
                      {obj.title}
                    </span>
                    {obj.targetDate && (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-slate-900/5 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                        <CalendarDays size={10} />{' '}
                        {new Date(obj.targetDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {obj.description && (
                    <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                      {obj.description}
                    </p>
                  )}
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
    </div>
  )
}

const ProgressPage: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [aggregate, setAggregate] = useState<AggregateProgress | null>(null)
  const [objectives, setObjectives] = useState<ObjectiveItem[]>([])
  const [tips, setTips] = useState<TipItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.allSettled([
      progressAPI.getAggregate?.().catch(() => null) as any,
      objectivesAPI.listMy().catch(() => []),
      tipsAPI.listPublic({ bacSection: user?.bacSection as any }).catch(() => []),
    ]).then(([aggRes, objRes, tipsRes]) => {
      if (!active) return
      const aggData = aggRes.status === 'fulfilled' ? (aggRes.value ?? null) : null
      setAggregate(aggData as any)
      const objData = objRes.status === 'fulfilled' ? (Array.isArray(objRes.value) ? objRes.value : []) : []
      setObjectives(objData as any)
      const tipsData = tipsRes.status === 'fulfilled' ? (Array.isArray(tipsRes.value) ? tipsRes.value : []) : []
      setTips((tipsData as any).slice(0, 6))
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [user?.bacSection])

  const markComplete = async (id: string) => {
    try {
      await objectivesAPI.complete(id)
      const refreshed = (await objectivesAPI.listMy()) as ObjectiveItem[]
      setObjectives(Array.isArray(refreshed) ? refreshed : [])
    } catch {}
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-text-light dark:text-text sm:text-3xl">
            <BarChart3 size={26} className="text-sky-600" />
            Profile & Progression
          </h1>
          <p className="mt-1 text-sm text-text-muted-light dark:text-text-muted">
            شوف تقدمك كامل، objectifs و نصائح.
          </p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 rounded-full border border-gray-200 dark:border-white/10 px-4 py-2 text-sm font-medium text-text-light dark:text-text hover:border-accent/50 hover:text-accent transition-colors"
        >
          <ArrowLeft size={15} /> Retour
        </button>
      </div>

      <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#071840] to-brand-blue text-white text-2xl font-black shadow-md">
            {(user?.firstName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-black text-[#071840] dark:text-white truncate">
              {user?.firstName} {user?.lastName}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {user?.email}
            </p>
          </div>
          <div className="flex-1 flex flex-wrap gap-2 justify-end">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 border border-sky-100">
              <CalendarDays size={13} /> Bac {user?.bacSection?.replace(/_/g, ' ')}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 border border-emerald-100">
              <Check size={13} /> {user?.status || 'ACTIVE'}
            </span>
          </div>
        </div>
      </div>

      <ProgressDashboard loading={loading} aggregate={aggregate} objectives={objectives} />

      {tips.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/50 to-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-blue-900">
            <Lightbulb size={20} className="text-blue-700" /> نصائح للنجاح
          </h3>
          <ul className="grid gap-3 md:grid-cols-2">
            {tips.map((tip) => (
              <li
                key={tip.id}
                className="rounded-xl border border-blue-100 bg-white p-4 text-blue-900"
              >
                {tip.title && (
                  <div className="mb-1.5 font-bold text-sm">{tip.title}</div>
                )}
                <p className="text-sm leading-relaxed" dir="auto">
                  {tip.content}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {objectives.length > 0 && (
        <div className="mt-8 overflow-hidden rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-amber-900">
            <Target size={20} className="text-amber-700" /> Tous tes objectifs
          </h3>
          <ul className="space-y-3">
            {objectives.map((obj) => {
              const p = obj.progress ?? 0
              const done = p >= 100
              return (
                <li
                  key={obj.id}
                  className={`rounded-xl border p-4 ${done ? 'border-emerald-200 bg-emerald-50/40' : 'border-amber-100 bg-amber-50/20'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h4 className={`font-bold ${done ? 'text-emerald-800 line-through' : 'text-slate-800'}`}>
                        {obj.title}
                      </h4>
                      {obj.description && (
                        <p className="mt-1 text-sm text-slate-500 line-clamp-2">
                          {obj.description}
                        </p>
                      )}
                      {obj.targetDate && (
                        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-slate-600 border border-slate-200">
                          <CalendarDays size={11} />{' '}
                          {new Date(obj.targetDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {!done && (
                      <button
                        type="button"
                        onClick={() => markComplete(obj.id)}
                        className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                      >
                        <Check size={12} /> Terminer
                      </button>
                    )}
                  </div>
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-slate-500">
                      <span>Progression</span>
                      <span>{Math.round(p)}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white border border-slate-200">
                      <div
                        className={`h-full rounded-full ${done ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-500 to-amber-400'}`}
                        style={{ width: `${p}%` }}
                      />
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {loading && (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 size={30} className="animate-spin text-accent" />
        </div>
      )}
    </div>
  )
}

export default ProgressPage
