import AboutView from '@/views/About';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'من نحن | بازار للموضه',
  description:
    'تعرف على بازار للموضه: منصتك الأولى لمقارنة أسعار الأجهزة الإلكترونية في مولات مصر والتواصل مباشرة مع التجار دون وسيط.',
  alternates: {
    canonical: 'https://bazar-fashion.vercel.app/about',
  },
};

export default function AboutPage() {
  return <AboutView />;
}
