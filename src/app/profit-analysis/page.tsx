'use client';

import { Suspense, lazy } from 'react';

const ProfitAnalysisPage = lazy(() => import('@/views/admin/ProfitAnalysis'));

export default function ProfitAnalysis() {
  return (
    <Suspense fallback={null}>
      <ProfitAnalysisPage />
    </Suspense>
  );
}

