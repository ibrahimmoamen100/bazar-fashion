'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { SiteSettingsProvider } from '@/contexts/SiteSettingsContext';
import { useState, useEffect, Suspense } from 'react';
import { migrateLocalStorageKeys } from '@/utils/migrateLocalStorage';
import { HelmetProvider } from 'react-helmet-async';
// تهيئة i18next — يجب أن يكون أول import حتى تعمل الترجمة في جميع المكونات
import i18n from '@/i18n/config';
import { I18nextProvider } from 'react-i18next';

export function Providers({ children }: { children: React.ReactNode }) {
  // useState ensures a new QueryClient per request on SSR, shared on CSR
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnMount: false,
            refetchOnReconnect: false,
          },
        },
      })
  );

  // Run localStorage key migration once on mount (client-side only)
  useEffect(() => {
    migrateLocalStorageKeys();
  }, []);

  return (
    // Suspense boundary is REQUIRED for any child using useSearchParams() from next/navigation.
    // Without this, Next.js throws during SSR/static generation on devices without a JS cache.
    <Suspense fallback={null}>
      <I18nextProvider i18n={i18n}>
        <HelmetProvider>
          <QueryClientProvider client={queryClient}>
            <SiteSettingsProvider>
              <AuthProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  {children}
                </TooltipProvider>
              </AuthProvider>
            </SiteSettingsProvider>
          </QueryClientProvider>
        </HelmetProvider>
      </I18nextProvider>
    </Suspense>
  );
}
