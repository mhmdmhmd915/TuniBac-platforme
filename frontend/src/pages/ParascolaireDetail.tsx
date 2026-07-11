import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookOpen, FileText, ChevronLeft, ArrowUpRight } from 'lucide-react'
import AccessGateModal from '../components/AccessGateModal'
import { useAuth } from '../context/AuthContext'
import { logger } from '../lib/logger'
import { parascolairesAPI } from '../services/api'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const BACKEND_URL = API_BASE_URL.replace(/\/api$/, '')

const getFileUrl = (path: string | null | undefined): string => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `${BACKEND_URL}/${path.replace(/^\/+/, '')}`
}

const ParascolaireDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [parascolaire, setParascolaire] = useState<any>(null)
  const [related, setRelated] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false)

  const withProtectedPurchaseAccess = (action: () => void) => {
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
    const fetchParascolaire = async () => {
      if (!id) return
      setIsLoading(true)
      try {
        const response = await parascolairesAPI.getById(id)
        setParascolaire(response.data)
        
        // Fetch related (same category, excluding current)
        const allResponse = await parascolairesAPI.getAll({
          bacSection: user?.role === 'ADMIN' ? undefined : user?.bacSection,
        })
        const relatedItems = allResponse.data.filter(
          (p: any) => p.id !== id && p.category === response.data.category
        ).slice(0, 3)
        setRelated(relatedItems)
      } catch (err) {
        logger.error('Error fetching parascolaire', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchParascolaire()
  }, [id, user?.bacSection, user?.role])

  const handleDownloadPdf = () => {
    if (!parascolaire?.pdfUrl) return
    withProtectedPurchaseAccess(() => window.open(getFileUrl(parascolaire.pdfUrl), '_blank', 'noopener,noreferrer'))
  }

  const handleBuyPdf = () => {
    withProtectedPurchaseAccess(() => {
      alert('Redirecting to payment page for PDF...')
    })
  }

  const handleOrderPaper = () => {
    withProtectedPurchaseAccess(() => {
      if (parascolaire?.paperOrderUrl) {
        window.open(parascolaire.paperOrderUrl, '_blank', 'noopener,noreferrer')
      } else {
        alert('Redirecting to order page...')
      }
    })
  }

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="animate-pulse space-y-8">
          <div className="h-8 w-32 bg-secondary-light/40 dark:bg-secondary/40 rounded-xl" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 h-96 bg-secondary-light/40 dark:bg-secondary/40 rounded-3xl" />
            <div className="lg:col-span-2 space-y-4">
              <div className="h-10 w-3/4 bg-secondary-light/40 dark:bg-secondary/40 rounded-2xl" />
              <div className="h-4 w-1/2 bg-secondary-light/40 dark:bg-secondary/40 rounded-xl" />
              <div className="h-24 w-full bg-secondary-light/40 dark:bg-secondary/40 rounded-2xl" />
              <div className="h-12 w-1/3 bg-secondary-light/40 dark:bg-secondary/40 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!parascolaire) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="flex flex-col items-center justify-center py-20">
          <h3 className="text-xl font-semibold text-text-light dark:text-text mb-2">Parascolaire not found</h3>
          <button
            onClick={() => navigate('/parascolaires')}
            className="mt-4 px-6 py-3 rounded-full font-semibold bg-accent text-primary hover:bg-accent/90 transition-all"
          >
            Back to List
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      <AccessGateModal
        isOpen={isAccessModalOpen}
        onClose={() => setIsAccessModalOpen(false)}
        title="Create your account to unlock resources"
      />

      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => navigate('/parascolaires')}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary-light/40 dark:bg-secondary/40 text-text-light dark:text-text font-semibold hover:bg-secondary-light/70 dark:hover:bg-secondary/70 transition-all duration-200 mb-8"
      >
        <ChevronLeft size={18} />
        Back to List
      </motion.button>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
        {/* Cover Image */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="lg:col-span-1"
        >
          <div className="glass-morphism p-4 rounded-3xl border border-black/5 dark:border-white/5">
            <div className="rounded-2xl overflow-hidden bg-secondary-light/30 dark:bg-secondary/30 aspect-[3/4] flex items-center justify-center">
              {parascolaire.coverImage ? (
                <img
                  src={getFileUrl(parascolaire.coverImage)}
                  alt={parascolaire.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="p-12">
                  <BookOpen size={64} className="text-text-muted-light dark:text-text-muted" />
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Details */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="lg:col-span-2 space-y-6"
        >
          {/* Title and Badges */}
          <div className="glass-morphism p-6 sm:p-7 rounded-3xl border border-black/5 dark:border-white/5">
            <div className="flex flex-wrap gap-2 mb-4">
              {parascolaire.isFree && (
                <span className="px-3 py-1.5 rounded-full text-sm font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
                  Free
                </span>
              )}
              {parascolaire.hasPdf && (
                <span className="px-3 py-1.5 rounded-full text-sm font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  PDF
                </span>
              )}
              {parascolaire.hasPaperBook && (
                <span className="px-3 py-1.5 rounded-full text-sm font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  Paper Book
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-text-light dark:text-text mb-3">
              {parascolaire.title}
            </h1>

            {parascolaire.category && (
              <p className="text-lg text-text-muted-light dark:text-text-muted mb-4">
                Category: {parascolaire.category}
              </p>
            )}

            {parascolaire.description && (
              <p className="text-base sm:text-lg text-text-light dark:text-text leading-relaxed">
                {parascolaire.description}
              </p>
            )}
          </div>

          {/* Purchase Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* PDF Option */}
            {parascolaire.hasPdf && (
              <div className="glass-morphism p-6 rounded-3xl border border-black/5 dark:border-white/5">
                <div className="flex items-center gap-3 mb-4">
                  <FileText size={28} className="text-blue-400" />
                  <h3 className="text-xl font-bold text-text-light dark:text-text">PDF Version</h3>
                </div>

                {parascolaire.isFree ? (
                  <>
                    <p className="text-3xl font-bold text-green-400 mb-4">Free</p>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleDownloadPdf}
                      className="w-full px-6 py-3 rounded-xl text-sm sm:text-base font-semibold bg-accent text-primary hover:bg-accent/90 transition-all duration-250"
                    >
                      Download PDF
                    </motion.button>
                  </>
                ) : (
                  <>
                    <p className="text-3xl font-bold text-yellow-400 mb-4">{parascolaire.pdfPrice} TND</p>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleBuyPdf}
                      className="w-full px-6 py-3 rounded-xl text-sm sm:text-base font-semibold bg-accent text-primary hover:bg-accent/90 transition-all duration-250"
                    >
                      Buy PDF
                    </motion.button>
                  </>
                )}
              </div>
            )}

            {/* Paper Book Option */}
            {parascolaire.hasPaperBook && (
              <div className="glass-morphism p-6 rounded-3xl border border-black/5 dark:border-white/5">
                <div className="flex items-center gap-3 mb-4">
                  <BookOpen size={28} className="text-purple-400" />
                  <h3 className="text-xl font-bold text-text-light dark:text-text">Paper Book</h3>
                </div>

                <p className="text-3xl font-bold text-yellow-400 mb-4">{parascolaire.paperPrice} TND</p>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleOrderPaper}
                  className="w-full px-6 py-3 rounded-xl text-sm sm:text-base font-semibold bg-secondary-light/40 dark:bg-secondary/40 text-text-light dark:text-text hover:bg-secondary-light/70 dark:hover:bg-secondary/70 transition-all duration-250 border border-black/5 dark:border-white/5"
                >
                  Order Now
                </motion.button>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Related Parascolaires */}
      {related.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-text-light dark:text-text mb-6 flex items-center gap-2">
            <span className="text-accent">✨</span>
            Related Parascolaires
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {related.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/parascolaires/${p.id}`)}
                className="glass-morphism p-6 rounded-3xl border border-black/5 dark:border-white/5 hover:border-accent/30 dark:hover:border-accent/30 transition-all duration-300 cursor-pointer"
              >
                <h3 className="text-lg font-bold text-text-light dark:text-text mb-2 line-clamp-2">{p.title}</h3>
                <p className="text-sm text-text-muted-light dark:text-text-muted line-clamp-2 mb-3">{p.description}</p>
                <div className="flex items-center gap-2 text-accent font-semibold text-sm">
                  View Details <ArrowUpRight size={16} />
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default ParascolaireDetail
