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
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
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
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#FFD700]" />
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

                <input
                  value={values.platformOfferTitle || ''}
                  onChange={(e) => setValue('platformOfferTitle', e.target.value)}
                  className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                  placeholder="Main Title"
                  aria-label="Main title"
                />
                <input
                  value={values.platformOfferSubtitle || ''}
                  onChange={(e) => setValue('platformOfferSubtitle', e.target.value)}
                  className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                  placeholder="Subtitle"
                  aria-label="Subtitle"
                />
                <textarea
                  rows={4}
                  value={values.platformOfferDescription || ''}
                  onChange={(e) => setValue('platformOfferDescription', e.target.value)}
                  className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                  placeholder="Description"
                  aria-label="Description"
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    value={values.platformOfferPrice || ''}
                    onChange={(e) => setValue('platformOfferPrice', e.target.value)}
                    className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                    placeholder="Price"
                    aria-label="Price"
                  />
                  <input
                    value={values.platformOfferOldPrice || ''}
                    onChange={(e) => setValue('platformOfferOldPrice', e.target.value)}
                    className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                    placeholder="Old Price"
                    aria-label="Old price"
                  />
                  <input
                    value={values.platformOfferDiscountPercentage || ''}
                    onChange={(e) => setValue('platformOfferDiscountPercentage', e.target.value)}
                    className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                    placeholder="Discount Percentage"
                    aria-label="Discount percentage"
                  />
                  <input
                    value={values.platformOfferPromotionBadge || ''}
                    onChange={(e) => setValue('platformOfferPromotionBadge', e.target.value)}
                    className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                    placeholder="Promotion Badge"
                    aria-label="Promotion badge"
                  />
                  <input
                    value={values.platformOfferButtonText || ''}
                    onChange={(e) => setValue('platformOfferButtonText', e.target.value)}
                    className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                    placeholder="CTA Button Text"
                    aria-label="Call to action button text"
                  />
                  <input
                    type="number"
                    value={values.platformOfferDisplayOrder || '1'}
                    onChange={(e) => setValue('platformOfferDisplayOrder', e.target.value)}
                    className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                    placeholder="Display Order"
                    aria-label="Display order"
                  />
                </div>
              </div>
            </AdminCard>

            <AdminCard className="p-6 sm:p-8">
              <SectionTitle title="Media & Theme" subtitle="Upload offer assets and adjust colors" />
              <div className="mt-6 grid gap-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Background Image</span>
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
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Banner Image</span>
                    <ImageUploader
                      value={toAssetUrl(values.platformOfferBannerImage)}
                      onChange={(url) => setValue('platformOfferBannerImage', toRelativeAsset(url))}
                      onUpload={async (file) => {
                        const response = await adminAPI.uploadSettingAsset('offer-banner', file)
                        return toAssetUrl(String(response.data.fileUrl || ''))
                      }}
                    />
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Offer Logo</span>
                    <ImageUploader
                      value={toAssetUrl(values.platformOfferLogo)}
                      onChange={(url) => setValue('platformOfferLogo', toRelativeAsset(url))}
                      onUpload={async (file) => {
                        const response = await adminAPI.uploadSettingAsset('offer-logo', file)
                        return toAssetUrl(String(response.data.fileUrl || ''))
                      }}
                    />
                  </div>
                  <div className="space-y-3">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Offer Video</span>
                    <VideoUploader
                      value={toAssetUrl(values.platformOfferVideoUrl)}
                      onChange={(url) => setValue('platformOfferVideoUrl', toRelativeAsset(url))}
                      onUpload={async (file, options) => {
                        const response = await adminAPI.uploadSettingAsset('offer-video', file, options)
                        return toAssetUrl(String(response.data.fileUrl || ''))
                      }}
                      placeholder="Upload optional offer video directly to Cloudflare R2"
                    />
                    <input
                      value={values.platformOfferVideoUrl || ''}
                      onChange={(e) => setValue('platformOfferVideoUrl', e.target.value)}
                      className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                      placeholder="Video URL or uploaded file path"
                      aria-label="Video URL or uploaded file path"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Primary Color</span>
                    <input
                      type="color"
                      value={values.platformOfferPrimaryColor || '#2563EB'}
                      onChange={(e) => setValue('platformOfferPrimaryColor', e.target.value)}
                      className="h-14 w-full rounded-2xl bg-gray-50 px-3 py-2 dark:bg-white/5"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Secondary Color</span>
                    <input
                      type="color"
                      value={values.platformOfferSecondaryColor || '#7C3AED'}
                      onChange={(e) => setValue('platformOfferSecondaryColor', e.target.value)}
                      className="h-14 w-full rounded-2xl bg-gray-50 px-3 py-2 dark:bg-white/5"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Accent Color</span>
                    <input
                      type="color"
                      value={values.platformOfferAccentColor || '#F59E0B'}
                      onChange={(e) => setValue('platformOfferAccentColor', e.target.value)}
                      className="h-14 w-full rounded-2xl bg-gray-50 px-3 py-2 dark:bg-white/5"
                    />
                  </label>
                </div>
              </div>
            </AdminCard>

            <AdminCard className="p-6 sm:p-8">
              <SectionTitle title="Features & Notes" subtitle="Control the list of included benefits and important notes" />
              <div className="mt-6 space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-gray-900 dark:text-white">Features List</div>
                    <ActionButton tone="neutral" onClick={() => setFeatures((previous) => [...previous, ''])} icon={<Plus size={16} />}>
                      Add Feature
                    </ActionButton>
                  </div>
                  <div className="space-y-3">
                    {features.map((feature, index) => (
                      <div key={`feature-${index}`} className="flex gap-3">
                        <input
                          value={feature}
                          onChange={(e) =>
                            setFeatures((previous) =>
                              previous.map((item, itemIndex) => (itemIndex === index ? e.target.value : item))
                            )
                          }
                          className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                          placeholder="Feature"
                          aria-label={`Feature ${index + 1}`}
                        />
                        <ActionButton
                          tone="danger"
                          onClick={() => setFeatures((previous) => previous.filter((_, itemIndex) => itemIndex !== index))}
                          icon={<Trash2 size={16} />}
                        >
                          Remove
                        </ActionButton>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-gray-900 dark:text-white">Important Notes</div>
                    <ActionButton tone="neutral" onClick={() => setNotes((previous) => [...previous, ''])} icon={<Plus size={16} />}>
                      Add Note
                    </ActionButton>
                  </div>
                  <div className="space-y-3">
                    {notes.map((note, index) => (
                      <div key={`note-${index}`} className="flex gap-3">
                        <input
                          value={note}
                          onChange={(e) =>
                            setNotes((previous) =>
                              previous.map((item, itemIndex) => (itemIndex === index ? e.target.value : item))
                            )
                          }
                          className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                          placeholder="Important note"
                          aria-label={`Important note ${index + 1}`}
                        />
                        <ActionButton
                          tone="danger"
                          onClick={() => setNotes((previous) => previous.filter((_, itemIndex) => itemIndex !== index))}
                          icon={<Trash2 size={16} />}
                        >
                          Remove
                        </ActionButton>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </AdminCard>

            <AdminCard className="p-6 sm:p-8">
              <SectionTitle title="Feature Cards" subtitle="Add or remove unlimited marketing cards" />
              <div className="mt-6 space-y-4">
                {cards.map((card, index) => (
                  <div key={card.id} className="rounded-3xl bg-gray-50 p-4 dark:bg-white/5">
                    <div className="grid gap-4 md:grid-cols-[100px_1fr_1fr_auto]">
                      <input
                        value={card.icon}
                        onChange={(e) =>
                          setCards((previous) =>
                            previous.map((item) => (item.id === card.id ? { ...item, icon: e.target.value } : item))
                          )
                        }
                        className="rounded-2xl bg-white px-4 py-3 dark:bg-[#111]"
                        placeholder="Icon"
                        aria-label={`Card ${index + 1} icon`}
                      />
                      <input
                        value={card.title}
                        onChange={(e) =>
                          setCards((previous) =>
                            previous.map((item) => (item.id === card.id ? { ...item, title: e.target.value } : item))
                          )
                        }
                        className="rounded-2xl bg-white px-4 py-3 dark:bg-[#111]"
                        placeholder="Card title"
                        aria-label={`Card ${index + 1} title`}
                      />
                      <input
                        value={card.description}
                        onChange={(e) =>
                          setCards((previous) =>
                            previous.map((item) =>
                              item.id === card.id ? { ...item, description: e.target.value } : item
                            )
                          )
                        }
                        className="rounded-2xl bg-white px-4 py-3 dark:bg-[#111]"
                        placeholder="Card description"
                        aria-label={`Card ${index + 1} description`}
                      />
                      <div className="flex gap-3">
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
                          className="w-24 rounded-2xl bg-white px-4 py-3 dark:bg-[#111]"
                          placeholder="Order"
                          aria-label={`Card ${index + 1} order`}
                        />
                        <ActionButton
                          tone="danger"
                          onClick={() => setCards((previous) => previous.filter((item) => item.id !== card.id))}
                          icon={<Trash2 size={16} />}
                        >
                          Remove
                        </ActionButton>
                      </div>
                    </div>
                  </div>
                ))}
                <ActionButton tone="neutral" onClick={() => setCards((previous) => [...previous, createCard(previous.length + 1)])} icon={<Plus size={16} />}>
                  Add Feature Card
                </ActionButton>
              </div>
            </AdminCard>

            <AdminCard className="p-6 sm:p-8">
              <SectionTitle title="Promotions & Contact" subtitle="Manage active campaigns and support contacts" />
              <div className="mt-6 space-y-4">
                {promotions.map((promotion) => (
                  <div key={promotion.id} className="rounded-3xl bg-gray-50 p-4 dark:bg-white/5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <input
                        value={promotion.title}
                        onChange={(e) =>
                          setPromotions((previous) =>
                            previous.map((item) => (item.id === promotion.id ? { ...item, title: e.target.value } : item))
                          )
                        }
                        className="rounded-2xl bg-white px-4 py-3 dark:bg-[#111]"
                        placeholder="Promotion title"
                        aria-label="Promotion title"
                      />
                      <input
                        value={promotion.badge}
                        onChange={(e) =>
                          setPromotions((previous) =>
                            previous.map((item) => (item.id === promotion.id ? { ...item, badge: e.target.value } : item))
                          )
                        }
                        className="rounded-2xl bg-white px-4 py-3 dark:bg-[#111]"
                        placeholder="Promotion badge"
                        aria-label="Promotion badge"
                      />
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
                        className="rounded-2xl bg-white px-4 py-3 dark:bg-[#111] md:col-span-2"
                        placeholder="Promotion description"
                        aria-label="Promotion description"
                      />
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
                        <span>Active promotion</span>
                      </label>
                      <ActionButton
                        tone="danger"
                        onClick={() =>
                          setPromotions((previous) => previous.filter((item) => item.id !== promotion.id))
                        }
                        icon={<Trash2 size={16} />}
                      >
                        Remove
                      </ActionButton>
                    </div>
                  </div>
                ))}
                <ActionButton tone="neutral" onClick={() => setPromotions((previous) => [...previous, createPromotion()])} icon={<Plus size={16} />}>
                  Add Promotion
                </ActionButton>

                <div className="grid gap-4 md:grid-cols-3">
                  <input
                    value={values.contactPhone || ''}
                    onChange={(e) => setValue('contactPhone', e.target.value)}
                    className="rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                    placeholder="Contact phone"
                    aria-label="Contact phone"
                  />
                  <input
                    value={values.contactEmail || ''}
                    onChange={(e) => setValue('contactEmail', e.target.value)}
                    className="rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                    placeholder="Contact email"
                    aria-label="Contact email"
                  />
                  <input
                    value={values.contactAddress || ''}
                    onChange={(e) => setValue('contactAddress', e.target.value)}
                    className="rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                    placeholder="Contact address"
                    aria-label="Contact address"
                  />
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
    </div>
  )
}

export default PlatformOfferPage
