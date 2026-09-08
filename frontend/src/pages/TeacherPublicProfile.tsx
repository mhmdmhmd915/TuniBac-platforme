import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  BookOpen,
  ExternalLink,
  GraduationCap,
  Loader2,
  MessageCircle,
  Phone,
} from 'lucide-react'
import { teacherAPI } from '../services/api'

interface PublicTeacher {
  id: string
  firstName: string
  lastName: string
  profile: {
    photo?: string | null
    bio?: string | null
    whatsapp?: string | null
    externalLink?: string | null
    isPublic: boolean
  }
  assignments: Array<{ subjectId: string | null; subjectName?: string | null; bacSection: string | null }>
}

const TeacherPublicProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [teacher, setTeacher] = useState<PublicTeacher | null>(null)
  const [courses, setCourses] = useState<any[]>([])
  const [ads, setAds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    teacherAPI
      .getPublicProfile(id)
      .then((res) => {
        setTeacher(res.data.teacher)
        setCourses(res.data.courses || [])
        setAds(res.data.ads || [])
      })
      .catch(() => setError('Profil introuvable ou non public.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 size={30} className="animate-spin text-blue-600" />
      </div>
    )
  }

  if (error || !teacher) {
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <p className="text-red-500">{error || 'Profil introuvable.'}</p>
        <Link to="/" className="mt-4 inline-block rounded-full bg-blue-600 px-6 py-2 font-semibold text-white">
          Retour à l’accueil
        </Link>
      </div>
    )
  }

  const whatsappNumber = teacher.profile.whatsapp
  const whatsappLink = whatsappNumber
    ? `https://wa.me/${whatsappNumber.startsWith('216') ? whatsappNumber : `216${whatsappNumber}`}`
    : null

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="h-28 bg-gradient-to-r from-blue-600 to-blue-400" />
        <div className="px-6 pb-6">
          <div className="-mt-12 flex flex-col items-center text-center sm:flex-row sm:items-end sm:text-left">
            {teacher.profile.photo ? (
              <img
                src={teacher.profile.photo}
                alt={`${teacher.firstName} ${teacher.lastName}`}
                className="h-24 w-24 rounded-2xl border-4 border-white object-cover shadow dark:border-slate-900"
              />
            ) : (
              <span className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white bg-blue-600/10 text-blue-600 shadow dark:border-slate-900">
                <GraduationCap size={40} />
              </span>
            )}
            <div className="mt-3 sm:ml-4 sm:mt-0">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {teacher.firstName} {teacher.lastName}
              </h1>
              <p className="text-sm text-blue-600">
                {teacher.assignments.filter((a) => a.subjectName).map((a) => a.subjectName).join(' · ') || 'Enseignant'}
              </p>
            </div>
          </div>

          {teacher.profile.bio && (
            <p className="mt-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300" dir="auto">
              {teacher.profile.bio}
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            {whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
              >
                <MessageCircle size={16} /> WhatsApp
              </a>
            )}
            {teacher.profile.externalLink && (
              <a
                href={teacher.profile.externalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:border-blue-400 hover:text-blue-600 dark:border-white/20 dark:text-gray-200"
              >
                <ExternalLink size={16} /> Voir plus
              </a>
            )}
          </div>
        </div>
      </div>

      {courses.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
            <BookOpen size={18} className="text-blue-600" /> Cours publics
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {courses.map((course) => (
              <Link
                key={course.id}
                to={`/courses/${course.id}`}
                className="rounded-2xl border border-gray-200 p-4 hover:border-blue-400 hover:shadow-sm dark:border-white/10"
              >
                <p className="font-semibold text-gray-900 dark:text-white">{course.title}</p>
                <p className="mt-1 text-xs text-blue-600">{course.subject?.name}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {ads.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
            <Phone size={18} className="text-blue-600" /> Annonces
          </h2>
          <div className="space-y-3">
            {ads.map((ad) => (
              <div key={ad.id} className="flex items-center gap-4 rounded-2xl border border-gray-200 p-4 dark:border-white/10">
                {ad.image && <img src={ad.image} alt={ad.teacherName} className="h-16 w-16 rounded-xl object-cover" />}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white">{ad.teacherName}</p>
                  {ad.subject && <p className="text-xs text-blue-600">{ad.subject}</p>}
                  {ad.description && <p className="line-clamp-2 text-xs text-gray-500 dark:text-gray-400">{ad.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(() => {
        const adWithMethod = ads.find((a: any) => a.teachingMethod)
        if (!adWithMethod) return null
        return (
          <div className="mt-8">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
              <BookOpen size={18} className="text-blue-600" /> Approche pédagogique
            </h2>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
              <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300" dir="auto">
                {adWithMethod.teachingMethod}
              </p>
            </div>
          </div>
        )
      })()}

      {(() => {
        const adWithVideo = ads.find((a: any) => a.videoUrl)
        if (!adWithVideo) return null
        const url = adWithVideo.videoUrl as string
        const type = (adWithVideo.videoType as string) || 'AUTO'
        const isYouTube =
          type === 'YOUTUBE' ||
          (type === 'AUTO' && (url.includes('youtube.com') || url.includes('youtu.be')))

        let embedSrc = url
        if (isYouTube) {
          const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)
          if (ytMatch) embedSrc = `https://www.youtube.com/embed/${ytMatch[1]}`
        }

        return (
          <div className="mt-8">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
              <BookOpen size={18} className="text-blue-600" /> Vidéo
            </h2>
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-black dark:border-white/10">
              {isYouTube ? (
                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                  <iframe
                    src={embedSrc}
                    title="YouTube video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 h-full w-full"
                  />
                </div>
              ) : (
                <video controls src={url} className="h-auto w-full" />
              )}
            </div>
          </div>
        )
      })()}

      {(() => {
        const adWithResources = ads.find((a: any) => Array.isArray(a.resources) && a.resources.length > 0)
        if (!adWithResources) return null
        const resources = adWithResources.resources as any[]
        return (
          <div className="mt-8">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
              <BookOpen size={18} className="text-blue-600" /> Ressources / PDFs
            </h2>
            <div className="space-y-2 rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
              {resources.map((res: any, idx: number) => (
                <a
                  key={res.id || idx}
                  href={res.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl p-3 text-sm font-medium text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
                >
                  <BookOpen size={16} />
                  <span className="min-w-0 flex-1 truncate">{res.title || res.name || `Ressource ${idx + 1}`}</span>
                  <ExternalLink size={14} />
                </a>
              ))}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

export default TeacherPublicProfile
