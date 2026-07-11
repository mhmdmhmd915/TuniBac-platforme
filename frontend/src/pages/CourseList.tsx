import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, Book, Clock, Star, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import AccessGateModal from '../components/AccessGateModal'
import { useAuth } from '../context/AuthContext'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { logger } from '../lib/logger'
import { coursesAPI, subjectsAPI } from '../services/api'

const CourseList = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [courses, setCourses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false)
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300)

  const handleProtectedCourseAccess = (courseId: string) => {
    if (!user) {
      setIsAccessModalOpen(true)
      return
    }

    if (user.role !== 'ADMIN' && user.status !== 'APPROVED') {
      navigate('/pending-approval')
      return
    }

    navigate(`/courses/${courseId}`)
  }

  useEffect(() => {
    let isCurrent = true

    const fetchData = async () => {
      setIsLoading(true)
      let shouldUpdateLoading = true
      try {
        const coursesRes = await coursesAPI.getAll({
          subjectId: selectedSubjectId || undefined,
          search: debouncedSearchTerm,
          bacSection: user?.role === 'ADMIN' ? undefined : user?.bacSection,
        })
        if (!isCurrent) {
          shouldUpdateLoading = false
          return
        }
        setCourses(coursesRes.data)
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

    void fetchData()

    return () => {
      isCurrent = false
    }
  }, [debouncedSearchTerm, selectedSubjectId, user?.bacSection, user?.role])

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
        logger.error('Error fetching course subjects', err)
      }
    }

    void fetchSubjects()

    return () => {
      isCurrent = false
    }
  }, [user?.bacSection, user?.role])

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
      <AccessGateModal isOpen={isAccessModalOpen} onClose={() => setIsAccessModalOpen(false)} />

      <header className="space-y-6">
        <h1 className="text-4xl font-bold text-text-light dark:text-text">Explore Our Courses</h1>
        <div className="flex flex-col md:flex-row gap-4">
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
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedSubjectId(null)}
              className={`px-6 py-4 rounded-2xl font-bold transition-all ${
                selectedSubjectId === null
                  ? 'bg-accent text-primary'
                  : 'bg-secondary-light/50 dark:bg-secondary/50 border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              All
            </button>
            {subjects.map((subject: any) => (
              <button
                key={subject.id}
                onClick={() => setSelectedSubjectId(subject.id)}
                className={`px-6 py-4 rounded-2xl font-bold transition-all ${
                  selectedSubjectId === subject.id
                    ? 'text-primary'
                    : 'bg-secondary-light/50 dark:bg-secondary/50 border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
                style={{ backgroundColor: selectedSubjectId === subject.id ? subject.color : undefined }}
              >
                {subject.name}
              </button>
            ))}
          </div>
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
          {courses.map((course: any) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -10 }}
              onClick={() => handleProtectedCourseAccess(course.id)}
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
                    <Book size={18} />
                    <span>12 Lessons</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock size={18} />
                    <span>4.5 Hours</span>
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
    </div>
  )
}

export default CourseList
