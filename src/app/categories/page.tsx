import CategoriesView from '@/views/Categories';
import { productsService } from '@/lib/firebase';
import type { Metadata } from 'next';

// ISR: إعادة بناء صفحة الأقسام كل 24 ساعة (مع التحديث الفوري عند أي تعديل من الأدمن)
export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'تصفح الأقسام | بازار للموضه',
  description:
    'تصفح جميع فئات المنتجات المتاحة في بازار للموضه وابحث عن الأجهزة والإكسسوارات ولابتوبات استيراد بأفضل الأسعار في مصر.',
  alternates: {
    canonical: 'https://bazar-fashion.vercel.app/categories',
  },
};

export default async function CategoriesPage() {
  let products = [];
  try {
    products = await productsService.getAllProducts();
  } catch (error) {
    console.error('Failed to fetch products for SSR Categories Page:', error);
  }

  return <CategoriesView initialProducts={products} />;
}
