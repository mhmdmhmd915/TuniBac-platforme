import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Atom,
  Book,
  BookOpen,
  Brain,
  Calculator,
  ChevronLeft,
  Clock,
  FileText,
  Filter,
  FlaskConical,
  Globe2,
  GraduationCap,
  Paperclip,
  PlayCircle,
  Search,
  Star,
  type LucideIcon,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BAC_SECTION_LABELS, type BacSection } from '../constants/bacSections'
import { useAuth } from '../context/AuthContext'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { logger } from '../lib/logger'
import { coursesAPI, subjectsAPI } from '../services/api'

type Subject = {
  id: string
  name: string
  description?: string | null
  bacSection: BacSection
  color?: string | null
  icon?: string | null
  order?: number
  isActive?: boolean
}

type Course = {
  id: string
  title: string
  description?: string | null
  contentUrl?: string | null
  videoUrl?: string | null
  videoPath?: string | null
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  tags?: string[]
  createdAt?: string
  updatedAt?: string
  subject?: Subject
  resources?: Array<{
    id: string
    title: string
    url: string
    type: string
    createdAt: string
  }>
}

const SUBJECT_ICON_MAP: Record<string, LucideIcon> = {
  calculator: Calculator,
  atom: Atom,
  'flask-conical': FlaskConical,
  book: Book,
  'book-open': BookOpen,
  globe: Globe2,
  brain: Brain,
}

const getSubjectIcon = (icon?: string | null) => SUBJECT_ICON_MAP[icon || 'book'] || GraduationCap

const getDifficultyLabel = (difficulty?: Course['difficulty']) => {
  if (difficulty === 'INTERMEDIATE') return 'Intermediate'
  if (difficulty === 'ADVANCED') return 'Advanced'
  return 'Beginner'
}

const getDifficultyClasses = (difficulty?: Course['difficulty']) => {
  if (difficulty === 'INTERMEDIATE') {
    return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
  }
  if (difficulty === 'ADVANCED') {
    return 'bg-rose-500/10 text-rose-400 border-rose-500/20'
  }
  return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
}

const getCourseAssets = (course: Course) => {
  const assets = []

  if (course.videoPath || course.videoUrl) {
    assets.push({
      key: 'video',
      label: 'Video',
      icon: PlayCircle,
      classes: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    })
  }

  if (course.contentUrl) {
    assets.push({
      key: 'pdf',
      label: 'PDF',
      icon: FileText,
      classes: 'bg-red-500/10 text-red-400 border-red-500/20',
    })
  }

  if ((course.resources?.length || 0) > 0) {
    assets.push({
      key: 'attachments',
      label: `${course.resources?.length || 0} Attachment${(course.resources?.length || 0) > 1 ? 's' : ''}`,
      icon: Paperclip,
      classes: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    })
  }

  return assets
}

const formatCourseCount = (count: number) => `${count} course${count === 1 ? '' : 's'}`

const CourseList = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState<'ALL' | 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>('ALL')
  const [assetFilter, setAssetFilter] = useState<'ALL' | 'VIDEO' | 'PDF' | 'ATTACHMENTS'>('ALL')
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300)
  const isAdmin = user?.role === 'ADMIN'
  const selectedSubjectId = searchParams.get('subject')

  const openCourse = (courseId: string) => {
    navigate(`/courses/${courseId}`)
  }

  useEffect(() => {
    if (!user || !isAdmin) {
      return
    }

    let isCurrent = true

    const fetchAdminCourses = async () => {
      setIsLoading(true)
      let shouldUpdateLoading = true
      try {
        const coursesRes = await coursesAPI.getAll({
          search: debouncedSearchTerm,
          bacSection: user?.role === 'ADMIN' ? undefined : user?.bacSection,
        })
        if (!isCurrent) {
          shouldUpdateLoading = false
          return
        }
        setCourses(coursesRes.data)
        setSubjects([])
      } catch (err) {
        if (!isCurrent) {
          shouldUpdateLoading = false
          return
        }
        logger.error('Error fetching courses', err)
      } finally {
        if (shouldUpdateLoading) {
          setIsLoading(false)
        }
      }
    }

    void fetchAdminCourses()

    return () => {
      isCurrent = false
    }
  }, [debouncedSearchTerm, isAdmin, user])

  useEffect(() => {
    if (!user || isAdmin) {
      return
    }

    let isCurrent = true

    const fetchStudentCatalog = async () => {
      setIsLoading(true)
      let shouldUpdateLoading = true

      try {
        const [subjectsRes, coursesRes] = await Promise.all([
          subjectsAPI.getAll({
            activeOnly: true,
            bacSection: user.bacSection,
          }),
          coursesAPI.getAll({
            bacSection: user.bacSection,
          }),
        ])

        if (!isCurrent) {
          shouldUpdateLoading = false
          return
        }

        setSubjects(subjectsRes.data)
        setCourses(coursesRes.data)
      } catch (err) {
        if (!isCurrent) {
          shouldUpdateLoading = false
          return
        }
        logger.error('Error fetching student course catalog', err)
      } finally {
        if (shouldUpdateLoading) {
          setIsLoading(false)
        }
      }
    }

    void fetchStudentCatalog()

    return () => {
      isCurrent = false
    }
  }, [isAdmin, user])

  const subjectsWithCounts = useMemo(
    () =>
      subjects.map((subject) => ({
        ...subject,
        courseCount: courses.filter((course) => course.subject?.id === subject.id).length,
      })),
    [courses, subjects]
  )

  const selectedSubject = useMemo(
    () => subjectsWithCounts.find((subject) => subject.id === selectedSubjectId) || null,
    [selectedSubjectId, subjectsWithCounts]
  )

  useEffect(() => {
    if (!selectedSubjectId || selectedSubject) {
      return
    }

    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('subject')
    setSearchParams(nextParams, { replace: true })
  }, [searchParams, selectedSubject, selectedSubjectId, setSearchParams])

  useEffect(() => {
    setSearchTerm('')
    setDifficultyFilter('ALL')
    setAssetFilter('ALL')
  }, [selectedSubjectId])

  const filteredStudentCourses = useMemo(() => {
    if (!selectedSubjectId) {
      return []
    }

    return courses
      .filter((course) => course.subject?.id === selectedSubjectId)
      .filter((course) => {
        if (!debouncedSearchTerm) {
          return true
        }

        const searchValue = debouncedSearchTerm.toLowerCase()
        return (
          course.title.toLowerCase().includes(searchValue) ||
          String(course.description || '')
            .toLowerCase()
            .includes(searchValue) ||
          (course.tags || []).some((tag) => tag.toLowerCase().includes(searchValue))
        )
      })
      .filter((course) => difficultyFilter === 'ALL' || course.difficulty === difficultyFilter)
      .filter((course) => {
        if (assetFilter === 'ALL') {
          return true
        }

        if (assetFilter === 'VIDEO') {
          return Boolean(course.videoPath || course.videoUrl)
        }

        if (assetFilter === 'PDF') {
          return Boolean(course.contentUrl)
        }

        return (course.resources?.length || 0) > 0
      })
  }, [assetFilter, courses, debouncedSearchTerm, difficultyFilter, selectedSubjectId])

  const selectSubject = (subjectId: string) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('subject', subjectId)
    setSearchParams(nextParams)
  }

  const clearSelectedSubject = () => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('subject')
    setSearchParams(nextParams)
  }

  const renderAdminCourses = () => (
    <>
      <header className="space-y-6">
        <h1 className="text-4xl font-bold text-text-light dark:text-text">Explore Our Courses</h1>
        <div className="relative flex-grow min-w-0">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-4 text-text-muted-light dark:text-text-muted">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Search courses, tags, or topics..."
            className="w-full bg-secondary-light/50 dark:bg-secondary/50 border border-black/10 dark:border-white/10 rounded-2xl py-4 pl-14 pr-4 text-text-light dark:text-text placeholder:text-text-muted-light dark:placeholder:text-text-muted focus:border-accent outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-80 bg-secondary-light/50 dark:bg-secondary/50 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map((course) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -10 }}
              onClick={() => openCourse(course.id)}
              className="glass-morphism rounded-[32px] overflow-hidden group cursor-pointer border border-black/10 dark:border-white/5 hover:border-accent/30 transition-all"
            >
              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="px-3 py-1 text-xs font-bold rounded-full text-primary"
                      style={{ backgroundColor: course.subject?.color || '#3b82f6' }}
                    >
                      {course.subject?.name}
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-text-muted-light dark:text-text-muted">
                      <Star size={16} className="text-accent" fill="currentColor" />
                      <span>4.9 (2.1k reviews)</span>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold line-clamp-1 text-text-light dark:text-text">{course.title}</h3>
                  <p className="text-text-muted-light dark:text-text-muted text-sm line-clamp-2">{course.description}</p>
                </div>

                <div className="flex items-center justify-between text-sm text-text-muted-light dark:text-text-muted">
                  <div className="flex items-center space-x-2">
                    <BookOpen size={18} />
                    <span>{getCourseAssets(course).length || 1} learning assets</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock size={18} />
                    <span>{new Date(course.updatedAt || course.createdAt || Date.now()).toLocaleDateString()}</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="w-full flex items-center justify-center space-x-2 py-4 bg-black/5 dark:bg-white/5 rounded-2xl font-bold group-hover:bg-accent group-hover:text-primary transition-all"
                >
                  <span>Start Learning</span>
                  <ArrowRight size={20} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {!isLoading && courses.length === 0 && (
        <div className="text-center py-20">
          <p className="text-text-muted-light dark:text-text-muted text-xl">No courses found matching your criteria.</p>
        </div>
      )}
    </>
  )

  const renderStudentSubjects = () => (
    <>
      <header className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Your Learning Space</p>
          <h1 className="text-4xl font-bold text-text-light dark:text-text">Choose Your Subject</h1>
          <p className="max-w-3xl text-base sm:text-lg text-text-muted-light dark:text-text-muted">
            Courses are organized by your Bac section, {BAC_SECTION_LABELS[user!.bacSection]}. Open a subject to explore only its courses.
          </p>
        </div>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-52 rounded-3xl bg-secondary-light/50 dark:bg-secondary/50 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {subjectsWithCounts.map((subject) => {
            const Icon = getSubjectIcon(subject.icon)

            return (
              <motion.button
                key={subject.id}
                type="button"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -6 }}
                onClick={() => selectSubject(subject.id)}
                className="text-left glass-morphism rounded-[28px] p-6 border border-black/10 dark:border-white/5 hover:border-accent/30 transition-all"
              >
                <div className="space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-2xl border"
                      style={{
                        color: subject.color || '#3b82f6',
                        borderColor: `${subject.color || '#3b82f6'}33`,
                        backgroundColor: `${subject.color || '#3b82f6'}1a`,
                      }}
                    >
                      <Icon size={26} />
                    </div>
                    <span className="rounded-full border border-black/10 dark:border-white/10 px-3 py-1 text-xs font-semibold text-text-muted-light dark:text-text-muted">
                      {formatCourseCount(subject.courseCount)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-text-light dark:text-text">{subject.name}</h2>
                    <p className="line-clamp-2 text-sm text-text-muted-light dark:text-text-muted">
                      {subject.description || `Browse ${subject.name} courses curated for your Bac section.`}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text-muted-light dark:text-text-muted">
                      {subject.courseCount > 0 ? 'Open subject' : 'No courses yet'}
                    </span>
                    <span
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/5 dark:bg-white/5 text-text-light dark:text-text"
                    >
                      <ArrowRight size={18} />
                    </span>
                  </div>
                </div>
              </motion.button>
            )
          })}
        </div>
      )}

      {!isLoading && subjectsWithCounts.length === 0 && (
        <div className="rounded-3xl border border-dashed border-black/10 dark:border-white/10 px-8 py-16 text-center">
          <p className="text-xl font-semibold text-text-light dark:text-text">No active subjects found for your section.</p>
          <p className="mt-2 text-text-muted-light dark:text-text-muted">
            Ask the admin to publish subjects and courses for your Bac section.
          </p>
        </div>
      )}
    </>
  )

  const renderStudentSubjectCourses = () => (
    <>
      <header className="space-y-6">
        <button
          type="button"
          onClick={clearSelectedSubject}
          className="inline-flex items-center gap-2 rounded-full border border-black/10 dark:border-white/10 px-4 py-2 text-sm font-medium text-text-muted-light dark:text-text-muted transition-colors hover:text-accent"
        >
          <ChevronLeft size={16} />
          Back to Subjects
        </button>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
              {BAC_SECTION_LABELS[user!.bacSection]}
            </p>
            <h1 className="text-4xl font-bold text-text-light dark:text-text">{selectedSubject?.name}</h1>
            <p className="max-w-3xl text-base sm:text-lg text-text-muted-light dark:text-text-muted">
              {selectedSubject?.description || `Explore all ${selectedSubject?.name} courses available in your Bac section.`}
            </p>
          </div>

          <div className="rounded-2xl border border-black/10 dark:border-white/10 px-4 py-3 text-sm font-semibold text-text-muted-light dark:text-text-muted">
            {formatCourseCount(filteredStudentCourses.length)}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_220px_220px]">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-text-muted-light dark:text-text-muted">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder={`Search inside ${selectedSubject?.name || 'this subject'}...`}
              className="w-full rounded-2xl border border-black/10 dark:border-white/10 bg-secondary-light/50 dark:bg-secondary/50 py-4 pl-12 pr-4 text-text-light dark:text-text placeholder:text-text-muted-light dark:placeholder:text-text-muted outline-none focus:border-accent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-black/10 dark:border-white/10 bg-secondary-light/50 dark:bg-secondary/50 px-4">
            <Filter size={18} className="text-text-muted-light dark:text-text-muted" />
            <select
              className="h-14 w-full bg-transparent text-sm font-medium text-text-light dark:text-text outline-none"
              value={difficultyFilter}
              onChange={(e) =>
                setDifficultyFilter(e.target.value as 'ALL' | 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED')
              }
            >
              <option value="ALL">All difficulties</option>
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
            </select>
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-black/10 dark:border-white/10 bg-secondary-light/50 dark:bg-secondary/50 px-4">
            <BookOpen size={18} className="text-text-muted-light dark:text-text-muted" />
            <select
              className="h-14 w-full bg-transparent text-sm font-medium text-text-light dark:text-text outline-none"
              value={assetFilter}
              onChange={(e) => setAssetFilter(e.target.value as 'ALL' | 'VIDEO' | 'PDF' | 'ATTACHMENTS')}
            >
              <option value="ALL">All assets</option>
              <option value="VIDEO">Video</option>
              <option value="PDF">PDF</option>
              <option value="ATTACHMENTS">Attachments</option>
            </select>
          </label>
        </div>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-72 rounded-3xl bg-secondary-light/50 dark:bg-secondary/50 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredStudentCourses.map((course) => {
            const assets = getCourseAssets(course)

            return (
              <motion.button
                key={course.id}
                type="button"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -6 }}
                onClick={() => openCourse(course.id)}
                className="text-left glass-morphism rounded-[28px] p-6 border border-black/10 dark:border-white/5 hover:border-accent/30 transition-all"
              >
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-full px-3 py-1 text-xs font-bold text-primary"
                      style={{ backgroundColor: course.subject?.color || '#3b82f6' }}
                    >
                      {course.subject?.name}
                    </span>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getDifficultyClasses(course.difficulty)}`}>
                      {getDifficultyLabel(course.difficulty)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h2 className="line-clamp-2 text-2xl font-bold text-text-light dark:text-text">{course.title}</h2>
                    <p className="line-clamp-3 text-sm text-text-muted-light dark:text-text-muted">
                      {course.description || 'Open this course to watch the lesson, read the PDF, and access attached resources.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {assets.length > 0 ? (
                      assets.map((asset) => {
                        const Icon = asset.icon
                        return (
                          <span
                            key={asset.key}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${asset.classes}`}
                          >
                            <Icon size={14} />
                            {asset.label}
                          </span>
                        )
                      })
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 dark:border-white/10 px-3 py-1 text-xs font-semibold text-text-muted-light dark:text-text-muted">
                        <BookOpen size={14} />
                        Course details
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm text-text-muted-light dark:text-text-muted">
                    <div className="flex items-center gap-2">
                      <Clock size={16} />
                      <span>{new Date(course.updatedAt || course.createdAt || Date.now()).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 font-semibold text-accent">
                      <span>Open Course</span>
                      <ArrowRight size={16} />
                    </div>
                  </div>
                </div>
              </motion.button>
            )
          })}
        </div>
      )}

      {!isLoading && filteredStudentCourses.length === 0 && (
        <div className="rounded-3xl border border-dashed border-black/10 dark:border-white/10 px-8 py-16 text-center">
          <p className="text-xl font-semibold text-text-light dark:text-text">No courses match this subject view.</p>
          <p className="mt-2 text-text-muted-light dark:text-text-muted">
            Try a different search or filter, or go back and pick another subject.
          </p>
        </div>
      )}
    </>
  )

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
      {isAdmin ? renderAdminCourses() : selectedSubject ? renderStudentSubjectCourses() : renderStudentSubjects()}
    </div>
  )
}

export default CourseList
