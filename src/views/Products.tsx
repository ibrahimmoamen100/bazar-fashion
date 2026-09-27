'use client';

import { useState, useEffect, useRef, useMemo, useLayoutEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useLocation, useSearchParams, useNavigate, Link } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { ProductCard } from "@/components/ProductCard";
import { ProductFilters } from "@/components/ProductFilters";
import { ProductModal } from "@/components/ProductModal";
import { Product } from "@/types/product";
import Footer from "@/components/Footer";
import { Filter, Search, LayoutGrid, List, Sparkles, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCategoryNameFromSlug } from "@/utils/category";
import { productsService } from "@/lib/firebase";
import { filterProducts, sortProducts } from "@/utils/productFilter";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { ProductSearch } from "@/components/ProductSearch";
import { ActiveFilters } from "@/components/ActiveFilters";
import { SEOHelmet } from "@/components/SEOHelmet";
import { DEFAULT_SUPPLIER } from "@/constants/supplier";

// ─── Helper: convert Filter → URLSearchParams (ordered per spec) ───────────
function filtersToSearchParams(filters: import("@/types/product").Filter, slugMap: Record<string, string>, excludeCategory?: boolean, excludeSubcategory?: boolean): URLSearchParams {
  const params = new URLSearchParams();

  // 1. نطاق السعر
  if (filters.minPrice !== undefined) params.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set("maxPrice", String(filters.maxPrice));

  // 2. الفئة
  if (!excludeCategory) {
    const catSlug = slugMap["الفئة"] || "category";
    filters.category?.forEach((v) => params.append(catSlug, v));
  }

  // 3. الماركة
  const brandSlug = slugMap["العلامة التجارية"] || "brand";
  filters.brand?.forEach((v) => params.append(brandSlug, v));

  // 4. الفئة الفرعية
  if (!excludeSubcategory) {
    const subcatSlug = slugMap["الفئة الفرعية"] || "subcategory";
    filters.subcategory?.forEach((v) => params.append(subcatSlug, v));
  }

  // 5. مميزات خاصة
  filters.features?.forEach((v) => params.append("features", v));

  // 6. العروض الخاصة
  if (filters.specialOffer) params.set("specialOffer", "true");

  // 7. البحث
  if (filters.search) params.set("search", filters.search);

  // 8. الترتيب
  if (filters.sortBy) params.set("sortBy", filters.sortBy);

  // Dynamic Specs
  if (filters.dynamicSpecs) {
    Object.entries(filters.dynamicSpecs).forEach(([k, vals]) => {
      const urlKey = slugMap[k] ? slugMap[k] : k;
      vals.forEach(v => params.append(urlKey, v.replace(/\s+/g, "-")));
    });
  }

  return params;
}

// ─── Helper: parse URLSearchParams → Filter ─────────────────────────────────
function searchParamsToFilters(params: URLSearchParams, reverseSlugMap: Record<string, string>): Partial<import("@/types/product").Filter> {
  const getArr = (key: string) => {
    const vals = params.getAll(key);
    return vals.length > 0 ? vals : undefined;
  };

  const categorySlug = Object.keys(reverseSlugMap).find(k => reverseSlugMap[k] === "الفئة") || "category";
  const subcategorySlug = Object.keys(reverseSlugMap).find(k => reverseSlugMap[k] === "الفئة الفرعية") || "subcategory";
  const brandSlug = Object.keys(reverseSlugMap).find(k => reverseSlugMap[k] === "العلامة التجارية") || "brand";

  const dynamicSpecs: Record<string, string[]> = {};
  const knownStaticKeys = new Set([
    "minPrice", "maxPrice", "category", "brand", "subcategory", "features", "specialOffer", "search", "sortBy",
    categorySlug, subcategorySlug, brandSlug
  ]);

  for (const [key, value] of Array.from(params.entries())) {
    if (!knownStaticKeys.has(key)) {
      const specKey = reverseSlugMap[key] || key;
      if (!dynamicSpecs[specKey]) dynamicSpecs[specKey] = [];
      dynamicSpecs[specKey].push(value.replace(/-/g, " "));
    }
  }

  const minPriceStr = params.get("minPrice");
  const maxPriceStr = params.get("maxPrice");

  return {
    minPrice: minPriceStr ? Number(minPriceStr) : undefined,
    maxPrice: maxPriceStr ? Number(maxPriceStr) : undefined,
    category: getArr(categorySlug) || getArr("category"),
    brand: getArr(brandSlug) || getArr("brand"),
    subcategory: getArr(subcategorySlug) || getArr("subcategory"),
    features: getArr("features"),
    specialOffer: params.get("specialOffer") === "true" ? true : undefined,
    search: params.get("search") || undefined,
    sortBy: params.get("sortBy") as any || undefined,
    dynamicSpecs: Object.keys(dynamicSpecs).length > 0 ? dynamicSpecs : undefined,
  };
}

interface ProductsProps {
  /** Products pre-fetched on the server (SSR/ISR) – used to seed the store immediately */
  initialProducts?: Product[];
  /** Category slug pre-fetched on the server */
  initialCategory?: string;
  /** Subcategory slug pre-fetched on the server */
  initialSubcategory?: string;
}

export default function Products({ initialProducts, initialCategory, initialSubcategory }: ProductsProps = {}) {
  const { t } = useTranslation();
  const { category: categoryParam, subcategory: subcategoryParam } = useParams();
  const decodedSubcategoryParam = subcategoryParam ? decodeURIComponent(subcategoryParam) : undefined;
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const storeProducts = useStore((state) => state.products);
  const setProducts = useStore((state) => state.setProducts);
  const filters = useStore((state) => state.filters);
  const setFilters = useStore((state) => state.setFilters);
  const loadProducts = useStore((state) => state.loadProducts);
  const loading = useStore((state) => state.loading);
  const error = useStore((state) => state.error);

  // ─── SSR Pre-seeding ─────────────────────────────────────────────────────
  // If server provided initialProducts and the store is empty, seed it immediately
  // This avoids loading flash on first render and reduces Firebase reads
  useEffect(() => {
    if (initialProducts && initialProducts.length > 0 && storeProducts.length === 0) {
      setProducts(initialProducts);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount only

  // Resolve products: prefer store (real-time) over server-seeded
  const products = storeProducts.length > 0 ? storeProducts : (initialProducts ?? []);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // ─── Lazy Loading State ───────────────────────────────────────────────────
  const [visibleCount, setVisibleCount] = useState(12);

  // Whether scroll position has been restored this mount
  const scrollRestored = useRef(false);

  // While blockReset is true, ALL page resets from filter changes are ignored.
  const blockReset = useRef(false);

  // ─── URL ↔ Filters sync ──────────────────────────────────────────────────
  // urlInitialized ref (not state) avoids re-render on set
  const urlInitialized = useRef(false);



  // Check if categoryParam is actually an old product ID (for backward compatibility)
  // Only check if it looks like it could be a product ID (not a typical slug with letters/hyphens)
  useEffect(() => {
    if (categoryParam) {
      // Only attempt product lookup if the param looks like a product doc ID
      // (product IDs are Arabic word slugs with many hyphens, or old IDs)
      // We skip this check for simple alphabetic slugs which are category slugs
      const looksLikeCategorySlug = /^[a-z0-9-]+$/.test(categoryParam);
      if (!looksLikeCategorySlug) {
        const checkIsProduct = async () => {
          try {
            const prod = await productsService.getProductById(categoryParam);
            if (prod) {
              navigate(`/product/${categoryParam}`, { replace: true });
            }
          } catch (e) {
            console.error("Error checking product ID:", e);
          }
        };
        checkIsProduct();
      }
    }
  }, [categoryParam, navigate]);

  // Redirect /products/all and /products (no category) to /categories to avoid fetching all products
  useEffect(() => {
    if (!categoryParam || categoryParam === "all") {
      navigate("/categories", { replace: true });
    }
  }, [categoryParam, navigate]);

  // Load products from Firebase for this specific category and subcategory
  useEffect(() => {
    if (categoryParam && categoryParam !== "all") {
      if (decodedSubcategoryParam) {
        loadProducts(categoryParam, decodedSubcategoryParam);
      } else {
        loadProducts(categoryParam);
      }
    }
    // Note: we no longer call loadProducts() without a category to avoid fetching ALL products
  }, [loadProducts, categoryParam, decodedSubcategoryParam]);

  // Derive the human-readable category name dynamically from loaded products
  // (supports both static slug map and custom slugs set via admin form)
  const categoryDisplayName = useMemo(() => {
    if (!categoryParam || categoryParam === "all") return "";
    // Check if any loaded product has this as a categorySlug — use its .category field
    const match = products.find(p => p.categorySlug === categoryParam);
    if (match) return match.category;
    // Check if any product has this exact category name (direct name match)
    const directMatch = products.find(p => p.category === categoryParam);
    if (directMatch) return directMatch.category;
    // Fall back to static map (for legacy slugs like "laptops", "monitors", etc.)
    return getCategoryNameFromSlug(categoryParam);
  }, [categoryParam, products]);

  const { slugMap, reverseSlugMap } = useMemo(() => {
    const sMap: Record<string, string> = {};
    const rsMap: Record<string, string> = {};
    products.forEach(p => {
      p.specifications?.forEach(spec => {
        if (spec.inFilter && spec.filterSlug) {
          sMap[spec.key] = spec.filterSlug;
          rsMap[spec.filterSlug] = spec.key;
        }
      });
    });
    return { slugMap: sMap, reverseSlugMap: rsMap };
  }, [products]);

  // Keep a stable slugMap ref so Effect #2 doesn't fire when slugMap changes
  const slugMapRef = useRef(slugMap);
  useEffect(() => { slugMapRef.current = slugMap; }, [slugMap]);

  // ① Once products are ready, parse URL params ONCE and apply to store
  const reverseSlugMapRef = useRef(reverseSlugMap);
  useEffect(() => { reverseSlugMapRef.current = reverseSlugMap; }, [reverseSlugMap]);

  // urlReadyRef: set to true AFTER Effect #1 has applied URL → store.
  // Effect #2 checks this before it writes store → URL to avoid a race.
  const urlReadyRef = useRef(false);

  useEffect(() => {
    if (urlInitialized.current) return;
    if (loading && products.length === 0) return; // wait for data

    // Make sure slug maps are current before reading URL
    reverseSlugMapRef.current = reverseSlugMap;
    slugMapRef.current = slugMap;

    urlInitialized.current = true;

    if (location.search && location.search.length > 1) {
      const fromUrl = searchParamsToFilters(searchParams, reverseSlugMapRef.current);
      const merged: any = { ...useStore.getState().filters, ...fromUrl };
      if (categoryParam && !merged.category) {
        // Prefer actual category name from loaded products; fall back to slug
        const match = products.find((p: Product) => p.categorySlug === categoryParam);
        merged.category = [match ? match.category : getCategoryNameFromSlug(categoryParam)];
      }
      setFilters(merged);
    }

    // Signal that URL has been read; Effect #2 may now write back safely
    urlReadyRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, products.length]);

  // Track the applied params to prevent store-to-URL sync from overriding URL-to-store changes
  const appliedCategoryParam = useRef<string | undefined>(undefined);
  const appliedSubcategoryParam = useRef<string | undefined>(undefined);
  const justSyncingUrl = useRef(false);

  // ② Whenever filters change → write them back to the URL (excluding category & subcategory since they are in the path)
  useEffect(() => {
    if (justSyncingUrl.current) {
      justSyncingUrl.current = false;
      return;
    }

    if (!urlReadyRef.current) return;  // Don't fire before URL has been read

    const decodedSubcategory = subcategoryParam ? decodeURIComponent(subcategoryParam) : undefined;

    // Check if the URL params change has already been processed and synced to the store.
    // If not, do NOT execute navigate/write filters back to URL, as it would cause race conditions.
    if (categoryParam !== appliedCategoryParam.current || decodedSubcategory !== appliedSubcategoryParam.current) {
      return;
    }

    const newParams = filtersToSearchParams(filters, slugMapRef.current, !!categoryParam, !!subcategoryParam);
    const newStr = newParams.toString();
    const currentStr = new URLSearchParams(location.search).toString();

    const currentSubcategoryVal = filters.subcategory?.[0];

    if (currentSubcategoryVal !== decodedSubcategory) {
      if (currentSubcategoryVal) {
        navigate(`/products/${categoryParam}/${encodeURIComponent(currentSubcategoryVal)}${newStr ? `?${newStr}` : ''}`, { replace: true });
      } else {
        navigate(`/products/${categoryParam}${newStr ? `?${newStr}` : ''}`, { replace: true });
      }
    } else if (newStr !== currentStr) {
      setSearchParams(newParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, categoryParam, subcategoryParam]);

  // ③ When category or subcategory param changes, sync category/subcategory filters
  useEffect(() => {
    const decodedSubcategory = subcategoryParam ? decodeURIComponent(subcategoryParam) : undefined;
    if (categoryParam === appliedCategoryParam.current && decodedSubcategory === appliedSubcategoryParam.current) return;

    justSyncingUrl.current = true;
    appliedCategoryParam.current = categoryParam;
    appliedSubcategoryParam.current = decodedSubcategory;

    if (categoryParam) {
      // Store categoryParam as-is; filteredProducts matches both .category and .categorySlug
      setFilters({
        ...useStore.getState().filters,
        category: [categoryParam],
        subcategory: decodedSubcategory ? [decodedSubcategory] : undefined,
        brand: undefined,
        color: undefined,
        size: undefined,
      });
    } else if (!location.search) {
      setFilters({
        ...useStore.getState().filters,
        category: undefined,
        subcategory: undefined,
        brand: undefined,
        color: undefined,
        size: undefined,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryParam, subcategoryParam]);

  // Apply filters to products
  const filteredProducts = useMemo(() => {
    return filterProducts(products || [], filters);
  }, [products, filters]);

  // Apply sorting
  const sortedProducts = useMemo(() => {
    return sortProducts(filteredProducts, filters.sortBy);
  }, [filteredProducts, filters.sortBy]);

  // ── Products slice for progressive loading ──
  const currentProducts = sortedProducts.slice(0, visibleCount);
  const hasMore = visibleCount < sortedProducts.length;

  // ─── Scroll to top after first render ────────────────────────────────────
  useLayoutEffect(() => {
    if (scrollRestored.current) return;
    if (loading || sortedProducts.length === 0) return;
    scrollRestored.current = true;
    setTimeout(() => {
      blockReset.current = false;
    }, 1500);
  }, [loading, sortedProducts.length]);

  // ─── Reset visible count when user changes filters ───────────────────────
  useEffect(() => {
    if (blockReset.current) return;
    setVisibleCount(12);
  }, [filters]);

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 12);
  };



  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };


  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50">
      <SEOHelmet
        title={
          categoryDisplayName
            ? `${categoryDisplayName}${decodedSubcategoryParam ? ` - ${decodedSubcategoryParam}` : ''} | بازار للموضه`
            : 'جميع المنتجات الإلكترونية | بازار للموضه'
        }
        description={
          categoryDisplayName
            ? `تسوق أفضل ${categoryDisplayName}${decodedSubcategoryParam ? ` - ${decodedSubcategoryParam}` : ''} في مصر. تشكيلة واسعة بأفضل الأسعار وضمان معتمد من بازار للموضه.`
            : 'تصفح جميع المنتجات الإلكترونية في بازار للموضه: لابتوبات، هواتف، شاشات، كمبيوترات، إكسسوارات ومعدات تصوير بأفضل الأسعار في مصر.'
        }
        keywords={
          categoryDisplayName
            ? `${categoryDisplayName}, ${decodedSubcategoryParam || ''}, بازار للموضه, شراء ${categoryDisplayName}, ${categoryDisplayName} مصر, للموضه - ملابس - أحذيه مصر`
            : 'بازار للموضه, لابتوب, هاتف, شاشة, كمبيوتر, إكسسوارات, معدات تصوير, للموضه - ملابس - أحذيه مصر'
        }
        url={categoryParam ? `/products/${categoryParam}${decodedSubcategoryParam ? `/${encodeURIComponent(decodedSubcategoryParam)}` : ''}` : '/products'}
        breadcrumbs={[
          ...(categoryDisplayName ? [{ name: categoryDisplayName, url: `/products/${categoryParam}` }] : []),
          ...(decodedSubcategoryParam ? [{ name: decodedSubcategoryParam, url: `/products/${categoryParam}/${encodeURIComponent(decodedSubcategoryParam)}` }] : [])
        ]}
      />

      {/* Page Header */}
      {/* <div className="bg-white border-b border-gray-100 py-6">
        <div className="container">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>

              <p className="text-sm text-gray-500 mt-1">
                {sortedProducts.length > 0
                  ? `${sortedProducts.length} منتج متاح`
                  : "جاري تحميل المنتجات..."}
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 font-semibold text-xs border border-blue-100">
                HP • Dell • Lenovo
              </span>
            </div>
          </div>
        </div>
      </div> */}

      <div className="container py-6 flex-1">
        {/* Breadcrumb */}
        <nav aria-label="breadcrumb" className="mb-6 flex items-center gap-1.5 text-sm bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm animate-fade-slide-in flex-wrap">
          {/* "الأقسام" segment - links to /categories instead of /products/all to avoid fetching all products */}
          <Link
            to="/categories"
            className="text-gray-400 hover:text-primary transition-colors duration-200 font-medium"
          >
            الأقسام
          </Link>

          {/* category segment */}
          {categoryParam && categoryParam !== "all" && (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-gray-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
              {decodedSubcategoryParam ? (
                <Link
                  to={`/products/${categoryParam}`}
                  className="text-gray-400 hover:text-primary transition-colors duration-200 font-medium"
                >
                  {categoryParam}
                </Link>
              ) : (
                <span className="font-extrabold text-primary bg-primary/5 border border-primary/20 px-3 py-1 rounded-xl text-xs sm:text-sm shadow-sm">
                  {categoryParam}
                </span>
              )}
            </>
          )}

          {/* Subcategory segment */}
          {decodedSubcategoryParam && (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-gray-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
              <span className="font-extrabold text-primary bg-primary/5 border border-primary/20 px-3 py-1 rounded-xl text-xs sm:text-sm shadow-sm">
                {decodedSubcategoryParam}
              </span>
            </>
          )}
        </nav>

        <ActiveFilters />

        {/* Search */}
        <div className="w-full mb-5">
          <ProductSearch
            value={filters.search || ""}
            onChange={(value) => setFilters({ ...filters, search: value })}
            placeholder={categoryDisplayName ? `ابحث في ${categoryDisplayName}...` : "ابحث عن اسم المنتج..."}
          />
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Mobile Filter Button */}
          <div className="md:hidden mb-2">
            <Drawer open={openDrawer} onOpenChange={setOpenDrawer}>
              <DrawerTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full font-bold text-primary border-primary/30 hover:bg-primary hover:text-white transition-all duration-300 rounded-xl shadow-sm gap-2"
                >
                  <Filter className="h-4 w-4" />
                  التصفية والفلترة
                  {Object.keys(filters).filter(k => filters[k as keyof typeof filters] !== undefined
                    && filters[k as keyof typeof filters] !== ''
                    && k !== 'search' && k !== 'sortBy').length > 0 && (
                      <span className="mr-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                        !
                      </span>
                    )}
                </Button>
              </DrawerTrigger>
              <DrawerContent className="rounded-t-3xl">
                <div className="mx-auto w-full max-w-sm">
                  <DrawerHeader>
                    <DrawerTitle className="text-center font-bold">{t("filters.title")}</DrawerTitle>
                  </DrawerHeader>
                  <div className="p-4 overflow-y-auto max-h-[75vh]">
                    <ProductFilters />
                  </div>
                  <DrawerFooter className="border-t pt-4">
                    <Button
                      onClick={() => setOpenDrawer(false)}
                      className="w-full rounded-xl bg-primary hover:bg-primary/95 text-white font-bold transition-all shadow-md"
                    >
                      {t("filters.apply")}
                    </Button>
                  </DrawerFooter>
                </div>
              </DrawerContent>
            </Drawer>
          </div>

          {/* Desktop Sidebar */}
          <div className="hidden md:block lg:w-72 w-60 shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-20">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-5 w-1 bg-primary rounded-full" />
                <h2 className="text-base font-bold text-gray-800">{t("filters.title")}</h2>
              </div>
              <ProductFilters />
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1">
            {/* View Toggle Toolbar */}
            <div className="flex justify-end gap-2 mb-4">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={viewMode === 'grid' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'border-primary/20 text-primary hover:bg-primary/5'}
              >
                <LayoutGrid className="w-4 h-4 mr-2" />
                شبكة
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'border-primary/20 text-primary hover:bg-primary/5'}
              >
                <List className="w-4 h-4 mr-2" />
                قائمة
              </Button>
            </div>

            {loading && currentProducts.length === 0 ? (
              /* ── Skeleton loading (initial load) ── */
              <div className={`grid ${viewMode === 'grid' ? 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'grid-cols-1 gap-4'}`}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className={`rounded-2xl overflow-hidden border border-gray-100 bg-white ${viewMode === 'list' ? 'flex h-40' : ''}`}>
                    <div className={`${viewMode === 'list' ? 'w-40' : 'aspect-[4/5]'} shimmer`} />
                    <div className="p-4 space-y-2 flex-1">
                      <div className="h-4 shimmer rounded-lg w-3/4" />
                      <div className="h-3 shimmer rounded-lg w-1/2" />
                      <div className="h-5 shimmer rounded-lg w-1/3 mt-2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : currentProducts.length > 0 ? (
              <>
                <div className={`grid ${viewMode === 'grid' ? 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'} gap-4`}>
                  {currentProducts.map((product, i) => (
                    <div
                      key={product.id}
                      style={{
                        animationDelay: `${Math.min(i % 12, 11) * 0.04}s`,
                      }}
                      className="animate-fade-slide-in"
                    >
                      <ProductCard
                        product={product}
                        onView={() => handleViewProduct(product)}
                        viewMode={viewMode}
                      />
                    </div>
                  ))}
                </div>

                {/* ── Show More Controls ── */}
                <div className="mt-12 pb-12 flex flex-col items-center gap-3 w-full max-w-xs mx-auto text-center">
                  <span className="text-xs text-gray-400 font-semibold">
                    تم عرض {Math.min(visibleCount, sortedProducts.length)} من {sortedProducts.length} منتج
                  </span>

                  <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${(Math.min(visibleCount, sortedProducts.length) / Math.max(1, sortedProducts.length)) * 100}%` }}
                    />
                  </div>

                  {hasMore ? (
                    <Button
                      onClick={handleLoadMore}
                      className="mt-2 w-full h-10 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl transition-colors border-none shadow-none"
                    >
                      عرض المزيد
                    </Button>
                  ) : (
                    <span className="text-xs text-gray-400 font-medium mt-1">
                      لقد شاهدت جميع المنتجات المتاحة في هذا القسم
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 rounded-3xl bg-primary/5 flex items-center justify-center mb-4">
                  <Search className="h-10 w-10 text-primary/30" />
                </div>
                <h3 className="text-xl font-bold text-gray-700 mb-2">لا توجد نتائج</h3>
                <p className="text-gray-400 text-sm max-w-xs">{t("products.noProductsFound")}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedProduct && (
        <ProductModal product={selectedProduct} open={isModalOpen} onOpenChange={setIsModalOpen} />
      )}

      <Footer />
    </div>
  );
}

