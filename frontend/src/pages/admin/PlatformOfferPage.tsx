import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Eye, Plus, Save, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { adminAPI } from '../../services/api'
import { AdminCard } from '../../components/admin/AdminCard'
import { SectionTitle } from '../../components/admin/SectionTitle'
import { SuccessToast } from '../../components/admin/SuccessToast'
import { PrimaryButton } from '../../components/admin/PrimaryButton'
import { ActionButton } from '../../components/admin/ActionButton'
import { ImageUploader } from '../../components/admin/ImageUploader'
import { VideoUploader } from '../../components/admin/VideoUploader'
import {
  buildPlatformOffer,
  PLATFORM_OFFER_SETTING_KEYS,
  serializeCards,
  serializePromotions,
  serializeStringArray,
  type PlatformOfferCard,
  type PlatformOfferPromotion,
} from '../../constants/platformOffer'
import { PlatformOfferView } from '../../components/platform-offer/PlatformOfferView'

type ToastType = 'success' | 'error' | 'warning'
type AppSetting = { key: string; value: string }

const BACKEND_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(
  /\/api$/,
  ''
)

const toAssetUrl = (value?: string | null) => {
  if (!value) return ''
  if (value.startsWith('http')) return value
  return `${BACKEND_URL}/${value.replace(/^\/+/, '')}`
}

const toRelativeAsset = (value: string) => value.replace(BACKEND_URL, '')

const getErrorMessage = (error: unknown) => {
  if (typeof error === 'object' && error && 'response' in error) {
    const candidate = error as { response?: { data?: { message?: string } }; message?: string }
    return candidate.response?.data?.message || candidate.message || 'Something went wrong'
  }

  return error instanceof Error ? error.message : 'Something went wrong'
}

const createCard = (order: number): PlatformOfferCard => ({
  id: `card-${Date.now()}-${order}`,
  title: '',
  description: '',
  icon: 'Feature',
  order,
})

const createPromotion = (): PlatformOfferPromotion => ({
  id: `promotion-${Date.now()}`,
  title: '',
  badge: '',
  description: '',
  isActive: false,
})

const PlatformOfferPage = () => {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})
  const [features, setFeatures] = useState<string[]>([])
  const [notes, setNotes] = useState<string[]>([])
  const [cards, setCards] = useState<PlatformOfferCard[]>([])
  const [promotions, setPromotions] = useState<PlatformOfferPromotion[]>([])
  const [toast, setToast] = useState<{ open: boolean; type: ToastType; message: string }>({
    open: false,
    type: 'success',
    message: '',
  })

  const showToast = (type: ToastType, message: string) => {
    setToast({ open: true, type, message })
  }

  useEffect(() => {
    if (!toast.open) return undefined
    const timer = window.setTimeout(() => setToast((previous) => ({ ...previous, open: false })), 3000)
    return () => window.clearTimeout(timer)
  }, [toast.open, toast.message])

  const setValue = (key: string, value: string) => {
    setValues((previous) => ({ ...previous, [key]: value }))
  }

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await adminAPI.getSettings()
      const map: Record<string, string> = {}
      ;((response.data || []) as AppSetting[]).forEach((item) => {
        map[item.key] = String(item.value ?? '')
      })
      setValues(map)
      const offer = buildPlatformOffer(map)
      setFeatures(offer.features)
      setNotes(offer.notes)
      setCards(offer.cards)
      setPromotions(offer.promotions)
    } catch (error) {
      showToast('error', getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const previewOffer = useMemo(
    () =>
      buildPlatformOffer({
        ...values,
        platformOfferFeaturesJson: serializeStringArray(features),
        platformOfferNotesJson: serializeStringArray(notes),
        platformOfferCardsJson: serializeCards(cards),
        platformOfferPromotionsJson: serializePromotions(promotions),
      }),
    [cards, features, notes, promotions, values]
  )

  const saveAll = async () => {
    try {
      setSaving(true)
      const items = [
        ...PLATFORM_OFFER_SETTING_KEYS.map((key) => ({
          key,
          value:
            key === 'platformOfferFeaturesJson'
              ? serializeStringArray(features)
              : key === 'platformOfferNotesJson'
              ? serializeStringArray(notes)
              : key === 'platformOfferCardsJson'
              ? serializeCards(cards)
              : key === 'platformOfferPromotionsJson'
              ? serializePromotions(promotions)
              : values[key] ?? '',
        })),
        { key: 'contactPhone', value: values.contactPhone ?? '' },
        { key: 'contactEmail', value: values.contactEmail ?? '' },
        { key: 'contactAddress', value: values.contactAddress ?? '' },
      ]
      await adminAPI.updateSettings(items)
      showToast('success', 'Platform offer updated')
      await fetchSettings()
    } catch (error) {
      showToast('error', getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 pb-28 sm:px-6 lg:px-8">
      <SuccessToast
        isVisible={toast.open}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast((previous) => ({ ...previous, open: false }))}
      />

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <SectionTitle
          title="Platform Offer"
          subtitle="Dynamic pre-registration sales page fully managed from the admin panel"
        />
        <div className="flex flex-wrap gap-3">
          <ActionButton tone="neutral" onClick={() => navigate('/admin')} icon={<ArrowLeft size={16} />}>
            Back to Admin
          </ActionButton>
          <ActionButton tone="neutral" onClick={() => window.open('/register', '_blank')} icon={<Eye size={16} />}>
            Preview Public Page
          </ActionButton>
          <PrimaryButton onClick={saveAll} disabled={saving || loading} icon={<Save size={16} />}>
            {saving ? 'Saving...' : 'Save Offer'}
          </PrimaryButton>
        </div>
      </div>

      {loading ? (
        <AdminCard className="p-10">
          <div className="flex items-center justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#0B5ED7]" />
          </div>
        </AdminCard>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <AdminCard className="p-6 sm:p-8">
              <SectionTitle title="Visibility & Pricing" subtitle="Enable the offer and control the commercial message" />
              <div className="mt-6 grid gap-5">
                <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-4 dark:bg-white/5">
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">Offer Enabled</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      If disabled, visitors go directly to the registration form.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setValue(
                        'platformOfferEnabled',
                        values.platformOfferEnabled === 'true' ? 'false' : 'true'
                      )
                    }
                    className={`h-7 w-12 rounded-full transition-colors ${
                      values.platformOfferEnabled === 'true'
                        ? 'bg-emerald-500'
                        : 'bg-gray-300 dark:bg-white/10'
                    }`}
                  >
                    <div
                      className={`h-6 w-6 rounded-full bg-white shadow transition-transform ${
                        values.platformOfferEnabled === 'true' ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="border-b border-black/5 pb-4 dark:border-white/5">
                    <div className="mb-3 flex items-baseline justify-between">
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">Offer Content</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Main headline and description shown on the landing page</div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="block space-y-1.5">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Main Title</span>
                        <input
                          value={values.platformOfferTitle || ''}
                          onChange={(e) => setValue('platformOfferTitle', e.target.value)}
                          className="w-full rounded-2xl bg-gray-50 px-4 py-2.5 dark:bg-white/5"
                          placeholder="e.g. Prépa Bac 2025 — TuniBac Premium"
                        />
                      </label>
                      <label className="block space-y-1.5">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Subtitle</span>
                        <input
                          value={values.platformOfferSubtitle || ''}
                          onChange={(e) => setValue('platformOfferSubtitle', e.target.value)}
                          className="w-full rounded-2xl bg-gray-50 px-4 py-2.5 dark:bg-white/5"
                          placeholder="Supporting line under the main title"
                        />
                      </label>
                      <label className="block space-y-1.5">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</span>
                        <textarea
                          rows={4}
                          value={values.platformOfferDescription || ''}
                          onChange={(e) => setValue('platformOfferDescription', e.target.value)}
                          className="w-full rounded-2xl bg-gray-50 px-4 py-2.5 dark:bg-white/5"
                          placeholder="Longer paragraph describing what's included in the offer"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="mb-3 flex items-baseline justify-between">
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">Pricing & CTA</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Price point, discount badge, and call-to-action button</div>
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="block space-y-1.5">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Price</span>
                        <input
                          value={values.platformOfferPrice || ''}
                          onChange={(e) => setValue('platformOfferPrice', e.target.value)}
                          className="w-full rounded-2xl bg-gray-50 px-4 py-2.5 dark:bg-white/5"
                          placeholder="e.g. 120 DT"
                        />
                      </label>
                      <label className="block space-y-1.5">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Old Price (strikethrough)</span>
                        <input
                          value={values.platformOfferOldPrice || ''}
                          onChange={(e) => setValue('platformOfferOldPrice', e.target.value)}
                          className="w-full rounded-2xl bg-gray-50 px-4 py-2.5 dark:bg-white/5"
                          placeholder="e.g. 180 DT"
                        />
                      </label>
                      <label className="block space-y-1.5">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Discount Percentage</span>
                        <input
                          value={values.platformOfferDiscountPercentage || ''}
                          onChange={(e) => setValue('platformOfferDiscountPercentage', e.target.value)}
                          className="w-full rounded-2xl bg-gray-50 px-4 py-2.5 dark:bg-white/5"
                          placeholder="e.g. 33"
                        />
                      </label>
                      <label className="block space-y-1.5">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Promotion Badge</span>
                        <input
                          value={values.platformOfferPromotionBadge || ''}
                          onChange={(e) => setValue('platformOfferPromotionBadge', e.target.value)}
                          className="w-full rounded-2xl bg-gray-50 px-4 py-2.5 dark:bg-white/5"
                          placeholder="e.g. OFFRE LIMITÉE"
                        />
                      </label>
                      <label className="block space-y-1.5">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">CTA Button Text</span>
                        <input
                          value={values.platformOfferButtonText || ''}
                          onChange={(e) => setValue('platformOfferButtonText', e.target.value)}
                          className="w-full rounded-2xl bg-gray-50 px-4 py-2.5 dark:bg-white/5"
                          placeholder="e.g. Réserver ma place"
                        />
                      </label>
                      <label className="block space-y-1.5">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Display Order</span>
                        <input
                          type="number"
                          value={values.platformOfferDisplayOrder || '1'}
                          onChange={(e) => setValue('platformOfferDisplayOrder', e.target.value)}
                          className="w-full rounded-2xl bg-gray-50 px-4 py-2.5 dark:bg-white/5"
                          placeholder="e.g. 1"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </AdminCard>

            <AdminCard className="p-6 sm:p-8">
              <SectionTitle title="Media & Theme" subtitle="Upload offer assets and adjust colors" />
              <div className="mt-6 grid gap-6">
                <div className="border-b border-black/5 pb-5 dark:border-white/5">
                  <div className="mb-4">
                    <div className="font-semibold text-gray-900 dark:text-white">Images & Video</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Upload visual assets for the offer page hero area</div>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Background Image</span>
                      <ImageUploader
                        value={toAssetUrl(values.platformOfferBackgroundImage)}
                        onChange={(url) => setValue('platformOfferBackgroundImage', toRelativeAsset(url))}
                        onUpload={async (file) => {
                          const response = await adminAPI.uploadSettingAsset('offer-background', file)
                          return toAssetUrl(String(response.data.fileUrl || ''))
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Banner Image</span>
                      <ImageUploader
                        value={toAssetUrl(values.platformOfferBannerImage)}
                        onChange={(url) => setValue('platformOfferBannerImage', toRelativeAsset(url))}
                        onUpload={async (file) => {
                          const response = await adminAPI.uploadSettingAsset('offer-banner', file)
                          return toAssetUrl(String(response.data.fileUrl || ''))
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Offer Logo</span>
                      <ImageUploader
                        value={toAssetUrl(values.platformOfferLogo)}
                        onChange={(url) => setValue('platformOfferLogo', toRelativeAsset(url))}
                        onUpload={async (file) => {
                          const response = await adminAPI.uploadSettingAsset('offer-logo', file)
                          return toAssetUrl(String(response.data.fileUrl || ''))
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Offer Video</span>
                      <VideoUploader
                        value={toAssetUrl(values.platformOfferVideoUrl)}
                        onChange={(url) => setValue('platformOfferVideoUrl', toRelativeAsset(url))}
                        onUpload={async (file, options) => {
                          const response = await adminAPI.uploadSettingAsset('offer-video', file, options)
                          return toAssetUrl(String(response.data.fileUrl || ''))
                        }}
                        placeholder="Upload optional offer video directly to Cloudflare R2"
                      />
                      <label className="block space-y-1.5 pt-1">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Video URL (or paste path)</span>
                        <input
                          value={values.platformOfferVideoUrl || ''}
                          onChange={(e) => setValue('platformOfferVideoUrl', e.target.value)}
                          className="w-full rounded-2xl bg-gray-50 px-4 py-2.5 dark:bg-white/5"
                          placeholder="e.g. /uploads/offer-video.mp4 or https://..."
                        />
                      </label>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <div className="mb-1">
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                          فيديو كيفاش تستعمل TuniBac؟
                        </span>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          فيديو تعليمي على YouTube يظهر في صفحة العرض كيفاش يستفيد الطالب من المنصة
                        </p>
                      </div>
                      <label className="block space-y-1.5">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          YouTube Video URL
                        </span>
                        <input
                          value={values.platformOfferYouTubeUrl || ''}
                          onChange={(e) => setValue('platformOfferYouTubeUrl', e.target.value.trim())}
                          className="w-full rounded-2xl bg-gray-50 px-4 py-2.5 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-[#0B5ED7]/40"
                          placeholder="https://www.youtube.com/watch?v=..."
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Supports: youtube.com/watch?v=, youtu.be/, /shorts/, /embed/ liens
                        </p>
                      </label>
                      {values.platformOfferYouTubeUrl && (
                        <div className="mt-2 rounded-2xl overflow-hidden border border-blue-100 bg-blue-50/40">
                          <div className="px-4 py-2 flex items-center justify-between border-b border-blue-100">
                            <span className="text-xs font-semibold text-[#071840]">Aperçu vidéo</span>
                            <button
                              type="button"
                              onClick={() => setValue('platformOfferYouTubeUrl', '')}
                              className="text-xs font-medium text-rose-600 hover:text-rose-700"
                            >
                              Supprimer
                            </button>
                          </div>
                          <div className="aspect-video bg-black">
                            {(() => {
                              const src = values.platformOfferYouTubeUrl || ''
                              const isYt = /youtube|youtu\.be/.test(src)
                              if (!isYt) return (
                                <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 p-4 text-center">
                                  Collez un lien YouTube valide pour afficher l'aperçu
                                </div>
                              )
                              const idMatch = src.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/)
                              const id = idMatch?.[1]
                              if (!id) return (
                                <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 p-4 text-center">
                                  ID vidéo introuvable dans ce lien
                                </div>
                              )
                              return (
                                <iframe
                                  src={`https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`}
                                  title="How-To preview"
                                  className="w-full h-full"
                                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                  loading="lazy"
                                />
                              )
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-1">
                  <div className="mb-4">
                    <div className="font-semibold text-gray-900 dark:text-white">Theme Colors</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Match the offer page to your brand palette</div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Primary Color</span>
                      <input
                        type="color"
                        value={values.platformOfferPrimaryColor || '#0B5ED7'}
                        onChange={(e) => setValue('platformOfferPrimaryColor', e.target.value)}
                        className="h-14 w-full rounded-2xl bg-gray-50 px-3 py-2 dark:bg-white/5"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Secondary Color</span>
                      <input
                        type="color"
                        value={values.platformOfferSecondaryColor || '#06295B'}
                        onChange={(e) => setValue('platformOfferSecondaryColor', e.target.value)}
                        className="h-14 w-full rounded-2xl bg-gray-50 px-3 py-2 dark:bg-white/5"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Accent Color</span>
                      <input
                        type="color"
                        value={values.platformOfferAccentColor || '#E70013'}
                        onChange={(e) => setValue('platformOfferAccentColor', e.target.value)}
                        className="h-14 w-full rounded-2xl bg-gray-50 px-3 py-2 dark:bg-white/5"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </AdminCard>

            <AdminCard className="p-6 sm:p-8">
              <SectionTitle title="Features & Notes" subtitle="Control the list of included benefits and important notes" />
              <div className="mt-6 space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">Features List</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Bullet-point benefits shown under the pricing card</div>
                    </div>
                    <ActionButton tone="neutral" onClick={() => setFeatures((previous) => [...previous, ''])} icon={<Plus size={16} />}>
                      Add Feature
                    </ActionButton>
                  </div>
                  <div className="space-y-2.5">
                    {features.map((feature, index) => (
                      <div key={`feature-${index}`} className="flex gap-3 items-start pt-1">
                        <label className="pt-2.5 shrink-0 text-xs font-semibold text-gray-400 dark:text-gray-500 w-8 text-center">
                          #{index + 1}
                        </label>
                        <input
                          value={feature}
                          onChange={(e) =>
                            setFeatures((previous) =>
                              previous.map((item, itemIndex) => (itemIndex === index ? e.target.value : item))
                            )
                          }
                          className="w-full rounded-2xl bg-gray-50 px-4 py-2.5 dark:bg-white/5"
                          placeholder={`e.g. Accès illimité à tous les cours Bac ${index + 1}`}
                        />
                        <ActionButton
                          tone="danger"
                          onClick={() => setFeatures((previous) => previous.filter((_, itemIndex) => itemIndex !== index))}
                          icon={<Trash2 size={16} />}
                          className="shrink-0 mt-0.5"
                        >
                          Remove
                        </ActionButton>
                      </div>
                    ))}
                    {features.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-black/10 px-4 py-5 text-center text-sm text-gray-500 dark:border-white/10 dark:text-gray-400">
                        No features added yet — click "Add Feature" above to start.
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">Important Notes</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Fine print / caveats shown under a dedicated notes section</div>
                    </div>
                    <ActionButton tone="neutral" onClick={() => setNotes((previous) => [...previous, ''])} icon={<Plus size={16} />}>
                      Add Note
                    </ActionButton>
                  </div>
                  <div className="space-y-2.5">
                    {notes.map((note, index) => (
                      <div key={`note-${index}`} className="flex gap-3 items-start pt-1">
                        <label className="pt-2.5 shrink-0 text-xs font-semibold text-gray-400 dark:text-gray-500 w-8 text-center">
                          #{index + 1}
                        </label>
                        <input
                          value={note}
                          onChange={(e) =>
                            setNotes((previous) =>
                              previous.map((item, itemIndex) => (itemIndex === index ? e.target.value : item))
                            )
                          }
                          className="w-full rounded-2xl bg-gray-50 px-4 py-2.5 dark:bg-white/5"
                          placeholder={`e.g. Offre valable jusqu'au 31 décembre ${index + 1}`}
                        />
                        <ActionButton
                          tone="danger"
                          onClick={() => setNotes((previous) => previous.filter((_, itemIndex) => itemIndex !== index))}
                          icon={<Trash2 size={16} />}
                          className="shrink-0 mt-0.5"
                        >
                          Remove
                        </ActionButton>
                      </div>
                    ))}
                    {notes.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-black/10 px-4 py-5 text-center text-sm text-gray-500 dark:border-white/10 dark:text-gray-400">
                        No notes added yet — click "Add Note" to include fine print.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </AdminCard>

            <AdminCard className="p-6 sm:p-8">
              <div className="flex items-start justify-between flex-col sm:flex-row sm:items-center gap-3">
                <SectionTitle title="Feature Cards" subtitle="Add or remove unlimited marketing cards displayed on the offer page" />
                <ActionButton tone="neutral" onClick={() => setCards((previous) => [...previous, createCard(previous.length + 1)])} icon={<Plus size={16} />}>
                  Add Feature Card
                </ActionButton>
              </div>
              <div className="mt-6 space-y-4">
                {cards.map((card, index) => (
                  <div key={card.id} className="rounded-3xl bg-gray-50 p-4 sm:p-5 dark:bg-white/5">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">Card #{index + 1}</div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block space-y-1.5">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Icon (Lucide name)</span>
                        <input
                          value={card.icon}
                          onChange={(e) =>
                            setCards((previous) =>
                              previous.map((item) => (item.id === card.id ? { ...item, icon: e.target.value } : item))
                            )
                          }
                          className="w-full rounded-2xl bg-white px-4 py-2.5 dark:bg-[#111]"
                          placeholder="e.g. Book, Target, Video"
                        />
                      </label>
                      <label className="block space-y-1.5">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Display Order</span>
                        <input
                          type="number"
                          value={card.order}
                          onChange={(e) =>
                            setCards((previous) =>
                              previous.map((item) =>
                                item.id === card.id ? { ...item, order: Number(e.target.value || index + 1) } : item
                              )
                            )
                          }
                          className="w-full rounded-2xl bg-white px-4 py-2.5 dark:bg-[#111]"
                          placeholder="e.g. 1"
                        />
                      </label>
                      <label className="block space-y-1.5 md:col-span-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Card Title</span>
                        <input
                          value={card.title}
                          onChange={(e) =>
                            setCards((previous) =>
                              previous.map((item) => (item.id === card.id ? { ...item, title: e.target.value } : item))
                            )
                          }
                          className="w-full rounded-2xl bg-white px-4 py-2.5 dark:bg-[#111]"
                          placeholder="e.g. Cours vidéo complets"
                        />
                      </label>
                      <label className="block space-y-1.5 md:col-span-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Card Description</span>
                        <input
                          value={card.description}
                          onChange={(e) =>
                            setCards((previous) =>
                              previous.map((item) =>
                                item.id === card.id ? { ...item, description: e.target.value } : item
                              )
                            )
                          }
                          className="w-full rounded-2xl bg-white px-4 py-2.5 dark:bg-[#111]"
                          placeholder="Short description shown under the title"
                        />
                      </label>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <ActionButton
                        tone="danger"
                        onClick={() => setCards((previous) => previous.filter((item) => item.id !== card.id))}
                        icon={<Trash2 size={16} />}
                      >
                        Remove Card
                      </ActionButton>
                    </div>
                  </div>
                ))}
                {cards.length === 0 && (
                  <div className="rounded-3xl border border-dashed border-black/10 px-4 py-10 text-center text-sm text-gray-500 dark:border-white/10 dark:text-gray-400">
                    No feature cards yet — click "Add Feature Card" above to build the marketing grid.
                  </div>
                )}
              </div>
            </AdminCard>

            <AdminCard className="p-6 sm:p-8">
              <SectionTitle title="Promotions & Contact" subtitle="Manage active campaigns and support contact information" />
              <div className="mt-6 space-y-6">
                <div className="space-y-3 border-b border-black/5 pb-6 dark:border-white/5">
                  <div className="flex items-start justify-between flex-col sm:flex-row sm:items-center gap-3">
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">Active Promotions</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Optional time-sensitive banners (only one can be active at a time)</div>
                    </div>
                    <ActionButton tone="neutral" onClick={() => setPromotions((previous) => [...previous, createPromotion()])} icon={<Plus size={16} />}>
                      Add Promotion
                    </ActionButton>
                  </div>
                  <div className="space-y-4">
                    {promotions.map((promotion, index) => (
                      <div key={promotion.id} className="rounded-3xl bg-gray-50 p-4 sm:p-5 dark:bg-white/5">
                        <div className="mb-3 flex items-center justify-between">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">Promotion #{index + 1}</div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="block space-y-1.5">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Promotion Title</span>
                            <input
                              value={promotion.title}
                              onChange={(e) =>
                                setPromotions((previous) =>
                                  previous.map((item) => (item.id === promotion.id ? { ...item, title: e.target.value } : item))
                                )
                              }
                              className="w-full rounded-2xl bg-white px-4 py-2.5 dark:bg-[#111]"
                              placeholder="e.g. Rentrée 2025 — -33%"
                            />
                          </label>
                          <label className="block space-y-1.5">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Promotion Badge</span>
                            <input
                              value={promotion.badge}
                              onChange={(e) =>
                                setPromotions((previous) =>
                                  previous.map((item) => (item.id === promotion.id ? { ...item, badge: e.target.value } : item))
                                )
                              }
                              className="w-full rounded-2xl bg-white px-4 py-2.5 dark:bg-[#111]"
                              placeholder="e.g. Nouveau"
                            />
                          </label>
                          <label className="block space-y-1.5 md:col-span-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Promotion Description</span>
                            <textarea
                              rows={3}
                              value={promotion.description}
                              onChange={(e) =>
                                setPromotions((previous) =>
                                  previous.map((item) =>
                                    item.id === promotion.id ? { ...item, description: e.target.value } : item
                                  )
                                )
                              }
                              className="w-full rounded-2xl bg-white px-4 py-2.5 dark:bg-[#111]"
                              placeholder="Short text explaining the promotion terms"
                            />
                          </label>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                          <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            <input
                              type="checkbox"
                              checked={promotion.isActive}
                              onChange={(e) =>
                                setPromotions((previous) =>
                                  previous.map((item) =>
                                    item.id === promotion.id
                                      ? { ...item, isActive: e.target.checked }
                                      : e.target.checked
                                      ? { ...item, isActive: false }
                                      : item
                                  )
                                )
                              }
                            />
                            <span>Active promotion (others will be disabled)</span>
                          </label>
                          <ActionButton
                            tone="danger"
                            onClick={() =>
                              setPromotions((previous) => previous.filter((item) => item.id !== promotion.id))
                            }
                            icon={<Trash2 size={16} />}
                          >
                            Remove Promotion
                          </ActionButton>
                        </div>
                      </div>
                    ))}
                    {promotions.length === 0 && (
                      <div className="rounded-3xl border border-dashed border-black/10 px-4 py-10 text-center text-sm text-gray-500 dark:border-white/10 dark:text-gray-400">
                        No promotions configured — optional.
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-1">
                  <div className="mb-3">
                    <div className="font-semibold text-gray-900 dark:text-white">Support Contacts</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Shown on the offer page footer so students can reach you</div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <label className="block space-y-1.5">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone / WhatsApp</span>
                      <input
                        value={values.contactPhone || ''}
                        onChange={(e) => setValue('contactPhone', e.target.value)}
                        className="w-full rounded-2xl bg-gray-50 px-4 py-2.5 dark:bg-white/5"
                        placeholder="+216 ..."
                      />
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</span>
                      <input
                        value={values.contactEmail || ''}
                        onChange={(e) => setValue('contactEmail', e.target.value)}
                        className="w-full rounded-2xl bg-gray-50 px-4 py-2.5 dark:bg-white/5"
                        placeholder="contact@tunibac.tn"
                      />
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Address (optional)</span>
                      <input
                        value={values.contactAddress || ''}
                        onChange={(e) => setValue('contactAddress', e.target.value)}
                        className="w-full rounded-2xl bg-gray-50 px-4 py-2.5 dark:bg-white/5"
                        placeholder="Tunis, Tunisie"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </AdminCard>
          </div>

          <div className="space-y-6">
            <AdminCard className="overflow-hidden p-0">
              <div className="border-b border-black/5 px-6 py-5 dark:border-white/5">
                <SectionTitle title="Live Preview" subtitle="This is what visitors see before registration" />
              </div>
              <PlatformOfferView
                offer={{
                  ...previewOffer,
                  backgroundImage: toAssetUrl(previewOffer.backgroundImage),
                  bannerImage: toAssetUrl(previewOffer.bannerImage),
                  logo: toAssetUrl(previewOffer.logo),
                  videoUrl: toAssetUrl(previewOffer.videoUrl),
                }}
                ctaHref="/register/form"
                previewMode
              />
            </AdminCard>
          </div>
        </div>
      )}

      {!loading && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-white/90 px-4 py-3 backdrop-blur-md dark:border-white/5 dark:bg-[#0B0F17]/90 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1600px] flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="hidden sm:block">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">Platform Offer Settings</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Changes are saved locally — click Save to persist.</div>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-3">
              <ActionButton tone="neutral" onClick={() => navigate('/admin')} icon={<ArrowLeft size={16} />}>
                Back to Admin
              </ActionButton>
              <ActionButton tone="neutral" onClick={() => window.open('/register', '_blank')} icon={<Eye size={16} />}>
                Preview Page
              </ActionButton>
              <PrimaryButton onClick={saveAll} disabled={saving} icon={<Save size={16} />}>
                {saving ? 'Saving...' : 'Save Offer'}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PlatformOfferPage

