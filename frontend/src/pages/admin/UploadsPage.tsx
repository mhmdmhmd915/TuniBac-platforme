import { useEffect, useMemo, useState } from 'react';
import { Download, ExternalLink, RefreshCcw, Trash2, Upload } from 'lucide-react';
import { adminAPI } from '../../services/api';
import { AdminCard } from '../../components/admin/AdminCard';
import { SectionTitle } from '../../components/admin/SectionTitle';
import { SearchBar } from '../../components/admin/SearchBar';
import { Filters } from '../../components/admin/Filters';
import { DataTable, Column } from '../../components/admin/DataTable';
import { ActionButton } from '../../components/admin/ActionButton';
import { SuccessToast } from '../../components/admin/SuccessToast';
import { EmptyState } from '../../components/admin/EmptyState';
import { toAssetUrl } from '../../lib/assets';

type ToastType = 'success' | 'error' | 'warning';

type UploadKind = 'all' | 'pdf' | 'video' | 'image' | 'file';

type UploadItem = {
  id: string;
  path: string;
  url: string;
  kind: 'pdf' | 'video' | 'image' | 'file';
  size: number;
  modifiedAt: string;
};

type ReplaceState = {
  open: boolean;
  target?: UploadItem;
  file?: File | null;
  loading: boolean;
};

type DeleteState = {
  open: boolean;
  target?: UploadItem;
  loading: boolean;
  force: boolean;
  error?: string;
  references?: any;
};

type ToastState = {
  open: boolean;
  type: ToastType;
  message: string;
};

const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes)) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

export default function UploadsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<UploadKind>('all');
  const [toast, setToast] = useState<ToastState>({
    open: false,
    type: 'success',
    message: '',
  });
  const [replaceState, setReplaceState] = useState<ReplaceState>({
    open: false,
    loading: false,
    file: null,
  });
  const [deleteState, setDeleteState] = useState<DeleteState>({
    open: false,
    loading: false,
    force: false,
  });

  const showToast = (type: ToastType, message: string) => {
    setToast({ open: true, type, message });
  };

  useEffect(() => {
    if (!toast.open) return undefined;
    const timer = window.setTimeout(() => {
      setToast((previous) => ({ ...previous, open: false }));
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [toast.open, toast.message]);

  const fetchUploads = async (
    filters: { search?: string; kind?: UploadKind } = { search, kind },
    shouldApply: () => boolean = () => true
  ) => {
    let shouldUpdateLoading = true;
    try {
      setLoading(true);
      const response = await adminAPI.listUploads({
        q: filters.search || undefined,
        kind: filters.kind && filters.kind !== 'all' ? filters.kind : undefined,
        limit: 2000,
      });
      const nextItems = ((response.data?.items || []) as Omit<UploadItem, 'id'>[]).map(
        (item) => ({ ...item, id: item.path })
      );
      if (!shouldApply()) {
        shouldUpdateLoading = false;
        return;
      }
      setItems(nextItems);
    } catch (error) {
      if (!shouldApply()) {
        return;
      }
      showToast('error', 'Failed to load uploads');
    } finally {
      if (shouldUpdateLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    let isCurrent = true;
    const t = window.setTimeout(() => {
      void fetchUploads({ search, kind }, () => isCurrent);
    }, 250);
    return () => {
      isCurrent = false;
      window.clearTimeout(t);
    };
  }, [search, kind]);

  const columns: Column<UploadItem>[] = useMemo(
    () => [
      {
        header: 'File',
        key: 'path',
        render: (_value, item) => (
          <div className="space-y-1">
            <div className="font-semibold text-gray-900 dark:text-white">{item.path}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{item.kind.toUpperCase()}</div>
          </div>
        ),
      },
      {
        header: 'Size',
        key: 'size',
        render: (value) => <span>{formatBytes(Number(value))}</span>,
      },
      {
        header: 'Modified',
        key: 'modifiedAt',
        render: (value) => <span>{new Date(String(value)).toLocaleString()}</span>,
      },
      {
        header: 'Actions',
        key: 'actions',
        render: (_value, item) => (
          <div className="flex flex-wrap items-center gap-2">
            <ActionButton
              tone="neutral"
              icon={<ExternalLink size={16} />}
              onClick={() => window.open(toAssetUrl(item.url), '_blank', 'noopener,noreferrer')}
            >
              Preview
            </ActionButton>
            <ActionButton
              tone="neutral"
              icon={<Download size={16} />}
              onClick={() => {
                const a = document.createElement('a');
                a.href = toAssetUrl(item.url);
                a.download = item.path.split('/').pop() || 'download';
                a.rel = 'noopener noreferrer';
                document.body.appendChild(a);
                a.click();
                a.remove();
              }}
            >
              Download
            </ActionButton>
            <ActionButton
              tone="primary"
              icon={<Upload size={16} />}
              onClick={() =>
                setReplaceState({ open: true, target: item, loading: false, file: null })
              }
            >
              Replace
            </ActionButton>
            <ActionButton
              tone="danger"
              icon={<Trash2 size={16} />}
              onClick={() =>
                setDeleteState({ open: true, target: item, loading: false, force: false })
              }
            >
              Delete
            </ActionButton>
          </div>
        ),
      },
    ],
    []
  );

  const filtersConfig = useMemo(
    () => [
      {
        key: 'kind',
        label: 'Type',
        value: kind,
        options: [
          { label: 'All', value: 'all' },
          { label: 'PDF', value: 'pdf' },
          { label: 'Video', value: 'video' },
          { label: 'Image', value: 'image' },
          { label: 'Other', value: 'file' },
        ],
      },
    ],
    [kind]
  );

  const closeReplace = () =>
    setReplaceState({ open: false, loading: false, file: null, target: undefined });

  const confirmReplace = async () => {
    if (!replaceState.target || !replaceState.file) return;
    try {
      setReplaceState((previous) => ({ ...previous, loading: true }));
      await adminAPI.replaceUpload(replaceState.target.path, replaceState.file);
      closeReplace();
      showToast('success', 'File replaced successfully');
      await fetchUploads();
    } catch (error) {
      setReplaceState((previous) => ({ ...previous, loading: false }));
      showToast('error', 'Replace failed');
    }
  };

  const closeDelete = () =>
    setDeleteState({ open: false, loading: false, force: false, target: undefined });

  const confirmDelete = async () => {
    if (!deleteState.target) return;
    try {
      setDeleteState((previous) => ({
        ...previous,
        loading: true,
        error: undefined,
        references: undefined,
      }));
      await adminAPI.deleteUpload({ path: deleteState.target.path, force: deleteState.force });
      closeDelete();
      showToast('success', 'File deleted successfully');
      await fetchUploads();
    } catch (error: any) {
      const isInUse = error?.response?.status === 409;
      const message = isInUse
        ? 'File is in use. You can enable force delete to detach safe references.'
        : 'Delete failed';

      setDeleteState((previous) => ({
        ...previous,
        loading: false,
        error: message,
        references: isInUse ? error?.response?.data?.references : undefined,
      }));
      showToast('error', message);
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

      {deleteState.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={deleteState.loading ? undefined : closeDelete}
          />
          <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-[32px] bg-white shadow-2xl dark:bg-[#1A1A1A]">
            <div className="border-b border-black/5 px-6 py-5 dark:border-white/5 sm:px-8">
              <SectionTitle
                title="Delete file"
                subtitle={deleteState.target?.path || ''}
              />
            </div>
            <div className="space-y-4 p-6 sm:p-8">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {deleteState.error
                  ? deleteState.error
                  : deleteState.force
                  ? 'This will delete the file and detach safe references.'
                  : 'This will delete the file only if it is not used by any content.'}
              </p>

              <label className="flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 dark:bg-white/5 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={deleteState.force}
                  onChange={(event) =>
                    setDeleteState((previous) => ({
                      ...previous,
                      force: event.target.checked,
                    }))
                  }
                />
                Force delete (detach safe references)
              </label>

              {deleteState.references && (
                <div className="rounded-2xl border border-black/5 bg-gray-50/80 p-4 text-sm text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
                  <div className="mb-2 font-semibold text-gray-900 dark:text-white">
                    References found
                  </div>
                  <pre className="max-h-56 overflow-auto text-xs leading-relaxed">
                    {JSON.stringify(deleteState.references, null, 2)}
                  </pre>
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-3">
                <ActionButton tone="neutral" onClick={closeDelete} disabled={deleteState.loading}>
                  Cancel
                </ActionButton>
                <ActionButton
                  tone="danger"
                  onClick={confirmDelete}
                  disabled={deleteState.loading}
                >
                  {deleteState.loading ? 'Deleting...' : 'Delete'}
                </ActionButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {replaceState.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={replaceState.loading ? undefined : closeReplace}
          />
          <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-[32px] bg-white shadow-2xl dark:bg-[#1A1A1A]">
            <div className="border-b border-black/5 px-6 py-5 dark:border-white/5 sm:px-8">
              <SectionTitle
                title="Replace file"
                subtitle={replaceState.target?.path || ''}
              />
            </div>
            <div className="space-y-4 p-6 sm:p-8">
              <input
                type="file"
                aria-label="Replacement file"
                className="block w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                onChange={(event) =>
                  setReplaceState((previous) => ({
                    ...previous,
                    file: event.target.files?.[0] || null,
                  }))
                }
              />
              <div className="flex flex-wrap justify-end gap-3">
                <ActionButton tone="neutral" onClick={closeReplace}>
                  Cancel
                </ActionButton>
                <ActionButton
                  tone="primary"
                  onClick={confirmReplace}
                  disabled={replaceState.loading || !replaceState.file}
                >
                  {replaceState.loading ? 'Replacing...' : 'Replace'}
                </ActionButton>
              </div>
            </div>
          </div>
        </div>
      )}

      <AdminCard className="overflow-hidden">
        <div className="border-b border-black/5 px-6 py-5 dark:border-white/5 sm:px-8">
          <SectionTitle
            title="Uploads"
            subtitle="Preview, download, replace, or delete uploaded files"
            action={
              <ActionButton
                tone="neutral"
                icon={<RefreshCcw size={16} />}
                onClick={() => void fetchUploads()}
              >
                Refresh
              </ActionButton>
            }
          />
        </div>
        <div className="space-y-5 p-6 sm:p-8">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
            <SearchBar value={search} onChange={setSearch} placeholder="Search uploads..." />
          </div>

          <Filters
            filters={filtersConfig}
            onChange={(key, value) => {
              if (key === 'kind') setKind(value as UploadKind);
            }}
          />

          <DataTable
            columns={columns}
            data={items}
            loading={loading}
            emptyState={
              <EmptyState
                title="No uploads found"
                description="Upload files via the admin forms (course PDF, exercise PDF, videos, parascolaire files)."
              />
            }
          />
        </div>
      </AdminCard>
    </div>
  );
}

