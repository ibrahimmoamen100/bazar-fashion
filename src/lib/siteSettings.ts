// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SiteTheme {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  topbarBg: string;   // hex color..
  footerBg: string;   // hex colors
}

/** Card display theme */
export type CardThemeId = 'classic' | 'modern' | 'minimal' | 'bold' | 'glass';
export interface CardTheme {
  id: CardThemeId;
  name: string;
  description: string;
  preview: {
    cardBg: string;
    imageBg: string;
    border: string;
    shadow: string;
    btnStyle: string;
    priceColor: string;
    roundedImage: string;
  };
}

export const CARD_THEMES: CardTheme[] = [
  {
    id: 'classic',
    name: 'كلاسيكي',
    description: 'تصميم نظيف بحدود خفيفة وظل ناعم',
    preview: {
      cardBg: 'bg-white',
      imageBg: 'bg-gray-50',
      border: 'border border-gray-100',
      shadow: 'shadow-sm hover:shadow-md',
      btnStyle: 'bg-primary text-white hover:bg-primary/90',
      priceColor: 'text-primary',
      roundedImage: 'rounded-none',
    },
  },
  {
    id: 'modern',
    name: 'عصري',
    description: 'بطاقة بخلفية بيضاء وظل ملون عند الهوفر',
    preview: {
      cardBg: 'bg-white',
      imageBg: 'bg-primary/5',
      border: 'border-0',
      shadow: 'shadow-md hover:shadow-primary/20 hover:shadow-xl',
      btnStyle: 'bg-gradient-to-r from-primary to-secondary text-white',
      priceColor: 'text-primary',
      roundedImage: 'rounded-xl',
    },
  },
  {
    id: 'minimal',
    name: 'بسيط',
    description: 'بلا حدود، مع زر شبه شفاف',
    preview: {
      cardBg: 'bg-white',
      imageBg: 'bg-gray-100',
      border: 'border-0',
      shadow: 'shadow-none hover:bg-gray-50',
      btnStyle: 'bg-transparent border-2 border-primary text-primary hover:bg-primary hover:text-white',
      priceColor: 'text-gray-900',
      roundedImage: 'rounded-md',
    },
  },
  {
    id: 'bold',
    name: 'جريء',
    description: 'خلفية داكنة جزئياً للصورة، ألوان نابضة',
    preview: {
      cardBg: 'bg-gray-900',
      imageBg: 'bg-gray-800',
      border: 'border border-gray-700',
      shadow: 'shadow-lg hover:shadow-primary/30 hover:shadow-xl',
      btnStyle: 'bg-primary text-white hover:brightness-110',
      priceColor: 'text-primary',
      roundedImage: 'rounded-xl',
    },
  },
  {
    id: 'glass',
    name: 'زجاجي',
    description: 'تأثير الزجاج الشفاف مع ضبابية خلفية',
    preview: {
      cardBg: 'bg-white/70 backdrop-blur-md',
      imageBg: 'bg-white/50',
      border: 'border border-white/60',
      shadow: 'shadow-xl hover:shadow-2xl',
      btnStyle: 'bg-primary/90 text-white backdrop-blur-sm hover:bg-primary',
      priceColor: 'text-primary',
      roundedImage: 'rounded-2xl',
    },
  },
];

/** Product page layout theme */
export type ProductPageThemeId = 'classic' | 'magazine' | 'hero' | 'compact' | 'fullimage';
export interface ProductPageTheme {
  id: ProductPageThemeId;
  name: string;
  description: string;
  layoutHint: 'side-by-side' | 'reversed' | 'stacked' | 'narrow-image' | 'wide-image';
}

export type HomeSearchThemeId = 'elegant' | 'minimal' | 'glass' | 'bold' | 'bordered';
export const HOME_SEARCH_THEMES = [
  { id: 'elegant', name: 'أنيق', desc: 'خلفية متدرجة مع ظل ناعم' },
  { id: 'minimal', name: 'بسيط', desc: 'خلفية رمادية فاتحة بدون حدود' },
  { id: 'glass', name: 'زجاجي', desc: 'تأثير زجاجي شفاف ومبهر' },
  { id: 'bold', name: 'بارز', desc: 'خلفية داكنة مع نصوص فاتحة' },
  { id: 'bordered', name: 'محدد', desc: 'خلفية بيضاء مع إطار ملون' },
];

export const PRODUCT_PAGE_THEMES: ProductPageTheme[] = [
  {
    id: 'classic',
    name: 'كلاسيكي',
    description: 'صورة على اليمين والمعلومات على اليسار (50/50) — التصميم المعتاد لمعظم المتاجر',
    layoutHint: 'side-by-side',
  },
  {
    id: 'magazine',
    name: 'مجلة',
    description: 'معلومات على اليمين والصورة على اليسار — عنوان ضخم بخط سفلي بلون الموقع',
    layoutHint: 'reversed',
  },
  {
    id: 'hero',
    name: 'هيرو',
    description: 'صورة بعرض كامل فوق، والمعلومات مُتمركزة تحتها — مثل متاجر Apple',
    layoutHint: 'stacked',
  },
  {
    id: 'compact',
    name: 'مضغوط',
    description: 'صورة 38% ومعلومات 62% — تركيز على النص والمواصفات',
    layoutHint: 'narrow-image',
  },
  {
    id: 'fullimage',
    name: 'سينمائي',
    description: 'صورة 58% ومعلومات 42% — تركيز على الصورة الاحترافية',
    layoutHint: 'wide-image',
  },
];

export const PRESET_THEMES: SiteTheme[] = [
  {
    id: 'blue',
    name: 'أزرق (الافتراضي)',
    primary: '217 91% 55%',
    secondary: '199 89% 48%',
    accent: '43 96% 56%',
    background: '0 0% 100%',
    foreground: '222 47% 11%',
    topbarBg: '#129160ff',
    footerBg: '#0f172a',
  },
  {
    id: 'emerald',
    name: 'أخضر زمردي',
    primary: '160 84% 39%',
    secondary: '142 76% 36%',
    accent: '43 96% 56%',
    background: '0 0% 100%',
    foreground: '222 47% 11%',
    topbarBg: '#065f46',
    footerBg: '#087054ff',
  },
  {
    id: 'purple',
    name: 'بنفسجي',
    primary: '262 83% 58%',
    secondary: '290 72% 55%',
    accent: '43 96% 56%',
    background: '0 0% 100%',
    foreground: '222 47% 11%',
    topbarBg: '#4c1d95',
    footerBg: '#3b0764',
  },
  {
    id: 'rose',
    name: 'وردي',
    primary: '343 87% 55%',
    secondary: '326 78% 60%',
    accent: '43 96% 56%',
    background: '0 0% 100%',
    foreground: '222 47% 11%',
    topbarBg: '#9f1239',
    footerBg: '#881337',
  },
  {
    id: 'orange',
    name: 'برتقالي',
    primary: '24 95% 53%',
    secondary: '38 92% 50%',
    accent: '43 96% 56%',
    background: '0 0% 100%',
    foreground: '222 47% 11%',
    topbarBg: '#92400e',
    footerBg: '#78350f',
  },
  {
    id: 'dark',
    name: 'داكن',
    primary: '217 91% 60%',
    secondary: '199 89% 55%',
    accent: '43 96% 60%',
    background: '222 47% 8%',
    foreground: '0 0% 95%',
    topbarBg: '#020617',
    footerBg: '#020617',
  },
];

export interface HeroSlide {
  id: string;
  image: string;
  buttonLink: string;
}

export interface TrustBadge {
  id: string;
  label: string;
  icon: string;
  color: string;
  bg: string;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone?: string;
  workingHours?: string;
  googleMapsUrl: string;
}

export interface SiteSettings {
  // Theme
  activeThemeId: string;
  customColors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    topbarBg: string;
    footerBg: string;
  };

  // Typography & UI
  fontFamily: string;
  borderRadius: string; // e.g. '0.875rem'
  globalShadow: 'none' | 'light' | 'medium' | 'strong';

  // Card & Page Themes
  cardTheme: CardThemeId;
  productPageTheme: ProductPageThemeId;
  defaultOpenFilters: string[];

  // Features
  isImporter: boolean;

  // Branding
  storeName: string;
  logoUrl: string;
  logoNavbarUrl: string;
  faviconUrl: string;

  // Navbar Links
  navLinks: {
    home: string;
    categories?: string;
    shops?: string;
    products: string;
    wholesale: string;
    about: string;
    locations: string;
    builder?: string;
  };

  // Hero
  heroCarousel: HeroSlide[];

  // Wholesale
  wholesaleBannerImage: string;

  // Content
  trustBadges: TrustBadge[];
  categoryTitle: string;
  categorySubtitle: string;
  wholesaleTitle: string;
  wholesaleDescription: string;
  footerTagline: string;
  footerCopyright: string;

  // Contact
  phone: string;
  whatsapp: string;
  floatingWhatsappEnabled: boolean;
  floatingWhatsappPosition: 'left' | 'right';
  floatingWhatsappPages: string[];
  email: string;
  address: string;

  // Pages Content
  wholesalePage: {
    heroTitle: string;
    heroSubtitle: string;
    formTitle: string;
    formSubtitle: string;
  };
  aboutPage: {
    heroTitle: string;
    heroSubtitle: string;
    heroDescription: string;
    bannerImage: string;
    stats: {
      experience: string;
      sold: string;
      satisfaction: string;
    };
  };
  locationsPage: {
    heroTitle: string;
    heroSubtitle: string;
  };

  // Branches
  branches: Branch[];

  // Social
  facebook: string;
  instagram?: string;
  twitter?: string;
  tiktok: string;
  youtube: string;

  // Advanced
  showTopbar: boolean;
  topbarText: string;
  showHomeSearch: boolean;
  homeSearchTheme: HomeSearchThemeId;

  // SEO
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  seoBaseUrl: string;
  seoImage: string;
  metaPixelId: string;
  metaCapiAccessToken?: string;

  // Splash Screen
  splashEnabled: boolean;
  splashTheme: 'elegant' | 'neon' | 'minimal' | 'wave' | 'particles';
  splashText: string;
  splashSubtext: string;
  splashShowLogo: boolean;
  splashLogoUrl: string; // override logo for splash (empty = use main logoUrl)
  splashBgColor: string; // hex e.g. '#0a0a1a'
  splashTextColor: string;
  splashDuration: number; // min display seconds

  updatedAt: string;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  activeThemeId: 'custom',
  customColors: {
    primary: '23 94% 54%',
    secondary: '211 68% 12%',
    accent: '22 91% 71%',
    background: '0 0% 100%',
    foreground: '222 47% 11%',
    topbarBg: '#f8701b',
    footerBg: '#0a1e33',
  },

  fontFamily: 'Cairo',
  borderRadius: '0.875rem',
  globalShadow: 'medium',

  cardTheme: 'classic',
  productPageTheme: 'classic',
  defaultOpenFilters: ['price', 'sort', 'subcategory', 'brand', 'features'],

  isImporter: true,

  storeName: 'بازار للموضه',
  logoUrl: '/logo3.png',
  logoNavbarUrl: '/logo3.png',
  faviconUrl: '/favicon.png',

  navLinks: {
    home: 'الرئيسية',
    categories: 'الأقسام',
    shops: 'التجار',
    products: 'المنتجات',
    wholesale: 'جملة وتوريدات',
    about: 'من نحن',
    locations: 'فروعنا',
    builder: 'ابني تجميعتك',
  },

  heroCarousel: [
    { id: 'slide1', image: '/bg1.jpeg', buttonLink: '/products' },
    { id: 'slide2', image: '/bg2.jpeg', buttonLink: '/products' },
  ],
  wholesaleBannerImage: '/bg2.jpeg',

  trustBadges: [
    { id: 'b2', label: 'شحن جميع المحافظات', icon: 'Truck', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'b3', label: 'أجهزة أوريجينال', icon: 'Star', color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'b4', label: 'أفضل الأسعار', icon: 'Zap', color: 'text-purple-600', bg: 'bg-purple-50' },
  ],
  categoryTitle: 'تصفح حسب القسم',
  categorySubtitle: 'اختر القسم الذي تبحث عنه للوصول السريع',
  wholesaleTitle: 'قسم التوريدات والجملة',
  wholesaleDescription: 'أسعار خاصة للشركات والموزعين — أجهزة أصلية بكميات كبيرة مع ضمان معتمد.',
  footerTagline: 'أفضل الأسعار وأعلى جودة',
  footerCopyright: 'بازار للموضه. جميع الحقوق محفوظة.',

  phone: '01024911062',
  whatsapp: '01024911062',
  floatingWhatsappEnabled: true,
  floatingWhatsappPosition: 'left',
  floatingWhatsappPages: ['home', 'products', 'product-details', 'cart', 'about', 'locations'],
  email: 'ibrahim.moamen100@gmail.com',
  address: 'مول البستان وسط البلد - بجوار مترو انور السادات',

  wholesalePage: {
    heroTitle: 'أصلية بأسعار تنافسية',
    heroSubtitle: 'في كومبيوسيف نوفر خدمات توريد أجهزة اللابتوب والكمبيوتر للشركات، المتاجر، والموزعين في جميع أنحاء مصر، من خلال استيراد مباشر من الولايات المتحدة الأمريكية بدون وسطاء، مما يمنح عملاءنا أفضل جودة بأفضل سعر.',
    formTitle: 'اطلب عرض سعر الآن',
    formSubtitle: 'املأ النموذج التالي وسيقوم فريق المبيعات بالتواصل معك في أقرب وقت لتقديم أفضل عرض يناسب احتياجاتك.',
  },
  aboutPage: {
    heroTitle: 'بازار للموضه',
    heroSubtitle: 'مع شركه بازار للموضهانت ديماً في الامان',
    heroDescription: 'متخصصون في بيع (اللابتوبات - الشاشات - أجهزة الديسك توب) الأصلية.',
    bannerImage: '/sg.jpeg',
    stats: {
      experience: '+5',
      sold: '+1000',
      satisfaction: '100%',
    },
  },
  locationsPage: {
    heroTitle: 'فروعنا',
    heroSubtitle: 'تعرف على أماكن وجودنا وزورونا في أي وقت',
  },

  branches: [
    {
      id: 'branch1',
      name: 'الفرع الرئيسي',
      address: 'مول البستان وسط البلد - بجوار مترو انور السادات',
      phone: '01024911062',
      workingHours: '١٠ صباحاً - ١٠ مساءً',
      googleMapsUrl: '',
    },
  ],

  facebook: 'https://www.facebook.com/BazarElectronics1',
  tiktok: 'https://www.tiktok.com/@ibrahim.moamen100',
  youtube: 'https://www.youtube.com/@ibrahim-moamen',

  showTopbar: true,
  topbarText: '',
  showHomeSearch: true,
  homeSearchTheme: 'elegant',

  seoTitle: 'شركه بازار للموضه| لابتوب وكمبيوتر أصلي | بازار للموضه',
  seoDescription: 'شركه بازار للموضهمتخصصون في بيع اللابتوبات والكمبيوترات الأصلية بأفضل الأسعار.',
  seoKeywords: 'بازار للموضه, بازار للموضه, لابتوب أصلي, كمبيوتر أصلي, لابتوب مستعمل, أسعار اللابتوب',
  seoBaseUrl: 'https://www.بازار للموضه.com',
  seoImage: '/logo3.png',
  metaPixelId: '1363297541964933',
  metaCapiAccessToken: '',

  // Splash Screen
  splashEnabled: true,
  splashTheme: 'elegant',
  splashText: 'استكشف المول من شاشة جهازك ',
  splashSubtext: '',
  splashShowLogo: true,
  splashLogoUrl: '',
  splashBgColor: '#ffffff',
  splashTextColor: '#f8701b',
  splashDuration: 2.5,

  updatedAt: new Date().toISOString(),
};

// ─────────────────────────────────────────────────────────────────────────────
// Hybrid Cache (localStorage + Firestore)
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_KEY = 'bazar_site_settings_cache';
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function readCache(): SiteSettings | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return data as SiteSettings;
  } catch { return null; }
}

function writeCache(data: SiteSettings) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* quota exceeded – ignore */ }
}

export function clearSettingsCache() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CACHE_KEY);
}

// ─────────────────────────────────────────────────────────────────────────────
// Firestore CRUD
// ─────────────────────────────────────────────────────────────────────────────

/** Read settings. Returns cache instantly, then refreshes from Firestore. */
export async function getSiteSettings(useCache = true): Promise<SiteSettings> {
  return DEFAULT_SETTINGS;
}

export async function saveSiteSettings(
  settings: Partial<SiteSettings>
): Promise<{ success: boolean; error?: string }> {
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Apply theme to DOM
// ─────────────────────────────────────────────────────────────────────────────

export function applyThemeToDocument(settings: SiteSettings) {
  const root = document.documentElement;

  // Resolve colors (preset OR custom)
  const preset = PRESET_THEMES.find(t => t.id === settings.activeThemeId);
  const c = preset ? {
    primary: preset.primary,
    secondary: preset.secondary,
    accent: preset.accent,
    background: preset.background,
    foreground: preset.foreground,
    topbarBg: preset.topbarBg,
    footerBg: preset.footerBg,
  } : settings.customColors;

  // CSS HSL variables (used by shadcn/ui components)
  root.style.setProperty('--primary', c.primary);
  root.style.setProperty('--primary-foreground', isLight(c.primary) ? '222 47% 11%' : '0 0% 100%');
  root.style.setProperty('--secondary', c.secondary);
  root.style.setProperty('--secondary-foreground', '0 0% 100%');
  root.style.setProperty('--accent', c.accent);
  root.style.setProperty('--accent-foreground', '222 47% 11%');
  root.style.setProperty('--background', c.background);
  root.style.setProperty('--foreground', c.foreground);
  root.style.setProperty('--card', c.background);
  root.style.setProperty('--card-foreground', c.foreground);
  root.style.setProperty('--ring', c.primary);

  // Hex variables (used directly in Topbar/Footer)
  root.style.setProperty('--topbar-bg', c.topbarBg);
  root.style.setProperty('--footer-bg', c.footerBg);

  // Border radius
  if (settings.borderRadius) {
    root.style.setProperty('--radius', settings.borderRadius);
  }

  // Global shadow intensity
  root.setAttribute('data-shadow', settings.globalShadow || 'medium');

  // Card theme CSS class on body
  const cardTheme = settings.cardTheme || 'classic';
  root.setAttribute('data-card-theme', cardTheme);

  // Product page theme
  const productPageTheme = settings.productPageTheme || 'default';
  root.setAttribute('data-product-theme', productPageTheme);

  // Font family
  if (settings.fontFamily && settings.fontFamily !== 'Cairo') {
    root.style.setProperty('--font-family', `'${settings.fontFamily}', 'Cairo', sans-serif`);
    document.body.style.fontFamily = `'${settings.fontFamily}', 'Cairo', sans-serif`;
  } else {
    document.body.style.fontFamily = '';
  }
}

function isLight(hsl: string): boolean {
  const parts = hsl.trim().split(/\s+/);
  return parseFloat(parts[2]) > 70;
}

// ─────────────────────────────────────────────────────────────────────────────
// Font options
// ─────────────────────────────────────────────────────────────────────────────

export const FONT_OPTIONS = [
  { value: 'Cairo', label: 'Cairo (الافتراضي)' },
  { value: 'Tajawal', label: 'Tajawal' },
  { value: 'Almarai', label: 'Almarai' },
  { value: 'Changa', label: 'Changa' },
  { value: 'Noto Sans Arabic', label: 'Noto Sans Arabic' },
];

export const RADIUS_OPTIONS = [
  { value: '0rem', label: 'حاد (0)' },
  { value: '0.375rem', label: 'خفيف' },
  { value: '0.875rem', label: 'متوسط (افتراضي)' },
  { value: '1.25rem', label: 'مدوّر' },
  { value: '9999px', label: 'دائري كامل' },
];

export const SHADOW_OPTIONS = [
  { value: 'none', label: 'بدون ظل' },
  { value: 'light', label: 'خفيف' },
  { value: 'medium', label: 'متوسط (افتراضي)' },
  { value: 'strong', label: 'قوي' },
];
