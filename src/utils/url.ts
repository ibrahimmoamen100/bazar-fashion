import { getCategorySlugFromName } from "./category";
import { STORAGE_KEYS } from "@/constants/store";

export const generateSlug = (name: string): string => {
  if (!name) return '';
  return name
    .toLowerCase()
    // Replace dots and special chars with spaces (matches Firebase slugifyProductName)
    .replace(/[^\p{L}\p{N}\s-]+/gu, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-'); // Collapse multiple hyphens
};

const supplierSlugCacheMap = new Map<string, string>();

export const registerSupplierSlug = (name?: string, slug?: string) => {
  if (name && slug) {
    const cleanName = name.trim().toLowerCase();
    const cleanSlug = slug.trim().toLowerCase();
    supplierSlugCacheMap.set(cleanName, cleanSlug);
    supplierSlugCacheMap.set(cleanSlug, cleanSlug);
  }
};

export const slugifySupplier = (supplierSlugOrName?: string): string => {
  if (!supplierSlugOrName || !supplierSlugOrName.trim()) return 'shops';
  const raw = supplierSlugOrName.trim();
  const lower = raw.toLowerCase();

  if (supplierSlugCacheMap.has(lower)) {
    return supplierSlugCacheMap.get(lower)!;
  }

  // Auto-hydrate from sessionStorage if available in browser
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEYS.suppliersCache) || sessionStorage.getItem('bazar_active_suppliers_cache');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed?.data)) {
          for (const s of parsed.data) {
            if (s.name && s.slug) {
              registerSupplierSlug(s.name, s.slug);
            }
          }
        }
      }
    } catch {}
    if (supplierSlugCacheMap.has(lower)) {
      return supplierSlugCacheMap.get(lower)!;
    }
  }

  return raw
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\u0600-\u06FFa-zA-Z0-9-]/g, '')
    .replace(/-+/g, '-');
};

export const getProductUrl = (
  idOrProduct: string | any,
  name?: string,
  category?: string,
  _subcategoryOrSupplier?: string,
  _supplierNameOrSlug?: string,
  slug?: string
): string => {
  let prodName = name || '';
  let prodCat = category || '';
  let prodId = '';
  let prodSlug = slug || '';

  if (typeof idOrProduct === 'object' && idOrProduct !== null) {
    const p = idOrProduct;
    prodId = p.id || '';
    prodName = p.name || '';
    prodCat = p.category || p.categorySlug || '';
    prodSlug = p.slug || prodSlug;
  } else {
    prodId = idOrProduct || '';
  }

  const cleanSlug = prodSlug?.trim() ? generateSlug(prodSlug.trim()) : '';
  const pSlug = cleanSlug || generateSlug(prodName) || prodId;
  const catSlug = prodCat ? getCategorySlugFromName(prodCat) : "general";

  return `/product/${catSlug}/${pSlug}`;
};

export const extractProductId = (slugOrId: string | undefined): string | undefined => {
  if (!slugOrId) return undefined;
  if (slugOrId.includes('--')) {
    return slugOrId.split('--').pop();
  }
  return slugOrId;
};

/**
 * Convert any YouTube, Facebook, or TikTok video URL into an embeddable iframe src.
 * Supports Shorts, Watch, Mobile (m.youtube.com), youtu.be, Facebook reels, TikTok.
 */
export function getVideoEmbedUrl(url: string, autoplay: boolean = true): string {
  if (!url) return '';
  const cleanUrl = url.trim();

  // 1. YouTube URLs
  if (cleanUrl.includes('youtube') || cleanUrl.includes('youtu.be')) {
    let videoId = '';

    // Shorts or Embed match: /shorts/ID or /embed/ID
    const shortsMatch = cleanUrl.match(/\/(?:shorts|embed)\/([a-zA-Z0-9_-]+)/);
    if (shortsMatch && shortsMatch[1]) videoId = shortsMatch[1];

    // Standard watch match: ?v=ID or &v=ID
    if (!videoId) {
      const watchMatch = cleanUrl.match(/[?&]v=([a-zA-Z0-9_-]+)/);
      if (watchMatch && watchMatch[1]) videoId = watchMatch[1];
    }

    // Short link match: youtu.be/ID
    if (!videoId) {
      const youtuMatch = cleanUrl.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
      if (youtuMatch && youtuMatch[1]) videoId = youtuMatch[1];
    }

    if (videoId) {
      const autoParam = autoplay ? '&autoplay=1' : '';
      return `https://www.youtube.com/embed/${videoId}?rel=0&playsinline=1${autoParam}`;
    }
  }

  // 2. TikTok URLs
  if (cleanUrl.includes('tiktok.com')) {
    const videoMatch = cleanUrl.match(/\/video\/(\d+)/);
    if (videoMatch && videoMatch[1]) {
      return `https://www.tiktok.com/embed/v2/${videoMatch[1]}`;
    }
  }

  // 3. Facebook URLs
  if (cleanUrl.includes('facebook') || cleanUrl.includes('fb.watch')) {
    const autoParam = autoplay ? '&autoplay=true' : '';
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(cleanUrl)}&show_text=false&width=500${autoParam}`;
  }

  return cleanUrl;
}

/**
 * Extract a high-quality video thumbnail image (e.g. YouTube hqdefault / maxresdefault)
 * or return the provided fallback image URL (e.g. for Facebook reels or other hosts).
 */
export function getVideoThumbnailUrl(url: string, fallbackUrl?: string): string {
  if (!url) return fallbackUrl || '';
  const cleanUrl = url.trim();

  // YouTube URLs (Shorts, standard, embed, youtu.be)
  if (cleanUrl.includes('youtube') || cleanUrl.includes('youtu.be')) {
    const shortsMatch = cleanUrl.match(/\/(?:shorts|embed)\/([a-zA-Z0-9_-]+)/);
    const watchMatch = cleanUrl.match(/[?&]v=([a-zA-Z0-9_-]+)/);
    const youtuMatch = cleanUrl.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    const videoId = shortsMatch?.[1] || watchMatch?.[1] || youtuMatch?.[1];
    if (videoId) return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }

  return fallbackUrl || '';
}

/**
 * Detect video platform and return metadata:
 * - platform: 'youtube' | 'facebook' | 'tiktok' | 'unknown'
 * - channelUrl: URL to the channel/page on the platform
 * - avatarUrl: Avatar of the channel (via unavatar.io for YouTube/TikTok, or logo fallback for Facebook)
 */
export interface VideoMeta {
  platform: 'youtube' | 'facebook' | 'tiktok' | 'unknown';
  channelUrl: string;
  avatarUrl: string;
  channelHandle: string;
  authorName?: string;
}

export function getVideoMeta(url: string): VideoMeta {
  if (!url) return { platform: 'unknown', channelUrl: '', avatarUrl: '', channelHandle: '', authorName: '' };
  const cleanUrl = url.trim();

  // 1. YouTube
  if (cleanUrl.includes('youtube') || cleanUrl.includes('youtu.be')) {
    // Try to extract channel handle from URL (e.g. youtube.com/@handle/...)
    const handleMatch = cleanUrl.match(/youtube\.com\/@([\w.-]+)/);
    const channelHandle = handleMatch?.[1] || '';
    const channelUrl = channelHandle
      ? `https://www.youtube.com/@${channelHandle}`
      : cleanUrl; // Fallback directly to the video URL so it never redirects to YouTube homepage!
    // unavatar.io can fetch YouTube channel avatars by handle
    const avatarUrl = channelHandle
      ? `https://unavatar.io/youtube/@${channelHandle}`
      : '';
    return {
      platform: 'youtube',
      channelUrl,
      avatarUrl,
      channelHandle,
      authorName: channelHandle ? `@${channelHandle}` : '',
    };
  }

  // 2. TikTok — extract @username from URL
  if (cleanUrl.includes('tiktok.com')) {
    const userMatch = cleanUrl.match(/tiktok\.com\/@([\w.]+)/);
    const channelHandle = userMatch?.[1] || '';
    const channelUrl = channelHandle
      ? `https://www.tiktok.com/@${channelHandle}`
      : cleanUrl; // Fallback to video URL directly
    const avatarUrl = channelHandle
      ? `https://unavatar.io/tiktok/${channelHandle}`
      : '';
    return {
      platform: 'tiktok',
      channelUrl,
      avatarUrl,
      channelHandle,
      authorName: channelHandle ? `@${channelHandle}` : '',
    };
  }

  // 3. Facebook — extract page name or user from URL
  if (cleanUrl.includes('facebook.com') || cleanUrl.includes('fb.watch')) {
    // e.g. facebook.com/BazarElectronics1/videos/...
    const pageMatch = cleanUrl.match(/facebook\.com\/([^/?#]+)/);
    const rawHandle = pageMatch?.[1] || '';
    const ignoredHandles = ['watch', 'reel', 'reels', 'share', 'stories', 'photo', 'video', 'videos', 'p'];
    const channelHandle = rawHandle && !ignoredHandles.includes(rawHandle.toLowerCase()) ? rawHandle : '';
    const channelUrl = channelHandle
      ? `https://www.facebook.com/${channelHandle}`
      : cleanUrl; // Fallback directly to video URL
    // Facebook graph avatars are publicly accessible for pages
    const avatarUrl = channelHandle
      ? `https://graph.facebook.com/${channelHandle}/picture?type=large`
      : 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Facebook_Logo_%282019%29.png/200px-Facebook_Logo_%282019%29.png';
    return {
      platform: 'facebook',
      channelUrl,
      avatarUrl,
      channelHandle,
      authorName: channelHandle,
    };
  }

  return { platform: 'unknown', channelUrl: cleanUrl, avatarUrl: '', channelHandle: '', authorName: '' };
}

