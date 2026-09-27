import WholesaleView from '@/views/Wholesale';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'توريدات وجملة أجهزة الجملة بأسعار تنافسية | بازار للموضه',
  description:
    'نوفر خدمات توريد أجهزة اللابتوب والكمبيوتر للشركات والمتاجر في جميع أنحاء مصر بأسعار تنافسية غير مسبوقة وضمان معتمد.',
  alternates: {
    canonical: 'https://bazar-fashion.vercel.app/wholesale',
  },
};

export default function WholesalePage() {
  return <WholesaleView />;
}
