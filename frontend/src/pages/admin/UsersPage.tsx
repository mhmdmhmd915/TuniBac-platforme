import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download,
  Eye,
  EyeOff,
  Pencil,
  ShieldOff,
  Trash2,
  UserCheck,
  UserMinus,
  UserX,
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import { AdminCard } from '../../components/admin/AdminCard';
import { SectionTitle } from '../../components/admin/SectionTitle';
import { SuccessToast } from '../../components/admin/SuccessToast';
import { ActionButton } from '../../components/admin/ActionButton';
import { PrimaryButton } from '../../components/admin/PrimaryButton';
import { DangerButton } from '../../components/admin/DangerButton';
import { DeleteModal } from '../../components/admin/DeleteModal';
import { SearchBar } from '../../components/admin/SearchBar';
import { Pagination } from '../../components/admin/Pagination';
import { DataTable, Column } from '../../components/admin/DataTable';
import { AdminUserRow, UserRole, UserStatus } from '../../features/admin/types';
import {
  BAC_SECTION_LABELS,
  BAC_SECTION_OPTIONS,
  DEFAULT_BAC_SECTION,
  type BacSection,
} from '../../constants/bacSections';
import { sanitizeTunisianPhoneInput, toDisplayTunisianPhone } from '../../lib/phone';

type ToastType = 'success' | 'error' | 'warning';

type FriendlyStatus = 'ACCEPTED' | 'REFUSED' | 'SUSPENDED';
const ADMIN_SECTION_STORAGE_KEY = 'adminWorkspaceBacSection';

const getErrorMessage = (error: unknown) => {
  if (typeof error === 'object' && error && 'response' in error) {
    const anyError = error as any;
    return (
      anyError?.response?.data?.message ||
      anyError?.message ||
      'Une erreur est survenue'
    );
  }
  return 'Une erreur est survenue';
};

const StatusBadge = ({ status }: { status: UserStatus }) => {
  const classes =
    status === 'PENDING'
      ? 'bg-yellow-500/10 text-yellow-500'
      : status === 'APPROVED'
      ? 'bg-emerald-500/10 text-emerald-500'
      : status === 'SUSPENDED'
      ? 'bg-red-500/10 text-red-500'
      : 'bg-slate-500/10 text-slate-400';

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${classes}`}>
      {status === 'APPROVED'
        ? 'ACCEPTED'
        : status === 'REJECTED'
        ? 'REFUSED'
        : status}
    </span>
  );
};

const RoleBadge = ({ role }: { role: UserRole }) => (
  <span
    className={`rounded-full px-3 py-1 text-xs font-semibold ${
      role === 'ADMIN'
        ? 'bg-violet-500/10 text-violet-500'
        : 'bg-slate-500/10 text-slate-400'
    }`}
  >
    {role}
  </span>
);

const UsersPage: React.FC = () => {
  const [currentBacSection, setCurrentBacSection] = useState<BacSection>(() => {
    const stored = localStorage.getItem(ADMIN_SECTION_STORAGE_KEY);
    if (stored && BAC_SECTION_OPTIONS.some((option) => option.value === stored)) {
      return stored as BacSection;
    }

    return DEFAULT_BAC_SECTION;
  });
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<UserStatus | ''>('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [exporting, setExporting] = useState(false);

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{
    open: boolean;
    type: ToastType;
    message: string;
  }>({
    open: false,
    type: 'success',
    message: '',
  });
  const lastRequestKey = useRef<string | null>(null);

  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    ids: string[];
    label: string;
  }>({ open: false, ids: [], label: '' });

  const [editor, setEditor] = useState<{
    open: boolean;
    user: AdminUserRow | null;
  }>({ open: false, user: null });

  const [editorSaving, setEditorSaving] = useState(false);

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

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getUsers({
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        role: roleFilter || undefined,
        bacSection: currentBacSection,
        sortBy,
        sortOrder,
        page,
        pageSize,
      });
      setUsers(response.data.items || []);
      setTotal(Number(response.data.total || 0));
    } catch (error) {
      showToast('error', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    localStorage.setItem(ADMIN_SECTION_STORAGE_KEY, currentBacSection);
  }, [currentBacSection]);

  useEffect(() => {
    const requestKey = JSON.stringify({
      currentBacSection,
      search,
      statusFilter,
      roleFilter,
      sortBy,
      sortOrder,
      page,
      pageSize,
    });

    if (lastRequestKey.current === requestKey) {
      return;
    }

    lastRequestKey.current = requestKey;
    const timeout = window.setTimeout(() => {
      fetchUsers();
    }, 200);

    return () => window.clearTimeout(timeout);
  }, [currentBacSection, search, statusFilter, roleFilter, sortBy, sortOrder, page, pageSize]);

  useEffect(() => {
    setPage(1);
    setSelectedUsers([]);
  }, [currentBacSection, search, statusFilter, roleFilter, sortBy, sortOrder, pageSize]);

  const handleApproveUser = async (id: string) => {
    try {
      await adminAPI.approveUser(id);
      showToast('success', 'Utilisateur approuvé');
      fetchUsers();
    } catch (error) {
      showToast('error', getErrorMessage(error));
    }
  };

  const handleRejectUser = async (id: string) => {
    try {
      await adminAPI.rejectUser(id);
      showToast('success', 'Utilisateur rejeté');
      fetchUsers();
    } catch (error) {
      showToast('error', getErrorMessage(error));
    }
  };

  const handleSuspendUser = async (id: string) => {
    try {
      await adminAPI.suspendUser(id);
      showToast('success', 'Utilisateur suspendu');
      fetchUsers();
    } catch (error) {
      showToast('error', getErrorMessage(error));
    }
  };

  const handleReactivateUser = async (id: string) => {
    try {
      await adminAPI.reactivateUser(id);
      showToast('success', 'Utilisateur réactivé');
      fetchUsers();
    } catch (error) {
      showToast('error', getErrorMessage(error));
    }
  };

  const openDelete = (ids: string[], label: string) => {
    setDeleteModal({ open: true, ids, label });
  };

  const confirmDelete = async () => {
    try {
      if (deleteModal.ids.length === 1) {
        await adminAPI.deleteUser(deleteModal.ids[0]);
      } else {
        await adminAPI.bulkDeleteUsers(deleteModal.ids);
      }
      showToast('success', 'Suppression effectuée');
      setSelectedUsers([]);
      setDeleteModal({ open: false, ids: [], label: '' });
      fetchUsers();
    } catch (error) {
      showToast('error', getErrorMessage(error));
    }
  };

  const handleBulkApprove = async () => {
    try {
      await adminAPI.bulkApproveUsers(selectedUsers);
      showToast('success', 'Utilisateurs approuvés');
      setSelectedUsers([]);
      fetchUsers();
    } catch (error) {
      showToast('error', getErrorMessage(error));
    }
  };

  const handleBulkSuspend = async () => {
    try {
      await adminAPI.bulkSuspendUsers(selectedUsers);
      showToast('success', 'Utilisateurs suspendus');
      setSelectedUsers([]);
      fetchUsers();
    } catch (error) {
      showToast('error', getErrorMessage(error));
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const [editForm, setEditForm] = useState<{
    firstName: string;
    lastName: string;
    phone: string;
    bacSection: BacSection;
    role: UserRole;
  } | null>(null);

  const [passwordForm, setPasswordForm] = useState<{
    password: string;
    confirm: string;
    show: boolean;
  }>({ password: '', confirm: '', show: false });

  const [statusAction, setStatusAction] = useState<FriendlyStatus | ''>('');

  const columns: Column<AdminUserRow>[] = [
    {
      header: 'Utilisateur',
      key: 'phone',
      render: (_value, user) => (
        <div className="space-y-1">
          <div className="font-semibold text-gray-900 dark:text-white">
            {user.firstName} {user.lastName}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {user.phone ? toDisplayTunisianPhone(user.phone) : 'No phone number'}
          </div>
        </div>
      ),
    },
    {
      header: 'Téléphone',
      key: 'phone',
      render: (value) => (
        <span className="text-sm text-gray-600 dark:text-gray-300">
          {value ? toDisplayTunisianPhone(String(value)) : '-'}
        </span>
      ),
    },
    {
      header: 'Rôle',
      key: 'role',
      render: (value) => <RoleBadge role={value as UserRole} />,
    },
    {
      header: 'Section',
      key: 'bacSection',
      render: (value) => (
        <span className="text-sm text-gray-600 dark:text-gray-300">
          {BAC_SECTION_LABELS[value as BacSection]}
        </span>
      ),
    },
    {
      header: 'Statut',
      key: 'status',
      render: (value) => <StatusBadge status={value as UserStatus} />,
    },
    {
      header: 'Inscription',
      key: 'createdAt',
      render: (value) => (
        <span className="text-sm text-gray-600 dark:text-gray-300">
          {new Date(String(value)).toLocaleDateString()}
        </span>
      ),
    },
    {
        header: 'Actions',
      key: 'actions',
      render: (_value, user) => (
        <div className="flex flex-wrap items-center gap-2">
          {user.status === 'PENDING' && (
            <PrimaryButton
              onClick={() => handleApproveUser(user.id)}
              className="px-3 py-1 text-xs"
              icon={<UserCheck size={14} />}
            >
              Approve
            </PrimaryButton>
          )}
          {user.status === 'PENDING' && (
            <DangerButton
              onClick={() => handleRejectUser(user.id)}
              className="px-3 py-1 text-xs"
              icon={<UserX size={14} />}
            >
              Reject
            </DangerButton>
          )}
          {user.status === 'APPROVED' && (
            <ActionButton
              tone="neutral"
              onClick={() => handleSuspendUser(user.id)}
              className="px-3 py-1 text-xs"
              icon={<UserMinus size={14} />}
            >
              Suspend
            </ActionButton>
          )}
          {user.status === 'SUSPENDED' && (
            <PrimaryButton
              onClick={() => handleReactivateUser(user.id)}
              className="px-3 py-1 text-xs"
              icon={<UserCheck size={14} />}
            >
              Reactivate
            </PrimaryButton>
          )}
          <ActionButton
            tone="neutral"
            onClick={() => {
              setEditForm({
                firstName: user.firstName,
                lastName: user.lastName,
                phone: sanitizeTunisianPhoneInput(user.phone || ''),
                bacSection: user.bacSection,
                role: user.role,
              });
              setPasswordForm({ password: '', confirm: '', show: false });
              setStatusAction('');
              setEditor({ open: true, user });
            }}
            className="px-3 py-1 text-xs"
            icon={<Pencil size={14} />}
          >
            Edit
          </ActionButton>
          <ActionButton
            tone="danger"
            onClick={() => openDelete([user.id], `${user.firstName} ${user.lastName}`)}
            className="px-3 py-1 text-xs"
            icon={<Trash2 size={14} />}
          >
            Delete
          </ActionButton>
        </div>
      ),
    },
  ];

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editor.user || !editForm) {
      return;
    }
    try {
      setEditorSaving(true);

      if (statusAction) {
        if (statusAction === 'ACCEPTED') {
          await adminAPI.approveUser(editor.user.id);
        }
        if (statusAction === 'REFUSED') {
          await adminAPI.rejectUser(editor.user.id);
        }
        if (statusAction === 'SUSPENDED') {
          await adminAPI.suspendUser(editor.user.id);
        }
      }

      await adminAPI.updateUser(editor.user.id, {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        phone: editForm.phone || null,
        bacSection: editForm.bacSection,
        role: editForm.role,
      });

      if (passwordForm.password.trim().length > 0) {
        if (passwordForm.password.trim().length < 6) {
          showToast('error', 'Password must be at least 6 characters');
          return;
        }
        if (passwordForm.password !== passwordForm.confirm) {
          showToast('error', 'Passwords do not match');
          return;
        }
        await adminAPI.updateUserPassword(editor.user.id, passwordForm.password);
      }

      setEditor({ open: false, user: null });
      setPasswordForm({ password: '', confirm: '', show: false });
      setStatusAction('');
      showToast('success', 'Utilisateur mis à jour');
      fetchUsers();
    } catch (error) {
      showToast('error', getErrorMessage(error));
    } finally {
      setEditorSaving(false);
    }
  };

  const exportCsv = async () => {
    try {
      setExporting(true);

      const pageSizeExport = 100;
      let currentPage = 1;
      let all: AdminUserRow[] = [];

      let hasMore = true;

      while (hasMore) {
        const response = await adminAPI.getUsers({
          search: search.trim() || undefined,
          status: statusFilter || undefined,
          role: roleFilter || undefined,
          bacSection: currentBacSection,
          sortBy,
          sortOrder,
          page: currentPage,
          pageSize: pageSizeExport,
        });

        const batch = (response.data.items || []) as AdminUserRow[];
        all = all.concat(batch);

        const totalCount = Number(response.data.total || 0);

        if (batch.length === 0 || all.length >= totalCount) {
          hasMore = false;
        } else {
          currentPage += 1;
        }
      }

      const escape = (value: unknown) => {
        const str = String(value ?? '');
        if (str.includes('"') || str.includes(',') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const header = [
        'id',
        'firstName',
        'lastName',
        'phone',
        'bacSection',
        'role',
        'status',
        'createdAt',
      ];

      const rows = all.map((u) => [
        escape(u.id),
        escape(u.firstName),
        escape(u.lastName),
        escape(u.phone || ''),
        escape(BAC_SECTION_LABELS[u.bacSection]),
        escape(u.role),
        escape(u.status),
        escape(u.createdAt),
      ]);

      const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast('success', 'Export ready');
    } catch (error) {
      showToast('error', getErrorMessage(error));
    } finally {
      setExporting(false);
    }
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
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, ids: [], label: '' })}
        onConfirm={confirmDelete}
        title="Supprimer utilisateur(s) ?"
        description={`Cette action supprimera définitivement ${deleteModal.label}.`}
      />
      
      <AdminCard className="p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <SectionTitle 
              title="User Management" 
              subtitle={`Approve, reject, suspend, and delete users for ${BAC_SECTION_LABELS[currentBacSection]}`} 
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ActionButton
              tone="neutral"
              icon={<Download size={16} />}
              onClick={exportCsv}
              disabled={exporting}
            >
              {exporting ? 'Exporting...' : 'Export CSV'}
            </ActionButton>
            <ActionButton tone="neutral" onClick={() => navigate('/admin')}>
              Back to Admin
            </ActionButton>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_repeat(5,minmax(0,180px))] lg:items-center mb-6">
          <SearchBar value={search} onChange={setSearch} placeholder="Rechercher..." />
          <select
            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
            value={currentBacSection}
            onChange={(e) => setCurrentBacSection(e.target.value as BacSection)}
            aria-label="Filter by bac section"
          >
            {BAC_SECTION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as UserStatus | '')}
            aria-label="Filter by user status"
          >
            <option value="">Tous statuts</option>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">ACCEPTED</option>
            <option value="REJECTED">REFUSED</option>
            <option value="SUSPENDED">SUSPENDED</option>
          </select>
          <select
            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as UserRole | '')}
            aria-label="Filter by user role"
          >
            <option value="">Tous rôles</option>
            <option value="STUDENT">STUDENT</option>
            <option value="ADMIN">ADMIN</option>
          </select>
          <select
            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'name')}
            aria-label="Sort users by"
          >
            <option value="date">Tri: date</option>
            <option value="name">Tri: nom</option>
          </select>
          <select
            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
            aria-label="Sort direction"
          >
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
        </div>

        {selectedUsers.length > 0 && (
          <div className="mb-6 p-4 bg-gray-50 rounded-xl dark:bg-white/5 flex gap-4 flex-wrap items-center">
            <span className="py-2 text-sm text-gray-700 dark:text-gray-300">{selectedUsers.length} sélectionnés</span>
            <PrimaryButton
              onClick={handleBulkApprove}
            >
              Approver
            </PrimaryButton>
            <ActionButton
              tone="neutral"
              onClick={handleBulkSuspend}
            >
              Suspendre
            </ActionButton>
            <DangerButton
              onClick={() => openDelete(selectedUsers, `${selectedUsers.length} utilisateurs`)}
            >
              Supprimer
            </DangerButton>
          </div>
        )}

        <DataTable
          columns={columns}
          data={users}
          loading={loading}
          selectedIds={selectedUsers}
          onSelectionChange={setSelectedUsers}
          emptyState={
            <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
              Aucun utilisateur
            </div>
          }
        />

        {totalPages > 1 && (
          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Total: {total}
              </span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
                aria-label="Users per page"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </AdminCard>

      <AnimatePresence>
        {editor.open && editor.user && editForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setEditor({ open: false, user: null })}
            />
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              className="relative z-10 w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#1A1A1A]"
            >
              <div className="border-b border-black/5 px-6 py-5 dark:border-white/5">
                <SectionTitle
                  title="Éditer utilisateur"
                  subtitle={`${editor.user.firstName} ${editor.user.lastName}`}
                />
              </div>
              <form onSubmit={saveEdit} className="space-y-5 p-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    value={editForm.firstName}
                    onChange={(e) =>
                      setEditForm((p) => (p ? { ...p, firstName: e.target.value } : p))
                    }
                    className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                    placeholder="Prénom"
                    aria-label="First name"
                    required
                  />
                  <input
                    value={editForm.lastName}
                    onChange={(e) =>
                      setEditForm((p) => (p ? { ...p, lastName: e.target.value } : p))
                    }
                    className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                    placeholder="Nom"
                    aria-label="Last name"
                    required
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <select
                    value={editForm.bacSection}
                    onChange={(e) =>
                      setEditForm((p) =>
                        p ? { ...p, bacSection: e.target.value as BacSection } : p
                      )
                    }
                    className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                    aria-label="User bac section"
                  >
                    {BAC_SECTION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={statusAction}
                    onChange={(e) => setStatusAction(e.target.value as FriendlyStatus | '')}
                    className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                    aria-label="Change user status"
                  >
                    <option value="">Change status (optional)</option>
                    <option value="ACCEPTED">ACCEPTED</option>
                    <option value="REFUSED">REFUSED</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                  <div className="flex items-center gap-2 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:bg-white/5 dark:text-gray-300">
                    <ShieldOff size={16} className="opacity-70" />
                    <span>Current: {editor.user.status}</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-black/5 bg-gray-50/70 p-4 dark:border-white/10 dark:bg-white/5">
                  <div className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                    Reset password (optional)
                  </div>
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                    <input
                      value={passwordForm.password}
                      onChange={(e) =>
                        setPasswordForm((p) => ({ ...p, password: e.target.value }))
                      }
                      className="w-full rounded-2xl bg-white px-4 py-3 dark:bg-black/20"
                      placeholder="New password"
                      type={passwordForm.show ? 'text' : 'password'}
                      aria-label="New password"
                    />
                    <input
                      value={passwordForm.confirm}
                      onChange={(e) =>
                        setPasswordForm((p) => ({ ...p, confirm: e.target.value }))
                      }
                      className="w-full rounded-2xl bg-white px-4 py-3 dark:bg-black/20"
                      placeholder="Confirm password"
                      type={passwordForm.show ? 'text' : 'password'}
                      aria-label="Confirm password"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setPasswordForm((p) => ({ ...p, show: !p.show }))
                      }
                      className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-3 text-gray-700 ring-1 ring-black/5 transition hover:bg-gray-50 dark:bg-black/20 dark:text-gray-200 dark:ring-white/10"
                      aria-label={passwordForm.show ? 'Hide password' : 'Show password'}
                    >
                      {passwordForm.show ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Password is never shown or exported. Minimum 6 characters.
                  </div>
                </div>
                <input
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm((p) => (p ? { ...p, phone: sanitizeTunisianPhoneInput(e.target.value) } : p))
                  }
                  className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                  placeholder="20123456"
                  type="tel"
                  inputMode="numeric"
                  maxLength={8}
                  aria-label="Phone number"
                />
                <div className="grid gap-4 md:grid-cols-1">
                  <select
                    value={editForm.role}
                    onChange={(e) =>
                      setEditForm((p) =>
                        p ? { ...p, role: e.target.value as UserRole } : p
                      )
                    }
                    className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                    aria-label="User role"
                  >
                    <option value="STUDENT">STUDENT</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditor({ open: false, user: null })}
                    className="flex-1 rounded-2xl px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
                  >
                    Annuler
                  </button>
                  <PrimaryButton type="submit" fullWidth disabled={editorSaving}>
                    {editorSaving ? 'Enregistrement…' : 'Enregistrer'}
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

export default UsersPage;
