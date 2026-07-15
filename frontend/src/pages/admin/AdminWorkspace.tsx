import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  CalendarRange,
  CheckCircle2,
  Clock3,
  FileText,
  Layers,
  LayoutDashboard,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  Settings,
  Shield,
  Sparkles,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import {
  adminAPI,
  coursesAPI,
  exercisesAPI,
  parascolairesAPI,
  adminPlannerTemplatesAPI,
  subjectsAPI,
} from '../../services/api';
import { AdminCard } from '../../components/admin/AdminCard';
import { StatCard } from '../../components/admin/StatCard';
import { SectionTitle } from '../../components/admin/SectionTitle';
import { SearchBar } from '../../components/admin/SearchBar';
import { Pagination } from '../../components/admin/Pagination';
import { DataTable, Column } from '../../components/admin/DataTable';
import { EmptyState } from '../../components/admin/EmptyState';
import { PrimaryButton } from '../../components/admin/PrimaryButton';
import { DangerButton } from '../../components/admin/DangerButton';
import { ActionButton } from '../../components/admin/ActionButton';
import { Filters } from '../../components/admin/Filters';
import { SuccessToast } from '../../components/admin/SuccessToast';
import { DeleteModal } from '../../components/admin/DeleteModal';
import { ImageUploader } from '../../components/admin/ImageUploader';
import { PdfUploader } from '../../components/admin/PdfUploader';
import { VideoUploader } from '../../components/admin/VideoUploader';
import {
  BAC_SECTION_OPTIONS,
  DEFAULT_BAC_SECTION,
  type BacSection,
} from '../../constants/bacSections';
import { logger } from '../../lib/logger';

type SectionKey =
  | 'dashboard'
  | 'courses'
  | 'exercises'
  | 'subjects'
  | 'parascolaires'
  | 'users'
  | 'planner'
  | 'submissions';

type ToastType = 'success' | 'error' | 'warning';
type ModalSection = Exclude<SectionKey, 'dashboard' | 'users' | 'submissions'>;
type Role = 'ADMIN' | 'STUDENT';
type Difficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

interface Subject {
  id: string;
  name: string;
  bacSection: BacSection;
  description?: string | null;
  color: string;
  icon: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CourseResource {
  id: string;
  title: string;
  url: string;
  type: string;
}

interface ExerciseResource {
  id: string;
  title: string;
  url: string;
  type: string;
}

interface Correction {
  id: string;
  title: string;
  contentUrl: string;
}

interface Course {
  id: string;
  title: string;
  description?: string | null;
  contentUrl?: string | null;
  videoUrl?: string | null;
  videoPath?: string | null;
  difficulty: Difficulty;
  tags: string[];
  subjectId: string;
  subject?: Subject;
  resources: CourseResource[];
  createdAt: string;
  updatedAt: string;
}

interface Exercise {
  id: string;
  title: string;
  description?: string | null;
  contentUrl?: string | null;
  difficulty: Difficulty;
  subjectId: string;
  subject?: Subject;
  resources: ExerciseResource[];
  corrections: Correction[];
  createdAt: string;
  updatedAt: string;
}

interface Parascolaire {
  id: string;
  title: string;
  bacSection: BacSection;
  description?: string | null;
  coverImage?: string | null;
  category: string;
  isFree: boolean;
  hasPdf: boolean;
  pdfUrl?: string | null;
  pdfPrice?: number | null;
  hasPaperBook: boolean;
  paperPrice?: number | null;
  paperOrderUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  bacSection: BacSection;
  role: Role;
  isVerified: boolean;
  createdAt: string;
}

interface HomeworkSubmission {
  id: string;
  fileUrl: string;
  correctionUrl?: string | null;
  submittedAt: string;
  status: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface PlannerTemplate {
  id: string;
  title: string;
  description?: string | null;
  subjectId: string;
  subject?: Subject;
  dueAt: string;
  priority?: string | null;
  attachmentKind?: string | null;
  attachmentLabel?: string | null;
  attachmentFilePath?: string | null;
  attachmentUrl?: string | null;
  attachmentMimeType?: string | null;
  attachmentSizeBytes?: number | null;
  targetAll: boolean;
  targetBacSections: BacSection[];
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DashboardStats {
  pendingUsers: number;
  approvedUsers: number;
  suspendedUsers: number;
  rejectedUsers: number;
  totalCourses: number;
  totalExercises: number;
  totalSubmissions: number;
  totalSubjects: number;
  totalParascolaires: number;
  recentCourses: Course[];
  recentExercises: Exercise[];
  recentParascolaires: Parascolaire[];
  recentSubmissions: HomeworkSubmission[];
  recentRegistrations: any[];
  recentApprovals: any[];
}

interface ToastState {
  open: boolean;
  type: ToastType;
  message: string;
}

interface DeleteState {
  open: boolean;
  section: ModalSection | null;
  ids: string[];
  label: string;
}

interface CourseFormState {
  title: string;
  description: string;
  subjectId: string;
  difficulty: Difficulty;
  tags: string;
  contentUrl: string;
  videoPath: string;
  resourceTitle: string;
  resourceUrl: string;
  resourceType: string;
}

interface ExerciseFormState {
  title: string;
  description: string;
  subjectId: string;
  difficulty: Difficulty;
  contentUrl: string;
  resourceTitle: string;
  resourceUrl: string;
  resourceType: string;
}

interface SubjectFormState {
  name: string;
  description: string;
  color: string;
  icon: string;
  order: number;
  isActive: boolean;
}

interface ParascolaireFormState {
  title: string;
  description: string;
  coverImage: string;
  category: string;
  isFree: boolean;
  hasPdf: boolean;
  pdfUrl: string;
  pdfPrice: string;
  hasPaperBook: boolean;
  paperPrice: string;
  paperOrderUrl: string;
}

interface PlannerFormState {
  title: string;
  description: string;
  subjectId: string;
  dueAt: string;
  priority: string;
  attachmentUrl: string;
  attachmentLabel: string;
  targetAll: boolean;
  targetBacSections: BacSection[];
  publish: boolean;
}

interface FiltersState {
  subjectId: string;
  status: string;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

interface SectionDefinition {
  key: SectionKey;
  label: string;
  description: string;
  icon: typeof LayoutDashboard;
  accent: string;
  createAction?: string;
}

const BACKEND_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');
const PAGE_SIZE = 8;
const ADMIN_SECTION_STORAGE_KEY = 'adminWorkspaceBacSection';
const EMPTY_FILTERS: FiltersState = {
  subjectId: 'ALL',
  status: 'ALL',
  sortBy: 'updatedAt',
  sortDirection: 'desc',
};

const sections: SectionDefinition[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    description: 'Overview, quick actions, and recent activity',
    icon: LayoutDashboard,
    accent: 'from-[#FFD700]/30 via-[#FFD700]/10 to-transparent',
  },
  {
    key: 'courses',
    label: 'Courses',
    description: 'Manage videos, PDFs, and metadata',
    icon: BookOpen,
    accent: 'from-violet-500/30 via-violet-500/10 to-transparent',
    createAction: 'New Course',
  },
  {
    key: 'exercises',
    label: 'Exercises',
    description: 'Problems, corrections, and resources',
    icon: FileText,
    accent: 'from-orange-500/30 via-orange-500/10 to-transparent',
    createAction: 'New Exercise',
  },
  {
    key: 'subjects',
    label: 'Subjects',
    description: 'Dynamic colors, ordering, and activation',
    icon: Layers,
    accent: 'from-cyan-500/30 via-cyan-500/10 to-transparent',
    createAction: 'New Subject',
  },
  {
    key: 'parascolaires',
    label: 'Parascolaires',
    description: 'Premium offers, files, and pricing',
    icon: Sparkles,
    accent: 'from-pink-500/30 via-pink-500/10 to-transparent',
    createAction: 'New Parascolaire',
  },
  {
    key: 'planner',
    label: 'Planner',
    description: 'Publish tasks to students by BAC section',
    icon: CalendarRange,
    accent: 'from-emerald-500/30 via-emerald-500/10 to-transparent',
    createAction: 'New Planner Task',
  },
  {
    key: 'users',
    label: 'Users',
    description: 'Read-only user monitoring',
    icon: Users,
    accent: 'from-slate-500/30 via-slate-500/10 to-transparent',
  },
  {
    key: 'submissions',
    label: 'Homework',
    description: 'Review homework and upload corrections',
    icon: CheckCircle2,
    accent: 'from-sky-500/30 via-sky-500/10 to-transparent',
  },
];

const defaultCourseForm = (subjectId = ''): CourseFormState => ({
  title: '',
  description: '',
  subjectId,
  difficulty: 'BEGINNER',
  tags: '',
  contentUrl: '',
  videoPath: '',
  resourceTitle: '',
  resourceUrl: '',
  resourceType: 'WEBSITE',
});

const defaultExerciseForm = (subjectId = ''): ExerciseFormState => ({
  title: '',
  description: '',
  subjectId,
  difficulty: 'BEGINNER',
  contentUrl: '',
  resourceTitle: '',
  resourceUrl: '',
  resourceType: 'WEBSITE',
});

const defaultSubjectForm = (): SubjectFormState => ({
  name: '',
  description: '',
  color: '#3B82F6',
  icon: 'book',
  order: 0,
  isActive: true,
});

const defaultParascolaireForm = (): ParascolaireFormState => ({
  title: '',
  description: '',
  coverImage: '',
  category: '',
  isFree: false,
  hasPdf: false,
  pdfUrl: '',
  pdfPrice: '',
  hasPaperBook: false,
  paperPrice: '',
  paperOrderUrl: '',
});

const defaultPlannerForm = (subjectId = ''): PlannerFormState => ({
  title: '',
  description: '',
  subjectId,
  dueAt: new Date().toISOString().slice(0, 10),
  priority: 'MEDIUM',
  attachmentUrl: '',
  attachmentLabel: '',
  targetAll: false,
  targetBacSections: [],
  publish: false,
});

const toAssetUrl = (value?: string | null) => {
  if (!value) {
    return '';
  }

  if (value.startsWith('http')) {
    return value;
  }

  return `${BACKEND_URL}/${value.replace(/^\/+/, '')}`;
};

const formatDate = (value?: string | null) => {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleDateString();
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString();
};

const badgeStyles = (color?: string) => ({
  color: color || '#3B82F6',
  backgroundColor: `${color || '#3B82F6'}14`,
  borderColor: `${color || '#3B82F6'}35`,
});

const getDifficultyTone = (difficulty: string) => {
  if (difficulty === 'ADVANCED') {
    return 'bg-red-500/10 text-red-500';
  }

  if (difficulty === 'INTERMEDIATE') {
    return 'bg-orange-500/10 text-orange-500';
  }

  return 'bg-emerald-500/10 text-emerald-500';
};

const getRequestErrorMessage = (error: unknown) => {
  if (typeof error === 'object' && error && 'response' in error) {
    const candidate = error as {
      response?: { data?: { message?: string } };
      message?: string;
    };

    return candidate.response?.data?.message || candidate.message || 'Unknown error';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
};

const searchInObject = (
  record: Record<string, unknown>,
  query: string
): boolean => {
  if (!query.trim()) {
    return true;
  }

  const normalizedQuery = query.toLowerCase();
  return Object.values(record).some((value): boolean => {
    if (value === null || value === undefined) {
      return false;
    }

    if (typeof value === 'object') {
      return searchInObject(value as Record<string, unknown>, query);
    }

    return String(value).toLowerCase().includes(normalizedQuery);
  });
};

const AdminWorkspace = () => {
  const [activeSection, setActiveSection] = useState<SectionKey>('dashboard');
  const [currentBacSection, setCurrentBacSection] = useState<BacSection>(() => {
    const stored = localStorage.getItem(ADMIN_SECTION_STORAGE_KEY);
    if (stored && BAC_SECTION_OPTIONS.some((option) => option.value === stored)) {
      return stored as BacSection;
    }

    return DEFAULT_BAC_SECTION;
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FiltersState>(EMPTY_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [toast, setToast] = useState<ToastState>({
    open: false,
    type: 'success',
    message: '',
  });
  const [deleteState, setDeleteState] = useState<DeleteState>({
    open: false,
    section: null,
    ids: [],
    label: '',
  });
  const [stats, setStats] = useState<DashboardStats>({
    pendingUsers: 0,
    approvedUsers: 0,
    suspendedUsers: 0,
    rejectedUsers: 0,
    totalCourses: 0,
    totalExercises: 0,
    totalSubmissions: 0,
    totalSubjects: 0,
    totalParascolaires: 0,
    recentCourses: [],
    recentExercises: [],
    recentParascolaires: [],
    recentSubmissions: [],
    recentRegistrations: [],
    recentApprovals: [],
  });
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [parascolaires, setParascolaires] = useState<Parascolaire[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [plannerTemplates, setPlannerTemplates] = useState<PlannerTemplate[]>([]);

  const [editorSection, setEditorSection] = useState<ModalSection | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [courseForm, setCourseForm] = useState<CourseFormState>(defaultCourseForm());
  const [exerciseForm, setExerciseForm] = useState<ExerciseFormState>(defaultExerciseForm());
  const [subjectForm, setSubjectForm] = useState<SubjectFormState>(defaultSubjectForm());
  const [parascolaireForm, setParascolaireForm] =
    useState<ParascolaireFormState>(defaultParascolaireForm());
  const [plannerForm, setPlannerForm] = useState<PlannerFormState>(defaultPlannerForm());
  const [exerciseCorrectionFile, setExerciseCorrectionFile] = useState<File | null>(null);
  const navigate = useNavigate();

  const showToast = (type: ToastType, message: string) => {
    setToast({ open: true, type, message });
  };

  useEffect(() => {
    if (!toast.open) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setToast((previous) => ({ ...previous, open: false }));
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [toast.open, toast.message]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const scopedParams = { bacSection: currentBacSection };
      const requestEntries = [
        ['stats', adminAPI.getStats(scopedParams)],
        ['courses', coursesAPI.getAll(scopedParams)],
        ['exercises', exercisesAPI.getAll(scopedParams)],
        ['subjects', subjectsAPI.getAll(scopedParams)],
        ['parascolaires', parascolairesAPI.getAll(scopedParams)],
        ['users', adminAPI.getUsers({ page: 1, pageSize: 50, bacSection: currentBacSection })],
        ['submissions', adminAPI.getSubmissions({ bacSection: currentBacSection })],
        ['plannerTemplates', adminPlannerTemplatesAPI.getAll()],
      ] as const;

      const settledResponses = await Promise.allSettled(
        requestEntries.map(([, request]) => request)
      );

      const results = Object.fromEntries(
        settledResponses.map((result, index) => [requestEntries[index][0], result])
      ) as Record<(typeof requestEntries)[number][0], PromiseSettledResult<any>>;

      if (results.stats.status === 'fulfilled') {
        setStats(results.stats.value.data as DashboardStats);
      }

      if (results.courses.status === 'fulfilled') {
        setCourses(results.courses.value.data as Course[]);
      }

      if (results.exercises.status === 'fulfilled') {
        setExercises(results.exercises.value.data as Exercise[]);
      }

      if (results.subjects.status === 'fulfilled') {
        setSubjects(results.subjects.value.data as Subject[]);
      }

      if (results.parascolaires.status === 'fulfilled') {
        setParascolaires(results.parascolaires.value.data as Parascolaire[]);
      }

      if (results.users.status === 'fulfilled') {
        setUsers((results.users.value.data?.items || []) as AdminUser[]);
      }

      if (results.submissions.status === 'fulfilled') {
        setSubmissions(
          ((results.submissions.value.data?.items || results.submissions.value.data?.submissions || []) as HomeworkSubmission[])
        );
      }

      if (results.plannerTemplates.status === 'fulfilled') {
        setPlannerTemplates(results.plannerTemplates.value.data as PlannerTemplate[]);
      }

      const failedRequests = requestEntries
        .map(([key]) => key)
        .filter((key) => results[key].status === 'rejected');

      if (failedRequests.length > 0) {
        const details = failedRequests
          .map((key) => {
            const result = results[key];
            return `${key}: ${getRequestErrorMessage(
              result.status === 'rejected' ? result.reason : null
            )}`;
          })
          .join(' | ');

        logger.error('Admin workspace partially failed to load', undefined, { details });
        showToast('warning', `Some admin sections failed to load: ${failedRequests.join(', ')}`);
      }
    } catch (error) {
      logger.error('Failed to load admin workspace', error);
      showToast('error', 'Failed to load admin workspace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [currentBacSection]);

  useEffect(() => {
    localStorage.setItem(ADMIN_SECTION_STORAGE_KEY, currentBacSection);
  }, [currentBacSection]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [activeSection, search, filters]);

  const filteredSubjectRecords = useMemo(
    () => subjects.filter((subject) => subject.bacSection === currentBacSection),
    [currentBacSection, subjects]
  );

  const firstSubjectId = filteredSubjectRecords[0]?.id || '';

  const openCreateModal = (section: ModalSection) => {
    setEditorSection(section);
    setEditingId(null);
    setExerciseCorrectionFile(null);

    if (section === 'courses') {
      setCourseForm(defaultCourseForm(firstSubjectId));
    }

    if (section === 'exercises') {
      setExerciseForm(defaultExerciseForm(firstSubjectId));
    }

    if (section === 'subjects') {
      setSubjectForm(defaultSubjectForm());
    }

    if (section === 'parascolaires') {
      setParascolaireForm(defaultParascolaireForm());
    }

    if (section === 'planner') {
      setPlannerForm({
        ...defaultPlannerForm(firstSubjectId),
        targetBacSections: [currentBacSection],
      });
    }
  };

  const openEditModal = (
    section: ModalSection,
    item: Course | Exercise | Subject | Parascolaire | PlannerTemplate
  ) => {
    setEditorSection(section);
    setEditingId(item.id);
    setExerciseCorrectionFile(null);

    if (section === 'courses') {
      const course = item as Course;
      setCourseForm({
        title: course.title,
        description: course.description || '',
        subjectId: course.subjectId,
        difficulty: course.difficulty,
        tags: course.tags.join(', '),
        contentUrl: course.contentUrl || '',
        videoPath: course.videoPath || '',
        resourceTitle: '',
        resourceUrl: '',
        resourceType: 'WEBSITE',
      });
    }

    if (section === 'exercises') {
      const exercise = item as Exercise;
      setExerciseForm({
        title: exercise.title,
        description: exercise.description || '',
        subjectId: exercise.subjectId,
        difficulty: exercise.difficulty,
        contentUrl: exercise.contentUrl || '',
        resourceTitle: '',
        resourceUrl: '',
        resourceType: 'WEBSITE',
      });
    }

    if (section === 'subjects') {
      const subject = item as Subject;
      setSubjectForm({
        name: subject.name,
        description: subject.description || '',
        color: subject.color,
        icon: subject.icon,
        order: subject.order,
        isActive: subject.isActive,
      });
    }

    if (section === 'parascolaires') {
      const parascolaire = item as Parascolaire;
      setParascolaireForm({
        title: parascolaire.title,
        description: parascolaire.description || '',
        coverImage: parascolaire.coverImage || '',
        category: parascolaire.category,
        isFree: parascolaire.isFree,
        hasPdf: parascolaire.hasPdf,
        pdfUrl: parascolaire.pdfUrl || '',
        pdfPrice: parascolaire.pdfPrice?.toString() || '',
        hasPaperBook: parascolaire.hasPaperBook,
        paperPrice: parascolaire.paperPrice?.toString() || '',
        paperOrderUrl: parascolaire.paperOrderUrl || '',
      });
    }

    if (section === 'planner') {
      const task = item as PlannerTemplate;
      setPlannerForm({
        title: task.title,
        description: task.description || '',
        subjectId: task.subjectId,
        dueAt: task.dueAt.slice(0, 10),
        priority: task.priority || 'MEDIUM',
        attachmentUrl: task.attachmentUrl || '',
        attachmentLabel: task.attachmentLabel || '',
        targetAll: task.targetAll,
        targetBacSections: task.targetBacSections || [],
        publish: false,
      });
    }
  };

  const closeEditor = () => {
    setEditorSection(null);
    setEditingId(null);
    setExerciseCorrectionFile(null);
  };

  const saveEditor = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!editorSection) {
      return;
    }

    try {
      setSaving(true);

      if (editorSection === 'courses') {
        const payload = {
          title: courseForm.title,
          description: courseForm.description,
          subjectId: courseForm.subjectId,
          difficulty: courseForm.difficulty,
          tags: courseForm.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
          contentUrl: courseForm.contentUrl,
          videoPath: courseForm.videoPath,
          videoUrl: '',
        };

        let courseId = editingId;
        if (editingId) {
          await coursesAPI.update(editingId, payload);
        } else {
          const response = await coursesAPI.create(payload);
          courseId = response.data.id as string;
        }

        if (
          courseId &&
          courseForm.resourceTitle.trim() &&
          courseForm.resourceUrl.trim()
        ) {
          await adminAPI.addCourseResource(courseId, {
            title: courseForm.resourceTitle,
            url: courseForm.resourceUrl,
            type: courseForm.resourceType,
          });
        }
      }

      if (editorSection === 'exercises') {
        const payload = {
          title: exerciseForm.title,
          description: exerciseForm.description,
          subjectId: exerciseForm.subjectId,
          difficulty: exerciseForm.difficulty,
          contentUrl: exerciseForm.contentUrl,
        };

        let exerciseId = editingId;
        if (editingId) {
          await exercisesAPI.update(editingId, payload);
        } else {
          const response = await exercisesAPI.create(payload);
          exerciseId = response.data.id as string;
        }

        if (
          exerciseId &&
          exerciseForm.resourceTitle.trim() &&
          exerciseForm.resourceUrl.trim()
        ) {
          await adminAPI.createExerciseResource({
            exerciseId,
            title: exerciseForm.resourceTitle,
            url: exerciseForm.resourceUrl,
            type: exerciseForm.resourceType,
          });
        }

        if (exerciseId && exerciseCorrectionFile) {
          const formData = new FormData();
          formData.append('pdf', exerciseCorrectionFile);
          formData.append('exerciseId', exerciseId);
          formData.append('title', 'Correction');
          await adminAPI.uploadExerciseCorrection(formData);
        }
      }

      if (editorSection === 'subjects') {
        const payload = {
          ...subjectForm,
          bacSection: currentBacSection,
          order: Number(subjectForm.order),
        };

        if (editingId) {
          await subjectsAPI.update(editingId, payload);
        } else {
          await subjectsAPI.create(payload);
        }
      }

      if (editorSection === 'parascolaires') {
        const payload = {
          ...parascolaireForm,
          bacSection: currentBacSection,
          pdfPrice: parascolaireForm.pdfPrice,
          paperPrice: parascolaireForm.paperPrice,
        };

        if (editingId) {
          await parascolairesAPI.update(editingId, payload);
        } else {
          await parascolairesAPI.create(payload);
        }
      }

      if (editorSection === 'planner') {
        const payload = {
          title: plannerForm.title,
          description: plannerForm.description,
          subjectId: plannerForm.subjectId,
          dueAt: new Date(plannerForm.dueAt).toISOString(),
          priority: plannerForm.priority,
          attachmentUrl: plannerForm.attachmentUrl,
          attachmentLabel: plannerForm.attachmentLabel,
          targetAll: plannerForm.targetAll,
          targetBacSections: plannerForm.targetAll ? [] : plannerForm.targetBacSections,
          publish: plannerForm.publish,
        };

        if (editingId) {
          await adminPlannerTemplatesAPI.update(editingId, payload);
        } else {
          await adminPlannerTemplatesAPI.create(payload);
        }
      }

      await fetchAdminData();
      closeEditor();
      showToast('success', `${editingId ? 'Updated' : 'Created'} successfully`);
    } catch (error) {
      logger.error('Failed to save editor', error);
      showToast('error', getRequestErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const askDelete = (section: ModalSection, ids: string[], label: string) => {
    setDeleteState({ open: true, section, ids, label });
  };

  const confirmDelete = async () => {
    if (!deleteState.section || deleteState.ids.length === 0) {
      return;
    }

    try {
      setBulkLoading(true);
      const tasksToRun = deleteState.ids.map((id) => {
        if (deleteState.section === 'courses') {
          return coursesAPI.delete(id);
        }
        if (deleteState.section === 'exercises') {
          return exercisesAPI.delete(id);
        }
        if (deleteState.section === 'subjects') {
          return subjectsAPI.delete(id);
        }
        if (deleteState.section === 'parascolaires') {
          return parascolairesAPI.delete(id);
        }
        return adminPlannerTemplatesAPI.delete(id);
      });

      await Promise.all(tasksToRun);
      await fetchAdminData();
      setSelectedIds([]);
      setDeleteState({ open: false, section: null, ids: [], label: '' });
      showToast('success', 'Deletion completed successfully');
    } catch (error) {
      logger.error('Delete failed', error);
      showToast('error', 'Deletion failed');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkSubjectStatus = async (isActive: boolean) => {
    try {
      setBulkLoading(true);
      await Promise.all(
        selectedIds.map((id) => {
          const subject = subjects.find((entry) => entry.id === id);
          if (!subject) {
            return Promise.resolve();
          }
          return subjectsAPI.update(id, {
            name: subject.name,
            description: subject.description,
            color: subject.color,
            icon: subject.icon,
            order: subject.order,
            isActive,
          });
        })
      );
      await fetchAdminData();
      setSelectedIds([]);
      showToast(
        'success',
        `Selected subjects marked as ${isActive ? 'active' : 'inactive'}`
      );
    } catch (error) {
      logger.error('Bulk update failed', error);
      showToast('error', 'Bulk update failed');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleSubmissionCorrectionUpload = async (
    submissionId: string,
    file: File
  ) => {
    try {
      await adminAPI.uploadCorrection(submissionId, file);
      await fetchAdminData();
      showToast('success', 'Correction uploaded successfully');
    } catch (error) {
      logger.error('Correction upload failed', error);
      showToast('error', 'Correction upload failed');
    }
  };

  const subjectOptions = useMemo(
    () => filteredSubjectRecords.map((subject) => ({ label: subject.name, value: subject.id })),
    [filteredSubjectRecords]
  );

  const sectionRows = useMemo(
    () => ({
      courses,
      exercises,
      subjects,
      parascolaires,
      users,
      planner: plannerTemplates,
    }),
    [courses, exercises, subjects, parascolaires, users, plannerTemplates]
  );

  const filteredRows = useMemo(() => {
    if (activeSection === 'dashboard' || activeSection === 'submissions') {
      return [] as Array<
        Course | Exercise | Subject | Parascolaire | AdminUser | PlannerTemplate
      >;
    }

    const rows = sectionRows[
      activeSection as keyof typeof sectionRows
    ] as Array<Course | Exercise | Subject | Parascolaire | AdminUser | PlannerTemplate>;

    let nextRows = rows.filter((row) =>
      searchInObject(row as unknown as Record<string, unknown>, search)
    );

    if (filters.subjectId !== 'ALL') {
      nextRows = nextRows.filter(
        (row) => 'subjectId' in row && row.subjectId === filters.subjectId
      );
    }

    if (activeSection === 'planner') {
      nextRows = nextRows.filter(
        (row) =>
          'targetAll' in row &&
          (Boolean((row as PlannerTemplate).targetAll) ||
            (row as PlannerTemplate).targetBacSections.includes(currentBacSection))
      );
    }

    if (filters.status !== 'ALL') {
      nextRows = nextRows.filter((row) => {
        if ('isActive' in row) {
          return filters.status === 'ACTIVE' ? row.isActive : !row.isActive;
        }

        if ('publishedAt' in row) {
          const isPublished = Boolean((row as PlannerTemplate).publishedAt);
          return filters.status === 'PUBLISHED' ? isPublished : !isPublished;
        }

        return true;
      });
    }

    return [...nextRows].sort((left, right) => {
      const leftValue = String(
        ((left as unknown) as Record<string, unknown>)[filters.sortBy] ?? ''
      );
      const rightValue = String(
        ((right as unknown) as Record<string, unknown>)[filters.sortBy] ?? ''
      );
      const modifier = filters.sortDirection === 'asc' ? 1 : -1;
      return leftValue.localeCompare(rightValue) * modifier;
    });
  }, [activeSection, currentBacSection, filters, search, sectionRows]);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredRows]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));

  const filtersConfig = useMemo(() => {
    if (activeSection === 'courses' || activeSection === 'exercises') {
      return [
        {
          key: 'subjectId',
          label: 'Subject',
          value: filters.subjectId,
          options: [{ label: 'All subjects', value: 'ALL' }, ...subjectOptions],
        },
      ];
    }

    if (activeSection === 'planner') {
      return [
        {
          key: 'subjectId',
          label: 'Subject',
          value: filters.subjectId,
          options: [{ label: 'All subjects', value: 'ALL' }, ...subjectOptions],
        },
        {
          key: 'status',
          label: 'Status',
          value: filters.status,
          options: [
            { label: 'All statuses', value: 'ALL' },
            { label: 'Published', value: 'PUBLISHED' },
            { label: 'Draft', value: 'DRAFT' },
          ],
        },
      ];
    }

    if (activeSection === 'subjects') {
      return [
        {
          key: 'status',
          label: 'Status',
          value: filters.status,
          options: [
            { label: 'All statuses', value: 'ALL' },
            { label: 'Active', value: 'ACTIVE' },
            { label: 'Inactive', value: 'INACTIVE' },
          ],
        },
      ];
    }

    return [] as Array<{
      key: string;
      label: string;
      value: string;
      options: Array<{ label: string; value: string }>;
    }>;
  }, [activeSection, filters.status, filters.subjectId, subjectOptions]);

  const courseColumns: Column<Course>[] = [
    {
      header: 'Course',
      key: 'title',
      render: (_value, course) => (
        <div className="space-y-1">
          <div className="font-semibold text-gray-900 dark:text-white">
            {course.title}
          </div>
          <div className="line-clamp-1 text-xs text-gray-500 dark:text-gray-400">
            {course.description || 'No description yet'}
          </div>
        </div>
      ),
    },
    {
      header: 'Subject',
      key: 'subjectId',
      render: (_value, course) => (
        <span
          className="rounded-full border px-3 py-1 text-xs font-semibold"
          style={badgeStyles(course.subject?.color)}
        >
          {course.subject?.name || 'Unknown'}
        </span>
      ),
    },
    {
      header: 'Difficulty',
      key: 'difficulty',
      render: (value) => (
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${getDifficultyTone(
            String(value)
          )}`}
        >
          {String(value)}
        </span>
      ),
    },
    {
      header: 'Assets',
      key: 'contentUrl',
      render: (_value, course) => (
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          {course.contentUrl && (
            <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-blue-500">
              PDF
            </span>
          )}
          {(course.videoPath || course.videoUrl) && (
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-500">
              Video
            </span>
          )}
          {course.resources.length > 0 && (
            <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-violet-500">
              Resources {course.resources.length}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Updated',
      key: 'updatedAt',
      render: (value) => <span>{formatDate(String(value))}</span>,
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (_value, course) => (
        <div className="flex items-center gap-2">
          <ActionButton
            tone="neutral"
            onClick={() => openEditModal('courses', course)}
            icon={<Pencil size={16} />}
          >
            Edit
          </ActionButton>
          <ActionButton
            tone="danger"
            onClick={() => askDelete('courses', [course.id], course.title)}
            icon={<Trash2 size={16} />}
          >
            Delete
          </ActionButton>
        </div>
      ),
    },
  ];

  const exerciseColumns: Column<Exercise>[] = [
    {
      header: 'Exercise',
      key: 'title',
      render: (_value, exercise) => (
        <div className="space-y-1">
          <div className="font-semibold text-gray-900 dark:text-white">
            {exercise.title}
          </div>
          <div className="line-clamp-1 text-xs text-gray-500 dark:text-gray-400">
            {exercise.description || 'No description yet'}
          </div>
        </div>
      ),
    },
    {
      header: 'Subject',
      key: 'subjectId',
      render: (_value, exercise) => (
        <span
          className="rounded-full border px-3 py-1 text-xs font-semibold"
          style={badgeStyles(exercise.subject?.color)}
        >
          {exercise.subject?.name || 'Unknown'}
        </span>
      ),
    },
    {
      header: 'Difficulty',
      key: 'difficulty',
      render: (value) => (
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${getDifficultyTone(
            String(value)
          )}`}
        >
          {String(value)}
        </span>
      ),
    },
    {
      header: 'Assets',
      key: 'contentUrl',
      render: (_value, exercise) => (
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          {exercise.contentUrl && (
            <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-blue-500">
              PDF
            </span>
          )}
          {exercise.corrections.length > 0 && (
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-500">
              Correction
            </span>
          )}
          {exercise.resources.length > 0 && (
            <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-violet-500">
              Resources {exercise.resources.length}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Updated',
      key: 'updatedAt',
      render: (value) => <span>{formatDate(String(value))}</span>,
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (_value, exercise) => (
        <div className="flex items-center gap-2">
          <ActionButton
            tone="neutral"
            onClick={() => openEditModal('exercises', exercise)}
            icon={<Pencil size={16} />}
          >
            Edit
          </ActionButton>
          <ActionButton
            tone="danger"
            onClick={() => askDelete('exercises', [exercise.id], exercise.title)}
            icon={<Trash2 size={16} />}
          >
            Delete
          </ActionButton>
        </div>
      ),
    },
  ];

  const subjectColumns: Column<Subject>[] = [
    {
      header: 'Subject',
      key: 'name',
      render: (_value, subject) => (
        <div className="flex items-center gap-3">
          <span
            className="h-10 w-10 rounded-2xl border"
            style={badgeStyles(subject.color)}
          />
          <div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {subject.name}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {subject.icon}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'Description',
      key: 'description',
      render: (value) => (
        <span className="line-clamp-1">{String(value || 'No description')}</span>
      ),
    },
    {
      header: 'Order',
      key: 'order',
      render: (value) => <span>#{String(value)}</span>,
    },
    {
      header: 'Status',
      key: 'isActive',
      render: (value) => (
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            value ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-500/10 text-gray-500'
          }`}
        >
          {value ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (_value, subject) => (
        <div className="flex items-center gap-2">
          <ActionButton
            tone="neutral"
            onClick={() => openEditModal('subjects', subject)}
            icon={<Pencil size={16} />}
          >
            Edit
          </ActionButton>
          <ActionButton
            tone="danger"
            onClick={() => askDelete('subjects', [subject.id], subject.name)}
            icon={<Trash2 size={16} />}
          >
            Delete
          </ActionButton>
        </div>
      ),
    },
  ];

  const parascolaireColumns: Column<Parascolaire>[] = [
    {
      header: 'Offer',
      key: 'title',
      render: (_value, item) => (
        <div className="space-y-1">
          <div className="font-semibold text-gray-900 dark:text-white">
            {item.title}
          </div>
          <div className="line-clamp-1 text-xs text-gray-500 dark:text-gray-400">
            {item.description || 'No description yet'}
          </div>
        </div>
      ),
    },
    { header: 'Category', key: 'category' },
    {
      header: 'Format',
      key: 'hasPdf',
      render: (_value, item) => (
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span
            className={`rounded-full px-2.5 py-1 ${
              item.isFree ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
            }`}
          >
            {item.isFree ? 'Free' : 'Paid'}
          </span>
          {item.hasPdf && (
            <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-blue-500">
              PDF
            </span>
          )}
          {item.hasPaperBook && (
            <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-violet-500">
              Paper Book
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Updated',
      key: 'updatedAt',
      render: (value) => <span>{formatDate(String(value))}</span>,
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (_value, item) => (
        <div className="flex items-center gap-2">
          <ActionButton
            tone="neutral"
            onClick={() => openEditModal('parascolaires', item)}
            icon={<Pencil size={16} />}
          >
            Edit
          </ActionButton>
          <ActionButton
            tone="danger"
            onClick={() => askDelete('parascolaires', [item.id], item.title)}
            icon={<Trash2 size={16} />}
          >
            Delete
          </ActionButton>
        </div>
      ),
    },
  ];

  const userColumns: Column<AdminUser>[] = [
    {
      header: 'User',
      key: 'email',
      render: (_value, user) => (
        <div className="space-y-1">
          <div className="font-semibold text-gray-900 dark:text-white">
            {user.firstName} {user.lastName}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {user.email}
          </div>
        </div>
      ),
    },
    {
      header: 'Role',
      key: 'role',
      render: (value) => (
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            value === 'ADMIN'
              ? 'bg-violet-500/10 text-violet-500'
              : 'bg-slate-500/10 text-slate-500'
          }`}
        >
          {String(value)}
        </span>
      ),
    },
    {
      header: 'Verified',
      key: 'isVerified',
      render: (value) => <span>{value ? 'Yes' : 'No'}</span>,
    },
    {
      header: 'Joined',
      key: 'createdAt',
      render: (value) => <span>{formatDate(String(value))}</span>,
    },
  ];

  const publishTemplate = async (template: PlannerTemplate) => {
    try {
      setBulkLoading(true);
      await adminPlannerTemplatesAPI.publish(template.id);
      await fetchAdminData();
      showToast('success', 'Planner task published successfully');
    } catch (error) {
      logger.error('Failed to publish planner task', error);
      showToast('error', getRequestErrorMessage(error));
    } finally {
      setBulkLoading(false);
    }
  };

  const plannerColumns: Column<PlannerTemplate>[] = [
    {
      header: 'Task',
      key: 'title',
      render: (_value, task) => (
        <div className="space-y-1">
          <div className="font-semibold text-gray-900 dark:text-white">
            {task.title}
          </div>
          <div className="line-clamp-1 text-xs text-gray-500 dark:text-gray-400">
            {task.description || 'No description yet'}
          </div>
        </div>
      ),
    },
    {
      header: 'Subject',
      key: 'subjectId',
      render: (_value, task) => (
        <span
          className="rounded-full border px-3 py-1 text-xs font-semibold"
          style={badgeStyles(task.subject?.color)}
        >
          {task.subject?.name || 'Unknown'}
        </span>
      ),
    },
    {
      header: 'Due',
      key: 'dueAt',
      render: (_value, task) => (
        <div className="text-xs">{formatDate(task.dueAt)}</div>
      ),
    },
    {
      header: 'Status',
      key: 'publishedAt',
      render: (value) => (
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            value ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
          }`}
        >
          {value ? 'Published' : 'Draft'}
        </span>
      ),
    },
    {
      header: 'Target',
      key: 'targetAll',
      render: (_value, task) => (
        <div className="space-y-1 text-xs">
          <div className="font-semibold text-gray-900 dark:text-white">
            {task.targetAll ? 'All students' : 'Selected sections'}
          </div>
          {!task.targetAll && (
            <div className="text-gray-500 dark:text-gray-400">
              {task.targetBacSections
                .map(
                  (section) =>
                    BAC_SECTION_OPTIONS.find((option) => option.value === section)?.label ||
                    section
                )
                .join(', ') || '-'}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (_value, task) => (
        <div className="flex items-center gap-2">
          <ActionButton
            tone="neutral"
            onClick={() => openEditModal('planner', task)}
            icon={<Pencil size={16} />}
          >
            Edit
          </ActionButton>
          <ActionButton
            tone="success"
            onClick={() => publishTemplate(task)}
            icon={<Upload size={16} />}
          >
            {task.publishedAt ? 'Republish' : 'Publish'}
          </ActionButton>
          <ActionButton
            tone="danger"
            onClick={() => askDelete('planner', [task.id], task.title)}
            icon={<Trash2 size={16} />}
          >
            Delete
          </ActionButton>
        </div>
      ),
    },
  ];

  const activeColumns = useMemo(() => {
    if (activeSection === 'courses') {
      return courseColumns as Column<
        Course | Exercise | Subject | Parascolaire | AdminUser | PlannerTemplate
      >[];
    }

    if (activeSection === 'exercises') {
      return exerciseColumns as Column<
        Course | Exercise | Subject | Parascolaire | AdminUser | PlannerTemplate
      >[];
    }

    if (activeSection === 'subjects') {
      return subjectColumns as Column<
        Course | Exercise | Subject | Parascolaire | AdminUser | PlannerTemplate
      >[];
    }

    if (activeSection === 'parascolaires') {
      return parascolaireColumns as Column<
        Course | Exercise | Subject | Parascolaire | AdminUser | PlannerTemplate
      >[];
    }

    if (activeSection === 'users') {
      return userColumns as Column<
        Course | Exercise | Subject | Parascolaire | AdminUser | PlannerTemplate
      >[];
    }

    return plannerColumns as Column<
      Course | Exercise | Subject | Parascolaire | AdminUser | PlannerTemplate
    >[];
  }, [activeSection]);

  const timelineItems = useMemo(
    () =>
      [
        ...courses.slice(0, 4).map((course) => ({
          id: `course-${course.id}`,
          label: `Course published: ${course.title}`,
          timestamp: course.createdAt,
        })),
        ...exercises.slice(0, 4).map((exercise) => ({
          id: `exercise-${exercise.id}`,
          label: `Exercise updated: ${exercise.title}`,
          timestamp: exercise.updatedAt,
        })),
        ...parascolaires.slice(0, 4).map((item) => ({
          id: `parascolaire-${item.id}`,
          label: `Parascolaire offer: ${item.title}`,
          timestamp: item.createdAt,
        })),
        ...plannerTemplates.slice(0, 4).map((task) => ({
          id: `planner-${task.id}`,
          label: `Planner task: ${task.title}`,
          timestamp: task.updatedAt,
        })),
      ]
        .sort(
          (left, right) =>
            new Date(right.timestamp).getTime() -
            new Date(left.timestamp).getTime()
        )
        .slice(0, 8),
    [courses, exercises, parascolaires, plannerTemplates]
  );

  const todaysTasks = plannerTemplates.filter(
    (task) => task.dueAt.slice(0, 10) === new Date().toISOString().slice(0, 10)
  );

  const activeSectionMeta =
    sections.find((section) => section.key === activeSection) || sections[0];

  const renderOverview = () => (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Pending Users"
          value={stats.pendingUsers}
          icon={<Clock3 size={22} />}
          color="text-yellow-500"
          bg="bg-yellow-500/10"
          delay={0}
        />
        <StatCard
          label="Approved Users"
          value={stats.approvedUsers}
          icon={<CheckCircle2 size={22} />}
          color="text-emerald-500"
          bg="bg-emerald-500/10"
          delay={0.05}
        />
        <StatCard
          label="Suspended Users"
          value={stats.suspendedUsers}
          icon={<Shield size={22} />}
          color="text-red-500"
          bg="bg-red-500/10"
          delay={0.1}
        />
        <StatCard
          label="Total Courses"
          value={stats.totalCourses}
          icon={<BookOpen size={22} />}
          color="text-violet-500"
          bg="bg-violet-500/10"
          delay={0.15}
        />
        <StatCard
          label="Total Exercises"
          value={stats.totalExercises}
          icon={<FileText size={22} />}
          color="text-orange-500"
          bg="bg-orange-500/10"
          delay={0.2}
        />
        <StatCard
          label="Total Subjects"
          value={stats.totalSubjects}
          icon={<Layers size={22} />}
          color="text-cyan-500"
          bg="bg-cyan-500/10"
          delay={0.25}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <AdminCard className="p-6 sm:p-8">
          <SectionTitle
            title="Quick Actions"
            subtitle="Jump straight into the most used admin flows"
          />
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <ActionButton
              tone="primary"
              icon={<Plus size={16} />}
              onClick={() => openCreateModal('courses')}
            >
              Create Course
            </ActionButton>
            <ActionButton
              tone="neutral"
              icon={<Plus size={16} />}
              onClick={() => openCreateModal('exercises')}
            >
              Create Exercise
            </ActionButton>
            <ActionButton
              tone="neutral"
              icon={<Plus size={16} />}
              onClick={() => openCreateModal('subjects')}
            >
              Create Subject
            </ActionButton>
            <ActionButton
              tone="neutral"
              icon={<Plus size={16} />}
              onClick={() => openCreateModal('parascolaires')}
            >
              Create Parascolaire
            </ActionButton>
            <ActionButton
              tone="neutral"
              icon={<Plus size={16} />}
              onClick={() => openCreateModal('planner')}
            >
              Create Task
            </ActionButton>
            <ActionButton
              tone="neutral"
              icon={<Layers size={16} />}
              onClick={() => setActiveSection('subjects')}
            >
              Open Subjects
            </ActionButton>
          </div>
        </AdminCard>

        <AdminCard className="p-6 sm:p-8">
          <SectionTitle title="Today's Summary" subtitle="A compact look at the day" />
          <div className="mt-6 space-y-4 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5">
              <span>Tasks scheduled today</span>
              <strong className="text-gray-900 dark:text-white">
                {todaysTasks.length}
              </strong>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5">
              <span>Pending homework review</span>
              <strong className="text-gray-900 dark:text-white">
                {
                  submissions.filter(
                    (item) =>
                      item.status !== 'REVIEWED' && item.status !== 'GRADED'
                  ).length
                }
              </strong>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5">
              <span>Active subjects</span>
              <strong className="text-gray-900 dark:text-white">
                {subjects.filter((subject) => subject.isActive).length}
              </strong>
            </div>
          </div>
        </AdminCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminCard className="p-6 sm:p-8">
          <SectionTitle title="Recent Courses" subtitle="Latest course changes" />
          <div className="mt-6 space-y-4">
            {stats.recentCourses.map((course) => (
              <div
                key={course.id}
                className="flex items-center justify-between rounded-2xl border border-black/5 bg-gray-50/80 px-4 py-4 dark:border-white/5 dark:bg-white/5"
              >
                <div className="space-y-1">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {course.title}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span
                      className="rounded-full border px-2.5 py-1"
                      style={badgeStyles(course.subject?.color)}
                    >
                      {course.subject?.name || 'Unknown'}
                    </span>
                    <span>{formatDate(course.createdAt)}</span>
                  </div>
                </div>
                <ActionButton
                  tone="neutral"
                  icon={<Pencil size={16} />}
                  onClick={() => openEditModal('courses', course)}
                >
                  Edit
                </ActionButton>
              </div>
            ))}
          </div>
        </AdminCard>

        <AdminCard className="p-6 sm:p-8">
          <SectionTitle
            title="Recent Exercises"
            subtitle="Newest practice content"
          />
          <div className="mt-6 space-y-4">
            {stats.recentExercises.map((exercise) => (
              <div
                key={exercise.id}
                className="flex items-center justify-between rounded-2xl border border-black/5 bg-gray-50/80 px-4 py-4 dark:border-white/5 dark:bg-white/5"
              >
                <div className="space-y-1">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {exercise.title}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span
                      className="rounded-full border px-2.5 py-1"
                      style={badgeStyles(exercise.subject?.color)}
                    >
                      {exercise.subject?.name || 'Unknown'}
                    </span>
                    <span>{exercise.difficulty}</span>
                  </div>
                </div>
                <ActionButton
                  tone="neutral"
                  icon={<Pencil size={16} />}
                  onClick={() => openEditModal('exercises', exercise)}
                >
                  Edit
                </ActionButton>
              </div>
            ))}
          </div>
        </AdminCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <AdminCard className="p-6 sm:p-8">
          <SectionTitle
            title="Recent Activity Timeline"
            subtitle="Cross-model activity in one stream"
          />
          <div className="mt-6 space-y-5">
            {timelineItems.map((item, index) => (
              <div key={item.id} className="flex gap-4">
                <div className="flex w-8 flex-col items-center">
                  <div className="h-3 w-3 rounded-full bg-[#FFD700]" />
                  {index !== timelineItems.length - 1 && (
                    <div className="mt-2 h-full w-px bg-black/10 dark:bg-white/10" />
                  )}
                </div>
                <div className="pb-5">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {item.label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDateTime(item.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </AdminCard>

        <div className="grid gap-6">
          <AdminCard className="p-6 sm:p-8">
            <SectionTitle title="Recent Users" subtitle="Newest accounts" />
            <div className="mt-6 space-y-3">
              {users.slice(0, 5).map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                >
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {user.email}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      user.role === 'ADMIN'
                        ? 'bg-violet-500/10 text-violet-500'
                        : 'bg-slate-500/10 text-slate-500'
                    }`}
                  >
                    {user.role}
                  </span>
                </div>
              ))}
            </div>
          </AdminCard>

          <AdminCard className="p-6 sm:p-8">
            <SectionTitle
              title="Recent Planner Tasks"
              subtitle="Published tasks with subject colors"
            />
            <div className="mt-6 space-y-3">
              {plannerTemplates.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                >
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {task.title}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(task.dueAt)}
                    </div>
                  </div>
                  <span
                    className="rounded-full border px-3 py-1 text-xs font-semibold"
                    style={badgeStyles(task.subject?.color)}
                  >
                    {task.subject?.name || 'Unknown'}
                  </span>
                </div>
              ))}
            </div>
          </AdminCard>
        </div>
      </div>
    </div>
  );

  const renderTableSection = () => (
    <AdminCard className="overflow-hidden">
      <div className="border-b border-black/5 px-6 py-5 dark:border-white/5 sm:px-8">
        <SectionTitle
          title={activeSectionMeta.label}
          subtitle={activeSectionMeta.description}
          action={
            activeSectionMeta.createAction ? (
              <PrimaryButton
                icon={<Plus size={16} />}
                onClick={() => openCreateModal(activeSection as ModalSection)}
              >
                {activeSectionMeta.createAction}
              </PrimaryButton>
            ) : null
          }
        />
      </div>
      <div className="space-y-5 p-6 sm:p-8">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder={`Search ${activeSectionMeta.label.toLowerCase()}...`}
          />
          <div className="flex flex-wrap gap-3">
            {selectedIds.length > 0 && activeSection !== 'users' && (
              <DangerButton
                icon={<Trash2 size={16} />}
                onClick={() =>
                  askDelete(
                    activeSection as ModalSection,
                    selectedIds,
                    `${selectedIds.length} selected items`
                  )
                }
              >
                Delete Selected
              </DangerButton>
            )}
            {activeSection === 'subjects' && selectedIds.length > 0 && (
              <>
                <ActionButton
                  tone="success"
                  onClick={() => handleBulkSubjectStatus(true)}
                >
                  Bulk Activate
                </ActionButton>
                <ActionButton
                  tone="neutral"
                  onClick={() => handleBulkSubjectStatus(false)}
                >
                  Bulk Deactivate
                </ActionButton>
              </>
            )}
          </div>
        </div>

        {filtersConfig.length > 0 && (
          <Filters
            filters={filtersConfig}
            onChange={(key, value) =>
              setFilters((previous) => ({ ...previous, [key]: value }))
            }
            extra={
              <div className="flex gap-3">
                <select
                  value={filters.sortBy}
                  onChange={(event) =>
                    setFilters((previous) => ({
                      ...previous,
                      sortBy: event.target.value,
                    }))
                  }
                  className="rounded-xl border-none bg-gray-50 px-4 py-3 text-sm text-gray-900 dark:bg-white/5 dark:text-white"
                  aria-label="Sort records by"
                >
                  <option value="updatedAt">Sort by updated</option>
                  <option value="createdAt">Sort by created</option>
                  <option value="title">Sort by title</option>
                  <option value="name">Sort by name</option>
                  {activeSection === 'planner' && <option value="dueAt">Sort by due date</option>}
                </select>
                <select
                  value={filters.sortDirection}
                  onChange={(event) =>
                    setFilters((previous) => ({
                      ...previous,
                      sortDirection: event.target.value as 'asc' | 'desc',
                    }))
                  }
                  className="rounded-xl border-none bg-gray-50 px-4 py-3 text-sm text-gray-900 dark:bg-white/5 dark:text-white"
                  aria-label="Sort direction"
                >
                  <option value="desc">Newest first</option>
                  <option value="asc">Oldest first</option>
                </select>
              </div>
            }
          />
        )}

        <DataTable
          columns={activeColumns}
          data={paginatedRows as Array<
            Course | Exercise | Subject | Parascolaire | AdminUser | PlannerTemplate
          >}
          loading={loading}
          selectedIds={selectedIds}
          onSelectionChange={activeSection === 'users' ? undefined : setSelectedIds}
          emptyState={
            <EmptyState
              title={`No ${activeSectionMeta.label.toLowerCase()} yet`}
              description={`Create your first ${activeSectionMeta.label
                .toLowerCase()
                .slice(0, -1) || 'item'} to populate this section.`}
            />
          }
        />

        {filteredRows.length > PAGE_SIZE && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </AdminCard>
  );

  const renderSubmissions = () => (
    <AdminCard className="p-6 sm:p-8">
      <SectionTitle
        title="Homework Review"
        subtitle="Upload corrections without leaving the admin workspace"
      />
      <div className="mt-6 grid gap-4">
        {submissions.length === 0 ? (
          <EmptyState
            title="No submissions yet"
            description="Homework submissions will appear here once students upload files."
          />
        ) : (
          submissions.map((submission) => (
            <div
              key={submission.id}
              className="rounded-3xl border border-black/5 bg-gray-50/80 p-5 dark:border-white/5 dark:bg-white/5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {submission.user?.firstName} {submission.user?.lastName}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {submission.fileUrl.split('/').pop()}
                  </div>
                  <div className="text-xs text-gray-400">
                    Submitted {formatDateTime(submission.submittedAt)}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      submission.status === 'GRADED'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : submission.status === 'REVIEWED'
                        ? 'bg-blue-500/10 text-blue-500'
                        : 'bg-amber-500/10 text-amber-500'
                    }`}
                  >
                    {submission.status}
                  </span>
                  <ActionButton
                    tone="neutral"
                    icon={<Upload size={16} />}
                    onClick={() =>
                      window.open(
                        toAssetUrl(submission.fileUrl),
                        '_blank',
                        'noopener,noreferrer'
                      )
                    }
                  >
                    Open Homework
                  </ActionButton>
                </div>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                <div className="rounded-2xl border border-dashed border-black/10 px-4 py-3 text-sm text-gray-500 dark:border-white/10 dark:text-gray-400">
                  {submission.correctionUrl
                    ? `Correction ready: ${submission.correctionUrl.split('/').pop()}`
                    : 'No correction uploaded yet'}
                </div>
                <label className="flex cursor-pointer items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-gray-900 ring-1 ring-black/5 transition hover:bg-gray-50 dark:bg-white/5 dark:text-white dark:ring-white/10 dark:hover:bg-white/10">
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    aria-label={`Upload correction for ${submission.user?.firstName || 'student'} ${submission.user?.lastName || ''}`.trim()}
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        await handleSubmissionCorrectionUpload(submission.id, file);
                      }
                    }}
                  />
                  Upload Correction
                </label>
              </div>
            </div>
          ))
        )}
      </div>
    </AdminCard>
  );

  const renderEditorContent = () => {
    if (!editorSection) {
      return null;
    }

    if (editorSection === 'courses') {
      const course = editingId ? courses.find((entry) => entry.id === editingId) : undefined;
      return (
        <form onSubmit={saveEditor} className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Title
              </span>
              <input
                required
                value={courseForm.title}
                onChange={(event) =>
                  setCourseForm((previous) => ({
                    ...previous,
                    title: event.target.value,
                  }))
                }
                className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Subject
              </span>
              <select
                value={courseForm.subjectId}
                onChange={(event) =>
                  setCourseForm((previous) => ({
                    ...previous,
                    subjectId: event.target.value,
                  }))
                }
                className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
              >
                {subjectOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="space-y-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Description
            </span>
            <textarea
              rows={4}
              value={courseForm.description}
              onChange={(event) =>
                setCourseForm((previous) => ({
                  ...previous,
                  description: event.target.value,
                }))
              }
              className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
            />
          </label>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Difficulty
              </span>
              <select
                value={courseForm.difficulty}
                onChange={(event) =>
                  setCourseForm((previous) => ({
                    ...previous,
                    difficulty: event.target.value as Difficulty,
                  }))
                }
                className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
              >
                <option value="BEGINNER">BEGINNER</option>
                <option value="INTERMEDIATE">INTERMEDIATE</option>
                <option value="ADVANCED">ADVANCED</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Tags
              </span>
              <input
                value={courseForm.tags}
                onChange={(event) =>
                  setCourseForm((previous) => ({
                    ...previous,
                    tags: event.target.value,
                  }))
                }
                className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                placeholder="math, algebra, bac"
              />
            </label>
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Course PDF
              </span>
              <PdfUploader
                value={courseForm.contentUrl ? toAssetUrl(courseForm.contentUrl) : ''}
                onChange={(value) =>
                  setCourseForm((previous) => ({
                    ...previous,
                    contentUrl: value.replace(BACKEND_URL, ''),
                  }))
                }
                onUpload={async (file) => {
                  const formData = new FormData();
                  formData.append('pdf', file);
                  const response = await adminAPI.uploadCoursePdf(formData);
                  return toAssetUrl(response.data.fileUrl as string);
                }}
              />
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Course Video
              </span>
              <VideoUploader
                value={toAssetUrl(courseForm.videoPath)}
                onChange={(value) =>
                  setCourseForm((previous) => ({
                    ...previous,
                    videoPath: value.replace(BACKEND_URL, ''),
                  }))
                }
                onUpload={async (file, options) => {
                  const response = await adminAPI.uploadAdminVideo(file, options);
                  return toAssetUrl(response.data.videoPath as string);
                }}
              />
            </div>
          </div>
          <div className="rounded-3xl border border-black/5 p-5 dark:border-white/5">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Optional Resource
            </h3>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <input
                value={courseForm.resourceTitle}
                onChange={(event) =>
                  setCourseForm((previous) => ({
                    ...previous,
                    resourceTitle: event.target.value,
                  }))
                }
                className="rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                placeholder="Title"
                aria-label="Course resource title"
              />
              <input
                value={courseForm.resourceUrl}
                onChange={(event) =>
                  setCourseForm((previous) => ({
                    ...previous,
                    resourceUrl: event.target.value,
                  }))
                }
                className="rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                placeholder="URL"
                aria-label="Course resource URL"
              />
              <select
                value={courseForm.resourceType}
                onChange={(event) =>
                  setCourseForm((previous) => ({
                    ...previous,
                    resourceType: event.target.value,
                  }))
                }
                className="rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                aria-label="Course resource type"
              >
                <option value="WEBSITE">Website</option>
                <option value="YOUTUBE">YouTube</option>
                <option value="PDF">PDF</option>
              </select>
            </div>
          </div>

          {course && course.resources.length > 0 && (
            <div className="rounded-3xl border border-black/5 p-5 dark:border-white/5">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Existing Resources
              </h3>
              <div className="mt-4 grid gap-3">
                {course.resources.map((resource) => (
                  <div
                    key={resource.id}
                    className="flex flex-col gap-3 rounded-2xl bg-gray-50 px-4 py-4 dark:bg-white/5 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {resource.title}
                      </div>
                      <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {resource.url}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <ActionButton
                        tone="neutral"
                        onClick={() =>
                          window.open(toAssetUrl(resource.url), '_blank', 'noopener,noreferrer')
                        }
                      >
                        Open
                      </ActionButton>
                      <ActionButton
                        tone="danger"
                        onClick={async () => {
                          try {
                            await adminAPI.deleteCourseResource(resource.id);
                            await fetchAdminData();
                            showToast('success', 'Resource deleted');
                          } catch (error) {
                            showToast('error', 'Failed to delete resource');
                          }
                        }}
                      >
                        Delete
                      </ActionButton>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <PrimaryButton type="submit" fullWidth disabled={saving}>
            {saving ? 'Saving...' : editingId ? 'Save Course' : 'Create Course'}
          </PrimaryButton>
        </form>
      );
    }

    if (editorSection === 'exercises') {
      const exercise = editingId ? exercises.find((entry) => entry.id === editingId) : undefined;
      return (
        <form onSubmit={saveEditor} className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Title
              </span>
              <input
                required
                value={exerciseForm.title}
                onChange={(event) =>
                  setExerciseForm((previous) => ({
                    ...previous,
                    title: event.target.value,
                  }))
                }
                className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Subject
              </span>
              <select
                value={exerciseForm.subjectId}
                onChange={(event) =>
                  setExerciseForm((previous) => ({
                    ...previous,
                    subjectId: event.target.value,
                  }))
                }
                className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
              >
                {subjectOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="space-y-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Description
            </span>
            <textarea
              rows={4}
              value={exerciseForm.description}
              onChange={(event) =>
                setExerciseForm((previous) => ({
                  ...previous,
                  description: event.target.value,
                }))
              }
              className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Difficulty
            </span>
            <select
              value={exerciseForm.difficulty}
              onChange={(event) =>
                setExerciseForm((previous) => ({
                  ...previous,
                  difficulty: event.target.value as Difficulty,
                }))
              }
              className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
            >
              <option value="BEGINNER">BEGINNER</option>
              <option value="INTERMEDIATE">INTERMEDIATE</option>
              <option value="ADVANCED">ADVANCED</option>
            </select>
          </label>
          <div className="grid gap-5 xl:grid-cols-2">
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Exercise PDF
              </span>
              <PdfUploader
                value={exerciseForm.contentUrl ? toAssetUrl(exerciseForm.contentUrl) : ''}
                onChange={(value) =>
                  setExerciseForm((previous) => ({
                    ...previous,
                    contentUrl: value.replace(BACKEND_URL, ''),
                  }))
                }
                onUpload={async (file) => {
                  const formData = new FormData();
                  formData.append('pdf', file);
                  const response = await adminAPI.uploadExercisePdf(formData);
                  return toAssetUrl(response.data.fileUrl as string);
                }}
              />
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Correction PDF
              </span>
              <PdfUploader
                value={exerciseCorrectionFile?.name || ''}
                onChange={(value) => {
                  if (!value) {
                    setExerciseCorrectionFile(null)
                  }
                }}
                onUpload={async (file) => {
                  setExerciseCorrectionFile(file);
                  return file.name;
                }}
                placeholder="Attach a correction PDF"
              />
            </div>
          </div>
          <div className="rounded-3xl border border-black/5 p-5 dark:border-white/5">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Optional Resource
            </h3>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <input
                value={exerciseForm.resourceTitle}
                onChange={(event) =>
                  setExerciseForm((previous) => ({
                    ...previous,
                    resourceTitle: event.target.value,
                  }))
                }
                className="rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                placeholder="Title"
                aria-label="Exercise resource title"
              />
              <input
                value={exerciseForm.resourceUrl}
                onChange={(event) =>
                  setExerciseForm((previous) => ({
                    ...previous,
                    resourceUrl: event.target.value,
                  }))
                }
                className="rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                placeholder="URL"
                aria-label="Exercise resource URL"
              />
              <select
                value={exerciseForm.resourceType}
                onChange={(event) =>
                  setExerciseForm((previous) => ({
                    ...previous,
                    resourceType: event.target.value,
                  }))
                }
                className="rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                aria-label="Exercise resource type"
              >
                <option value="WEBSITE">Website</option>
                <option value="YOUTUBE">YouTube</option>
                <option value="PDF">PDF</option>
              </select>
            </div>
          </div>

          {exercise && exercise.corrections.length > 0 && (
            <div className="rounded-3xl border border-black/5 p-5 dark:border-white/5">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Existing Corrections
              </h3>
              <div className="mt-4 grid gap-3">
                {exercise.corrections.map((correction) => (
                  <div
                    key={correction.id}
                    className="flex flex-col gap-3 rounded-2xl bg-gray-50 px-4 py-4 dark:bg-white/5 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {correction.title}
                      </div>
                      <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {correction.contentUrl}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <ActionButton
                        tone="neutral"
                        onClick={() =>
                          window.open(
                            toAssetUrl(correction.contentUrl),
                            '_blank',
                            'noopener,noreferrer'
                          )
                        }
                      >
                        Open
                      </ActionButton>
                      <ActionButton
                        tone="danger"
                        onClick={async () => {
                          try {
                            await adminAPI.deleteExerciseCorrection(correction.id);
                            await fetchAdminData();
                            showToast('success', 'Correction deleted');
                          } catch (error) {
                            showToast('error', 'Failed to delete correction');
                          }
                        }}
                      >
                        Delete
                      </ActionButton>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {exercise && exercise.resources.length > 0 && (
            <div className="rounded-3xl border border-black/5 p-5 dark:border-white/5">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Existing Resources
              </h3>
              <div className="mt-4 grid gap-3">
                {exercise.resources.map((resource) => (
                  <div
                    key={resource.id}
                    className="flex flex-col gap-3 rounded-2xl bg-gray-50 px-4 py-4 dark:bg-white/5 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {resource.title}
                      </div>
                      <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {resource.url}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <ActionButton
                        tone="neutral"
                        onClick={() =>
                          window.open(toAssetUrl(resource.url), '_blank', 'noopener,noreferrer')
                        }
                      >
                        Open
                      </ActionButton>
                      <ActionButton
                        tone="danger"
                        onClick={async () => {
                          try {
                            await adminAPI.deleteExerciseResource(resource.id);
                            await fetchAdminData();
                            showToast('success', 'Resource deleted');
                          } catch (error) {
                            showToast('error', 'Failed to delete resource');
                          }
                        }}
                      >
                        Delete
                      </ActionButton>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <PrimaryButton type="submit" fullWidth disabled={saving}>
            {saving ? 'Saving...' : editingId ? 'Save Exercise' : 'Create Exercise'}
          </PrimaryButton>
        </form>
      );
    }

    if (editorSection === 'subjects') {
      return (
        <form onSubmit={saveEditor} className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Name
              </span>
              <input
                required
                value={subjectForm.name}
                onChange={(event) =>
                  setSubjectForm((previous) => ({
                    ...previous,
                    name: event.target.value,
                  }))
                }
                className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Icon
              </span>
              <input
                value={subjectForm.icon}
                onChange={(event) =>
                  setSubjectForm((previous) => ({
                    ...previous,
                    icon: event.target.value,
                  }))
                }
                className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                placeholder="book, atom, calculator"
              />
            </label>
          </div>
          <label className="space-y-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Description
            </span>
            <textarea
              rows={4}
              value={subjectForm.description}
              onChange={(event) =>
                setSubjectForm((previous) => ({
                  ...previous,
                  description: event.target.value,
                }))
              }
              className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
            />
          </label>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Color
              </span>
              <input
                type="color"
                value={subjectForm.color}
                onChange={(event) =>
                  setSubjectForm((previous) => ({
                    ...previous,
                    color: event.target.value,
                  }))
                }
                className="h-14 w-full rounded-2xl bg-gray-50 px-3 py-2 dark:bg-white/5"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Order
              </span>
              <input
                type="number"
                value={subjectForm.order}
                onChange={(event) =>
                  setSubjectForm((previous) => ({
                    ...previous,
                    order: Number(event.target.value),
                  }))
                }
                className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
              />
            </label>
          </div>
          <label className="flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 dark:bg-white/5 dark:text-gray-300">
            <input
              type="checkbox"
              checked={subjectForm.isActive}
              onChange={(event) =>
                setSubjectForm((previous) => ({
                  ...previous,
                  isActive: event.target.checked,
                }))
              }
            />
            Active subject
          </label>
          <PrimaryButton type="submit" fullWidth disabled={saving}>
            {saving ? 'Saving...' : editingId ? 'Save Subject' : 'Create Subject'}
          </PrimaryButton>
        </form>
      );
    }

    if (editorSection === 'parascolaires') {
      return (
        <form onSubmit={saveEditor} className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Title
              </span>
              <input
                required
                value={parascolaireForm.title}
                onChange={(event) =>
                  setParascolaireForm((previous) => ({
                    ...previous,
                    title: event.target.value,
                  }))
                }
                className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
              />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Description
              </span>
              <textarea
                rows={4}
                value={parascolaireForm.description}
                onChange={(event) =>
                  setParascolaireForm((previous) => ({
                    ...previous,
                    description: event.target.value,
                  }))
                }
                className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Category
              </span>
              <input
                value={parascolaireForm.category}
                onChange={(event) =>
                  setParascolaireForm((previous) => ({
                    ...previous,
                    category: event.target.value,
                  }))
                }
                className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
              />
            </label>
            <label className="flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 dark:bg-white/5 dark:text-gray-300">
              <input
                type="checkbox"
                checked={parascolaireForm.isFree}
                onChange={(event) =>
                  setParascolaireForm((previous) => ({
                    ...previous,
                    isFree: event.target.checked,
                  }))
                }
              />
              Free offer
            </label>
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Cover Image
              </span>
              <ImageUploader
                value={toAssetUrl(parascolaireForm.coverImage)}
                onChange={(value) =>
                  setParascolaireForm((previous) => ({
                    ...previous,
                    coverImage: value.replace(BACKEND_URL, ''),
                  }))
                }
                onUpload={async (file) => {
                  const formData = new FormData();
                  formData.append('cover', file);
                  const response = await parascolairesAPI.uploadCover(formData);
                  return toAssetUrl(response.data.fileUrl as string);
                }}
              />
            </div>
            <div className="space-y-4">
              <label className="flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 dark:bg-white/5 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={parascolaireForm.hasPdf}
                  onChange={(event) =>
                    setParascolaireForm((previous) => ({
                      ...previous,
                      hasPdf: event.target.checked,
                    }))
                  }
                />
                Includes PDF
              </label>
              {parascolaireForm.hasPdf && (
                <PdfUploader
                  value={
                    parascolaireForm.pdfUrl ? toAssetUrl(parascolaireForm.pdfUrl) : ''
                  }
                  onChange={(value) =>
                    setParascolaireForm((previous) => ({
                      ...previous,
                      pdfUrl: value.replace(BACKEND_URL, ''),
                    }))
                  }
                  onUpload={async (file) => {
                    const formData = new FormData();
                    formData.append('pdf', file);
                    const response = await parascolairesAPI.uploadPdf(formData);
                    return toAssetUrl(response.data.fileUrl as string);
                  }}
                />
              )}
              {parascolaireForm.hasPdf && !parascolaireForm.isFree && (
                <input
                  type="number"
                  step="0.01"
                  value={parascolaireForm.pdfPrice}
                  onChange={(event) =>
                    setParascolaireForm((previous) => ({
                      ...previous,
                      pdfPrice: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                  placeholder="PDF price"
                  aria-label="Parascolaire PDF price"
                />
              )}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 dark:bg-white/5 dark:text-gray-300">
              <input
                type="checkbox"
                checked={parascolaireForm.hasPaperBook}
                onChange={(event) =>
                  setParascolaireForm((previous) => ({
                    ...previous,
                    hasPaperBook: event.target.checked,
                  }))
                }
              />
              Has paper book
            </label>
            {parascolaireForm.hasPaperBook && (
              <input
                type="number"
                step="0.01"
                value={parascolaireForm.paperPrice}
                onChange={(event) =>
                  setParascolaireForm((previous) => ({
                    ...previous,
                    paperPrice: event.target.value,
                  }))
                }
                className="rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                placeholder="Paper price"
                aria-label="Parascolaire paper price"
              />
            )}
            {parascolaireForm.hasPaperBook && (
              <input
                value={parascolaireForm.paperOrderUrl}
                onChange={(event) =>
                  setParascolaireForm((previous) => ({
                    ...previous,
                    paperOrderUrl: event.target.value,
                  }))
                }
                className="rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                placeholder="Order link"
                aria-label="Parascolaire order link"
              />
            )}
          </div>
          <PrimaryButton type="submit" fullWidth disabled={saving}>
            {saving
              ? 'Saving...'
              : editingId
              ? 'Save Parascolaire'
              : 'Create Parascolaire'}
          </PrimaryButton>
        </form>
      );
    }

    return (
      <form onSubmit={saveEditor} className="space-y-5">
        <label className="space-y-2">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
            Title
          </span>
          <input
            required
            value={plannerForm.title}
            onChange={(event) =>
              setPlannerForm((previous) => ({
                ...previous,
                title: event.target.value,
              }))
            }
            className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
            Description
          </span>
          <textarea
            rows={4}
            value={plannerForm.description}
            onChange={(event) =>
              setPlannerForm((previous) => ({
                ...previous,
                description: event.target.value,
              }))
            }
            className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
          />
        </label>
        <div className="grid gap-5 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Subject
            </span>
            <select
              value={plannerForm.subjectId}
              onChange={(event) =>
                setPlannerForm((previous) => ({
                  ...previous,
                  subjectId: event.target.value,
                }))
              }
              className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
            >
              {subjectOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Due Date
            </span>
            <input
              type="date"
              value={plannerForm.dueAt}
              onChange={(event) =>
                setPlannerForm((previous) => ({
                  ...previous,
                  dueAt: event.target.value,
                }))
              }
              className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
            />
          </label>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <select
            value={plannerForm.priority}
            onChange={(event) =>
              setPlannerForm((previous) => ({
                ...previous,
                priority: event.target.value,
              }))
            }
            className="rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
            aria-label="Task priority"
          >
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
          </select>
          <input
            value={plannerForm.attachmentUrl}
            onChange={(event) =>
              setPlannerForm((previous) => ({
                ...previous,
                attachmentUrl: event.target.value,
              }))
            }
            className="rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
            placeholder="Attachment URL (optional)"
            aria-label="Attachment URL"
          />
          <input
            value={plannerForm.attachmentLabel}
            onChange={(event) =>
              setPlannerForm((previous) => ({
                ...previous,
                attachmentLabel: event.target.value,
              }))
            }
            className="rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
            placeholder="Attachment label (optional)"
            aria-label="Attachment label"
          />
        </div>
        <label className="flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 dark:bg-white/5 dark:text-gray-300">
          <input
            type="checkbox"
            checked={plannerForm.targetAll}
            onChange={(event) =>
              setPlannerForm((previous) => ({
                ...previous,
                targetAll: event.target.checked,
                targetBacSections: event.target.checked ? [] : previous.targetBacSections,
              }))
            }
          />
          Target all students
        </label>
        {!plannerForm.targetAll && (
          <div className="rounded-2xl bg-gray-50 px-4 py-4 dark:bg-white/5">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Target BAC sections
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {BAC_SECTION_OPTIONS.map((option) => {
                const checked = plannerForm.targetBacSections.includes(option.value);
                return (
                  <label
                    key={option.value}
                    className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm dark:bg-black/20 dark:text-gray-200"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) =>
                        setPlannerForm((previous) => {
                          const next = new Set(previous.targetBacSections);
                          if (event.target.checked) {
                            next.add(option.value);
                          } else {
                            next.delete(option.value);
                          }
                          return { ...previous, targetBacSections: Array.from(next) };
                        })
                      }
                    />
                    {option.label}
                  </label>
                );
              })}
            </div>
          </div>
        )}
        <label className="flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 dark:bg-white/5 dark:text-gray-300">
          <input
            type="checkbox"
            checked={plannerForm.publish}
            onChange={(event) =>
              setPlannerForm((previous) => ({
                ...previous,
                publish: event.target.checked,
              }))
            }
          />
          Publish to students after saving
        </label>
        <PrimaryButton type="submit" fullWidth disabled={saving}>
          {saving ? 'Saving...' : editingId ? 'Save Planner Task' : 'Create Planner Task'}
        </PrimaryButton>
      </form>
    );
  };

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
      <SuccessToast
        isVisible={toast.open}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast((previous) => ({ ...previous, open: false }))}
      />
      <DeleteModal
        isOpen={deleteState.open}
        onClose={() =>
          setDeleteState({ open: false, section: null, ids: [], label: '' })
        }
        onConfirm={confirmDelete}
        title="Delete selected items?"
        description={`This will permanently remove ${deleteState.label}.`}
        isLoading={bulkLoading}
      />

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <AdminCard className="h-fit overflow-hidden xl:sticky xl:top-24">
          <div className="relative overflow-hidden border-b border-black/5 px-6 py-6 dark:border-white/5">
            <div
              className={`absolute inset-0 bg-gradient-to-br ${activeSectionMeta.accent}`}
            />
            <div className="relative">
              <div className="mb-3 inline-flex rounded-2xl bg-white/70 p-3 text-gray-900 shadow-sm dark:bg-black/20 dark:text-white">
                <Shield size={20} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Admin Workspace
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Modular management for content, subjects, planner, and review
                flows.
              </p>
            </div>
          </div>
          <div className="space-y-2 p-4">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = section.key === activeSection;
              return (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => {
                    if (section.key === 'users') {
                      navigate('/admin/users');
                    } else {
                      setActiveSection(section.key);
                    }
                  }}
                  className={`flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-left transition-all ${
                    isActive
                      ? 'bg-[#FFD700] text-black shadow-lg shadow-[#FFD700]/20'
                      : 'hover:bg-gray-100 dark:hover:bg-white/5'
                  }`}
                >
                  <Icon size={18} className="mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold">{section.label}</div>
                    <div
                      className={`text-xs ${
                        isActive
                          ? 'text-black/70'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {section.description}
                    </div>
                  </div>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => navigate('/admin/platform-offer')}
              className="mt-2 flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-left transition-all hover:bg-gray-100 dark:hover:bg-white/5"
            >
              <Sparkles size={18} className="mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold">Platform Offer</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Pre-registration marketing page and pricing
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/admin/settings')}
              className="flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-left transition-all hover:bg-gray-100 dark:hover:bg-white/5"
            >
              <Settings size={18} className="mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold">Settings</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Branding, maintenance, and platform options
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/admin/uploads')}
              className="flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-left transition-all hover:bg-gray-100 dark:hover:bg-white/5"
            >
              <Upload size={18} className="mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold">Uploads</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Preview, replace, and delete files
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/admin/communications')}
              className="flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-left transition-all hover:bg-gray-100 dark:hover:bg-white/5"
            >
              <MessageSquare size={18} className="mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold">Communications</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Announcements, scheduling, and student messaging
                </div>
              </div>
            </button>
          </div>
        </AdminCard>

        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[32px] border border-black/5 bg-white px-6 py-6 shadow-sm dark:border-white/5 dark:bg-[#1A1A1A] sm:px-8"
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:bg-white/5 dark:text-gray-400">
                  <Clock3 size={14} />
                  Premium Admin System
                </div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {activeSectionMeta.label}
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
                  {activeSectionMeta.description}. Search, pagination, bulk
                  actions, uploads, and non-blocking feedback all stay in one
                  consistent flow.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <label className="flex min-w-[260px] flex-col gap-2 rounded-2xl border border-black/5 bg-gray-50/80 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                    Current Bac Section
                  </span>
                  <select
                    value={currentBacSection}
                    onChange={(event) => setCurrentBacSection(event.target.value as BacSection)}
                    className="bg-transparent text-sm font-semibold text-gray-900 outline-none dark:text-white"
                  >
                    {BAC_SECTION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value} className="text-black">
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                {activeSectionMeta.createAction &&
                  activeSection !== 'dashboard' &&
                  activeSection !== 'users' &&
                  activeSection !== 'submissions' && (
                    <PrimaryButton
                      icon={<Plus size={16} />}
                      onClick={() => openCreateModal(activeSection as ModalSection)}
                    >
                      {activeSectionMeta.createAction}
                    </PrimaryButton>
                  )}
                <ActionButton
                  tone="neutral"
                  icon={<MoreHorizontal size={16} />}
                  onClick={fetchAdminData}
                >
                  Refresh
                </ActionButton>
              </div>
            </div>
          </motion.div>

          {loading && activeSection === 'dashboard' ? (
            <AdminCard className="p-10">
              <div className="flex items-center justify-center py-20">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#FFD700]" />
              </div>
            </AdminCard>
          ) : activeSection === 'dashboard' ? (
            renderOverview()
          ) : activeSection === 'submissions' ? (
            renderSubmissions()
          ) : (
            renderTableSection()
          )}
        </div>
      </div>

      <AnimatePresence>
        {editorSection && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={closeEditor}
            />
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              className="relative z-10 max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[32px] bg-white shadow-2xl dark:bg-[#1A1A1A]"
            >
              <div className="border-b border-black/5 px-6 py-5 dark:border-white/5 sm:px-8">
                <SectionTitle
                  title={`${editingId ? 'Edit' : 'Create'} ${
                    sections.find((section) => section.key === editorSection)?.label.slice(0, -1) ||
                    'Item'
                  }`}
                  subtitle="Reusable admin form with uploads, relations, and enum fields."
                />
              </div>
              <div className="max-h-[75vh] overflow-y-auto p-6 sm:p-8">
                {renderEditorContent()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminWorkspace;
