import { useCallback, useEffect, useState } from 'react'
import {
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react'
import { shopAPI } from '../../services/api'
import { AdminCard } from '../../components/admin/AdminCard'

interface Product {
  id: string
  name: string
  description?: string | null
  image?: string | null
  price?: number | null
  whatsapp?: string | null
  externalLink?: string | null
  isActive: boolean
  order: number
}

const emptyForm = {
  name: '',
  description: '',
  price: '',
  whatsapp: '',
  externalLink: '',
  image: '',
  isActive: true,
  order: 0,
}

const ProductModal: React.FC<{
  initial: Product | null
  onClose: () => void
  onSave: (data: any) => Promise<void>
}> = ({ initial, onClose, onSave }) => {
  const [form, setForm] = useState(() =>
    initial
      ? {
          ...emptyForm,
          name: initial.name,
          description: initial.description || '',
          price: initial.price != null ? String(initial.price) : '',
          whatsapp: initial.whatsapp || '',
          externalLink: initial.externalLink || '',
          image: initial.image || '',
          isActive: initial.isActive,
          order: initial.order,
        }
      : emptyForm
  )
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  const uploadImage = async (file: File) => {
    setUploading(true)
    try {
      const res = await shopAPI.uploadImage(file)
      setForm((prev) => ({ ...prev, image: res.data.fileUrl || res.data.url || '' }))
    } finally {
      setUploading(false)
    }
  }

  const submit = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await onSave({
        name: form.name,
        description: form.description,
        price: form.price ? Number(form.price) : null,
        whatsapp: form.whatsapp,
        externalLink: form.externalLink,
        image: form.image,
        isActive: form.isActive,
        order: form.order,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const field = (key: string) => ({
    value: (form as any)[key] || '',
    onChange: (e: any) => setForm((prev) => ({ ...prev, [key]: e.target.value })),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {initial ? 'Modifier le produit' : 'Nouveau produit'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Nom du produit *</label>
            <input {...field('name')} className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
            <textarea {...field('description')} rows={3} className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Prix (DT)</label>
              <input {...field('price')} type="number" min="0" step="0.5" className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">WhatsApp</label>
              <input {...field('whatsapp')} className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white" placeholder="Ex : 20123456" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Lien externe</label>
            <input {...field('externalLink')} className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white" placeholder="https://..." />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Image</label>
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 dark:border-white/15">
                <ImagePlus size={16} />
                {uploading ? 'Envoi...' : 'Choisir une image'}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
              </label>
              {form.image && <img src={form.image} alt="aperçu" className="h-14 w-14 rounded-xl object-cover" />}
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))} className="h-4 w-4" />
            Produit actif (visible dans la boutique)
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5">Annuler</button>
          <button onClick={submit} disabled={saving || !form.name.trim()} className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            {saving ? <Loader2 size={16} className="animate-spin" /> : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

const ShopPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ open: boolean; initial: Product | null }>({ open: false, initial: null })
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await shopAPI.getAllAdmin()
    setProducts(res.data)
  }, [])

  useEffect(() => {
    load().catch(() => setNotice('Impossible de charger la boutique.')).finally(() => setLoading(false))
  }, [load])

  const showNotice = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(null), 3000)
  }

  const handleSave = async (data: any) => {
    if (modal.initial) {
      await shopAPI.update(modal.initial.id, data)
    } else {
      await shopAPI.create(data)
    }
    showNotice('Produit enregistré')
    await load()
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer ce produit ?')) return
    await shopAPI.delete(id)
    showNotice('Produit supprimé')
    await load()
  }

  const handleToggleActive = async (product: Product) => {
    await shopAPI.update(product.id, { ...product, isActive: !product.isActive, price: product.price ?? null })
    showNotice(product.isActive ? 'Produit masqué' : 'Produit visible')
    await load()
  }

  const handleMove = async (id: string, direction: 'up' | 'down') => {
    const index = products.findIndex((p) => p.id === id)
    const target = direction === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= products.length) return
    const reordered = [...products]
    const [item] = reordered.splice(index, 1)
    reordered.splice(target, 0, item)
    setProducts(reordered)
    await shopAPI.reorder(reordered.map((p, i) => ({ id: p.id, order: i })))
    showNotice('Ordre mis à jour')
  }

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6">
      {notice && (
        <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">{notice}</div>
      )}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
            <ShoppingBag className="text-blue-600" /> Boutique TuniBac
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Produits pour étudiants — achat via WhatsApp ou lien externe.
          </p>
        </div>
        <button onClick={() => setModal({ open: true, initial: null })} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          <Plus size={16} /> Nouveau produit
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-blue-600" /></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.length === 0 && <p className="col-span-full py-12 text-center text-sm text-gray-400">Aucun produit.</p>}
          {products.map((product, index) => (
            <AdminCard key={product.id}>
              {product.image ? (
                <img src={product.image} alt={product.name} className="h-40 w-full rounded-xl object-cover" />
              ) : (
                <div className="flex h-40 w-full items-center justify-center rounded-xl bg-gray-100 text-gray-300 dark:bg-white/5">
                  <ShoppingBag size={40} />
                </div>
              )}
              <div className="mt-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-gray-900 dark:text-white">{product.name}</p>
                  {product.price != null && (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-sm font-bold text-emerald-600">
                      {product.price} DT
                    </span>
                  )}
                </div>
                {product.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">{product.description}</p>
                )}
                <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${product.isActive ? 'bg-blue-500/10 text-blue-600' : 'bg-gray-200 text-gray-500'}`}>
                  {product.isActive ? 'Actif' : 'Inactif'}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-white/10">
                <div className="flex gap-1">
                  <button onClick={() => handleMove(product.id, 'up')} disabled={index === 0} className="rounded-lg px-2 py-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-white/5">↑</button>
                  <button onClick={() => handleMove(product.id, 'down')} disabled={index === products.length - 1} className="rounded-lg px-2 py-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-white/5">↓</button>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleToggleActive(product)} className="rounded-lg px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5">
                    {product.isActive ? 'Masquer' : 'Afficher'}
                  </button>
                  <button onClick={() => setModal({ open: true, initial: product })} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"><Pencil size={15} /></button>
                  <button onClick={() => handleDelete(product.id)} className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"><Trash2 size={15} /></button>
                </div>
              </div>
            </AdminCard>
          ))}
        </div>
      )}

      {modal.open && (
        <ProductModal initial={modal.initial} onClose={() => setModal({ open: false, initial: null })} onSave={handleSave} />
      )}
    </div>
  )
}

export default ShopPage
