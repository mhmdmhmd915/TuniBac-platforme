import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Play, FileText, Download, ArrowLeft } from 'lucide-react'
import { coursesAPI } from '../services/api'
import { toAssetUrl } from '../lib/assets'
import { logger } from '../lib/logger'

const CourseDetail = () => {
  const { id } = useParams()
  const [course, setCourse] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

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

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  if (!course) return <div className="min-h-screen flex items-center justify-center">Course not found</div>
  const videoSource = course?.videoPath ? toAssetUrl(course.videoPath) : course?.videoUrl
  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
      <Link to="/courses" className="inline-flex items-center space-x-2 text-text-muted-light dark:text-text-muted hover:text-accent transition-colors">
        <ArrowLeft size={20} />
        <span>Back to Courses</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          <div className="aspect-video bg-black rounded-3xl overflow-hidden relative group">
            {videoSource ? (
              course.videoPath ? (
                <video src={videoSource} className="w-full h-full" controls />
              ) : (
                <iframe
                  src={videoSource}
                  className="w-full h-full"
                  allowFullScreen
                />
              )
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
                <Play size={64} className="text-accent" />
                <p className="text-text-muted-light dark:text-text-muted">Video Lesson Coming Soon</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <h1 className="text-4xl font-bold text-text-light dark:text-text">{course.title}</h1>
            <div className="flex flex-wrap gap-4">
              <span className="px-4 py-2 bg-accent/10 text-accent rounded-full text-sm font-bold">{course.subject.name}</span>
              <span className="px-4 py-2 bg-black/5 dark:bg-white/5 text-text-muted-light dark:text-text-muted rounded-full text-sm font-bold">{course.difficulty}</span>
              {course.tags.map((tag: string) => (
                <span key={tag} className="px-4 py-2 bg-black/5 dark:bg-white/5 text-text-muted-light dark:text-text-muted rounded-full text-sm">#{tag}</span>
              ))}
            </div>
            <p className="text-xl text-text-muted-light dark:text-text-muted leading-relaxed">
              {course.description}
            </p>
          </div>

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
        {/* Sidebar */}
        <div className="space-y-8">

          {/* Other Resources */}
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

          {/* Practice Exercises */}
          <div className="glass-morphism rounded-3xl p-8 space-y-6">
            <h3 className="text-xl font-bold text-text-light dark:text-text">
              Practice Exercises
            </h3>

            <p className="text-text-muted-light dark:text-text-muted text-sm">
              Test your knowledge with 20 exercises related to this course.
            </p>

            <Link
              to={`/exercises?subjectId=${course.subject.id}`}
              className="w-full flex items-center justify-center space-x-2 py-4 bg-accent text-primary rounded-2xl font-bold hover:scale-105 transition-all"
            >
              <span>Go to Exercises</span>
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}

export default CourseDetail
