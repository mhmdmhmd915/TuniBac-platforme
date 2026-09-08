import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { coursesAPI, exercisesAPI, subjectsAPI, adminAPI } from '../../services/api'
import { BAC_SECTION_OPTIONS } from '../../constants/bacSections'
import { PdfUploader } from '../../components/admin/PdfUploader'
import { VideoUploader } from '../../components/admin/VideoUploader'
import { toAssetUrl, BACKEND_URL } from '../../lib/assets'
import { isYouTubeUrl } from '../../lib/youtube'

const ContentItemEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isCourse = window.location.pathname.includes('/course/')
  const isNew = id === 'new'

  const [subjects, setSubjects] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [form, setForm] = useState<any>(null)
  const [sections, setSections] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const [subjectsRes, coursesRes] = await Promise.all([
        subjectsAPI.getAll(),
        coursesAPI.getAll(),
      ])

      if (cancelled) return
      setSubjects(subjectsRes.data)
      setCourses(coursesRes.data)

      const defaultSubjectId = searchParams.get('subjectId') || subjectsRes.data[0]?.id || ''

      if (isCourse) {
        if (isNew) {
          setForm({
            title: '',
            description: '',
            subjectId: defaultSubjectId,
            difficulty: 'BEGINNER',
            contentUrl: '',
            videoPath: '',
            videoUrl: '',
            contentText: '',
            externalLink: '',
            isPublished: true,
            order: 0,
          })
          setSections([])
        } else if (id) {
          const res = await coursesAPI.getById(id)
          const course = res.data
          setForm({
            title: course.title,
            description: course.description || '',
            subjectId: course.subjectId,
            difficulty: course.difficulty || 'BEGINNER',
            contentUrl: course.contentUrl || '',
            videoPath: course.videoPath || '',
            videoUrl: course.videoUrl || '',
            contentText: course.contentText || '',
            externalLink: course.externalLink || '',
            isPublished: course.isPublished ?? true,
            order: course.order || 0,
          })
          setSections(course.sections || [])
        }
      } else if (id && !isNew) {
        const res = await exercisesAPI.getById(id)
        const exercise = res.data
        setForm({
          title: exercise.title,
          description: exercise.description || '',
          subjectId: exercise.subjectId,
          difficulty: exercise.difficulty || 'BEGINNER',
          contentUrl: exercise.contentUrl || '',
          courseId: exercise.courseId || '',
          groupTitle: exercise.groupTitle || '',
          isPublished: exercise.isPublished ?? true,
          order: exercise.order || 0,
        })
        setSections(exercise.sections || [])
      } else {
        setForm({
          title: '',
          description: '',
          subjectId: defaultSubjectId,
          difficulty: 'BEGINNER',
          contentUrl: '',
          courseId: '',
          groupTitle: '',
          isPublished: true,
          order: 0,
        })
        setSections([])
      }
      setLoading(false)
    }

    run().catch(() => {
      if (!cancelled) {
        setNotice('Impossible de charger les options.')
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [id, isCourse, isNew, searchParams])

  const toggleSection = (value: string) =>
    setSections((prev) => (prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]))

  const save = async () => {
    if (!form?.title?.trim()) return
    setSaving(true)
    try {
      const payload = { ...form, sections }
      if (isCourse) {
        if (isNew) {
          await coursesAPI.create(payload)
        } else if (id) {
          await coursesAPI.update(id, payload)
        }
      } else if (isNew) {
        await exercisesAPI.create(payload)
      } else if (id) {
        await exercisesAPI.update(id, payload)
      }
      setNotice(isCourse ? 'Cours enregistré' : 'Exercice enregistré')
      window.setTimeout(() => navigate('/admin/content-tree'), 800)
    } catch (err: any) {
      setNotice(err?.response?.data?.message || 'Erreur lors de l’enregistrement')
    } finally {
      setSaving(false)
    }
  }

  const uploadCoursePdf = async (file: File) => {
    const formData = new FormData()
    formData.append('pdf', file)
    const response = await adminAPI.uploadCoursePdf(formData)
    return toAssetUrl(response.data.fileUrl as string)
  }

  const uploadExercisePdf = async (file: File) => {
    const formData = new FormData()
    formData.append('pdf', file)
    const response = await adminAPI.uploadExercisePdf(formData)
    return toAssetUrl(response.data.fileUrl as string)
  }

  const uploadVideo = async (file: File, options?: any) => {
    const response = await adminAPI.uploadAdminVideo(file, options)
    return toAssetUrl(response.data.videoPath as string)
  }

  const setField = (key: string, value: any) => setForm((prev: any) => ({ ...prev, [key]: value }))

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 size={30} className="animate-spin text-blue-600" />
      </div>
    )
  }

  if (!form) {
    return <div className="py-16 text-center text-gray-500">Impossible de charger cet élément.</div>
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {notice && (
        <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">{notice}</div>
      )}
      <button
        onClick={() => navigate('/admin/content-tree')}
        className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> Retour à l’arbre de contenu
      </button>
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
        {isCourse ? (isNew ? 'Nouveau cours' : 'Modifier le cours') : isNew ? 'Nouvel exercice' : "Modifier l'exercice"}
      </h1>

      <div className="space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Titre *</label>
          <input
            value={form.title}
            onChange={(e) => setField('title', e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Matière</label>
            <select
              value={form.subjectId}
              onChange={(e) => setField('subjectId', e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Difficulté</label>
            <select
              value={form.difficulty}
              onChange={(e) => setField('difficulty', e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              <option value="BEGINNER">Débutant</option>
              <option value="INTERMEDIATE">Intermédiaire</option>
              <option value="ADVANCED">Avancé</option>
            </select>
          </div>
        </div>

        {!isCourse && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Cours lié (optionnel)</label>
              <select
                value={form.courseId || ''}
                onChange={(e) => setField('courseId', e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
              >
                <option value="">Aucun</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>{course.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Chapitre / Groupe</label>
              <input
                value={form.groupTitle || ''}
                onChange={(e) => setField('groupTitle', e.target.value)}
                placeholder="Ex : Suites numériques"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </div>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Sections (contenu visible par ces sections uniquement)
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {BAC_SECTION_OPTIONS.map((option) => (
              <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-white/10">
                <input type="checkbox" checked={sections.includes(option.value)} onChange={() => toggleSection(option.value)} className="h-4 w-4" />
                <span className="dark:text-gray-200">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {isCourse && (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Contenu texte</label>
              <textarea
                value={form.contentText || ''}
                onChange={(e) => setField('contentText', e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Lien externe</label>
              <input
                value={form.externalLink || ''}
                onChange={(e) => setField('externalLink', e.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">PDF du cours</span>
                <PdfUploader
                  value={form.contentUrl ? toAssetUrl(form.contentUrl) : ''}
                  onChange={(value) => setField('contentUrl', value.replace(BACKEND_URL, ''))}
                  onUpload={uploadCoursePdf}
                />
              </div>
              <div>
                <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Vidéo du cours</span>
                <VideoUploader
                  value={isYouTubeUrl(form?.videoUrl || '') ? form.videoUrl : toAssetUrl(form?.videoPath || '')}
                  onChange={(value) => {
                    const cleaned = value.trim()
                    if (isYouTubeUrl(cleaned)) {
                      setForm((prev: any) => ({ ...prev, videoUrl: cleaned, videoPath: '' }))
                    } else {
                      setForm((prev: any) => ({
                        ...prev,
                        videoPath: cleaned.replace(BACKEND_URL, ''),
                        videoUrl: '',
                      }))
                    }
                  }}
                  onUpload={uploadVideo}
                />
              </div>
            </div>
          </>
        )}

        {!isCourse && (
          <div>
            <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">PDF de l’exercice</span>
            <PdfUploader
              value={form.contentUrl ? toAssetUrl(form.contentUrl) : ''}
              onChange={(value) => setField('contentUrl', value.replace(BACKEND_URL, ''))}
              onUpload={uploadExercisePdf}
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-5">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={form.isPublished} onChange={(e) => setField('isPublished', e.target.checked)} className="h-4 w-4" />
            Publié
          </label>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Ordre</label>
            <input
              type="number"
              value={form.order || 0}
              onChange={(e) => setField('order', Number(e.target.value))}
              className="w-20 rounded-xl border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={() => navigate('/admin/content-tree')}
            className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"
          >
            Annuler
          </button>
          <button
            onClick={save}
            disabled={saving || !form.title?.trim()}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}

export default ContentItemEditor
