'use client';

import { Suspense, lazy } from 'react';

const AnalyticsPage = lazy(() => import('@/views/admin/Analytics'));

export default function Analytics() {
  return (
    <Suspense fallback={null}>
      <AnalyticsPage />
    </Suspense>
  );
}

