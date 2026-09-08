import { useEffect, useState } from 'react'
import {
  ArrowRight,
  ExternalLink,
  MessageCircle,
  ShoppingCart,
} from 'lucide-react'
import { Link } from 'react-router-dom'
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
  return `https://wa.me/${full}`
}

const ProductImagePlaceholder = () => (
  <div className="flex h-44 w-full items-center justify-center rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50">
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-gray-400 shadow-inner">
      <ShoppingCart size={30} />
    </div>
  </div>
)

const ShopList = () => {
  const [products, setProducts] = useState<ShopProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isCurrent = true
    setLoading(true)
    shopAPI
      .listAll()
      .then((data) => {
        if (!isCurrent) return
        const arr = Array.isArray(data) ? data : []
        setProducts(arr)
      })
      .catch(() => isCurrent && setProducts([]))
      .finally(() => isCurrent && setLoading(false))
    return () => {
      isCurrent = false
    }
  }, [])

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-8 space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-700">
          <span className="inline-flex items-center gap-1.5">
            <ShoppingCart size={13} /> Boutique scolaire
          </span>
        </p>
        <h1 className="text-4xl font-black text-[#071840]">Boutique</h1>
        <p className="text-lg font-semibold text-slate-600" dir="auto">
          Calculatrices et fournitures.
        </p>
      </header>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-80 animate-pulse rounded-3xl border border-gray-100 bg-gray-50" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <ShoppingCart size={28} />
          </div>
          <p className="text-lg font-semibold text-slate-700">
            ما عندناش produits pour l’instant.
          </p>
          <p className="text-sm text-slate-500">
            راجع لاحقاً — على وشك نضيف calculatrices et fournitures.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const wa = formatWhatsAppLink(p.whatsapp)
            return (
              <article
                key={p.id}
                className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="p-5">
                  {p.image ? (
                    <img
                      src={toAssetUrl(p.image)}
                      alt={p.name}
                      className="h-44 w-full rounded-2xl object-cover"
                      onError={(e) => {
                        ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                        const parent = (e.currentTarget as HTMLImageElement).parentElement
                        if (parent && !parent.querySelector('.placeholder-svg')) {
                          const ph = document.createElement('div')
                          ph.className = 'placeholder-svg'
                          parent.insertBefore(ph, e.currentTarget)
                        }
                      }}
                    />
                  ) : (
                    <ProductImagePlaceholder />
                  )}
                </div>

                <div className="flex flex-1 flex-col px-5 pb-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="line-clamp-1 font-extrabold text-[#071840]">
                      {p.name}
                    </h3>
                    {typeof p.price === 'number' && (
                      <div className="shrink-0 text-lg font-black text-brand-blue">
                        {p.price.toFixed(2)} DT
                      </div>
                    )}
                  </div>

                  {p.description && (
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">
                      {p.description}
                    </p>
                  )}

                  <div className="mt-auto flex flex-wrap items-center justify-end gap-2 pt-5">
                    {wa ? (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
                      >
                        <MessageCircle size={15} /> Commander WhatsApp
                      </a>
                    ) : p.externalLink ? (
                      <a
                        href={p.externalLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#071840] px-4 py-2 text-sm font-bold text-white hover:bg-[#071840]/90 transition-colors"
                      >
                        <ExternalLink size={15} /> Commander
                      </a>
                    ) : (
                      <Link
                        to={`/shop/${p.id}`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue/10 px-4 py-2 text-sm font-bold text-brand-blue hover:bg-brand-blue/20 transition-colors"
                      >
                        Voir détail <ArrowRight size={15} />
                      </Link>
                    )}

                    <Link
                      to={`/shop/${p.id}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:border-slate-300 hover:text-slate-800 transition-colors"
                    >
                      Voir le détail
                    </Link>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ShopList
