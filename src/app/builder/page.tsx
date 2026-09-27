import BuilderHubView from '@/views/BuilderHubView';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ابني تجميعتك المخصصة | تجميعات PC ومكاتب وغرف ذكية | بازار للموضه',
  description:
    'صمم وابنِ تجميعتك بنفسك خطوة بخطوة: تجميعات كمبيوتر وجيمنج، تجهيز مكاتب العمل، والشقق الذكية بأفضل الأسعار مع توفير حقيقي وإمكانية تخصيص كاملة.',
  keywords: [
    'ابني تجميعتك',
    'build your pc',
    'تجميعات كمبيوتر مصر',
    'تجميعة جيمنج',
    'تجميعة اقتصادية AM4',
    'جمع مكتبك',
    'سيت اب جيمنج',
    'شقة ذكية',
    'اسعار تجميعات pc مصر',
  ],
  alternates: {
    canonical: 'https://bazar-fashion.vercel.app/builder',
  },
};

export default function BuilderPage() {
  return <BuilderHubView />;
}
