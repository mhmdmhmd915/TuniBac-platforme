import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, BookOpen, CheckCircle2, Download, ExternalLink, FileText, FolderOpen, GraduationCap, PlayCircle } from 'lucide-react'
import ProfessorAdvertisementCard from '../components/ProfessorAdvertisementCard'
import Breadcrumbs from '../components/Breadcrumbs'
import { toAssetUrl } from '../lib/assets'
import { ResponsiveVideoPlayer, isVideoAvailable } from '../components/ui/ResponsiveVideoPlayer'
import { sanitizeRichHtml } from '../lib/sanitizeHtml'
import { logger } from '../lib/logger'
import { exercisesAPI, progressAPI } from '../services/api'

const ExerciseDetail = () => {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [exercise, setExercise] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [progressCompleted, setProgressCompleted] = useState<boolean | null>(null)
  const [markingCompleted, setMarkingCompleted] = useState(false)
  const [activeTab, setActiveTab] = useState<'enonce' | 'correction'>('enonce')
  const fromLearningPath = (location.state as any)?.fromLearningPath === true

  useEffect(() => {
    const fetchExercise = async () => {
      try {
        if (!id) {
          setIsLoading(false)
          return
        }

        const response = await exercisesAPI.getById(id)
        setExercise(response.data)
      } catch (error) {
        logger.error('Error fetching exercise', error)
      } finally {
        setIsLoading(false)
      }
    }

    void fetchExercise()
  }, [id])

  // Mark exercise as "viewed" (not completed) when student opens.
  useEffect(() => {
    let cancelled = false
    const markViewed = async () => {
      if (!id || !exercise) return
      try {
        const res = await progressAPI.upsert({ exerciseId: id, lastReadPos: 0 })
        if (!cancelled && (res.data as any)?.progress?.completed !== undefined) {
          setProgressCompleted((res.data as any).progress.completed)
        }
      } catch (_err) {
        // Best-effort view tracking; ignore failures.
      }
    }
    void markViewed()
    return () => { cancelled = true }
  }, [id, exercise])

  const handleMarkCompleted = async () => {
    if (!id) return
    try {
      setMarkingCompleted(true)
      const res = await progressAPI.markCompleted({ exerciseId: id })
      if ((res.data as any)?.progress?.completed) {
        setProgressCompleted(true)
      }
    } catch (err) {
      logger.error('Error marking exercise completed', err)
    } finally {
      setMarkingCompleted(false)
    }
  }

  const problemUrl = useMemo(() => toAssetUrl(exercise?.contentUrl), [exercise?.contentUrl])

  const downloadFile = (url: string) => {
    if (!url) return
    const link = document.createElement('a')
    link.href = url
    link.download = ''
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!exercise) {
    return <div className="min-h-screen flex items-center justify-center">Exercise not found</div>
  }

  const goBack = () => {
    if (fromLearningPath) {
      navigate(-1)
      return
    }
    navigate(exercise?.subject?.id ? `/exercises?subject=${exercise.subject.id}` : '/exercises')
  }

  const crumbs = [
    { label: exercise.subject?.name || 'Exercices', to: exercise?.subject?.id ? `/exercises?subject=${exercise.subject.id}` : '/exercises' },
    ...(exercise.course ? [{ label: exercise.course.title, to: `/courses/${exercise.course.id}` }] : []),
    { label: exercise.title },
  ]

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
      <button
        onClick={goBack}
        className="inline-flex items-center space-x-2 text-text-muted-light dark:text-text-muted hover:text-accent transition-colors"
      >
        <ArrowLeft size={20} />
        <span>{fromLearningPath ? 'Retour au parcours' : 'Back to Exercises'}</span>
      </button>

      <Breadcrumbs crumbs={crumbs} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-morphism rounded-3xl p-8 space-y-6">
            <div className="flex flex-wrap gap-4">
              <span className="px-4 py-2 bg-accent/10 text-accent rounded-full text-sm font-bold">
                {exercise.subject?.name}
              </span>
              <span className="px-4 py-2 bg-black/5 dark:bg-white/5 text-text-muted-light dark:text-text-muted rounded-full text-sm font-bold">
                {exercise.difficulty}
              </span>
              {exercise.groupTitle && (
                <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-500/10 text-indigo-500 rounded-full text-sm font-bold">
                  <FolderOpen size={14} />
                  {exercise.groupTitle}
                </span>
              )}
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl font-bold text-text-light dark:text-text">
                {exercise.title}
              </h1>
              <p className="text-lg leading-relaxed text-text-muted-light dark:text-text-muted">
                {exercise.description || 'Practice this exercise and review the attached resources.'}
              </p>
            </div>

            {exercise.course && (
              <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-text-muted-light dark:text-text-muted">
                  Fait partie du cours
                </div>
                <Link
                  to={`/courses/${exercise.course.id}`}
                  className="mt-1 inline-flex items-center gap-2 font-semibold text-accent hover:underline"
                >
                  <BookOpen size={16} />
                  {exercise.course.title}
                </Link>
              </div>
            )}

            <div className="border-b border-slate-200 dark:border-white/10">
              <div className="flex gap-1">
                <button
                  onClick={() => setActiveTab('enonce')}
                  className={`px-5 py-3 text-sm font-bold rounded-t-2xl transition-colors ${
                    activeTab === 'enonce'
                      ? 'bg-slate-100 dark:bg-white/10 text-text-light dark:text-text'
                      : 'text-text-muted-light dark:text-text-muted hover:text-text-light dark:hover:text-text'
                  }`}
                >
                  Énoncé
                </button>
                <button
                  onClick={() => setActiveTab('correction')}
                  className={`px-5 py-3 text-sm font-bold rounded-t-2xl transition-colors ${
                    activeTab === 'correction'
                      ? 'bg-slate-100 dark:bg-white/10 text-text-light dark:text-text'
                      : 'text-text-muted-light dark:text-text-muted hover:text-text-light dark:hover:text-text'
                  }`}
                >
                  Correction
                </button>
              </div>
            </div>
          </div>

          <div className="glass-morphism rounded-3xl rounded-t-none p-8 space-y-6">
            {activeTab === 'enonce' ? (
              <>
                <h2 className="text-2xl font-bold text-text-light dark:text-text">Énoncé</h2>
                {problemUrl && (
                  <button
                    type="button"
                    onClick={() => downloadFile(problemUrl)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent text-primary px-5 py-4 font-semibold hover:scale-[1.01] transition"
                  >
                    <FileText size={18} />
                    <span>Télécharger l'énoncé PDF</span>
                  </button>
                )}
                {(() => {
                  const enonceVideoSrc = exercise.videoPath ? toAssetUrl(exercise.videoPath) : exercise.videoUrl
                  if (!isVideoAvailable(enonceVideoSrc)) return null
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-text-muted-light dark:text-text-muted">
                        <PlayCircle size={16} /> Vidéo de l'énoncé
                      </div>
                      <ResponsiveVideoPlayer
                        src={enonceVideoSrc}
                        title={`Vidéo de l'énoncé - ${exercise.title || ''}`}
                      />
                    </div>
                  )
                })()}
                {exercise.contentText && String(exercise.contentText).replace(/<[^>]*>/g, '').trim().length > 0 && (
                  <div
                    className="prose max-w-none text-text-light dark:text-text"
                    dir="auto"
                    dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(exercise.contentText) }}
                  />
                )}
                {exercise.externalLink && (
                  <a
                    href={exercise.externalLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-2xl bg-accent/10 text-accent px-5 py-3 font-semibold hover:bg-accent/20 transition-colors"
                  >
                    <ExternalLink size={18} />
                    <span>Ouvrir le lien externe</span>
                  </a>
                )}
                {!problemUrl && !exercise.contentText && !exercise.externalLink && (
                  <p className="text-sm text-text-muted-light dark:text-text-muted">
                    Aucun contenu d'énoncé disponible pour cet exercice.
                  </p>
                )}
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-text-light dark:text-text">Correction</h2>
                {!exercise.corrections || exercise.corrections.length === 0 ? (
                  <p className="text-sm text-text-muted-light dark:text-text-muted">
                    Aucune correction n'a été ajoutée pour cet exercice.
                  </p>
                ) : (
                  (() => {
                    const correction = exercise.corrections[0]
                    const correctionPdfUrl = toAssetUrl(correction?.contentUrl)
                    return (
                      <div className="space-y-6">
                        {correction?.title && (
                          <h3 className="text-xl font-bold text-text-light dark:text-text">
                            {correction.title}
                          </h3>
                        )}
                        {correction?.description && (
                          <p className="text-base leading-relaxed text-text-muted-light dark:text-text-muted">
                            {correction.description}
                          </p>
                        )}
                        {correctionPdfUrl && (
                          <button
                            type="button"
                            onClick={() => downloadFile(correctionPdfUrl)}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-secondary-light/60 dark:bg-secondary/60 text-text-light dark:text-text hover:bg-secondary-light/80 dark:hover:bg-secondary/80 px-5 py-4 font-semibold transition"
                          >
                            <Download size={18} />
                            <span>Télécharger la correction PDF</span>
                          </button>
                        )}
                        {correction?.contentText &&
                          String(correction.contentText).replace(/<[^>]*>/g, '').trim().length > 0 && (
                            <div
                              className="prose max-w-none text-text-light dark:text-text"
                              dir="auto"
                              dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(correction.contentText) }}
                            />
                          )}
                        {(() => {
                          const correctionVideoSrc = correction?.videoPath ? toAssetUrl(correction.videoPath) : correction?.videoUrl
                          if (!isVideoAvailable(correctionVideoSrc)) return null
                          return (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm font-semibold text-text-muted-light dark:text-text-muted">
                                <PlayCircle size={16} /> Vidéo de correction
                              </div>
                              <ResponsiveVideoPlayer
                                src={correctionVideoSrc}
                                title={`Vidéo de correction - ${correction?.title || exercise.title || ''}`}
                              />
                            </div>
                          )
                        })()}
                        {correction?.externalLink && (
                          <a
                            href={correction.externalLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-5 py-3 font-semibold hover:bg-emerald-500/20 transition-colors"
                          >
                            <ExternalLink size={18} />
                            <span>Ouvrir le lien de correction</span>
                          </a>
                        )}
                      </div>
                    )
                  })()
                )}
              </>
            )}
          </div>
        </div>

        <div className="space-y-8">
          {exercise.teacher && (
            <div className="glass-morphism rounded-3xl p-8 space-y-3">
              <h3 className="flex items-center gap-2 text-xl font-bold text-text-light dark:text-text">
                <GraduationCap size={20} className="text-accent" />
                Enseignant
              </h3>
              <Link
                to={`/teachers/${exercise.teacher.id}`}
                className="text-accent font-semibold hover:underline"
              >
                {exercise.teacher.firstName} {exercise.teacher.lastName}
              </Link>
            </div>
          )}
          <div className="glass-morphism rounded-3xl p-8 space-y-4">
            <h3 className="text-xl font-bold text-text-light dark:text-text">
              Ta progression
            </h3>
            {progressCompleted === true ? (
              <div className="flex items-center gap-3 rounded-2xl bg-emerald-500/10 px-4 py-3 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={20} />
                <span className="font-semibold">Exercice terminé 🟢</span>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl bg-blue-500/10 px-4 py-3 text-blue-600 dark:text-blue-400">
                <CheckCircle2
                  size={20}
                  className={progressCompleted === null ? 'opacity-70' : ''}
                />
                <span className="font-semibold">
                  {progressCompleted === null ? 'En cours de chargement…' : 'Exercice commencé 🔵'}
                </span>
              </div>
            )}
            <button
              onClick={handleMarkCompleted}
              disabled={markingCompleted || progressCompleted === true}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-accent px-5 py-3 font-bold text-primary hover:scale-[1.02] active:scale-100 transition disabled:opacity-60 disabled:hover:scale-100"
            >
              {markingCompleted ? (
                <span>Enregistrement…</span>
              ) : progressCompleted ? (
                <>
                  <CheckCircle2 size={18} /> Déjà terminé
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} /> J'ai terminé cet exercice
                </>
              )}
            </button>
            <p className="text-xs text-text-muted-light dark:text-text-muted">
              Ceci met à jour ton pourcentage de progression dans le Parcours.
            </p>
          </div>
          <div className="glass-morphism rounded-3xl p-8 space-y-6">
            <h3 className="text-xl font-bold text-text-light dark:text-text">
              Extra Resources
            </h3>

            <div className="space-y-4">
              {exercise.resources?.length > 0 ? (
                exercise.resources.map((resource: any) => (
                  <a
                    key={resource.id}
                    href={toAssetUrl(resource.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 bg-black/5 dark:bg-white/5 rounded-2xl hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                  >
                    <span className="font-medium">{resource.title}</span>
                    <span className="inline-flex items-center gap-2 text-sm text-accent">
                      <span>{resource.type}</span>
                      <ExternalLink size={14} />
                    </span>
                  </a>
                ))
              ) : (
                <p className="text-text-muted-light dark:text-text-muted">
                  No extra resources available
                </p>
              )}
            </div>
          </div>

          <div className="glass-morphism rounded-3xl p-8 space-y-6">
            <h3 className="text-xl font-bold text-text-light dark:text-text">
              More Practice
            </h3>
            <p className="text-sm text-text-muted-light dark:text-text-muted">
              Continue with more exercises from the same subject.
            </p>
            <Link
              to={`/exercises?subject=${exercise.subject?.id || ''}`}
              className="w-full inline-flex items-center justify-center gap-2 py-4 bg-accent text-primary rounded-2xl font-bold hover:scale-[1.01] transition"
            >
              <BookOpen size={18} />
              <span>Browse Related Exercises</span>
            </Link>
          </div>
        </div>
      </div>

      {(exercise.advertisementImage ||
        exercise.advertisementTeacherName ||
        exercise.advertisementSubject ||
        exercise.advertisementDescription ||
        exercise.advertisementWhatsapp) && (
        <ProfessorAdvertisementCard
          image={exercise.advertisementImage}
          teacherName={exercise.advertisementTeacherName}
          subject={exercise.advertisementSubject}
          description={exercise.advertisementDescription}
          whatsapp={exercise.advertisementWhatsapp}
        />
      )}
    </div>
  )
}

export default ExerciseDetail
