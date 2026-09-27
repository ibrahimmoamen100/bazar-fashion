import Link from 'next/link';
import { Search, Home, ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'الصفحة غير موجودة (404) | بازار للموضه',
  description: 'الصفحة التي تبحث عنها غير موجودة. تصفح منتجاتنا أو عد للصفحة الرئيسية.',
  robots: { index: false, follow: false },
};

/**
 * Custom 404 Page - Next.js App Router not-found.tsx
 * يُفعَّل تلقائياً عند استدعاء notFound() من أي Server Component
 * أو عند وصول المستخدم لمسار غير موجود
 */
export default function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-4"
      dir="rtl"
    >
      <div className="max-w-lg w-full text-center space-y-8">
        {/* 404 Number */}
        <div className="relative">
          <span className="text-[160px] font-black text-blue-100 leading-none select-none block">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <Search className="w-20 h-20 text-blue-400 opacity-60" />
          </div>
        </div>

        {/* Text */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-gray-800">
            الصفحة غير موجودة
          </h1>
          <p className="text-gray-500 text-base leading-relaxed max-w-sm mx-auto">
            يبدو أن الرابط الذي تبحث عنه غير موجود أو ربما تم نقله.
            لا تقلق، يمكنك العودة للمتجر ومتابعة التسوق.
          </p>
        </div>

        {/* Navigation Links */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
          >
            <Home className="w-4 h-4" />
            الصفحة الرئيسية
          </Link>
          <Link
            href="/products/laptops"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-blue-200 hover:border-blue-400 text-blue-700 font-semibold transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 bg-white"
          >
            تصفح المنتجات
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Quick Links */}
        <div className="pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-3 font-medium">روابط سريعة:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              { href: '/categories', label: 'الأقسام' },
              { href: '/cart', label: 'سلة المشتريات' },
              { href: '/about', label: 'من نحن' },
              { href: '/locations', label: 'فروعنا' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 transition-all duration-150"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
