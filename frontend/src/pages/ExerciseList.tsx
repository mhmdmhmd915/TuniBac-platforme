import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, ChevronRight, Calendar, FileText, ExternalLink, Play } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AccessGateModal from '../components/AccessGateModal'
import { useAuth } from '../context/AuthContext'
import { exercisesAPI, subjectsAPI } from '../services/api'
import { toAssetUrl } from '../lib/assets'
import { logger } from '../lib/logger'

interface Subject {
  id: string
  name: string
  color: string
}

const ExerciseList = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const [exercises, setExercises] = useState<any[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSubjectId, setSelectedSubjectId] = useState(searchParams.get('subjectId') || 'ALL')
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false)

  const withProtectedAccess = (action: () => void) => {
    if (!user) {
      setIsAccessModalOpen(true)
      return
    }

    if (user.role !== 'ADMIN' && user.status !== 'APPROVED') {
      navigate('/pending-approval')
      return
    }

    action()
  }

  useEffect(() => {
    let isCurrent = true

    const fetchExercises = async () => {
      setIsLoading(true)
      let shouldUpdateLoading = true
      try {
        const exercisesRes = await exercisesAPI.getAll({
          subjectId: selectedSubjectId !== 'ALL' ? selectedSubjectId : undefined,
          bacSection: user?.role === 'ADMIN' ? undefined : user?.bacSection,
        })
        if (!isCurrent) {
          shouldUpdateLoading = false
          return
        }
        setExercises(exercisesRes.data)
      } catch (err) {
        if (!isCurrent) {
          shouldUpdateLoading = false
          return
        }
        logger.error('Error fetching exercises', err)
      } finally {
        if (shouldUpdateLoading) {
          setIsLoading(false)
        }
      }
    }

    void fetchExercises()

    return () => {
      isCurrent = false
    }
  }, [selectedSubjectId, user?.bacSection, user?.role])

  useEffect(() => {
    let isCurrent = true

    const fetchSubjects = async () => {
      try {
        const subjectsRes = await subjectsAPI.getAll({
          activeOnly: true,
          bacSection: user?.role === 'ADMIN' ? undefined : user?.bacSection,
        })
        if (!isCurrent) return
        setSubjects(subjectsRes.data)
      } catch (err) {
        if (!isCurrent) return
        logger.error('Error fetching exercise subjects', err)
      }
    }

    void fetchSubjects()

    return () => {
      isCurrent = false
    }
  }, [user?.bacSection, user?.role])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getSubjectStyles = (color?: string) => {
    const subjectColor = color || '#3B82F6'
    return {
      color: subjectColor,
      borderColor: `${subjectColor}33`,
      backgroundColor: `${subjectColor}1A`
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    if (difficulty === 'BEGINNER') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    if (difficulty === 'INTERMEDIATE') return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    if (difficulty === 'ADVANCED') return 'bg-rose-500/10 text-rose-400 border-rose-500/20'
    return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
  }

  const getDifficultyLabel = (difficulty: string) => {
    if (difficulty === 'BEGINNER') return 'Beginner'
    if (difficulty === 'INTERMEDIATE') return 'Intermediate'
    if (difficulty === 'ADVANCED') return 'Advanced'
    return 'Beginner'
  }

  const getResourceBadges = (resources: any[]) => {
    if (!resources || resources.length === 0) return null

    const badges: any[] = []
    const seenTypes = new Set()

    resources.forEach(res => {
      const type = res.type?.toUpperCase() || 'WEBSITE'
      if (!seenTypes.has(type)) {
        seenTypes.add(type)
        
        let icon, label, color
        switch (type) {
          case 'PDF':
            icon = <FileText size={14} />
            label = 'PDF'
            color = 'bg-red-500/10 text-red-400 border-red-500/20'
            break
          case 'YOUTUBE':
            icon = <Play size={14} />
            label = 'YouTube'
            color = 'bg-orange-500/10 text-orange-400 border-orange-500/20'
            break
          case 'WEBSITE':
          default:
            icon = <ExternalLink size={14} />
            label = 'Website'
            color = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
        }
        badges.push({ icon, label, color, url: res.url, type })
      }
    })

    return badges
  }

  const handleViewProblem = (e: React.MouseEvent, ex: any) => {
    e.stopPropagation()
    const url = toAssetUrl(ex.contentUrl)
    if (url) {
      withProtectedAccess(() => window.open(url, '_blank', 'noopener,noreferrer'))
    }
  }

  const handleViewSolution = (e: React.MouseEvent, ex: any) => {
    e.stopPropagation()
    if (ex.corrections && ex.corrections.length > 0) {
      const correction = ex.corrections[0]
      const url = toAssetUrl(correction.contentUrl)
      if (url) {
        withProtectedAccess(() => window.open(url, '_blank', 'noopener,noreferrer'))
      }
    }
  }

  const hasProblem = (ex: any) => {
    return !!toAssetUrl(ex.contentUrl)
  }

  const hasSolution = (ex: any) => {
    if (!ex.corrections || ex.corrections.length === 0) return false
    return !!toAssetUrl(ex.corrections[0].contentUrl)
  }

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <header className="text-center space-y-6 mb-12">
          <div className="space-y-2">
            <div className="h-12 w-96 mx-auto bg-secondary-light/40 dark:bg-secondary/40 rounded-2xl animate-pulse" />
            <div className="h-5 w-80 mx-auto bg-secondary-light/40 dark:bg-secondary/40 rounded-xl animate-pulse" />
          </div>
          <div className="flex justify-center gap-2 sm:gap-3">
            {[1,2,3,4].map(n => (
              <div key={n} className="h-10 w-24 bg-secondary-light/40 dark:bg-secondary/40 rounded-full animate-pulse" />
            ))}
          </div>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {[1,2,3,4].map(n => (
            <div key={n} className="glass-morphism p-6 sm:p-8 rounded-3xl space-y-4">
              <div className="flex gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-secondary-light/50 dark:bg-secondary/50 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-20 rounded-full bg-secondary-light/50 dark:bg-secondary/50 animate-pulse" />
                  <div className="h-5 w-3/4 rounded-full bg-secondary-light/50 dark:bg-secondary/50 animate-pulse" />
                </div>
              </div>
              <div className="h-4 w-full rounded-full bg-secondary-light/50 dark:bg-secondary/50 animate-pulse" />
              <div className="h-10 sm:h-12 rounded-xl bg-secondary-light/50 dark:bg-secondary/50 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!exercises.length) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <header className="text-center space-y-6 mb-12">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-text-light dark:text-text">
              Practice Makes Perfect
            </h1>
            <p className="text-base sm:text-lg text-text-muted-light dark:text-text-muted max-w-2xl mx-auto leading-relaxed">
              Sharpen your skills with our curated collection of exercises and expert-verified solutions.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {['ALL', ...subjects.map((subject) => subject.id)].map((subj) => (
              <motion.button
                key={subj}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedSubjectId(subj)}
                className={`px-4 sm:px-6 py-3 rounded-full text-sm sm:text-base font-semibold transition-all duration-200 ${
                  selectedSubjectId === subj
                    ? 'bg-accent text-primary shadow-lg shadow-accent/25'
                    : 'bg-secondary-light/40 dark:bg-secondary/40 text-text-muted-light dark:text-text-muted hover:bg-secondary-light/60 dark:hover:bg-secondary/60 border border-black/5 dark:border-white/5'
                }`}
              >
                {subj === 'ALL' ? 'All' : subjects.find((subject) => subject.id === subj)?.name}
              </motion.button>
            ))}
          </div>
        </header>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 mb-6 rounded-full bg-secondary-light/30 dark:bg-secondary/30 flex items-center justify-center">
            <BookOpen size={40} className="text-text-muted-light dark:text-text-muted" />
          </div>
          <h3 className="text-xl font-semibold text-text-light dark:text-text mb-2">No exercises available yet</h3>
          <p className="text-text-muted-light dark:text-text-muted text-center max-w-sm">
            Check back soon for new practice materials!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      <AccessGateModal
        isOpen={isAccessModalOpen}
        onClose={() => setIsAccessModalOpen(false)}
        title="Access premium exercises and solutions"
      />

      <header className="text-center space-y-6 mb-12">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-text-light dark:text-text">
            Practice Makes Perfect
          </h1>
          <p className="text-base sm:text-lg text-text-muted-light dark:text-text-muted max-w-2xl mx-auto leading-relaxed">
            Sharpen your skills with our curated collection of exercises and expert-verified solutions.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
          {['ALL', ...subjects.map((subject) => subject.id)].map((subj) => (
            <motion.button
              key={subj}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedSubjectId(subj)}
              className={`px-4 sm:px-6 py-3 rounded-full text-sm sm:text-base font-semibold transition-all duration-200 ${
                selectedSubjectId === subj
                  ? 'bg-accent text-primary shadow-lg shadow-accent/25'
                  : 'bg-secondary-light/40 dark:bg-secondary/40 text-text-muted-light dark:text-text-muted hover:bg-secondary-light/60 dark:hover:bg-secondary/60 border border-black/5 dark:border-white/5'
              }`}
            >
              {subj === 'ALL' ? 'All' : subjects.find((subject) => subject.id === subj)?.name}
            </motion.button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {exercises.map((ex: any) => {
          const subjectColor = getSubjectStyles(ex.subject?.color)
          const difficultyColor = getDifficultyColor(ex.difficulty)
          const difficultyLabel = getDifficultyLabel(ex.difficulty)
          const resourceBadges = getResourceBadges(ex.resources)
          const problemAvailable = hasProblem(ex)
          const solutionAvailable = hasSolution(ex)

          return (
            <motion.div
              key={ex.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              whileHover={{ y: -6, scale: 1.01, transition: { duration: 0.2 } }}
              whileTap={{ scale: 0.99, transition: { duration: 0.1 } }}
              onClick={() =>
                withProtectedAccess(() => {
                  navigate(`/exercises/${ex.id}`)
                })
              }
              className="glass-morphism p-6 sm:p-7 rounded-3xl border border-black/5 dark:border-white/5 hover:border-accent/40 dark:hover:border-accent/40 transition-all duration-300 cursor-pointer"
            >
              <div className="flex items-start gap-4 sm:gap-5 mb-4 sm:mb-5">
                <div className="flex-shrink-0 p-3 sm:p-4 rounded-2xl border" style={subjectColor}>
                  <BookOpen size={24} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold border" style={subjectColor}>
                      {ex.subject.name}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${difficultyColor}`}>
                      {difficultyLabel}
                    </span>
                    {ex.createdAt && (
                      <span className="flex items-center gap-1 text-xs text-text-muted-light dark:text-text-muted">
                        <Calendar size={12} />
                        {formatDate(ex.createdAt)}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold text-text-light dark:text-text mb-1.5 leading-tight">
                    {ex.title}
                  </h3>

                  <p className="text-sm text-text-muted-light dark:text-text-muted line-clamp-2 mb-1.5">
                    {ex.description || 'Practice your skills with this specialized exercise.'}
                  </p>
                </div>
              </div>

              {resourceBadges && resourceBadges.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4 sm:mb-5">
                  {resourceBadges.map((badge, idx) => (
                    <motion.span
                      key={idx}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => {
                        e.stopPropagation()
                        const url = toAssetUrl(badge.url)
                        if (url) {
                          withProtectedAccess(() => window.open(url, '_blank', 'noopener,noreferrer'))
                        }
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.color} cursor-pointer hover:opacity-80 transition-opacity`}
                    >
                      {badge.icon}
                      {badge.label}
                    </motion.span>
                  ))}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <motion.button
                  whileHover={problemAvailable ? { scale: 1.03 } : { scale: 1 }}
                  whileTap={problemAvailable ? { scale: 0.97 } : { scale: 1 }}
                  onClick={(e) => handleViewProblem(e, ex)}
                  disabled={!problemAvailable}
                  className={`flex-1 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-semibold transition-all duration-250 border ${
                    problemAvailable
                      ? 'bg-secondary-light/40 dark:bg-secondary/40 text-text-light dark:text-text hover:bg-secondary-light/70 dark:hover:bg-secondary/70 border-black/5 dark:border-white/5 shadow-sm hover:shadow-md'
                      : 'bg-gray-500/20 text-gray-400 cursor-not-allowed border-gray-500/20'
                  }`}
                >
                  {problemAvailable ? 'View Problem' : 'No PDF Available'}
                </motion.button>
                <motion.button
                  whileHover={solutionAvailable ? { scale: 1.03 } : { scale: 1 }}
                  whileTap={solutionAvailable ? { scale: 0.97 } : { scale: 1 }}
                  onClick={(e) => handleViewSolution(e, ex)}
                  disabled={!solutionAvailable}
                  className={`flex-1 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-semibold transition-all duration-250 flex items-center justify-center gap-2 ${
                    solutionAvailable
                      ? 'bg-accent text-primary hover:bg-accent/90 hover:shadow-xl hover:shadow-accent/30'
                      : 'bg-gray-500/20 text-gray-400 cursor-not-allowed border border-gray-500/20'
                  }`}
                >
                  <span>{solutionAvailable ? 'View Solution' : 'No Solution'}</span>
                  {solutionAvailable && <ChevronRight size={16} />}
                </motion.button>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

export default ExerciseList
