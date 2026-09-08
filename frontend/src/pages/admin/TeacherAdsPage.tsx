import { useCallback, useEffect, useState } from 'react'
import {
  BadgeCheck,
  ImagePlus,
  Loader2,
  Megaphone,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { teacherAdsAPI } from '../../services/api'
import { BAC_SECTION_OPTIONS } from '../../constants/bacSections'
import { AdminCard } from '../../components/admin/AdminCard'

interface Ad {
  id: string
  teacherName: string
  subject?: string | null
  description?: string | null
  image?: string | null
  whatsapp?: string | null
  externalLink?: string | null
  bacSection?: string | null
  isActive: boolean
  isApproved: boolean
  order: number
  teachingMethod?: string | null
  videoUrl?: string | null
  videoType?: string | null
  resources?: any[] | null
  teacherId?: string | null
}

const emptyForm = {
  teacherName: '',
  subject: '',
  description: '',
  whatsapp: '',
  externalLink: '',
  bacSection: '',
  image: '',
  isActive: true,
  isApproved: true,
  order: 0,
  teachingMethod: '',
  videoUrl: '',
  videoType: 'AUTO',
  teacherId: '',
}

const AdModal: React.FC<{
  initial: Ad | null
  onClose: () => void
  onSave: (data: any) => Promise<void>
}> = ({ initial, onClose, onSave }) => {
  const [form, setForm] = useState(() =>
    initial
      ? { ...emptyForm, ...initial, bacSection: initial.bacSection || '' }
      : emptyForm
  )
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  const uploadImage = async (file: File) => {
    setUploading(true)
    try {
      const res = await teacherAdsAPI.uploadImage(file)
      setForm((prev) => ({ ...prev, image: res.data.fileUrl || res.data.url || '' }))
    } finally {
      setUploading(false)
    }
  }

  const submit = async () => {
    if (!form.teacherName.trim()) return
    setSaving(true)
    try {
      await onSave({
        ...form,
        bacSection: form.bacSection || null,
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
            {initial ? 'Modifier la publicité' : 'Nouvelle publicité'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Nom de l’enseignant *</label>
            <input {...field('teacherName')} className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Matière</label>
            <input {...field('subject')} className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
            <textarea {...field('description')} rows={3} className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">WhatsApp</label>
              <input {...field('whatsapp')} className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white" placeholder="Ex : 20123456" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Lien externe</label>
              <input {...field('externalLink')} className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white" placeholder="https://..." />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Section (optionnel)</label>
            <select
              value={form.bacSection}
              onChange={(e) => setForm((prev) => ({ ...prev, bacSection: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              <option value="">Toutes les sections</option>
              {BAC_SECTION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Image</label>
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 dark:border-white/15">
                <ImagePlus size={16} />
                {uploading ? 'Envoi...' : 'Choisir une image'}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
              </label>
              {form.image && (
                <img src={form.image} alt="aperçu" className="h-14 w-14 rounded-xl object-cover" />
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))} className="h-4 w-4" />
              Active
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={form.isApproved} onChange={(e) => setForm((prev) => ({ ...prev, isApproved: e.target.checked }))} className="h-4 w-4" />
              Approuvée
            </label>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Méthode pédagogique / Teaching description</label>
            <textarea {...field('teachingMethod')} rows={3} className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Vidéo (YouTube URL ou chemin R2)</label>
            <input {...field('videoUrl')} className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white" placeholder="https://youtu.be/... ou r2://..." />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Video type</label>
            <select
              value={form.videoType || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, videoType: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              <option value="AUTO">AUTO</option>
              <option value="YOUTUBE">YOUTUBE</option>
              <option value="R2">R2</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Teacher user ID (associer à un compte Enseignant si lié)</label>
            <input {...field('teacherId')} className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white" placeholder="Optionnel" />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5">Annuler</button>
          <button onClick={submit} disabled={saving || !form.teacherName.trim()} className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            {saving ? <Loader2 size={16} className="animate-spin" /> : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

const TeacherAdsPage: React.FC = () => {
  const [ads, setAds] = useState<Ad[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ open: boolean; initial: Ad | null }>({ open: false, initial: null })
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await teacherAdsAPI.getAllAdmin()
    setAds(res.data)
  }, [])

  useEffect(() => {
    load().catch(() => setNotice('Impossible de charger les publicités.')).finally(() => setLoading(false))
  }, [load])

  const showNotice = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(null), 3000)
  }

  const handleSave = async (data: any) => {
    if (modal.initial) {
      await teacherAdsAPI.update(modal.initial.id, data)
    } else {
      await teacherAdsAPI.create(data)
    }
    showNotice('Publicité enregistrée')
    await load()
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer cette publicité ?')) return
    await teacherAdsAPI.delete(id)
    showNotice('Publicité supprimée')
    await load()
  }

  const handleMove = async (id: string, direction: 'up' | 'down') => {
    const index = ads.findIndex((a) => a.id === id)
    const target = direction === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= ads.length) return
    const reordered = [...ads]
    const [item] = reordered.splice(index, 1)
    reordered.splice(target, 0, item)
    setAds(reordered)
    await teacherAdsAPI.reorder(reordered.map((a, i) => ({ id: a.id, order: i })))
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
            <Megaphone className="text-blue-600" /> Publicités des enseignants
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Contrôlez la publication, l’ordre et l’approbation.
          </p>
        </div>
        <button onClick={() => setModal({ open: true, initial: null })} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          <Plus size={16} /> Nouvelle publicité
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-blue-600" /></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ads.length === 0 && <p className="col-span-full py-12 text-center text-sm text-gray-400">Aucune publicité.</p>}
          {ads.map((ad, index) => (
            <AdminCard key={ad.id}>
              <div className="flex items-start justify-between gap-2">
                {ad.image ? (
                  <img src={ad.image} alt={ad.teacherName} className="h-14 w-14 rounded-xl object-cover" />
                ) : (
                  <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600">
                    <BadgeCheck size={24} />
                  </span>
                )}
                <div className="flex flex-col items-end gap-1">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ad.isApproved ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                    {ad.isApproved ? 'Approuvée' : 'En attente'}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ad.isActive ? 'bg-blue-500/10 text-blue-600' : 'bg-gray-200 text-gray-500'}`}>
                    {ad.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <p className="mt-3 font-semibold text-gray-900 dark:text-white">{ad.teacherName}</p>
              {ad.subject && <p className="text-xs font-medium text-blue-600">{ad.subject}</p>}
              {ad.description && <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">{ad.description}</p>}
              <div className="mt-3 flex items-center justify-between">
                <div className="flex gap-1">
                  <button onClick={() => handleMove(ad.id, 'up')} disabled={index === 0} className="rounded-lg px-2 py-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-white/5">↑</button>
                  <button onClick={() => handleMove(ad.id, 'down')} disabled={index === ads.length - 1} className="rounded-lg px-2 py-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-white/5">↓</button>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setModal({ open: true, initial: ad })} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"><Pencil size={15} /></button>
                  <button onClick={() => handleDelete(ad.id)} className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"><Trash2 size={15} /></button>
                </div>
              </div>
            </AdminCard>
          ))}
        </div>
      )}

      {modal.open && (
        <AdModal initial={modal.initial} onClose={() => setModal({ open: false, initial: null })} onSave={handleSave} />
      )}
    </div>
  )
}

export default TeacherAdsPage
