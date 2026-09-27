'use client';

/**
 * Global Error UI - يُعالج أخطاء Next.js App Router تلقائياً
 * يُفعَّل عند حدوث خطأ في أي Server Component أو Client Component
 */

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to the console (يمكن ربطه بـ Sentry أو أي نظام تتبع)
    console.error('[Next.js Error Boundary]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Error Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-50 border-2 border-red-100">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>

        {/* Error Title */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">حدث خطأ غير متوقع</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            نأسف لهذا الإزعاج. حدث خطأ أثناء تحميل هذه الصفحة. يمكنك المحاولة مرة أخرى.
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground/60 font-mono">
              رمز الخطأ: {error.digest}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={reset}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <RefreshCw className="w-4 h-4" />
            إعادة المحاولة
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.href = '/'}
            className="gap-2"
          >
            <Home className="w-4 h-4" />
            الصفحة الرئيسية
          </Button>
        </div>
      </div>
    </div>
  );
}
