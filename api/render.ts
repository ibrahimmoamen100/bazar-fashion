import type { VercelRequest, VercelResponse } from '@vercel/node';

const FIREBASE_PROJECT_ID = 'store-49d01';
const FIREBASE_API_KEY = 'AIzaSyCqsuXR7r-OllrBzbzGcvnZTcsGNuHRI2w';

/** Returns true only for real image URLs — rejects YouTube, Facebook video, video files, etc. */
function isImageUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return false;
  if (lower.includes('facebook.com/video') || lower.includes('fb.watch')) return false;
  if (lower.includes('vimeo.com') || lower.includes('tiktok.com')) return false;
  if (/\.(mp4|webm|mov|avi|mkv|ogg|flv)(\?|$)/.test(lower)) return false;
  return true;
}

function parseFirestoreValue(value: any): any {
  if (!value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return parseInt(value.integerValue, 10);
  if ('doubleValue' in value) return parseFloat(value.doubleValue);
  if ('booleanValue' in value) return value.booleanValue;
  if ('arrayValue' in value) {
    return (value.arrayValue.values || []).map((v: any) => parseFirestoreValue(v));
  }
  if ('mapValue' in value) {
    const obj: any = {};
    const fields = value.mapValue.fields || {};
    for (const k in fields) {
      obj[k] = parseFirestoreValue(fields[k]);
    }
    return obj;
  }
  if ('timestampValue' in value) return value.timestampValue;
  return null;
}

function parseFirestoreDocument(doc: any): any {
  if (!doc || !doc.fields) return null;
  const result: any = { id: doc.name.split('/').pop() };
  for (const key in doc.fields) {
    result[key] = parseFirestoreValue(doc.fields[key]);
  }
  return result;
}

// Map of category slugs/names to customized Arabic SEO metadata
const categoryMetaMap: Record<string, { title: string; description: string }> = {
  'laptops': {
    title: 'لابتوبات استيراد وجديدة بأفضل الأسعار في مصر',
    description: 'تسوق أحدث أجهزة اللابتوب الاستيراد والجديدة من أشهر الماركات العالمية (Dell, HP, Lenovo, Apple) بأفضل الأسعار وبحالة الزيرو مع الضمان في بازار للموضه.',
  },
  'لابتوبات': {
    title: 'لابتوبات استيراد وجديدة بأفضل الأسعار في مصر',
    description: 'تسوق أحدث أجهزة اللابتوب الاستيراد والجديدة من أشهر الماركات العالمية (Dell, HP, Lenovo, Apple) بأفضل الأسعار وبحالة الزيرو مع الضمان في بازار للموضه.',
  },
  'screens': {
    title: 'شاشات كمبيوتر وتلفزيونات استيراد وجديدة',
    description: 'مجموعة مميزة من شاشات الكمبيوتر والتلفزيونات الاستيراد والجديدة بدقة عالية وماركات أصلية تناسب الألعاب، التصميم، والعمل المكتبي بأقل الأسعار.',
  },
  'شاشات': {
    title: 'شاشات كمبيوتر وتلفزيونات استيراد وجديدة',
    description: 'مجموعة مميزة من شاشات الكمبيوتر والتلفزيونات الاستيراد والجديدة بدقة عالية وماركات أصلية تناسب الألعاب، التصميم، والعمل المكتبي بأقل الأسعار.',
  },
  'phones': {
    title: 'موبايلات وهواتف ذكية جديدة ومستعملة كسر زيرو',
    description: 'احصل على أحدث الهواتف الذكية الجديدة والمستعملة كسر زيرو (آيفون، سامسونج، شاومي) بأعلى جودة مع الضمان وبأسعار منافسة في بازار للموضه.',
  },
  'موبايلات': {
    title: 'موبايلات وهواتف ذكية جديدة ومستعملة كسر زيرو',
    description: 'احصل على أحدث الهواتف الذكية الجديدة والمستعملة كسر زيرو (آيفون، سامسونج، شاومي) بأعلى جودة مع الضمان وبأسعار منافسة في بازار للموضه.',
  },
  'cameras': {
    title: 'معدات تصوير احترافية وكاميرات وميكروفونات',
    description: 'كل ما تحتاجه للتصوير الاحترافي وصناعة المحتوى: كاميرات، عدسات، إضاءة، سوفت بوكس، وميكروفونات لاسلكية من أكبر الماركات العالمية (DJI, Hollyland).',
  },
  'معدات-تصوير': {
    title: 'معدات تصوير احترافية وكاميرات وميكروفونات',
    description: 'كل ما تحتاجه للتصوير الاحترافي وصناعة المحتوى: كاميرات، عدسات، إضاءة، سوفت بوكس، وميكروفونات لاسلكية من أكبر الماركات العالمية (DJI, Hollyland).',
  },
  'accessories': {
    title: 'إكسسوارات إلكترونية وهواتف أصلية 100%',
    description: 'اكتشف تشكيلة واسعة من إكسسوارات الهواتف واللابتوب الأصلية: شواحن سريعة، كابلات متينة، سماعات بلوتوث، وحوامل بأعلى جودة وأفضل الأسعار.',
  },
  'اكسسوارات': {
    title: 'إكسسوارات إلكترونية وهواتف أصلية 100%',
    description: 'اكتشف تشكيلة واسعة من إكسسوارات الهواتف واللابتوب الأصلية: شواحن سريعة، كابلات متينة، سماعات بلوتوث، وحوامل بأعلى جودة وأفضل الأسعار.',
  },
};

function replaceMetaTag(html: string, propertyName: string, newValue: string, isProperty = true): string {
  const attrName = isProperty ? 'property' : 'name';
  const regex = new RegExp(`<meta\\s+[^>]*${attrName}=["']${propertyName}["'][^>]*content=["']([^"']*)["'][^>]*>`, 'i');
  if (regex.test(html)) {
    return html.replace(regex, `<meta ${attrName}="${propertyName}" content="${newValue}">`);
  }
  return html.replace('</head>', `<meta ${attrName}="${propertyName}" content="${newValue}">\n</head>`);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { path } = req.query;

  if (!path || typeof path !== 'string') {
    return res.status(400).send('Path parameter is required');
  }

  try {
    // 1. Fetch the base HTML template from the site's own origin to ensure we get Vite's built version
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host || 'bazar-fashion.vercel.app';
    const baseUrl = `${protocol}://${host}`;

    let baseHtml = '';
    try {
      const htmlRes = await fetch(`${baseUrl}/index.html`);
      if (htmlRes.ok) {
        baseHtml = await htmlRes.text();
      }
    } catch (e) {
      console.warn('Failed to fetch index.html from origin, fallback to basic template', e);
    }

    if (!baseHtml) {
      // Fallback HTML template in case fetching fails
      baseHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="icon" type="image/png" href="/logo3.png" />
  <title>بازار للموضه | وجهتك الشاملة للللموضه - ملابس - أحذيه في مصر</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`;
    }

    let finalHtml = baseHtml;
    let title = 'بازار للموضه | وجهتك الشاملة للللموضه - ملابس - أحذيه في مصر';
    let description = 'بازار للموضه (bazar fashion) - متجرك المتكامل لأحدث الأجهزة الإلكترونية: هواتف ذكية، لابتوب، شاشات عرض، معدات تصوير احترافية، وإكسسوارات أصلية. تسوق الآن بأفضل الأسعار في مصر.';
    let image = `${baseUrl}/logo3.png`;
    let url = `${baseUrl}${path}`;
    let schemaScript = '';

    // 2. Determine page type and customize SEO
    if (path.startsWith('/product/')) {
      const productId = path.split('/product/')[1]?.split('?')[0];
      if (productId) {
        // Fetch product from Firestore REST API
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/products/${productId}?key=${FIREBASE_API_KEY}`;
        const prodRes = await fetch(firestoreUrl);

        if (prodRes.ok) {
          const docData = await prodRes.json();
          const product = parseFirestoreDocument(docData);

          if (product) {
            const priceText = product.price ? `بـ ${product.price} ج.م` : '';
            const brandText = product.brand ? `من ${product.brand}` : '';
            title = `${product.name} ${brandText} ${priceText} | بازار للموضه`;
            description = product.description
              ? `${product.description.slice(0, 150)}... متوفر الآن في بازار للموضه بأفضل سعر في مصر.`
              : `شراء ${product.name} ${brandText} بأفضل سعر في مصر. تصفح المواصفات والتقييمات وتواصل مع البائع مباشرة بدون وسيط.`;

            if (Array.isArray(product.images) && product.images.length > 0) {
              // Filter out YouTube/video URLs — only use real image URLs for og:image
              const imageOnly = product.images.filter(isImageUrl);
              if (imageOnly.length > 0) {
                image = imageOnly[0];
              }
            }

            // Structured Data (JSON-LD) for Product
            const productSchema = {
              "@context": "https://schema.org/",
              "@type": "Product",
              "name": product.name,
              "image": image,
              "description": product.description || description,
              "sku": product.id,
              "brand": {
                "@type": "Brand",
                "name": product.brand || "بازار للموضه"
              },
              "offers": {
                "@type": "Offer",
                "url": url,
                "priceCurrency": "EGP",
                "price": product.price || 0,
                "priceValidUntil": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                "itemCondition": "https://schema.org/NewCondition",
                "availability": product.isArchived ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
                "seller": {
                  "@type": "Organization",
                  "name": "بازار للموضه"
                }
              }
            };
            schemaScript = `\n<script type="application/ld+json">${JSON.stringify(productSchema)}</script>\n`;
          }
        }
      }
    } else if (path.startsWith('/products/')) {
      const parts = path.split('/products/')[1]?.split('/');
      const categorySlug = parts ? decodeURIComponent(parts[0]) : '';

      if (categorySlug && categoryMetaMap[categorySlug]) {
        const meta = categoryMetaMap[categorySlug];
        title = `${meta.title} | بازار للموضه`;
        description = meta.description;
      } else if (categorySlug && categorySlug !== 'all') {
        // Dynamic fallback for any other category name
        title = `${categorySlug} استيراد وجديد بأفضل الأسعار | بازار للموضه`;
        description = `تصفح أحدث منتجات قسم ${categorySlug} في بازار للموضه. أجهزة أصلية، لابتوب، هواتف، شاشات، وإكسسوارات بأعلى جودة وأقل سعر في مصر.`;
      }
    }

    // 3. Inject new metadata into the HTML
    finalHtml = finalHtml.replace(/<title>[^<]*<\/title>/i, `<title>${title}</title>`);
    finalHtml = replaceMetaTag(finalHtml, 'description', description, false);
    finalHtml = replaceMetaTag(finalHtml, 'og:description', description, true);
    finalHtml = replaceMetaTag(finalHtml, 'og:title', title, true);
    finalHtml = replaceMetaTag(finalHtml, 'og:image', image, true);
    finalHtml = replaceMetaTag(finalHtml, 'og:url', url, true);
    finalHtml = replaceMetaTag(finalHtml, 'twitter:title', title, true);
    finalHtml = replaceMetaTag(finalHtml, 'twitter:description', description, true);
    finalHtml = replaceMetaTag(finalHtml, 'twitter:image', image, true);

    if (schemaScript) {
      finalHtml = finalHtml.replace('</head>', `${schemaScript}</head>`);
    }

    // Set cache control headers to reduce serverless invocations and maximize speed
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600');

    return res.status(200).send(finalHtml);
  } catch (error: any) {
    console.error('Error rendering HTML for bot:', error);
    return res.status(500).send('Internal Server Error');
  }
}
