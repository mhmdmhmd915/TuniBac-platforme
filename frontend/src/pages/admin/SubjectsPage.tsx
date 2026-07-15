import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, X, Palette, Type, AlignLeft, GripVertical, Eye, EyeOff } from 'lucide-react';
import { adminAPI } from '../../services/api';
import { AdminCard } from '../../components/admin/AdminCard';
import { SectionTitle } from '../../components/admin/SectionTitle';
import { EmptyState } from '../../components/admin/EmptyState';
import { PrimaryButton } from '../../components/admin/PrimaryButton';
import { SuccessToast } from '../../components/admin/SuccessToast';
import { DeleteModal } from '../../components/admin/DeleteModal';
import { SearchBar } from '../../components/admin/SearchBar';
import { Column, DataTable } from '../../components/admin/DataTable';
import { AdminSubject } from '../../features/admin/types';
import { BAC_SECTION_OPTIONS, DEFAULT_BAC_SECTION, type BacSection } from '../../constants/bacSections';
import { logger } from '../../lib/logger';

const ADMIN_SECTION_STORAGE_KEY = 'adminWorkspaceBacSection';

export const SubjectsPage = () => {
  const [currentBacSection, setCurrentBacSection] = useState<BacSection>(() => {
    const stored = localStorage.getItem(ADMIN_SECTION_STORAGE_KEY);
    if (stored && BAC_SECTION_OPTIONS.some((option) => option.value === stored)) {
      return stored as BacSection;
    }

    return DEFAULT_BAC_SECTION;
  });
  const [subjects, setSubjects] = useState<AdminSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSubject, setCurrentSubject] = useState<AdminSubject | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    icon: 'book',
    order: 0,
    isActive: true,
  });
  const [toast, setToast] = useState({ isVisible: false, type: 'success' as 'success' | 'error', message: '' });
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    ids: [] as string[],
    label: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getSubjects({ bacSection: currentBacSection });
      setSubjects(response.data);
    } catch (error) {
      logger.error('Error fetching subjects', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, [currentBacSection]);

  useEffect(() => {
    localStorage.setItem(ADMIN_SECTION_STORAGE_KEY, currentBacSection);
  }, [currentBacSection]);

  const filteredSubjects = subjects.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenModal = (subject?: AdminSubject) => {
    if (subject) {
      setCurrentSubject(subject);
      setFormData({
        name: subject.name,
        description: subject.description || '',
        color: subject.color,
        icon: subject.icon,
        order: subject.order,
        isActive: subject.isActive,
      });
    } else {
      setCurrentSubject(null);
      setFormData({
        name: '',
        description: '',
        color: '#3B82F6',
        icon: 'book',
        order: subjects.length,
        isActive: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (currentSubject) {
        await adminAPI.updateSubject(currentSubject.id, { ...formData, bacSection: currentBacSection });
        setToast({ isVisible: true, type: 'success', message: 'Subject updated successfully!' });
      } else {
        await adminAPI.createSubject({ ...formData, bacSection: currentBacSection });
        setToast({ isVisible: true, type: 'success', message: 'Subject created successfully!' });
      }
      setIsModalOpen(false);
      setSelectedIds([]);
      fetchSubjects();
    } catch (error) {
      logger.error('Error saving subject', error);
      setToast({ isVisible: true, type: 'error', message: 'Failed to save subject' });
    } finally {
      setIsSaving(false);
    }
  };

  const openDelete = async (ids: string[], label: string) => {
    try {
      setIsDeleting(true);
      const usages = await Promise.all(
        ids.map(async (id) => {
          const response = await adminAPI.getSubjectUsage(id);
          return { id, usage: response.data as { courses: number; exercises: number; studyTasks: number } };
        })
      );

      const blocked = usages.filter(
        (u) => u.usage.courses > 0 || u.usage.exercises > 0 || u.usage.studyTasks > 0
      );

      if (blocked.length > 0) {
        const first = blocked[0];
        setToast({
          isVisible: true,
          type: 'error',
          message: `Suppression bloquée: liée à ${first.usage.courses} cours, ${first.usage.exercises} exercices, ${first.usage.studyTasks} tâches.`,
        });
        return;
      }

      setDeleteModal({ isOpen: true, ids, label });
    } catch (error) {
      logger.error('Error checking subject usage', error);
      setToast({ isVisible: true, type: 'error', message: 'Failed to check subject usage' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDelete = async () => {
    try {
      if (deleteModal.ids.length === 0) {
        return;
      }
      setIsDeleting(true);
      await Promise.all(deleteModal.ids.map((id) => adminAPI.deleteSubject(id)));
      setDeleteModal({ isOpen: false, ids: [], label: '' });
      setSelectedIds([]);
      setToast({ isVisible: true, type: 'success', message: 'Subject deleted successfully!' });
      fetchSubjects();
    } catch (error) {
      logger.error('Error deleting subject', error);
      setToast({ isVisible: true, type: 'error', message: 'Failed to delete subject' });
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: Column<AdminSubject>[] = [
    {
      header: 'Subject',
      key: 'name' as const,
      render: (_: unknown, subject: AdminSubject) => (
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: subject.color + '20', color: subject.color }}
          >
            <Type size={20} />
          </div>
          <div>
            <div className="font-semibold text-gray-900 dark:text-white">{subject.name}</div>
            {subject.description && (
              <div className="text-sm text-gray-500 dark:text-gray-400">{subject.description}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Color',
      key: 'color' as const,
      render: (color: unknown) => (
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg shadow-sm"
            style={{ backgroundColor: String(color) }}
          />
          <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">{String(color)}</span>
        </div>
      ),
    },
    {
      header: 'Order',
      key: 'order' as const,
      render: (order: unknown) => <span className="text-gray-600 dark:text-gray-400">#{String(order)}</span>,
    },
    {
      header: 'Status',
      key: 'isActive' as const,
      render: (isActive: unknown) => (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          isActive
            ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
            : 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400'
        }`}>
          {isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (_: unknown, subject: AdminSubject) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenModal(subject)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
          >
            <Edit size={18} className="text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={() => openDelete([subject.id], subject.name)}
            className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <Trash2 size={18} className="text-red-500" />
          </button>
        </div>
      ),
    },
  ];

  const colorPresets = [
    '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444',
    '#F97316', '#EAB308', '#22C55E', '#14B8A6',
  ];

  return (
    <div className="space-y-6">
      <SuccessToast
        isVisible={toast.isVisible}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />

      <SectionTitle
        title="Subjects"
        subtitle="Manage your study subjects"
        action={
          <div className="flex flex-wrap gap-3">
            <select
              value={currentBacSection}
              onChange={(event) => setCurrentBacSection(event.target.value as BacSection)}
              className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-gray-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              {BAC_SECTION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <PrimaryButton icon={<Plus size={20} />} onClick={() => handleOpenModal()}>
              Add Subject
            </PrimaryButton>
            <PrimaryButton
              icon={<Edit size={20} />}
              onClick={() => {
                const subject = subjects.find((s) => s.id === selectedIds[0]);
                if (subject) {
                  handleOpenModal(subject);
                }
              }}
              disabled={selectedIds.length !== 1}
            >
              Edit Subject
            </PrimaryButton>
            <PrimaryButton
              icon={<Trash2 size={20} />}
              onClick={() => {
                const label =
                  selectedIds.length === 1
                    ? subjects.find((s) => s.id === selectedIds[0])?.name || 'subject'
                    : `${selectedIds.length} subjects`;
                openDelete(selectedIds, label);
              }}
              disabled={selectedIds.length === 0 || isDeleting}
            >
              Delete Subject
            </PrimaryButton>
          </div>
        }
      />

      <AdminCard className="p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search subjects..."
          />
        </div>

        <DataTable
          columns={columns}
          data={filteredSubjects}
          loading={loading}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          emptyState={
            <EmptyState
              title="No subjects yet"
              description="Create your first subject to get started"
              action={
                <PrimaryButton icon={<Plus size={18} />} onClick={() => handleOpenModal()}>
                  Add Subject
                </PrimaryButton>
              }
            />
          }
        />
      </AdminCard>

      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, ids: [], label: '' })}
        onConfirm={handleDelete}
        title="Delete Subject"
        description={`Cette action supprimera définitivement ${deleteModal.label}.`}
        isLoading={isDeleting}
      />

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white dark:bg-[#1A1A1A] w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-black/5 dark:border-white/5 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {currentSubject ? 'Edit Subject' : 'New Subject'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Type size={16} />
                    Name
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-white/5 border-none rounded-xl p-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-blue outline-none"
                    placeholder="e.g. Mathematics"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <AlignLeft size={16} />
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-white/5 border-none rounded-xl p-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-blue outline-none"
                    placeholder="Brief description..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Palette size={16} />
                    Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {colorPresets.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-10 h-10 rounded-lg shadow-sm transition-all hover:scale-110 ${
                          formData.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full h-10 rounded-xl cursor-pointer"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <GripVertical size={16} />
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                    className="w-full bg-gray-50 dark:bg-white/5 border-none rounded-xl p-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-blue outline-none"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    {formData.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                    Active
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      formData.isActive ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        formData.isActive ? 'translate-x-6' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-3 rounded-xl font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <PrimaryButton type="submit" fullWidth disabled={isSaving}>
                    {isSaving ? 'Saving...' : (currentSubject ? 'Save Changes' : 'Create Subject')}
                  </PrimaryButton>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
