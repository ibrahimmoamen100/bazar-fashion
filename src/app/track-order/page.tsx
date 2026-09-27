'use client';

import { Suspense, lazy } from 'react';

const TrackOrderView = lazy(() => import('@/views/TrackOrder'));

export default function TrackOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-primary" />
        </div>
      }
    >
      <TrackOrderView />
    </Suspense>
  );
}
