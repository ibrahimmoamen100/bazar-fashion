'use client';

import { Suspense, lazy } from 'react';

const AdminSetupPage = lazy(() => import('@/views/AdminSetup'));

export default function AdminSetup() {
  return (
    <Suspense fallback={null}>
      <AdminSetupPage />
    </Suspense>
  );
}

