import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  XCircle,
  Power,
  PowerOff,
  ArrowLeft,
  Clock,
  Trash2,
} from 'lucide-react';
import { liveStudyAPI } from '../../services/api';
import { attachListUpdateListeners } from '../../lib/socketClient';
import { AdminCard } from '../../components/admin/AdminCard';
import { SectionTitle } from '../../components/admin/SectionTitle';
import { SearchBar } from '../../components/admin/SearchBar';
import { DataTable, Column } from '../../components/admin/DataTable';
import { PrimaryButton } from '../../components/admin/PrimaryButton';
import { DangerButton } from '../../components/admin/DangerButton';
import { ActionButton } from '../../components/admin/ActionButton';
import { SuccessToast } from '../../components/admin/SuccessToast';
import {
  BAC_SECTION_LABELS,
  BAC_SECTION_OPTIONS,
  type BacSection,
} from '../../constants/bacSections';

type ToastType = 'success' | 'error' | 'warning';
type SessionStatus = 'ACTIVE' | 'CLOSED';

interface LiveStudySession {
  id: string;
  bacSection?: BacSection | null;
  creator?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    name?: string | null;
  } | null;
  subject?: string | null;
  subjectName?: string | null;
  topic?: string | null;
  title?: string | null;
  status?: SessionStatus | string | null;
  durationMinutes?: number | null;
  participantsCount?: number | null;
  participantCount?: number | null;
  startedAt?: string | null;
  createdAt?: string | null;
}

const formatDuration = (minutes?: number | null) => {
  if (!minutes) return '-';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  return new Date(value).toLocaleString();
};

const StatusBadge = ({ status }: { status: SessionStatus | string | null | undefined }) => {
  const isActive = status === 'ACTIVE' || status === 'LIVE' || status === 'OPEN';
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        isActive
          ? 'bg-emerald-500/10 text-emerald-600'
          : 'bg-slate-500/10 text-slate-500'
      }`}
    >
      {isActive ? 'ACTIVE' : 'CLOSED'}
    </span>
  );
};

const AdminLiveStudyPage: React.FC = () => {
  const navigate = useNavigate();

  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [globalLoading, setGlobalLoading] = useState(false);

  const [sessions, setSessions] = useState<LiveStudySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [selectedSections, setSelectedSections] = useState<BacSection[]>([]);
  const [subjectFilter, setSubjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | SessionStatus>('ALL');
  const [creatorSearch, setCreatorSearch] = useState('');

  const [toast, setToast] = useState<{
    open: boolean;
    type: ToastType;
    message: string;
  }>({
    open: false,
    type: 'success',
    message: '',
  });

  const showToast = (type: ToastType, message: string) => {
    setToast({ open: true, type, message });
  };

  useEffect(() => {
    if (!toast.open) return undefined;
    const timer = window.setTimeout(() => {
      setToast((prev) => ({ ...prev, open: false }));
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [toast.open, toast.message]);

  const getErrorMessage = (error: unknown) => {
    if (typeof error === 'object' && error && 'response' in error) {
      const anyError = error as any;
      return (
        anyError?.response?.data?.message ||
        anyError?.message ||
        'An error occurred'
      );
    }
    return 'An error occurred';
  };

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (selectedSections.length === 1) {
        params.bacSection = selectedSections[0];
      }
      if (subjectFilter.trim()) {
        params.subject = subjectFilter.trim();
      }
      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      if (creatorSearch.trim()) {
        params.creatorSearch = creatorSearch.trim();
      }
      const response = await liveStudyAPI.adminListAllSessions(params);
      const data = Array.isArray(response) ? response : (response as any)?.data || [];
      setSessions(data as LiveStudySession[]);
    } catch (error) {
      showToast('error', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const fetchGlobalState = async () => {
    try {
      const response = await liveStudyAPI.adminListAllSessions({});
      const data = Array.isArray(response) ? response : (response as any)?.data || [];
      setSessions(data as LiveStudySession[]);
    } catch (error) {
      setSessions([]);
    }
  };

  useEffect(() => {
    fetchGlobalState();
    let unsub: (() => void) | undefined
    try {
      unsub = attachListUpdateListeners((ev) => {
        if (ev?.type === 'removed') {
          setSessions((prev) => prev.filter((s) => s.id !== ev.sessionId))
          return
        }
        void fetchSessions()
      })
    } catch {}
    return () => { if (unsub) try { unsub() } catch {} }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [selectedSections, subjectFilter, statusFilter, creatorSearch]);

  const toggleSection = (section: BacSection) => {
    setSelectedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  const handleToggleGlobal = async () => {
    setGlobalLoading(true);
    try {
      const next = !globalEnabled;
      await liveStudyAPI.adminToggleGlobal(next);
      setGlobalEnabled(next);
      showToast('success', `Live Study ${next ? 'enabled' : 'disabled'} globally`);
    } catch (error) {
      showToast('error', getErrorMessage(error));
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleCloseSession = async (session: LiveStudySession) => {
    const creator = session.creator;
    const creatorName = creator
      ? `${creator.firstName || ''} ${creator.lastName || ''}`.trim() || creator.name || 'Unknown'
      : 'Unknown';
    const confirmed = window.confirm(
      `Close active Live Study session "${session.title || session.subject || 'Untitled'}" by ${creatorName}?\n\nAll participants will be notified immediately and their active study tracking will be stopped. This action is broadcasted in realtime and cannot be undone.`
    );
    if (!confirmed) return;
    setClosingId(session.id);
    try {
      await liveStudyAPI.adminCloseSession(session.id, { reason: 'Closed by administrator' });
      showToast('success', 'Session closed successfully');
      setSessions((prev) => prev.filter((s) => s.id !== session.id));
    } catch (error) {
      showToast('error', getErrorMessage(error));
    } finally {
      setClosingId(null);
    }
  };

  const handleDeleteSession = async (session: LiveStudySession) => {
    if (session.status === 'ACTIVE' || session.status === 'LIVE' || session.status === 'OPEN') {
      showToast('warning', 'Cannot delete an active session. Close it first.');
      return;
    }
    const confirmed = window.confirm(
      `Permanently delete the closed Live Study session "${session.title || session.subject || 'Untitled'}"?\n\nThis will delete the session record and its associated participant rows and chat history. Aggregated study-time statistics and badges are preserved. This cannot be undone.`
    );
    if (!confirmed) return;
    setDeletingId(session.id);
    try {
      await liveStudyAPI.adminDeleteSession(session.id);
      showToast('success', 'Closed session deleted');
      setSessions((prev) => prev.filter((s) => s.id !== session.id));
    } catch (error) {
      showToast('error', getErrorMessage(error));
    } finally {
      setDeletingId(null);
    }
  };

  const filteredSessions = useMemo(() => {
    let rows = sessions;

    if (selectedSections.length > 0) {
      rows = rows.filter(
        (s) => s.bacSection && selectedSections.includes(s.bacSection)
      );
    }

    if (subjectFilter.trim()) {
      const q = subjectFilter.trim().toLowerCase();
      rows = rows.filter(
        (s) =>
          (s.subject || s.subjectName || '')
            .toLowerCase()
            .includes(q)
      );
    }

    if (statusFilter !== 'ALL') {
      rows = rows.filter((s) => {
        const isActive =
          s.status === 'ACTIVE' || s.status === 'LIVE' || s.status === 'OPEN';
        return statusFilter === 'ACTIVE' ? isActive : !isActive;
      });
    }

    if (creatorSearch.trim()) {
      const q = creatorSearch.trim().toLowerCase();
      rows = rows.filter((s) => {
        const creator = s.creator;
        if (!creator) return false;
        const full = `${creator.firstName || ''} ${creator.lastName || ''} ${
          creator.name || ''
        }`.toLowerCase();
        return full.includes(q);
      });
    }

    return rows;
  }, [sessions, selectedSections, subjectFilter, statusFilter, creatorSearch]);

  const columns: Column<LiveStudySession>[] = [
    {
      header: 'Section',
      key: 'bacSection',
      render: (value) => (
        <span
          className="rounded-full border px-3 py-1 text-xs font-semibold"
          style={{
            color: '#0B5ED7',
            backgroundColor: '#0B5ED714',
            borderColor: '#0B5ED735',
          }}
        >
          {value ? BAC_SECTION_LABELS[value as BacSection] || String(value) : '-'}
        </span>
      ),
    },
    {
      header: 'Creator',
      key: 'creator',
      render: (_value, session) => {
        const c = session.creator;
        const name = c
          ? `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.name || 'Unknown'
          : 'Unknown';
        return (
          <div className="space-y-1">
            <div className="font-semibold text-gray-900 dark:text-white">
              {name}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Subject',
      key: 'subject',
      render: (_value, session) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {session.subject || session.subjectName || '-'}
        </span>
      ),
    },
    {
      header: 'Topic',
      key: 'topic',
      render: (_value, session) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {session.topic || session.title || '-'}
        </span>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: (value) => <StatusBadge status={value as SessionStatus} />,
    },
    {
      header: 'Duration',
      key: 'durationMinutes',
      render: (value) => (
        <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
          <Clock size={14} className="opacity-70" />
          {formatDuration(value as number)}
        </div>
      ),
    },
    {
      header: 'Participants',
      key: 'participantsCount',
      render: (_value, session) => (
        <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
          <Users size={14} className="opacity-70" />
          {session.participantsCount ?? session.participantCount ?? 0}
        </div>
      ),
    },
    {
      header: 'Started at',
      key: 'startedAt',
      render: (_value, session) => (
        <span className="text-sm text-gray-600 dark:text-gray-300">
          {formatDateTime(session.startedAt || session.createdAt)}
        </span>
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (_value, session) => {
        const isActive =
          session.status === 'ACTIVE' ||
          session.status === 'LIVE' ||
          session.status === 'OPEN';
        return (
          <div className="flex items-center gap-2">
            {isActive ? (
              <DangerButton
                onClick={() => handleCloseSession(session)}
                className="px-3 py-1 text-xs"
                icon={<XCircle size={14} />}
                disabled={closingId === session.id}
              >
                {closingId === session.id ? 'Closing...' : 'Close'}
              </DangerButton>
            ) : (
              <ActionButton
                tone="danger"
                onClick={() => handleDeleteSession(session)}
                className="px-3 py-1 text-xs"
                icon={<Trash2 size={14} />}
                disabled={deletingId === session.id}
              >
                {deletingId === session.id ? 'Deleting...' : 'Delete'}
              </ActionButton>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
      <SuccessToast
        isVisible={toast.open}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />

      <AdminCard className="p-6 sm:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <SectionTitle
              title="Live Study Management"
              subtitle="Manage global live study availability and monitor all active sessions across sections"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ActionButton
              tone="neutral"
              icon={<ArrowLeft size={16} />}
              onClick={() => navigate('/admin')}
            >
              Back to Admin
            </ActionButton>
          </div>
        </div>

        <div className="mb-8 rounded-3xl border p-6 sm:p-8"
          style={{
            borderColor: '#0B5ED735',
            background: 'linear-gradient(135deg, #07184010 0%, #0B5ED708 100%)',
          }}
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
                style={{ backgroundColor: '#0B5ED720' }}
              >
                <Users size={28} style={{ color: '#0B5ED7' }} />
              </div>
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: '#071840' }}>
                  Global Live Study
                </div>
                <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                  Live Study is{' '}
                  <span style={{ color: globalEnabled ? '#0B5ED7' : '#64748b' }}>
                    {globalEnabled ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
                <p className="mt-2 max-w-xl text-sm text-gray-600 dark:text-gray-400">
                  {globalEnabled
                    ? 'Students and teachers can create, join, and host live study sessions across all BAC sections.'
                    : 'All new live study sessions are blocked. Existing active sessions may continue until closed.'}
                </p>
              </div>
            </div>
            <div>
              {globalEnabled ? (
                <DangerButton
                  onClick={handleToggleGlobal}
                  className="h-14 px-8 text-base"
                  icon={<PowerOff size={20} />}
                  disabled={globalLoading}
                >
                  {globalLoading ? 'Toggling...' : 'Disable Live Study'}
                </DangerButton>
              ) : (
                <PrimaryButton
                  onClick={handleToggleGlobal}
                  className="h-14 px-8 text-base"
                  icon={<Power size={20} />}
                  disabled={globalLoading}
                >
                  {globalLoading ? 'Toggling...' : 'Enable Live Study'}
                </PrimaryButton>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,220px)_minmax(0,260px)] lg:items-center">
          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-600 dark:text-gray-400">
              BAC Section (multi-select)
            </label>
            <div className="flex flex-wrap gap-2">
              {BAC_SECTION_OPTIONS.map((option) => {
                const active = selectedSections.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleSection(option.value)}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                      active
                        ? 'text-white shadow-sm'
                        : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10'
                    }`}
                    style={
                      active
                        ? { backgroundColor: '#0B5ED7', borderColor: '#0B5ED7' }
                        : undefined
                    }
                  >
                    {option.label.replace('Bac ', '')}
                  </button>
                );
              })}
              {selectedSections.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedSections([])}
                  className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:border-white/10 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-600 dark:text-gray-400">
              Subject
            </label>
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                placeholder="Search by subject name..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm text-gray-900 outline-none transition focus:border-[#0B5ED7] focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:bg-white/10"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-600 dark:text-gray-400">
              Status
            </label>
            <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-white/10 dark:bg-white/5">
              {(['ALL', 'ACTIVE', 'CLOSED'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setStatusFilter(opt)}
                  className={`flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition ${
                    statusFilter === opt
                      ? 'text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                  style={
                    statusFilter === opt
                      ? { backgroundColor: opt === 'ACTIVE' ? '#10b981' : opt === 'CLOSED' ? '#64748b' : '#0B5ED7' }
                      : undefined
                  }
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-600 dark:text-gray-400">
              Search Creator
            </label>
            <SearchBar
              value={creatorSearch}
              onChange={setCreatorSearch}
              placeholder="Creator name..."
            />
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Showing <span className="font-semibold text-gray-700 dark:text-gray-200">{filteredSessions.length}</span>{' '}
            of {sessions.length} total sessions
          </div>
          <ActionButton
            tone="neutral"
            onClick={fetchSessions}
          >
            Refresh
          </ActionButton>
        </div>

        <DataTable
          columns={columns}
          data={filteredSessions}
          loading={loading}
          emptyState={
            <div className="py-16 text-center">
              <div
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{ backgroundColor: '#0B5ED710' }}
              >
                <Users size={28} style={{ color: '#0B5ED7' }} />
              </div>
              <div className="text-base font-semibold text-gray-900 dark:text-white">
                No live study sessions found
              </div>
              <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Try adjusting the filters above or create a new session from the student dashboard.
              </div>
            </div>
          }
        />
      </AdminCard>
    </div>
  );
};

export default AdminLiveStudyPage;
