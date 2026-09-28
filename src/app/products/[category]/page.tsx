import { Suspense } from 'react';
import ProductsView from '@/views/Products';
import { productsService } from '@/lib/firebase';
import { getCategoryNameFromSlug } from '@/utils/category';
import type { Metadata } from 'next';

// ISR: إعادة بناء صفحات الأقسام تلقائياً كل 24 ساعة
export const revalidate = 86400;

interface PageProps {
  params: Promise<{
    category: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category } = await params;
  const decodedCategory = decodeURIComponent(category);
  const categoryName = getCategoryNameFromSlug(decodedCategory);

  return {
    title: `${categoryName} | بازار للموضه`,
    description: `تسوق أفضل منتجات ${categoryName} بأفضل الأسعار وأعلى جودة في مصر من بازار للموضه. `,
    alternates: {
      canonical: `https://bazar-fashion.vercel.app/products/${category}`,
    },
  };
}

export default async function ProductsByCategory({ params }: PageProps) {
  const { category } = await params;
  const decodedCategory = decodeURIComponent(category);

  let products: any[] = [];
  try {
    products = await productsService.getProductsByCategory(decodedCategory);
  } catch (error) {
    console.error('Failed to fetch products for SSR category page:', error);
  }

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
      <ProductsView initialProducts={products} initialCategory={decodedCategory} />
    </Suspense>
  );
}
