import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  FolderTree,
  Layers,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { stepsAPI, subjectsAPI, coursesAPI, exercisesAPI } from '../../services/api'
import { BAC_SECTION_OPTIONS } from '../../constants/bacSections'
import { AdminCard } from '../../components/admin/AdminCard'
import { PrimaryButton } from '../../components/admin/PrimaryButton'

interface Step {
  id: string
  title: string
  description?: string | null
  icon: string
  image?: string | null
  color: string
  order: number
  isPublished: boolean
  _count?: { subjects: number }
}

interface Subject {
  id: string
  name: string
  description?: string | null
  color: string
  icon: string
  order: number
  isActive: boolean
  bacSection: string
  sections?: string[]
  stepId?: string | null
  _count?: { courses: number; exercises: number }
}

interface Course {
  id: string
  title: string
  description?: string | null
  difficulty: string
  isPublished: boolean
  order: number
  sections?: string[]
}

interface Exercise {
  id: string
  title: string
  groupTitle?: string | null
  difficulty: string
  isPublished: boolean
  order: number
  sections?: string[]
}

const StepFormModal: React.FC<{
  initial: Step | null
  onClose: () => void
  onSave: (data: any) => Promise<void>
}> = ({ initial, onClose, onSave }) => {
  const [title, setTitle] = useState(initial?.title || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [color, setColor] = useState(initial?.color || '#0B5ED7')
  const [isPublished, setIsPublished] = useState(initial?.isPublished ?? true)
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!title.trim()) return
    setSaving(true)
    try {
      await onSave({ title, description, color, isPublished })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {initial ? 'Modifier le palier' : 'Nouveau palier'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Titre</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
              placeholder="Trimestre 1, Bac Blanc, ..."
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Couleur</label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-16 cursor-pointer rounded-lg border border-gray-200 dark:border-white/10"
              />
            </div>
            <label className="mt-5 flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="h-4 w-4"
              />
              Publié
            </label>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5">
            Annuler
          </button>
          <PrimaryButton onClick={submit} disabled={saving || !title.trim()}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : 'Enregistrer'}
          </PrimaryButton>
        </div>
      </div>
    </div>
  )
}

const SubjectFormModal: React.FC<{
  initial: Subject | null
  defaultStepId?: string
  onClose: () => void
  onSave: (data: any) => Promise<void>
}> = ({ initial, defaultStepId, onClose, onSave }) => {
  const [name, setName] = useState(initial?.name || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [color, setColor] = useState(initial?.color || '#3b82f6')
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [sections, setSections] = useState<string[]>(initial?.sections || [])
  const [saving, setSaving] = useState(false)

  const toggleSection = (value: string) => {
    setSections((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    )
  }

  const submit = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave({
        name,
        description,
        color,
        isActive,
        sections: sections.length ? sections : undefined,
        stepId: initial?.stepId || defaultStepId,
        bacSection: sections[0] || initial?.bacSection,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {initial ? 'Modifier la matière' : 'Nouvelle matière'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Nom</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
              placeholder="Mathématiques, Physique, ..."
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Sections (une matière peut appartenir à plusieurs sections)
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {BAC_SECTION_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-white/10"
                >
                  <input
                    type="checkbox"
                    checked={sections.includes(option.value)}
                    onChange={() => toggleSection(option.value)}
                    className="h-4 w-4"
                  />
                  <span className="dark:text-gray-200">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Couleur</label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-16 cursor-pointer rounded-lg border border-gray-200 dark:border-white/10"
              />
            </div>
            <label className="mt-5 flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4" />
              Active
            </label>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5">
            Annuler
          </button>
          <PrimaryButton onClick={submit} disabled={saving || !name.trim()}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : 'Enregistrer'}
          </PrimaryButton>
        </div>
      </div>
    </div>
  )
}

const SectionBadges: React.FC<{ sections?: string[] }> = ({ sections }) => {
  if (!sections || sections.length === 0) return <span className="text-xs text-gray-400">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {sections.map((s) => (
        <span key={s} className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-300">
          {s.replace(/_/g, ' ')}
        </span>
      ))}
    </div>
  )
}

const ContentTreePage: React.FC = () => {
  const navigate = useNavigate()
  const [steps, setSteps] = useState<Step[]>([])
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [stepModal, setStepModal] = useState<{ open: boolean; initial: Step | null }>({ open: false, initial: null })
  const [subjectModal, setSubjectModal] = useState<{ open: boolean; initial: Subject | null }>({ open: false, initial: null })
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({})
  const [notice, setNotice] = useState<string | null>(null)

  const loadSteps = useCallback(async () => {
    const res = await stepsAPI.getAllAdmin()
    const list = res.data.steps
    setSteps(list)
    if (list.length > 0 && !selectedStepId) {
      setSelectedStepId(list[0].id)
    }
  }, [selectedStepId])

  useEffect(() => {
    loadSteps()
      .catch(() => setNotice('Impossible de charger les paliers.'))
      .finally(() => setLoading(false))
  }, [loadSteps])

  const loadSubjects = useCallback(async () => {
    const res = await subjectsAPI.getAll()
    setSubjects(res.data)
  }, [])

  useEffect(() => {
    if (selectedStepId) {
      loadSubjects()
    }
  }, [selectedStepId, loadSubjects])

  const loadContent = useCallback(async (subjectId: string) => {
    const [cRes, eRes] = await Promise.all([
      coursesAPI.getAll({ subjectId }),
      exercisesAPI.getAll({ subjectId }),
    ])
    setCourses(cRes.data)
    setExercises(eRes.data)
  }, [])

  useEffect(() => {
    if (selectedSubjectId) {
      loadContent(selectedSubjectId).catch(() => setNotice('Impossible de charger le contenu.'))
    } else {
      setCourses([])
      setExercises([])
    }
  }, [selectedSubjectId, loadContent])

  const showNotice = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(null), 3000)
  }

  const handleSaveStep = async (data: any) => {
    if (stepModal.initial) {
      await stepsAPI.update(stepModal.initial.id, data)
    } else {
      await stepsAPI.create(data)
    }
    showNotice('Palier enregistré')
    await loadSteps()
  }

  const handleDeleteStep = async (id: string) => {
    if (!window.confirm('Supprimer ce palier ? Ses matières doivent être déplacées d’abord.')) return
    try {
      await stepsAPI.delete(id)
      showNotice('Palier supprimé')
      if (selectedStepId === id) setSelectedStepId(null)
      await loadSteps()
    } catch (err: any) {
      showNotice(err?.response?.data?.message || 'Impossible de supprimer ce palier')
    }
  }

  const handleMoveStep = async (id: string, direction: 'up' | 'down') => {
    const index = steps.findIndex((s) => s.id === id)
    const target = direction === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= steps.length) return
    const reordered = [...steps]
    const [item] = reordered.splice(index, 1)
    reordered.splice(target, 0, item)
    const orderedIds = reordered.map((s) => s.id)
    setSteps(reordered)
    await stepsAPI.reorder(orderedIds)
    showNotice('Ordre mis à jour')
  }

  const handleToggleStepPublish = async (step: Step) => {
    await stepsAPI.setPublish(step.id, !step.isPublished)
    showNotice(step.isPublished ? 'Palier masqué' : 'Palier publié')
    await loadSteps()
  }

  const handleSaveSubject = async (data: any) => {
    if (subjectModal.initial) {
      await subjectsAPI.update(subjectModal.initial.id, data)
    } else {
      await subjectsAPI.create(data)
    }
    showNotice('Matière enregistrée')
    await loadSubjects()
  }

  const handleDeleteSubject = async (id: string) => {
    if (!window.confirm('Supprimer cette matière ? Tous ses cours et exercices seront supprimés.')) return
    try {
      await subjectsAPI.delete(id)
      showNotice('Matière supprimée')
      if (selectedSubjectId === id) setSelectedSubjectId(null)
      await loadSubjects()
    } catch (err: any) {
      showNotice(err?.response?.data?.message || 'Impossible de supprimer cette matière')
    }
  }

  const handleMoveSubject = async (id: string, direction: 'up' | 'down') => {
    const index = stepSubjects.findIndex((s) => s.id === id)
    const target = direction === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= stepSubjects.length) return
    const reordered = [...stepSubjects]
    const [item] = reordered.splice(index, 1)
    reordered.splice(target, 0, item)
    const orderedItems = reordered.map((s, i) => ({ id: s.id, order: i }))
    const allReordered = subjects.map((s) => {
      const ri = reordered.findIndex((r) => r.id === s.id)
      return ri >= 0 ? reordered[ri] : s
    })
    setSubjects(allReordered)
    await subjectsAPI.reorder(orderedItems)
    showNotice('Ordre mis à jour')
  }

  const handleToggleSubjectActive = async (subject: Subject) => {
    await subjectsAPI.setActive(subject.id, !subject.isActive)
    showNotice(subject.isActive ? 'Matière masquée' : 'Matière publiée')
    await loadSubjects()
  }

  const handleDeleteCourse = async (id: string) => {
    if (!window.confirm('Supprimer ce cours ?')) return
    try {
      await coursesAPI.delete(id)
      showNotice('Cours supprimé')
      if (selectedSubjectId) await loadContent(selectedSubjectId)
    } catch (err: any) {
      showNotice(err?.response?.data?.message || 'Impossible de supprimer ce cours')
    }
  }

  const handleMoveCourse = async (id: string, direction: 'up' | 'down') => {
    const index = courses.findIndex((c) => c.id === id)
    const target = direction === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= courses.length) return
    const reordered = [...courses]
    const [item] = reordered.splice(index, 1)
    reordered.splice(target, 0, item)
    const orderedItems = reordered.map((c, i) => ({ id: c.id, order: i }))
    setCourses(reordered)
    await coursesAPI.reorder(orderedItems)
    showNotice('Ordre mis à jour')
  }

  const handleDeleteExercise = async (id: string) => {
    if (!window.confirm('Supprimer cet exercice ?')) return
    try {
      await exercisesAPI.delete(id)
      showNotice('Exercice supprimé')
      if (selectedSubjectId) await loadContent(selectedSubjectId)
    } catch (err: any) {
      showNotice(err?.response?.data?.message || 'Impossible de supprimer cet exercice')
    }
  }

  const handleMoveExercise = async (id: string, direction: 'up' | 'down') => {
    const index = exercises.findIndex((e) => e.id === id)
    const target = direction === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= exercises.length) return
    const reordered = [...exercises]
    const [item] = reordered.splice(index, 1)
    reordered.splice(target, 0, item)
    const orderedItems = reordered.map((e, i) => ({ id: e.id, order: i }))
    setExercises(reordered)
    await exercisesAPI.reorder(orderedItems)
    showNotice('Ordre mis à jour')
  }

  const handleToggleCoursePublish = async (course: Course) => {
    await coursesAPI.setPublish(course.id, !course.isPublished)
    showNotice(course.isPublished ? 'Cours masqué' : 'Cours publié')
    if (selectedSubjectId) await loadContent(selectedSubjectId)
  }

  const handleToggleExercisePublish = async (exercise: Exercise) => {
    await exercisesAPI.setPublish(exercise.id, !exercise.isPublished)
    showNotice(exercise.isPublished ? 'Exercice masqué' : 'Exercice publié')
    if (selectedSubjectId) await loadContent(selectedSubjectId)
  }

  const selectedStep = useMemo(() => steps.find((s) => s.id === selectedStepId) || null, [steps, selectedStepId])
  const selectedSubject = useMemo(() => subjects.find((s) => s.id === selectedSubjectId) || null, [subjects, selectedSubjectId])
  const stepSubjects = useMemo(
    () => (selectedStepId ? subjects.filter((s) => s.stepId === selectedStepId || !s.stepId) : []),
    [subjects, selectedStepId]
  )

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 size={30} className="animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
      {notice && (
        <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
          {notice}
        </div>
      )}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
            <FolderTree className="text-blue-600" /> Arbre de contenu
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Learning Path → Palier → Matière → Cours / Exercices
          </p>
        </div>
        <PrimaryButton onClick={() => setStepModal({ open: true, initial: null })}>
          <Plus size={16} /> Nouveau palier
        </PrimaryButton>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        {/* Steps column */}
        <AdminCard>
          <div className="mb-3 flex items-center justify-between px-5 pt-5">
            <h2 className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
              <Layers size={18} className="text-blue-600" /> Paliers
            </h2>
          </div>
          <div className="space-y-2 p-4">
            {steps.length === 0 && (
              <p className="px-2 py-6 text-center text-sm text-gray-400">Aucun palier. Créez-en un.</p>
            )}
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`rounded-2xl border p-3 transition-colors ${
                  selectedStepId === step.id
                    ? 'border-blue-500/50 bg-blue-50/60 dark:bg-blue-500/10'
                    : 'border-gray-200 dark:border-white/10 hover:border-blue-300'
                }`}
              >
                <button onClick={() => setSelectedStepId(step.id)} className="flex w-full items-center gap-2 text-left">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: step.color }} />
                  <span className="flex-1 truncate font-semibold text-gray-800 dark:text-gray-100">{step.title}</span>
                  {step.isPublished ? (
                    <Eye size={15} className="text-emerald-500" />
                  ) : (
                    <EyeOff size={15} className="text-gray-400" />
                  )}
                </button>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {step._count?.subjects || 0} matières · ordre {step.order}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      title="Monter"
                      onClick={() => handleMoveStep(step.id, 'up')}
                      disabled={index === 0}
                      className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-white/5"
                    >
                      <ChevronRight size={16} className="rotate-[-90deg]" />
                    </button>
                    <button
                      title="Descendre"
                      onClick={() => handleMoveStep(step.id, 'down')}
                      disabled={index === steps.length - 1}
                      className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-white/5"
                    >
                      <ChevronDown size={16} />
                    </button>
                    <button
                      title="Publier/Masquer"
                      onClick={() => handleToggleStepPublish(step)}
                      className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
                    >
                      {step.isPublished ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                    <button
                      title="Modifier"
                      onClick={() => setStepModal({ open: true, initial: step })}
                      className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      title="Supprimer"
                      onClick={() => handleDeleteStep(step.id)}
                      className="rounded-lg p-1 text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </AdminCard>

        {/* Subjects / content column */}
        <div className="space-y-6">
          <AdminCard>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
              <h2 className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
                <BookOpen size={18} className="text-blue-600" />
                Matières {selectedStep ? `— ${selectedStep.title}` : ''}
              </h2>
              <PrimaryButton
                onClick={() => setSubjectModal({ open: true, initial: null })}
                disabled={!selectedStep}
              >
                <Plus size={16} /> Nouvelle matière
              </PrimaryButton>
            </div>
            <div className="p-4">
              {!selectedStep && (
                <p className="py-8 text-center text-sm text-gray-400">Sélectionnez un palier pour gérer ses matières.</p>
              )}
              {selectedStep && stepSubjects.length === 0 && (
                <p className="py-8 text-center text-sm text-gray-400">Aucune matière dans ce palier.</p>
              )}
              <div className="grid gap-3 md:grid-cols-2">
                {stepSubjects.map((subject, sIndex) => {
                  const expanded = Boolean(expandedSubjects[subject.id])
                  const isSelected = selectedSubjectId === subject.id
                  return (
                    <div key={subject.id} className="rounded-2xl border border-gray-200 p-3 dark:border-white/10">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedSubjectId(isSelected ? null : subject.id)
                            setExpandedSubjects((prev) => ({ ...prev, [subject.id]: !isSelected }))
                          }}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        >
                          <span className="h-8 w-8 shrink-0 rounded-lg" style={{ backgroundColor: subject.color || '#3b82f6' }} />
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-gray-800 dark:text-gray-100">{subject.name}</span>
                            <span className="block text-xs text-gray-400">
                              {subject._count?.courses || 0} cours · {subject._count?.exercises || 0} exercices
                            </span>
                          </span>
                          {expanded ? <ChevronDown size={16} className="shrink-0 text-gray-400" /> : <ChevronRight size={16} className="shrink-0 text-gray-400" />}
                        </button>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            title="Monter"
                            onClick={() => handleMoveSubject(subject.id, 'up')}
                            disabled={sIndex === 0}
                            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-white/5"
                          >
                            <ChevronRight size={16} className="rotate-[-90deg]" />
                          </button>
                          <button
                            title="Descendre"
                            onClick={() => handleMoveSubject(subject.id, 'down')}
                            disabled={sIndex === stepSubjects.length - 1}
                            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-white/5"
                          >
                            <ChevronDown size={16} />
                          </button>
                          <button
                            title={subject.isActive ? 'Masquer' : 'Publier'}
                            onClick={() => handleToggleSubjectActive(subject)}
                            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
                          >
                            {subject.isActive ? <Eye size={15} className="text-emerald-500" /> : <EyeOff size={15} className="text-gray-400" />}
                          </button>
                          <button
                            title="Modifier"
                            onClick={() => setSubjectModal({ open: true, initial: subject })}
                            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            title="Supprimer"
                            onClick={() => handleDeleteSubject(subject.id)}
                            className="rounded-lg p-1 text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2">
                        <SectionBadges sections={subject.sections} />
                      </div>
                      {expanded && (
                        <div className="mt-2 rounded-xl bg-gray-50 p-2 text-xs text-gray-500 dark:bg-white/5 dark:text-gray-400">
                          Cliquez sur le contenu ci-dessous pour gérer les cours et exercices de « {subject.name} ».
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </AdminCard>

          {selectedSubject && (
            <AnimatePresence>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <AdminCard>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
                    <h2 className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
                      <FileText size={18} className="text-blue-600" /> Contenu de « {selectedSubject.name} »
                    </h2>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/admin/content-tree/course/new?subjectId=${selectedSubject.id}`)}
                        className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        + Cours
                      </button>
                      <button
                        onClick={() => navigate(`/admin/content-tree/exercise/new?subjectId=${selectedSubject.id}`)}
                        className="rounded-xl bg-orange-600 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-700"
                      >
                        + Exercice
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-4 p-5 lg:grid-cols-2">
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-gray-500 dark:text-gray-400">Cours</h3>
                      {courses.length === 0 && <p className="text-sm text-gray-400">Aucun cours.</p>}
                      <ul className="space-y-2">
                        {courses.map((course, cIndex) => (
                          <li key={course.id} className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 px-3 py-2 dark:border-white/10">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">{course.title}</p>
                              <SectionBadges sections={course.sections} />
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <button
                                title="Monter"
                                onClick={() => handleMoveCourse(course.id, 'up')}
                                disabled={cIndex === 0}
                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-white/5"
                              >
                                <ChevronRight size={16} className="rotate-[-90deg]" />
                              </button>
                              <button
                                title="Descendre"
                                onClick={() => handleMoveCourse(course.id, 'down')}
                                disabled={cIndex === courses.length - 1}
                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-white/5"
                              >
                                <ChevronDown size={16} />
                              </button>
                              <button
                                title={course.isPublished ? 'Masquer' : 'Publier'}
                                onClick={() => handleToggleCoursePublish(course)}
                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
                              >
                                {course.isPublished ? <Eye size={15} className="text-emerald-500" /> : <EyeOff size={15} className="text-gray-400" />}
                              </button>
                              <button
                                title="Modifier"
                                onClick={() => navigate(`/admin/content-tree/course/${course.id}`)}
                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                title="Supprimer"
                                onClick={() => handleDeleteCourse(course.id)}
                                className="rounded-lg p-1 text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-gray-500 dark:text-gray-400">Exercices</h3>
                      {exercises.length === 0 && <p className="text-sm text-gray-400">Aucun exercice.</p>}
                      <ul className="space-y-2">
                        {exercises.map((exercise, eIndex) => (
                          <li key={exercise.id} className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 px-3 py-2 dark:border-white/10">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">{exercise.title}</p>
                              <SectionBadges sections={exercise.sections} />
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <button
                                title="Monter"
                                onClick={() => handleMoveExercise(exercise.id, 'up')}
                                disabled={eIndex === 0}
                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-white/5"
                              >
                                <ChevronRight size={16} className="rotate-[-90deg]" />
                              </button>
                              <button
                                title="Descendre"
                                onClick={() => handleMoveExercise(exercise.id, 'down')}
                                disabled={eIndex === exercises.length - 1}
                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-white/5"
                              >
                                <ChevronDown size={16} />
                              </button>
                              <button
                                title={exercise.isPublished ? 'Masquer' : 'Publier'}
                                onClick={() => handleToggleExercisePublish(exercise)}
                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
                              >
                                {exercise.isPublished ? <Eye size={15} className="text-emerald-500" /> : <EyeOff size={15} className="text-gray-400" />}
                              </button>
                              <button
                                title="Modifier"
                                onClick={() => navigate(`/admin/content-tree/exercise/${exercise.id}`)}
                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                title="Supprimer"
                                onClick={() => handleDeleteExercise(exercise.id)}
                                className="rounded-lg p-1 text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </AdminCard>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      <AnimatePresence>
        {stepModal.open && (
          <StepFormModal
            initial={stepModal.initial}
            onClose={() => setStepModal({ open: false, initial: null })}
            onSave={handleSaveStep}
          />
        )}
        {subjectModal.open && (
          <SubjectFormModal
            initial={subjectModal.initial}
            defaultStepId={selectedStepId || undefined}
            onClose={() => setSubjectModal({ open: false, initial: null })}
            onSave={handleSaveSubject}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default ContentTreePage
