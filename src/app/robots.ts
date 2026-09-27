import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bazar-fashion.vercel.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/analytics',
          '/orders',
          '/visitor-logs',
          '/profit-analysis',
          '/dashboard',
          '/cp',
          '/admin/setup',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
