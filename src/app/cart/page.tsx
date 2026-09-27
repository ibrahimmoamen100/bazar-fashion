'use client';

import { Suspense, lazy } from 'react';

const CartPage = lazy(() => import('@/views/Cart'));

export default function Cart() {
  return (
    <Suspense fallback={null}>
      <CartPage />
    </Suspense>
  );
}

