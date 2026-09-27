import LocationsView from '@/views/Locations';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'فروعنا وعناويننا | بازار للموضه',
  description:
    'تعرف على عناوين فروع بازار للموضه ومواعيد العمل الرسمية للتواصل معنا أو زيارتنا لشراء الأجهزة ومستلزمات الكمبيوتر.',
  alternates: {
    canonical: 'https://bazar-fashion.vercel.app/locations',
  },
};

export default function LocationsPage() {
  return <LocationsView />;
}
