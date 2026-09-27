import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { DataLoader } from '@/components/DataLoader';
import { MetaPixelInitializer } from '@/components/MetaPixelInitializer';
import { GlobalSplash } from '@/components/GlobalSplash';
import { FloatingWhatsApp } from '@/components/FloatingWhatsApp';
import { Layout } from '@/components/Layout';
import ErrorBoundary from '@/components/ErrorBoundary';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bazar-fashion.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'بازار للموضه | لابتوب استيراد وجديد - Docking Station - سماعات - رواتر',
    template: '%s | بازار للموضه',
  },
  description:
    'متجرك الشامل للأجهزة الإلكترونية في مصر: لابتوبات استيراد وجديدة بأفضل الحالات، docking station، سماعات، تجميعات كمبيوتر، كيسات استيراد، رواتر Tenda بأقل الأسعار.',
  keywords: [
    'بازار للموضه',
    'bazar fashion',
    'لاب توب استيراد',
    'لابتوب جديد',
    'لاب توب استيراد مول البستان',
    'dockstation',
    'docking station',
    'سماعات شحن وايرلس',
    'تجميعات كمبيوتر جيمنج',
    'كيسات كمبيوتر استيراد',
    'روتر tenda',
    'راوتر تندا',
    'إكسسوارات كمبيوتر مصر',
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'ar_EG',
    siteName: 'بازار للموضه | bazar fashion',
    url: BASE_URL,
    images: [
      {
        url: '/logo3.png',
        width: 1200,
        height: 630,
        alt: 'بازار للموضه | متجرك الشامل للأجهزة الإلكترونية في مصر',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/logo3.png'],
  },
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" data-scroll-behavior="smooth">
      <head>
        {/* Favicon */}
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="shortcut icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
        {/* ── DNS prefetch + preconnect for Google Fonts (non-render-blocking) ── */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Only load the weights actually used (400, 600, 700) for smaller payload */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap"
        />
        {/* Fallback for no-JS */}
        <noscript>
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap"
          />
        </noscript>
        {/* ── Preload LCP hero image ── */}
        <link rel="preload" as="image" href="/1.png" fetchPriority="high" />
      </head>
      <body>
        <Providers>
          <DataLoader />
          <MetaPixelInitializer />
          <GlobalSplash />
          <FloatingWhatsApp />
          <Layout>
            <ErrorBoundary>{children}</ErrorBoundary>
          </Layout>
        </Providers>
      </body>
    </html>
  );
}
