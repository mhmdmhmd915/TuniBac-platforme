import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Clock,
  Loader2,
  LogOut,
  Square,
  Send,
  Trophy,
  Users,
  X,
  CheckCircle2,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { liveStudyAPI } from '../../services/api'
import { attachSessionPresenceListeners, getSocket } from '../../lib/socketClient'
import {
  WebRtcMediaManager, buildCombinedLocalStream, RemoteStreamMap } from '../../lib/webrtcMedia'

interface Participant {
  id: string
  name: string
  active: boolean
  mic?: boolean
  camera?: boolean
  avatarColor?: string | null
}

interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  content: string
  createdAt: string
}

interface SessionInfo {
  id: string
  subject: string
  topic?: string | null
  creatorName: string
  startedAt: string
  participantCount: number
  createdById?: string | null
  creatorId?: string | null
  ownerId?: string | null
}

interface BadgeItem {
  id: string
  slug: string
  name: string
  awarded: boolean
  icon?: string | null
}

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

const AVATAR_COLORS = [
  '#0B5ED7',
  '#0891b2',
  '#059669',
  '#d97706',
  '#dc2626',
  '#7c3aed',
  '#db2777',
  '#071840',
]

const hashNameColor = (maybeName?: string | null) => {
  const name = typeof maybeName === 'string' ? maybeName.trim() || 'Student' : 'Student'
  let sum = 0
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length] || AVATAR_COLORS[0]
}

const buildInitials = (maybeName?: string | null) => {
  const name = typeof maybeName === 'string' ? maybeName.trim() : ''
  if (!name) return '?'
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return parts.map((n) => (n[0] || '').toUpperCase()).slice(0, 2).join('') || '?'
}

const normalizeParticipant = (raw: any): Participant | null => {
  if (!raw) return null
  const p: any = raw
  const userNested: any = p.user || p.User || {}
  const first =
    typeof p.firstName === 'string'
      ? p.firstName
      : typeof userNested.firstName === 'string'
      ? userNested.firstName
      : ''
  const last =
    typeof p.lastName === 'string'
      ? p.lastName
      : typeof userNested.lastName === 'string'
      ? userNested.lastName
      : ''
  const name =
    typeof p.name === 'string' && p.name.trim()
      ? p.name.trim()
      : [first, last].filter(Boolean).join(' ').trim() ||
        p.creatorName ||
        p.senderName ||
        'Student'
  const id =
    p.id ||
    p.userId ||
    p.user_id ||
    userNested.id ||
    (typeof name === 'string' ? name : 'anon') + '-' + Math.random().toString(36).slice(2, 7)
  const active =
    typeof p.active === 'boolean'
      ? p.active
      : typeof p.isActive === 'boolean'
      ? p.isActive
      : true
  const mic =
    typeof p.mic === 'boolean'
      ? p.mic
      : typeof p.micEnabled === 'boolean'
      ? p.micEnabled
      : false
  const camera =
    typeof p.camera === 'boolean'
      ? p.camera
      : typeof p.camEnabled === 'boolean'
      ? p.camEnabled
      : false
  return {
    id: String(id),
    name: String(name),
    active: Boolean(active),
    mic: Boolean(mic),
    camera: Boolean(camera),
  }
}

const normalizeParticipants = (arr: any): Participant[] => {
  if (!Array.isArray(arr)) return []
  return arr.map(normalizeParticipant).filter((x): x is Participant => !!x)
}

const formatTimer = (startedAt: string, tick: number) => {
  const diff = Math.max(0, Date.now() - new Date(startedAt).getTime())
  const totalSec = Math.floor(diff / 1000)
  const mm = Math.floor(totalSec / 60) % 60
  const hh = Math.floor(totalSec / 3600)
  const ss = totalSec % 60
  if (hh > 0) return `${hh}:${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`
  return `${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`
  void tick
}

const formatTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

interface ToastBadge {
  id: string
  name: string
  slug: string
}

const StudyRoom: React.FC = () => {
  const { sessionId = '' } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const chatBottomRef = useRef<HTMLDivElement | null>(null)
  const videoStreamRef = useRef<MediaStream | null>(null)
  const audioStreamRef = useRef<MediaStream | null>(null)
  const combinedLocalStreamRef = useRef<MediaStream | null>(null)
  const wrappedLocalStreamRef: { current: MediaStream | null } = {
    get current() {
      return combinedLocalStreamRef.current
    },
    set current(v: MediaStream | null) {
      combinedLocalStreamRef.current = v
    },
  }
  const remoteVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({})
  const mediaManagerRef = useRef<WebRtcMediaManager | null>(null)
  const unsubscribePeerJoinedRef = useRef<(() => void) | null>(null)
  const didJoinRoomRef = useRef<boolean>(false)

  const [session, setSession] = useState<SessionInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessionClosed, setSessionClosed] = useState(false)
  const [mediaErrorToast, setMediaErrorToast] = useState<string | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)
  const [micOn, setMicOn] = useState(false)
  const [camOn, setCamOn] = useState(false)
  const [togglingMic, setTogglingMic] = useState(false)
  const [togglingCam, setTogglingCam] = useState(false)
  const [tick, setTick] = useState(0)
  const [prevBadgeIds, setPrevBadgeIds] = useState<Set<string>>(new Set())
  const [badgeToasts, setBadgeToasts] = useState<ToastBadge[]>([])
  const [joined, setJoined] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [remoteStreams, setRemoteStreams] = useState<RemoteStreamMap>({})

  const meId = (user as any)?.id || (user as any)?._id || (user as any)?.userId || ''

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!sessionId) return
    let cancelled = false
    let unsubscribeListeners: (() => void) | undefined

    const bootstrap = async () => {
      setLoading(true)
      setError(null)
      try {
        const joinedData = await liveStudyAPI.joinSession(sessionId)
        if (cancelled) return
        didJoinRoomRef.current = true
        const sess: SessionInfo = joinedData?.session || joinedData
        setSession(sess)
        setJoined(true)
        try {
          const parts = await liveStudyAPI.getParticipants(sessionId)
          if (!cancelled) setParticipants(normalizeParticipants(parts))
        } catch {}
        try {
          const msgs = await liveStudyAPI.getChatHistory(sessionId)
          const normalized = Array.isArray(msgs)
            ? msgs
                .map((m: any) => {
                  const senderName =
                    (typeof m?.senderName === 'string' && m.senderName.trim()) ||
                    (m?.user
                      ? [m.user?.firstName || '', m.user?.lastName || ''].filter(Boolean).join(' ').trim()
                      : '') ||
                    'Student'
                  return {
                    id: String(m?.id || Math.random().toString(36).slice(2)),
                    senderId: String(m?.senderId || m?.userId || 'anon'),
                    senderName,
                    content: String(m?.content || ''),
                    createdAt: m?.createdAt ? String(m.createdAt) : new Date().toISOString(),
                  }
                })
                .filter((m: ChatMessage) => m.content)
            : []
          if (!cancelled) setMessages(normalized)
        } catch {}

        try {
          const sock = getSocket()
          await new Promise<void>((resolve) => {
            const timeoutId = setTimeout(() => resolve(), 3000)
            sock.emit('session:join-room', sessionId, (ack: any) => {
              clearTimeout(timeoutId)
              resolve()
              if (ack?.ok === false) {
                if (ack?.error === 'SessionClosed' || ack?.message === 'Session is closed') {
                  setError('This session is closed and cannot be joined.')
                  setSessionClosed(true)
                  setTimeout(() => navigate('/live-study', { replace: true }), 2000)
                  return
                }
                setError(ack?.error || ack?.message || 'Could not join study room channel')
              }
            })
          })
          try {
            const parts2 = await liveStudyAPI.getParticipants(sessionId)
            if (!cancelled) setParticipants(normalizeParticipants(parts2))
          } catch {}
        } catch {}

        try {
          const badges = await liveStudyAPI.getBadges()
          const awarded = Array.isArray(badges) ? badges.filter((b: BadgeItem) => b.awarded) : []
          setPrevBadgeIds(new Set(awarded.map((b: BadgeItem) => b.id)))
        } catch {}

        if (!cancelled) {
          try {
            const mm = new WebRtcMediaManager(meId, sessionId, wrappedLocalStreamRef)
            mm.setOnStreamsChanged((streams) => setRemoteStreams(streams))
            mm.start()
            mediaManagerRef.current = mm
          } catch (e) {
            console.warn('[StudyRoom] WebRTC manager init failed', e)
          }
        }
      } catch (err: any) {
        if (cancelled) return
        const errMsg = err?.response?.data?.message || err?.message || 'Failed to join session'
        setError(errMsg)
        setJoined(false)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void bootstrap()

    const socket = getSocket()

    const handleSessionEnded = (reason?: string) => {
      setSessionClosed(true)
      setError(reason || 'Session ended')
      try {
        mediaManagerRef.current?.closeAll()
      } catch {}
      try {
        if (videoStreamRef.current) {
          videoStreamRef.current.getTracks().forEach((t) => t.stop())
          videoStreamRef.current = null
        }
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((t) => t.stop())
          audioStreamRef.current = null
        }
      } catch {}
      setTimeout(() => navigate('/live-study', { replace: true }), 2200)
    }

    const handleSessionClosed = (data: any) => {
      if (data?.sessionId === sessionId || !data?.sessionId) {
        handleSessionEnded(data?.reason || 'Session ended')
      }
    }
    socket.on(`live-study:session:closed:${sessionId}`, handleSessionClosed)
    socket.on('live-study:session:closed', handleSessionClosed)

    unsubscribeListeners = attachSessionPresenceListeners(sessionId, {
      onChat: (rawMsg: any) => {
        const senderName =
          (typeof rawMsg?.senderName === 'string' && rawMsg.senderName.trim()) ||
          (rawMsg?.user
            ? [rawMsg.user?.firstName || '', rawMsg.user?.lastName || ''].filter(Boolean).join(' ').trim()
            : '') ||
          'Student'
        const msg: ChatMessage = {
          id: String(rawMsg?.id || Math.random().toString(36).slice(2)),
          senderId: String(rawMsg?.senderId || rawMsg?.userId || 'anon'),
          senderName,
          content: String(rawMsg?.content || ''),
          createdAt: rawMsg?.createdAt ? String(rawMsg.createdAt) : new Date().toISOString(),
        }
        if (!msg.content) return
        setMessages((prev) => {
          const exists = prev.some((m) => m.id && m.id === msg.id)
          if (exists) return prev
          return [...prev, msg]
        })
      },
      onPresenceUpdate: (parts: any[]) => {
        setParticipants(normalizeParticipants(parts))
      },
      onSessionEnded: (payload) => {
        handleSessionEnded(payload?.reason || 'Session ended')
      },
      onParticipantLeft: (payload) => {
        setParticipants((prev) => prev.filter((p) => p.id !== payload.userId))
      },
    })

    return () => {
      cancelled = true
      socket.off(`live-study:session:closed:${sessionId}`, handleSessionClosed)
      socket.off('live-study:session:closed', handleSessionClosed)
      if (didJoinRoomRef.current) {
        try {
          socket.emit('session:leave-room', sessionId)
        } catch {}
      }
      didJoinRoomRef.current = false
      if (unsubscribeListeners) unsubscribeListeners()
      try {
        mediaManagerRef.current?.closeAll()
      } catch {}
      mediaManagerRef.current = null
      try { unsubscribePeerJoinedRef.current?.() } catch {}
      unsubscribePeerJoinedRef.current = null
    }
  }, [sessionId, navigate, meId, joined])

  useEffect(() => {
    if (!sessionId || !joined) return
    let hbHandle: number | undefined
    const sendHb = async () => {
      try {
        const res = await liveStudyAPI.heartbeat(sessionId)
        const parts = (res as any)?.participants
        if (Array.isArray(parts)) setParticipants(normalizeParticipants(parts))
        const newBadges = (res as any)?.newlyAwardedBadges
        if (Array.isArray(newBadges) && newBadges.length > 0) {
          newBadges.forEach((b) => {
            if (!prevBadgeIds.has(b.id)) {
              setBadgeToasts((prev) => [...prev, { id: b.id, name: b.name, slug: b.slug }])
              setPrevBadgeIds((prevSet) => new Set(prevSet).add(b.id))
            }
          })
        }
      } catch {}
    }
    const pollBadges = async () => {
      try {
        const badges = await liveStudyAPI.getBadges()
        const arr = Array.isArray(badges) ? (badges as BadgeItem[]) : []
        const newly: BadgeItem[] = []
        arr.forEach((b) => {
          if (b.awarded && !prevBadgeIds.has(b.id)) {
            newly.push(b)
            setPrevBadgeIds((prevSet) => new Set(prevSet).add(b.id))
          }
        })
        newly.forEach((b) =>
          setBadgeToasts((prev) => [...prev, { id: b.id, name: b.name, slug: b.slug }])
        )
      } catch {}
    }
    const onVisChange = () => {
      if (document.visibilityState === 'hidden') {
        if (hbHandle) {
          window.clearInterval(hbHandle)
          hbHandle = undefined
        }
      } else {
        if (!hbHandle) {
          hbHandle = window.setInterval(sendHb, 30000)
          void sendHb()
        }
      }
    }
    document.addEventListener('visibilitychange', onVisChange)
    hbHandle = window.setInterval(sendHb, 30000)
    const badgePoll = window.setInterval(pollBadges, 60000)
    return () => {
      document.removeEventListener('visibilitychange', onVisChange)
      if (hbHandle) window.clearInterval(hbHandle)
      window.clearInterval(badgePoll)
    }
  }, [sessionId, joined, prevBadgeIds])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length])

  useEffect(() => {
    const timeouts: number[] = []
    badgeToasts.forEach((t) => {
      const to = window.setTimeout(() => {
        setBadgeToasts((prev) => prev.filter((x) => x.id !== t.id))
      }, 5000)
      timeouts.push(to)
    })
    return () => timeouts.forEach((t) => window.clearTimeout(t))
  }, [badgeToasts])

  useEffect(() => {
    return () => {
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach((t) => {
          t.stop()
          videoStreamRef.current?.removeTrack(t)
        })
        videoStreamRef.current = null
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => {
          t.stop()
          audioStreamRef.current?.removeTrack(t)
        })
        audioStreamRef.current = null
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
      if (sessionId) {
        void liveStudyAPI.leaveSession(sessionId).catch(() => {})
      }
    }
  }, [sessionId])

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const content = messageInput.trim()
    if (!content || !sessionId || sendingMsg) return
    if (content.length > 1000) return
    setSendingMsg(true)
    try {
      const sent = await liveStudyAPI.sendChat(sessionId, { content })
      setMessageInput('')
      if (sent) {
        const incoming: ChatMessage = sent.message || sent
        setMessages((prev) => [...prev, incoming])
      }
    } catch {} finally {
      setSendingMsg(false)
    }
  }

  const showMediaError = (msg: string) => {
    setMediaErrorToast(msg)
    setTimeout(() => setMediaErrorToast(null), 5000)
  }

  const isOwner = !!(session && (
    meId === (session as any).createdById ||
    meId === (session as any).creatorId ||
    meId === (session as any).ownerId
  ))

  const handleLeave = async () => {
    if (leaving || finishing || !sessionId) return
    setLeaving(true)
    try {
      try {
        if (videoStreamRef.current) {
          videoStreamRef.current.getTracks().forEach((t) => t.stop())
          videoStreamRef.current = null
        }
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((t) => t.stop())
          audioStreamRef.current = null
        }
        if (combinedLocalStreamRef.current) {
          combinedLocalStreamRef.current.getTracks().forEach((t) => t.stop())
          combinedLocalStreamRef.current = null
        }
        wrappedLocalStreamRef.current = null
      } catch {}
      try { mediaManagerRef.current?.closeAll() } catch {}
      try {
        const sock = getSocket()
        sock.emit('session:leave-room', sessionId)
      } catch {}
      try { await liveStudyAPI.leaveSession(sessionId) } catch {}
      navigate('/live-study', { replace: true })
    } finally {
      setLeaving(false)
    }
  }

  const handleFinish = async () => {
    if (leaving || finishing || !sessionId || !isOwner) return
    setFinishing(true)
    try {
      try {
        if (videoStreamRef.current) {
          videoStreamRef.current.getTracks().forEach((t) => t.stop())
          videoStreamRef.current = null
        }
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((t) => t.stop())
          audioStreamRef.current = null
        }
        if (combinedLocalStreamRef.current) {
          combinedLocalStreamRef.current.getTracks().forEach((t) => t.stop())
          combinedLocalStreamRef.current = null
        }
        wrappedLocalStreamRef.current = null
      } catch {}
      try { mediaManagerRef.current?.closeAll() } catch {}
      try { await liveStudyAPI.finishSession(sessionId) } catch {}
      navigate('/live-study', { replace: true })
    } finally {
      setFinishing(false)
    }
  }

  const getUserMediaTimed = async (
    constraints: MediaStreamConstraints,
    timeoutMs = 5000
  ): Promise<MediaStream> => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      throw new DOMException('getUserMedia not supported in this browser', 'NotSupportedError')
    }
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    try {
      const timeout = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          const err = new DOMException(
            'Permission or device prompt timed out. Check your browser settings or try again.',
            'TimeoutError'
          )
          reject(err)
        }, timeoutMs)
      })
      return await Promise.race([navigator.mediaDevices.getUserMedia(constraints), timeout])
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId)
    }
  }

  const toggleMic = async () => {
    if (togglingMic || !sessionId) return
    setTogglingMic(true)
    try {
      if (!micOn) {
        try {
          const stream = await getUserMediaTimed({ audio: true })
          audioStreamRef.current = stream
        } catch (err: any) {
          if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
            showMediaError('Microphone permission denied. Please allow microphone access in your browser settings.')
          } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
            showMediaError('No microphone found. Please connect a microphone and try again.')
          } else if (err?.name === 'TimeoutError') {
            showMediaError(err?.message || 'Microphone request timed out. Check browser settings and retry.')
          } else {
            showMediaError(err?.message || 'Could not access microphone.')
          }
          return
        }
        const next = true
        setMicOn(next)
        wrappedLocalStreamRef.current = buildCombinedLocalStream(audioStreamRef.current, videoStreamRef.current)
        try {
          await mediaManagerRef.current?.addOrReplaceLocalTracks()
        } catch {}
        try {
          await liveStudyAPI.updateMediaState(sessionId, { mic: next })
        } catch {}
      } else {
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((t) => {
            t.stop()
            audioStreamRef.current?.removeTrack(t)
          })
          audioStreamRef.current = null
        }
        const next = false
        setMicOn(next)
        wrappedLocalStreamRef.current = buildCombinedLocalStream(null, videoStreamRef.current)
        try {
          await mediaManagerRef.current?.addOrReplaceLocalTracks()
        } catch {}
        try {
          await liveStudyAPI.updateMediaState(sessionId, { mic: next })
        } catch {}
      }
    } finally {
      setTogglingMic(false)
    }
  }

  const toggleCam = async () => {
    if (togglingCam || !sessionId) return
    setTogglingCam(true)
    try {
      if (!camOn) {
        try {
          const stream = await getUserMediaTimed({ video: true })
          videoStreamRef.current = stream
          if (videoRef.current) {
            videoRef.current.srcObject = stream
          }
        } catch (err: any) {
          if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
            showMediaError('Camera permission denied. Please allow camera access in your browser settings.')
          } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
            showMediaError('No camera found. Please connect a camera and try again.')
          } else {
            showMediaError(err?.message || 'Could not access camera.')
          }
          return
        }
        const next = true
        setCamOn(next)
        wrappedLocalStreamRef.current = buildCombinedLocalStream(audioStreamRef.current, videoStreamRef.current)
        try {
          await mediaManagerRef.current?.addOrReplaceLocalTracks()
        } catch {}
        try {
          await liveStudyAPI.updateMediaState(sessionId, { camera: next })
        } catch {}
      } else {
        if (videoStreamRef.current) {
          videoStreamRef.current.getTracks().forEach((t) => {
            t.stop()
            videoStreamRef.current?.removeTrack(t)
          })
          videoStreamRef.current = null
        }
        if (videoRef.current) {
          videoRef.current.srcObject = null
        }
        const next = false
        setCamOn(next)
        wrappedLocalStreamRef.current = buildCombinedLocalStream(audioStreamRef.current, null)
        try {
          await mediaManagerRef.current?.addOrReplaceLocalTracks()
        } catch {}
        try {
          await liveStudyAPI.updateMediaState(sessionId, { camera: next })
        } catch {}
      }
    } finally {
      setTogglingCam(false)
    }
  }

  const displayParticipants = useMemo(() => {
    if (participants.length > 0) return participants
    if (!session) return []
    const fallback: Participant[] = []
    if (session.creatorName) {
      fallback.push({
        id: 'creator',
        name: session.creatorName,
        active: true,
      })
    }
    if (user?.firstName || user?.lastName) {
      fallback.push({
        id: meId || 'me',
        name: [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'You',
        active: true,
        mic: micOn,
        camera: camOn,
      })
    }
    return fallback
  }, [participants, session, user, meId, micOn, camOn])

  const participantCount =
    session?.participantCount ?? displayParticipants.length

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 size={30} className="animate-spin text-[#0B5ED7]" />
        <p className="text-sm font-semibold text-slate-500">
          Joining study room…
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-4">
        <div className="w-full max-w-md rounded-3xl bg-white shadow-lg border border-slate-100 p-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100">
            <svg
              className="h-8 w-8 text-rose-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-black text-[#071840] mb-2">
            Couldn't join the session
          </h1>
          <p className="text-sm text-slate-500 mb-6">
            {error}
          </p>
          <button
            onClick={() => navigate('/live-study')}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0B5ED7] px-5 py-2.5 text-sm font-black text-white shadow-[0_10px_24px_-8px_rgba(11,94,215,0.7)] hover:bg-[#094fb8] transition-colors"
          >
            <ArrowLeft size={16} /> Back to Sessions
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative mx-auto max-w-6xl px-4 py-5 sm:px-6">
      <AnimatePresence>
        {mediaErrorToast && (
          <motion.div
            key="media-error"
            initial={{ opacity: 0, x: 30, y: -10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 30, y: -10 }}
            transition={{ duration: 0.3 }}
            className="fixed right-4 top-4 z-50 flex w-80 items-start gap-3 rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-4 shadow-[0_14px_40px_-12px_rgba(244,63,94,0.35)]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10">
              <svg
                className="h-5 w-5 text-rose-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-rose-800">
                Media access error
              </p>
              <p className="mt-0.5 text-xs text-rose-700/80">
                {mediaErrorToast}
              </p>
            </div>
            <button
              onClick={() => setMediaErrorToast(null)}
              className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-lg text-rose-700/60 hover:bg-rose-100 hover:text-rose-700"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}

        {sessionClosed && (
          <motion.div
            key="session-closed"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
          >
            <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-amber-100/50 px-5 py-4 shadow-lg">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
                  <svg
                    className="h-5 w-5 text-amber-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                    />
                  </svg>
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-black text-amber-800">
                    Session ended
                  </h3>
                  <p className="mt-0.5 text-xs text-amber-700/80">
                    This study session has been closed. Redirecting you back…
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {badgeToasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 30, y: -10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 30, y: -10 }}
            transition={{ duration: 0.3 }}
            className="fixed right-4 top-4 z-50 flex w-80 items-start gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-[0_14px_40px_-12px_rgba(16,185,129,0.35)]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-2xl">
              {getBadgeEmoji(t.slug)}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">
                  Badge Unlocked
                </span>
              </div>
              <p className="mt-0.5 font-black text-[#071840] truncate">{t.name}</p>
              <p className="mt-0.5 text-xs text-emerald-800/80">
                مبروك! You earned a new achievement 🎉
              </p>
            </div>
            <button
              onClick={() => setBadgeToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-lg text-emerald-700/60 hover:bg-emerald-100 hover:text-emerald-700"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="mb-5 rounded-3xl border border-blue-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/live-study')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:border-[#0B5ED7]/40 hover:text-[#0B5ED7] transition-colors"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
                </span>
                <span className="text-[11px] font-black uppercase tracking-wider text-rose-600">
                  Live
                </span>
              </span>
              <div className="min-w-0">
                <h1 className="text-lg font-black text-[#071840] truncate">
                  {session?.subject || 'Study Room'}
                  {session?.topic && (
                    <span className="ml-2 text-sm font-semibold text-slate-500">
                      — {session.topic}
                    </span>
                  )}
                </h1>
                <p className="text-[11px] font-semibold text-slate-500">
                  Created by {session?.creatorName || '—'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5">
              <Clock size={13} className="text-[#0B5ED7]" />
              <span className="font-mono text-xs font-black text-[#0B5ED7]">
                {session?.startedAt ? formatTimer(session.startedAt, tick) : '00:00'}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5">
              <Users size={13} className="text-emerald-600" />
              <span className="text-xs font-black text-emerald-700">
                {participantCount}
              </span>
            </span>
            <button
              type="button"
              onClick={handleLeave}
              disabled={leaving || finishing || sessionClosed}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 hover:border-rose-200 hover:text-rose-600 transition-colors disabled:opacity-50"
              title="Leave session"
            >
              {leaving ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
              Leave
            </button>
            {isOwner && (
              <button
                type="button"
                onClick={handleFinish}
                disabled={leaving || finishing || sessionClosed}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 text-xs font-black text-white shadow-[0_10px_24px_-8px_rgba(244,63,94,0.7)] hover:bg-rose-700 transition-colors disabled:opacity-50"
                title="Finish this live study session (host only)"
              >
                {finishing ? <Loader2 size={14} className="animate-spin" /> : <Square size={14} className="fill-current" />}
                Finish Live Session
              </button>
            )}
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-5 overflow-hidden rounded-3xl border border-blue-100 bg-[#071840] shadow-sm"
      >
        <div className="grid auto-rows-fr gap-3 p-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {displayParticipants.map((p) => {
            const isMe = p.id === meId
            const color = (p as any).avatarColor || hashNameColor(p.name)
            const initials = buildInitials(p.name)
            const remoteStream = !isMe ? remoteStreams[p.id] || null : null
            const hasRemoteVideo = !!remoteStream && remoteStream.getVideoTracks().some((t) => t.enabled && t.readyState === 'live')
            const hasVideo =
              isMe ? camOn && !!videoStreamRef.current : (p.camera === true || hasRemoteVideo)
            const showVideo = isMe ? camOn : hasVideo
            const showAvatar = !showVideo

            const attach = (node: HTMLVideoElement | null) => {
              if (isMe) {
                if (node) {
                  node.playsInline = true
                  node.muted = true
                  node.srcObject = videoStreamRef.current || null
                }
                return
              }
              remoteVideoRefs.current[p.id] = node
              if (node) {
                node.playsInline = true
                node.srcObject = remoteStream || null
              }
            }

            return (
              <div
                key={p.id}
                className="relative aspect-video overflow-hidden rounded-2xl bg-[#0A1F56] ring-1 ring-white/10"
              >
                {showVideo ? (
                  <video
                    ref={attach}
                    autoPlay
                    playsInline
                    muted={isMe}
                    className="h-full w-full object-cover"
                  />
                ) : null}
                {showAvatar && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span
                      className="inline-flex h-16 w-16 items-center justify-center rounded-full text-lg font-black text-white ring-2 ring-white/10"
                      style={{ backgroundColor: color }}
                    >
                      {initials || '?'}
                    </span>
                    <p className="mt-2 text-xs font-black text-white/90 truncate max-w-[90%]">
                      {p.name}
                      {isMe && ' (You)'}
                    </p>
                  </div>
                )}

                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-sm max-w-[70%] truncate">
                    {hasVideo ? '📷' : null}{' '}
                    <span className="truncate">
                      {p.name}
                      {isMe ? ' (You)' : ''}
                    </span>
                  </span>
                  <div className="flex items-center gap-1">
                    {p.active ? (
                      <span
                        title="Active"
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white/20"
                      >
                        <span className="block h-2 w-2 rounded-full bg-white" />
                      </span>
                    ) : (
                      <span
                        title="Away"
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-500 ring-2 ring-white/20"
                      />
                    )}
                    {p.mic === true ? (
                      <span
                        title="Mic on"
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/90 text-[10px] text-white ring-2 ring-white/20"
                      >
                        🎤
                      </span>
                    ) : (
                      <span
                        title="Mic off"
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-800/60 text-[10px] text-slate-300 ring-2 ring-white/10"
                      >
                        <span className="relative">🎤<span className="absolute inset-0 flex items-center justify-center text-rose-400 font-black">/</span></span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </motion.div>

      <div className="flex flex-col gap-5 lg:flex-row">
        <motion.section
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full lg:w-80 shrink-0"
        >
          <div className="overflow-hidden rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-[#071840]">
              <Users size={16} className="text-[#0B5ED7]" />
              Participants
            </h2>
            <div className="lg:block hidden">
              <ul className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {displayParticipants.map((p) => {
                  const color = (p as any).avatarColor || hashNameColor(p.name)
                  const initials = buildInitials(p.name)
                  return (
                    <li
                      key={p.id}
                      className="flex items-center gap-3 rounded-2xl border border-slate-50 bg-gradient-to-br from-white to-slate-50 p-2.5"
                    >
                      <div className="relative shrink-0">
                        <span
                          className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl text-xs font-black text-white ring-2 ${
                            p.active ? 'ring-emerald-400/60' : 'ring-slate-300/60'
                          }`}
                          style={{ backgroundColor: color }}
                        >
                          {initials || '?'}
                        </span>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white ${
                            p.active ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-black text-[#071840]">
                          {p.name}
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-1">
                        {p.mic ? (
                          <span
                            title="Mic on"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-sm"
                          >
                            🎤
                          </span>
                        ) : null}
                        {p.camera ? (
                          <span
                            title="Camera on"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sm"
                          >
                            📷
                          </span>
                        ) : null}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
            <div className="lg:hidden">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {displayParticipants.map((p) => {
                  const color = (p as any).avatarColor || hashNameColor(p.name)
                  const initials = buildInitials(p.name)
                  return (
                    <div
                      key={p.id}
                      className="relative shrink-0 text-center"
                      title={p.name}
                    >
                      <span
                        className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl text-sm font-black text-white ring-2 ${
                          p.active ? 'ring-emerald-400/60' : 'ring-slate-300/60'
                        }`}
                        style={{ backgroundColor: color }}
                      >
                        {initials || '?'}
                      </span>
                      <p className="mt-1 line-clamp-1 text-[10px] font-semibold text-slate-600 w-14">
                        {p.name}
                      </p>
                      {(p.mic || p.camera) && (
                        <div className="absolute -top-1 -right-1 flex flex-col gap-0.5">
                          {p.mic && (
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white ring-1 ring-slate-200 text-[10px]">
                              🎤
                            </span>
                          )}
                          {p.camera && (
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white ring-1 ring-slate-200 text-[10px]">
                              📷
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="mt-4 hidden lg:block rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50/60 to-white p-5 shadow-sm">
            <h3 className="flex items-center gap-2 font-black text-[#071840] mb-1.5">
              <Trophy size={15} className="text-amber-600" />
              Stay focused
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Heartbeats are sent every 30s. Keep this tab open to earn minutes
              and unlock badges automatically!
            </p>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="flex-1 flex flex-col min-w-0"
        >
          <div className="flex flex-col overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm min-h-[70vh]">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
              <h2 className="flex items-center gap-2 text-sm font-black text-[#071840]">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#0B5ED7]/10">
                  💬
                </span>
                Chat
              </h2>
              <span className="text-[11px] font-bold text-slate-400">
                {messages.length} messages
              </span>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gradient-to-b from-slate-50/40 to-white">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-center">
                  <span className="text-4xl">💬</span>
                  <h3 className="font-black text-[#071840]">No messages yet</h3>
                  <p className="max-w-xs text-xs text-slate-500">
                    Say hi to your study mates! Ask questions, share insights,
                    and keep each other motivated.
                  </p>
                </div>
              ) : (
                messages.map((m) => {
                  const mine = m.senderId === meId
                  const color = hashNameColor(m.senderName || m.senderId)
                  const initials = buildInitials(m.senderName || m.senderId)
                  return (
                    <motion.div
                      key={m.id || m.createdAt + Math.random()}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`flex gap-2 ${mine ? 'flex-row-reverse' : ''}`}
                    >
                      <span
                        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[10px] font-black text-white`}
                        style={{ backgroundColor: color }}
                      >
                        {initials || '?'}
                      </span>
                      <div
                        className={`max-w-[78%] min-w-0 ${
                          mine ? 'items-end' : 'items-start'
                        } flex flex-col`}
                      >
                        <div
                          className={`flex items-baseline gap-2 mb-1 ${
                            mine ? 'flex-row-reverse' : ''
                          }`}
                        >
                          <span className="text-[11px] font-black text-slate-700 truncate max-w-[150px]">
                            {mine ? 'You' : m.senderName}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400">
                            {formatTime(m.createdAt)}
                          </span>
                        </div>
                        <div
                          className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm ${
                            mine
                              ? 'rounded-tr-md bg-[#0B5ED7] text-white'
                              : 'rounded-tl-md bg-white border border-slate-100 text-[#071840]'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">
                            {m.content}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            <form
              onSubmit={sendMessage}
              className="border-t border-slate-100 bg-white px-4 py-3"
            >
              <div className="flex items-end gap-2">
                <div className="flex-1 min-w-0 relative">
                  <textarea
                    value={messageInput}
                    onChange={(e) =>
                      setMessageInput(e.target.value.slice(0, 1000))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        void sendMessage()
                      }
                    }}
                    rows={1}
                    placeholder="Type a message… (Enter to send)"
                    className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 caret-[#0B5ED7] outline-none transition-all focus:border-[#0B5ED7] focus:bg-white focus:ring-2 focus:ring-[#0B5ED7]/15 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-white/10"
                    style={{ maxHeight: '120px' }}
                  />
                  <span className="pointer-events-none absolute bottom-2 right-3 text-[10px] font-bold text-slate-400">
                    {messageInput.length}/1000
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={sendingMsg || !messageInput.trim()}
                  className="shrink-0 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0B5ED7] text-white shadow-[0_10px_24px_-8px_rgba(11,94,215,0.7)] transition-all hover:bg-[#094fb8] disabled:opacity-50"
                >
                  {sendingMsg ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="fixed bottom-4 right-4 z-30 flex flex-col items-end gap-2 lg:static lg:mt-4 lg:flex-row">
            {camOn && (
              <div className="relative w-52 overflow-hidden rounded-2xl border-2 border-[#0B5ED7]/60 bg-black shadow-[0_14px_40px_-10px_rgba(11,94,215,0.5)]">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="block h-full w-full object-cover aspect-video"
                />
                <div className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                  📷 You
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleMic}
                disabled={togglingMic}
                className={`inline-flex h-12 items-center gap-2 rounded-2xl px-4 text-sm font-black shadow-sm transition-all disabled:opacity-60 ${
                  micOn
                    ? 'bg-emerald-600 text-white shadow-emerald-600/30 hover:bg-emerald-700'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
                title={micOn ? 'Turn mic off' : 'Turn mic on'}
              >
                {togglingMic ? <Loader2 size={16} className="animate-spin" /> : <span className="text-base">🎤</span>}
                <span className="hidden sm:inline">Mic</span>
              </button>
              <button
                type="button"
                onClick={toggleCam}
                disabled={togglingCam}
                className={`inline-flex h-12 items-center gap-2 rounded-2xl px-4 text-sm font-black shadow-sm transition-all disabled:opacity-60 ${
                  camOn
                    ? 'bg-sky-600 text-white shadow-sky-600/30 hover:bg-sky-700'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
                title={camOn ? 'Turn camera off' : 'Turn camera on'}
              >
                {togglingCam ? <Loader2 size={16} className="animate-spin" /> : <span className="text-base">📷</span>}
                <span className="hidden sm:inline">Camera</span>
              </button>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  )
}

export default StudyRoom
