import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
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

const getMinPrice = (parascolaire: any) => {
  const prices: number[] = []

  if (parascolaire.hasPdf && parascolaire.pdfPrice !== null && parascolaire.pdfPrice !== undefined) {
    prices.push(Number(parascolaire.pdfPrice))
  }

  if (parascolaire.hasPaperBook && parascolaire.paperPrice !== null && parascolaire.paperPrice !== undefined) {
    prices.push(Number(parascolaire.paperPrice))
  }

  return prices.length > 0 ? Math.min(...prices) : null
}

const ParascolairesList = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [parascolaires, setParascolaires] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchParascolaires = async () => {
      setIsLoading(true)
      try {
        const response = await parascolairesAPI.getAll({
          bacSection: user?.role === 'ADMIN' ? undefined : user?.bacSection,
        })
        setParascolaires(response.data)
      } catch (err) {
        logger.error('Error fetching parascolaires', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchParascolaires()
  }, [user?.bacSection, user?.role])

  const freeParascolaires = parascolaires.filter((p: any) => p.isFree)
  const premiumParascolaires = parascolaires.filter((p: any) => !p.isFree)

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <header className="text-center space-y-6 mb-12">
          <div className="space-y-2">
            <div className="h-12 w-96 mx-auto bg-secondary-light/40 dark:bg-secondary/40 rounded-2xl animate-pulse" />
            <div className="h-5 w-80 mx-auto bg-secondary-light/40 dark:bg-secondary/40 rounded-xl animate-pulse" />
          </div>
        </header>
        <div className="space-y-12">
          {[1, 2].map(section => (
            <div key={section}>
              <div className="h-8 w-48 bg-secondary-light/40 dark:bg-secondary/40 rounded-xl animate-pulse mb-6" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {[1, 2].map(n => (
                  <div key={n} className="glass-morphism p-6 sm:p-8 rounded-3xl space-y-4">
                    <div className="w-full h-40 bg-secondary-light/50 dark:bg-secondary/50 rounded-2xl animate-pulse" />
                    <div className="space-y-2">
                      <div className="h-5 w-3/4 rounded-full bg-secondary-light/50 dark:bg-secondary/50 animate-pulse" />
                      <div className="h-4 w-full rounded-full bg-secondary-light/50 dark:bg-secondary/50 animate-pulse" />
                    </div>
                    <div className="h-10 w-2/3 rounded-full bg-secondary-light/50 dark:bg-secondary/50 animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      <header className="text-center space-y-6 mb-12">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-text-light dark:text-text flex items-center justify-center gap-3">
            <BookOpen size={40} />
            Parascolaires
          </h1>
          <p className="text-base sm:text-lg text-text-muted-light dark:text-text-muted max-w-2xl mx-auto leading-relaxed">
            Complete collection of study materials to ace your bac exams.
          </p>
        </div>
      </header>

      {/* Free Parascolaires Section */}
      {freeParascolaires.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-text-light dark:text-text mb-6 flex items-center gap-2">
            <span className="text-green-400">🆓</span>
            Free Parascolaires
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {freeParascolaires.map((p: any) => (
              <ParascolaireCard key={p.id} parascolaire={p} navigate={navigate} getFileUrl={getFileUrl} />
            ))}
          </div>
        </section>
      )}

      {/* Premium Parascolaires Section */}
      {premiumParascolaires.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-text-light dark:text-text mb-6 flex items-center gap-2">
            <span className="text-yellow-400">💰</span>
            Premium Parascolaires
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {premiumParascolaires.map((p: any) => (
              <ParascolaireCard key={p.id} parascolaire={p} navigate={navigate} getFileUrl={getFileUrl} />
            ))}
          </div>
        </section>
      )}

      {!freeParascolaires.length && !premiumParascolaires.length && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 mb-6 rounded-full bg-secondary-light/30 dark:bg-secondary/30 flex items-center justify-center">
            <BookOpen size={40} className="text-text-muted-light dark:text-text-muted" />
          </div>
          <h3 className="text-xl font-semibold text-text-light dark:text-text mb-2">No parascolaires available yet</h3>
          <p className="text-text-muted-light dark:text-text-muted text-center max-w-sm">
            Check back soon for new study materials!
          </p>
        </div>
      )}
    </div>
  )
}

const ParascolaireCard = ({ parascolaire, navigate, getFileUrl }: any) => {
  const minPrice = getMinPrice(parascolaire)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      whileHover={{ y: -6, scale: 1.01, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.99, transition: { duration: 0.1 } }}
      onClick={() => navigate(`/parascolaires/${parascolaire.id}`)}
      className="glass-morphism p-6 sm:p-7 rounded-3xl border border-black/5 dark:border-white/5 hover:border-accent/40 dark:hover:border-accent/40 transition-all duration-300 cursor-pointer"
    >
      {/* Cover Image */}
      <div className="mb-4 sm:mb-5 rounded-2xl overflow-hidden bg-secondary-light/30 dark:bg-secondary/30 aspect-video flex items-center justify-center">
        {parascolaire.coverImage ? (
          <img
            src={getFileUrl(parascolaire.coverImage)}
            alt={parascolaire.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none'
              const fallback = document.createElement('div')
              fallback.className = 'w-full h-full flex items-center justify-center'
              fallback.innerHTML = `<div class="p-8"><BookOpen size={48} class="text-text-muted-light dark:text-text-muted" /></div>`
              const parent = (e.target as HTMLImageElement).parentNode
              if (parent) {
                parent.appendChild(fallback)
              }
            }}
          />
        ) : (
          <div className="p-8">
            <BookOpen size={48} className="text-text-muted-light dark:text-text-muted" />
          </div>
        )}
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2 mb-3 sm:mb-4">
        {parascolaire.isFree && (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
            Free
          </span>
        )}
        {parascolaire.hasPdf && (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            PDF
          </span>
        )}
        {parascolaire.hasPaperBook && (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            Paper Book
          </span>
        )}
        {!parascolaire.isFree && minPrice !== null && (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
            From {minPrice} TND
          </span>
        )}
      </div>

      {/* Title and Description */}
      <h3 className="text-lg sm:text-xl font-bold text-text-light dark:text-text mb-1.5 leading-tight">
        {parascolaire.title}
      </h3>
      <p className="text-sm text-text-muted-light dark:text-text-muted line-clamp-2 mb-4 sm:mb-5">
        {parascolaire.description || 'High-quality study material for bac preparation.'}
      </p>

      {/* View Details Button */}
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="w-full px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-semibold transition-all duration-250 bg-accent text-primary hover:bg-accent/90 hover:shadow-xl hover:shadow-accent/30 flex items-center justify-center gap-2"
      >
        <span>View Details</span>
        <ChevronRight size={16} />
      </motion.button>
    </motion.div>
  )
}

export default ParascolairesList
