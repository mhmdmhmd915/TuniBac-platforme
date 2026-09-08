import { useCallback, useEffect, useState } from 'react'
import {
  GraduationCap,
  ImagePlus,
  Loader2,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { teacherAPI, coursesAPI, exercisesAPI } from '../services/api'
import { BAC_SECTION_OPTIONS } from '../constants/bacSections'

interface TeacherContent {
  id: string
  title: string
  description?: string | null
  difficulty: string
  isPublished: boolean
  createdAt: string
  sections: string[]
  groupTitle?: string | null
  subject: { id: string; name: string; color: string }
}

interface ScopeInfo {
  assignments: Array<{ subjectId: string | null; bacSection: string | null }>
  subjects: Array<{ id: string; name: string; color: string; icon: string }>
  allSubjects: Array<{ id: string; name: string }>
}

interface Profile {
  id?: string
  photo?: string | null
  bio?: string | null
  whatsapp?: string | null
  externalLink?: string | null
  isPublic: boolean
}

const emptyCourseForm = (subjectId: string) => ({
  title: '',
  description: '',
  subjectId,
  difficulty: 'BEGINNER',
  sections: [] as string[],
  contentText: '',
  externalLink: '',
})

const emptyExerciseForm = (subjectId: string) => ({
  title: '',
  description: '',
  subjectId,
  difficulty: 'BEGINNER',
  sections: [] as string[],
  groupTitle: '',
})

const TeacherWorkspace: React.FC = () => {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [scope, setScope] = useState<ScopeInfo | null>(null)
  const [content, setContent] = useState<{ courses: TeacherContent[]; exercises: TeacherContent[] }>({ courses: [], exercises: [] })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'profile' | 'courses' | 'exercises'>('profile')
  const [notice, setNotice] = useState<string | null>(null)
  const [courseModal, setCourseModal] = useState(false)
  const [exerciseModal, setExerciseModal] = useState(false)

  const loadAll = useCallback(async () => {
    const [meRes, scopeRes, contentRes] = await Promise.all([
      teacherAPI.getMe(),
      teacherAPI.getScope(),
      teacherAPI.getContent(),
    ])
    setProfile(meRes.data.profile || { isPublic: false })
    setScope(scopeRes.data)
    setContent(contentRes.data)
  }, [])

  useEffect(() => {
    loadAll().catch(() => setNotice('Impossible de charger ton espace.')).finally(() => setLoading(false))
  }, [loadAll])

  const showNotice = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(null), 3500)
  }

  const handleProfileSave = async (data: Partial<Profile>) => {
    await teacherAPI.updateProfile(data)
    showNotice('Profil mis à jour')
    await loadAll()
  }

  const handleCourseSave = async (form: ReturnType<typeof emptyCourseForm>, id?: string) => {
    if (id) {
      await coursesAPI.update(id, form)
    } else {
      await coursesAPI.create(form)
    }
    showNotice('Cours enregistré — en attente de publication par l’administration')
    setCourseModal(false)
    await loadAll()
  }

  const handleExerciseSave = async (form: ReturnType<typeof emptyExerciseForm>, id?: string) => {
    if (id) {
      await exercisesAPI.update(id, form)
    } else {
      await exercisesAPI.create(form)
    }
    showNotice('Exercice enregistré — en attente de publication par l’administration')
    setExerciseModal(false)
    await loadAll()
  }

  const handleCourseDelete = async (id: string) => {
    if (!window.confirm('Supprimer ce cours ?')) return
    await coursesAPI.delete(id)
    showNotice('Cours supprimé')
    await loadAll()
  }

  const handleExerciseDelete = async (id: string) => {
    if (!window.confirm('Supprimer cet exercice ?')) return
    await exercisesAPI.delete(id)
    showNotice('Exercice supprimé')
    await loadAll()
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 size={30} className="animate-spin text-blue-600" />
      </div>
    )
  }

  const allowedSubjects = scope?.subjects?.length ? scope.subjects : scope?.allSubjects || []

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {notice && (
        <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">{notice}</div>
      )}
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
          <GraduationCap className="text-blue-600" /> Espace Enseignant
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Crée et gère ton contenu. Il sera publié après approbation de l’administration.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { key: 'profile', label: 'Mon profil' },
          { key: 'courses', label: `Mes cours (${content.courses.length})` },
          { key: 'exercises', label: `Mes exercices (${content.exercises.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white'
                : 'border border-gray-200 text-gray-600 hover:border-blue-400 dark:border-white/10 dark:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && profile && (
        <ProfileEditor profile={profile} onSave={handleProfileSave} />
      )}

      {activeTab === 'courses' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Matières autorisées : {allowedSubjects.map((s) => s.name).join(', ') || 'Toutes'}
            </p>
            <button
              onClick={() => setCourseModal(true)}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus size={16} /> Nouveau cours
            </button>
          </div>
          <ContentGrid
            items={content.courses}
            onDelete={handleCourseDelete}
            renderStatus={(c) => (c.isPublished ? 'Publié' : 'En attente')}
          />
          {courseModal && (
            <CourseFormModal
              subjects={allowedSubjects}
              onClose={() => setCourseModal(false)}
              onSave={handleCourseSave}
            />
          )}
        </div>
      )}

      {activeTab === 'exercises' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Matières autorisées : {allowedSubjects.map((s) => s.name).join(', ') || 'Toutes'}
            </p>
            <button
              onClick={() => setExerciseModal(true)}
              className="flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
            >
              <Plus size={16} /> Nouvel exercice
            </button>
          </div>
          <ContentGrid
            items={content.exercises}
            onDelete={handleExerciseDelete}
            renderStatus={(c) => (c.isPublished ? 'Publié' : 'En attente')}
          />
          {exerciseModal && (
            <ExerciseFormModal
              subjects={allowedSubjects}
              onClose={() => setExerciseModal(false)}
              onSave={handleExerciseSave}
            />
          )}
        </div>
      )}
    </div>
  )
}

const ProfileEditor: React.FC<{ profile: Profile; onSave: (data: Partial<Profile>) => Promise<void> }> = ({ profile, onSave }) => {
  const [bio, setBio] = useState(profile.bio || '')
  const [whatsapp, setWhatsapp] = useState(profile.whatsapp || '')
  const [externalLink, setExternalLink] = useState(profile.externalLink || '')
  const [isPublic, setIsPublic] = useState(profile.isPublic)
  const [photo, setPhoto] = useState(profile.photo || '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  const uploadPhoto = async (file: File) => {
    setUploading(true)
    try {
      const res = await teacherAPI.uploadPhoto(file)
      setPhoto(res.data.fileUrl || res.data.url || '')
    } finally {
      setUploading(false)
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      await onSave({ bio, whatsapp, externalLink, isPublic, photo })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-white/10 dark:bg-slate-900">
      <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">Profil public</h2>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          {photo ? (
            <img src={photo} alt="photo" className="h-20 w-20 rounded-2xl object-cover" />
          ) : (
            <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-100 text-gray-300 dark:bg-white/5">
              <GraduationCap size={32} />
            </span>
          )}
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 dark:border-white/15">
            <ImagePlus size={16} /> {uploading ? 'Envoi...' : 'Photo'}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
          </label>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Bio</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">WhatsApp</label>
            <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white" placeholder="Ex : 20123456" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Lien externe</label>
            <input value={externalLink} onChange={(e) => setExternalLink(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white" placeholder="https://..." />
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="h-4 w-4" />
          Rendre mon profil public
        </label>
        <button onClick={save} disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
          {saving ? <Loader2 size={16} className="animate-spin" /> : 'Enregistrer le profil'}
        </button>
      </div>
    </div>
  )
}

const ContentGrid: React.FC<{
  items: TeacherContent[]
  onDelete: (id: string) => void
  renderStatus: (item: TeacherContent) => string
}> = ({ items, onDelete, renderStatus }) => {
  if (items.length === 0) {
    return <p className="py-12 text-center text-sm text-gray-400">Aucun contenu pour le moment.</p>
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((item) => (
        <div key={item.id} className="rounded-2xl border border-gray-200 p-4 dark:border-white/10">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold text-gray-900 dark:text-white">{item.title}</p>
              <p className="mt-0.5 text-xs" style={{ color: item.subject.color }}>{item.subject.name}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.isPublished ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
              {renderStatus(item)}
            </span>
          </div>
          {item.description && <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">{item.description}</p>}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex flex-wrap gap-1">
              {item.sections.map((s) => (
                <span key={s} className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-600 dark:text-blue-300">
                  {s.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
            <button onClick={() => onDelete(item.id)} className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10">
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

const SectionPicker: React.FC<{ value: string[]; onChange: (v: string[]) => void }> = ({ value, onChange }) => {
  const toggle = (section: string) =>
    onChange(value.includes(section) ? value.filter((s) => s !== section) : [...value, section])
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {BAC_SECTION_OPTIONS.map((option) => (
        <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-white/10">
          <input type="checkbox" checked={value.includes(option.value)} onChange={() => toggle(option.value)} className="h-4 w-4" />
          <span className="dark:text-gray-200">{option.label}</span>
        </label>
      ))}
    </div>
  )
}

const CourseFormModal: React.FC<{
  subjects: Array<{ id: string; name: string }>
  onClose: () => void
  onSave: (form: any, id?: string) => Promise<void>
}> = ({ subjects, onClose, onSave }) => {
  const [form, setForm] = useState(emptyCourseForm(subjects[0]?.id || ''))
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      await onSave({ ...form, sections: form.sections })
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell title="Nouveau cours" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Titre *</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Matière</label>
          <select value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white">
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Contenu (texte)</label>
          <textarea value={form.contentText} onChange={(e) => setForm({ ...form, contentText: e.target.value })} rows={3} className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Lien externe</label>
          <input value={form.externalLink} onChange={(e) => setForm({ ...form, externalLink: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Sections</label>
          <SectionPicker value={form.sections} onChange={(v) => setForm({ ...form, sections: v })} />
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5">Annuler</button>
        <button onClick={submit} disabled={saving || !form.title.trim()} className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
          {saving ? <Loader2 size={16} className="animate-spin" /> : 'Enregistrer'}
        </button>
      </div>
    </ModalShell>
  )
}

const ExerciseFormModal: React.FC<{
  subjects: Array<{ id: string; name: string }>
  onClose: () => void
  onSave: (form: any, id?: string) => Promise<void>
}> = ({ subjects, onClose, onSave }) => {
  const [form, setForm] = useState(emptyExerciseForm(subjects[0]?.id || ''))
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      await onSave({ ...form, sections: form.sections })
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell title="Nouvel exercice" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Titre *</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Matière</label>
          <select value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white">
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Chapitre / Groupe</label>
          <input value={form.groupTitle} onChange={(e) => setForm({ ...form, groupTitle: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white" placeholder="Ex : Suites numériques" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Sections</label>
          <SectionPicker value={form.sections} onChange={(v) => setForm({ ...form, sections: v })} />
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5">Annuler</button>
        <button onClick={submit} disabled={saving || !form.title.trim()} className="rounded-xl bg-orange-600 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60">
          {saving ? <Loader2 size={16} className="animate-spin" /> : 'Enregistrer'}
        </button>
      </div>
    </ModalShell>
  )
}

const ModalShell: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
      </div>
      {children}
    </div>
  </div>
)

export default TeacherWorkspace
