export interface BuilderOption {
  id: string;
  productId?: string; // ID of the real product from products table
  name: string;
  brand?: string;
  image: string;
  originalPrice?: number; // Original single-purchase price in store
  price: number; // Custom bundle price inside this build
  priceDelta?: number; // Price difference compared to default option in the step
  specs?: string;
  quantity?: number;
  inStock?: boolean;
}

export interface BuilderStep {
  id: string;
  name: string; // Arabic name (e.g. "المعالج", "اللوحة الأم", "المكتب")
  nameEn?: string; // English name (e.g. "cpu", "Mother Board")
  category?: string; // Target product category (e.g. "desktop", "accessories")
  subcategory?: string; // Target product subcategory (e.g. "CPU", "Motherboard")
  categorySlug?: string;
  required: boolean;
  defaultOptionId?: string;
  options: BuilderOption[];
  iconName?: string; // e.g. "Cpu", "CircuitBoard", "HardDrive", etc.
}

export interface BuilderCategory {
  id: string;
  label: string;
}

export interface BuilderPreset {
  id: string;
  slug?: string; // e.g. "am4-budget", "rtx-4070-super" for clean URLs (/builder/[slug])
  title: string; // e.g. "AM4 Budget", "تجميعة الجيمنج الاحترافية", "سيت اب مكتبك المتكامل"
  category: string;
  categoryLabel: string;
  badge?: string; // e.g. "6% OFF", "الأكثر طلباً", "وفر 15%"
  discountPercentage?: number;
  showcaseImage: string; // Main image preview in sidebar
  description?: string;
  productsCount?: number;
  views?: number;
  steps: BuilderStep[];
}

export interface BuilderPresetSummary {
  id: string;
  slug: string;
  title: string;
  category: string;
  categoryLabel: string;
  badge?: string;
  discountPercentage?: number;
  showcaseImage: string;
  description?: string;
  stepsCount: number;
  estimatedPrice: number;
}
