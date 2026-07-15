import { motion } from 'framer-motion'
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle,
  ClipboardList,
  Clock3,
  PenTool,
  Sparkles,
  Star,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { buildPlatformOffer } from '../constants/platformOffer'
import { usePlatformSettings } from '../context/PlatformSettingsContext'
import { toAssetUrl } from '../lib/assets'

const getCardIcon = (icon: string, title: string) => {
  const normalized = `${icon} ${title}`.toLowerCase()

  if (normalized.includes('exercise')) return PenTool
  if (normalized.includes('planner') || normalized.includes('calendar')) return ClipboardList
  if (normalized.includes('pomodoro') || normalized.includes('time')) return Clock3
  if (normalized.includes('brain') || normalized.includes('ai')) return Brain
  return BookOpen
}

const LandingPage = () => {
  const { settings } = usePlatformSettings()
  const offer = buildPlatformOffer(settings)
  const activePromotion =
    offer.promotions.find((promotion) => promotion.isActive) || offer.promotions[0] || null
  const heroImage =
    toAssetUrl(offer.bannerImage) ||
    'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=800'

  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center px-6 pt-20">
        {/* Animated Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full -z-10 overflow-hidden">
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0],
              opacity: [0.1, 0.2, 0.1]
            }}
            transition={{ duration: 20, repeat: Infinity }}
            className="absolute -top-1/4 -right-1/4 w-[600px] h-[600px] bg-accent/20 rounded-full blur-[100px]"
          />
          <motion.div
            animate={{ 
              scale: [1, 1.3, 1],
              rotate: [0, -90, 0],
              opacity: [0.1, 0.15, 0.1]
            }}
            transition={{ duration: 25, repeat: Infinity }}
            className="absolute -bottom-1/4 -left-1/4 w-[500px] h-[500px] bg-success/10 rounded-full blur-[100px]"
          />
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-full border border-accent/20 text-accent font-medium">
                <Sparkles size={16} />
                <span>{offer.subtitle}</span>
              </div>
              {activePromotion && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 text-emerald-400 font-medium">
                  <Star size={16} className="fill-current" />
                  <span>{activePromotion.badge || activePromotion.title}</span>
                </div>
              )}
            </div>
            <div className="space-y-5">
              {offer.logo && (
                <img
                  src={toAssetUrl(offer.logo)}
                  alt="Platform logo"
                  className="h-14 w-auto rounded-2xl object-contain"
                />
              )}
              <h1 className="text-5xl md:text-7xl font-bold leading-tight">
                {offer.title.split(' ').slice(0, -2).join(' ') || offer.title}
                <br />
                <span className="text-accent">
                  {offer.title.split(' ').slice(-2).join(' ') || offer.title}
                </span>
              </h1>
            </div>
            <p className="text-xl text-text-muted-light dark:text-text-muted max-w-xl">
              {offer.description}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/register" className="bg-accent text-primary px-8 py-4 rounded-xl font-bold text-lg flex items-center justify-center space-x-2 hover:scale-105 transition-transform">
                <span>{offer.buttonText}</span>
                <ArrowRight size={20} />
              </Link>
              <Link to="/courses" className="border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 px-8 py-4 rounded-xl font-bold text-lg text-center transition-all">
                Explore Courses
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {offer.features.slice(0, 3).map((feature) => (
                <div
                  key={feature}
                  className="rounded-2xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 px-4 py-4 text-sm font-medium text-text-light dark:text-text"
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle size={18} className="mt-0.5 text-success shrink-0" />
                    <span>{feature}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="glass-morphism p-4 rounded-3xl relative z-10">
              <img 
                src={heroImage}
                alt="Student learning" 
                className="rounded-2xl w-full h-auto"
              />
            </div>
            {/* Floating Stats Cards */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute -top-6 -right-6 glass-morphism p-6 rounded-2xl z-20"
            >
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-accent/20 rounded-xl text-accent">
                  <Star fill="currentColor" size={24} />
                </div>
                <div>
                  <div className="text-2xl font-bold">{offer.price}</div>
                  <div className="text-sm text-text-muted-light dark:text-text-muted">
                    {offer.oldPrice ? `Instead of ${offer.oldPrice}` : 'Student Offer'}
                  </div>
                </div>
              </div>
            </motion.div>

            {offer.discountPercentage && (
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 5, repeat: Infinity }}
                className="absolute -bottom-6 left-6 glass-morphism p-5 rounded-2xl z-20"
              >
                <div className="text-sm uppercase tracking-[0.2em] text-accent font-semibold">
                  Promotion
                </div>
                <div className="mt-2 text-3xl font-bold">{offer.discountPercentage}% OFF</div>
                <div className="text-sm text-text-muted-light dark:text-text-muted">
                  {activePromotion?.title || offer.promotionBadge}
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Offer Cards Section */}
      <section className="py-24 px-6 bg-secondary-light/30 dark:bg-secondary/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Why Students Join</h2>
            <p className="text-text-muted-light dark:text-text-muted">
              The same dynamic offer shown before registration also powers the landing page.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {offer.cards.map((card, idx) => {
              const Icon = getCardIcon(card.icon, card.title)
              return (
              <motion.div
                key={card.id || idx}
                whileHover={{ y: -10 }}
                className="glass-morphism p-8 rounded-3xl space-y-6 group cursor-pointer"
              >
                <div className="w-16 h-16 bg-accent/10 text-accent rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Icon />
                </div>
                <h3 className="text-2xl font-bold">{card.title}</h3>
                <ul className="space-y-3 text-text-muted-light dark:text-text-muted">
                  <li className="flex items-center space-x-2">
                    <CheckCircle size={16} className="text-success" />
                    <span>{card.description}</span>
                  </li>
                  {offer.features[idx] && (
                    <li className="flex items-center space-x-2">
                      <CheckCircle size={16} className="text-success" />
                      <span>{offer.features[idx]}</span>
                    </li>
                  )}
                  {offer.features[idx + 3] && (
                    <li className="flex items-center space-x-2">
                      <CheckCircle size={16} className="text-success" />
                      <span>{offer.features[idx + 3]}</span>
                    </li>
                  )}
                </ul>
                <Link to="/register" className="inline-flex items-center space-x-2 text-accent font-bold group-hover:translate-x-2 transition-transform">
                  <span>{offer.buttonText}</span>
                  <ArrowRight size={20} />
                </Link>
              </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto glass-morphism rounded-[40px] p-12 md:p-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
            {[
              { label: 'Active Students', value: '10K+' },
              { label: 'Study Hours', value: '50K+' },
              { label: 'Practice Tasks', value: '100K+' },
              { label: 'Success Rate', value: '98%' }
            ].map((stat, idx) => (
              <div key={idx} className="space-y-2">
                <div className="text-4xl md:text-5xl font-bold text-accent">{stat.value}</div>
                <div className="text-text-muted-light dark:text-text-muted">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default LandingPage
