'use client';

import { Suspense, lazy } from 'react';

const AdminPage = lazy(() => import('@/views/Admin'));

export default function Admin() {
  return (
    <Suspense fallback={null}>
      <AdminPage />
    </Suspense>
  );
}

