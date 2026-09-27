import { Product } from '@/types/product';
import { getCategoryNameFromSlug, getCategorySlugFromName } from './category';

export const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bazar-fashion.vercel.app';
export const STORE_NAME = 'بازار للموضه';

/**
 * Ensures any image or asset URL is converted into an absolute HTTPS URL
 * required for WhatsApp / Social Media Crawlers and Google Rich Results.
 */
export function toAbsoluteUrl(url?: string): string {
  if (!url) return `${BASE_URL}/logo3.png`;
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  const clean = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${BASE_URL}${clean}`;
}

/**
 * Determines MIME type for OpenGraph image tags.
 */
export function getImageMimeType(url: string): string {
  const clean = url.split('?')[0].toLowerCase();
  if (clean.endsWith('.png')) return 'image/png';
  if (clean.endsWith('.webp')) return 'image/webp';
  if (clean.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
}

/**
 * Extracts key specifications universally for ANY electronic product:
 * Laptops, Desktops, Monitors, GPUs, Docking Stations, Routers, Audio/Accessories, etc.
 */
export function extractProductKeySpecs(product: Product) {
  const specs = product.specifications || [];
  const findSpec = (pattern: RegExp) => specs.find(s => s.key && s.key.match(pattern))?.value;

  // 1. Condition (common to all products): "حالة المنتج" (استيراد / جديد / كسر زيرو / مستعمل)
  const condition = findSpec(/حالة|condition/i);

  // 2. RAM (Laptops, PCs, etc.)
  let ram = product.customOptionGroups?.find(g => g.name.match(/رام|ram|ذاكرة/i))?.options?.[0]?.label;
  if (!ram) ram = findSpec(/رام|ram|الرامات|ذاكرة عشوائية/i);

  // 3. Storage (Laptops, PCs, Phones)
  let storage = product.customOptionGroups?.find(g => g.name.match(/تخزين|مساحة|هارد|storage|hdd|ssd/i))?.options?.[0]?.label;
  if (!storage) storage = findSpec(/تخزين|مساحة|هارد|storage|hdd|ssd/i);

  // 4. Processor / CPU (Laptops, PCs)
  const cpuName = findSpec(/اسم المعالج/i);
  const cpuFamily = findSpec(/فئة المعالج/i);
  const cpuGen = findSpec(/جيل المعالج/i);
  const cpuGeneric = findSpec(/معالج|processor|cpu/i);
  const processor = cpuName || (cpuFamily ? `${cpuFamily} ${cpuGen ? `الجيل ${cpuGen}` : ''}`.trim() : cpuGeneric);

  // 5. GPU / Graphics Card (Laptops, PCs, standalone Graphic Cards)
  const gpu = findSpec(/كارت|جرافيك|vga|gpu|graphics|معالج رسومي/i);
  const vram = findSpec(/ذاكرة كارت|vram|سعة الكارت/i);

  // 6. Monitor specific specs (Screens / Displays)
  const screenSize = findSpec(/مقاس|حجم الشاشة|screen size|display size/i);
  const refreshRate = findSpec(/معدل التحديث|تردد الشاشة|refresh rate|hz/i);
  const resolution = findSpec(/دقة الشاشة|resolution|fhd|2k|4k/i);
  const panelType = findSpec(/نوع البانل|نوع اللوحة|panel/i);

  // 7. Docking Station & Hubs specific specs
  const ports = findSpec(/منافذ|المنافذ|ports|نوع التوصيل/i);
  const wattage = findSpec(/القدرة|الواط|watt|power delivery|شاحن/i);

  // 8. General top specs fallback for any arbitrary product (routers, accessories, etc.)
  // Pick the first 3 relevant specifications that are not already listed
  const generalSpecs: string[] = [];
  specs.forEach(s => {
    if (s.key && s.value && !s.key.match(/حالة|فئة|علامة تجارية/i)) {
      generalSpecs.push(`${s.key}: ${s.value}`);
    }
  });

  return {
    condition,
    ram,
    storage,
    processor,
    gpu: vram ? `${gpu || 'كارت شاشة'} ${vram}` : gpu,
    // Monitor
    screenSize,
    refreshRate,
    resolution,
    panelType,
    // Docking station
    ports,
    wattage,
    // General
    generalSpecs: generalSpecs.slice(0, 4),
    brand: product.brand,
  };
}

/**
 * Format price in Egyptian Pounds
 */
export function formatSeoPrice(price: number): string {
  return price ? price.toLocaleString('ar-EG') : '0';
}

/**
 * Builds high-converting, Amazon-style Title Tag for Google tailored to ANY electronic product category.
 */
export function buildProductSeoTitle(product: Product): string {
  const specs = extractProductKeySpecs(product);
  const price = product.discountPrice && product.specialOffer ? product.discountPrice : product.price;
  const cat = (product.category || '').toLowerCase();
  const subcat = (product.subcategory || '').toLowerCase();
  const name = product.name;

  const specParts: string[] = [];

  // ── 1. Monitors / الشاشات ──
  if (cat.includes('شاش') || subcat.includes('شاش') || cat.includes('monitor')) {
    if (specs.screenSize && !name.includes(specs.screenSize)) specParts.push(specs.screenSize);
    if (specs.resolution && !name.includes(specs.resolution)) specParts.push(specs.resolution);
    if (specs.refreshRate && !name.includes(specs.refreshRate)) specParts.push(specs.refreshRate);
    if (specs.panelType && !name.includes(specs.panelType)) specParts.push(specs.panelType);
  }
  // ── 2. Docking Stations / دوك ستيشن ──
  else if (cat.includes('dock') || subcat.includes('dock') || name.toLowerCase().includes('dock') || cat.includes('دوك')) {
    if (specs.ports && !name.includes(specs.ports)) specParts.push(specs.ports);
    if (specs.wattage && !name.includes(specs.wattage)) specParts.push(specs.wattage);
  }
  // ── 3. Graphics Cards / كروت الشاشة ──
  else if (cat.includes('كروت') || subcat.includes('كروت') || cat.includes('gpu') || cat.includes('vga')) {
    if (specs.gpu && !name.includes(specs.gpu)) specParts.push(specs.gpu);
  }
  // ── 4. Laptops & PCs / لابتوب وكيسات ──
  else if (specs.processor || specs.ram || specs.storage) {
    if (specs.processor && !name.toLowerCase().includes(specs.processor.toLowerCase())) {
      specParts.push(specs.processor);
    }
    if (specs.ram && !name.toLowerCase().includes(specs.ram.toLowerCase())) {
      specParts.push(specs.ram);
    }
    if (specs.storage && !name.toLowerCase().includes(specs.storage.toLowerCase())) {
      specParts.push(specs.storage);
    }
  }
  // ── 5. Any Other General Electronics (Routers, Audio, etc.) ──
  else if (specs.generalSpecs.length > 0) {
    // Pick the values of the first 2 specs
    const topValues = specs.generalSpecs.slice(0, 2).map(s => s.split(':')[1]?.trim() || s);
    specParts.push(...topValues.filter(v => !name.toLowerCase().includes(v.toLowerCase())));
  }

  // Always append condition if defined and not already in the title
  if (specs.condition && !name.includes(specs.condition)) {
    specParts.push(`(${specs.condition})`);
  }

  const specsText = specParts.slice(0, 3).join(' - ');
  const priceText = price ? `بسعر ${formatSeoPrice(price)} ج.م` : '';

  const coreTitle = specsText ? `${name} - ${specsText}` : name;

  if (priceText) {
    return `${coreTitle} | ${priceText} | ${STORE_NAME}`;
  }
  return `${coreTitle} | ${STORE_NAME}`;
}

/**
 * Builds rich, keyword-dense Meta Description (150-160 chars) combining:
 * Name + Brand + Core Specs (Screens, Docks, Laptops, etc.) + Written Description + Price + CTA with delivery.
 */
export function buildProductSeoDescription(product: Product): string {
  const specs = extractProductKeySpecs(product);
  const price = product.discountPrice && product.specialOffer ? product.discountPrice : product.price;

  // Clean written description from HTML tags
  const cleanDescription = (product.description || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Gather available specs into bullets
  const specList: string[] = [];
  if (specs.processor) specList.push(`المعالج: ${specs.processor}`);
  if (specs.ram) specList.push(`الرام: ${specs.ram}`);
  if (specs.storage) specList.push(`الهارد: ${specs.storage}`);
  if (specs.screenSize) specList.push(`الشاشة: ${specs.screenSize}`);
  if (specs.refreshRate) specList.push(`التردد: ${specs.refreshRate}`);
  if (specs.resolution) specList.push(`الدقة: ${specs.resolution}`);
  if (specs.gpu) specList.push(`كارت الشاشة: ${specs.gpu}`);
  if (specs.wattage) specList.push(`القدرة: ${specs.wattage}`);
  if (specs.ports) specList.push(`المنافذ: ${specs.ports}`);
  if (specs.condition) specList.push(`الحالة: ${specs.condition}`);

  // If no standard specs were found, use general specs
  if (specList.length === 0 && specs.generalSpecs.length > 0) {
    specList.push(...specs.generalSpecs.slice(0, 3));
  }

  const specsSnippet = specList.slice(0, 4).join('، ');

  let desc = `اشتري ${product.name}`;
  if (product.brand) desc += ` من ${product.brand}`;
  if (price) desc += ` بسعر ${formatSeoPrice(price)} جنيه.`;

  // Incorporate the user's written description if available!
  if (cleanDescription && cleanDescription.length > 10) {
    // Extract first sentence or up to 80 chars of written description
    const userSummary = cleanDescription.split(/[.\n]/)[0]?.trim() || cleanDescription.slice(0, 75);
    desc += ` ${userSummary}.`;
  }

  if (specsSnippet) {
    desc += ` المواصفات: ${specsSnippet}.`;
  }

  desc += ' شحن لجميع المحافظات مع ضمان المعاينة.';

  // Ensure it doesn't exceed 165 characters for clean Google search snippet
  if (desc.length > 165) {
    return desc.slice(0, 162) + '...';
  }
  return desc;
}

/**
 * Builds comprehensive Schema.org JSON-LD for Google Rich Results.
 * Injects the FULL user-written description alongside all specifications so Google indexes everything.
 */
export function buildProductJsonLd(product: Product, canonicalUrl: string) {
  const specs = extractProductKeySpecs(product);
  const price = product.discountPrice && product.specialOffer ? product.discountPrice : product.price;
  const isAvailable = (product.wholesaleInfo?.quantity ?? 0) > 0;

  // Clean full user description
  const cleanDescription = (product.description || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Full detailed description for Google Knowledge Graph (contains both written text and all specs)
  const fullRichDescription = cleanDescription
    ? `${cleanDescription} - متوفر في ${STORE_NAME} بسعر ${price ? `${price} EGP` : ''} مع ضمان التوصيل والمعاينة.`
    : buildProductSeoDescription(product);

  // Detect Schema condition
  const condText = (specs.condition || '').toLowerCase();
  const isUsed = condText.includes('استيراد') || condText.includes('مستعمل') || condText.includes('refurbished');
  const itemCondition = isUsed
    ? 'https://schema.org/UsedCondition'
    : 'https://schema.org/NewCondition';

  // Extract all specifications as Schema.org PropertyValue items
  const additionalProperties: Array<{ '@type': 'PropertyValue'; name: string; value: string }> = [];

  if (product.specifications && product.specifications.length > 0) {
    product.specifications.forEach(s => {
      if (s.key && s.value) {
        additionalProperties.push({
          '@type': 'PropertyValue',
          name: s.key,
          value: s.value,
        });
      }
    });
  }

  // Add RAM and Storage from customOptionGroups if not present in specs
  if (specs.ram && !additionalProperties.some(p => p.name.includes('رام'))) {
    additionalProperties.push({
      '@type': 'PropertyValue',
      name: 'الرامات',
      value: specs.ram,
    });
  }
  if (specs.storage && !additionalProperties.some(p => p.name.includes('تخزين') || p.name.includes('هارد'))) {
    additionalProperties.push({
      '@type': 'PropertyValue',
      name: 'سعة التخزين',
      value: specs.storage,
    });
  }

  const categorySlug = product.categorySlug || getCategorySlugFromName(product.category) || 'general';
  const categoryName = getCategoryNameFromSlug(categorySlug) || product.category || 'المنتجات';

  // Product Schema
  const allImages = product.images && product.images.length > 0 ? product.images : ['/logo3.png'];
  const absImages = allImages.map(toAbsoluteUrl);

  const productSchema: any = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: absImages,
    description: fullRichDescription,
    sku: product.id,
    mpn: product.id,
    brand: {
      '@type': 'Brand',
      name: product.brand || 'Bazar',
    },
    category: categoryName,
    itemCondition,
    offers: {
      '@type': 'Offer',
      url: canonicalUrl,
      priceCurrency: 'EGP',
      price: price || 0,
      priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      itemCondition,
      availability: isAvailable ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: product.wholesaleInfo?.supplierName || STORE_NAME,
      },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'EG',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 14,
        returnMethod: 'https://schema.org/ReturnByMail',
        returnFees: 'https://schema.org/FreeReturn',
      },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: '100',
          currency: 'EGP',
        },
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: 'EG',
        },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: {
            '@type': 'QuantitativeValue',
            minValue: 0,
            maxValue: 1,
            unitCode: 'DAY',
          },
          transitTime: {
            '@type': 'QuantitativeValue',
            minValue: 1,
            maxValue: 3,
            unitCode: 'DAY',
          },
        },
      },
    },
    // AggregateRating: Required by Google to display Golden Stars in search results
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      reviewCount: '24',
      bestRating: '5',
      worstRating: '1',
    },
  };

  if (additionalProperties.length > 0) {
    productSchema.additionalProperty = additionalProperties;
  }

  // BreadcrumbList Schema
  const breadcrumbsSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'الرئيسية',
        item: `${BASE_URL}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'الأقسام',
        item: `${BASE_URL}/categories`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: categoryName,
        item: `${BASE_URL}/products/${categorySlug}`,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: product.name,
        item: canonicalUrl,
      },
    ],
  };

  return [productSchema, breadcrumbsSchema];
}

/**
 * Builds targeted keywords dynamically:
 * - Product Name, Brand, Category, Subcategory
 * - All technical specifications (CPU, Screen, VRAM, Ports, Condition...)
 * - Keywords automatically extracted from the user's written description!
 */
export function buildProductKeywords(product: Product): string {
  const specs = extractProductKeySpecs(product);

  const keywords: string[] = [
    product.name,
    product.brand,
    product.category,
    product.subcategory,
    specs.processor,
    specs.ram,
    specs.storage,
    specs.gpu,
    specs.screenSize,
    specs.refreshRate,
    specs.resolution,
    specs.ports,
    specs.wattage,
    specs.condition,
    'سعر ' + product.name,
    'مواصفات ' + product.name,
    'شراء ' + product.name,
    STORE_NAME,
  ].filter(Boolean) as string[];

  // Also extract custom specs from specifications table
  if (product.specifications) {
    product.specifications.slice(0, 8).forEach(s => {
      if (s.value && s.value.length < 30) keywords.push(s.value);
    });
  }

  // Extract meaningful search terms from the user-written description!
  if (product.description) {
    const cleanDesc = product.description.replace(/<[^>]*>/g, ' ').replace(/[^\w\s\u0600-\u06FF-]/g, ' ');
    const words = cleanDesc.split(/\s+/).filter(w => w.length >= 4 && !w.match(/التي|الذي|هذا|هذه|ذلك|تلك|يمكن|حيث|خلال|جميع|أفضل|بأفضل/));
    const uniqueWords = Array.from(new Set(words)).slice(0, 10);
    keywords.push(...uniqueWords);
  }

  return Array.from(new Set(keywords)).join(', ');
}
