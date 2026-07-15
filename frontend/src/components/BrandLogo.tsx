import { useEffect, useState } from 'react'
import { usePlatformSettings } from '../context/PlatformSettingsContext'
import { OFFICIAL_BRAND } from '../lib/brand'
import { toAssetUrl } from '../lib/assets'

type BrandLogoVariant = 'horizontal' | 'stacked' | 'icon'
type BrandLogoTheme = 'default' | 'dark' | 'white'

interface BrandLogoProps {
  variant?: BrandLogoVariant
  theme?: BrandLogoTheme
  className?: string
  alt?: string
}

const OFFICIAL_ASSET_BY_VARIANT: Record<BrandLogoVariant, Record<BrandLogoTheme, string>> = {
  horizontal: {
    default: OFFICIAL_BRAND.assets.logoHorizontal,
    dark: OFFICIAL_BRAND.assets.logoDark,
    white: OFFICIAL_BRAND.assets.logoWhite,
  },
  stacked: {
    default: OFFICIAL_BRAND.assets.logo,
    dark: OFFICIAL_BRAND.assets.logoDark,
    white: OFFICIAL_BRAND.assets.logoWhite,
  },
  icon: {
    default: OFFICIAL_BRAND.assets.logoIcon,
    dark: OFFICIAL_BRAND.assets.logoIcon,
    white: OFFICIAL_BRAND.assets.logoIcon,
  },
}

const BrandLogo = ({
  variant = 'horizontal',
  theme = 'default',
  className = '',
  alt,
}: BrandLogoProps) => {
  const { settings } = usePlatformSettings()
  const platformName = settings.platformName || OFFICIAL_BRAND.name
  const [fallbackToOfficial, setFallbackToOfficial] = useState(false)

  const officialAsset = OFFICIAL_ASSET_BY_VARIANT[variant][theme]
  const uploadedAsset =
    variant === 'horizontal' && theme === 'default' && settings.platformLogo
      ? toAssetUrl(settings.platformLogo)
      : ''

  useEffect(() => {
    setFallbackToOfficial(false)
  }, [uploadedAsset, officialAsset])

  const src = fallbackToOfficial ? officialAsset : uploadedAsset || officialAsset

  return (
    <img
      src={src}
      alt={alt || `${platformName} logo`}
      className={className}
      loading="eager"
      decoding="async"
      onError={() => setFallbackToOfficial(true)}
    />
  )
}

export default BrandLogo
