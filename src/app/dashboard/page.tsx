'use client';

import { Suspense, lazy } from 'react';

const DashboardPage = lazy(() => import('@/views/Dashboard'));

export default function Dashboard() {
  return (
    <Suspense fallback={null}>
      <DashboardPage />
    </Suspense>
  );
}

