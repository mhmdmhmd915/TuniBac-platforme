import { motion } from 'framer-motion'
import { ArrowRight, BadgePercent, CheckCircle2, Mail, MapPin, Phone, Sparkles, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { PlatformOfferData } from '../../constants/platformOffer'

interface PlatformOfferViewProps {
  offer: PlatformOfferData
  ctaHref: string
  ctaState?: unknown
  previewMode?: boolean
}

export const PlatformOfferView = ({
  offer,
  ctaHref,
  ctaState,
  previewMode = false,
}: PlatformOfferViewProps) => {
  const activePromotion =
    offer.promotions.find((promotion) => promotion.isActive) || offer.promotions[0] || null

  return (
    <div
      className="relative overflow-hidden"
      style={
        {
          '--offer-primary': offer.primaryColor,
          '--offer-secondary': offer.secondaryColor,
          '--offer-accent': offer.accentColor,
        } as React.CSSProperties
      }
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.18),_transparent_48%),radial-gradient(circle_at_bottom_right,_rgba(124,58,237,0.18),_transparent_40%),linear-gradient(180deg,rgba(2,6,23,0.98),rgba(15,23,42,0.96))]" />
      {offer.backgroundImage && (
        <div
          className="absolute inset-0 -z-20 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url(${offer.backgroundImage})` }}
        />
      )}

      <div className="mx-auto max-w-7xl px-6 py-12 sm:py-16 lg:px-8 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="flex flex-wrap items-center gap-3">
              {activePromotion && (
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
                  <BadgePercent size={16} className="text-[var(--offer-accent)]" />
                  <span>{activePromotion.badge || activePromotion.title}</span>
                </div>
              )}
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200">
                <Sparkles size={16} className="text-[var(--offer-accent)]" />
                <span>Premium Bac Experience</span>
              </div>
              {previewMode && (
                <div className="inline-flex items-center rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
                  Preview
                </div>
              )}
            </div>

            <div className="space-y-5">
              {offer.logo && (
                <img src={offer.logo} alt="Platform offer logo" className="h-14 w-auto rounded-2xl object-contain" />
              )}
              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-300">
                  {offer.subtitle}
                </p>
                <h1 className="mt-4 text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
                  {offer.title}
                </h1>
                <p className="mt-5 text-lg leading-8 text-slate-200 sm:text-xl">{offer.description}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <Link
                to={ctaHref}
                state={ctaState}
                className="inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-bold text-slate-950 transition-transform hover:scale-[1.01]"
                style={{ backgroundColor: offer.accentColor }}
              >
                <span>{offer.buttonText}</span>
                <ArrowRight size={18} />
              </Link>
              <a
                href="#offer-features"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-base font-semibold text-white transition-colors hover:bg-white/10"
              >
                Explore Features
              </a>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {offer.cards.map((card) => (
                <div key={card.id} className="rounded-[28px] border border-white/10 bg-white/8 p-5 backdrop-blur">
                  <div
                    className="inline-flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-bold text-white"
                    style={{ backgroundColor: `${offer.primaryColor}66` }}
                  >
                    {card.icon || 'Feature'}
                  </div>
                  <h2 className="mt-4 text-xl font-bold text-white">{card.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{card.description}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="space-y-6"
          >
            <div className="rounded-[32px] border border-white/10 bg-slate-950/70 p-6 shadow-2xl shadow-black/20 backdrop-blur">
              {offer.bannerImage && (
                <img
                  src={offer.bannerImage}
                  alt="Platform offer banner"
                  className="h-56 w-full rounded-[24px] object-cover"
                />
              )}

              <div className={`${offer.bannerImage ? 'mt-6' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">
                      Subscription
                    </p>
                    <div className="mt-3 flex items-end gap-3">
                      <div className="text-4xl font-black text-white">{offer.price}</div>
                      {offer.oldPrice && (
                        <div className="pb-1 text-lg text-slate-400 line-through">{offer.oldPrice}</div>
                      )}
                    </div>
                  </div>
                  {offer.promotionBadge && (
                    <div
                      className="rounded-2xl px-4 py-2 text-sm font-bold text-slate-950"
                      style={{ backgroundColor: offer.accentColor }}
                    >
                      {offer.promotionBadge}
                    </div>
                  )}
                </div>

                {offer.discountPercentage && (
                  <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-sm font-semibold text-emerald-200">
                    <Star size={14} className="fill-current" />
                    <span>{offer.discountPercentage}% savings available</span>
                  </div>
                )}

                <div id="offer-features" className="mt-8 rounded-[24px] border border-white/10 bg-white/5 p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Included Features
                  </p>
                  <div className="mt-4 grid gap-3">
                    {offer.features.map((feature, index) => (
                      <div key={`${feature}-${index}`} className="flex items-start gap-3 text-slate-100">
                        <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-300" />
                        <span className="leading-6">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {offer.notes.length > 0 && (
                  <div className="mt-6 rounded-[24px] border border-amber-300/15 bg-amber-300/10 p-5">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-100">
                      Important Notes
                    </p>
                    <div className="mt-4 grid gap-3 text-sm leading-6 text-amber-50">
                      {offer.notes.map((note, index) => (
                        <div key={`${note}-${index}`}>{note}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {(offer.contactPhone || offer.contactEmail || offer.contactAddress || offer.videoUrl) && (
              <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Need Help?
                </p>
                <div className="mt-4 grid gap-4 text-sm text-slate-200">
                  {offer.contactPhone && (
                    <div className="flex items-center gap-3">
                      <Phone size={18} className="text-[var(--offer-accent)]" />
                      <span>{offer.contactPhone}</span>
                    </div>
                  )}
                  {offer.contactEmail && (
                    <div className="flex items-center gap-3">
                      <Mail size={18} className="text-[var(--offer-accent)]" />
                      <span>{offer.contactEmail}</span>
                    </div>
                  )}
                  {offer.contactAddress && (
                    <div className="flex items-start gap-3">
                      <MapPin size={18} className="mt-0.5 text-[var(--offer-accent)]" />
                      <span>{offer.contactAddress}</span>
                    </div>
                  )}
                  {offer.videoUrl && (
                    <a
                      href={offer.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 font-semibold text-white underline decoration-white/30 underline-offset-4"
                    >
                      <ArrowRight size={16} />
                      <span>Watch the presentation video</span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
