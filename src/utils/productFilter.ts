import { Filter, Product } from "@/types/product";

// Mandatory spec keys that are handled in their own dedicated sections
export const MANDATORY_SPEC_KEYS = ["الفئة", "الفئة الفرعية", "العلامة التجارية"];

/**
 * Check if a product matches a set of filters.
 *
 * @param product The product to test
 * @param filters Current active filters
 * @param searchQuery Optional search term (overrides filters.search if provided)
 * @param excludeKey Dimension to ignore (used for facet counting, e.g. "brand", "dynamicSpecs:RAM")
 */
export function matchProduct(
  product: Product,
  filters: Filter,
  searchQuery?: string,
  excludeKey?: string
): boolean {
  // Exclude archived products
  if (product.isArchived) return false;

  // 1. Search Query
  const search = searchQuery !== undefined ? searchQuery : filters.search;
  if (search && search.trim() && excludeKey !== 'search') {
    const q = search.trim().toLowerCase();
    const name = (product.name || '').toLowerCase();
    const brand = (product.brand || '').toLowerCase();
    const category = (product.category || '').toLowerCase();
    const subcategory = (product.subcategory || '').toLowerCase();
    const desc = (product.description || '').toLowerCase();
    const specsMatch = product.specifications?.some(s =>
      s.key?.toLowerCase().includes(q) || s.value?.toLowerCase().includes(q)
    );

    if (
      !name.includes(q) &&
      !brand.includes(q) &&
      !category.includes(q) &&
      !subcategory.includes(q) &&
      !desc.includes(q) &&
      !specsMatch
    ) {
      return false;
    }
  }

  // 2. Price Range (minPrice / maxPrice)
  if (excludeKey !== 'price' && excludeKey !== 'minPrice' && excludeKey !== 'maxPrice') {
    if (filters.minPrice !== undefined && product.price < filters.minPrice) return false;
    if (filters.maxPrice !== undefined && product.price > filters.maxPrice) return false;
  }

  // 3. Category (supports Arabic name and custom categorySlug)
  if (excludeKey !== 'category' && filters.category && filters.category.length > 0 && !filters.category.includes('all')) {
    const matchesCategory =
      filters.category.includes(product.category) ||
      (product.categorySlug ? filters.category.includes(product.categorySlug) : false);
    if (!matchesCategory) return false;
  }

  // 4. Subcategory (Multi-select OR within subcategory)
  if (excludeKey !== 'subcategory' && filters.subcategory && filters.subcategory.length > 0) {
    const prodSub = product.subcategory || '';
    if (!filters.subcategory.includes(prodSub)) return false;
  }

  // 5. Brand (Multi-select OR within brand)
  if (excludeKey !== 'brand' && filters.brand && filters.brand.length > 0) {
    if (!filters.brand.includes(product.brand)) return false;
  }

  // 6. Color (Multi-select OR matching comma-separated colors)
  if (excludeKey !== 'color' && filters.color && filters.color.length > 0) {
    const productColors = product.color?.split(',').map(c => c.trim()) || [];
    if (!filters.color.some(c => productColors.includes(c))) return false;
  }

  // 7. Size
  if (excludeKey !== 'size' && filters.size && filters.size.length > 0) {
    const productSizes = product.size?.split(',').map(s => s.trim()) || [];
    if (!filters.size.some(s => productSizes.includes(s))) return false;
  }

  // 8. Special Offers
  if (excludeKey !== 'specialOffer' && filters.specialOffer !== undefined) {
    if (filters.specialOffer && !product.specialOffer) return false;
  }

  // 9. Features (Touch / x360 / Detachable)
  if (excludeKey !== 'features' && filters.features && filters.features.length > 0) {
    const productFeatures: string[] = product.features ? [...product.features] : [];
    const nameLc = (product.name || '').toLowerCase();
    const descLc = (product.description || '').toLowerCase();
    if (!productFeatures.includes('touch') && (nameLc.includes('touch') || descLc.includes('touch') || product.display?.panelType?.toLowerCase().includes('touch') || product.display?.resolution?.toLowerCase().includes('touch'))) {
      productFeatures.push('touch');
    }
    if (!productFeatures.includes('x360') && (nameLc.includes('x360') || descLc.includes('x360'))) {
      productFeatures.push('x360');
    }
    if (!productFeatures.includes('detachable') && (nameLc.includes('detachable') || descLc.includes('detachable'))) {
      productFeatures.push('detachable');
    }
    if (!filters.features.some(f => productFeatures.includes(f))) return false;
  }

  // 10. Processor Filters
  if (excludeKey !== 'processorBrand' && filters.processorBrand && filters.processorBrand.length > 0) {
    const brand = product.processor?.processorBrand;
    if (!brand || !filters.processorBrand.includes(brand)) return false;
  }
  if (excludeKey !== 'processorSeries' && filters.processorSeries && filters.processorSeries.length > 0) {
    const series = product.processor?.processorSeries;
    if (!series || !filters.processorSeries.includes(series)) return false;
  }
  if (excludeKey !== 'processorGeneration' && filters.processorGeneration && filters.processorGeneration.length > 0) {
    const gen = product.processor?.processorGeneration;
    if (!gen || !filters.processorGeneration.includes(gen)) return false;
  }
  if (excludeKey !== 'processorName' && filters.processorName && filters.processorName.length > 0) {
    const name = product.processor?.name;
    if (!name || !filters.processorName.includes(name)) return false;
  }
  if (excludeKey !== 'integratedGpu' && filters.integratedGpu && filters.integratedGpu.length > 0) {
    const gpu = product.processor?.integratedGpu;
    if (!gpu || !filters.integratedGpu.includes(gpu)) return false;
  }

  // 11. Dedicated Graphics Filters
  if (excludeKey !== 'dedicatedGraphicsName' && filters.dedicatedGraphicsName && filters.dedicatedGraphicsName.length > 0) {
    const gpuName = product.dedicatedGraphics?.name;
    if (!gpuName || !filters.dedicatedGraphicsName.includes(gpuName)) return false;
  }
  if (excludeKey !== 'dedicatedGpuBrand' && filters.dedicatedGpuBrand && filters.dedicatedGpuBrand.length > 0) {
    const brand = product.dedicatedGraphics?.dedicatedGpuBrand;
    if (!brand || !filters.dedicatedGpuBrand.includes(brand)) return false;
  }
  if (excludeKey !== 'dedicatedGpuModel' && filters.dedicatedGpuModel && filters.dedicatedGpuModel.length > 0) {
    const model = product.dedicatedGraphics?.dedicatedGpuModel;
    if (!model || !filters.dedicatedGpuModel.includes(model)) return false;
  }
  if (excludeKey !== 'hasDedicatedGraphics' && filters.hasDedicatedGraphics !== undefined) {
    if (!!product.dedicatedGraphics !== filters.hasDedicatedGraphics) return false;
  }

  // 12. Screen Size
  if (excludeKey !== 'screenSize' && filters.screenSize && filters.screenSize.length > 0) {
    const pSize = product.display?.sizeInches;
    if (pSize === undefined || !filters.screenSize.includes(String(pSize))) return false;
  }

  // 13. Dynamic Specifications (Multi-select OR within spec, AND across different specs)
  if (filters.dynamicSpecs && Object.keys(filters.dynamicSpecs).length > 0) {
    for (const [specKey, selectedValues] of Object.entries(filters.dynamicSpecs)) {
      if (excludeKey === `dynamicSpecs:${specKey}`) continue;
      if (selectedValues && selectedValues.length > 0) {
        const hasMatch = product.specifications?.some(
          spec => spec.key === specKey && selectedValues.includes(spec.value)
        );
        if (!hasMatch) return false;
      }
    }
  }

  return true;
}

/**
 * Filter an array of products with full criteria.
 */
export function filterProducts(
  products: Product[],
  filters: Filter,
  searchQuery?: string
): Product[] {
  return products.filter(p => matchProduct(p, filters, searchQuery));
}

/**
 * Sort an array of products by selected sort option.
 */
export function sortProducts(products: Product[], sortBy?: string): Product[] {
  return [...products].sort((a, b) => {
    if (sortBy === "price-asc") {
      return a.price - b.price;
    }
    if (sortBy === "price-desc") {
      return b.price - a.price;
    }
    if (sortBy === "name-asc") {
      return (a.name || '').localeCompare(b.name || '', 'ar');
    }
    if (sortBy === "name-desc") {
      return (b.name || '').localeCompare(a.name || '', 'ar');
    }

    // Default sorting: displayPriority asc (1 first), then newest first
    const aPriority = (a.displayPriority && a.displayPriority > 0) ? a.displayPriority : Number.MAX_SAFE_INTEGER;
    const bPriority = (b.displayPriority && b.displayPriority > 0) ? b.displayPriority : Number.MAX_SAFE_INTEGER;

    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    const aDate = new Date(a.createdAt || 0).getTime();
    const bDate = new Date(b.createdAt || 0).getTime();
    return bDate - aDate;
  });
}

/**
 * Extract all distinct available filter values from the base category / shop catalog.
 * This guarantees options don't disappear when one option is selected.
 */
export function extractAvailableOptions(products: Product[]) {
  const activeProducts = products.filter(p => !p.isArchived);

  const subcategories = Array.from(
    new Set(activeProducts.map(p => p.subcategory).filter(Boolean) as string[])
  ).sort();

  const brands = Array.from(
    new Set(activeProducts.map(p => p.brand).filter(Boolean) as string[])
  ).sort();

  const processorBrands = Array.from(
    new Set(activeProducts.map(p => p.processor?.processorBrand).filter(Boolean) as string[])
  ).sort();

  const processorGenerations = Array.from(
    new Set(activeProducts.map(p => p.processor?.processorGeneration).filter(Boolean) as string[])
  ).sort();

  const processorSeries = Array.from(
    new Set(activeProducts.map(p => p.processor?.processorSeries).filter(Boolean) as string[])
  ).sort();

  const processorNames = Array.from(
    new Set(activeProducts.map(p => p.processor?.name).filter(Boolean) as string[])
  ).sort();

  const integratedGpus = Array.from(
    new Set(activeProducts.map(p => p.processor?.integratedGpu).filter(Boolean) as string[])
  ).sort();

  const screenSizes = Array.from(
    new Set(
      activeProducts
        .map(p => p.display?.sizeInches)
        .filter(v => typeof v === 'number') as number[]
    )
  ).sort((a, b) => a - b).map(String);

  const gpuNames = Array.from(
    new Set(activeProducts.map(p => p.dedicatedGraphics?.name).filter(Boolean) as string[])
  ).sort();

  // Dynamic Specs Map
  const dynamicSpecsMap: Record<string, Set<string>> = {};
  activeProducts.forEach(prod => {
    if (prod.specifications) {
      prod.specifications.forEach(spec => {
        if (spec.inFilter && spec.key && spec.value && !MANDATORY_SPEC_KEYS.includes(spec.key)) {
          if (!dynamicSpecsMap[spec.key]) dynamicSpecsMap[spec.key] = new Set();
          dynamicSpecsMap[spec.key].add(spec.value);
        }
      });
    }
  });

  const dynamicSpecsAvailable: Record<string, string[]> = {};
  for (const key in dynamicSpecsMap) {
    dynamicSpecsAvailable[key] = Array.from(dynamicSpecsMap[key]).sort();
  }

  // Features check
  const hasFeaturesTouch = activeProducts.some(p =>
    (p.features || []).includes('touch') ||
    (p.name || '').toLowerCase().includes('touch') ||
    (p.description || '').toLowerCase().includes('touch') ||
    p.display?.panelType?.toLowerCase().includes('touch')
  );

  const hasFeatures360 = activeProducts.some(p =>
    (p.features || []).includes('x360') ||
    (p.name || '').toLowerCase().includes('x360') ||
    (p.description || '').toLowerCase().includes('x360')
  );

  const hasFeaturesDetach = activeProducts.some(p =>
    (p.features || []).includes('detachable') ||
    (p.name || '').toLowerCase().includes('detachable') ||
    (p.description || '').toLowerCase().includes('detachable')
  );

  return {
    subcategories,
    brands,
    processorBrands,
    processorGenerations,
    processorSeries,
    processorNames,
    integratedGpus,
    screenSizes,
    gpuNames,
    dynamicSpecsAvailable,
    hasFeaturesTouch,
    hasFeatures360,
    hasFeaturesDetach,
    hasAnyFeature: hasFeaturesTouch || hasFeatures360 || hasFeaturesDetach,
  };
}
