import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api/http';

type PlatformSetting = { key: string; value: string };

type PlatformSettingsContextType = {
  settings: Record<string, string>;
  isLoading: boolean;
  refresh: () => Promise<void>;
};

const PlatformSettingsContext = createContext<PlatformSettingsContextType | undefined>(
  undefined
);

export const PlatformSettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [settings, setSettings] = useState<Record<string, string>>({
    platformName: 'TuniBac',
  });
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    const response = await api.get('/settings');
    const items = (response.data || []) as PlatformSetting[];
    const next: Record<string, string> = { platformName: 'TuniBac' };
    for (const item of items) {
      if (item && typeof item.key === 'string') {
        next[item.key] = String(item.value ?? '');
      }
    }
    setSettings(next);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await refresh();
      } catch {
        void 0;
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const name = settings.platformName || 'TuniBac';
    document.title = name;
  }, [settings.platformName]);

  const value = useMemo(
    () => ({ settings, isLoading, refresh }),
    [settings, isLoading]
  );

  return (
    <PlatformSettingsContext.Provider value={value}>
      {children}
    </PlatformSettingsContext.Provider>
  );
};

export const usePlatformSettings = () => {
  const context = useContext(PlatformSettingsContext);
  if (!context) {
    throw new Error('usePlatformSettings must be used within a PlatformSettingsProvider');
  }
  return context;
};

