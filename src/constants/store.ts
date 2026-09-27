// Store Constants - جميع ثوابت المشروع
export const STORE_CONFIG = {
  // معلومات المتجر الأساسية
  name: "bazar fashion",
  displayName: "متجر بازار للموضه - bazar fashion",
  description: "متجر إلكتروني متخصص في بيع الأجهزة الإلكترونية وملحقاتها",
  tagline: "أفضل الأسعار وأعلى جودة",

  // الشعارات
  logo: {
    primary: "/logo3.png",
    secondary: "/logo3.png",
    favicon: "/favicon.png",
    text: "اي زون مول ", // نص اللوجو الذي يظهر في Navbar
  },

  // معلومات الاتصال
  contact: {
    phone: "01024911062",
    formattedPhone: "201024911062",
    whatsapp: "01024911062",
    email: "ibrahim.moamen100@gmail.com",
    address: "  مول البستان وسط البلد - بجوار مترو انور السادات",
    city: "القاهرة",
    country: "مصر",
  },

  // ساعات العمل
  workingHours: {
    weekdays: "11:00 صباحاً - 9:00 مساءً",
    weekends: "11:00 صباحاً - 9:00 مساءً",
    friday: "مغلق",
    holidays: "مغلق",
  },

  // روابط التواصل الاجتماعي
  socialMedia: {
    facebook: "https://www.facebook.com/BazarElectronics1",
    tiktok: "https://www.tiktok.com/@ibrahim.moamen100",
    youtube: "https://www.youtube.com/@ibrahim-moamen",
  },

  // معلومات صاحب المتجر
  owner: {
    name: "التميمي  ",
    phone: "01024911062",
    whatsapp: "01024911062",
    email: "",
    title: "صاحب المتجر",

  },

  // معلومات الموظفين
  team: {
    salesManager: {
      name: "Ibrahim",
      image: "/ibrahim.png",
      phone: "01024911062",
      title: "مدير المبيعات",
      bio: "مسؤول عن إدارة المبيعات وتطوير استراتيجيات التسويق",
    },
    deliveryManager: {
      name: "Ahmed",
      image: "/def.png",
      phone: "01024911062",
      title: "مسؤول التوصيل",
      bio: "مسؤول عن توصيل الطلبات وضمان وصولها في الوقت المحدد",
    },
  },

  // مواقع الفروع
  locations: [



    {
      id: "branch4",
      name: "       ",
      address: " ",
      phone: "01024911062",
      hours: "11:00 صباحاً - 9:00 مساءً (ماعدا الجمعة)",
      coordinates: {
        lat: 30.04520578513648,
        lng: 31.238287239912097
      },

      googleMapsUrl:
        "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1468.0774421207127!2d31.238287239912097!3d30.04520578513648!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x145840c775c807a7%3A0x4e6b07f8bc12ffe6!2sAl%20Boustan%20Computer%20Center!5e1!3m2!1sen!2seg!4v1773486753341!5m2!1sen!2seg",
    },

  ],

  // ألوان المشروع
  colors: {
    primary: "#3B82F6", // blue-500
    secondary: "#10B981", // emerald-500
    accent: "#F59E0B", // amber-500
    success: "#10B981", // emerald-500
    warning: "#F59E0B", // amber-500
    error: "#EF4444", // red-500
    info: "#3B82F6", // blue-500
  },

  // معلومات Carousel الصفحة الرئيسية
  heroCarousel: [
    {
      id: "slide1",
      image: "/4.png",
      title: "  ",
      description: " ",
      buttonText: "تسوق الآن",
      buttonLink: "/categories",
      overlay: "from-black/70 to-transparent",
    },

    // {
    //   id: "slide2",
    //   image: "/bg2.jpeg",
    //   title: "  ",
    //   description: " ",
    //   buttonText: "  جميع اللابات",
    //   buttonLink: "/products",
    //   overlay: "from-black/70 to-transparent",
    // }

  ],

  // معلومات العلامات التجارية
  brands: [
    {
      id: "brand1",
      name: "Apple",
      logo: "/brands/apple.png",
      description: "أجهزة Apple الأصلية",
    },
    {
      id: "brand2",
      name: "Samsung",
      logo: "/brands/samsung.png",
      description: "أجهزة Samsung عالية الجودة",
    },
    {
      id: "brand3",
      name: "Huawei",
      logo: "/brands/huawei.png",
      description: "أجهزة Huawei المميزة",
    },
    {
      id: "brand4",
      name: "Xiaomi",
      logo: "/brands/xiaomi.png",
      description: "أجهزة Xiaomi بأسعار منافسة",
    },
  ],

  // معلومات الموردين
  suppliers: [

  ],

  // معلومات التوصيل
  delivery: {
    freeShippingThreshold: 1000, // EGP
    deliveryTime: "24-48 ساعة",
    deliveryAreas: ["القاهرة", "الجيزة", "الإسكندرية"],
    deliveryFee: "تحدد حسب المنطقة",
    returnPolicy: "إمكانية الإرجاع خلال 14 يوم",
    governorates: [
      { name: "القاهرة", shippingCost: 100, deliveryTime: '24 ساعة' },
      { name: "الجيزة", shippingCost: 150, deliveryTime: '24-48 ساعة' },
      { name: "الإسكندرية", shippingCost: 160, deliveryTime: '24-48 ساعة' },
      { name: "الدقهلية", shippingCost: 170, deliveryTime: '24-48 ساعة' },
      { name: "البحر الأحمر", shippingCost: 180, deliveryTime: '24-48 ساعة' },
      { name: "البحيرة", shippingCost: 180, deliveryTime: '24-48 ساعة' },
      { name: "الفيوم", shippingCost: 180, deliveryTime: '24-48 ساعة' },
      { name: "الغربية", shippingCost: 180, deliveryTime: '24-48 ساعة' },
      { name: "الإسماعيلية", shippingCost: 180, deliveryTime: '24-48 ساعة' },
      { name: "المنوفية", shippingCost: 180, deliveryTime: '24-48 ساعة' },
      { name: "المنيا", shippingCost: 180, deliveryTime: '24-48 ساعة' },
      { name: "القليوبية", shippingCost: 180, deliveryTime: '24-48 ساعة' },
      { name: "الوادي الجديد", shippingCost: 200, deliveryTime: '24-48 ساعة' },
      { name: "السويس", shippingCost: 180, deliveryTime: '24-48 ساعة' },
      { name: "أسوان", shippingCost: 200, deliveryTime: '48-72 ساعة' },
      { name: "أسيوط", shippingCost: 200, deliveryTime: '48-72 ساعة' },
      { name: "بني سويف", shippingCost: 180, deliveryTime: '48-72 ساعة' },
      { name: "بورسعيد", shippingCost: 180, deliveryTime: '48-72 ساعة' },
      { name: "دمياط", shippingCost: 180, deliveryTime: '48-72 ساعة' },
      { name: "الشرقية", shippingCost: 180, deliveryTime: '48-72 ساعة' },
      { name: "جنوب سيناء", shippingCost: 200, deliveryTime: '48-72 ساعة' },
      { name: "كفر الشيخ", shippingCost: 180, deliveryTime: '48-72 ساعة' },
      { name: "مطروح", shippingCost: 200, deliveryTime: '48-72 ساعة' },
      { name: "الأقصر", shippingCost: 200, deliveryTime: '48-72 ساعة' },
      { name: "قنا", shippingCost: 200, deliveryTime: '48-72 ساعة' },
      // { name: "شمال سيناء", shippingCost: 200, deliveryTime: '48-72 ساعة' },
      { name: "سوهاج", shippingCost: 200, deliveryTime: '48-72 ساعة' }
    ],
  },

  // معلومات الدفع
  payment: {
    methods: ["الدفع عند الاستلام", "بطاقات الائتمان", "التحويل البنكي"],
    securePayment: true,
    installmentAvailable: true,
    maxInstallments: 12,
  },

  // معلومات الضمان
  warranty: {
    defaultWarranty: "ضمان سنة واحدة",
    extendedWarranty: "إمكانية تمديد الضمان",
    warrantyCoverage: "جميع الأجزاء والعمالة",
  },

  // معلومات SEO
  seo: {
    title: "Storee - متجر الأجهزة الإلكترونية",
    description: "متجر إلكتروني متخصص في بيع الأجهزة الإلكترونية وملحقاتها بأفضل الأسعار وأعلى جودة",
    keywords: "أجهزة إلكترونية, موبايلات, لابتوب, تابلت, ملحقات, مصر",
    author: "Storee Team",
    ogImage: "/og-image.png",
  },

  // معلومات التطبيق
  app: {
    version: "1.0.0",
    buildNumber: "1",
    minSupportedVersion: "1.0.0",
    updateUrl: "https://storee.com/update",
  },

  // معلومات API
  api: {
    baseUrl: "https://api.storee.com",
    version: "v1",
    timeout: 30000, // 30 seconds
  },

  // معلومات Firebase
  firebase: {
    projectId: "storee-app",
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    authDomain: "storee-app.firebaseapp.com",
    storageBucket: "storee-app.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456",
  },

  // معلومات التطوير
  development: {
    environment: process.env.NODE_ENV || "development",
    debug: process.env.NODE_ENV === "development",
    logLevel: process.env.NODE_ENV === "development" ? "debug" : "error",
  },
} as const;

// تصدير الثوابت الفردية للاستخدام المباشر
export const STORE_NAME = STORE_CONFIG.name;
export const STORE_DISPLAY_NAME = STORE_CONFIG.displayName;
export const STORE_LOGO = STORE_CONFIG.logo.primary;
export const STORE_LOGO_TEXT = STORE_CONFIG.logo.text;
export const STORE_PHONE = STORE_CONFIG.contact.phone;
export const STORE_WHATSAPP = STORE_CONFIG.contact.whatsapp;
export const STORE_EMAIL = STORE_CONFIG.contact.email;
export const STORE_ADDRESS = STORE_CONFIG.contact.address;
export const STORE_WORKING_HOURS = STORE_CONFIG.workingHours.weekdays;
export const STORE_OWNER = STORE_CONFIG.owner;
export const STORE_LOCATIONS = STORE_CONFIG.locations;
export const STORE_COLORS = STORE_CONFIG.colors;
export const STORE_HERO_CAROUSEL = STORE_CONFIG.heroCarousel;
export const STORE_BRANDS = STORE_CONFIG.brands;
export const STORE_SUPPLIERS = STORE_CONFIG.suppliers;
export const STORE_SOCIAL_MEDIA = STORE_CONFIG.socialMedia;
export const STORE_TEAM = STORE_CONFIG.team;
export const STORE_GOVERNORATES = STORE_CONFIG.delivery.governorates;

// Default supplier object for bazar fashion
export const DEFAULT_BAZAR_SUPPLIER = {
  name: "bazar fashion",
  slug: "bazar-fashion",
  address: "bazar fashion - القاهره - مؤسسه الزكاه -اليوم الواحد خلف السجل المدني الجديد -اقرب محطة مترو عزبه النخل الشرقيه",
  phone: "01024911062",
  logo: "/logo3.png",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Central Storage & Local Persistence Configuration
// ─────────────────────────────────────────────────────────────────────────────
/**
 * المفتاح الموحد الرئيسي لجميع مفاتيح التخزين المحلي والجلسات والكوكيز
 * بمجرد تغيير هذه القيمة هنا، تتغير جميع المفاتيح عبر التطبيق بالكامل تلقائياً
 */
export const STORAGE_PREFIX = "bazar-fashion";

export const getStorageKey = (key: string): string => `${STORAGE_PREFIX}_${key}`;

export const STORAGE_KEYS = {
  prefix: STORAGE_PREFIX,

  // Store & Cart (Zustand Persist)
  shopStorage: `${STORAGE_PREFIX}_shop-storage`,
  storeeCart: `${STORAGE_PREFIX}_storee-cart`,
  storeeProducts: `${STORAGE_PREFIX}_storee-products`,
  storeeFilters: `${STORAGE_PREFIX}_storee-filters`,

  // Site Settings & Splash Cache
  siteSettingsCache: `${STORAGE_PREFIX}_site_settings_cache`,
  splashLogoUrl: `${STORAGE_PREFIX}_splash_logo_cached_url`,
  splashSettings: `${STORAGE_PREFIX}_splash_settings_cache`,
  categoriesTreeCache: `${STORAGE_PREFIX}_categories_tree_cache`,

  // Catalog & Product Cache
  cachedProducts: `${STORAGE_PREFIX}_cached_products`,
  catalogVersion: `${STORAGE_PREFIX}_catalog_version`,
  localProductsFallback: `${STORAGE_PREFIX}_local_products_fallback`,
  customSpecProfiles: `${STORAGE_PREFIX}_custom_spec_profiles`,

  // Cashier & Sales
  cashierSales: `${STORAGE_PREFIX}_cashier-sales`,

  // Analytics & Demographics
  returningVisitor: `${STORAGE_PREFIX}_returning_visitor`,
  analyticsData: `${STORAGE_PREFIX}_analytics-data`,
  profitAnalysisData: `${STORAGE_PREFIX}_profit-analysis-data`,
  ordersData: `${STORAGE_PREFIX}_orders-data`,
  userAge: `${STORAGE_PREFIX}_user_age`,
  userGender: `${STORAGE_PREFIX}_user_gender`,
  currentProduct: `${STORAGE_PREFIX}_current_product`,
  globalTrackingDisabled: `${STORAGE_PREFIX}_global_tracking_disabled`,
  lastPage: `${STORAGE_PREFIX}_last_page`,
  lastPageViewId: `${STORAGE_PREFIX}_last_page_view_id`,
  scrollDepth: (page: string) => `${STORAGE_PREFIX}_scroll_depth_${page}`,

  // Checkout info
  checkoutFullName: `${STORAGE_PREFIX}_checkout_fullName`,
  checkoutPhoneNumber: `${STORAGE_PREFIX}_checkout_phoneNumber`,
  checkoutCity: `${STORAGE_PREFIX}_checkout_city`,
  checkoutAddress: `${STORAGE_PREFIX}_checkout_address`,
  checkoutNotes: `${STORAGE_PREFIX}_checkout_notes`,

  // Order Tracking
  trackedOrders: `${STORAGE_PREFIX}_tracked_orders`,
  trackedOrdersEvent: `${STORAGE_PREFIX}_tracked_orders_updated`,

  // Auth Sessions
  adminSessionToken: `${STORAGE_PREFIX}_admin_session_token`,
  attendanceSessionToken: `${STORAGE_PREFIX}_attendance_session_token`,
  dashboardUserSession: `${STORAGE_PREFIX}_dashboard_user_session`,
  dashboardAuth: `${STORAGE_PREFIX}_dashboard_auth`,

  // Builder Service
  builderSummaries: `${STORAGE_PREFIX}_builder_summaries_v2`,
  builderCategories: `${STORAGE_PREFIX}_builder_categories_v2`,
  builderPresetsMaster: `${STORAGE_PREFIX}_dynamic_builder_presets_v2`,
  builderPresetPrefix: `${STORAGE_PREFIX}_builder_preset_v2_`,
  builderVersionToken: `${STORAGE_PREFIX}_builder_version_token_v2`,

  // Suppliers Cache
  suppliersCache: `${STORAGE_PREFIX}_active_suppliers_cache`,

  // Form persistence
  formPersistence: (key: string) => `${STORAGE_PREFIX}_form_persistence_${key}`,

  // Cookies
  sidebarCookie: `${STORAGE_PREFIX}:sidebar:state`,
} as const;
