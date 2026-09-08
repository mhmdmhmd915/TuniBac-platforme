import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  BookMarked,
  ChevronDown,
  ExternalLink,
  Filter,
  GraduationCap,
  MessageCircle,
  User,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { BAC_SECTION_OPTIONS, type BacSection } from '../constants/bacSections'
import { useAuth } from '../context/AuthContext'
import { toAssetUrl } from '../lib/assets'
import { subjectsAPI, teacherAPI } from '../services/api'

type PublicTeacher = {
  id: string
  firstName: string
  lastName: string
  profile?: {
    photo?: string | null
    bio?: string | null
    whatsapp?: string | null
    externalLink?: string | null
    isPublic?: boolean
  } | null
  assignments?: Array<{
    subjectId?: string | null
    subjectName?: string | null
    bacSection?: string | null
  }> | null
}

type Subject = {
  id: string
  name: string
  bacSection?: BacSection
  isActive?: boolean
}

const formatWhatsAppLink = (value?: string | null) => {
  if (!value) return null
  const digits = String(value).replace(/\D+/g, '')
  if (!digits) return null
  const full = digits.length === 8 ? `216${digits}` : digits
  return `https://wa.me/${full}`
}

const TeachersList = () => {
  const { user } = useAuth()
  const [teachers, setTeachers] = useState<PublicTeacher[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('ALL')
  const [selectedSection, setSelectedSection] = useState<BacSection | 'ALL'>('ALL')

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const params = user?.role === 'STUDENT' && user.bacSection
          ? { activeOnly: true, bacSection: user.bacSection }
          : undefined
        const res = await subjectsAPI.getAll(params as any)
        setSubjects(Array.isArray(res.data) ? res.data : [])
      } catch {
        setSubjects([])
      }
    }
    void fetchSubjects()
  }, [user])

  useEffect(() => {
    setLoading(true)
    const params: any = {}
    if (selectedSubjectId !== 'ALL') params.subjectId = selectedSubjectId
    if (selectedSection !== 'ALL') params.bacSection = selectedSection
    teacherAPI
      .listPublic(params)
      .then((res) => setTeachers((res.data as any)?.teachers || (Array.isArray(res.data) ? res.data : [])))
      .catch(() => setTeachers([]))
      .finally(() => setLoading(false))
  }, [selectedSubjectId, selectedSection])

  const subjectOptions = useMemo(() => {
    const all = [{ value: 'ALL', label: 'Toutes les matières' }]
    const rest = subjects.map((s) => ({ value: s.id, label: s.name }))
    return [...all, ...rest]
  }, [subjects])

  const sectionOptions = useMemo(() => {
    const all = [{ value: 'ALL', label: 'Toutes les sections' }]
    const rest = BAC_SECTION_OPTIONS.map((o) => ({ value: o.value, label: o.label }))
    return [...all, ...rest]
  }, [])

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-8 space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">
          <span className="inline-flex items-center gap-1.5">
            <User size={13} /> Équipe pédagogique
          </span>
        </p>
        <h1 className="text-4xl font-black text-[#071840]">Enseignants</h1>
        <p className="text-lg font-semibold text-slate-600" dir="auto">
          إلقى الأستاذ اللي يناسبك.
        </p>
      </header>

      <div className="mb-8 grid gap-3 rounded-2xl border border-gray-200 bg-white/90 p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <label className="flex flex-col gap-2">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
            <BookMarked size={12} /> Matière
          </span>
          <div className="relative">
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="h-12 w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 pr-10 text-sm font-medium text-slate-800 outline-none focus:border-teal-500/60"
            >
              {subjectOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </label>

        <label className="flex flex-col gap-2">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Filter size={12} /> Section Bac
          </span>
          <div className="relative">
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value as BacSection | 'ALL')}
              className="h-12 w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 pr-10 text-sm font-medium text-slate-800 outline-none focus:border-teal-500/60"
            >
              {sectionOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </label>

        <div className="inline-flex items-center gap-1.5 self-end rounded-xl bg-teal-600/10 px-3 py-2 text-xs font-bold text-teal-700">
          <Filter size={12} /> Filtres appliqués automatiquement
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-52 animate-pulse rounded-3xl border border-gray-100 bg-gray-50" />
          ))}
        </div>
      ) : teachers.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
            <GraduationCap size={28} />
          </div>
          <p className="text-lg font-semibold text-slate-700">
            ما لقيناش enseignants على ces filtres.
          </p>
          <p className="text-sm text-slate-500">
            جرّب تغيّر المادة أو la section, ou راجع لاحقاً.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teachers.map((t) => {
            const wa = formatWhatsAppLink(t.profile?.whatsapp)
            const subjectName =
              t.assignments?.find((a) => a.subjectName)?.subjectName ||
              (t as any).subject ||
              'Enseignant'
            return (
              <article
                key={t.id}
                className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-teal-500/10"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-teal-50">
                    {t.profile?.photo ? (
                      <img
                        src={toAssetUrl(t.profile.photo)}
                        alt={`${t.firstName} ${t.lastName}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-lg font-black text-teal-700">
                        {t.firstName?.[0]?.toUpperCase() || ''}
                        {t.lastName?.[0]?.toUpperCase() || ''}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-extrabold text-[#071840]">
                      {t.firstName} {t.lastName}
                    </div>
                    <div className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-teal-600/10 px-2.5 py-0.5 text-xs font-bold text-teal-700">
                      <GraduationCap size={11} /> {subjectName}
                    </div>
                  </div>
                </div>

                {t.profile?.bio && (
                  <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-slate-600" dir="auto">
                    {t.profile.bio}
                  </p>
                )}

                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  {wa && (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-600 transition-colors"
                    >
                      <MessageCircle size={15} /> WhatsApp
                    </a>
                  )}
                  {t.profile?.externalLink && !wa && (
                    <a
                      href={t.profile.externalLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/10 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-800/15 transition-colors"
                    >
                      <ExternalLink size={15} /> Contacter
                    </a>
                  )}
                  <Link
                    to={`/teachers/${t.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-teal-600/10 px-4 py-2 text-sm font-bold text-teal-700 hover:bg-teal-600/20 transition-colors"
                  >
                    Voir profil <ArrowRight size={15} />
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default TeachersList
