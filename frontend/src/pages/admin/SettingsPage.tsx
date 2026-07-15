import { useEffect, useMemo, useState } from 'react';
import { adminAPI } from '../../services/api';
import { AdminCard } from '../../components/admin/AdminCard';
import { SectionTitle } from '../../components/admin/SectionTitle';
import { SuccessToast } from '../../components/admin/SuccessToast';
import { PrimaryButton } from '../../components/admin/PrimaryButton';
import { ActionButton } from '../../components/admin/ActionButton';
import { ImageUploader } from '../../components/admin/ImageUploader';
import { useNavigate } from 'react-router-dom';

type ToastType = 'success' | 'error' | 'warning';

type SettingKey =
  | 'platformName'
  | 'platformLogo'
  | 'platformFavicon'
  | 'primaryColor'
  | 'secondaryColor'
  | 'footerText'
  | 'socialFacebook'
  | 'socialInstagram'
  | 'socialYoutube'
  | 'socialTiktok'
  | 'contactPhone'
  | 'contactEmail'
  | 'contactAddress'
  | 'copyrightText'
  | 'homepageHeroTitle'
  | 'homepageHeroText'
  | 'bacCountdownDate'
  | 'maintenanceMode';

interface AppSetting {
  key: SettingKey;
  value: string;
  updatedBy?: string | null;
  updatedAt: string;
}

const BACKEND_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(
  /\/api$/,
  ''
);

const toAssetUrl = (value?: string | null) => {
  if (!value) return '';
  if (value.startsWith('http')) return value;
  return `${BACKEND_URL}/${value.replace(/^\/+/, '')}`;
};

const getErrorMessage = (error: unknown) => {
  if (typeof error === 'object' && error && 'response' in error) {
    const anyError = error as any;
    return (
      anyError?.response?.data?.message || anyError?.message || 'Une erreur est survenue'
    );
  }
  return 'Une erreur est survenue';
};

const SettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ open: boolean; type: ToastType; message: string }>({
    open: false,
    type: 'success',
    message: '',
  });

  const navigate = useNavigate();

  const showToast = (type: ToastType, message: string) => {
    setToast({ open: true, type, message });
  };

  useEffect(() => {
    if (!toast.open) return undefined;
    const timer = window.setTimeout(() => {
      setToast((p) => ({ ...p, open: false }));
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [toast.open, toast.message]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getSettings();
      const items = (response.data || []) as AppSetting[];
      const map: Record<string, string> = {};
      for (const item of items) {
        map[item.key] = item.value ?? '';
      }
      setValues(map);
    } catch (error) {
      showToast('error', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const setValue = (key: SettingKey, value: string) => {
    setValues((p) => ({ ...p, [key]: value }));
  };

  const saveAll = async () => {
    try {
      setSaving(true);
      const keys = Object.keys(values) as SettingKey[];
      const items = keys.map((key) => ({ key, value: values[key] ?? '' }));
      await adminAPI.updateSettings(items);
      showToast('success', 'Paramètres enregistrés');
      fetchSettings();
    } catch (error) {
      showToast('error', getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const maintenanceEnabled = useMemo(() => values.maintenanceMode === 'true', [values.maintenanceMode]);

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
      <SuccessToast
        isVisible={toast.open}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast((p) => ({ ...p, open: false }))}
      />

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <SectionTitle
          title="Settings"
          subtitle="Branding, maintenance, and platform configuration"
        />
        <div className="flex flex-wrap gap-3">
          <ActionButton tone="neutral" onClick={() => navigate('/admin')}>
            Back to Admin
          </ActionButton>
          <PrimaryButton onClick={saveAll} disabled={saving || loading}>
            {saving ? 'Saving...' : 'Save'}
          </PrimaryButton>
        </div>
      </div>

      {loading ? (
        <AdminCard className="p-10">
          <div className="flex items-center justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#0B5ED7]" />
          </div>
        </AdminCard>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <AdminCard className="p-6 sm:p-8">
              <SectionTitle title="Branding" subtitle="Official TuniBac identity, logo, favicon, and color palette" />

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Platform Name</span>
                  <input
                    value={values.platformName || ''}
                    onChange={(e) => setValue('platformName', e.target.value)}
                    className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                  />
                </label>
                <div className="grid gap-5 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Primary Color</span>
                    <input
                      type="color"
                      value={values.primaryColor || '#0B5ED7'}
                      onChange={(e) => setValue('primaryColor', e.target.value)}
                      className="h-14 w-full rounded-2xl bg-gray-50 px-3 py-2 dark:bg-white/5"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Secondary Color</span>
                    <input
                      type="color"
                      value={values.secondaryColor || '#E70013'}
                      onChange={(e) => setValue('secondaryColor', e.target.value)}
                      className="h-14 w-full rounded-2xl bg-gray-50 px-3 py-2 dark:bg-white/5"
                    />
                  </label>
                </div>
              </div>

              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Logo</span>
                  <ImageUploader
                    value={toAssetUrl(values.platformLogo)}
                    onChange={(url) => setValue('platformLogo', url.replace(BACKEND_URL, ''))}
                    onUpload={async (file) => {
                      const response = await adminAPI.uploadSettingAsset('logo', file);
                      return toAssetUrl(String(response.data.fileUrl || ''));
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Favicon</span>
                  <ImageUploader
                    value={toAssetUrl(values.platformFavicon)}
                    onChange={(url) => setValue('platformFavicon', url.replace(BACKEND_URL, ''))}
                    onUpload={async (file) => {
                      const response = await adminAPI.uploadSettingAsset('favicon', file);
                      return toAssetUrl(String(response.data.fileUrl || ''));
                    }}
                    placeholder="Click or drag favicon image here"
                  />
                </div>
              </div>
            </AdminCard>

            <AdminCard className="p-6 sm:p-8">
              <SectionTitle title="Homepage" subtitle="Hero et texte d’accueil" />
              <div className="mt-6 grid gap-5">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Hero Title</span>
                  <input
                    value={values.homepageHeroTitle || ''}
                    onChange={(e) => setValue('homepageHeroTitle', e.target.value)}
                    className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Hero Text</span>
                  <textarea
                    rows={4}
                    value={values.homepageHeroText || ''}
                    onChange={(e) => setValue('homepageHeroText', e.target.value)}
                    className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                  />
                </label>
              </div>
            </AdminCard>

            <AdminCard className="p-6 sm:p-8">
              <SectionTitle title="Footer" subtitle="Texte et copyright" />
              <div className="mt-6 grid gap-5">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Footer Text</span>
                  <textarea
                    rows={3}
                    value={values.footerText || ''}
                    onChange={(e) => setValue('footerText', e.target.value)}
                    className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Copyright</span>
                  <input
                    value={values.copyrightText || ''}
                    onChange={(e) => setValue('copyrightText', e.target.value)}
                    className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                  />
                </label>
              </div>
            </AdminCard>
          </div>

          <div className="space-y-6">
            <AdminCard className="p-6 sm:p-8">
              <SectionTitle title="Plateforme" subtitle="Maintenance et Bac countdown" />
              <div className="mt-6 grid gap-5">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Bac Countdown Date</span>
                  <input
                    type="date"
                    value={(values.bacCountdownDate || '').slice(0, 10)}
                    onChange={(e) => setValue('bacCountdownDate', e.target.value)}
                    className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                  />
                </label>
                <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 dark:bg-white/5 dark:text-gray-300">
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">Maintenance Mode</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {maintenanceEnabled ? 'Activé' : 'Désactivé'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setValue('maintenanceMode', maintenanceEnabled ? 'false' : 'true')}
                    className={`h-7 w-12 rounded-full transition-colors ${
                      maintenanceEnabled ? 'bg-red-500' : 'bg-gray-300 dark:bg-white/10'
                    }`}
                  >
                    <div
                      className={`h-6 w-6 rounded-full bg-white shadow transition-transform ${
                        maintenanceEnabled ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </AdminCard>

            <AdminCard className="p-6 sm:p-8">
              <SectionTitle title="Contact" subtitle="Téléphone, email, adresse" />
              <div className="mt-6 grid gap-5">
                <input
                  value={values.contactPhone || ''}
                  onChange={(e) => setValue('contactPhone', e.target.value)}
                  className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                  placeholder="Phone"
                />
                <input
                  type="email"
                  value={values.contactEmail || ''}
                  onChange={(e) => setValue('contactEmail', e.target.value)}
                  className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                  placeholder="Email"
                />
                <textarea
                  rows={3}
                  value={values.contactAddress || ''}
                  onChange={(e) => setValue('contactAddress', e.target.value)}
                  className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                  placeholder="Address"
                />
              </div>
            </AdminCard>

            <AdminCard className="p-6 sm:p-8">
              <SectionTitle title="Social" subtitle="Liens réseaux sociaux" />
              <div className="mt-6 grid gap-4">
                <input
                  value={values.socialFacebook || ''}
                  onChange={(e) => setValue('socialFacebook', e.target.value)}
                  className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                  placeholder="Facebook URL"
                />
                <input
                  value={values.socialInstagram || ''}
                  onChange={(e) => setValue('socialInstagram', e.target.value)}
                  className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                  placeholder="Instagram URL"
                />
                <input
                  value={values.socialYoutube || ''}
                  onChange={(e) => setValue('socialYoutube', e.target.value)}
                  className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                  placeholder="YouTube URL"
                />
                <input
                  value={values.socialTiktok || ''}
                  onChange={(e) => setValue('socialTiktok', e.target.value)}
                  className="w-full rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
                  placeholder="TikTok URL"
                />
              </div>
            </AdminCard>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;


