export const OFFICIAL_BRAND = {
  name: 'TuniBac',
  shortName: 'TuniBac',
  title: 'TuniBac | Premium Bac Learning Platform',
  description:
    'TuniBac is a premium Bac learning platform for Tunisian students, with courses, exercises, planner tools, homework follow-up, and academic communication in one place.',
  siteUrl: 'https://www.tunibac.com',
  colors: {
    primaryBlue: '#0B5ED7',
    deepBlue: '#06295B',
    tunisianRed: '#E70013',
    white: '#FFFFFF',
    mist: '#F5F8FF',
    ink: '#0F172A',
  },
  assets: {
    logo: '/brand/tunibac-logo.svg',
    logoHorizontal: '/brand/tunibac-logo-horizontal.svg',
    logoIcon: '/brand/tunibac-logo-icon.svg',
    logoDark: '/brand/tunibac-logo-dark.svg',
    logoWhite: '/brand/tunibac-logo-white.svg',
    logoTransparent: '/brand/tunibac-logo-transparent.png',
    favicon16: '/brand/favicon-16.png',
    favicon32: '/brand/favicon-32.png',
    faviconIco: '/brand/favicon.ico',
    appIcon192: '/brand/tunibac-icon-192.png',
    appIcon512: '/brand/tunibac-icon-512.png',
    appleTouchIcon: '/brand/apple-touch-icon.png',
    ogImage: '/brand/tunibac-og-image.png',
    socialPreview: '/brand/tunibac-social-preview.png',
  },
} as const

export const BRAND_SETTING_DEFAULTS: Record<string, string> = {
  platformName: OFFICIAL_BRAND.name,
  platformLogo: OFFICIAL_BRAND.assets.logoHorizontal,
  platformFavicon: OFFICIAL_BRAND.assets.favicon32,
  primaryColor: OFFICIAL_BRAND.colors.primaryBlue,
  secondaryColor: OFFICIAL_BRAND.colors.tunisianRed,
  platformOfferLogo: OFFICIAL_BRAND.assets.logoHorizontal,
  platformOfferPrimaryColor: OFFICIAL_BRAND.colors.primaryBlue,
  platformOfferSecondaryColor: OFFICIAL_BRAND.colors.deepBlue,
  platformOfferAccentColor: OFFICIAL_BRAND.colors.tunisianRed,
}

export const isBundledBrandAsset = (value?: string | null) =>
  Boolean(value && (value.startsWith('/brand/') || value === '/manifest.webmanifest'))

export const getBrandTitle = (platformName?: string) => {
  const trimmed = String(platformName || '').trim()
  if (!trimmed || trimmed === OFFICIAL_BRAND.name) {
    return OFFICIAL_BRAND.title
  }
  return trimmed
}
