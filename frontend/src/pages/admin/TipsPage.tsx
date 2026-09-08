import { useCallback, useEffect, useState } from 'react'
import {
  Lightbulb,
  Loader2,
  Pencil,
  Plus,
  Search,
  X,
  Trash2,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react'
import { tipsAPI, stepsAPI, subjectsAPI } from '../../services/api'
import { BAC_SECTION_OPTIONS } from '../../constants/bacSections'
import { AdminCard } from '../../components/admin/AdminCard'

interface Tip {
  id: string
  title?: string | null
  content: string
  stepId?: string | null
  subjectId?: string | null
  courseId?: string | null
  bacSection?: string | null
  order?: number
  isPublished?: boolean
  createdAt?: string
  updatedAt?: string
}

interface Step {
  id: string
  title?: string
  name?: string
}

interface Subject {
  id: string
  name: string
}

const TipFormModal: React.FC<{
  tip: Tip | null
  onClose: () => void
  onSaved: () => void
}> = ({ tip, onClose, onSaved }) => {
  const [title, setTitle] = useState(tip?.title || '')
  const [content, setContent] = useState(tip?.content || '')
  const [stepId, setStepId] = useState(tip?.stepId || '')
  const [subjectId, setSubjectId] = useState(tip?.subjectId || '')
  const [courseId, setCourseId] = useState(tip?.courseId || '')
  const [bacSection, setBacSection] = useState(tip?.bacSection || '')
  const [order, setOrder] = useState<number>(tip?.order ?? 0)
  const [isPublished, setIsPublished] = useState<boolean>(tip?.isPublished ?? false)
  const [steps, setSteps] = useState<Step[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    stepsAPI
      .getAllAdmin()
      .then((res: any) => {
        const data = res?.data || res
        setSteps(Array.isArray(data) ? data : data?.steps || data?.items || [])
      })
      .catch(() => {})
    subjectsAPI
      .getAll()
      .then((res: any) => {
        const data = res?.data || res
        setSubjects(Array.isArray(data) ? data : data?.subjects || data?.items || [])
      })
      .catch(() => {})
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    setSaving(true)
    try {
      const payload: any = { content: content.trim() }
      if (title.trim()) payload.title = title.trim()
      if (stepId) payload.stepId = stepId
      if (subjectId) payload.subjectId = subjectId
      if (courseId) payload.courseId = courseId
      if (bacSection) payload.bacSection = bacSection
      payload.order = Number(order) || 0
      payload.isPublished = Boolean(isPublished)

      if (tip) {
        await tipsAPI.update(tip.id, payload)
      } else {
        await tipsAPI.create(payload)
      }
      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
            <Lightbulb size={20} className="text-yellow-500" />
            {tip ? 'Modifier le conseil' : 'Nouveau conseil'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={22} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Titre (optionnel)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Comment réviser les maths"
              className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-brand-blue dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Contenu <span className="text-red-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              placeholder="اكتب النصيحة هنا..."
              className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-blue dark:border-white/10 dark:bg-white/5 dark:text-white"
              required
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Étape (Step)
              </label>
              <select
                value={stepId}
                onChange={(e) => setStepId(e.target.value)}
                className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-brand-blue dark:border-white/10 dark:bg-white/5 dark:text-white"
              >
                <option value="">— Toutes étapes —</option>
                {steps.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title || s.name || s.id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Matière
              </label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-brand-blue dark:border-white/10 dark:bg-white/5 dark:text-white"
              >
                <option value="">— Toutes matières —</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Section Bac
              </label>
              <select
                value={bacSection}
                onChange={(e) => setBacSection(e.target.value)}
                className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-brand-blue dark:border-white/10 dark:bg-white/5 dark:text-white"
              >
                <option value="">— Toutes sections —</option>
                {BAC_SECTION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Ordre (tri)
              </label>
              <input
                type="number"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
                className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-brand-blue dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              ID Cours (optionnel - avancé)
            </label>
            <input
              type="text"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              placeholder="course-uuid"
              className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-brand-blue dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>

          <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 dark:border-white/10">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Publié (visible par les élèves)
            </span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving || !content.trim()}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#071840] px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#0a235c] disabled:opacity-60"
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Check size={14} />
              )}
              {tip ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const DeleteConfirm: React.FC<{
  tip: Tip | null
  onClose: () => void
  onConfirm: () => void
}> = ({ tip, onClose, onConfirm }) => {
  const [loading, setLoading] = useState(false)
  if (!tip) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <h3 className="mb-3 text-lg font-bold text-gray-900 dark:text-white">Supprimer ?</h3>
        <p className="mb-5 text-sm text-gray-600 dark:text-gray-400">
          Tu es sur le point de supprimer le conseil <strong>"{tip.title || tip.content.slice(0, 40)}"</strong>. Cette action est irréversible.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Annuler
          </button>
          <button
            onClick={async () => {
              setLoading(true)
              try {
                await onConfirm()
              } finally {
                setLoading(false)
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-red-700 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Supprimer
          </button>
        </div>
      </div>
    </div>
  )
}

const TipsPage: React.FC = () => {
  const [tips, setTips] = useState<Tip[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingTip, setEditingTip] = useState<Tip | null>(null)
  const [tipToDelete, setTipToDelete] = useState<Tip | null>(null)
  const [toggleLoadingId, setToggleLoadingId] = useState<string | null>(null)

  const loadTips = useCallback(async () => {
    setLoading(true)
    try {
      const res: any = await tipsAPI.listAll()
      const data = res?.data || res
      const arr = Array.isArray(data) ? data : data?.tips || data?.items || []
      setTips(arr)
    } catch {
      setTips([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadTips()
  }, [loadTips])

  const togglePublish = async (tip: Tip) => {
    setToggleLoadingId(tip.id)
    try {
      await tipsAPI.setPublish(tip.id, !tip.isPublished)
      await loadTips()
    } finally {
      setToggleLoadingId(null)
    }
  }

  const filteredTips = tips.filter((t) => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return (
      (t.title || '').toLowerCase().includes(q) ||
      t.content.toLowerCase().includes(q) ||
      (t.id || '').toLowerCase().includes(q)
    )
  })

  const getSectionLabel = (value?: string | null) => {
    if (!value) return '—'
    return BAC_SECTION_OPTIONS.find((o) => o.value === value)?.label || value
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-black text-[#071840] dark:text-white">
            <Lightbulb size={26} className="text-yellow-500" />
            Conseils d'étude
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Gère les conseils affichés aux élèves dans le parcours, par étape et par matière.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingTip(null)
            setShowForm(true)
          }}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#071840] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#0a235c]"
        >
          <Plus size={15} /> Nouveau conseil
        </button>
      </div>

      <AdminCard>
        <div className="mb-5">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher par titre, contenu..."
              className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-brand-blue dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={30} className="animate-spin text-brand-blue" />
          </div>
        ) : filteredTips.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center text-slate-500 dark:text-slate-400">
            <Lightbulb size={36} className="text-slate-300" />
            <p className="text-sm">Aucun conseil pour le moment.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-white/5 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold">ID</th>
                    <th className="px-4 py-3 text-left font-bold">Titre / Contenu</th>
                    <th className="px-4 py-3 text-left font-bold">Step</th>
                    <th className="px-4 py-3 text-left font-bold">Subject</th>
                    <th className="px-4 py-3 text-left font-bold">Section</th>
                    <th className="px-4 py-3 text-left font-bold">Ordre</th>
                    <th className="px-4 py-3 text-left font-bold">Publié</th>
                    <th className="px-4 py-3 text-right font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                  {filteredTips.map((tip) => (
                    <tr key={tip.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                        {tip.id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {tip.title || <span className="italic text-gray-400">(sans titre)</span>}
                        </div>
                        <div className="mt-0.5 line-clamp-1 text-xs text-gray-500 dark:text-gray-400">
                          {tip.content}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                        {tip.stepId ? tip.stepId.slice(0, 8) : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                        {tip.subjectId ? tip.subjectId.slice(0, 8) : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                        <span
                          className={`rounded-full px-2 py-0.5 ${
                            tip.bacSection
                              ? 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400'
                              : 'text-gray-400'
                          }`}
                        >
                          {getSectionLabel(tip.bacSection)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-200">
                        {tip.order ?? 0}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => togglePublish(tip)}
                          disabled={toggleLoadingId === tip.id}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${
                            tip.isPublished
                              ? 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-400'
                          } disabled:opacity-50`}
                        >
                          {toggleLoadingId === tip.id ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : tip.isPublished ? (
                            <Eye size={11} />
                          ) : (
                            <EyeOff size={11} />
                          )}
                          {tip.isPublished ? 'Oui' : 'Non'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => togglePublish(tip)}
                            disabled={toggleLoadingId === tip.id}
                            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 dark:text-gray-400 disabled:opacity-50"
                            title={tip.isPublished ? 'Dépublier' : 'Publier'}
                          >
                            {tip.isPublished ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                          <button
                            onClick={() => {
                              setEditingTip(tip)
                              setShowForm(true)
                            }}
                            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-brand-blue dark:hover:bg-white/10 dark:text-gray-400"
                            title="Modifier"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => setTipToDelete(tip)}
                            className="rounded-lg p-2 text-gray-500 hover:bg-red-500/10 hover:text-red-600 dark:text-gray-400"
                            title="Supprimer"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </AdminCard>

      {showForm && (
        <TipFormModal
          tip={editingTip}
          onClose={() => {
            setShowForm(false)
            setEditingTip(null)
          }}
          onSaved={loadTips}
        />
      )}

      <DeleteConfirm
        tip={tipToDelete}
        onClose={() => setTipToDelete(null)}
        onConfirm={async () => {
          if (tipToDelete) {
            await tipsAPI.delete(tipToDelete.id)
            setTipToDelete(null)
            await loadTips()
          }
        }}
      />
    </div>
  )
}

export default TipsPage
