import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api/http';
import { toAssetUrl } from '../lib/assets';
import { BRAND_SETTING_DEFAULTS, getBrandTitle, OFFICIAL_BRAND } from '../lib/brand';

type PlatformSetting = { key: string; value: string };

type PlatformSettingsContextType = {
  settings: Record<string, string>;
  isLoading: boolean;
  refresh: () => Promise<void>;
};

const PlatformSettingsContext = createContext<PlatformSettingsContextType | undefined>(
  undefined
);

const DEFAULT_PLATFORM_SETTINGS: Record<string, string> = {
  ...BRAND_SETTING_DEFAULTS,
};

const KEEP_DEFAULT_WHEN_EMPTY = new Set(Object.keys(DEFAULT_PLATFORM_SETTINGS));

const upsertLink = (rel: string, href: string, type?: string) => {
  let link = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!link) {
    link = document.createElement('link');
    link.rel = rel;
    document.head.appendChild(link);
  }
  link.href = href;
  if (type) {
    link.type = type;
  }
};

const upsertMeta = (selector: string, attribute: 'name' | 'property', value: string) => {
  let meta = document.head.querySelector<HTMLMetaElement>(selector);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attribute, selector.match(/"([^"]+)"/)?.[1] || '');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', value);
};

export const PlatformSettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [settings, setSettings] = useState<Record<string, string>>({
    ...DEFAULT_PLATFORM_SETTINGS,
  });
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    const response = await api.get('/settings');
    const items = (response.data || []) as PlatformSetting[];
    const next: Record<string, string> = { ...DEFAULT_PLATFORM_SETTINGS };
    for (const item of items) {
      if (item && typeof item.key === 'string') {
        const key = item.key;
        const value = String(item.value ?? '');
        if (!value.trim() && KEEP_DEFAULT_WHEN_EMPTY.has(key)) {
          continue;
        }
        next[key] = value;
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
    const platformName = settings.platformName || OFFICIAL_BRAND.name;
    const title = getBrandTitle(platformName);
    const officialFaviconHref = toAssetUrl(OFFICIAL_BRAND.assets.favicon32);
    const socialImage = `${OFFICIAL_BRAND.siteUrl}${OFFICIAL_BRAND.assets.socialPreview}`;
    const ogImage = `${OFFICIAL_BRAND.siteUrl}${OFFICIAL_BRAND.assets.ogImage}`;

    document.title = title;

    upsertLink('icon', officialFaviconHref, 'image/png');
    upsertLink('shortcut icon', toAssetUrl(OFFICIAL_BRAND.assets.faviconIco), 'image/x-icon');
    upsertLink('apple-touch-icon', toAssetUrl(OFFICIAL_BRAND.assets.appleTouchIcon), 'image/png');

    upsertMeta('meta[name="theme-color"]', 'name', OFFICIAL_BRAND.colors.primaryBlue);
    upsertMeta('meta[name="description"]', 'name', OFFICIAL_BRAND.description);
    upsertMeta('meta[property="og:title"]', 'property', title);
    upsertMeta('meta[property="og:description"]', 'property', OFFICIAL_BRAND.description);
    upsertMeta('meta[property="og:image"]', 'property', ogImage);
    upsertMeta('meta[property="og:url"]', 'property', OFFICIAL_BRAND.siteUrl);
    upsertMeta('meta[property="og:type"]', 'property', 'website');
    upsertMeta('meta[name="twitter:card"]', 'name', 'summary_large_image');
    upsertMeta('meta[name="twitter:title"]', 'name', title);
    upsertMeta('meta[name="twitter:description"]', 'name', OFFICIAL_BRAND.description);
    upsertMeta('meta[name="twitter:image"]', 'name', socialImage);
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

