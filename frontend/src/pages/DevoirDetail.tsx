import { useState, useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { FileText, Download, ArrowLeft, ExternalLink } from 'lucide-react'
import Breadcrumbs from '../components/Breadcrumbs'
import { devoirsAPI } from '../services/api'
import { toAssetUrl } from '../lib/assets'
import { sanitizeRichHtml } from '../lib/sanitizeHtml'
import { logger } from '../lib/logger'
import { ResponsiveVideoPlayer, isVideoAvailable } from '../components/ui/ResponsiveVideoPlayer'

const DevoirDetail = () => {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [devoir, setDevoir] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const fromLearningPath = (location.state as any)?.fromLearningPath === true

  useEffect(() => {
    const fetchDevoir = async () => {
      try {
        if (!id) {
          setIsLoading(false)
          return
        }

        const response = await devoirsAPI.getById(id)
        setDevoir(response.data)
      } catch (err) {
        logger.error('Error fetching devoir', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchDevoir()
  }, [id])

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  if (!devoir) return <div className="min-h-screen flex items-center justify-center">Devoir not found</div>
  const videoSource = devoir?.videoPath ? toAssetUrl(devoir.videoPath) : devoir?.videoUrl

  const goBack = () => {
    if (fromLearningPath) {
      navigate(-1)
      return
    }
    navigate(devoir?.subject?.id ? `/devoirs?subject=${devoir.subject.id}` : '/learning-path')
  }

  const crumbs = [
    { label: devoir.subject?.name || 'Devoirs', to: devoir?.subject?.id ? `/devoirs?subject=${devoir.subject.id}` : '/learning-path' },
    { label: devoir.title },
  ]

  const hasRichContent =
    (devoir.contentText && String(devoir.contentText).replace(/<[^>]*>/g, '').trim().length > 0) ||
    Boolean(devoir.externalLink)

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
      <button
        onClick={goBack}
        className="inline-flex items-center space-x-2 text-text-muted-light dark:text-text-muted hover:text-accent transition-colors"
      >
        <ArrowLeft size={20} />
        <span>{fromLearningPath ? 'Retour au parcours' : 'Back to Devoirs'}</span>
      </button>

      <Breadcrumbs crumbs={crumbs} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
            <ResponsiveVideoPlayer
              src={isVideoAvailable(videoSource) ? videoSource : null}
              title={`Vidéo du devoir - ${devoir.title || ''}`}
              className="rounded-3xl overflow-hidden shadow-[0_18px_40px_-20px_rgba(7,24,64,0.35)]"
            />

          <div className="space-y-6">
            <h1 className="text-4xl font-bold text-text-light dark:text-text">{devoir.title}</h1>
            <div className="flex flex-wrap gap-4">
              <span className="px-4 py-2 bg-accent/10 text-accent rounded-full text-sm font-bold">{devoir.subject.name}</span>
              <span className="px-4 py-2 bg-black/5 dark:bg-white/5 text-text-muted-light dark:text-text-muted rounded-full text-sm font-bold">{devoir.difficulty}</span>
              {devoir.tags?.map((tag: string) => (
                <span key={tag} className="px-4 py-2 bg-black/5 dark:bg-white/5 text-text-muted-light dark:text-text-muted rounded-full text-sm">#{tag}</span>
              ))}
            </div>
            <p className="text-xl text-text-muted-light dark:text-text-muted leading-relaxed">
              {devoir.description}
            </p>
          </div>

          {hasRichContent && (
            <div className="glass-morphism rounded-3xl p-8 space-y-6">
              <h2 className="text-2xl font-bold text-text-light dark:text-text">Le devoir</h2>
              {devoir.contentText && String(devoir.contentText).replace(/<[^>]*>/g, '').trim().length > 0 && (
                <div
                  className="prose max-w-none text-text-light dark:text-text"
                  dir="auto"
                  dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(devoir.contentText) }}
                />
              )}
              {devoir.externalLink && (
                <a
                  href={devoir.externalLink}
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

          {devoir.contentUrl && (
            <div className="glass-morphism rounded-3xl p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="text-accent" />
                  <div>
                    <h2 className="text-2xl font-bold text-text-light dark:text-text">
                      Devoir Material
                    </h2>
                    <p className="text-text-muted-light dark:text-text-muted">
                      Download the PDF devoir material.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const url = toAssetUrl(devoir.contentUrl)

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
          <div className="glass-morphism rounded-3xl p-8 space-y-6">
            <h3 className="text-xl font-bold text-text-light dark:text-text">
              Other Resources
            </h3>

            <div className="space-y-4">
              {devoir.resources?.length > 0 ? (
                devoir.resources.map((resource: any) => (
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
        </div>
      </div>
    </div>
  )
}

export default DevoirDetail
