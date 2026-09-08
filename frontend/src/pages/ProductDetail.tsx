import { useEffect, useState } from 'react'
import {
  ChevronLeft,
  ExternalLink,
  Loader2,
  MessageCircle,
  ShoppingCart,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import Breadcrumbs from '../components/Breadcrumbs'
import { toAssetUrl } from '../lib/assets'
import { shopAPI } from '../services/api'

type ShopProduct = {
  id: string
  name: string
  description?: string | null
  image?: string | null
  price?: number | null
  whatsapp?: string | null
  externalLink?: string | null
  isActive?: boolean
}

const formatWhatsAppLink = (value?: string | null) => {
  if (!value) return null
  const digits = String(value).replace(/\D+/g, '')
  if (!digits) return null
  const full = digits.length === 8 ? `216${digits}` : digits
  return `https://wa.me/${full}?text=${encodeURIComponent('Bonjour, je suis intéressé par ce produit.')}`
}

const ProductImagePlaceholder = ({ large = false }: { large?: boolean }) => {
  const h = large ? 'h-96' : 'h-48'
  return (
    <div
      className={`flex w-full items-center justify-center rounded-3xl bg-gradient-to-br from-gray-100 to-gray-50 border border-slate-200 ${h}`}
    >
      <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white text-gray-400 shadow-inner">
        <ShoppingCart size={large ? 48 : 32} />
      </div>
    </div>
  )
}

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>()
  const [product, setProduct] = useState<ShopProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    if (!id) return
    let isCurrent = true
    setLoading(true)
    shopAPI
      .getDetail(id)
      .then((data) => {
        if (!isCurrent) return
        setProduct((data as ShopProduct) || null)
      })
      .catch(() => isCurrent && setError('Produit introuvable.'))
      .finally(() => isCurrent && setLoading(false))
    return () => {
      isCurrent = false
    }
  }, [id])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={30} className="animate-spin text-brand-blue" />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <p className="text-red-500">{error || 'Produit introuvable.'}</p>
        <Link
          to="/shop"
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand-blue px-6 py-2 font-semibold text-white"
        >
          <ChevronLeft size={16} /> Retour à la boutique
        </Link>
      </div>
    )
  }

  const wa = formatWhatsAppLink(product.whatsapp)
  const inStock = product.isActive !== false

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Breadcrumbs
        crumbs={[
          { label: 'Boutique', to: '/shop' },
          { label: product.name },
        ]}
        className="mb-6"
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          {product.image && !imgError ? (
            <img
              src={toAssetUrl(product.image)}
              alt={product.name}
              className="h-96 w-full rounded-3xl object-cover border border-slate-200 shadow-sm"
              onError={() => setImgError(true)}
            />
          ) : (
            <ProductImagePlaceholder large />
          )}
        </div>

        <div className="flex flex-col">
          <div className="mb-3 flex items-start justify-between gap-3">
            <h1 className="text-2xl font-black text-[#071840] sm:text-3xl">
              {product.name}
            </h1>
            {typeof product.price === 'number' && (
              <div className="shrink-0 rounded-2xl bg-brand-blue/10 px-4 py-2">
                <div className="text-2xl font-black text-brand-blue">
                  {product.price.toFixed(2)} DT
                </div>
              </div>
            )}
          </div>

          <div className="mb-4">
            {inStock ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-500/20">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                En stock
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold text-red-700 ring-1 ring-red-500/20">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                Rupture de stock
              </span>
            )}
          </div>

          <p className="text-base leading-relaxed text-slate-700">
            {product.description ||
              'Aucune description pour ce produit pour le moment.'}
          </p>

          <div className="mt-8 space-y-3">
            {wa ? (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 px-6 py-3.5 text-base font-bold text-white shadow-[0_14px_30px_-12px_rgba(22,163,74,0.6)] transition-colors hover:bg-green-700"
              >
                <MessageCircle size={20} /> Commander via WhatsApp
              </a>
            ) : product.externalLink ? (
              <a
                href={product.externalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#071840] px-6 py-3.5 text-base font-bold text-white transition-colors hover:bg-[#071840]/90"
              >
                <ExternalLink size={20} /> Commander
              </a>
            ) : (
              <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/60 p-4 text-sm text-emerald-900">
                <div className="flex items-center gap-2 font-bold">
                  <MessageCircle size={17} />
                  Pour commander
                </div>
                <p className="mt-1 text-emerald-800/80">
                  Contactez-nous sur WhatsApp pour passer votre commande.
                </p>
              </div>
            )}

            <Link
              to="/shop"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
            >
              <ChevronLeft size={17} /> Retour à la boutique
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductDetail
