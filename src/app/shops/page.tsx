'use client';

import { Suspense, lazy } from 'react';

const ShopsView = lazy(() => import('@/views/Shops'));

export default function ShopsPage() {
  return (
    <Suspense fallback={null}>
      <ShopsView />
    </Suspense>
  );
}
