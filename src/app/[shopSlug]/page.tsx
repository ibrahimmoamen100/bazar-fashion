'use client';

import { Suspense, lazy } from 'react';

const ShopView = lazy(() => import('@/views/ShopView'));

export default function ShopMainPage() {
  return (
    <Suspense fallback={null}>
      <ShopView />
    </Suspense>
  );
}
