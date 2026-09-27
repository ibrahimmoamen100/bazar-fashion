'use client';

import { useEffect, useMemo, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { getCategorySlugFromName, getCategoryNameFromSlug } from "@/utils/category";
import { SEOHelmet } from "@/components/SEOHelmet";
import Footer from "@/components/Footer";
import { ChevronRight, ChevronLeft, Package, LayoutGrid, Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Product } from "@/types/product";

/* ─────────────────────────────────────────────
   CategorySearch Component (Exact Navbar Search Clone)
───────────────────────────────────────────── */
function CategorySearch() {
  const products = useStore((s) => s.products) || [];
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchDisplayCount, setSearchDisplayCount] = useState(4);
  const [isRtl, setIsRtl] = useState(true);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Detect document direction (RTL or LTR)
  useEffect(() => {
    setIsRtl(document.documentElement.dir === "rtl");
    const observer = new MutationObserver(() => {
      setIsRtl(document.documentElement.dir === "rtl");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["dir"] });
    return () => observer.disconnect();
  }, []);

  // Click outside to close search dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Reset display count when search query changes
  useEffect(() => {
    setSearchDisplayCount(4);
  }, [searchQuery]);

  // Compute matched products matching name, specifications, brand, category (Exact Navbar logic)
  const matchedProducts = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (p.isArchived) return false;
      const nameMatch = p.name?.toLowerCase().includes(query);
      const specMatch = p.specifications?.some(
        (s) =>
          s.key?.toLowerCase().includes(query) ||
          s.value?.toLowerCase().includes(query)
      );
      const brandMatch = p.brand?.toLowerCase().includes(query);
      const categoryMatch = p.category?.toLowerCase().includes(query);
      return nameMatch || specMatch || brandMatch || categoryMatch;
    });
  }, [searchQuery, products]);

  const displayedSearchResults = useMemo(() => {
    return matchedProducts.slice(0, searchDisplayCount);
  }, [matchedProducts, searchDisplayCount]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchDisplayCount((prev) => prev + 4);
    }
  };

  const isDropdownVisible = (showSearchDropdown || isSearchFocused) && searchQuery.trim().length > 0;

  return (
    <div className="bg-white border-b border-gray-100 py-6 shadow-sm relative z-30" style={{ contain: "none" }}>
      <div className="container max-w-2xl px-4 mx-auto relative z-30" style={{ contain: "none" }}>
        <p className="text-center text-xs sm:text-sm text-gray-500 font-semibold mb-3">
          أو ابحث مباشرة في جميع منتجات المتجر
        </p>
        <div ref={searchContainerRef} className="relative w-full z-40" style={{ contain: "none" }}>
          <form onSubmit={handleSearchSubmit} className="w-full">
            <div
              className={`flex items-center gap-2 h-[46px] sm:h-[50px] rounded-xl border transition-all duration-300 bg-gray-50/50 overflow-hidden
                ${isSearchFocused
                  ? "border-primary bg-white shadow-lg shadow-primary/5 ring-4 ring-primary/8"
                  : "border-gray-200 hover:border-gray-300"
                }`}
            >
              <Search className="h-[18px] w-[18px] text-gray-400 shrink-0 ml-3.5 rtl:mr-3.5 rtl:ml-0" />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchDropdown(true);
                }}
                onFocus={() => {
                  setIsSearchFocused(true);
                  setShowSearchDropdown(true);
                }}
                placeholder="ابحث عن أي شيء في المتجر..."
                className="flex-1 bg-transparent text-[13px] sm:text-[14px] text-gray-700 placeholder:text-gray-400 outline-none min-w-0 py-2 font-medium"
                aria-label="بحث عن منتجات"
              />
              <AnimatePresence>
                {searchQuery && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setShowSearchDropdown(false);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                    aria-label="مسح البحث"
                  >
                    <X className="h-4 w-4" />
                  </motion.button>
                )}
              </AnimatePresence>
              <button
                type="submit"
                className="h-full px-4 sm:px-5 bg-primary text-white text-xs sm:text-sm font-bold hover:bg-primary/95 transition-colors shrink-0 flex items-center gap-1.5"
                aria-label="بحث"
              >
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">بحث</span>
              </button>
            </div>
          </form>

          {/* Instant Search Results Dropdown */}
          <AnimatePresence>
            {isDropdownVisible && (
              <motion.div
                key="category-search-dropdown-menu"
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200/90 rounded-2xl shadow-2xl z-50 overflow-hidden py-1"
                dir={isRtl ? "rtl" : "ltr"}
              >
                {displayedSearchResults.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-gray-400 font-semibold">
                    لا توجد منتجات مطابقة للبحث
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col">
                      {displayedSearchResults.map((prod) => (
                        <Link
                          key={prod.id}
                          to={`/product/${prod.id}`}
                          onClick={() => {
                            setShowSearchDropdown(false);
                            setSearchQuery("");
                          }}
                          className="flex items-center gap-3.5 px-4 sm:px-5 py-3 hover:bg-primary/5 transition-colors border-b border-gray-100 last:border-0"
                        >
                          <img
                            src={prod.images?.[0] || "/logo3.png"}
                            alt={prod.name}
                            className="w-11 h-11 object-contain rounded-lg border border-gray-100 bg-white shrink-0"
                            width="44"
                            height="44"
                          />
                          <div className="flex-1 min-w-0 flex flex-col items-start text-right">
                            <span className="text-[13px] font-bold text-gray-800 truncate w-full text-right">
                              {prod.name}
                            </span>
                            <span className="text-[11px] text-gray-400 font-semibold mt-0.5">
                              {prod.brand} • {prod.category}
                            </span>
                          </div>
                          <div className="text-xs sm:text-sm font-extrabold text-primary shrink-0">
                            {prod.price} ج.م
                          </div>
                        </Link>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSearchDisplayCount((prev) => prev + 4)}
                      className="w-full text-center py-3 bg-gray-50 hover:bg-primary/5 text-primary text-xs font-bold border-t border-gray-100 transition-colors block"
                    >
                      {searchDisplayCount < matchedProducts.length ? (
                        <span>عرض المزيد ({matchedProducts.length - searchDisplayCount} منتج إضافي)</span>
                      ) : (
                        <span className="text-gray-400">تم عرض جميع النتائج ({matchedProducts.length} منتج)</span>
                      )}
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}


/* ─────────────────────────────────────────────
   Main Categories Page
───────────────────────────────────────────── */
export default function Categories({ initialProducts = [] }: { initialProducts?: Product[] }) {
  const storeProducts = useStore((state) => state.products);
  const products = storeProducts.length > 0 ? storeProducts : initialProducts;
  const loadedCategory = useStore((state) => state.loadedCategory);
  const loadProducts = useStore((state) => state.loadProducts);
  const loading = useStore((state) => state.loading);

  // Ensure the FULL catalog is loaded (not a category-filtered subset).
  // loadedCategory !== undefined means the store has category-specific products only,
  // so we must reload the full catalog for the categories grid to be accurate.
  // We also reload if the store is empty.
  useEffect(() => {
    const needsFullCatalog = storeProducts.length === 0 || loadedCategory !== undefined;
    if (needsFullCatalog) {
      loadProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Group products by category and calculate metadata
  const categoriesData = useMemo(() => {
    const map: Record<string, { name: string; count: number; image: string; slug: string; customImage?: string }> = {};
    products.forEach((p) => {
      if (p.category && !p.isArchived) {
        const slug = getCategorySlugFromName(p.category);
        if (!map[p.category]) {
          map[p.category] = {
            name: p.category,
            count: 0,
            image: p.images?.[0] || "/placeholder.png",
            slug,
          };
        }
        map[p.category].count += 1;

        // Extract custom category image if available
        const customImg = p.specifications?.find((s: any) => s.key === "الفئة")?.categoryImage;
        if (customImg && !map[p.category].customImage) {
          map[p.category].customImage = customImg;
        }

        // Prefer products with actual images over placeholders
        if (p.images?.[0] && (!map[p.category].image || map[p.category].image === "/placeholder.png")) {
          map[p.category].image = p.images[0];
        }
      }
    });
    return Object.values(map)
      .map(cat => ({
        ...cat,
        image: cat.customImage || cat.image
      }))
      .sort((a, b) => b.count - a.count);
  }, [products]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50">
      <SEOHelmet
        title="تصفح الأقسام - بازار للموضه"
        description="تصفح جميع فئات المنتجات المتاحة في بازار للموضه وابحث عن الأجهزة والإكسسوارات المثالية لك."
        keywords="أقسام, فئات, لابتوبات, شاشات, إكسسوارات"
        url="/categories"
      />

      {/* Hero Header Section — Styled with Store Theme Colors */}
      <div
        className="relative py-10 md:py-14 overflow-hidden text-white shadow-md"
        style={{ backgroundColor: "var(--topbar-bg, #155654)" }}
      >
        {/* Subtle decorative background shapes with store orange/amber highlights */}
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary via-orange-400 to-transparent pointer-events-none" />
        <div className="absolute -left-20 -top-20 w-80 h-80 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-orange-500/20 blur-3xl" />

        <div className="container relative z-10 text-center space-y-3 px-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold tracking-wide uppercase text-white">
            <LayoutGrid className="w-3.5 h-3.5 text-primary" />
            أقسام المتجر المتكاملة
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight text-white">
            تصفح متجرنا حسب الأقسام
          </h1>
          <p className="text-white/80 max-w-lg mx-auto text-xs sm:text-base font-medium">
            اكتشف تشكيلة واسعة وممتازة من الأجهزة والللموضه - ملابس - أحذيه والملابس المنسقة لك بكل عناية.
          </p>
        </div>
      </div>

      {/* Inline Search Bar (Navbar Clone) */}
      <CategorySearch />

      {/* Main Categories Grid — 2 Cards per row on Mobile! */}
      <div className="container py-8 md:py-12 flex-1 px-4 relative z-0">
        {loading && categoriesData.length === 0 ? (
          /* Premium Shimmer Loading State */
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-gray-100 shadow-sm space-y-3">
                <div className="aspect-[4/3] w-full rounded-xl sm:rounded-2xl shimmer" />
                <div className="h-4 sm:h-5 shimmer rounded-lg w-2/3" />
                <div className="h-3 sm:h-4 shimmer rounded-lg w-1/3" />
              </div>
            ))}
          </div>
        ) : categoriesData.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {categoriesData.map((cat, i) => (
              <Link
                key={cat.slug}
                to={`/products/${cat.slug}`}
                style={{
                  animationDelay: `${Math.min(i * 0.05, 0.4)}s`,
                }}
                className="group relative flex flex-col bg-white border border-gray-150/60 rounded-2xl sm:rounded-[28px] overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 animate-fade-slide-in"
              >
                {/* Image Wrapper */}
                <div className="aspect-[4/3] w-full overflow-hidden bg-gray-50 relative">
                  <img
                    src={cat.image}
                    alt={getCategoryNameFromSlug(cat.name)}
                    className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    loading="lazy"
                  />

                  {/* Dynamic Product Count Badge */}
                  <span className="absolute top-2 right-2 sm:top-4 sm:right-4 flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl sm:rounded-2xl bg-white/95 backdrop-blur text-gray-800 text-[10px] sm:text-xs font-extrabold shadow-sm border border-gray-100/50">
                    <Package className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" />
                    <span>{cat.count} منتج</span>
                  </span>
                </div>

                {/* Info Content */}
                <div className="p-3 sm:p-5 flex items-center justify-between gap-2 sm:gap-3 bg-white transition-colors duration-300 group-hover:bg-primary">
                  <div className="space-y-0.5 sm:space-y-1 flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-xs sm:text-base group-hover:text-white transition-colors duration-300 truncate">
                      {getCategoryNameFromSlug(cat.name)}
                    </h3>
                    <p className="text-[10px] sm:text-xs text-gray-400 font-semibold group-hover:text-white/85 transition-colors duration-300 truncate">
                      تصفح المنتجات
                    </p>
                  </div>

                  {/* Circle Action Button */}
                  <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-primary/10 flex items-center justify-center transition-all duration-300 shrink-0 group-hover:bg-white group-hover:shadow-sm">
                    <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary transition-colors duration-300" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 sm:py-20 bg-white border border-gray-100 rounded-2xl sm:rounded-3xl shadow-sm max-w-md mx-auto px-4">
            <LayoutGrid className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-bold text-gray-700">لا توجد أقسام متاحة</h3>
            <p className="text-gray-400 text-xs sm:text-sm mt-1">لم يتم العثور على أي أقسام تحتوي على منتجات نشطة حالياً.</p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
