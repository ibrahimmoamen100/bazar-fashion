import type { VercelRequest, VercelResponse } from '@vercel/node';

const FIREBASE_PROJECT_ID = 'store-49d01';
const FIREBASE_API_KEY = 'AIzaSyCqsuXR7r-OllrBzbzGcvnZTcsGNuHRI2w';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host || 'bazar-fashion.vercel.app';
    const baseUrl = `${protocol}://${host}`;

    // Static pages to include in the sitemap
    const staticPages = [
      '',
      '/about',
      '/products/all',
      '/products/laptops',
      '/products/screens',
      '/products/phones',
      '/products/cameras',
      '/products/accessories'
    ];

    const urls: string[] = [];

    // Add static pages
    const today = new Date().toISOString().split('T')[0];
    staticPages.forEach((path) => {
      urls.push(`  <url>
    <loc>${baseUrl}${path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${path === '' ? 'daily' : 'weekly'}</changefreq>
    <priority>${path === '' ? '1.0' : '0.8'}</priority>
  </url>`);
    });

    // Fetch products from Firestore REST API
    // We fetch up to 500 products (which is ample, but we can configure pageSize)
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/products?key=${FIREBASE_API_KEY}&pageSize=500`;

    try {
      const response = await fetch(firestoreUrl);
      if (response.ok) {
        const data = await response.json();
        const documents = data.documents || [];

        documents.forEach((doc: any) => {
          // Check if document is archived
          const fields = doc.fields || {};
          const isArchived = fields.isArchived?.booleanValue ?? false;

          if (!isArchived) {
            const id = doc.name.split('/').pop();
            const updateTime = doc.updateTime ? doc.updateTime.split('T')[0] : today;

            urls.push(`  <url>
    <loc>${baseUrl}/product/${id}</loc>
    <lastmod>${updateTime}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`);
          }
        });
      }
    } catch (e) {
      console.error('Failed to fetch products for sitemap:', e);
    }

    // Assemble the XML sitemap
    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

    // Set headers
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    // Cache on CDN for 1 hour, serve stale while revalidating
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=7200');

    return res.status(200).send(sitemapXml);
  } catch (error: any) {
    console.error('Error generating sitemap:', error);
    return res.status(500).send('Internal Server Error');
  }
}
