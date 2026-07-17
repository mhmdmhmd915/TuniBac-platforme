import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, Download, ExternalLink, FileText } from 'lucide-react'
import ProfessorAdvertisementCard from '../components/ProfessorAdvertisementCard'
import { toAssetUrl } from '../lib/assets'
import { logger } from '../lib/logger'
import { exercisesAPI } from '../services/api'

const ExerciseDetail = () => {
  const { id } = useParams()
  const [exercise, setExercise] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

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

  const problemUrl = useMemo(() => toAssetUrl(exercise?.contentUrl), [exercise?.contentUrl])
  const correctionUrl = useMemo(
    () => toAssetUrl(exercise?.corrections?.[0]?.contentUrl),
    [exercise?.corrections]
  )

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

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
      <Link
        to={exercise?.subject?.id ? `/exercises?subject=${exercise.subject.id}` : '/exercises'}
        className="inline-flex items-center space-x-2 text-text-muted-light dark:text-text-muted hover:text-accent transition-colors"
      >
        <ArrowLeft size={20} />
        <span>Back to Exercises</span>
      </Link>

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
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl font-bold text-text-light dark:text-text">
                {exercise.title}
              </h1>
              <p className="text-lg leading-relaxed text-text-muted-light dark:text-text-muted">
                {exercise.description || 'Practice this exercise and review the attached resources.'}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => downloadFile(problemUrl)}
                disabled={!problemUrl}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-4 font-semibold transition ${
                  problemUrl
                    ? 'bg-accent text-primary hover:scale-[1.01]'
                    : 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
                }`}
              >
                <FileText size={18} />
                <span>{problemUrl ? 'Download Problem PDF' : 'No Problem PDF'}</span>
              </button>

              <button
                type="button"
                onClick={() => downloadFile(correctionUrl)}
                disabled={!correctionUrl}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-4 font-semibold transition ${
                  correctionUrl
                    ? 'bg-secondary-light/60 dark:bg-secondary/60 text-text-light dark:text-text hover:bg-secondary-light/80 dark:hover:bg-secondary/80'
                    : 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Download size={18} />
                <span>{correctionUrl ? 'Download Correction' : 'No Correction Yet'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-8">
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
