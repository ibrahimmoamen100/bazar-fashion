import LocationsView from '@/views/Locations';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'مقر المخزن الرئيسي ونقطة الاستلام | بازار فاشون',
  description:
    'تعرف على عنوان مخزن بازار فاشون للأحذية والملابس العصرية في القاهرة، شارع مؤسسة الزكاة، مواعيد العمل الرسمية، وخدمات الشحن لجميع المحافظات.',
  alternates: {
    canonical: 'https://bazar-fashion.vercel.app/locations',
  },
};

export default function LocationsPage() {
  return <LocationsView />;
}
