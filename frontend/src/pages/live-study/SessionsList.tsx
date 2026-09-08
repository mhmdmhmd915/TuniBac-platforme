import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  Loader2,
  MessageCircle,
  PlayCircle,
  Trophy,
  Users,
  X,
  Medal,
  Plus,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  Ticket,
  Crown,
  ArrowRight,
  Trash2,
  Settings,
  LogOut,
  Pencil,
  Send,
  Target,
  CalendarDays,
  ClipboardList,
  UserX,
  RefreshCw,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { liveStudyAPI, studySquadAPI } from '../../services/api'
import { attachListUpdateListeners, getSocket } from '../../lib/socketClient';

type SessionStatus = 'ACTIVE' | 'CLOSED' | string

interface LiveStudySession {
  id: string
  subject: string
  topic?: string | null
  creatorName: string
  startedAt: string
  participantCount: number
  isActive?: boolean
  status?: SessionStatus
}

interface RankingEntry {
  rank: number
  name: string
  minutes: number
  userId?: string
}

interface BadgeItem {
  id: string
  slug: string
  name: string
  description?: string | null
  icon?: string | null
  awarded: boolean
  awardedAt?: string | null
}

type Squad = {
  id: string;
  name: string;
  invitationCode: string;
  ownerId: string;
  status: string;
  bacSection: string;
  createdAt: string;
  memberCount?: number;
  activeSessionCount?: number;
  myRole?: 'OWNER' | 'MEMBER';
};
type Invitation = {
  id: string;
  squadId: string;
  inviterId: string;
  inviteeId?: string;
  squad?: { id: string; name: string; invitationCode: string };
  inviter?: { id: string; firstName: string; lastName: string };
  invitee?: { id: string; firstName: string; lastName: string };
  status: string;
  createdAt: string;
  expiresAt: string;
};
type Member = { id: string; userId: string; role: 'OWNER' | 'MEMBER'; joinedAt: string; user?: { id: string; firstName: string; lastName: string; bacSection?: string } };
type SquadGoal = { id: string; title: string; description?: string; targetDate?: string; progress: number; completed: boolean; createdAt: string; updatedAt: string };
type ChatMsg = { id: string; squadId: string; userId: string; content: string; createdAt: string; user?: { id: string; firstName: string; lastName: string } };
type SquadSession = { id: string; title: string; status: string; startedAt: string; endedAt?: string; participantCount?: number };
type Stats = { totalMinutes: number; completedSessions: number; activeSessions: number; activeMembers: number; perMemberMinutes?: Record<string, number> };
type SquadDetail = {
  id: string; name: string; invitationCode: string; ownerId: string; bacSection: string; status: string;
  createdAt: string; updatedAt: string;
  owner?: { id: string; firstName: string; lastName: string };
  members: Member[]; invitations: Invitation[]; goal?: SquadGoal | null;
  chatMessages?: ChatMsg[]; studySessions?: SquadSession[]; stats?: Stats;
  myRole?: 'OWNER' | 'MEMBER';
};

const SUBJECTS = [
  'Math',
  'Physique',
  'Chimie',
  'Science',
  'Français',
  'Arabe',
  'English',
  'General Study',
]

const BADGE_ICON_MAP: Record<string, string> = {
  'focus-1-hour': '🎯',
  'focus-2-hours': '⚡',
  'weekly-5-hours': '📅',
  'weekly-10-hours': '⚔️',
  'total-20-hours': '🎓',
  'total-50-hours': '🏆',
}

const getBadgeEmoji = (slug?: string | null) =>
  (slug && BADGE_ICON_MAP[slug]) || '🏅'

const formatDuration = (startedAt: string) => {
  const diff = Math.max(0, Date.now() - new Date(startedAt).getTime())
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(mins / 60)
  const mm = mins % 60
  if (hrs > 0) return `${hrs}h ${mm.toString().padStart(2, '0')}m`
  return `${mm}m`
}

const formatMinutes = (total: number) => {
  const hrs = Math.floor(total / 60)
  const mm = total % 60
  if (hrs > 0) return `${hrs}h ${mm.toString().padStart(2, '0')}`
  return `${mm}m`
}

const fmtMin = (m?: number) => {
  const n = Number(m || 0);
  if (n < 60) return `${n}m`;
  const h = Math.floor(n / 60);
  const mm = n % 60;
  return mm ? `${h}h ${mm}m` : `${h}h`;
};
const fmtDate = (d?: string) => {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString(); } catch { return d; }
};
const fmtTime = (d?: string) => {
  if (!d) return '';
  try {
    const dt = new Date(d);
    const now = new Date();
    const diff = now.getTime() - dt.getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return dt.toLocaleDateString();
  } catch { return d; }
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
}

const SessionsList: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'public' | 'squad'>('public')

  // --- public Live Study state (original) ---
  const [sessions, setSessions] = useState<LiveStudySession[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [sessionsError, setSessionsError] = useState<string | null>(null)
  const [isDisabled, setIsDisabled] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [formSubject, setFormSubject] = useState('General Study')
  const [formTopic, setFormTopic] = useState('')
  const [creating, setCreating] = useState(false)
  const [rankPeriod, setRankPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [rankingLoading, setRankingLoading] = useState(true)
  const [badges, setBadges] = useState<BadgeItem[]>([])
  const [badgesLoading, setBadgesLoading] = useState(true)
  const [tick, setTick] = useState(0)

  // --- Study Squad embedded state (was in standalone page) ---
  // list tab state
  const [squads, setSquads] = useState<Squad[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [squadListLoading, setSquadListLoading] = useState(true)
  const [newSquadName, setNewSquadName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [creatingSquad, setCreatingSquad] = useState(false)
  const [joiningSquad, setJoiningSquad] = useState(false)
  const [acceptIds, setAcceptIds] = useState<Record<string, boolean>>({})
  const [declineIds, setDeclineIds] = useState<Record<string, boolean>>({})
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [squadCreateError, setSquadCreateError] = useState<string | null>(null)
  const [joinError, setJoinError] = useState<string | null>(null)

  // detail view state (no route, just selected squad id)
  const [selectedSquadId, setSelectedSquadId] = useState<string | null>(null)
  const [squadDetail, setSquadDetail] = useState<SquadDetail | null>(null)
  const [squadDetailLoading, setSquadDetailLoading] = useState(false)
  const [squadDetailError, setSquadDetailError] = useState<string | null>(null)
  const [copiedDetailCode, setCopiedDetailCode] = useState(false)
  const [startStudyLoading, setStartStudyLoading] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [renameLoading, setRenameLoading] = useState(false)
  const [invitePhone, setInvitePhone] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)
  const [removeLoading, setRemoveLoading] = useState<Record<string, boolean>>({})
  const [cancelInvLoading, setCancelInvLoading] = useState<Record<string, boolean>>({})
  const [leaveLoading, setLeaveLoading] = useState(false)
  const [disbandLoading, setDisbandLoading] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatBottomRef = useRef<HTMLDivElement>(null)
  const [goalForm, setGoalForm] = useState<{ title: string; description: string; targetDate: string; progress: number; completed: boolean }>({ title: '', description: '', targetDate: '', progress: 0, completed: false })
  const [goalEditOpen, setGoalEditOpen] = useState(false)
  const [goalLoading, setGoalLoading] = useState(false)
  const chatListenerBoundRef = useRef(false)
  const updateListenerBoundRef = useRef(false)

  // ============= PUBLIC LIVE STUDY =============
  const loadSessions = async () => {
    setSessionsLoading(true)
    setSessionsError(null)
    setIsDisabled(false)
    try {
      const data = await liveStudyAPI.listSessions()
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const anyData = data as any
        if (anyData.disabled === true || anyData.isDisabled === true) {
          setIsDisabled(true)
          setSessions([])
          return
        }
        if (anyData.message && typeof anyData.message === 'string' && anyData.message.toLowerCase().includes('temporarily disabled')) {
          setIsDisabled(true)
          setSessions([])
          return
        }
        if (anyData.sessions && Array.isArray(anyData.sessions)) {
          setSessions(anyData.sessions)
          return
        }
      }
      setSessions(Array.isArray(data) ? data : [])
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || ''
      if (errMsg.toLowerCase().includes('temporarily disabled') || errMsg.toLowerCase().includes('live study is temporarily disabled')) {
        setIsDisabled(true)
      } else {
        setSessionsError(errMsg || 'Failed to load sessions')
      }
      setSessions([])
    } finally {
      setSessionsLoading(false)
    }
  }

  const loadRanking = async (period: 'daily' | 'weekly' | 'monthly') => {
    setRankingLoading(true)
    try {
      const data = await liveStudyAPI.getRanking(period)
      setRanking(Array.isArray(data) ? data : [])
    } catch {
      setRanking([])
    } finally {
      setRankingLoading(false)
    }
  }

  const loadBadges = async () => {
    setBadgesLoading(true)
    try {
      const data = await liveStudyAPI.getBadges()
      setBadges(Array.isArray(data) ? data : [])
    } catch {
      setBadges([])
    } finally {
      setBadgesLoading(false)
    }
  }

  useEffect(() => {
    void loadSessions()
    void loadRanking(rankPeriod)
    void loadBadges()
    let unsubList: (() => void) | undefined
    try {
      unsubList = attachListUpdateListeners((ev) => {
        if (ev?.type === 'removed') {
          setSessions((prev) => prev.filter((s) => s.id !== ev.sessionId))
          return
        }
        if (ev?.type === 'added' || ev?.type === 'participant:changed') {
          void loadSessions()
          return
        }
      })
    } catch {}
    return () => {
      if (unsubList) try { unsubList() } catch {}
    }
  }, [])

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    void loadRanking(rankPeriod)
  }, [rankPeriod])

  const handleCreatePublicSession = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      const payload: { subject: string; topic?: string } = { subject: formSubject }
      if (formTopic.trim()) payload.topic = formTopic.trim()
      const created = await liveStudyAPI.createSession(payload)
      const id = (created && (created.id || created._id)) as string | undefined
      setModalOpen(false)
      setFormSubject('General Study')
      setFormTopic('')
      if (id) navigate(`/live-study/${id}`)
      else void loadSessions()
    } finally {
      setCreating(false)
    }
  }

  // ============= STUDY SQUAD (embedded, no routes) =============
  const refreshSquadList = useCallback(async () => {
    try {
      setSquadListLoading(true)
      const [sq, inv] = await Promise.all([studySquadAPI.listMySquads(), studySquadAPI.listMyInvitations()])
      setSquads(Array.isArray(sq) ? sq : sq?.squads || [])
      setInvitations(Array.isArray(inv) ? inv : inv?.invitations || [])
    } finally {
      setSquadListLoading(false)
    }
  }, [])

  const loadSquadDetail = useCallback(async (id: string) => {
    try {
      setSquadDetailLoading(true)
      setSquadDetailError(null)
      const data = await studySquadAPI.getSquad(id)
      const sq = data?.id ? data : (data as any)?.squad || null
      setSquadDetail(sq)
      if (sq?.goal) {
        setGoalForm({
          title: sq.goal.title || '',
          description: sq.goal.description || '',
          targetDate: sq.goal.targetDate ? new Date(sq.goal.targetDate).toISOString().slice(0, 10) : '',
          progress: Number(sq.goal.progress || 0),
          completed: !!sq.goal.completed,
        })
      } else {
        setGoalForm({ title: '', description: '', targetDate: '', progress: 0, completed: false })
      }
    } catch (err: any) {
      setSquadDetailError(err?.response?.data?.message || 'Not authorized')
      setSquadDetail(null)
    } finally {
      setSquadDetailLoading(false)
    }
  }, [])

  // Initial load + tab listener + socket global squad update listener
  useEffect(() => {
    if (activeTab === 'squad') {
      void refreshSquadList()
      if (selectedSquadId) void loadSquadDetail(selectedSquadId)
    }
    try {
      const s = getSocket()
      if (!updateListenerBoundRef.current) {
        const onUpdate = () => {
          if (activeTab !== 'squad') return
          void refreshSquadList()
          if (selectedSquadId) void loadSquadDetail(selectedSquadId)
        }
        s.on('study-squad:update', onUpdate)
        s.on('study-squad:invitations:new', onUpdate)
        updateListenerBoundRef.current = true
      }
    } catch {}
  }, [activeTab, selectedSquadId, refreshSquadList, loadSquadDetail])

  // squad chat listener per selected squad
  useEffect(() => {
    try {
      const s = getSocket()
      if (selectedSquadId && !chatListenerBoundRef.current) {
        s.on(`study-squad:chat:${selectedSquadId}`, (msg: ChatMsg) => {
          setSquadDetail((prev) => {
            if (!prev) return prev
            const existing = prev.chatMessages || []
            if (existing.some((m) => m.id === msg.id)) return prev
            return { ...prev, chatMessages: [...existing, msg] }
          })
          setTimeout(() => {
            try { chatBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) } catch {}
          }, 50)
        })
        chatListenerBoundRef.current = true
      }
    } catch {}
    return () => {
      if (selectedSquadId && chatListenerBoundRef.current) {
        try {
          const s = getSocket()
          s.off(`study-squad:chat:${selectedSquadId}`)
        } catch {}
        chatListenerBoundRef.current = false
      }
    }
  }, [selectedSquadId])

  const isOwner = (s: Squad | SquadDetail | null | undefined) =>
    !!s && (s.ownerId === user?.id || s.myRole === 'OWNER')

  // --- squad list actions ---
  const copySquadCode = (code: string) => {
    try { navigator.clipboard.writeText(code) } catch {}
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 1500)
  }

  const createSquad = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newSquadName.trim()
    if (!name) return
    try {
      setSquadCreateError(null)
      setCreatingSquad(true)
      const created = await studySquadAPI.createSquad({ name })
      const id = created?.id || (created as any)?.squad?.id
      if (id) {
        setSelectedSquadId(id)
        await loadSquadDetail(id)
      } else {
        await refreshSquadList()
      }
      setNewSquadName('')
    } catch (err: any) {
      setSquadCreateError(err?.response?.data?.message || 'Failed to create squad')
    } finally {
      setCreatingSquad(false)
    }
  }

  const joinByCode = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = joinCode.trim().toUpperCase()
    if (!code) return
    try {
      setJoinError(null)
      setJoiningSquad(true)
      const joined = await studySquadAPI.joinByCode({ code })
      const id = joined?.id || (joined as any)?.squad?.id
      if (id) {
        setSelectedSquadId(id)
        await loadSquadDetail(id)
      } else {
        await refreshSquadList()
      }
      setJoinCode('')
    } catch (err: any) {
      setJoinError(err?.response?.data?.message || 'Failed to join squad')
    } finally {
      setJoiningSquad(false)
    }
  }

  const acceptInvitation = async (invId: string) => {
    try {
      setAcceptIds((p) => ({ ...p, [invId]: true }))
      const joined = await studySquadAPI.acceptInvitation(invId)
      const id = joined?.id || (joined as any)?.squad?.id
      setInvitations((p) => p.filter((x) => x.id !== invId))
      if (id) {
        setSelectedSquadId(id)
        await loadSquadDetail(id)
      } else {
        await refreshSquadList()
      }
    } finally {
      setAcceptIds((p) => ({ ...p, [invId]: false }))
    }
  }

  const declineInvitation = async (invId: string) => {
    try {
      setDeclineIds((p) => ({ ...p, [invId]: true }))
      await studySquadAPI.declineInvitation(invId)
      setInvitations((p) => p.filter((x) => x.id !== invId))
    } finally {
      setDeclineIds((p) => ({ ...p, [invId]: false }))
    }
  }

  const openSquad = (id: string) => {
    setSelectedSquadId(id)
    void loadSquadDetail(id)
  }
  const backToSquadList = () => {
    setSelectedSquadId(null)
    setSquadDetail(null)
    setSquadDetailError(null)
    setSettingsOpen(false)
    setRenameOpen(false)
  }

  // --- squad detail actions ---
  const startPrivateStudy = async () => {
    if (!squadDetail) return
    try {
      setStartStudyLoading(true)
      const res = await liveStudyAPI.createSession({ title: `${squadDetail.name} Study Session`, studySquadId: squadDetail.id })
      const sid = (res && (res.id || (res as any).session?.id)) as string | undefined
      if (sid) navigate(`/live-study/${sid}`)
    } finally {
      setStartStudyLoading(false)
    }
  }

  const renameSquad = async () => {
    if (!squadDetail || !renameValue.trim()) return
    try {
      setRenameLoading(true)
      await studySquadAPI.renameSquad(squadDetail.id, { name: renameValue.trim() })
      await loadSquadDetail(squadDetail.id)
      await refreshSquadList()
      setRenameOpen(false)
      setRenameValue('')
    } finally {
      setRenameLoading(false)
    }
  }

  const inviteByPhone = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!squadDetail || !invitePhone.trim()) return
    try {
      setInviteError(null)
      setInviteSuccess(null)
      setInviteLoading(true)
      await studySquadAPI.inviteByPhone(squadDetail.id, { phone: invitePhone.trim() })
      setInviteSuccess('Invitation sent!')
      setInvitePhone('')
      await loadSquadDetail(squadDetail.id)
    } catch (err: any) {
      setInviteError(err?.response?.data?.message || 'Failed to invite')
    } finally {
      setInviteLoading(false)
    }
  }

  const removeMember = async (userId: string) => {
    if (!squadDetail) return
    try {
      setRemoveLoading((p) => ({ ...p, [userId]: true }))
      await studySquadAPI.removeMember(squadDetail.id, userId)
      await loadSquadDetail(squadDetail.id)
      await refreshSquadList()
    } finally {
      setRemoveLoading((p) => ({ ...p, [userId]: false }))
    }
  }

  const cancelInvitation = async (invId: string) => {
    if (!squadDetail) return
    try {
      setCancelInvLoading((p) => ({ ...p, [invId]: true }))
      await studySquadAPI.cancelInvitation(squadDetail.id, invId)
      await loadSquadDetail(squadDetail.id)
    } finally {
      setCancelInvLoading((p) => ({ ...p, [invId]: false }))
    }
  }

  const leaveSquad = async () => {
    if (!squadDetail) return
    if (!confirm('Leave this squad?')) return
    try {
      setLeaveLoading(true)
      await studySquadAPI.leaveSquad(squadDetail.id)
      setSelectedSquadId(null)
      setSquadDetail(null)
      await refreshSquadList()
    } finally {
      setLeaveLoading(false)
    }
  }

  const disbandSquad = async () => {
    if (!squadDetail) return
    if (!confirm('Disband this squad? This closes active private sessions and cancels pending invites.')) return
    try {
      setDisbandLoading(true)
      await studySquadAPI.disbandSquad(squadDetail.id)
      setSelectedSquadId(null)
      setSquadDetail(null)
      await refreshSquadList()
    } finally {
      setDisbandLoading(false)
    }
  }

  const sendSquadChat = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!squadDetail || !chatInput.trim()) return
    try {
      setChatLoading(true)
      await studySquadAPI.sendChatMessage(squadDetail.id, { content: chatInput.trim() })
      setChatInput('')
    } finally {
      setChatLoading(false)
    }
  }

  const upsertGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!squadDetail || !goalForm.title.trim()) return
    try {
      setGoalLoading(true)
      await studySquadAPI.upsertGoal(squadDetail.id, { ...goalForm })
      await loadSquadDetail(squadDetail.id)
      setGoalEditOpen(false)
    } finally {
      setGoalLoading(false)
    }
  }

  const studentBacSectionLabel = useMemo(
    () => (user?.bacSection ? String(user.bacSection).replace(/_/g, ' ') : ''),
    [user?.bacSection]
  )

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      {isDisabled && activeTab === 'public' && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-amber-100/50 px-5 py-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
              <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-black text-amber-800">Live Study is temporarily disabled</h3>
              <p className="mt-0.5 text-xs text-amber-700/80">Live study sessions are currently unavailable. Please check back later.</p>
            </div>
          </div>
        </div>
      )}

      {sessionsError && !isDisabled && activeTab === 'public' && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 to-rose-100/50 px-5 py-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/10">
              <svg className="h-5 w-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-black text-rose-800">Couldn&apos;t load sessions</h3>
              <p className="mt-0.5 text-xs text-rose-700/80">{sessionsError}</p>
              <button onClick={() => void loadSessions()} className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[11px] font-bold text-rose-700 border border-rose-200 hover:bg-rose-50 transition-colors">Retry</button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <button onClick={() => navigate('/learning-path')} className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#0B5ED7] transition-colors">
            <ArrowLeft size={14} /> Back to Learning Path
          </button>
          <h1 className="flex items-center gap-2 text-2xl font-black text-[#071840] sm:text-3xl">
            <Users size={26} className="text-[#0B5ED7]" />
            Study Together
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Séances Live — Study Room · الدراسة الجماعية مباشرة 🎓
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
            <button
              onClick={() => setActiveTab('public')}
              className={`rounded-xl px-4 py-2 text-xs font-black transition-all ${activeTab === 'public' ? 'bg-[#0B5ED7] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Public Live
            </button>
            <button
              onClick={() => setActiveTab('squad')}
              className={`rounded-xl px-4 py-2 text-xs font-black transition-all ${activeTab === 'squad' ? 'bg-[#0B5ED7] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Study Squad
            </button>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#0B5ED7] px-5 py-3 text-sm font-black text-white shadow-[0_12px_30px_-10px_rgba(11,94,215,0.65)] hover:bg-[#094fb8] transition-colors"
          >
            <PlayCircle size={18} /> Start Live Study
          </button>
        </div>
      </div>

      {/* ========= TAB: PUBLIC LIVE STUDY (original content, unchanged except wrapped) ========= */}
      {activeTab === 'public' && (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-6 md:flex-row">
          <div className="flex-1 space-y-8 min-w-0">
            <motion.section variants={itemVariants} className="overflow-hidden rounded-3xl border border-blue-100 bg-white p-6 shadow-sm md:p-8">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-xl font-black text-[#071840]">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10">
                      <span className="relative flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75"></span>
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-rose-500"></span>
                      </span>
                    </span>
                    Open Sessions
                  </h2>
                  <p className="mt-0.5 text-sm text-slate-500">انضم لشعبة وادرس مع باقي الطلبة</p>
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-[#0B5ED7]">{sessions.length} live</span>
              </div>
              {sessionsLoading ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {[1, 2].map((n) => (<div key={n} className="h-28 animate-pulse rounded-2xl bg-slate-100" />))}
                </div>
              ) : sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-blue-100 bg-blue-50/40 px-4 py-12 text-center">
                  <Users size={40} className="text-[#0B5ED7]/40" />
                  <h3 className="text-lg font-black text-[#071840]">No active sessions</h3>
                  <p className="max-w-sm text-sm text-slate-600">Be the first to start a live study room and invite classmates to join!</p>
                  <button onClick={() => setModalOpen(true)} className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#0B5ED7] px-4 py-2 text-xs font-bold text-white hover:bg-[#094fb8]">
                    <PlayCircle size={14} /> Create Session
                  </button>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {sessions.map((s) => {
                    const rawStatus = s.status || (s.isActive === false ? 'CLOSED' : 'ACTIVE')
                    const isClosed = rawStatus === 'CLOSED' || s.isActive === false
                    const displayStatus = isClosed ? 'CLOSED' : 'ACTIVE'
                    return (
                      <motion.article key={s.id} whileHover={!isClosed ? { y: -2 } : undefined} className={`group rounded-2xl border p-4 shadow-sm transition-all ${isClosed ? 'border-slate-200 bg-slate-50/80 opacity-80' : 'border-slate-100 bg-gradient-to-br from-white to-slate-50 hover:border-[#0B5ED7]/30 hover:shadow-[0_10px_30px_-14px_rgba(11,94,215,0.45)]'}`}>
                        <div className="mb-3 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="mb-1 flex items-center gap-1.5 flex-wrap">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${isClosed ? 'bg-slate-200 text-slate-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${isClosed ? 'bg-slate-400' : 'bg-emerald-500 animate-pulse'}`} />
                                {displayStatus}
                              </span>
                              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">{s.subject}</span>
                            </div>
                            {s.topic && (<h3 className="line-clamp-1 font-black text-[#071840]">{s.topic}</h3>)}
                            <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-slate-500">by {s.creatorName}</p>
                          </div>
                        </div>
                        <div className="mb-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-600">
                          <span className="inline-flex items-center gap-1"><Clock size={12} className="text-[#0B5ED7]" /><span key={`${s.id}-${tick}`}>{formatDuration(s.startedAt)}</span></span>
                          <span className="inline-flex items-center gap-1"><Users size={12} className="text-emerald-600" />{s.participantCount} participants</span>
                        </div>
                        <button
                          onClick={() => !isClosed && navigate(`/live-study/${s.id}`)}
                          disabled={isClosed}
                          className={`inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold transition-colors ${isClosed ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-[#0B5ED7] text-white hover:bg-[#094fb8]'}`}
                        >
                          <MessageCircle size={14} />{isClosed ? 'Session Closed' : 'JOIN'}{!isClosed && <ChevronRight size={14} />}
                        </button>
                      </motion.article>
                    )
                  })}
                </div>
              )}
            </motion.section>

            <motion.section variants={itemVariants} className="overflow-hidden rounded-3xl border border-blue-100 bg-white p-6 shadow-sm md:p-8">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div id="ranking">
                  <h2 className="flex items-center gap-2 text-xl font-black text-[#071840]">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10"><Trophy size={18} className="text-amber-600" /></span>
                    Ranking
                  </h2>
                  <p className="mt-0.5 text-sm text-slate-500">Top students this period · ترتيب الأوائل</p>
                </div>
                <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 p-1">
                  {(['daily', 'weekly', 'monthly'] as const).map((p) => (
                    <button key={p} onClick={() => setRankPeriod(p)} className={`rounded-full px-3 py-1.5 text-[11px] font-black capitalize transition-all ${rankPeriod === p ? 'bg-white text-[#0B5ED7] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{p}</button>
                  ))}
                </div>
              </div>
              {rankingLoading ? (
                <div className="space-y-2">{[1, 2, 3, 4, 5].map((n) => (<div key={n} className="h-12 animate-pulse rounded-xl bg-slate-100" />))}</div>
              ) : ranking.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 py-10 text-center text-sm text-slate-500">
                  <Trophy size={32} className="opacity-40" />No data for this period yet.
                </div>
              ) : (
                <ol className="space-y-2">
                  {ranking.map((entry, idx) => {
                    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null
                    return (
                      <motion.li key={entry.userId || idx} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }} className={`flex items-center gap-3 rounded-2xl border p-3 ${idx < 3 ? 'border-amber-100 bg-gradient-to-r from-amber-50/70 to-white' : 'border-slate-100 bg-white'}`}>
                        <div className="shrink-0 w-9 text-center">
                          {medal ? (<span className="text-2xl">{medal}</span>) : (<span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-600">{entry.rank || idx + 1}</span>)}
                        </div>
                        <div className="min-w-0 flex-1"><div className="truncate font-black text-[#071840]">{entry.name}</div></div>
                        <div className="shrink-0 rounded-full bg-[#0B5ED7]/10 px-3 py-1 text-xs font-black text-[#0B5ED7]">{formatMinutes(entry.minutes)}</div>
                      </motion.li>
                    )
                  })}
                </ol>
              )}
            </motion.section>
          </div>

          <motion.aside variants={itemVariants} className="w-full shrink-0 space-y-6 md:w-80">
            <section className="overflow-hidden rounded-3xl border border-blue-100 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-[#071840]">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10"><Medal size={16} className="text-sky-600" /></span>
                Badges
              </h2>
              {badgesLoading ? (
                <div className="grid grid-cols-3 gap-2 md:grid-cols-3">{[1, 2, 3, 4, 5, 6].map((n) => (<div key={n} className="h-20 animate-pulse rounded-xl bg-slate-100" />))}</div>
              ) : badges.length === 0 ? (
                <div className="grid grid-cols-3 gap-2 md:grid-cols-3">
                  {Object.entries(BADGE_ICON_MAP).map(([slug, emoji]) => (
                    <div key={slug} className="flex flex-col items-center justify-center rounded-xl border border-slate-100 bg-slate-50 p-3 opacity-40 grayscale" title={slug}>
                      <span className="text-2xl">{emoji}</span>
                      <span className="mt-1 text-[10px] font-bold text-slate-500 line-clamp-2 text-center">{slug.replace(/-/g, ' ')}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {badges.map((b) => (
                    <div key={b.id} className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all ${b.awarded ? 'border-sky-100 bg-gradient-to-br from-sky-50 to-white shadow-sm' : 'border-slate-100 bg-slate-50 opacity-40 grayscale'}`} title={b.description || b.name}>
                      <span className="text-2xl">{getBadgeEmoji(b.slug || b.icon)}</span>
                      <span className="mt-1 text-[10px] font-black text-[#071840] line-clamp-2">{b.name}</span>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-4 text-[11px] font-semibold text-slate-500 text-center">{studentBacSectionLabel ? `Bac ${studentBacSectionLabel}` : ''}</p>
            </section>
            <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-[#0B5ED7]/5 via-white to-sky-50/50 p-5 shadow-sm">
              <h3 className="font-black text-[#071840] mb-1">Why study live?</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Studying with peers boosts focus 2x, unlocks accountability, and turns lonely sessions into shared progress. Earn badges every time you stay consistent!
              </p>
            </section>
          </motion.aside>
        </motion.div>
      )}

      {/* ========= TAB: STUDY SQUAD (embedded, NO routes) ========= */}
      {activeTab === 'squad' && !selectedSquadId && (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
          <motion.div variants={itemVariants} className="grid md:grid-cols-3 gap-6">
            <form onSubmit={createSquad} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h2 className="font-black text-[#071840] mb-3 flex items-center gap-2"><Plus size={18} /> Create a Squad</h2>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Squad name</label>
              <input value={newSquadName} onChange={(e) => setNewSquadName(e.target.value)} placeholder="e.g. Math Warriors" maxLength={60}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-[#0B5ED7]/40 focus:border-[#0B5ED7] text-sm" />
              {squadCreateError && <p className="text-xs text-red-500 mt-2">{squadCreateError}</p>}
              <button disabled={creatingSquad || !newSquadName.trim()} className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-[#0B5ED7] hover:bg-[#094fb8] disabled:opacity-50 text-white rounded-xl px-4 py-2.5 text-sm font-black transition-colors shadow-sm">
                {creatingSquad && <Loader2 size={16} className="animate-spin" />}Create Squad
              </button>
            </form>
            <form onSubmit={joinByCode} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h2 className="font-black text-[#071840] mb-3 flex items-center gap-2"><Ticket size={18} /> Join with code</h2>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Invitation code</label>
              <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="TB-8K4P2" maxLength={30}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-[#0B5ED7]/40 focus:border-[#0B5ED7] text-sm uppercase tracking-widest font-mono" />
              {joinError && <p className="text-xs text-red-500 mt-2">{joinError}</p>}
              <button disabled={joiningSquad || !joinCode.trim()} className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded-xl px-4 py-2.5 text-sm font-black transition-colors shadow-sm">
                {joiningSquad && <Loader2 size={16} className="animate-spin" />}Join Squad
              </button>
            </form>
            <div className="bg-gradient-to-br from-[#0B5ED7]/5 via-white to-sky-50/40 border border-blue-100 rounded-2xl p-5">
              <h2 className="font-black text-[#071840] mb-2">How it works</h2>
              <ul className="text-xs text-slate-600 space-y-1.5 leading-relaxed">
                <li>• Create a private squad with just your friends</li>
                <li>• Invite by phone or share your invitation code</li>
                <li>• Start private sessions (same Live Study room above)</li>
                <li>• Share goals &amp; track squad study time</li>
              </ul>
            </div>
          </motion.div>

          {invitations.length > 0 && (
            <motion.section variants={itemVariants} className="rounded-3xl border border-amber-100 bg-amber-50/40 p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-[#071840]">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700"><Ticket size={16} /></span>
                Pending Invitations · {invitations.length}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {invitations.map((inv) => (
                  <div key={inv.id} className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
                    <h3 className="font-black text-[#071840]">{inv.squad?.name || 'Squad Invite'}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      From {inv.inviter ? `${inv.inviter.firstName} ${inv.inviter.lastName}` : 'a friend'} · {fmtDate(inv.createdAt)}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => acceptInvitation(inv.id)} disabled={!!acceptIds[inv.id]}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3 py-2 text-xs font-black transition-colors">
                        {acceptIds[inv.id] ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}Accept
                      </button>
                      <button onClick={() => declineInvitation(inv.id)} disabled={!!declineIds[inv.id]}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-700 px-3 py-2 text-xs font-black transition-colors">
                        {declineIds[inv.id] ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
          )}

          <motion.section variants={itemVariants} className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm md:p-8">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-black text-[#071840]">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10"><Users size={18} className="text-sky-600" /></span>
                  My Squads
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">Your private study groups</p>
              </div>
              <button onClick={() => refreshSquadList()} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-600 transition-colors">
                <RefreshCw size={12} />Refresh
              </button>
            </div>
            {squadListLoading ? (
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">{[1, 2, 3].map((n) => (<div key={n} className="h-28 animate-pulse rounded-2xl bg-slate-100" />))}</div>
            ) : squads.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 py-12 text-center">
                <Users size={36} className="opacity-30" />
                <h3 className="text-lg font-black text-[#071840]">No squads yet</h3>
                <p className="max-w-sm text-sm text-slate-600">Create your first private squad above or join one using an invitation code.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {squads.map((s) => (
                  <div key={s.id} className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 hover:border-[#0B5ED7]/30 hover:shadow-[0_10px_30px_-14px_rgba(11,94,215,0.45)] transition-all">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="flex items-center gap-1.5 font-black text-[#071840]">
                          {isOwner(s) && <span title="Owner"><Crown size={14} className="text-amber-500" /></span>}
                          {s.name}
                        </h3>
                        <button onClick={() => copySquadCode(s.invitationCode)} className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-[#0B5ED7]">
                          {copiedCode === s.invitationCode ? (<><Check size={11} />Copied</>) : (<><Copy size={11} />{s.invitationCode}</>)}
                        </button>
                      </div>
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black text-[#0B5ED7]">{s.memberCount || 1}</span>
                    </div>
                    <div className="mb-3 flex flex-wrap gap-2 text-[10px] font-bold">
                      <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5">{String(s.bacSection).replace(/_/g, ' ')}</span>
                      {s.activeSessionCount ? (
                        <span className="rounded-full bg-emerald-500/10 text-emerald-700 px-2 py-0.5">🔴 {s.activeSessionCount} live</span>
                      ) : null}
                    </div>
                    <button onClick={() => openSquad(s.id)} className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0B5ED7] text-white hover:bg-[#094fb8] px-3 py-2.5 text-xs font-black transition-colors">
                      Open Squad <ArrowRight size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.section>
        </motion.div>
      )}

      {/* ========= SELECTED SQUAD DETAIL (embedded, no route) ========= */}
      {activeTab === 'squad' && selectedSquadId && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-6">
          <button onClick={backToSquadList} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#0B5ED7]">
            <ArrowLeft size={14} /> Back to My Squads
          </button>
          {squadDetailLoading ? (
            <div className="grid md:grid-cols-3 gap-6"><div className="md:col-span-2 h-64 animate-pulse rounded-2xl bg-slate-100" /><div className="h-64 animate-pulse rounded-2xl bg-slate-100" /></div>
          ) : squadDetailError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-6 text-rose-800 text-sm font-bold">{squadDetailError}</div>
          ) : squadDetail ? (
            <div className="space-y-6">
              {/* header */}
              <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-[#0B5ED7]/5 via-white to-sky-50/50 p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-600 to-[#0B5ED7] text-white flex items-center justify-center shadow-md">
                      <Users size={22} />
                    </div>
                    <div>
                      <h1 className="text-2xl font-black text-[#071840] flex items-center gap-2">
                        {isOwner(squadDetail) && <span title="Owner"><Crown size={18} className="text-amber-500" /></span>}
                        {squadDetail.name}
                      </h1>
                      <button onClick={() => { try { navigator.clipboard.writeText(squadDetail.invitationCode); setCopiedDetailCode(true); setTimeout(() => setCopiedDetailCode(false), 1500); } catch {} }}
                        className="mt-0.5 inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-[#0B5ED7]">
                        {copiedDetailCode ? (<><Check size={12} />Copied invitation code</>) : (<><Copy size={12} />{squadDetail.invitationCode}</>)}
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <button onClick={() => setSettingsOpen((v) => !v)} className="inline-flex items-center gap-2 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 px-4 py-2 text-sm font-black text-slate-700 shadow-sm transition-colors">
                      <Settings size={15} /> Settings
                    </button>
                    {settingsOpen && (
                      <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 bg-white shadow-xl p-2 z-20">
                        {isOwner(squadDetail) && (
                          <button onClick={() => { setRenameOpen(true); setRenameValue(squadDetail.name); setSettingsOpen(false); }}
                            className="w-full text-left inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
                            <Pencil size={14} /> Rename squad
                          </button>
                        )}
                        {!isOwner(squadDetail) && (
                          <button onClick={leaveSquad} disabled={leaveLoading}
                            className="w-full text-left inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-amber-700 hover:bg-amber-50 disabled:opacity-50">
                            {leaveLoading ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />} Leave squad
                          </button>
                        )}
                        {isOwner(squadDetail) && (
                          <button onClick={disbandSquad} disabled={disbandLoading}
                            className="w-full text-left inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                            {disbandLoading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Disband squad
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {renameOpen && (
                <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">Rename squad</label>
                  <input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} maxLength={60}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-[#0B5ED7]/40 focus:border-[#0B5ED7] text-sm" />
                  <div className="mt-3 flex gap-2 justify-end">
                    <button onClick={() => setRenameOpen(false)} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700">Cancel</button>
                    <button onClick={renameSquad} disabled={renameLoading || !renameValue.trim()} className="inline-flex items-center gap-2 rounded-xl bg-[#0B5ED7] px-4 py-2 text-sm font-black text-white hover:bg-[#094fb8] disabled:opacity-50">
                      {renameLoading && <Loader2 size={14} className="animate-spin" />} Save
                    </button>
                  </div>
                </div>
              )}

              <div className="grid gap-6 md:grid-cols-3">
                {/* left column (wide) */}
                <div className="md:col-span-2 space-y-6">
                  {/* Private Live Study CTA + active sessions */}
                  <section className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm">
                    <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-[#071840]">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#0B5ED7]/10"><PlayCircle size={16} className="text-[#0B5ED7]" /></span>
                      Private Live Study
                    </h2>
                    <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50/40 p-5 mb-4">
                      <p className="text-sm text-slate-600 mb-3">Start a private study session with your squad members. Uses the same Live Study room you know — only squad members can join.</p>
                      <button onClick={startPrivateStudy} disabled={startStudyLoading}
                        className="inline-flex items-center gap-2 rounded-2xl bg-[#0B5ED7] hover:bg-[#094fb8] disabled:opacity-60 text-white px-5 py-3 text-sm font-black shadow-[0_12px_30px_-10px_rgba(11,94,215,0.65)] transition-colors">
                        {startStudyLoading ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />} Start Study (Existing Room)
                      </button>
                    </div>
                    {(squadDetail.studySessions || []).length > 0 && (
                      <>
                        <h3 className="mb-3 text-xs font-black uppercase tracking-wider text-slate-500">Active Squad Sessions</h3>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {(squadDetail.studySessions || []).map((ss) => {
                            const live = ss.status === 'ACTIVE'
                            return (
                              <div key={ss.id} className={`rounded-2xl border p-3 ${live ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-slate-50'}`}>
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="min-w-0">
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${live ? 'bg-emerald-500/10 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                                      <span className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} /> {ss.status}
                                    </span>
                                    <h4 className="mt-1 font-black text-[#071840] line-clamp-1">{ss.title}</h4>
                                    <p className="text-[11px] text-slate-500">{fmtTime(ss.startedAt)} · {ss.participantCount || 0} in room</p>
                                  </div>
                                </div>
                                <button onClick={() => live && navigate(`/live-study/${ss.id}`)} disabled={!live}
                                  className={`w-full inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition-colors ${live ? 'bg-[#0B5ED7] text-white hover:bg-[#094fb8]' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}>
                                  <MessageCircle size={14} /> {live ? 'Join Session' : 'Closed'} {live && <ArrowRight size={14} />}
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </>
                    )}
                  </section>

                  {/* Shared Goal */}
                  <section className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="flex items-center gap-2 text-lg font-black text-[#071840]">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10"><Target size={16} className="text-amber-600" /></span>
                        Shared Squad Goal
                      </h2>
                      <button onClick={() => setGoalEditOpen((v) => !v)} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-[11px] font-black text-slate-600 transition-colors">
                        <Pencil size={12} /> {goalEditOpen ? 'Close' : 'Edit'}
                      </button>
                    </div>
                    {squadDetail.goal ? (
                      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-amber-50/60 to-white p-4">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-black text-[#071840] flex items-center gap-2">
                            {squadDetail.goal.completed && <CheckCircle2 size={16} className="text-emerald-600" />}
                            {squadDetail.goal.title}
                          </h3>
                          {squadDetail.goal.targetDate && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                              <CalendarDays size={11} /> {fmtDate(squadDetail.goal.targetDate)}
                            </span>
                          )}
                        </div>
                        {squadDetail.goal.description && <p className="text-xs text-slate-600 mt-1">{squadDetail.goal.description}</p>}
                        <div className="mt-4">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[11px] font-bold text-slate-500">Progress</span>
                            <span className="text-[11px] font-black text-[#0B5ED7]">{squadDetail.goal.progress}%</span>
                          </div>
                          <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-[#0B5ED7] to-sky-500 transition-all" style={{ width: `${squadDetail.goal.progress}%` }} />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border-2 border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">No goal set yet. Click Edit to set a shared squad goal!</div>
                    )}
                    {goalEditOpen && (
                      <form onSubmit={upsertGoal} className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/40 p-4 space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Title</label>
                          <input value={goalForm.title} onChange={(e) => setGoalForm((p) => ({ ...p, title: e.target.value }))}
                            placeholder="e.g. نكمل Math chapitre 4 قبل الجمعة" maxLength={120}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-[#0B5ED7]/40 focus:border-[#0B5ED7]" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Description</label>
                          <textarea value={goalForm.description} onChange={(e) => setGoalForm((p) => ({ ...p, description: e.target.value }))}
                            rows={2} maxLength={400} className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-[#0B5ED7]/40 focus:border-[#0B5ED7]" />
                        </div>
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Target date</label>
                            <input type="date" value={goalForm.targetDate} onChange={(e) => setGoalForm((p) => ({ ...p, targetDate: e.target.value }))}
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-[#0B5ED7]/40 focus:border-[#0B5ED7]" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Progress · {goalForm.progress}%</label>
                            <input type="range" min={0} max={100} step={5} value={goalForm.progress} onChange={(e) => setGoalForm((p) => ({ ...p, progress: Number(e.target.value) }))}
                              className="w-full accent-[#0B5ED7]" />
                          </div>
                        </div>
                        <label className="inline-flex items-center gap-2 text-sm font-bold text-slate-700">
                          <input type="checkbox" checked={goalForm.completed} onChange={(e) => setGoalForm((p) => ({ ...p, completed: e.target.checked }))} className="accent-[#0B5ED7] h-4 w-4" />
                          Completed
                        </label>
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => setGoalEditOpen(false)} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700">Cancel</button>
                          <button type="submit" disabled={goalLoading || !goalForm.title.trim()} className="inline-flex items-center gap-2 rounded-xl bg-[#0B5ED7] px-4 py-2 text-sm font-black text-white hover:bg-[#094fb8] disabled:opacity-50">
                            {goalLoading && <Loader2 size={14} className="animate-spin" />} Save
                          </button>
                        </div>
                      </form>
                    )}
                  </section>

                  {/* Squad Chat */}
                  <section className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm">
                    <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-[#071840]">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10"><MessageCircle size={16} className="text-sky-600" /></span>
                      Squad Chat
                    </h2>
                    <div className="h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/40 p-3 space-y-2 mb-3">
                      {(squadDetail.chatMessages || []).length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center text-sm text-slate-400">
                          <ClipboardList size={28} className="mb-2 opacity-40" /> No messages yet
                        </div>
                      ) : (
                        (squadDetail.chatMessages || []).map((m) => {
                          const me = m.userId === user?.id
                          return (
                            <div key={m.id} className={`flex items-end gap-2 ${me ? 'justify-end' : 'justify-start'}`}>
                              {!me && (
                                <div className="shrink-0 w-8 h-8 rounded-full bg-[#0B5ED7] text-white flex items-center justify-center text-xs font-black">
                                  {(m.user?.firstName || '?')[0]}
                                </div>
                              )}
                              <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${me ? 'bg-[#0B5ED7] text-white rounded-br-md' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-md'}`}>
                                {!me && <p className="text-[10px] font-black text-slate-500 mb-0.5">{m.user ? `${m.user.firstName} ${m.user.lastName}` : 'Member'}</p>}
                                <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                                <p className={`text-[10px] mt-0.5 ${me ? 'text-white/70 text-right' : 'text-slate-400'}`}>{fmtTime(m.createdAt)}</p>
                              </div>
                            </div>
                          )
                        })
                      )}
                      <div ref={chatBottomRef} />
                    </div>
                    <form onSubmit={sendSquadChat} className="flex gap-2">
                      <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Write to your squad…" maxLength={1000}
                        className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-[#0B5ED7]/40 focus:border-[#0B5ED7]" />
                      <button type="submit" disabled={chatLoading || !chatInput.trim()} className="inline-flex items-center gap-1.5 rounded-xl bg-[#0B5ED7] hover:bg-[#094fb8] disabled:opacity-50 text-white px-4 py-2.5 text-sm font-black transition-colors">
                        {chatLoading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                      </button>
                    </form>
                  </section>

                  {/* Members + pending invites (owner) */}
                  <section className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm">
                    <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-[#071840]">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10"><Users size={16} className="text-sky-600" /></span>
                      Members · {squadDetail.members.length}
                    </h2>
                    <div className="grid gap-2 sm:grid-cols-2 mb-4">
                      {(squadDetail.members || []).map((m) => (
                        <div key={m.id} className="rounded-2xl border border-slate-200 bg-white p-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 shrink-0 rounded-full bg-[#0B5ED7] text-white flex items-center justify-center text-xs font-black">
                              {(m.user?.firstName || '?')[0]}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-black text-[#071840] truncate flex items-center gap-1.5">
                                {m.role === 'OWNER' && <span title="Owner"><Crown size={12} className="text-amber-500" /></span>}
                                {m.user ? `${m.user.firstName} ${m.user.lastName}` : 'Member'}
                              </h4>
                              <p className="text-[10px] font-bold text-slate-500">{m.role}</p>
                            </div>
                          </div>
                          {isOwner(squadDetail) && m.role !== 'OWNER' && (
                            <button onClick={() => removeMember(m.userId)} disabled={!!removeLoading[m.userId]}
                              className="inline-flex items-center gap-1 rounded-xl bg-white border border-slate-200 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 disabled:opacity-50 px-2.5 py-1.5 text-[10px] font-black text-slate-600 transition-colors">
                              {removeLoading[m.userId] ? <Loader2 size={11} className="animate-spin" /> : <UserX size={11} />} Remove
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {isOwner(squadDetail) && (
                      <>
                        <form onSubmit={inviteByPhone} className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4 mb-4">
                          <h3 className="mb-3 text-sm font-black text-[#071840] flex items-center gap-2"><Plus size={14} /> Invite by phone</h3>
                          <div className="flex flex-wrap gap-2">
                            <input value={invitePhone} onChange={(e) => setInvitePhone(e.target.value)} placeholder="e.g. 99000002" maxLength={20}
                              className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-[#0B5ED7]/40 focus:border-[#0B5ED7]" />
                            <button type="submit" disabled={inviteLoading || !invitePhone.trim()}
                              className="inline-flex items-center gap-2 rounded-xl bg-[#0B5ED7] hover:bg-[#094fb8] disabled:opacity-50 text-white px-4 py-2 text-sm font-black transition-colors">
                              {inviteLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Send Invite
                            </button>
                          </div>
                          {inviteError && <p className="text-xs text-red-500 mt-2">{inviteError}</p>}
                          {inviteSuccess && <p className="text-xs text-emerald-700 mt-2">{inviteSuccess}</p>}
                        </form>
                        {(squadDetail.invitations || []).filter((i) => i.status === 'PENDING').length > 0 && (
                          <div>
                            <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">Pending Invitations</h3>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {(squadDetail.invitations || []).filter((i) => i.status === 'PENDING').map((inv) => (
                                <div key={inv.id} className="rounded-2xl border border-amber-200 bg-amber-50/30 p-3 flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="text-sm font-black text-[#071840] truncate">{inv.invitee ? `${inv.invitee.firstName} ${inv.invitee.lastName}` : 'Invited user'}</p>
                                    <p className="text-[10px] font-bold text-slate-500">{fmtDate(inv.createdAt)} · Expires {fmtDate(inv.expiresAt)}</p>
                                  </div>
                                  <button onClick={() => cancelInvitation(inv.id)} disabled={!!cancelInvLoading[inv.id]}
                                    className="inline-flex items-center gap-1 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-50 px-2.5 py-1.5 text-[10px] font-black text-slate-600 transition-colors">
                                    {cancelInvLoading[inv.id] ? <Loader2 size={11} className="animate-spin" /> : <XCircle size={11} />} Cancel
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </section>
                </div>

                {/* right column: STATS */}
                <div className="space-y-6">
                  <section className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm">
                    <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-[#071840]">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10"><Trophy size={16} className="text-emerald-600" /></span>
                      Squad Stats
                    </h2>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="rounded-2xl bg-gradient-to-br from-sky-50 to-blue-50 border border-blue-100 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-sky-700">Total Study</p>
                        <p className="mt-1 text-xl font-black text-[#071840]">{fmtMin(squadDetail.stats?.totalMinutes || 0)}</p>
                      </div>
                      <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Sessions</p>
                        <p className="mt-1 text-xl font-black text-[#071840]">{squadDetail.stats?.completedSessions || 0}</p>
                      </div>
                      <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Active Now</p>
                        <p className="mt-1 text-xl font-black text-[#071840]">{squadDetail.stats?.activeSessions || 0}</p>
                      </div>
                      <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 border border-indigo-100 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Active Members</p>
                        <p className="mt-1 text-xl font-black text-[#071840]">{squadDetail.stats?.activeMembers || 0}</p>
                      </div>
                    </div>
                    <h3 className="mb-3 text-xs font-black uppercase tracking-wider text-slate-500">Per Member</h3>
                    <div className="space-y-2.5">
                      {(squadDetail.members || []).map((m) => {
                        const mins = squadDetail.stats?.perMemberMinutes?.[m.userId] || 0
                        const max = Math.max(1, ...Object.values(squadDetail.stats?.perMemberMinutes || {}).map((v) => Number(v || 0)))
                        const pct = Math.max(4, Math.min(100, Math.round((mins / max) * 100)))
                        return (
                          <div key={m.id}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-slate-700 truncate">{m.role === 'OWNER' && '👑 '}{m.user ? `${m.user.firstName} ${m.user.lastName}` : 'Member'}</span>
                              <span className="text-[11px] font-black text-[#0B5ED7]">{fmtMin(mins)}</span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-[#0B5ED7] to-sky-500" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </section>
                </div>
              </div>
            </div>
          ) : null}
        </motion.div>
      )}

      {/* ========= Create public session MODAL (original, unchanged) ========= */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => !creating && setModalOpen(false)}>
            <motion.div initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 10 }} transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 p-5">
                <div>
                  <h2 className="text-xl font-black text-[#071840]">Start a Live Study</h2>
                  <p className="mt-0.5 text-sm text-slate-500">Pick a subject and invite others</p>
                </div>
                <button type="button" onClick={() => setModalOpen(false)} disabled={creating}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleCreatePublicSession} className="space-y-4 p-5">
                <div>
                  <label className="mb-1.5 block text-xs font-black text-slate-700">Subject</label>
                  <select value={formSubject} onChange={(e) => setFormSubject(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-[#071840] outline-none focus:border-[#0B5ED7] focus:ring-2 focus:ring-[#0B5ED7]/15" required>
                    {SUBJECTS.map((s) => (<option key={s} value={s}>{s}</option>))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-black text-slate-700">Topic / Chapter <span className="font-normal text-slate-400">(optional)</span></label>
                  <input type="text" value={formTopic} onChange={(e) => setFormTopic(e.target.value)}
                    placeholder="e.g. Trigonometry — Chapitre 3" maxLength={120}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#0B5ED7] focus:ring-2 focus:ring-[#0B5ED7]/15" />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={() => setModalOpen(false)} disabled={creating}
                    className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 disabled:opacity-50">Cancel</button>
                  <button type="submit" disabled={creating}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0B5ED7] px-5 py-2.5 text-sm font-black text-white shadow-[0_10px_24px_-8px_rgba(11,94,215,0.7)] hover:bg-[#094fb8] disabled:opacity-60">
                    {creating ? (<Loader2 size={15} className="animate-spin" />) : (<PlayCircle size={15} />)}
                    {creating ? 'Starting…' : 'Start Session'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default SessionsList
