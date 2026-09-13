import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { coursesAPI, devoirsAPI, exercisesAPI, subjectsAPI, adminAPI } from '../../services/api'
import { BAC_SECTION_OPTIONS } from '../../constants/bacSections'
import { PdfUploader } from '../../components/admin/PdfUploader'
import { VideoUploader } from '../../components/admin/VideoUploader'
import { toAssetUrl, BACKEND_URL } from '../../lib/assets'
import { isYouTubeUrl } from '../../lib/youtube'

const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'corr-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9)
}

const ContentItemEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isCourse = window.location.pathname.includes('/course/')
  const isDevoir = window.location.pathname.includes('/devoir/')
  const isNew = id === 'new'

  const [subjects, setSubjects] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [form, setForm] = useState<any>(null)
  const [sections, setSections] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const [exerciseTab, setExerciseTab] = useState<'statement' | 'correction'>('statement')
  const [correctionForm, setCorrectionForm] = useState<any>({
    title: 'Correction exercice',
    description: '',
    contentText: '',
    videoUrl: '',
    contentUrl: '',
    externalLink: '',
    difficulty: 'BEGINNER',
    isPublished: true,
    order: 0,
  })
  const [correctionId, setCorrectionId] = useState<string | null>(null)
  const [savingCorrection, setSavingCorrection] = useState(false)

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
      } else if (isDevoir) {
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
          const res = await devoirsAPI.getById(id)
          const devoir = res.data
          setForm({
            title: devoir.title,
            description: devoir.description || '',
            subjectId: devoir.subjectId,
            difficulty: devoir.difficulty || 'BEGINNER',
            contentUrl: devoir.contentUrl || '',
            videoPath: devoir.videoPath || '',
            videoUrl: devoir.videoUrl || '',
            contentText: devoir.contentText || '',
            externalLink: devoir.externalLink || '',
            isPublished: devoir.isPublished ?? true,
            order: devoir.order || 0,
          })
          setSections(devoir.sections || [])
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
          videoUrl: exercise.videoUrl || '',
          videoPath: exercise.videoPath || '',
          contentText: exercise.contentText || '',
          externalLink: exercise.externalLink || '',
          courseId: exercise.courseId || '',
          groupTitle: exercise.groupTitle || '',
          isPublished: exercise.isPublished ?? true,
          order: exercise.order || 0,
        })
        setSections(exercise.sections || [])

        const firstCorrection = exercise.corrections?.[0]
        if (firstCorrection) {
          setCorrectionId(firstCorrection.id)
          setCorrectionForm({
            title: firstCorrection.title || 'Correction exercice',
            description: firstCorrection.description || '',
            contentText: firstCorrection.contentText || '',
            videoUrl: firstCorrection.videoUrl || '',
            contentUrl: firstCorrection.contentUrl || '',
            externalLink: firstCorrection.externalLink || '',
            difficulty: firstCorrection.difficulty || 'BEGINNER',
            isPublished: firstCorrection.isPublished ?? true,
            order: firstCorrection.order || 0,
          })
        }
      } else {
        setForm({
          title: '',
          description: '',
          subjectId: defaultSubjectId,
          difficulty: 'BEGINNER',
          contentUrl: '',
          videoUrl: '',
          videoPath: '',
          contentText: '',
          externalLink: '',
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
  }, [id, isCourse, isDevoir, isNew, searchParams])

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
        setNotice('Cours enregistré')
      } else if (isDevoir) {
        if (isNew) {
          await devoirsAPI.create(payload)
        } else if (id) {
          await devoirsAPI.update(id, payload)
        }
        setNotice('Devoir enregistré')
      } else if (isNew) {
        await exercisesAPI.create(payload)
        setNotice('Exercice enregistré')
      } else if (id) {
        await exercisesAPI.update(id, payload)
        setNotice('Exercice enregistré')
      }
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

  const uploadDevoirPdf = async (file: File) => {
    const formData = new FormData()
    formData.append('pdf', file)
    const response = await adminAPI.uploadDevoirPdf(formData)
    return toAssetUrl(response.data.fileUrl as string)
  }

  const uploadExercisePdf = async (file: File) => {
    const formData = new FormData()
    formData.append('pdf', file)
    const response = await adminAPI.uploadExercisePdf(formData)
    return toAssetUrl(response.data.fileUrl as string)
  }

  const uploadExerciseCorrectionPdf = async (file: File) => {
    const formData = new FormData()
    formData.append('pdf', file)
    const response = await adminAPI.uploadExerciseCorrectionPdf(formData)
    return toAssetUrl(response.data.fileUrl as string)
  }

  const uploadVideo = async (file: File, options?: any) => {
    const response = await adminAPI.uploadAdminVideo(file, options)
    return toAssetUrl(response.data.videoPath as string)
  }

  const setField = (key: string, value: any) => setForm((prev: any) => ({ ...prev, [key]: value }))
  const setCorrectionField = (key: string, value: any) =>
    setCorrectionForm((prev: any) => ({ ...prev, [key]: value }))

  const saveCorrection = async () => {
    if (!id || isNew) return
    setSavingCorrection(true)
    try {
      const corrId = correctionId || generateId()
      if (!correctionId) {
        setCorrectionId(corrId)
      }
      await exercisesAPI.upsertCorrection(id, corrId, correctionForm)
      setNotice('Correction enregistrée')
      window.setTimeout(() => setNotice(null), 2000)
    } catch (err: any) {
      setNotice(err?.response?.data?.message || 'Erreur lors de l’enregistrement de la correction')
    } finally {
      setSavingCorrection(false)
    }
  }

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

  const pageTitle = isCourse
    ? isNew
      ? 'Nouveau cours'
      : 'Modifier le cours'
    : isDevoir
    ? isNew
      ? 'Nouveau devoir'
      : 'Modifier le devoir'
    : isNew
    ? 'Nouvel exercice'
    : "Modifier l'exercice"

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {notice && (
        <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">{notice}</div>
      )}
      <button
        onClick={() => navigate('/admin/content-tree')}
        className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> Retour à l'arbre de contenu
      </button>
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
        {pageTitle}
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

        {!isCourse && !isDevoir && (
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

        {(isCourse || isDevoir) && (
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
                <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {isCourse ? 'PDF du cours' : 'PDF du devoir'}
                </span>
                <PdfUploader
                  value={form.contentUrl ? toAssetUrl(form.contentUrl) : ''}
                  onChange={(value) => setField('contentUrl', value.replace(BACKEND_URL, ''))}
                  onUpload={isCourse ? uploadCoursePdf : uploadDevoirPdf}
                />
              </div>
              <div>
                <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {isCourse ? 'Vidéo du cours' : 'Vidéo du devoir'}
                </span>
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

        {!isCourse && !isDevoir && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setExerciseTab('statement')}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  exerciseTab === 'statement'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10'
                }`}
              >
                Énoncé
              </button>
              <button
                type="button"
                onClick={() => setExerciseTab('correction')}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  exerciseTab === 'correction'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10'
                }`}
              >
                Correction
              </button>
            </div>

            {exerciseTab === 'statement' && (
              <div className="space-y-5">
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
                    <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      PDF de l'exercice
                    </span>
                    <PdfUploader
                      value={form.contentUrl ? toAssetUrl(form.contentUrl) : ''}
                      onChange={(value) => setField('contentUrl', value.replace(BACKEND_URL, ''))}
                      onUpload={uploadExercisePdf}
                    />
                  </div>
                  <div>
                    <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Vidéo de l'énoncé
                    </span>
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
              </div>
            )}

            {exerciseTab === 'correction' && (
              <div className="space-y-5 rounded-2xl border border-gray-200 p-5 dark:border-white/10">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{correctionForm.title || 'Correction exercice'}</h2>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Titre de la correction</label>
                  <input
                    value={correctionForm.title}
                    onChange={(e) => setCorrectionField('title', e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                  <textarea
                    value={correctionForm.description}
                    onChange={(e) => setCorrectionField('description', e.target.value)}
                    rows={2}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Contenu texte</label>
                  <textarea
                    value={correctionForm.contentText}
                    onChange={(e) => setCorrectionField('contentText', e.target.value)}
                    rows={4}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">URL de la vidéo</label>
                  <input
                    value={correctionForm.videoUrl || ''}
                    onChange={(e) => setCorrectionField('videoUrl', e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                </div>

                <div>
                  <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">PDF de la correction</span>
                  <PdfUploader
                    value={correctionForm.contentUrl ? toAssetUrl(correctionForm.contentUrl) : ''}
                    onChange={(value) => setCorrectionField('contentUrl', value.replace(BACKEND_URL, ''))}
                    onUpload={uploadExerciseCorrectionPdf}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Lien externe</label>
                  <input
                    value={correctionForm.externalLink || ''}
                    onChange={(e) => setCorrectionField('externalLink', e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Difficulté</label>
                  <select
                    value={correctionForm.difficulty}
                    onChange={(e) => setCorrectionField('difficulty', e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                  >
                    <option value="BEGINNER">Débutant</option>
                    <option value="INTERMEDIATE">Intermédiaire</option>
                    <option value="ADVANCED">Avancé</option>
                  </select>
                </div>

                <div className="flex flex-wrap items-center gap-5">
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={correctionForm.isPublished}
                      onChange={(e) => setCorrectionField('isPublished', e.target.checked)}
                      className="h-4 w-4"
                    />
                    Publié
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Ordre</label>
                    <input
                      type="number"
                      value={correctionForm.order || 0}
                      onChange={(e) => setCorrectionField('order', Number(e.target.value))}
                      className="w-20 rounded-xl border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={saveCorrection}
                    disabled={savingCorrection || isNew}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {savingCorrection ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    Enregistrer la correction
                  </button>
                </div>
              </div>
            )}
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
