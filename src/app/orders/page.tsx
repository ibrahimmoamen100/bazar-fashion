'use client';

import { Suspense, lazy } from 'react';

const AdminOrdersPage = lazy(() => import('@/views/admin/Orders'));

export default function AdminOrders() {
  return (
    <Suspense fallback={null}>
      <AdminOrdersPage />
    </Suspense>
  );
}

