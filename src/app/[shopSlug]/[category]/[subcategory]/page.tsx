import { redirect } from 'next/navigation';
import { productsService } from '@/lib/firebase';
import { extractProductId, generateSlug } from '@/utils/url';
import { getCategorySlugFromName } from '@/utils/category';
import type { Metadata } from 'next';
import { Suspense, lazy } from 'react';

const ShopView = lazy(() => import('@/views/ShopView'));

export const revalidate = 86400;

interface PageProps {
  params: Promise<{
    shopSlug: string;
    category: string;
    subcategory: string;
  }>;
}

const normSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]/g, '');

async function fetchProductServerSide(productSlug: string) {
  if (!productSlug) return null;
  const actualId = extractProductId(productSlug);

  try {
    let product = await productsService.getProductById(productSlug);
    if (!product && actualId && actualId !== productSlug) {
      product = await productsService.getProductById(actualId);
    }

    if (!product) {
      const allProducts = await productsService.getAllProducts();
      const normId = normSlug(productSlug);
      const normActual = actualId ? normSlug(actualId) : normId;

      product = allProducts.find((p: any) =>
        p.id === productSlug ||
        p.id === actualId ||
        generateSlug(p.name) === productSlug ||
        generateSlug(p.name) === actualId ||
        normSlug(p.id) === normId ||
        normSlug(p.id) === normActual ||
        (p as any).slug === productSlug
      ) ?? null;
    }

    return product ?? null;
  } catch (error) {
    console.error('Error fetching product server-side:', error);
    return null;
  }
}

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bazar-fashion.vercel.app';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category, subcategory } = await params;
  const product = await fetchProductServerSide(subcategory);

  if (!product) {
    return {
      title: 'بازار للموضه',
      description: 'تسوق من أفضل التجار والمتاجر المتخصصة.',
    };
  }

  const catSlug = product.categorySlug || getCategorySlugFromName(product.category) || category || 'general';
  const prodSlug = generateSlug(product.name) || product.id;
  const storeName = product.wholesaleInfo?.supplierName || 'بازار للموضه';
  const pageTitle = `${product.name} | ${storeName}`;
  const pageDesc = product.description || 'تصفح أحدث الأجهزة والمنتجات بأفضل الأسعار.';
  const imageUrl = product.images?.[0] || '/logo3.png';
  const canonicalUrl = `${BASE_URL}/product/${catSlug}/${prodSlug}`;

  return {
    title: pageTitle,
    description: pageDesc,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: pageTitle,
      description: pageDesc,
      images: [{ url: imageUrl, alt: pageTitle }],
      type: 'website',
      siteName: storeName,
      locale: 'ar_EG',
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description: pageDesc,
      images: [imageUrl],
    },
  };
}

export default async function ShopProductDetailsOrSubcategoryPage({ params }: PageProps) {
  const { category, subcategory } = await params;
  const product = await fetchProductServerSide(subcategory);

  if (product) {
    const catSlug = product.categorySlug || getCategorySlugFromName(product.category) || category || 'general';
    const prodSlug = generateSlug(product.name) || product.id;
    // Permanent/Clean redirect to modern, canonical product URL
    redirect(`/product/${catSlug}/${prodSlug}`);
  }

  // Fallback: If not a product, render ShopView for subcategory filtering
  return (
    <Suspense fallback={null}>
      <ShopView />
    </Suspense>
  );
}
