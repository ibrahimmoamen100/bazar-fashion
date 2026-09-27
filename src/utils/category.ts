import { useStore } from "../store/useStore";

export const categorySlugMap: Record<string, string> = {
  "laptops": "لابتوب (Laptop)",
  "laptop": "لابتوب (Laptop)",
  "desktops": "كمبيوتر مكتبي (Desktop)",
  "desktop": "كمبيوتر مكتبي (Desktop)",
  "all-in-one": "أجهزة All in One",
  "storage": "وحدات تخزين (Storage)",
  "monitors": "شاشات (Monitor)",
  "monitor": "شاشات (Monitor)",
  "network": "أجهزة شبكات (Network)",
  "accessories": "إكسسوارات وملحقات (Accessories)",
  "clothes": "ملابس",
  "clothing": "ملابس",
  "kitchen-tools": "أدوات المطبخ",
  "other": "أخرى (Other)"
};

export const categoryNameMap = Object.entries(categorySlugMap).reduce((acc, [slug, name]) => {
  if (!acc[name]) {
    acc[name] = slug;
  }
  return acc;
}, {} as Record<string, string>);

// Map specific custom name mapping manually to ensure consistency
categoryNameMap["لابتوب (Laptop)"] = "laptops";
categoryNameMap["لابتوبات"] = "laptops";
categoryNameMap["كمبيوتر مكتبي (Desktop)"] = "desktops";
categoryNameMap["كيسات كمبيوتر"] = "desktops";
categoryNameMap["أجهزة All in One"] = "all-in-one";
categoryNameMap["وحدات تخزين (Storage)"] = "storage";
categoryNameMap["شاشات (Monitor)"] = "monitors";
categoryNameMap["أجهزة شبكات (Network)"] = "network";
categoryNameMap["إكسسوارات وملحقات (Accessories)"] = "accessories";
categoryNameMap["ملابس"] = "clothes";
categoryNameMap["أدوات المطبخ"] = "kitchen-tools";
categoryNameMap["أخرى (Other)"] = "other";

export function getCategoryNameFromSlug(slug: string): string {
  if (!slug) return "";
  const decoded = decodeURIComponent(slug).toLowerCase().trim();
  if (categorySlugMap[decoded]) {
    return categorySlugMap[decoded];
  }
  // Fallback: replace dashes with spaces
  return decodeURIComponent(slug).replace(/-/g, ' ');
}

export function getCategorySlugFromName(name: string): string {
  if (!name) return "";
  const trimmed = name.trim();
  if (categoryNameMap[trimmed]) {
    return categoryNameMap[trimmed];
  }

  // Look up dynamic categorySlug from loaded products in useStore
  try {
    const products = useStore.getState().products || [];
    const matchedProduct = products.find(
      (p) => p.category?.trim() === trimmed && p.categorySlug
    );
    if (matchedProduct?.categorySlug) {
      return matchedProduct.categorySlug;
    }
  } catch (err) {
    console.error("Error looking up custom category slug from store:", err);
  }

  // Fallback: slugify
  return encodeURIComponent(
    trimmed
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\u0621-\u064A-]+/g, '')
  );
}
