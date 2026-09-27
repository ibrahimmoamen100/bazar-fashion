import WorksView from '@/views/Works';
import { productsService } from '@/lib/firebase';
import type { Metadata } from 'next';

// ISR: إعادة بناء صفحة الأعمال كل 24 ساعة
export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'جميع المنتجات والأجهزة الإلكترونية | بازار للموضه',
  description:
    'تصفح كافة المنتجات الإلكترونية المتاحة لدينا: أجهزة لابتوب استيراد، هواتف ذكية، شاشات، وإكسسوارات كمبيوتر مع خدمة توصيل لكل المحافظات.',
  alternates: {
    canonical: 'https://bazar-fashion.vercel.app/works',
  },
};

export default async function WorksPage() {
  let products = [];
  try {
    products = await productsService.getAllProducts();
  } catch (error) {
    console.error('Failed to fetch products for SSR Works Page:', error);
  }

  return <WorksView initialProducts={products} />;
}
