'use client';

import { Suspense, lazy } from 'react';

const ShopView = lazy(() => import('@/views/ShopView'));

export default function ShopCategoryPage() {
  return (
    <Suspense fallback={null}>
      <ShopView />
    </Suspense>
  );
}
