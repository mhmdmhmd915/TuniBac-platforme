import { Navigate, useLocation } from 'react-router-dom'
import { buildPlatformOffer } from '../constants/platformOffer'
import { usePlatformSettings } from '../context/PlatformSettingsContext'
import { PlatformOfferView } from '../components/platform-offer/PlatformOfferView'
import { toAssetUrl } from '../lib/assets'

const RegisterEntry = () => {
  const { settings, isLoading } = usePlatformSettings()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-6">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-accent" />
      </div>
    )
  }

  const offer = buildPlatformOffer(settings)

  if (!offer.enabled) {
    return <Navigate to="/register/form" replace state={location.state} />
  }

  return (
    <PlatformOfferView
      offer={{
        ...offer,
        backgroundImage: toAssetUrl(offer.backgroundImage),
        bannerImage: toAssetUrl(offer.bannerImage),
        logo: toAssetUrl(offer.logo),
        videoUrl: toAssetUrl(offer.videoUrl),
      }}
      ctaHref="/register/form"
      ctaState={location.state}
    />
  )
}

export default RegisterEntry
