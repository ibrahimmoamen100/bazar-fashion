import { Helmet } from 'react-helmet-async';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';

interface SEOHelmetProps {
    title?: string;
    description?: string;
    keywords?: string;
    image?: string;
    url?: string;
    type?: 'website' | 'product' | 'article';
    productData?: {
        name: string;
        brand?: string;
        price?: number;
        currency?: string;
        availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
        condition?: 'NewCondition' | 'UsedCondition' | 'RefurbishedCondition';
        sku?: string;
        category?: string;
        description?: string;
    };
    breadcrumbs?: Array<{ name: string; url: string }>;
}

export const SEOHelmet = ({
    title,
    description,
    keywords,
    image,
    url,
    type = 'website',
    productData,
    breadcrumbs,
}: SEOHelmetProps) => {
    const { settings } = useSiteSettings();

    const baseUrl = settings.seoBaseUrl || 'https://bazar-fashion.vercel.app';
    const storeName = settings.storeName || 'بازار للموضه';
    const defTitle = settings.seoTitle || `${storeName} | لابتوب - هواتف - شاشات - إكسسوارات`;
    const defDesc = settings.seoDescription || 'متجرك الشامل للأجهزة الإلكترونية في مصر: لابتوبات، هواتف، شاشات، وإكسسوارات بأفضل الأسعار.';
    const defKw = settings.seoKeywords || 'بازار للموضه, bazar fashion, لابتوب, هاتف, شاشة, إكسسوارات, معدات تصوير, مصر';
    // Use favicon.png from public folder as favicon
    const faviconHref = '/favicon.png';
    const defImage = settings.seoImage || settings.logoUrl || faviconHref;

    const fullUrl = url ? `${baseUrl}${url}` : baseUrl;
    const absImage = image
        ? (image.startsWith('http') ? image : `${baseUrl}${image}`)
        : (defImage.startsWith('http') ? defImage : `${baseUrl}${defImage}`);

    // Title: for product pages use full descriptive title; for others prepend store
    const pageTitle = title
        ? (title.includes(storeName) ? title : `${title} | ${storeName}`)
        : defTitle;

    const pageDescription = description || defDesc;
    const pageKeywords = keywords || defKw;

    // Product Schema (schema.org/Product)
    const productSchema = productData ? {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": productData.name,
        "image": absImage,
        "description": productData.description || pageDescription,
        "sku": productData.sku || '',
        "brand": { "@type": "Brand", "name": productData.brand || storeName },
        "category": productData.category || '',
        "offers": {
            "@type": "Offer",
            "url": fullUrl,
            "priceCurrency": productData.currency || "EGP",
            "price": productData.price || 0,
            "availability": `https://schema.org/${productData.availability || 'InStock'}`,
            "itemCondition": `https://schema.org/${productData.condition || 'NewCondition'}`,
            "seller": { "@type": "Organization", "name": storeName }
        }
    } : null;

    // BreadcrumbList Schema
    const breadcrumbItems = [
        { "@type": "ListItem", "position": 1, "name": "الرئيسية", "item": baseUrl },
        ...(breadcrumbs || []).map((b, i) => ({
            "@type": "ListItem",
            "position": i + 2,
            "name": b.name,
            "item": b.url.startsWith('http') ? b.url : `${baseUrl}${b.url}`
        })),
        // Add current page if URL provided and no breadcrumbs array
        ...(url && url !== '/' && (!breadcrumbs || breadcrumbs.length === 0) ? [{
            "@type": "ListItem",
            "position": 2,
            "name": title || 'صفحة',
            "item": fullUrl
        }] : [])
    ];

    const breadcrumbSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": breadcrumbItems
    };

    // WebSite Schema with SearchAction
    const websiteSchema = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": storeName,
        "alternateName": ["bazar fashion", "بازار للموضه - ملابس - أحذيه"],
        "url": baseUrl,
        "potentialAction": {
            "@type": "SearchAction",
            "target": {
                "@type": "EntryPoint",
                "urlTemplate": `${baseUrl}/products?search={search_term_string}`
            },
            "query-input": "required name=search_term_string"
        }
    };

    return (
        <Helmet>
            {/* Primary */}
            <title>{pageTitle}</title>
            <meta name="title" content={pageTitle} />
            <meta name="description" content={pageDescription} />
            {pageKeywords && <meta name="keywords" content={pageKeywords} />}
            <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />

            {/* Favicon – dynamically from store logo */}
            <link rel="icon" type="image/png" href={faviconHref} />
            <link rel="shortcut icon" type="image/png" href={faviconHref} />
            <link rel="apple-touch-icon" href={faviconHref} />

            {/* Canonical */}
            <link rel="canonical" href={fullUrl} />

            {/* Open Graph */}
            <meta property="og:type" content={type === 'product' ? 'og:product' : 'website'} />
            <meta property="og:url" content={fullUrl} />
            <meta property="og:title" content={pageTitle} />
            <meta property="og:description" content={pageDescription} />
            <meta property="og:image" content={absImage} />
            <meta property="og:image:secure_url" content={absImage} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta property="og:image:alt" content={pageTitle} />
            <meta property="og:site_name" content={storeName} />
            <meta property="og:locale" content="ar_EG" />

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:url" content={fullUrl} />
            <meta name="twitter:title" content={pageTitle} />
            <meta name="twitter:description" content={pageDescription} />
            <meta name="twitter:image" content={absImage} />
            <meta name="twitter:image:alt" content={pageTitle} />

            {/* Structured Data */}
            {productSchema && (
                <script type="application/ld+json">{JSON.stringify(productSchema)}</script>
            )}
            <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
            <script type="application/ld+json">{JSON.stringify(websiteSchema)}</script>
        </Helmet>
    );
};
