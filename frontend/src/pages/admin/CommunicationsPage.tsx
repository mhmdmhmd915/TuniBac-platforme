import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  Archive,
  BellRing,
  CalendarClock,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  ImageIcon,
  Link2,
  Megaphone,
  Plus,
  Search,
  Send,
  Trash2,
  Users,
  Video,
  X,
} from 'lucide-react'
import { adminAPI } from '../../services/api'
import { sanitizeRichHtml } from '../../lib/sanitizeHtml'
import {
  BAC_SECTION_LABELS,
  BAC_SECTION_OPTIONS,
  DEFAULT_BAC_SECTION,
  type BacSection,
} from '../../constants/bacSections'
import {
  formatRemainingTime,
  formatUploadSpeed,
  type MultipartVideoUploadState,
} from '../../lib/uploads/multipartVideo'

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

type CommunicationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
type CommunicationStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
type LifecycleStatus = CommunicationStatus | 'SCHEDULED' | 'EXPIRED'
type CommunicationAudience = 'ALL_STUDENTS'
type AttachmentKind =
  | 'IMAGE'
  | 'PDF'
  | 'VIDEO'
  | 'WEBSITE'
  | 'COURSE'
  | 'EXERCISE'
  | 'BOOK'
  | 'HOMEWORK'
  | 'OTHER'

interface Attachment {
  id?: string
  kind: AttachmentKind | string
  label?: string | null
  filePath?: string | null
  url?: string | null
  mimeType?: string | null
  sizeBytes?: number | null
}

interface CommunicationItem {
  id: string
  bacSection: BacSection
  type: CommunicationType
  priority: CommunicationPriority
  status: CommunicationStatus
  lifecycleStatus: LifecycleStatus
  isVisible: boolean
  audience: CommunicationAudience
  title: string
  description?: string | null
  contentHtml: string
  externalLink?: string | null
  meetingLink?: string | null
  buttonText?: string | null
  buttonUrl?: string | null
  publishAt?: string | null
  expireAt?: string | null
  createdAt: string
  updatedAt: string
  excerpt: string
  attachments: Attachment[]
  isNew?: boolean
}

interface FormState {
  id?: string
  type: CommunicationType
  priority: CommunicationPriority
  status: CommunicationStatus
  isVisible: boolean
  audience: CommunicationAudience
  title: string
  description: string
  contentHtml: string
  externalLink: string
  meetingLink: string
  buttonText: string
  buttonUrl: string
  publishAt: string
  expireAt: string
  attachments: Attachment[]
}

const BACKEND_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '')
const ADMIN_SECTION_STORAGE_KEY = 'adminWorkspaceBacSection'

const TYPE_META: Record<
  CommunicationType,
  { label: string; icon: typeof Megaphone; color: string; bg: string }
> = {
  GENERAL_INFORMATION: { label: 'General Information', icon: Megaphone, color: 'text-sky-300', bg: 'bg-sky-500/15' },
  EXAM_ANNOUNCEMENT: { label: 'Exam Announcement', icon: AlertTriangle, color: 'text-rose-300', bg: 'bg-rose-500/15' },
  HOMEWORK: { label: 'Homework', icon: FileText, color: 'text-amber-300', bg: 'bg-amber-500/15' },
  COURSE_REMINDER: { label: 'Course Reminder', icon: BellRing, color: 'text-cyan-300', bg: 'bg-cyan-500/15' },
  ONLINE_COURSE: { label: 'Online Course', icon: Video, color: 'text-indigo-300', bg: 'bg-indigo-500/15' },
  MEETING: { label: 'Meeting', icon: CalendarClock, color: 'text-emerald-300', bg: 'bg-emerald-500/15' },
  COMPETITION: { label: 'Competition', icon: Megaphone, color: 'text-fuchsia-300', bg: 'bg-fuchsia-500/15' },
  NEW_COURSE: { label: 'New Course', icon: Video, color: 'text-violet-300', bg: 'bg-violet-500/15' },
  PLATFORM_UPDATE: { label: 'Platform Update', icon: BellRing, color: 'text-blue-300', bg: 'bg-blue-500/15' },
  URGENT: { label: 'Urgent', icon: AlertTriangle, color: 'text-red-300', bg: 'bg-red-500/15' },
  HOLIDAY: { label: 'Holiday', icon: Megaphone, color: 'text-pink-300', bg: 'bg-pink-500/15' },
  MAINTENANCE: { label: 'Maintenance', icon: AlertTriangle, color: 'text-orange-300', bg: 'bg-orange-500/15' },
  OTHER: { label: 'Other', icon: Megaphone, color: 'text-slate-300', bg: 'bg-slate-500/15' },
}

const TYPE_OPTIONS = Object.entries(TYPE_META).map(([value, meta]) => ({
  value: value as CommunicationType,
  label: meta.label,
}))

const PRIORITY_OPTIONS: Array<{ value: CommunicationPriority; label: string }> = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'ARCHIVED', label: 'Archived' },
]

const ATTACHMENT_KIND_OPTIONS: Array<{ value: AttachmentKind; label: string }> = [
  { value: 'WEBSITE', label: 'Website' },
  { value: 'COURSE', label: 'Course' },
  { value: 'EXERCISE', label: 'Exercise' },
  { value: 'BOOK', label: 'Book' },
  { value: 'HOMEWORK', label: 'Homework' },
  { value: 'OTHER', label: 'Other' },
]

const defaultForm = (): FormState => ({
  type: 'GENERAL_INFORMATION',
  priority: 'MEDIUM',
  status: 'DRAFT',
  isVisible: true,
  audience: 'ALL_STUDENTS',
  title: '',
  description: '',
  contentHtml: '<p></p>',
  externalLink: '',
  meetingLink: '',
  buttonText: '',
  buttonUrl: '',
  publishAt: '',
  expireAt: '',
  attachments: [],
})

const toFormState = (item: CommunicationItem): FormState => ({
  id: item.id,
  type: item.type,
  priority: item.priority,
  status: item.status,
  isVisible: item.isVisible,
  audience: item.audience,
  title: item.title,
  description: item.description || '',
  contentHtml: item.contentHtml,
  externalLink: item.externalLink || '',
  meetingLink: item.meetingLink || '',
  buttonText: item.buttonText || '',
  buttonUrl: item.buttonUrl || '',
  publishAt: toLocalDateTimeInput(item.publishAt),
  expireAt: toLocalDateTimeInput(item.expireAt),
  attachments: item.attachments || [],
})

const getErrorMessage = (error: unknown) => {
  if (typeof error === 'object' && error && 'response' in error) {
    const candidate = error as any
    return candidate?.response?.data?.message || candidate?.message || 'Something went wrong'
  }

  return 'Something went wrong'
}

const toAssetUrl = (value?: string | null) => {
  if (!value) {
    return ''
  }

  if (value.startsWith('http')) {
    return value
  }

  return `${BACKEND_URL}/${value.replace(/^\/+/, '')}`
}

const toStoredAssetValue = (value?: string | null) => {
  if (!value) {
    return ''
  }

  if (value.startsWith(BACKEND_URL)) {
    const normalized = value.slice(BACKEND_URL.length)
    return normalized.startsWith('/') ? normalized : `/${normalized}`
  }

  return value
}

const toLocalDateTimeInput = (value?: string | null) => {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const offset = date.getTimezoneOffset()
  const normalized = new Date(date.getTime() - offset * 60_000)
  return normalized.toISOString().slice(0, 16)
}

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return 'Not scheduled'
  }

  return new Date(value).toLocaleString()
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

const getStatusTone = (status: LifecycleStatus) => {
  if (status === 'PUBLISHED') {
    return 'bg-emerald-500/15 text-emerald-300'
  }

  if (status === 'SCHEDULED') {
    return 'bg-sky-500/15 text-sky-300'
  }

  if (status === 'ARCHIVED' || status === 'EXPIRED') {
    return 'bg-slate-500/15 text-slate-300'
  }

  return 'bg-amber-500/15 text-amber-300'
}

const getPriorityTone = (priority: CommunicationPriority) => {
  if (priority === 'URGENT') {
    return 'bg-red-500/15 text-red-300'
  }

  if (priority === 'HIGH') {
    return 'bg-orange-500/15 text-orange-300'
  }

  if (priority === 'MEDIUM') {
    return 'bg-sky-500/15 text-sky-300'
  }

  return 'bg-slate-500/15 text-slate-300'
}

const CommunicationsPage = () => {
  const [currentBacSection, setCurrentBacSection] = useState<BacSection>(() => {
    const stored = localStorage.getItem(ADMIN_SECTION_STORAGE_KEY)
    if (stored && BAC_SECTION_OPTIONS.some((option) => option.value === stored)) {
      return stored as BacSection
    }

    return DEFAULT_BAC_SECTION
  })
  const [items, setItems] = useState<CommunicationItem[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<'IMAGE' | 'PDF' | 'VIDEO' | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [visibilityFilter, setVisibilityFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [videoUploadState, setVideoUploadState] = useState<MultipartVideoUploadState | null>(null)
  const [form, setForm] = useState<FormState>(defaultForm())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const editorRef = useRef<HTMLTextAreaElement | null>(null)
  const videoUploadAbortRef = useRef<AbortController | null>(null)

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) || null,
    [items, selectedId]
  )

  const mediaAttachments = useMemo(
    () => ({
      IMAGE: form.attachments.find((attachment) => attachment.kind === 'IMAGE') || null,
      PDF: form.attachments.find((attachment) => attachment.kind === 'PDF') || null,
      VIDEO: form.attachments.find((attachment) => attachment.kind === 'VIDEO') || null,
    }),
    [form.attachments]
  )

  const linkAttachments = useMemo(
    () =>
      form.attachments.filter(
        (attachment) => !['IMAGE', 'PDF', 'VIDEO'].includes(String(attachment.kind))
      ),
    [form.attachments]
  )

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchCommunications()
    }, 180)

    return () => window.clearTimeout(timer)
  }, [currentBacSection, search, typeFilter, priorityFilter, statusFilter, visibilityFilter, fromDate, toDate, page])

  useEffect(() => {
    localStorage.setItem(ADMIN_SECTION_STORAGE_KEY, currentBacSection)
  }, [currentBacSection])

  useEffect(() => {
    setPage(1)
    setSelectedId(null)
    setForm(defaultForm())
  }, [currentBacSection])

  useEffect(() => {
    if (!message) {
      return undefined
    }

    const timer = window.setTimeout(() => setMessage(null), 3500)
    return () => window.clearTimeout(timer)
  }, [message])

  useEffect(() => {
    if (!selectedItem) {
      return
    }

    // Keep the editor aligned with the persisted API record after fetch/save.
    if (form.id !== selectedItem.id) {
      setForm(toFormState(selectedItem))
    }
  }, [selectedItem, form.id])

  const fetchCommunications = async () => {
    setLoading(true)

    try {
      const response = await adminAPI.getCommunications({
        bacSection: currentBacSection,
        search: search.trim() || undefined,
        type: typeFilter || undefined,
        priority: priorityFilter || undefined,
        status: statusFilter || undefined,
        visibility: visibilityFilter || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        sortBy: 'updatedAt',
        sortDirection: 'desc',
        page,
        pageSize,
      })

      const nextItems = response.data.items || []
      setItems(nextItems)
      setTotal(Number(response.data.total || 0))

      if (!selectedId && nextItems.length) {
        setSelectedId(nextItems[0].id)
      }

      if (selectedId && !nextItems.some((item: CommunicationItem) => item.id === selectedId)) {
        setSelectedId(nextItems[0]?.id || null)
      }
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) })
    } finally {
      setLoading(false)
    }
  }

  const beginCreate = () => {
    setSelectedId(null)
    setForm(defaultForm())
  }

  const beginEdit = (item: CommunicationItem) => {
    setSelectedId(item.id)
    setForm(toFormState(item))
  }

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const replaceAttachment = (nextAttachment: Attachment) => {
    setForm((current) => ({
      ...current,
      attachments: [
        ...current.attachments.filter((attachment) => attachment.kind !== nextAttachment.kind),
        {
          ...nextAttachment,
          filePath: toStoredAssetValue(nextAttachment.filePath),
        },
      ],
    }))
  }

  const removeAttachmentKind = (kind: 'IMAGE' | 'PDF' | 'VIDEO') => {
    setForm((current) => ({
      ...current,
      attachments: current.attachments.filter((attachment) => attachment.kind !== kind),
    }))
  }

  const addLinkAttachment = () => {
    setForm((current) => ({
      ...current,
      attachments: [
        ...current.attachments,
        {
          kind: 'WEBSITE',
          label: '',
          url: '',
        },
      ],
    }))
  }

  const updateLinkAttachment = (index: number, patch: Partial<Attachment>) => {
    const targetIndexes = form.attachments
      .map((attachment, originalIndex) =>
        ['IMAGE', 'PDF', 'VIDEO'].includes(String(attachment.kind)) ? null : originalIndex
      )
      .filter((value): value is number => value !== null)

    const originalIndex = targetIndexes[index]
    if (originalIndex === undefined) {
      return
    }

    setForm((current) => ({
      ...current,
      attachments: current.attachments.map((attachment, itemIndex) =>
        itemIndex === originalIndex ? { ...attachment, ...patch } : attachment
      ),
    }))
  }

  const removeLinkAttachment = (index: number) => {
    const targetIndexes = form.attachments
      .map((attachment, originalIndex) =>
        ['IMAGE', 'PDF', 'VIDEO'].includes(String(attachment.kind)) ? null : originalIndex
      )
      .filter((value): value is number => value !== null)

    const originalIndex = targetIndexes[index]
    if (originalIndex === undefined) {
      return
    }

    setForm((current) => ({
      ...current,
      attachments: current.attachments.filter((_, itemIndex) => itemIndex !== originalIndex),
    }))
  }

  const uploadMedia = async (kind: 'IMAGE' | 'PDF' | 'VIDEO', file: File) => {
    setUploading(kind)

    try {
      const response =
        kind === 'IMAGE'
          ? await adminAPI.uploadCommunicationImage(file)
          : kind === 'PDF'
          ? await adminAPI.uploadCommunicationPdf(file)
          : await adminAPI.uploadCommunicationVideo(file, {
              signal: (() => {
                videoUploadAbortRef.current?.abort()
                const controller = new AbortController()
                videoUploadAbortRef.current = controller
                return controller.signal
              })(),
              onProgress: (state) => {
                setVideoUploadState(state)
              },
            })

      replaceAttachment(response.data.attachment)
      if (kind === 'VIDEO') {
        setVideoUploadState(null)
      }
      setMessage({ type: 'success', text: `${kind} uploaded successfully` })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setMessage({ type: 'success', text: 'Video upload cancelled' })
      } else {
        setMessage({ type: 'error', text: getErrorMessage(error) })
      }
    } finally {
      setUploading(null)
      videoUploadAbortRef.current = null
    }
  }

  const insertMarkup = (before: string, after = '') => {
    const textarea = editorRef.current
    const source = form.contentHtml

    if (!textarea) {
      updateForm('contentHtml', `${source}${before}${after}`)
      return
    }

    const start = textarea.selectionStart || 0
    const end = textarea.selectionEnd || 0
    const selected = source.slice(start, end) || 'text'
    const nextValue = `${source.slice(0, start)}${before}${selected}${after}${source.slice(end)}`

    updateForm('contentHtml', nextValue)

    window.requestAnimationFrame(() => {
      textarea.focus()
      const cursor = start + before.length + selected.length + after.length
      textarea.setSelectionRange(cursor, cursor)
    })
  }

  const buildPayload = (overrideStatus?: CommunicationStatus, publishNow = false) => {
    const effectiveStatus: CommunicationStatus =
      overrideStatus === 'PUBLISHED' || overrideStatus === 'DRAFT' || overrideStatus === 'ARCHIVED'
        ? overrideStatus
        : form.status === 'PUBLISHED' || form.status === 'DRAFT' || form.status === 'ARCHIVED'
        ? form.status
        : 'DRAFT';

    return {
      ...form,
      bacSection: currentBacSection,
      status: effectiveStatus,
      publishAt: publishNow ? new Date().toISOString() : form.publishAt || null,
      expireAt: form.expireAt || null,
      attachments: form.attachments
        .map((attachment) => ({
          kind: attachment.kind,
          label: attachment.label || '',
          url: attachment.url || '',
          filePath: toStoredAssetValue(attachment.filePath),
          mimeType: attachment.mimeType || '',
          sizeBytes: attachment.sizeBytes || null,
        }))
        .filter((attachment) => attachment.filePath || attachment.url),
    };
  }

  const saveCommunication = async (mode: 'draft' | 'publish' | 'schedule') => {
    setSaving(true)

    try {
      let communicationId = form.id || null
      let latestItem: CommunicationItem | null = null
      const payload =
        mode === 'publish'
          ? buildPayload('PUBLISHED', true)
          : mode === 'schedule'
          ? buildPayload('PUBLISHED')
          : buildPayload('DRAFT')

      if (mode === 'schedule' && !payload.publishAt) {
        setMessage({ type: 'error', text: 'Choose a publish date before scheduling' })
        setSaving(false)
        return
      }

      if (form.id) {
        const updateResponse = await adminAPI.updateCommunication(form.id, payload)
        latestItem = updateResponse.data?.item || latestItem
        if (mode === 'publish') {
          const publishResponse = await adminAPI.publishCommunication(form.id)
          latestItem = publishResponse.data?.item || latestItem
        }
        if (mode === 'schedule' && payload.publishAt) {
          const scheduleResponse = await adminAPI.scheduleCommunication(form.id, {
            publishAt: payload.publishAt,
            expireAt: payload.expireAt,
          })
          latestItem = scheduleResponse.data?.item || latestItem
        }
      } else {
        const response = await adminAPI.createCommunication(payload)
        latestItem = response.data?.item || latestItem
        if (response.data?.item?.id) {
          communicationId = response.data.item.id
          setSelectedId(response.data.item.id)
        }

        if (communicationId && mode === 'publish') {
          const publishResponse = await adminAPI.publishCommunication(communicationId)
          latestItem = publishResponse.data?.item || latestItem
        }

        if (communicationId && mode === 'schedule' && payload.publishAt) {
          const scheduleResponse = await adminAPI.scheduleCommunication(communicationId, {
            publishAt: payload.publishAt,
            expireAt: payload.expireAt,
          })
          latestItem = scheduleResponse.data?.item || latestItem
        }
      }

      if (latestItem?.id) {
        setSelectedId(latestItem.id)
        setForm(toFormState(latestItem))
      }

      setMessage({
        type: 'success',
        text:
          mode === 'publish'
            ? 'Communication published'
            : mode === 'schedule'
            ? 'Communication scheduled'
            : 'Communication saved as draft',
      })
      await fetchCommunications()
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this communication permanently?')) {
      return
    }

    try {
      await adminAPI.deleteCommunication(id)
      setMessage({ type: 'success', text: 'Communication deleted' })

      if (form.id === id) {
        beginCreate()
      }

      await fetchCommunications()
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) })
    }
  }

  const handleDuplicate = async (id: string) => {
    try {
      await adminAPI.duplicateCommunication(id)
      setMessage({ type: 'success', text: 'Communication duplicated' })
      await fetchCommunications()
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) })
    }
  }

  const handlePublish = async (id: string) => {
    try {
      await adminAPI.publishCommunication(id)
      setMessage({ type: 'success', text: 'Communication published' })
      await fetchCommunications()
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) })
    }
  }

  const handleArchive = async (id: string) => {
    try {
      await adminAPI.archiveCommunication(id)
      setMessage({ type: 'success', text: 'Communication archived' })
      await fetchCommunications()
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) })
    }
  }

  const toggleVisibility = async (id: string, isVisible: boolean) => {
    try {
      await adminAPI.setCommunicationVisibility(id, !isVisible)
      setMessage({
        type: 'success',
        text: !isVisible ? 'Communication is now visible' : 'Communication hidden',
      })
      await fetchCommunications()
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) })
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="min-h-screen bg-[#071022] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-[28px] border border-white/10 bg-gradient-to-br from-[#101d3a] via-[#0c1730] to-[#091326] p-6 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-200">
                <Megaphone size={14} />
                Communication Hub
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Communication Center</h1>
                <p className="mt-2 max-w-3xl text-sm text-slate-300 sm:text-base">
                  Create, schedule, publish, duplicate, hide, archive, and manage every student announcement from one premium control room.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <label className="min-w-[240px] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left">
                <div className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">Current Bac Section</div>
                <select
                  value={currentBacSection}
                  onChange={(event) => setCurrentBacSection(event.target.value as BacSection)}
                  className="w-full bg-transparent text-sm font-semibold text-slate-100 outline-none"
                >
                  {BAC_SECTION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-slate-900">
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-sky-400/40 hover:bg-sky-400/10"
              >
                <ExternalLink size={16} />
                Preview Student Dashboard
              </Link>
              <button
                type="button"
                onClick={beginCreate}
                className="inline-flex items-center gap-2 rounded-2xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
              >
                <Plus size={18} />
                New Communication
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Section</div>
              <div className="mt-3 text-lg font-bold">{BAC_SECTION_LABELS[currentBacSection]}</div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Total</div>
              <div className="mt-3 text-3xl font-bold">{total}</div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Published</div>
              <div className="mt-3 text-3xl font-bold">{items.filter((item) => item.lifecycleStatus === 'PUBLISHED').length}</div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Scheduled</div>
              <div className="mt-3 text-3xl font-bold">{items.filter((item) => item.lifecycleStatus === 'SCHEDULED').length}</div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Urgent</div>
              <div className="mt-3 text-3xl font-bold">{items.filter((item) => item.priority === 'URGENT').length}</div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Visible</div>
              <div className="mt-3 text-3xl font-bold">{items.filter((item) => item.isVisible).length}</div>
            </div>
          </div>
        </section>

        {message && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              message.type === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                : 'border-red-500/30 bg-red-500/10 text-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="grid gap-8 xl:grid-cols-[1.15fr_0.95fr]">
          <section className="space-y-5">
            <div className="rounded-[28px] border border-white/10 bg-[#0c1730] p-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="col-span-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                    <Search size={14} />
                    Search
                  </div>
                  <input
                    value={search}
                    onChange={(event) => {
                      setPage(1)
                      setSearch(event.target.value)
                    }}
                    placeholder="Search by title or content"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
                  />
                </label>

                <label className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">Type</div>
                  <select
                    value={typeFilter}
                    onChange={(event) => {
                      setPage(1)
                      setTypeFilter(event.target.value)
                    }}
                    className="w-full bg-transparent text-sm outline-none"
                  >
                    <option value="">All types</option>
                    {TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value} className="bg-slate-900">
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">Priority</div>
                  <select
                    value={priorityFilter}
                    onChange={(event) => {
                      setPage(1)
                      setPriorityFilter(event.target.value)
                    }}
                    className="w-full bg-transparent text-sm outline-none"
                  >
                    <option value="">All priorities</option>
                    {PRIORITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value} className="bg-slate-900">
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">Status</div>
                  <select
                    value={statusFilter}
                    onChange={(event) => {
                      setPage(1)
                      setStatusFilter(event.target.value)
                    }}
                    className="w-full bg-transparent text-sm outline-none"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value || 'all'} value={option.value} className="bg-slate-900">
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">Visibility</div>
                  <select
                    value={visibilityFilter}
                    onChange={(event) => {
                      setPage(1)
                      setVisibilityFilter(event.target.value)
                    }}
                    className="w-full bg-transparent text-sm outline-none"
                  >
                    <option value="">All visibility</option>
                    <option value="visible" className="bg-slate-900">Visible</option>
                    <option value="hidden" className="bg-slate-900">Hidden</option>
                  </select>
                </label>

                <label className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">From date</div>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(event) => {
                      setPage(1)
                      setFromDate(event.target.value)
                    }}
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </label>

                <label className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">To date</div>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(event) => {
                      setPage(1)
                      setToDate(event.target.value)
                    }}
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </label>
              </div>
            </div>

            <div className="space-y-4">
              {loading ? (
                <div className="rounded-[28px] border border-white/10 bg-[#0c1730] p-8 text-center text-slate-400">
                  Loading communications...
                </div>
              ) : items.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-white/15 bg-[#0c1730] p-10 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-sky-400/10 text-sky-300">
                    <Megaphone size={28} />
                  </div>
                  <h2 className="mt-5 text-xl font-semibold">No communications found</h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Start by creating your first announcement for {BAC_SECTION_LABELS[currentBacSection]}.
                  </p>
                  <button
                    type="button"
                    onClick={beginCreate}
                    className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950"
                  >
                    <Plus size={18} />
                    Create Communication
                  </button>
                </div>
              ) : (
                items.map((item) => {
                  const typeMeta = TYPE_META[item.type]
                  const TypeIcon = typeMeta.icon
                  return (
                    <motion.article
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`rounded-[28px] border p-5 transition ${
                        selectedId === item.id
                          ? 'border-sky-400/40 bg-sky-400/10'
                          : 'border-white/10 bg-[#0c1730] hover:border-white/20 hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <button
                          type="button"
                          onClick={() => beginEdit(item)}
                          className="flex-1 text-left"
                        >
                          <div className="flex flex-wrap items-center gap-3">
                            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${typeMeta.bg} ${typeMeta.color}`}>
                              <TypeIcon size={14} />
                              {typeMeta.label}
                            </span>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getPriorityTone(item.priority)}`}>
                              {item.priority}
                            </span>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusTone(item.lifecycleStatus)}`}>
                              {item.lifecycleStatus}
                            </span>
                            {item.isVisible ? (
                              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                                Visible
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-500/15 px-3 py-1 text-xs font-semibold text-slate-300">
                                Hidden
                              </span>
                            )}
                          </div>

                          <h2 className="mt-4 text-2xl font-bold tracking-tight">{item.title}</h2>
                          <p className="mt-2 line-clamp-2 text-sm text-slate-300">{item.description || item.excerpt}</p>

                          <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-400">
                            <span>Publish: {formatDateTime(item.publishAt)}</span>
                            <span>Expire: {formatDateTime(item.expireAt)}</span>
                            <span>{item.attachments.length} attachment(s)</span>
                          </div>
                        </button>

                        <div className="flex flex-wrap gap-2 lg:max-w-[270px] lg:justify-end">
                          <button
                            type="button"
                            onClick={() => beginEdit(item)}
                            className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold transition hover:border-sky-400/40 hover:bg-sky-400/10"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicate(item.id)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold transition hover:border-white/20"
                          >
                            <Copy size={14} />
                            Duplicate
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleVisibility(item.id, item.isVisible)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold transition hover:border-white/20"
                          >
                            {item.isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                            {item.isVisible ? 'Hide' : 'Show'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePublish(item.id)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200 transition hover:border-emerald-400/40"
                          >
                            <Send size={14} />
                            Publish
                          </button>
                          <button
                            type="button"
                            onClick={() => handleArchive(item.id)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200 transition hover:border-amber-400/40"
                          >
                            <Archive size={14} />
                            Archive
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 transition hover:border-red-400/40"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      </div>
                    </motion.article>
                  )
                })
              )}
            </div>

            <div className="flex items-center justify-between rounded-3xl border border-white/10 bg-[#0c1730] px-5 py-4 text-sm text-slate-300">
              <div>
                Page {page} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="rounded-2xl border border-white/10 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  className="rounded-2xl border border-white/10 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-[30px] border border-white/10 bg-[#0c1730] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    {form.id ? 'Edit Communication' : 'New Communication'}
                  </div>
                  <h2 className="mt-2 text-2xl font-bold">
                    {form.id ? 'Update platform message' : 'Create a new announcement'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={beginCreate}
                  className="rounded-2xl border border-white/10 p-2 text-slate-300 transition hover:border-white/20 hover:bg-white/5"
                  aria-label="Reset editor"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="rounded-2xl border border-sky-400/20 bg-sky-400/10 px-4 py-3">
                    <div className="mb-2 text-xs uppercase tracking-[0.18em] text-sky-200">Bac Section</div>
                    <div className="text-sm font-semibold text-slate-100">
                      {BAC_SECTION_LABELS[currentBacSection]}
                    </div>
                  </label>
                  <label className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">Announcement type</div>
                    <select
                      value={form.type}
                      onChange={(event) => updateForm('type', event.target.value as CommunicationType)}
                      className="w-full bg-transparent text-sm outline-none"
                    >
                      {TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value} className="bg-slate-900">
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">Priority</div>
                    <select
                      value={form.priority}
                      onChange={(event) => updateForm('priority', event.target.value as CommunicationPriority)}
                      className="w-full bg-transparent text-sm outline-none"
                    >
                      {PRIORITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value} className="bg-slate-900">
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">Target audience</div>
                    <div className="flex items-center gap-2 text-sm">
                      <Users size={16} className="text-sky-300" />
                      All Students
                    </div>
                  </label>

                  <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Visibility</div>
                      <div className="mt-1 text-sm">{form.isVisible ? 'Visible on dashboard' : 'Hidden from students'}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateForm('isVisible', !form.isVisible)}
                      className={`rounded-full px-4 py-2 text-xs font-semibold ${
                        form.isVisible ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/15 text-slate-300'
                      }`}
                    >
                      {form.isVisible ? 'Visible' : 'Hidden'}
                    </button>
                  </label>
                </div>

                <label className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">Title</div>
                  <input
                    value={form.title}
                    onChange={(event) => updateForm('title', event.target.value)}
                    placeholder="Online Physics Course Tonight"
                    className="w-full bg-transparent text-base outline-none placeholder:text-slate-500"
                  />
                </label>

                <label className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">Short description</div>
                  <textarea
                    value={form.description}
                    onChange={(event) => updateForm('description', event.target.value)}
                    rows={3}
                    placeholder="Short description shown in the card and carousel"
                    className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-slate-500"
                  />
                </label>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => insertMarkup('<strong>', '</strong>')} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold">Bold</button>
                    <button type="button" onClick={() => insertMarkup('<em>', '</em>')} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold">Italic</button>
                    <button type="button" onClick={() => insertMarkup('<h3>', '</h3>')} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold">Heading</button>
                    <button type="button" onClick={() => insertMarkup('<p>', '</p>')} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold">Paragraph</button>
                    <button type="button" onClick={() => insertMarkup('<ul><li>', '</li></ul>')} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold">List</button>
                    <button type="button" onClick={() => insertMarkup('<a href="https://">', '</a>')} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold">Link</button>
                  </div>
                  <div className="mt-4 grid gap-4">
                    <label>
                      <div className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">Rich text content</div>
                      <textarea
                        ref={editorRef}
                        value={form.contentHtml}
                        onChange={(event) => updateForm('contentHtml', event.target.value)}
                        rows={10}
                        className="w-full rounded-2xl border border-white/10 bg-[#08101f] px-4 py-3 text-sm outline-none"
                      />
                    </label>
                    <div className="rounded-2xl border border-white/10 bg-[#08101f] p-4">
                      <div className="mb-3 text-xs uppercase tracking-[0.18em] text-slate-400">Live preview</div>
                      <div
                        className="prose prose-invert max-w-none text-sm"
                        dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(form.contentHtml || '<p></p>') }}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">Publish date</div>
                    <input
                      type="datetime-local"
                      value={form.publishAt}
                      onChange={(event) => updateForm('publishAt', event.target.value)}
                      className="w-full bg-transparent text-sm outline-none"
                    />
                  </label>

                  <label className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">Expiration date</div>
                    <input
                      type="datetime-local"
                      value={form.expireAt}
                      onChange={(event) => updateForm('expireAt', event.target.value)}
                      className="w-full bg-transparent text-sm outline-none"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">Meeting link</div>
                    <input
                      value={form.meetingLink}
                      onChange={(event) => updateForm('meetingLink', event.target.value)}
                      placeholder="https://meet.google.com/..."
                      className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
                    />
                  </label>

                  <label className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">External link</div>
                    <input
                      value={form.externalLink}
                      onChange={(event) => updateForm('externalLink', event.target.value)}
                      placeholder="https://example.com"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">Button text</div>
                    <input
                      value={form.buttonText}
                      onChange={(event) => updateForm('buttonText', event.target.value)}
                      placeholder="Join Meeting"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
                    />
                  </label>

                  <label className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">Button URL</div>
                    <input
                      value={form.buttonUrl}
                      onChange={(event) => updateForm('buttonUrl', event.target.value)}
                      placeholder="https://..."
                      className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
                    />
                  </label>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">Featured media attachments</h3>
                      <p className="mt-1 text-xs text-slate-400">Optional image, PDF, and video directly available on the dashboard.</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4">
                    <label className="rounded-2xl border border-dashed border-white/15 bg-[#08101f] p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-2xl bg-sky-500/10 p-3 text-sky-300">
                            <ImageIcon size={18} />
                          </div>
                          <div>
                            <div className="font-semibold">Image</div>
                            <div className="text-xs text-slate-400">
                              {mediaAttachments.IMAGE?.label || 'Upload an optional cover image'}
                            </div>
                          </div>
                        </div>
                        {mediaAttachments.IMAGE && (
                          <button type="button" onClick={() => removeAttachmentKind('IMAGE')} className="text-xs text-red-300">
                            Remove
                          </button>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => {
                          const file = event.target.files?.[0]
                          if (file) {
                            uploadMedia('IMAGE', file)
                          }
                        }}
                        className="mt-4 block w-full text-xs text-slate-400"
                      />
                    </label>

                    <label className="rounded-2xl border border-dashed border-white/15 bg-[#08101f] p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-300">
                            <FileText size={18} />
                          </div>
                          <div>
                            <div className="font-semibold">PDF</div>
                            <div className="text-xs text-slate-400">
                              {mediaAttachments.PDF?.label || 'Upload homework, book, or notice PDF'}
                            </div>
                          </div>
                        </div>
                        {mediaAttachments.PDF && (
                          <button type="button" onClick={() => removeAttachmentKind('PDF')} className="text-xs text-red-300">
                            Remove
                          </button>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(event) => {
                          const file = event.target.files?.[0]
                          if (file) {
                            uploadMedia('PDF', file)
                          }
                        }}
                        className="mt-4 block w-full text-xs text-slate-400"
                      />
                    </label>

                    <label className="rounded-2xl border border-dashed border-white/15 bg-[#08101f] p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-2xl bg-violet-500/10 p-3 text-violet-300">
                            <Video size={18} />
                          </div>
                          <div>
                            <div className="font-semibold">Video</div>
                            <div className="text-xs text-slate-400">
                              {mediaAttachments.VIDEO?.label || 'Upload a recorded lesson or promo video'}
                            </div>
                          </div>
                        </div>
                        {mediaAttachments.VIDEO && (
                          <button type="button" onClick={() => removeAttachmentKind('VIDEO')} className="text-xs text-red-300">
                            Remove
                          </button>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(event) => {
                          const file = event.target.files?.[0]
                          if (file) {
                            uploadMedia('VIDEO', file)
                          }
                        }}
                        className="mt-4 block w-full text-xs text-slate-400"
                      />
                      {uploading === 'VIDEO' && videoUploadState && (
                        <div className="mt-4 rounded-2xl border border-violet-400/20 bg-violet-500/5 p-3 text-xs text-violet-100">
                          <div className="flex items-center justify-between gap-3">
                            <span>{videoUploadState.message}</span>
                            <button
                              type="button"
                              onClick={() => videoUploadAbortRef.current?.abort()}
                              className="rounded-full bg-red-500/80 px-3 py-1 font-semibold text-white hover:bg-red-500"
                            >
                              Cancel
                            </button>
                          </div>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full bg-violet-400 transition-all duration-200"
                              style={{ width: `${videoUploadState.progress}%` }}
                            />
                          </div>
                          <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-300">
                            <span>{videoUploadState.progress}%</span>
                            <span>{formatUploadSpeed(videoUploadState.speedMbps)}</span>
                            <span>ETA {formatRemainingTime(videoUploadState.estimatedRemainingSeconds)}</span>
                            <span>
                              Parts {videoUploadState.completedParts}/{videoUploadState.totalParts}
                            </span>
                            {videoUploadState.retryCount ? <span>Retries {videoUploadState.retryCount}</span> : null}
                          </div>
                        </div>
                      )}
                    </label>
                  </div>

                  {uploading && (
                    <div className="mt-4 text-xs text-sky-300">Uploading {uploading.toLowerCase()}...</div>
                  )}
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">Link attachments</h3>
                      <p className="mt-1 text-xs text-slate-400">Attach websites, courses, exercises, books, or homework links.</p>
                    </div>
                    <button
                      type="button"
                      onClick={addLinkAttachment}
                      className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-3 py-2 text-xs font-semibold"
                    >
                      <Plus size={14} />
                      Add Link
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {linkAttachments.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/15 bg-[#08101f] px-4 py-5 text-center text-xs text-slate-400">
                        No extra links attached yet.
                      </div>
                    ) : (
                      linkAttachments.map((attachment, index) => (
                        <div key={`${attachment.kind}-${index}`} className="grid gap-3 rounded-2xl border border-white/10 bg-[#08101f] p-4">
                          <div className="grid gap-3 sm:grid-cols-[0.8fr_1fr_auto]">
                            <select
                              value={attachment.kind}
                              onChange={(event) => updateLinkAttachment(index, { kind: event.target.value })}
                              className="rounded-2xl border border-white/10 bg-transparent px-3 py-2 text-sm outline-none"
                            >
                              {ATTACHMENT_KIND_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value} className="bg-slate-900">
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <input
                              value={attachment.label || ''}
                              onChange={(event) => updateLinkAttachment(index, { label: event.target.value })}
                              placeholder="Link label"
                              className="rounded-2xl border border-white/10 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-slate-500"
                            />
                            <button
                              type="button"
                              onClick={() => removeLinkAttachment(index)}
                              className="rounded-2xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200"
                            >
                              Remove
                            </button>
                          </div>
                          <input
                            value={attachment.url || ''}
                            onChange={(event) => updateLinkAttachment(index, { url: event.target.value })}
                            placeholder="https://..."
                            className="rounded-2xl border border-white/10 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-slate-500"
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => saveCommunication('draft')}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold disabled:opacity-50"
                  >
                    Save Draft
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => saveCommunication('schedule')}
                    className="rounded-2xl border border-sky-400/25 bg-sky-500/10 px-4 py-3 text-sm font-semibold text-sky-200 disabled:opacity-50"
                  >
                    Schedule
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => saveCommunication('publish')}
                    className="rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50"
                  >
                    Publish Now
                  </button>
                  {form.id && (
                    <button
                      type="button"
                      onClick={() => {
                        if (form.id) {
                          handleArchive(form.id)
                        }
                      }}
                      className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-200"
                    >
                      Archive
                    </button>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-[30px] border border-white/10 bg-[#0c1730] p-5">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Student preview</div>
              <div className="mt-4 overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-[#15274a] via-[#102041] to-[#0b1530] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-2xl p-3 ${TYPE_META[form.type].bg} ${TYPE_META[form.type].color}`}>
                      {(() => {
                        const PreviewIcon = TYPE_META[form.type].icon
                        return <PreviewIcon size={22} />
                      })()}
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{TYPE_META[form.type].label}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                        {BAC_SECTION_LABELS[currentBacSection]}
                      </div>
                      <div className="mt-1 text-xl font-bold">{form.title || 'Announcement title preview'}</div>
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getPriorityTone(form.priority)}`}>
                    {form.priority}
                  </span>
                </div>

                {mediaAttachments.IMAGE?.filePath && (
                  <img
                    src={toAssetUrl(mediaAttachments.IMAGE.filePath)}
                    alt={mediaAttachments.IMAGE.label || form.title || 'Communication preview'}
                    className="mt-5 h-44 w-full rounded-3xl object-cover"
                  />
                )}

                <p className="mt-5 text-sm text-slate-300">
                  {form.description || 'Short description will appear here for students on the dashboard carousel.'}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {form.meetingLink && (
                    <a
                      href={form.meetingLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-200"
                    >
                      <CalendarClock size={14} />
                      Meeting Link
                    </a>
                  )}
                  {form.externalLink && (
                    <a
                      href={form.externalLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-2xl border border-sky-400/25 bg-sky-500/10 px-4 py-2 text-xs font-semibold text-sky-200"
                    >
                      <Link2 size={14} />
                      External Link
                    </a>
                  )}
                  {form.buttonText && (
                    <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-xs font-semibold text-slate-900">
                      {form.buttonText}
                    </div>
                  )}
                </div>

                <div className="mt-5 space-y-3">
                  {(form.attachments || [])
                    .filter((attachment) => attachment.filePath || attachment.url)
                    .map((attachment, index) => (
                      <div key={`${attachment.kind}-${index}`} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold">{attachment.label || attachment.kind}</div>
                          <div className="truncate text-xs text-slate-400">
                            {attachment.url || attachment.filePath}
                          </div>
                        </div>
                        <div className="ml-4 text-xs text-slate-400">{formatSize(attachment.sizeBytes)}</div>
                      </div>
                    ))}
                </div>
              </div>

              {selectedItem && (
                <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                  <div className="font-semibold text-slate-100">Selected item details</div>
                  <div className="mt-2">Current status: {selectedItem.lifecycleStatus}</div>
                  <div>Updated at: {formatDateTime(selectedItem.updatedAt)}</div>
                </div>
              )}
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}

export default CommunicationsPage
