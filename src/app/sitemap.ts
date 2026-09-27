import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bazar-fashion.vercel.app';

/**
 * Dynamic sitemap — fetches products from Firestore (server-side) and
 * returns all public URLs for Google to index.
 *
 * Revalidates every hour (ISR) so new products appear quickly.
 */
export const revalidate = 43200; // 12 hours

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages & key landing pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/categories`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/shop`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/track-order`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/category/laptops`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/category/computers`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/category/monitors`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/category/docking-stations`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/category/network-routers`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/category/headphones`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/category/accessories`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/works`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/locations`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/wholesale`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];

  // Dynamic product pages — fetched from Firestore server-side
  let productPages: MetadataRoute.Sitemap = [];
  try {
    const { productsService } = await import('@/lib/firebase');
    const { getProductUrl } = await import('@/utils/url');

    const allProducts = await productsService.getAllProducts();
    const activeProducts = allProducts.filter((p) => !p.isArchived);

    productPages = activeProducts.map((p) => {
      const productUrlPath = getProductUrl(p);
      return {
        url: `${BASE_URL}${productUrlPath}`,
        lastModified: p.createdAt ? new Date(p.createdAt) : new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.9,
      };
    });
  } catch (error) {
    console.error('Sitemap: failed to fetch products', error);
  }

  return [...staticPages, ...productPages];
}
