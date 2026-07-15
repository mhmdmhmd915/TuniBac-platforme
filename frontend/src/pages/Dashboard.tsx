import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  BellRing,
  BookOpen,
  CalendarClock,
  CheckCircle,
  Clock,
  ExternalLink,
  FileText,
  ImageIcon,
  Megaphone,
  PlayCircle,
  Sparkles,
  TrendingUp,
  Video,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { toAssetUrl } from '../lib/assets'
import { logger } from '../lib/logger'
import { sanitizeRichHtml } from '../lib/sanitizeHtml'
import { communicationsAPI, usersAPI } from '../services/api'
import BrandLogo from '../components/BrandLogo'

type CommunicationType =
  | 'GENERAL_INFORMATION'
  | 'EXAM_ANNOUNCEMENT'
  | 'HOMEWORK'
  | 'COURSE_REMINDER'
  | 'ONLINE_COURSE'
  | 'MEETING'
  | 'COMPETITION'
  | 'NEW_COURSE'
  | 'PLATFORM_UPDATE'
  | 'URGENT'
  | 'HOLIDAY'
  | 'MAINTENANCE'
  | 'OTHER'

interface Attachment {
  id?: string
  kind: string
  label?: string | null
  filePath?: string | null
  url?: string | null
  mimeType?: string | null
  sizeBytes?: number | null
}

interface CommunicationItem {
  id: string
  type: CommunicationType
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  lifecycleStatus: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'SCHEDULED' | 'EXPIRED'
  title: string
  description?: string | null
  contentHtml: string
  buttonText?: string | null
  buttonUrl?: string | null
  externalLink?: string | null
  meetingLink?: string | null
  publishAt?: string | null
  attachments: Attachment[]
  excerpt: string
  isNew?: boolean
}

const TYPE_META: Record<
  CommunicationType,
  { label: string; color: string; bg: string; icon: typeof Megaphone }
> = {
  GENERAL_INFORMATION: { label: 'General Information', color: 'text-sky-300', bg: 'bg-sky-500/15', icon: Megaphone },
  EXAM_ANNOUNCEMENT: { label: 'Exam Announcement', color: 'text-rose-300', bg: 'bg-rose-500/15', icon: BellRing },
  HOMEWORK: { label: 'Homework', color: 'text-amber-300', bg: 'bg-amber-500/15', icon: FileText },
  COURSE_REMINDER: { label: 'Course Reminder', color: 'text-cyan-300', bg: 'bg-cyan-500/15', icon: CalendarClock },
  ONLINE_COURSE: { label: 'Online Course', color: 'text-indigo-300', bg: 'bg-indigo-500/15', icon: Video },
  MEETING: { label: 'Meeting', color: 'text-emerald-300', bg: 'bg-emerald-500/15', icon: CalendarClock },
  COMPETITION: { label: 'Competition', color: 'text-fuchsia-300', bg: 'bg-fuchsia-500/15', icon: Sparkles },
  NEW_COURSE: { label: 'New Course', color: 'text-violet-300', bg: 'bg-violet-500/15', icon: PlayCircle },
  PLATFORM_UPDATE: { label: 'Platform Update', color: 'text-blue-300', bg: 'bg-blue-500/15', icon: TrendingUp },
  URGENT: { label: 'Urgent', color: 'text-red-300', bg: 'bg-red-500/15', icon: BellRing },
  HOLIDAY: { label: 'Holiday', color: 'text-pink-300', bg: 'bg-pink-500/15', icon: Sparkles },
  MAINTENANCE: { label: 'Maintenance', color: 'text-orange-300', bg: 'bg-orange-500/15', icon: Clock },
  OTHER: { label: 'Other', color: 'text-slate-300', bg: 'bg-slate-500/15', icon: Megaphone },
}

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return 'Available now'
  }

  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatSize = (size?: number | null) => {
  if (!size) {
    return ''
  }

  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }

  if (size >= 1024) {
    return `${Math.round(size / 1024)} KB`
  }

  return `${size} B`
}

const Dashboard = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState({ coursesCompleted: 0, exercisesCompleted: 0 })
  const [communications, setCommunications] = useState<CommunicationItem[]>([])
  const [loadingCommunications, setLoadingCommunications] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)
  const [selectedCommunication, setSelectedCommunication] = useState<CommunicationItem | null>(null)

  useEffect(() => {
    let isCurrent = true

    const fetchDashboardData = async () => {
      setLoadingCommunications(true)
      let shouldUpdateLoading = true

      try {
        const [statsResponse, communicationsResponse] = await Promise.all([
          usersAPI.getStats(),
          communicationsAPI.getStudentFeed({ limit: 8 }),
        ])

        if (!isCurrent) {
          shouldUpdateLoading = false
          return
        }

        setStats(statsResponse.data)
        setCommunications(communicationsResponse.data.items || [])
      } catch (error) {
        if (!isCurrent) {
          shouldUpdateLoading = false
          return
        }

        logger.error('Error loading dashboard', error)
      } finally {
        if (shouldUpdateLoading) {
          setLoadingCommunications(false)
        }
      }
    }

    void fetchDashboardData()

    return () => {
      isCurrent = false
    }
  }, [])

  useEffect(() => {
    if (communications.length <= 1) {
      return undefined
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % communications.length)
    }, 6000)

    return () => window.clearInterval(timer)
  }, [communications.length])

  useEffect(() => {
    if (activeIndex > communications.length - 1) {
      setActiveIndex(0)
    }
  }, [communications.length, activeIndex])

  const activeCommunication = communications[activeIndex] || null
  const newCount = communications.filter((item) => item.isNew).length

  const heroMedia = useMemo(() => {
    if (!activeCommunication) {
      return null
    }

    return (
      activeCommunication.attachments.find((attachment) => attachment.kind === 'IMAGE') ||
      activeCommunication.attachments.find((attachment) => attachment.kind === 'VIDEO') ||
      activeCommunication.attachments.find((attachment) => attachment.kind === 'PDF') ||
      null
    )
  }, [activeCommunication])

  const openableActions = useMemo(() => {
    if (!activeCommunication) {
      return []
    }

    const actions = []

    if (activeCommunication.meetingLink) {
      actions.push({
        label: activeCommunication.buttonText || 'Join Meeting',
        href: activeCommunication.meetingLink,
        tone: 'bg-emerald-400 text-slate-950',
      })
    } else if (activeCommunication.buttonUrl) {
      actions.push({
        label: activeCommunication.buttonText || 'Open',
        href: activeCommunication.buttonUrl,
        tone: 'bg-sky-400 text-slate-950',
      })
    } else if (activeCommunication.externalLink) {
      actions.push({
        label: activeCommunication.buttonText || 'Open Link',
        href: activeCommunication.externalLink,
        tone: 'bg-sky-400 text-slate-950',
      })
    }

    activeCommunication.attachments.forEach((attachment) => {
      const href = attachment.url || toAssetUrl(attachment.filePath)
      if (!href) {
        return
      }

      actions.push({
        label: attachment.label || attachment.kind,
        href,
        tone: 'border border-white/15 bg-white/5 text-slate-100',
      })
    })

    return actions.slice(0, 4)
  }, [activeCommunication])

  const nextSlide = () => {
    setActiveIndex((current) => (current + 1) % Math.max(communications.length, 1))
  }

  const prevSlide = () => {
    setActiveIndex((current) => {
      if (current === 0) {
        return Math.max(communications.length - 1, 0)
      }

      return current - 1
    })
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="mb-4 inline-flex items-center gap-3 rounded-full border border-brand-blue/15 bg-brand-blue/10 px-4 py-2">
            <BrandLogo variant="icon" className="h-9 w-9" alt="TuniBac student mark" />
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">Student Interface</span>
          </div>
          <h1 className="text-4xl font-bold mb-2 text-text-light dark:text-text">Welcome back, {user?.firstName}!</h1>
          <p className="text-text-muted-light dark:text-text-muted text-lg">
            Your communication center keeps you updated with the latest classes, meetings, files, and platform announcements.
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="glass-morphism px-6 py-3 rounded-2xl flex items-center space-x-3">
            <div className="p-2 bg-success/20 text-success rounded-lg">
              <TrendingUp size={20} />
            </div>
            <div>
              <div className="text-sm text-text-muted-light dark:text-text-muted">Current Rank</div>
              <div className="font-bold text-text-light dark:text-text">Pro Learner</div>
            </div>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden rounded-[36px] border border-black/10 bg-gradient-to-br from-slate-950 via-[#0f172f] to-[#111b35] px-6 py-6 text-white shadow-[0_30px_80px_rgba(15,23,42,0.32)] dark:border-white/10 md:px-8 md:py-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.16),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.14),transparent_38%)]" />
        <div className="relative space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-200">
                <Megaphone size={14} />
                Communication Center
              </div>
              <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">The main hub for every important student update</h2>
              <p className="mt-3 max-w-3xl text-sm text-slate-300 md:text-base">
                Meetings, urgent notices, homework, new courses, PDFs, and videos appear here the moment they are published from the admin panel.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Live updates</div>
                <div className="mt-1 text-2xl font-bold">{communications.length}</div>
              </div>
              <div className="rounded-2xl border border-sky-400/20 bg-sky-400/10 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.2em] text-sky-100">New Announcement</div>
                <div className="mt-1 text-2xl font-bold text-sky-50">{newCount}</div>
              </div>
            </div>
          </div>

          {loadingCommunications ? (
            <div className="rounded-[30px] border border-white/10 bg-white/5 p-12 text-center text-slate-300">
              Loading the latest announcements...
            </div>
          ) : communications.length === 0 || !activeCommunication ? (
            <div className="rounded-[30px] border border-dashed border-white/15 bg-white/5 p-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white/10 text-sky-200">
                <Megaphone size={28} />
              </div>
              <h3 className="mt-5 text-2xl font-bold">No announcements yet</h3>
              <p className="mt-2 text-sm text-slate-300">
                Your dashboard will show every new communication here as soon as it is published.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="overflow-hidden rounded-[32px] border border-white/10 bg-white/5">
                  <motion.div
                    key={activeCommunication.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="grid min-h-[420px] gap-0 lg:grid-cols-[1.15fr_0.85fr]"
                  >
                    <div className="relative flex flex-col justify-between p-6 md:p-8">
                      <div className="space-y-5">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${TYPE_META[activeCommunication.type].bg} ${TYPE_META[activeCommunication.type].color}`}>
                            {(() => {
                              const TypeIcon = TYPE_META[activeCommunication.type].icon
                              return <TypeIcon size={14} />
                            })()}
                            {TYPE_META[activeCommunication.type].label}
                          </span>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            activeCommunication.priority === 'URGENT'
                              ? 'bg-red-500/15 text-red-200'
                              : activeCommunication.priority === 'HIGH'
                              ? 'bg-orange-500/15 text-orange-200'
                              : activeCommunication.priority === 'MEDIUM'
                              ? 'bg-sky-500/15 text-sky-200'
                              : 'bg-slate-500/15 text-slate-200'
                          }`}>
                            {activeCommunication.priority}
                          </span>
                          {activeCommunication.isNew && (
                            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200">
                              New Announcement
                            </span>
                          )}
                        </div>

                        <div>
                          <div className="text-sm text-slate-300">{formatDateTime(activeCommunication.publishAt)}</div>
                          <h3 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">
                            {activeCommunication.title}
                          </h3>
                          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200">
                            {activeCommunication.description || activeCommunication.excerpt}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-5">
                        <div className="flex flex-wrap gap-3">
                          {openableActions.map((action, index) => (
                            <a
                              key={`${action.href}-${index}`}
                              href={action.href}
                              target="_blank"
                              rel="noreferrer"
                              className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition hover:scale-[1.02] ${action.tone}`}
                            >
                              <ExternalLink size={16} />
                              {action.label}
                            </a>
                          ))}
                          <button
                            type="button"
                            onClick={() => setSelectedCommunication(activeCommunication)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                          >
                            <BookOpen size={16} />
                            Read More
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={prevSlide}
                            className="rounded-2xl border border-white/15 bg-white/5 p-3 transition hover:bg-white/10"
                            aria-label="Previous announcement"
                          >
                            <ArrowLeft size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={nextSlide}
                            className="rounded-2xl border border-white/15 bg-white/5 p-3 transition hover:bg-white/10"
                            aria-label="Next announcement"
                          >
                            <ArrowRight size={18} />
                          </button>
                          <div className="flex items-center gap-2">
                            {communications.map((item, index) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => setActiveIndex(index)}
                                className={`h-2.5 rounded-full transition ${
                                  index === activeIndex ? 'w-10 bg-sky-300' : 'w-2.5 bg-white/30'
                                }`}
                                aria-label={`Go to announcement ${index + 1}`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-white/10 bg-white/[0.04] p-6 lg:border-l lg:border-t-0">
                      {heroMedia?.kind === 'IMAGE' && heroMedia.filePath ? (
                        <img
                          src={toAssetUrl(heroMedia.filePath)}
                          alt={heroMedia.label || activeCommunication.title}
                          className="h-[220px] w-full rounded-[28px] object-cover"
                        />
                      ) : (
                        <div className="flex h-[220px] w-full items-center justify-center rounded-[28px] border border-white/10 bg-gradient-to-br from-sky-500/20 via-violet-500/15 to-transparent">
                          <div className="text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/10">
                              {heroMedia?.kind === 'VIDEO' ? <Video size={28} /> : heroMedia?.kind === 'PDF' ? <FileText size={28} /> : <ImageIcon size={28} />}
                            </div>
                            <div className="text-sm font-semibold text-slate-100">
                              {heroMedia?.label || 'Interactive attachment available'}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="mt-5 space-y-3">
                        <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Attachments & quick access</div>
                        {(activeCommunication.attachments.length ? activeCommunication.attachments : []).slice(0, 4).map((attachment, index) => (
                          <a
                            key={`${attachment.kind}-${index}`}
                            href={attachment.url || toAssetUrl(attachment.filePath)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm transition hover:bg-white/10"
                          >
                            <div className="min-w-0">
                              <div className="font-semibold text-white">{attachment.label || attachment.kind}</div>
                              <div className="truncate text-xs text-slate-400">{attachment.kind}</div>
                            </div>
                            <div className="text-xs text-slate-400">{formatSize(attachment.sizeBytes)}</div>
                          </a>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </div>

                <div className="space-y-4">
                  {communications.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveIndex(index)}
                      className={`w-full rounded-[28px] border p-5 text-left transition ${
                        index === activeIndex
                          ? 'border-sky-400/40 bg-sky-400/10'
                          : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className={`rounded-2xl p-3 ${TYPE_META[item.type].bg} ${TYPE_META[item.type].color}`}>
                          {(() => {
                            const ItemIcon = TYPE_META[item.type].icon
                            return <ItemIcon size={18} />
                          })()}
                        </div>
                        {item.isNew && (
                          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
                            New
                          </span>
                        )}
                      </div>
                      <div className="mt-4 text-xs uppercase tracking-[0.2em] text-slate-400">
                        {formatDateTime(item.publishAt)}
                      </div>
                      <h4 className="mt-2 text-lg font-bold text-white">{item.title}</h4>
                      <p className="mt-2 text-sm text-slate-300">
                        {(item.description || item.excerpt).slice(0, 120)}
                        {(item.description || item.excerpt).length > 120 ? '...' : ''}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Courses Completed', value: stats.coursesCompleted, icon: <BookOpen />, color: 'text-blue-400', bg: 'bg-blue-400/10' },
          { label: 'Exercises Solved', value: stats.exercisesCompleted, icon: <CheckCircle />, color: 'text-green-400', bg: 'bg-green-400/10' },
          { label: 'Study Hours', value: '24h', icon: <Clock />, color: 'text-orange-400', bg: 'bg-orange-400/10' },
          { label: 'Platform Points', value: '1,250', icon: <TrendingUp />, color: 'text-purple-400', bg: 'bg-purple-400/10' },
        ].map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
            className="glass-morphism p-6 rounded-3xl flex items-center space-x-4"
          >
            <div className={`p-4 ${stat.bg} ${stat.color} rounded-2xl`}>
              {stat.icon}
            </div>
            <div>
              <div className="text-text-muted-light dark:text-text-muted text-sm">{stat.label}</div>
              <div className="text-2xl font-bold text-text-light dark:text-text">{stat.value}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selectedCommunication && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[32px] border border-white/10 bg-[#0b1326] p-6 text-white shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.24em] text-sky-200">
                    {TYPE_META[selectedCommunication.type].label}
                  </div>
                  <h3 className="mt-2 text-3xl font-bold">{selectedCommunication.title}</h3>
                  <div className="mt-3 text-sm text-slate-300">{formatDateTime(selectedCommunication.publishAt)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCommunication(null)}
                  className="rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/10"
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>

              {selectedCommunication.attachments.find((attachment) => attachment.kind === 'IMAGE')?.filePath && (
                <img
                  src={toAssetUrl(selectedCommunication.attachments.find((attachment) => attachment.kind === 'IMAGE')?.filePath)}
                  alt={selectedCommunication.title}
                  className="mt-6 h-64 w-full rounded-[28px] object-cover"
                />
              )}

              <div className="mt-6 space-y-4">
                <div className="text-base text-slate-200">{selectedCommunication.description}</div>
                <div
                  className="prose prose-invert max-w-none text-sm"
                  dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(selectedCommunication.contentHtml) }}
                />
              </div>

              <div className="mt-8 space-y-4">
                <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Attachments</div>
                {selectedCommunication.attachments.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-slate-400">
                    No attachments for this announcement.
                  </div>
                ) : (
                  selectedCommunication.attachments.map((attachment, index) => (
                    <a
                      key={`${attachment.kind}-${index}`}
                      href={attachment.url || toAssetUrl(attachment.filePath)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm transition hover:bg-white/10"
                    >
                      <div>
                        <div className="font-semibold text-white">{attachment.label || attachment.kind}</div>
                        <div className="text-xs text-slate-400">{attachment.kind}</div>
                      </div>
                      <div className="text-xs text-slate-400">{formatSize(attachment.sizeBytes)}</div>
                    </a>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Dashboard
