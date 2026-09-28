import { Suspense } from 'react';
import ProductsView from '@/views/Products';
import { productsService } from '@/lib/firebase';
import { getCategoryNameFromSlug } from '@/utils/category';
import type { Metadata } from 'next';

// ISR: إعادة بناء صفحات الأقسام والفرعيات تلقائياً كل 24 ساعة
export const revalidate = 86400;

interface PageProps {
  params: Promise<{
    category: string;
    subcategory: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category, subcategory } = await params;
  const decodedCategory = decodeURIComponent(category);
  const decodedSubcategory = decodeURIComponent(subcategory);
  const categoryName = getCategoryNameFromSlug(decodedCategory);

  return {
    title: `${decodedSubcategory} - ${categoryName} | بازار للموضه`,
    description: `تسوق منتجات ${decodedSubcategory} ضمن قسم ${categoryName} بأفضل الأسعار وأعلى جودة في مصر.`,
    alternates: {
      canonical: `https://bazar-fashion.vercel.app/products/${category}/${subcategory}`,
    },
  };
}

export default async function ProductsByCategoryAndSubcategory({ params }: PageProps) {
  const { category, subcategory } = await params;
  const decodedCategory = decodeURIComponent(category);
  const decodedSubcategory = decodeURIComponent(subcategory);

  let products: any[] = [];
  try {
    products = await productsService.getProductsByCategoryAndSubcategory(
      decodedCategory,
      decodedSubcategory
    );
  } catch (error) {
    console.error('Failed to fetch products for SSR category+subcategory page:', error);
  }

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
      <ProductsView
        initialProducts={products}
        initialCategory={decodedCategory}
        initialSubcategory={decodedSubcategory}
      />
    </Suspense>
  );
}
