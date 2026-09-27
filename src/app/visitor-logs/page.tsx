'use client';

import { Suspense, lazy } from 'react';

const VisitorLogsPage = lazy(() => import('@/views/admin/VisitorLogs'));

export default function VisitorLogs() {
  return (
    <Suspense fallback={null}>
      <VisitorLogsPage />
    </Suspense>
  );
}

