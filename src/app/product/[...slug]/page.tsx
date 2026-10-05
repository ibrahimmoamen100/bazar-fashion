import ProductDetails from '@/views/ProductDetails';
import { productsService } from '@/lib/firebase';
import { extractProductId, generateSlug } from '@/utils/url';
import { getCategorySlugFromName } from '@/utils/category';
import {
  buildProductSeoTitle,
  buildProductSeoDescription,
  buildProductJsonLd,
  buildProductKeywords,
  toAbsoluteUrl,
  getImageMimeType,
  BASE_URL,
  STORE_NAME,
} from '@/utils/productSeo';
import type { Metadata } from 'next';

/**
 * Returns true only for actual image URLs (not YouTube / Facebook video / any video URL).
 * WhatsApp, Facebook, Telegram crawlers cannot use video URLs as og:image.
 */
function isImageUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  // Reject known video hosts
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return false;
  if (lower.includes('facebook.com/video') || lower.includes('fb.watch')) return false;
  if (lower.includes('vimeo.com')) return false;
  if (lower.includes('tiktok.com')) return false;
  // Reject explicit video extensions
  if (/\.(mp4|webm|mov|avi|mkv|ogg|flv)(\?|$)/.test(lower)) return false;
  return true;
}

// ISR: إعادة بناء صفحات المنتجات تلقائياً كل 24 ساعة (مع التحديث الفوري عند أي تعديل من الأدمن)
export const revalidate = 86400;

interface PageProps {
  params: Promise<{
    slug: string[];
  }>;
}

/**
 * Safely decode URI components (supporting singly or doubly percent-encoded strings).
 */
function safeDecode(val?: string): string {
  if (!val) return '';
  let res = val;
  try {
    res = decodeURIComponent(res);
    if (res.includes('%')) {
      try {
        res = decodeURIComponent(res);
      } catch { }
    }
  } catch { }
  return res;
}

/**
 * Normalize a slug for fuzzy matching:
 * Decodes URI characters and strips non-alphanumeric chars (retaining Arabic and English).
 */
const normSlug = (s: string) => {
  const dec = safeDecode(s);
  return dec.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]/g, '');
};

/**
 * Helper to fetch product server-side with robust multi-strategy lookup:
 * 1. Direct Firestore ID lookup (decoded & raw)
 * 2. Exact match against all products (id, custom slug, generated slug)
 * 3. Normalized fuzzy match (accents, dots, dashes, Arabic percent-encoding)
 * 4. Suffix/contains ID match
 */
async function fetchProductServerSide(slugArr: string[] | undefined) {
  if (!slugArr || slugArr.length === 0) return null;

  const rawLast = slugArr[slugArr.length - 1];
  const decodedLast = safeDecode(rawLast);
  const extractedId = extractProductId(decodedLast) || extractProductId(rawLast);
  const rawFirst = slugArr[0];
  const decodedFirst = safeDecode(rawFirst);

  try {
    // 1. Direct Firestore document ID lookups
    if (extractedId) {
      const p = await productsService.getProductById(extractedId);
      if (p) return p;
    }
    if (decodedLast && decodedLast !== extractedId) {
      const p = await productsService.getProductById(decodedLast);
      if (p) return p;
    }
    if (rawLast && rawLast !== decodedLast && rawLast !== extractedId) {
      const p = await productsService.getProductById(rawLast);
      if (p) return p;
    }

    // 2. Fetch all products and match through comprehensive strategies
    const allProducts = await productsService.getAllProducts();
    const candidates = Array.from(
      new Set([decodedLast, rawLast, extractedId, decodedFirst, rawFirst].filter(Boolean))
    ) as string[];
    const normCandidates = candidates.map((c) => normSlug(c)).filter(Boolean);

    // Strategy 2a: Exact ID match
    let match = allProducts.find((p: any) =>
      candidates.some((c) => p.id === c || p.id?.toLowerCase() === c.toLowerCase())
    );
    if (match) return match;

    // Strategy 2b: Custom slug match
    match = allProducts.find((p: any) => {
      const pSlug = p.slug;
      if (!pSlug) return false;
      const decSlug = safeDecode(pSlug);
      const cleanSlug = generateSlug(pSlug);
      return candidates.some(
        (c) =>
          pSlug === c ||
          decSlug === c ||
          cleanSlug === c ||
          pSlug.toLowerCase() === c.toLowerCase() ||
          cleanSlug.toLowerCase() === c.toLowerCase()
      );
    });
    if (match) return match;

    // Strategy 2c: Generated slug match from product name
    match = allProducts.find((p: any) => {
      const genSlug = generateSlug(p.name || '');
      const genDec = generateSlug(safeDecode(p.name || ''));
      return candidates.some(
        (c) => genSlug === c || genDec === c || genSlug.toLowerCase() === c.toLowerCase()
      );
    });
    if (match) return match;

    // Strategy 2d: Normalized fuzzy match
    match = allProducts.find((p: any) => {
      const normId = normSlug(p.id || '');
      const normName = normSlug(p.name || '');
      const normGen = normSlug(generateSlug(p.name || ''));
      const normCustom = p.slug ? normSlug(p.slug) : '';

      return normCandidates.some(
        (nc) =>
          nc === normId ||
          nc === normGen ||
          nc === normName ||
          (normCustom && nc === normCustom)
      );
    });
    if (match) return match;

    // Strategy 2e: Substring / Suffix match
    match = allProducts.find((p: any) =>
      candidates.some(
        (c) =>
          c.endsWith(`-${p.id}`) ||
          c.endsWith(`--${p.id}`) ||
          (p.id?.length > 5 && c.includes(p.id))
      )
    );
    if (match) return match;

    return null;
  } catch (error) {
    console.error('Error fetching product server-side:', error);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchProductServerSide(slug);

  if (!product) {
    return {
      title: 'منتج غير موجود | بازار للموضه',
      description: 'عذراً، لم نتمكن من العثور على هذا المنتج في متجر بازار للموضه.',
      robots: { index: false, follow: true },
    };
  }

  const pageTitle = buildProductSeoTitle(product);
  const pageDesc = buildProductSeoDescription(product);
  const keywords = buildProductKeywords(product);

  // 1. Get real product images (filtered from video links)
  const imageOnlyUrls = (product.images || []).filter(isImageUrl);

  // 2. If no direct images, check if there is a video thumbnail (e.g. YouTube)
  let fallbackImage: string | null = null;
  if (imageOnlyUrls.length === 0 && (product as any).videoUrls?.length > 0) {
    for (const vUrl of (product as any).videoUrls) {
      const ytMatch = String(vUrl).match(/(?:youtu\.be\/|youtube\.com\/(?:shorts\/|watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/);
      if (ytMatch) {
        fallbackImage = `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
        break;
      }
    }
  }

  const rawImages = imageOnlyUrls.length > 0
    ? imageOnlyUrls
    : (fallbackImage ? [fallbackImage] : ['/logo3.png']);

  const mainImageUrl = toAbsoluteUrl(rawImages[0]);

  // WhatsApp & Telegram strictly require images under 300KB.
  // Using Next.js Image Optimization ensures any external image (even 2MB+) is compressed to ~100-180KB JPEG.
  const ogImageUrl = mainImageUrl.includes('/logo3.png')
    ? mainImageUrl
    : `${BASE_URL}/_next/image?url=${encodeURIComponent(mainImageUrl)}&w=1200&q=75`;

  const productSlug = (product as any).slug || generateSlug(product.name) || product.id;
  const category = product.categorySlug || getCategorySlugFromName(product.category) || 'general';
  const canonicalUrl = `${BASE_URL}/product/${category}/${productSlug}`;
  const price = product.discountPrice && product.specialOffer ? product.discountPrice : product.price;

  // Single, optimized OpenGraph Image for WhatsApp, Facebook, Telegram
  const ogImages = [
    {
      url: ogImageUrl,
      secureUrl: ogImageUrl,
      width: 1200,
      height: 630,
      alt: product.name,
      type: 'image/jpeg',
    },
  ];

  return {
    title: pageTitle,
    description: pageDesc,
    keywords,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    openGraph: {
      title: pageTitle,
      description: pageDesc,
      url: canonicalUrl,
      images: ogImages,
      type: 'website',
      siteName: `${STORE_NAME} | bazar fashion`,
      locale: 'ar_EG',
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description: pageDesc,
      images: [ogImageUrl],
    },
    other: {
      'product:price:amount': String(price || 0),
      'product:price:currency': 'EGP',
      'product:availability': (product.wholesaleInfo?.quantity ?? 0) > 0 ? 'in stock' : 'out of stock',
      'product:brand': product.brand || 'Bazar',
    },
  };
}

export default async function ProductDetailsPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await fetchProductServerSide(slug);

  if (!product) {
    return <ProductDetails initialProduct={null} />;
  }

  const productSlug = (product as any).slug || generateSlug(product.name) || product.id;
  const category = product.categorySlug || getCategorySlugFromName(product.category) || 'general';
  const canonicalUrl = `${BASE_URL}/product/${category}/${productSlug}`;

  const schemas = buildProductJsonLd(product, canonicalUrl);

  return (
    <>
      {schemas.map((schema, idx) => (
        <script
          key={idx}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <ProductDetails initialProduct={product} />
    </>
  );
}
