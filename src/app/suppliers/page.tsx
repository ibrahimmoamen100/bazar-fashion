'use client';

import { Suspense, lazy } from 'react';

const SuppliersManager = lazy(() => import('@/views/admin/SuppliersManager'));

export default function SuppliersPage() {
  return (
    <Suspense fallback={null}>
      <SuppliersManager />
    </Suspense>
  );
}
