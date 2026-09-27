/**
 * Meta (Facebook) Pixel & Conversions API (CAPI) Module for Next.js / React
 * Store: bazar fashion (بازار للموضه)
 */
import { getSiteSettings } from './siteSettings';

export const DEFAULT_PIXEL_CURRENCY = 'EGP';

// Primary Meta Pixel ID
export const HARDCODED_PIXEL_ID = '1363297541964933';
export const HARDCODED_CAPI_TOKEN = '';

export function generateEventId(prefix = 'evt'): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${ts}_${rand}`;
}

export function sanitizePixelValue(value: number | string | undefined | null, fallback = 0): number {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'number') {
    return isNaN(value) || !isFinite(value) ? fallback : Math.max(0, value);
  }
  const cleanedStr = String(value).replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleanedStr);
  return isNaN(parsed) || !isFinite(parsed) ? fallback : Math.max(0, parsed);
}

// 1. إرسال حدث Conversions API (السيرفر)
export async function sendMetaCapiEvent(
  eventName: string,
  customData: Record<string, any>,
  eventId: string
) {
  try {
    const settings = await getSiteSettings().catch(() => ({} as any));
    const pixelId = settings.metaPixelId?.trim() || HARDCODED_PIXEL_ID.trim();
    const accessToken = settings.metaCapiAccessToken?.trim() || HARDCODED_CAPI_TOKEN.trim();
    if (!pixelId || !accessToken || pixelId === 'YOUR_PIXEL_ID_HERE') return;

    const payload = {
      data: [
        {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId,
          event_source_url: typeof window !== 'undefined' ? window.location.href : '',
          action_source: 'website',
          user_data: {
            client_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
          },
          custom_data: customData,
        },
      ],
    };
    const url = `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`;

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(console.warn);
  } catch (err) {
    console.warn(`⚠️ [Meta CAPI] Error:`, err);
  }
}

// 2. إرسال حدث Browser Pixel (المتصفح)
export function trackMetaPixelEvent(
  eventName: string,
  data?: Record<string, any>,
  eventId?: string
) {
  if (typeof window === 'undefined') return;
  const fbq = (window as any).fbq;
  if (typeof fbq !== 'function') return;
  try {
    const payload: Record<string, any> = data ? { ...data } : {};
    if ('value' in payload) payload.value = sanitizePixelValue(payload.value);
    if ('currency' in payload || 'value' in payload) payload.currency = DEFAULT_PIXEL_CURRENCY;
    if (eventId) {
      fbq('track', eventName, payload, { eventID: eventId });
    } else {
      fbq('track', eventName, payload);
    }
  } catch (err) {
    console.warn(`⚠️ [Meta Pixel] Error:`, err);
  }
}

// 3. أحداث المتجر الرئيسية (Standard Meta Ecommerce Events)

/**
 * 1. PageView
 */
export function trackMetaPageView() {
  trackMetaPixelEvent('PageView');
}

/**
 * 2. ViewContent - عند فتح صفحة تفاصيل المنتج أو المعاينة
 */
export function trackMetaViewContent(params: {
  id: string | number;
  name: string;
  price?: number;
  category?: string;
  currency?: string;
}) {
  const eventId = generateEventId('vc');
  const numericValue = sanitizePixelValue(params.price);
  const payload = {
    content_ids: [String(params.id)],
    content_name: params.name,
    content_category: params.category || 'Electronics',
    content_type: 'product',
    value: numericValue,
    currency: params.currency || DEFAULT_PIXEL_CURRENCY,
  };
  trackMetaPixelEvent('ViewContent', payload, eventId);
  sendMetaCapiEvent('ViewContent', payload, eventId);
  return eventId;
}

/**
 * 3. AddToCart - عند إضافة منتج إلى سلة المشتريات
 */
export function trackMetaAddToCart(params: {
  id: string | number;
  name?: string;
  price?: number;
  quantity?: number;
  category?: string;
  currency?: string;
}) {
  const eventId = generateEventId('atc');
  const quantity = params.quantity || 1;
  const unitPrice = sanitizePixelValue(params.price);
  const totalValue = unitPrice * quantity;

  const payload = {
    content_ids: [String(params.id)],
    content_name: params.name,
    content_category: params.category || 'Electronics',
    content_type: 'product',
    value: totalValue,
    currency: params.currency || DEFAULT_PIXEL_CURRENCY,
    num_items: quantity,
  };
  trackMetaPixelEvent('AddToCart', payload, eventId);
  sendMetaCapiEvent('AddToCart', payload, eventId);
  return eventId;
}

/**
 * 4. InitiateCheckout - عند الدخول لصفحة السلة وإتمام الطلب
 */
export function trackMetaInitiateCheckout(
  items: Array<{ productId?: string; id?: string; price?: number; quantity?: number }>,
  totalAmount: number,
  customEventId?: string
): string {
  const eventId = customEventId || generateEventId('ic');
  const numericValue = sanitizePixelValue(totalAmount);
  const productIds = items.map(i => String(i.productId || i.id)).filter(Boolean);
  const totalQuantity = items.reduce((acc, i) => acc + (i.quantity || 1), 0);

  const payload = {
    content_ids: productIds,
    contents: items.map(i => ({
      id: String(i.productId || i.id),
      quantity: i.quantity || 1,
      item_price: sanitizePixelValue(i.price)
    })),
    content_type: 'product',
    value: numericValue,
    currency: DEFAULT_PIXEL_CURRENCY,
    num_items: totalQuantity
  };
  trackMetaPixelEvent('InitiateCheckout', payload, eventId);
  sendMetaCapiEvent('InitiateCheckout', payload, eventId);
  return eventId;
}

/**
 * 5. Purchase - عند تأكيد الطلب بنجاح
 */
export function trackMetaPurchase(
  orderId: string,
  totalAmount: number,
  items: Array<{ productId?: string; id?: string; price?: number; quantity?: number }>,
  customEventId?: string
): string {
  const eventId = customEventId || `pur_${orderId}_${Date.now().toString(36)}`;
  const numericValue = sanitizePixelValue(totalAmount);
  const productIds = items.map(i => String(i.productId || i.id)).filter(Boolean);
  const totalQuantity = items.reduce((acc, i) => acc + (i.quantity || 1), 0);

  const payload = {
    content_ids: productIds,
    contents: items.map(i => ({
      id: String(i.productId || i.id),
      quantity: i.quantity || 1,
      item_price: sanitizePixelValue(i.price)
    })),
    content_type: 'product',
    value: numericValue,
    currency: DEFAULT_PIXEL_CURRENCY,
    order_id: orderId,
    num_items: totalQuantity
  };
  trackMetaPixelEvent('Purchase', payload, eventId);
  sendMetaCapiEvent('Purchase', payload, eventId);
  return eventId;
}

/**
 * 6. Contact / Lead - عند النقر على الواتساب أو الاتصال
 */
export function trackMetaContact(channel = 'WhatsApp') {
  const eventId = generateEventId('cnt');
  const payload = {
    content_name: channel,
    content_category: 'Customer Support'
  };
  trackMetaPixelEvent('Contact', payload, eventId);
  sendMetaCapiEvent('Contact', payload, eventId);
  return eventId;
}

/**
 * 7. Search - عند البحث عن منتجات في المتجر
 */
export function trackMetaSearch(searchQuery: string) {
  if (!searchQuery?.trim()) return;
  const eventId = generateEventId('sch');
  const payload = {
    search_string: searchQuery.trim(),
    content_category: 'Product Search'
  };
  trackMetaPixelEvent('Search', payload, eventId);
  return eventId;
}
