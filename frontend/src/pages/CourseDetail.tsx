import { useState, useEffect } from 'react'
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom'
import { FileText, Download, ArrowLeft, ExternalLink, GraduationCap, CheckCircle2 } from 'lucide-react'
import ProfessorAdvertisementCard from '../components/ProfessorAdvertisementCard'
import Breadcrumbs from '../components/Breadcrumbs'
import { coursesAPI, progressAPI } from '../services/api'
import { toAssetUrl } from '../lib/assets'
import { sanitizeRichHtml } from '../lib/sanitizeHtml'
import { logger } from '../lib/logger'
import { ResponsiveVideoPlayer, isVideoAvailable } from '../components/ui/ResponsiveVideoPlayer'

const CourseDetail = () => {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [course, setCourse] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [progressCompleted, setProgressCompleted] = useState<boolean | null>(null)
  const [markingCompleted, setMarkingCompleted] = useState(false)
  const fromLearningPath = (location.state as any)?.fromLearningPath === true

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        if (!id) {
          setIsLoading(false)
          return
        }

        const response = await coursesAPI.getById(id)
        setCourse(response.data)
      } catch (err) {
        logger.error('Error fetching course', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchCourse()
  }, [id])

  // Mark course as "viewed" (not completed) when student opens for the first time.
  useEffect(() => {
    let cancelled = false
    const markViewed = async () => {
      if (!id || !course) return
      try {
        const res = await progressAPI.upsert({ courseId: id, lastReadPos: 0 })
        if (!cancelled && (res.data as any)?.progress?.completed !== undefined) {
          setProgressCompleted((res.data as any).progress.completed)
        }
      } catch (err) {
        // Progress view tracking is best-effort; ignore failures.
      }
    }
    markViewed()
    return () => { cancelled = true }
  }, [id, course])

  const handleMarkCompleted = async () => {
    if (!id) return
    try {
      setMarkingCompleted(true)
      const res = await progressAPI.markCompleted({ courseId: id })
      if ((res.data as any)?.progress?.completed) {
        setProgressCompleted(true)
      }
    } catch (err) {
      logger.error('Error marking course completed', err)
    } finally {
      setMarkingCompleted(false)
    }
  }

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  if (!course) return <div className="min-h-screen flex items-center justify-center">Course not found</div>
  const videoSource = course?.videoPath ? toAssetUrl(course.videoPath) : course?.videoUrl

  const goBack = () => {
    if (fromLearningPath) {
      navigate(-1)
      return
    }
    navigate(course?.subject?.id ? `/courses?subject=${course.subject.id}` : '/courses')
  }

  const crumbs = [
    { label: course.subject?.name || 'Cours', to: course?.subject?.id ? `/courses?subject=${course.subject.id}` : '/courses' },
    { label: course.title },
  ]

  const hasRichContent =
    (course.contentText && String(course.contentText).replace(/<[^>]*>/g, '').trim().length > 0) ||
    Boolean(course.externalLink)

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
      <button
        onClick={goBack}
        className="inline-flex items-center space-x-2 text-text-muted-light dark:text-text-muted hover:text-accent transition-colors"
      >
        <ArrowLeft size={20} />
        <span>{fromLearningPath ? 'Retour au parcours' : 'Back to Courses'}</span>
      </button>

      <Breadcrumbs crumbs={crumbs} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
            <ResponsiveVideoPlayer
              src={isVideoAvailable(videoSource) ? videoSource : null}
              title={`Vidéo du cours - ${course.title || ''}`}
              className="rounded-3xl overflow-hidden shadow-[0_18px_40px_-20px_rgba(7,24,64,0.35)]"
            />

          <div className="space-y-6">
            <h1 className="text-4xl font-bold text-text-light dark:text-text">{course.title}</h1>
            <div className="flex flex-wrap gap-4">
              <span className="px-4 py-2 bg-accent/10 text-accent rounded-full text-sm font-bold">{course.subject.name}</span>
              <span className="px-4 py-2 bg-black/5 dark:bg-white/5 text-text-muted-light dark:text-text-muted rounded-full text-sm font-bold">{course.difficulty}</span>
              {course.tags?.map((tag: string) => (
                <span key={tag} className="px-4 py-2 bg-black/5 dark:bg-white/5 text-text-muted-light dark:text-text-muted rounded-full text-sm">#{tag}</span>
              ))}
            </div>
            <p className="text-xl text-text-muted-light dark:text-text-muted leading-relaxed">
              {course.description}
            </p>
          </div>

          {/* Rich text content */}
          {hasRichContent && (
            <div className="glass-morphism rounded-3xl p-8 space-y-6">
              <h2 className="text-2xl font-bold text-text-light dark:text-text">Le cours</h2>
              {course.contentText && String(course.contentText).replace(/<[^>]*>/g, '').trim().length > 0 && (
                <div
                  className="prose max-w-none text-text-light dark:text-text"
                  dir="auto"
                  dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(course.contentText) }}
                />
              )}
              {course.externalLink && (
                <a
                  href={course.externalLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl bg-accent/10 text-accent px-5 py-3 font-semibold hover:bg-accent/20 transition-colors"
                >
                  <ExternalLink size={18} />
                  <span>Ouvrir le lien externe</span>
                </a>
              )}
            </div>
          )}

          {/* PDF Download Section */}
          {course.contentUrl && (
            <div className="glass-morphism rounded-3xl p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="text-accent" />
                  <div>
                    <h2 className="text-2xl font-bold text-text-light dark:text-text">
                      Course Material
                    </h2>
                    <p className="text-text-muted-light dark:text-text-muted">
                      Download the PDF course material.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const url = toAssetUrl(course.contentUrl)

                    const link = document.createElement('a');
                    link.href = url;
                    link.download = '';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="flex items-center space-x-2 bg-accent text-primary px-5 py-3 rounded-xl font-bold hover:scale-105 transition-all"
                >
                  <Download size={20} />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>
          )}
        </div> 
        <div className="space-y-8">
          {course.teacher && (
            <div className="glass-morphism rounded-3xl p-8 space-y-3">
              <h3 className="flex items-center gap-2 text-xl font-bold text-text-light dark:text-text">
                <GraduationCap size={20} className="text-accent" />
                Enseignant
              </h3>
              <Link
                to={`/teachers/${course.teacher.id}`}
                className="text-accent font-semibold hover:underline"
              >
                {course.teacher.firstName} {course.teacher.lastName}
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
                <span className="font-semibold">Cours terminé 🟢</span>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl bg-blue-500/10 px-4 py-3 text-blue-600 dark:text-blue-400">
                <CheckCircle2 size={20} className={progressCompleted === null ? 'opacity-70' : ''} />
                <span className="font-semibold">
                  {progressCompleted === null ? 'En cours de chargement…' : 'Cours en lecture 🔵'}
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
                  <CheckCircle2 size={18} /> Marquer comme terminé
                </>
              )}
            </button>
            <p className="text-xs text-text-muted-light dark:text-text-muted">
              Ceci met à jour ton pourcentage de progression dans le Parcours.
            </p>
          </div>
          <div className="glass-morphism rounded-3xl p-8 space-y-6">
            <h3 className="text-xl font-bold text-text-light dark:text-text">
              Other Resources
            </h3>

            <div className="space-y-4">
              {course.resources?.length > 0 ? (
                course.resources.map((resource: any) => (
                  <a
                    key={resource.id}
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 bg-black/5 dark:bg-white/5 rounded-2xl hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                  >
                    <span className="font-medium">
                      {resource.title}
                    </span>

                    <span className="text-sm text-accent">
                      {resource.type}
                    </span>
                  </a>
                ))
              ) : (
                <p className="text-text-muted-light dark:text-text-muted">
                  No resources available
                </p>
              )}
            </div>
          </div>
          <div className="glass-morphism rounded-3xl p-8 space-y-6">
            <h3 className="text-xl font-bold text-text-light dark:text-text">
              Practice Exercises
            </h3>

            <p className="text-text-muted-light dark:text-text-muted text-sm">
              Test your knowledge with exercises related to this course.
            </p>

            <Link
              to={`/exercises?subject=${course.subject.id}`}
              className="w-full flex items-center justify-center space-x-2 py-4 bg-accent text-primary rounded-2xl font-bold hover:scale-105 transition-all"
            >
              <span>Go to Exercises</span>
            </Link>
          </div>
        </div>
      </div>

      {(course.advertisementImage ||
        course.advertisementTeacherName ||
        course.advertisementSubject ||
        course.advertisementDescription ||
        course.advertisementWhatsapp) && (
        <ProfessorAdvertisementCard
          image={course.advertisementImage}
          teacherName={course.advertisementTeacherName}
          subject={course.advertisementSubject}
          description={course.advertisementDescription}
          whatsapp={course.advertisementWhatsapp}
        />
      )}
    </div>
  )
}

export default CourseDetail
