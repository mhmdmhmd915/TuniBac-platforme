export type PlatformOfferCard = {
  id: string
  title: string
  description: string
  icon: string
  order: number
}

export type PlatformOfferPromotion = {
  id: string
  title: string
  badge: string
  description: string
  isActive: boolean
}

export type PlatformOfferData = {
  enabled: boolean
  title: string
  subtitle: string
  description: string
  price: string
  oldPrice: string
  discountPercentage: string
  promotionBadge: string
  buttonText: string
  backgroundImage: string
  bannerImage: string
  videoUrl: string
  logo: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  displayOrder: number
  features: string[]
  notes: string[]
  cards: PlatformOfferCard[]
  promotions: PlatformOfferPromotion[]
  contactPhone: string
  contactEmail: string
  contactAddress: string
}

export const PLATFORM_OFFER_SETTING_KEYS = [
  'platformOfferEnabled',
  'platformOfferTitle',
  'platformOfferSubtitle',
  'platformOfferDescription',
  'platformOfferPrice',
  'platformOfferOldPrice',
  'platformOfferDiscountPercentage',
  'platformOfferPromotionBadge',
  'platformOfferButtonText',
  'platformOfferBackgroundImage',
  'platformOfferBannerImage',
  'platformOfferVideoUrl',
  'platformOfferLogo',
  'platformOfferPrimaryColor',
  'platformOfferSecondaryColor',
  'platformOfferAccentColor',
  'platformOfferDisplayOrder',
  'platformOfferFeaturesJson',
  'platformOfferNotesJson',
  'platformOfferCardsJson',
  'platformOfferPromotionsJson',
] as const

const parseJson = <T>(value: string | undefined, fallback: T): T => {
  if (!value) return fallback

  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

const parseStringArray = (value: string | undefined, fallback: string[]) => {
  const parsed = parseJson<unknown[]>(value, fallback)
  if (!Array.isArray(parsed)) return fallback
  return parsed.map((item) => String(item ?? '').trim()).filter(Boolean)
}

const parseCards = (value: string | undefined): PlatformOfferCard[] => {
  const parsed = parseJson<unknown[]>(value, [])
  if (!Array.isArray(parsed)) return []

  return parsed
    .map((item, index) => {
      const candidate = item as Partial<PlatformOfferCard> | null
      return {
        id: String(candidate?.id || `card-${index + 1}`),
        title: String(candidate?.title || ''),
        description: String(candidate?.description || ''),
        icon: String(candidate?.icon || 'Feature'),
        order: Number(candidate?.order ?? index + 1),
      }
    })
    .filter((item) => item.title || item.description)
    .sort((left, right) => left.order - right.order)
}

const parsePromotions = (value: string | undefined): PlatformOfferPromotion[] => {
  const parsed = parseJson<unknown[]>(value, [])
  if (!Array.isArray(parsed)) return []

  return parsed
    .map((item, index) => {
      const candidate = item as Partial<PlatformOfferPromotion> | null
      return {
        id: String(candidate?.id || `promotion-${index + 1}`),
        title: String(candidate?.title || ''),
        badge: String(candidate?.badge || ''),
        description: String(candidate?.description || ''),
        isActive: candidate?.isActive === true,
      }
    })
    .filter((item) => item.title || item.badge || item.description)
}

export const buildPlatformOffer = (settings: Record<string, string>): PlatformOfferData => ({
  enabled: settings.platformOfferEnabled === 'true',
  title: settings.platformOfferTitle || "Join Tunisia's Best Bac Platform",
  subtitle: settings.platformOfferSubtitle || 'Everything you need to succeed in your Bac.',
  description:
    settings.platformOfferDescription ||
    'Access premium courses, exercises, planner tools, communication updates, and guided study resources in one platform.',
  price: settings.platformOfferPrice || '59 DT / Month',
  oldPrice: settings.platformOfferOldPrice || '79 DT',
  discountPercentage: settings.platformOfferDiscountPercentage || '25',
  promotionBadge: settings.platformOfferPromotionBadge || '25% OFF',
  buttonText: settings.platformOfferButtonText || 'Create My Account',
  backgroundImage: settings.platformOfferBackgroundImage || '',
  bannerImage: settings.platformOfferBannerImage || '',
  videoUrl: settings.platformOfferVideoUrl || '',
  logo: settings.platformOfferLogo || settings.platformLogo || '',
  primaryColor: settings.platformOfferPrimaryColor || '#2563EB',
  secondaryColor: settings.platformOfferSecondaryColor || '#7C3AED',
  accentColor: settings.platformOfferAccentColor || '#F59E0B',
  displayOrder: Number(settings.platformOfferDisplayOrder || '1'),
  features: parseStringArray(settings.platformOfferFeaturesJson, [
    'Unlimited Courses',
    'Unlimited Exercises',
    'Homework Correction',
    'Study Planner',
    'Pomodoro Timer',
    'Calendar',
    'Progress Tracking',
    'Resources',
    'Videos',
    'Communication Center',
    'Parascolaire',
  ]),
  notes: parseStringArray(settings.platformOfferNotesJson, [
    'Account access stays subject to administrator approval.',
    'All content is automatically filtered by the selected Bac Section.',
  ]),
  cards: parseCards(settings.platformOfferCardsJson).length
    ? parseCards(settings.platformOfferCardsJson)
    : [
        {
          id: 'courses',
          title: 'Premium Courses',
          description: 'Structured lessons and revisions for your Bac Section.',
          icon: 'Books',
          order: 1,
        },
        {
          id: 'exercises',
          title: 'Thousands of Exercises',
          description: 'Practice with guided solutions and section-specific content.',
          icon: 'Exercises',
          order: 2,
        },
        {
          id: 'planner',
          title: 'Smart Planner',
          description: 'Stay consistent with daily planning, progress, and reminders.',
          icon: 'Planner',
          order: 3,
        },
      ],
  promotions: parsePromotions(settings.platformOfferPromotionsJson),
  contactPhone: settings.contactPhone || '',
  contactEmail: settings.contactEmail || '',
  contactAddress: settings.contactAddress || '',
})

export const serializeStringArray = (items: string[]) =>
  JSON.stringify(items.map((item) => item.trim()).filter(Boolean))

export const serializeCards = (cards: PlatformOfferCard[]) =>
  JSON.stringify(
    cards.map((card, index) => ({
      ...card,
      title: card.title.trim(),
      description: card.description.trim(),
      icon: card.icon.trim(),
      order: Number(card.order ?? index + 1) || index + 1,
    }))
  )

export const serializePromotions = (promotions: PlatformOfferPromotion[]) =>
  JSON.stringify(
    promotions.map((promotion) => ({
      ...promotion,
      title: promotion.title.trim(),
      badge: promotion.badge.trim(),
      description: promotion.description.trim(),
      isActive: Boolean(promotion.isActive),
    }))
  )
