'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  SiteSettings,
  DEFAULT_SETTINGS,
  getSiteSettings,
  applyThemeToDocument,
} from '@/lib/siteSettings';

interface SiteSettingsContextValue {
  settings: SiteSettings;
  loading: boolean;
  reload: () => Promise<void>;
}

const SiteSettingsContext = createContext<SiteSettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  loading: true,
  reload: async () => {},
});

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const s = await getSiteSettings();
      setSettings(s);
      applyThemeToDocument(s);
    } catch (e) {
      console.warn('SiteSettingsProvider: failed to load settings', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <SiteSettingsContext.Provider value={{ settings, loading, reload: load }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
