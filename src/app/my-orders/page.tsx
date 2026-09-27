'use client';

import { Suspense, lazy } from 'react';

const OrdersPage = lazy(() => import('@/views/Orders'));

export default function MyOrders() {
  return (
    <Suspense fallback={null}>
      <OrdersPage />
    </Suspense>
  );
}

