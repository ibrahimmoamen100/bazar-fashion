'use client';

import { Suspense, lazy } from 'react';

const SuperAdminPage = lazy(() => import('@/views/SuperAdmin'));

export default function SuperAdmin() {
  return (
    <Suspense fallback={null}>
      <SuperAdminPage />
    </Suspense>
  );
}

