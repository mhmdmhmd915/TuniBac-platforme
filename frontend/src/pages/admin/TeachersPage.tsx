import { useCallback, useEffect, useState } from 'react'
import {
  GraduationCap,
  Loader2,
  Pencil,
  Plus,
  Search,
  X,
} from 'lucide-react'
import { adminTeachersAPI, subjectsAPI } from '../../services/api'
import { BAC_SECTION_OPTIONS } from '../../constants/bacSections'
import { AdminCard } from '../../components/admin/AdminCard'

interface Teacher {
  id: string
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
  status: string
  teacherAssignments: Array<{ id: string; subjectId: string | null; subjectName?: string | null; bacSection: string | null }>
}

interface Subject {
  id: string
  name: string
}

const AssignModal: React.FC<{
  teacher: Teacher
  onClose: () => void
  onSaved: () => void
}> = ({ teacher, onClose, onSaved }) => {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubjects, setSelectedSubjects] = useState<Record<string, boolean>>({})
  const [selectedSections, setSelectedSections] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    subjectsAPI
      .getAll()
      .then((res) => setSubjects(res.data))
      .catch(() => {})
    const initial: Record<string, boolean> = {}
    const sections: Record<string, boolean> = {}
    teacher.teacherAssignments.forEach((a) => {
      if (a.subjectId) initial[a.subjectId] = true
      if (a.bacSection) sections[a.bacSection] = true
    })
    setSelectedSubjects(initial)
    setSelectedSections(sections)
  }, [teacher])

  const toggleSubject = (id: string) => setSelectedSubjects((prev) => ({ ...prev, [id]: !prev[id] }))
  const toggleSection = (value: string) => setSelectedSections((prev) => ({ ...prev, [value]: !prev[value] }))

  const save = async () => {
    setSaving(true)
    try {
      const assignments: Array<{ subjectId: string | null; bacSection: string | null }> = []
      Object.entries(selectedSubjects).forEach(([subjectId, checked]) => {
        if (checked) assignments.push({ subjectId, bacSection: null })
      })
      Object.entries(selectedSections).forEach(([bacSection, checked]) => {
        if (checked) assignments.push({ subjectId: null, bacSection })
      })
      await adminTeachersAPI.setAssignments(teacher.id, assignments)
      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Assignations — {teacher.firstName} {teacher.lastName}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
          Matières autorisées
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {subjects.map((subject) => (
            <label
              key={subject.id}
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-white/10"
            >
              <input
                type="checkbox"
                checked={Boolean(selectedSubjects[subject.id])}
                onChange={() => toggleSubject(subject.id)}
                className="h-4 w-4"
              />
              <span className="dark:text-gray-200">{subject.name}</span>
            </label>
          ))}
        </div>

        <p className="mb-2 mt-5 text-sm font-semibold text-gray-700 dark:text-gray-300">
          Sections autorisées (optionnel — restreint toutes les matières)
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {BAC_SECTION_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-white/10"
            >
              <input
                type="checkbox"
                checked={Boolean(selectedSections[option.value])}
                onChange={() => toggleSection(option.value)}
                className="h-4 w-4"
              />
              <span className="dark:text-gray-200">{option.label}</span>
            </label>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5">
            Annuler
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

const CreateTeacherModal: React.FC<{
  onClose: () => void
  onSaved: () => void
}> = ({ onClose, onSaved }) => {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [bacSection, setBacSection] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const payload: any = { firstName, lastName, phone, password }
      if (bacSection) payload.bacSection = bacSection
      await adminTeachersAPI.createTeacher(payload)
      onSaved()
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.message || "Erreur lors de la création de l'enseignant")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Ajouter un enseignant
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Prénom
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                placeholder="Prénom"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Nom
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                placeholder="Nom"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Téléphone (Tunisie, ex: 98123456)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
              placeholder="98123456"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Mot de passe (min. 6 caractères)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
              placeholder="••••••"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Section Bac (optionnel)
            </label>
            <select
              value={bacSection}
              onChange={(e) => setBacSection(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              <option value="">— Aucune —</option>
              {BAC_SECTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const TeachersPage: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState<Teacher | null>(null)
  const [creating, setCreating] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async (query = '') => {
    const res = await adminTeachersAPI.getAll({ search: query })
    setTeachers(res.data.teachers)
  }, [])

  useEffect(() => {
    load()
      .catch(() => setNotice('Impossible de charger les enseignants.'))
      .finally(() => setLoading(false))
  }, [load])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    load(search)
  }

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6">
      {notice && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{notice}</div>
      )}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
            <GraduationCap className="text-blue-600" /> Enseignants
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Assignez des matières et des sections aux enseignants. Ils ne gèrent que leur périmètre.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <Plus size={16} /> Ajouter enseignant
          </button>
        </div>
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>
          <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            Rechercher
          </button>
        </form>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {teachers.length === 0 && (
            <p className="col-span-full py-12 text-center text-sm text-gray-400">
              Aucun enseignant. Les enseignants sont des comptes avec le rôle « Enseignant ».
            </p>
          )}
          {teachers.map((teacher) => (
            <AdminCard key={teacher.id}>
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600/10 text-lg font-bold text-blue-600">
                  {teacher.firstName?.[0]}
                  {teacher.lastName?.[0]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-gray-900 dark:text-white">
                    {teacher.firstName} {teacher.lastName}
                  </p>
                  <p className="truncate text-xs text-gray-400">
                    {teacher.email || teacher.phone || '—'}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    teacher.status === 'APPROVED'
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : 'bg-amber-500/10 text-amber-600'
                  }`}
                >
                  {teacher.status}
                </span>
              </div>
              <div className="mt-3">
                {teacher.teacherAssignments.length === 0 ? (
                  <p className="text-xs text-gray-400">Aucune assignation.</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {teacher.teacherAssignments.map((a) => (
                      <span
                        key={a.id}
                        className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-300"
                      >
                        {a.subjectName || a.bacSection?.replace(/_/g, ' ') || 'Tout'}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => setAssigning(teacher)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-2 text-sm font-semibold text-gray-700 hover:border-blue-400 hover:text-blue-600 dark:border-white/10 dark:text-gray-200"
              >
                <Pencil size={15} /> Gérer les assignations
              </button>
            </AdminCard>
          ))}
        </div>
      )}

      {assigning && (
        <AssignModal
          teacher={assigning}
          onClose={() => setAssigning(null)}
          onSaved={() => {
            setNotice('Assignations enregistrées')
            window.setTimeout(() => setNotice(null), 3000)
            load(search)
          }}
        />
      )}

      {creating && (
        <CreateTeacherModal
          onClose={() => setCreating(false)}
          onSaved={() => {
            setNotice('Enseignant créé avec succès')
            window.setTimeout(() => setNotice(null), 3000)
            load(search)
          }}
        />
      )}
    </div>
  )
}

export default TeachersPage
