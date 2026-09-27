'use client';

import {
  ShoppingCart,
  Menu,
  Home,
  Info,
  MapPin,
  Briefcase,
  LayoutGrid,
  ChevronDown,
  ChevronRight,
  Search,
  X,
  Phone,
  GitCompare,
  Store,
  Cpu,
  PackageSearch,
} from "lucide-react";
import { FaFacebook, FaTiktok, FaWhatsapp, FaYoutube } from "react-icons/fa";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store/useStore";
import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { getTrackedOrders } from "@/utils/orderTracking";
import { useState, useMemo, useRef, useEffect } from "react";
import { STORE_LOGO_TEXT } from "@/constants/store";
import { motion, AnimatePresence } from "framer-motion";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { getCategorySlugFromName, getCategoryNameFromSlug } from "@/utils/category";
import { useCompareStore } from "@/store/useCompareStore";
import { toast } from "sonner";

/* ─────────────────────────────────────────────
   Navigation links for the bottom navbar
───────────────────────────────────────────── */
const bottomNavLinks = [
  { id: "home", href: "/", icon: Home, label: "الرئيسية" },
  // { id: "builder", href: "/builder", icon: Cpu, label: "ابني تجميعتك" },
  { id: "categories", href: "/categories", icon: LayoutGrid, label: "الأقسام" },
  // { id: "shops", href: "/shops", icon: Store, label: "التجار" },
  { id: "about", href: "/about", icon: Info, label: "من نحن" },
];

export function Navbar() {
  const cart = useStore((s) => s.cart);
  const products = useStore((s) => s.products) || [];
  const compareList = useCompareStore((s) => s.compareList);
  const openCompare = useCompareStore((s) => s.openCompare);
  const { t } = useTranslation();
  const { settings } = useSiteSettings();
  const location = useLocation();
  const navigate = useNavigate();

  // States
  const [isOpen, setIsOpen] = useState(false);
  const [isCatDropdown, setIsCatDropdown] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [isMobileCatOpen, setIsMobileCatOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isRtl, setIsRtl] = useState(true);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchDisplayCount, setSearchDisplayCount] = useState(4);
  const [trackedOrdersCount, setTrackedOrdersCount] = useState(0);

  useEffect(() => {
    const updateCount = () => {
      const list = getTrackedOrders();
      setTrackedOrdersCount(list.length);
    };
    updateCount();
    window.addEventListener("bazar_tracked_orders_updated", updateCount);
    window.addEventListener("storage", updateCount);
    return () => {
      window.removeEventListener("bazar_tracked_orders_updated", updateCount);
      window.removeEventListener("storage", updateCount);
    };
  }, []);

  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const mobileSearchContainerRef = useRef<HTMLDivElement>(null);

  const isActive = (href: string) =>
    href === "/" ? location.pathname === "/" : location.pathname.startsWith(href);

  // Detect document direction (RTL or LTR)
  useEffect(() => {
    setIsRtl(document.documentElement.dir === "rtl");
    const observer = new MutationObserver(() => {
      setIsRtl(document.documentElement.dir === "rtl");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["dir"] });
    return () => observer.disconnect();
  }, []);

  // Click outside for search dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const clickedInsideDesktop = searchContainerRef.current && searchContainerRef.current.contains(e.target as Node);
      const clickedInsideMobile = mobileSearchContainerRef.current && mobileSearchContainerRef.current.contains(e.target as Node);
      if (!clickedInsideDesktop && !clickedInsideMobile) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Compute matched products globally (matches name or specifications)
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

  // Reset display count when query changes
  useEffect(() => {
    setSearchDisplayCount(4);
  }, [searchQuery]);

  /* ─────────────────────────────────────────────
     Build Categories Tree with Subcategories
  ───────────────────────────────────────────── */
  const categoriesTree = useMemo(() => {
    // 1. Read cached tree if it exists
    let cachedTree: Array<{ name: string; slug: string; subcategories: string[]; categoryImage?: string }> = [];
    try {
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('bazar_categories_tree_cache');
        if (cached) {
          cachedTree = JSON.parse(cached);
        }
      }
    } catch (e) {
      console.warn("Failed to parse cached categories tree", e);
    }

    // 2. Build tree from current products in store
    const tree: Record<string, Set<string>> = {};
    products.forEach((p) => {
      if (p.category && !p.isArchived) {
        if (!tree[p.category]) {
          tree[p.category] = new Set<string>();
        }
        if (p.subcategory) {
          tree[p.category].add(p.subcategory);
        }
      }
    });

    const result: Array<{ name: string; slug: string; subcategories: string[]; categoryImage?: string }> = [];
    Object.keys(tree).sort().forEach((cat) => {
      // Find the first product in this category that has a specification with key === "الفئة" and a categoryImage
      const prodWithImg = products.find(
        (p) =>
          p.category === cat &&
          !p.isArchived &&
          p.specifications?.some((s) => s.key === "الفئة" && s.categoryImage)
      );
      const categoryImage = prodWithImg
        ? prodWithImg.specifications?.find((s) => s.key === "الفئة")?.categoryImage
        : undefined;

      result.push({
        name: cat,
        slug: getCategorySlugFromName(cat),
        subcategories: Array.from(tree[cat]).sort(),
        categoryImage,
      });
    });

    // 3. Merge or save
    const isAllLoaded = useStore.getState().loadedCategory === undefined && products.length > 0;
    if (isAllLoaded) {
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('bazar_categories_tree_cache', JSON.stringify(result));
        }
      } catch (e) {
        console.warn("Failed to save categories tree cache", e);
      }
      return result;
    }

    if (cachedTree.length > 0) {
      return cachedTree;
    }

    return result;
  }, [products]);

  // Active Category currently hovered or default to first if none hovered and list is not empty
  const activeHoveredCategoryObj = useMemo(() => {
    if (!hoveredCategory && categoriesTree.length > 0) {
      return categoriesTree[0];
    }
    return categoriesTree.find((c) => c.name === hoveredCategory) || null;
  }, [hoveredCategory, categoriesTree]);

  /* Filter bottom links based on settings */
  const visibleBottomLinks = bottomNavLinks.filter(
    (item) => item.id !== "wholesale" || settings.isImporter !== false
  );

  /* Search submit - only for form accessibility, doesn't navigate to /products/all */
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Expand results in-place instead of navigating to /products/all
    if (searchQuery.trim()) {
      setSearchDisplayCount((prev) => prev + 4);
    }
  };

  /* Close dropdown when clicking outside */
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsCatDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /* Lock body scroll when mobile sidebar is open (modal={false} disables Radix built-in scroll lock) */
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position and lock body
      const scrollY = window.scrollY;
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
    } else {
      // Restore scroll position and unlock body
      const top = document.body.style.top;
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      if (top) {
        window.scrollTo(0, -parseInt(top, 10));
      }
    }
    return () => {
      // Cleanup on unmount
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
    };
  }, [isOpen]);

  return (
    <div className="sticky top-0 z-40 flex flex-col w-full bg-white select-none">

      {/* ═══════════════════════════════════════
          MAIN NAVBAR  —  Logo | Search | Cart & Icons
      ═══════════════════════════════════════ */}
      <div className="bg-white border-b border-gray-100 shadow-sm relative z-20">
        <div
          className="container flex h-[76px] items-center justify-between gap-4 px-4 md:px-8"
          style={{ contain: "none" }}
        >
          {/* Logo */}
          <Link to="/" className="flex items-center shrink-0 group py-1" aria-label="الصفحة الرئيسية">
            <motion.img
              src={settings.logoNavbarUrl || settings.logoUrl || "/logo3.png"}
              alt={settings.storeName || STORE_LOGO_TEXT}
              className="h-[52px] w-auto transition-transform duration-300 group-hover:scale-103"
              whileHover={{ scale: 1.02 }}
              width="130"
              height="52"
            />
          </Link>

          {/* Search Bar — Sigma Style */}
          <div ref={searchContainerRef} className="flex-1 relative max-w-[620px] mx-auto hidden md:block z-50">
            <form
              onSubmit={handleSearchSubmit}
              className="w-full"
            >
              <div
                className={`flex items-center gap-2 h-[46px] rounded-xl border transition-all duration-300 bg-gray-50/50 overflow-hidden
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
                  onBlur={() => setIsSearchFocused(false)}
                  placeholder="ابحث عن أي شيء..."
                  className="flex-1 bg-transparent text-[14px] text-gray-700 placeholder:text-gray-400 outline-none min-w-0 py-2 font-medium"
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
                  className="h-full px-5 bg-primary text-white text-sm font-bold hover:bg-primary/95 transition-colors shrink-0 flex items-center gap-1.5"
                  aria-label="بحث"
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </form>

            {/* Instant Search Results Dropdown */}
            <AnimatePresence>
              {showSearchDropdown && searchQuery.trim() && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className={`absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200/90 rounded-2xl shadow-2xl z-[99999] overflow-hidden py-1`}
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
                            className="flex items-center gap-3.5 px-5 py-3 hover:bg-primary/5 transition-colors border-b border-gray-100 last:border-0"
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
                                {prod.brand}
                              </span>
                            </div>
                            <div className="text-sm font-extrabold text-primary shrink-0">
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

          {/* Actions: Wishlist | Login/Register | Cart & Compare */}
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            {/* Compare Icon */}
            {/* <motion.div
              className="relative"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  if (compareList.length > 0) {
                    openCompare();
                  } else {
                    toast.info("قائمة المقارنة فارغة. أضف منتجات للمقارنة أولاً.");
                  }
                }}
                className="relative rounded-2xl border-gray-200 hover:border-primary/50 hover:bg-primary/5 shadow-sm h-11 w-11 flex items-center justify-center"
                title="مقارنة المنتجات"
                aria-label="مقارنة المنتجات"
              >
                <GitCompare className="h-[20px] w-[20px] text-gray-600" />
                <AnimatePresence>
                  {compareList.length > 0 && (
                    <motion.span
                      key="compare-badge"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white shadow-md"
                    >
                      {compareList.length}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </motion.div> */}

            {/* Cart Icon */}
            <Link to="/cart" aria-label="عربة التسوق">
              <motion.div
                className="relative"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div
                  className="relative rounded-2xl border border-gray-200 hover:border-primary/50 hover:bg-primary/5 shadow-sm h-11 w-11 flex items-center justify-center cursor-pointer"
                >
                  <ShoppingCart className="h-[20px] w-[20px] text-gray-600" />
                  <AnimatePresence>
                    {cart.length > 0 && (
                      <motion.span
                        key="cart-badge"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white shadow-md"
                      >
                        {cart.length}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </Link>

            {/* Order Tracking Icon */}
            <Link to="/track-order" aria-label="تتبع الطلبات والحجوزات">
              <motion.div
                className="relative"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div
                  className="relative rounded-2xl border border-gray-200 hover:border-primary/50 hover:bg-primary/5 shadow-sm h-11 w-11 flex items-center justify-center cursor-pointer transition-colors"
                  title="تتبع الطلبات والحجوزات"
                >
                  <PackageSearch className="h-[20px] w-[20px] text-gray-600 hover:text-primary transition-colors" />
                  <AnimatePresence>
                    {trackedOrdersCount > 0 && (
                      <motion.span
                        key="tracking-badge"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white shadow-md ring-2 ring-white"
                        title={`${trackedOrdersCount} طلب مسجل`}
                      >
                        {trackedOrdersCount}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </Link>

            {/* Mobile Hamburger Toggle - completely outside Sheet to avoid Radix pointer-events interference */}
            <Button
              variant="outline"
              size="icon"
              className="md:hidden rounded-2xl border-gray-200 hover:bg-gray-50 h-11 w-11 relative overflow-hidden"
              aria-label={isOpen ? "إغلاق القائمة" : "فتح القائمة"}
              onClick={() => setIsOpen((prev) => !prev)}
            >
              {/* Animated hamburger/X icon */}
              <div className="flex flex-col items-center justify-center gap-[5px] w-5 h-5">
                {/* Top line */}
                <motion.span
                  animate={isOpen
                    ? { rotate: 45, y: 7 }
                    : { rotate: 0, y: 0 }
                  }
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  className="block w-5 h-[2px] bg-gray-700 rounded-full origin-center"
                />
                {/* Middle line */}
                <motion.span
                  animate={isOpen
                    ? { opacity: 0, scaleX: 0 }
                    : { opacity: 1, scaleX: 1 }
                  }
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="block w-[14px] h-[2px] bg-gray-700 rounded-full self-end"
                />
                {/* Bottom line */}
                <motion.span
                  animate={isOpen
                    ? { rotate: -45, y: -7 }
                    : { rotate: 0, y: 0 }
                  }
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  className="block w-5 h-[2px] bg-gray-700 rounded-full origin-center"
                />
              </div>
            </Button>

            {/* Mobile Sidebar Sheet - purely controlled by isOpen state */}
            {/* modal={false} disables Radix body pointer-events lock so Navbar stays interactive */}
            <Sheet open={isOpen} onOpenChange={setIsOpen} modal={false}>
              {/* Mobile Drawer Sidebar - Forced Opaque White Background & Opaque Overlay */}
              <SheetContent
                side="right"
                className="w-[320px] sm:w-[360px] p-0 !bg-white !text-gray-900 border-none shadow-2xl overflow-hidden flex flex-col h-full z-[999990]"
              >
                <MobileMenu
                  settings={settings}
                  visibleBottomLinks={visibleBottomLinks}
                  activeCategories={categoriesTree}
                  isMobileCatOpen={isMobileCatOpen}
                  setIsMobileCatOpen={setIsMobileCatOpen}
                  isActive={isActive}
                  cart={cart}
                  t={t}
                  onClose={() => setIsOpen(false)}
                  location={location}
                  compareList={compareList}
                  openCompare={openCompare}
                  trackedOrdersCount={trackedOrdersCount}
                />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          BOTTOM NAV  —  Sigma Categories & Navigation Links
      ═══════════════════════════════════════ */}
      <div
        className="hidden md:block text-white relative z-10 select-none shadow-md"
        style={{ backgroundColor: "var(--topbar-bg, #155654)" }}
      >
        <div
          className="container flex h-[46px] items-center justify-between px-4 md:px-8"
          style={{ contain: "none" }}
        >
          {/* Right Side (Arabic) / Left Side: Categories button & dropdown menu */}
          <div className="flex items-center gap-2 h-full" ref={dropdownRef}>
            <div className="relative h-full flex items-center">
              {/* Main Categories Trigger */}
              {/* <button
                onClick={() => setIsCatDropdown((v) => !v)}
                onMouseEnter={() => setIsCatDropdown(true)}
                className={`flex items-center gap-3 px-6 h-full text-[14px] font-bold transition-all duration-200 whitespace-nowrap bg-black/20 hover:bg-black/35
                  ${isCatDropdown ? "bg-black/35" : ""}`}
                aria-expanded={isCatDropdown}
                aria-haspopup="true"
              >
                <LayoutGrid className="h-[18px] w-[18px] shrink-0" />
                <span>تصفح الفئات</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-300 ${isCatDropdown ? "rotate-180" : ""}`}
                />
              </button> */}

              {/* Categories Mega Dropdown flyout */}
              <AnimatePresence>
                {isCatDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    onMouseLeave={() => setIsCatDropdown(false)}
                    className={`absolute top-full mt-0 bg-white border border-gray-200/80 shadow-[0_24px_64px_rgba(0,0,0,0.16)] rounded-b-2xl z-50 flex overflow-hidden min-h-[380px]
                      ${isRtl ? "right-0 flex-row" : "left-0 flex-row-reverse"}`}
                  >
                    {/* Panel 1: List of main Categories */}
                    <div
                      className="w-[240px] bg-white py-3 shrink-0 flex flex-col justify-between"
                      style={{
                        borderLeft: isRtl ? "1px solid #f1f5f9" : "none",
                        borderRight: !isRtl ? "1px solid #f1f5f9" : "none",
                      }}
                    >
                      <div className="max-h-[340px] overflow-y-auto">
                        {categoriesTree.map((cat) => (
                          <div
                            key={cat.name}
                            onMouseEnter={() => setHoveredCategory(cat.name)}
                          >
                            <Link
                              to={`/products/${cat.slug}`}
                              onClick={() => setIsCatDropdown(false)}
                              className={`flex items-center justify-between px-5 py-3.5 text-[13px] font-bold transition-all duration-150 group
                                ${activeHoveredCategoryObj?.name === cat.name
                                  ? "text-primary bg-primary/5 font-extrabold"
                                  : "text-gray-700 hover:text-primary hover:bg-gray-50"
                                }`}
                            >
                              <div className="flex items-center gap-2.5 truncate">
                                {cat.categoryImage ? (
                                  <img
                                    src={cat.categoryImage}
                                    alt={getCategoryNameFromSlug(cat.name)}
                                    className="h-5 w-5 rounded object-cover shrink-0"
                                  />
                                ) : (
                                  <div className="h-5 w-5 rounded bg-gray-100 flex items-center justify-center text-[10px] shrink-0 text-gray-400">
                                    📁
                                  </div>
                                )}
                                <span className="truncate">{getCategoryNameFromSlug(cat.name)}</span>
                              </div>
                              <ChevronRight
                                className={`h-4 w-4 transition-colors shrink-0
                                  ${isRtl ? "rotate-180" : ""}
                                  ${activeHoveredCategoryObj?.name === cat.name
                                    ? "text-primary"
                                    : "text-gray-300 group-hover:text-primary"
                                  }`}
                              />
                            </Link>
                          </div>
                        ))}
                      </div>

                      {/* Footer Link to see all */}
                      <div className="px-4 pt-3.5 mt-2 border-t border-gray-100">
                        <Link
                          to="/categories"
                          onClick={() => setIsCatDropdown(false)}
                          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs text-primary hover:bg-primary/8 font-extrabold transition-all"
                        >
                          <span>عرض جميع الأقسام</span>
                          <ChevronRight className={`h-3.5 w-3.5 ${isRtl ? "rotate-180" : ""}`} />
                        </Link>
                      </div>
                    </div>

                    {/* Panel 2: Subcategories (Flyout menu) */}
                    <div className="w-[320px] bg-gray-50/70 p-6 shrink-0 flex flex-col">
                      {activeHoveredCategoryObj ? (
                        <div className="flex-1">
                          {/* Title — clickable link to category page */}
                          <div className="mb-4">
                            <Link
                              to={`/products/${activeHoveredCategoryObj.slug}`}
                              onClick={() => setIsCatDropdown(false)}
                              className="text-[14px] font-extrabold text-gray-900 border-b border-gray-200 pb-2 hover:text-primary transition-colors flex items-center gap-1 group"
                            >
                              <span>{getCategoryNameFromSlug(activeHoveredCategoryObj.name)}</span>
                              <ChevronRight className={`h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity ${isRtl ? "rotate-180" : ""}`} />
                            </Link>
                          </div>

                          {/* Custom Category Image Banner — clickable link */}
                          {activeHoveredCategoryObj.categoryImage && (
                            <Link
                              to={`/products/${activeHoveredCategoryObj.slug}`}
                              onClick={() => setIsCatDropdown(false)}
                              className="block w-full h-[90px] rounded-xl overflow-hidden mb-4 shadow-sm border border-gray-200 bg-white hover:opacity-90 hover:shadow-md transition-all"
                            >
                              <img
                                src={activeHoveredCategoryObj.categoryImage}
                                alt={getCategoryNameFromSlug(activeHoveredCategoryObj.name)}
                                className="w-full h-full object-cover"
                              />
                            </Link>
                          )}

                          {/* Grid of Subcategories */}
                          {activeHoveredCategoryObj.subcategories.length === 0 ? (
                            <div className="py-8 text-center text-gray-500 text-xs font-medium">
                              تصفح جميع المنتجات في هذا القسم بالضغط على العنوان.
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1 max-h-[260px] overflow-y-auto">
                              {activeHoveredCategoryObj.subcategories.map((sub) => (
                                <Link
                                  key={sub}
                                  to={`/products/${activeHoveredCategoryObj.slug}/${encodeURIComponent(sub)}`}
                                  onClick={() => setIsCatDropdown(false)}
                                  className="text-[13px] font-semibold text-gray-800 hover:text-primary hover:bg-primary/8 px-3 py-2.5 rounded-xl transition-all duration-200 flex items-center justify-between group border-r-2 border-transparent hover:border-primary/40"
                                >
                                  <span>{sub}</span>
                                  <ChevronRight className={`h-3.5 w-3.5 text-gray-400 group-hover:text-primary transition-colors ${isRtl ? "rotate-180" : ""}`} />
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-400 text-xs font-semibold py-12">
                          يرجى تمرير الماوس فوق الفئات لعرض الفئات الفرعية
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Vertical Separator */}
            <div className="h-5 w-[1px] bg-white/20 mx-2" />

            {/* Other Navbar Navigation Links - spacing fixed by changing px-4.5 to standard px-4 md:px-5 */}
            <div className="flex items-center gap-1.5 h-full overflow-x-auto scrollbar-none">
              {visibleBottomLinks.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`flex items-center gap-2 px-4.5 md:px-5 h-full text-[13.5px] font-bold whitespace-nowrap transition-all duration-200 border-b-2
                    ${isActive(item.href)
                      ? "bg-white/10 border-white text-white"
                      : "border-transparent text-white/85 hover:text-white hover:bg-white/5 hover:border-white/30"
                    }`}
                >
                  <item.icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{settings.navLinks[item.id as keyof typeof settings.navLinks] || item.label}</span>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Mobile search bar for device consistency */}
      <div ref={mobileSearchContainerRef} className="mobile-search-bar md:hidden px-4 py-2 border-b border-gray-100 bg-gray-50/50 relative z-10">
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <div className="flex items-center gap-2 h-10 rounded-xl border border-gray-200 bg-white overflow-hidden">
            <Search className="h-4 w-4 text-gray-400 shrink-0 ml-3 rtl:mr-3 rtl:ml-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchDropdown(true);
              }}
              onFocus={() => setShowSearchDropdown(true)}
              placeholder="ابحث  في جميع المنتجات..."
              className="flex-1 bg-transparent text-xs text-gray-700 outline-none min-w-0 font-medium py-1.5"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setShowSearchDropdown(false);
                }}
                className="p-1 text-gray-400"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <button type="submit" className="h-full px-3.5 bg-primary text-white text-xs font-bold">
              بحث
            </button>
          </div>
        </form>

        {/* Instant Search Results Dropdown for Mobile */}
        <AnimatePresence>
          {showSearchDropdown && searchQuery.trim() && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className={`absolute top-full left-4 right-4 mt-2 bg-white border border-gray-200/90 rounded-2xl shadow-2xl z-[99999] overflow-hidden py-1`}
              dir={isRtl ? "rtl" : "ltr"}
            >
              {displayedSearchResults.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-gray-400 font-semibold">
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
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-primary/5 transition-colors border-b border-gray-100 last:border-0"
                      >
                        <img
                          src={prod.images?.[0] || "/logo3.png"}
                          alt={prod.name}
                          className="w-9 h-9 object-contain rounded-lg border border-gray-100 bg-white shrink-0"
                          width="36"
                          height="36"
                        />
                        <div className="flex-1 min-w-0 flex flex-col items-start text-right">
                          <span className="text-[12px] font-bold text-gray-800 truncate w-full text-right">
                            {prod.name}
                          </span>
                          <span className="text-[10px] text-gray-400 font-semibold mt-0.5">
                            {prod.brand}
                          </span>
                        </div>
                        <div className="text-xs font-extrabold text-primary shrink-0">
                          {prod.price} ج.م
                        </div>
                      </Link>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSearchDisplayCount((prev) => prev + 4)}
                    className="w-full text-center py-2.5 bg-gray-50 hover:bg-primary/5 text-primary text-[11px] font-bold border-t border-gray-100 transition-colors block"
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
  );
}

/* ─────────────────────────────────────────────
   Mobile Menu Component - Beautiful Opaque UI
───────────────────────────────────────────── */
interface MobileMenuProps {
  settings: any;
  visibleBottomLinks: typeof bottomNavLinks;
  activeCategories: Array<{ name: string; slug: string; subcategories: string[]; categoryImage?: string }>;
  isMobileCatOpen: boolean;
  setIsMobileCatOpen: (v: boolean) => void;
  isActive: (href: string) => boolean;
  cart: any[];
  t: any;
  onClose: () => void;
  location: any;
  compareList: any[];
  openCompare: () => void;
  trackedOrdersCount: number;
}

function MobileMenu({
  settings,
  visibleBottomLinks,
  activeCategories,
  isMobileCatOpen,
  setIsMobileCatOpen,
  isActive,
  cart,
  t,
  onClose,
  location,
  compareList,
  openCompare,
  trackedOrdersCount,
}: MobileMenuProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden bg-white text-gray-900">
      {/* Header with shop brand background color */}
      <div
        className="h-16 px-4 border-b border-black/5 shrink-0 flex  items-center justify-between shadow-xs relative z-40"
        style={{
          background: "linear-gradient(135deg, var(--topbar-bg, #155654) 0%, color-mix(in srgb, var(--topbar-bg, #155654) 85%, #000) 100%)",
        }}
      >
        <Link to="/" onClick={onClose} className="flex flex  items-center gap-2   ">
          <div className="bg-white px-3 py-1.5 rounded-xl shadow-xs border border-white/20 flex flex-col items-center justify-center">
            <img
              src={settings.logoNavbarUrl || settings.logoUrl || "/logo3.png"}
              alt={settings.storeName || STORE_LOGO_TEXT}
              className="h-8 max-h-8 w-auto object-contain"
              width="100"
              height="32"
            />
          </div>
        </Link>
        {/* Placeholder for SheetPrimitive.Close positioning */}
        <div className="w-9 h-9 shrink-0" />
      </div>

      {/* Links Navigation - With generous padding and solid dark gray texts */}
      <nav className="flex-1 overflow-y-auto py-5 px-4 space-y-2.5">
        {/* Mobile categories accordion */}
        <div className="mb-2">
          {/* <button
            onClick={() => setIsMobileCatOpen(!isMobileCatOpen)}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold transition-all duration-200 border shadow-sm
              ${location.pathname.startsWith("/categories") || location.pathname.startsWith("/products")
                ? "bg-primary/10 text-primary border-primary/25"
                : "text-gray-800 bg-gray-50/70 hover:bg-gray-100/80 border-gray-150/80 hover:text-primary"
              }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8.5 h-8.5 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <LayoutGrid className="h-4.5 w-4.5" />
              </div>
              <span className="text-sm font-bold">جميع الفئات</span>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-gray-500 transition-transform duration-300 ${isMobileCatOpen ? "rotate-180" : ""}`}
            />
          </button> */}

          <AnimatePresence>
            {isMobileCatOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="mt-2 mr-3 rtl:ml-3 rtl:mr-0 border-r-2 border-primary/20 pr-3 flex flex-col gap-1">
                  {activeCategories.map((cat) => (
                    <Link
                      key={cat.name}
                      to={`/products/${cat.slug}`}
                      onClick={onClose}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-gray-700 hover:text-primary hover:bg-primary/5 transition-all truncate"
                    >
                      {cat.categoryImage ? (
                        <img
                          src={cat.categoryImage}
                          alt={getCategoryNameFromSlug(cat.name)}
                          className="h-5 w-5 rounded object-cover shrink-0"
                          width="20"
                          height="20"
                        />
                      ) : (
                        <div className="h-5 w-5 rounded bg-gray-100 flex items-center justify-center text-[10px] shrink-0 text-gray-400">
                          📁
                        </div>
                      )}
                      <span className="truncate">{getCategoryNameFromSlug(cat.name)}</span>
                    </Link>
                  ))}
                  <Link
                    to="/categories"
                    onClick={onClose}
                    className="px-3 py-2.5 rounded-xl text-xs font-bold text-primary hover:bg-primary/8 transition-all"
                  >
                    تصفح جميع الأقسام ←
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Separator */}
        <div className="h-px bg-gray-100 my-2 mx-1" />

        {/* Navigation bottom links */}
        {visibleBottomLinks.map((item, i) => {
          const active = isActive(item.href);
          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link
                to={item.href}
                onClick={onClose}
                className={`group flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-sm font-bold transition-all duration-200 border
                  ${active
                    ? "bg-primary/10 text-primary border-primary/25 shadow-sm"
                    : "text-gray-800 bg-white hover:bg-gray-50 border-gray-150/70 hover:text-primary"
                  }`}
              >
                <div className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center shrink-0 transition-colors ${active ? "bg-primary text-white" : "bg-gray-100/90 text-gray-600 group-hover:bg-primary/10 group-hover:text-primary"
                  }`}>
                  <item.icon className="h-4.5 w-4.5" />
                </div>
                <span className="flex-1 text-right">{settings.navLinks[item.id as keyof typeof settings.navLinks] || item.label}</span>
              </Link>
            </motion.div>
          );
        })}

        {/* Cart Link */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: visibleBottomLinks.length * 0.04 }}
        >
          <Link
            to="/cart"
            onClick={onClose}
            className="group flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-sm font-bold text-gray-850 bg-white hover:bg-gray-50 border border-gray-150/70 hover:text-primary transition-all duration-200"
          >
            <div className="w-8.5 h-8.5 rounded-xl bg-gray-100/90 text-gray-600 group-hover:bg-primary/10 group-hover:text-primary flex items-center justify-center shrink-0 transition-colors">
              <ShoppingCart className="h-4.5 w-4.5" />
            </div>
            <span className="flex-1 text-right">{t("navigation.cart") || "عربة التسوق"}</span>
            {cart.length > 0 && (
              <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white shadow-sm shrink-0">
                {cart.length}
              </span>
            )}
          </Link>
        </motion.div>

        {/* Compare Link */}
        {/* <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: (visibleBottomLinks.length + 1) * 0.04 }}
        >
          <button
            onClick={() => {
              onClose();
              if (compareList.length > 0) {
                openCompare();
              } else {
                toast.info("قائمة المقارنة فارغة. أضف منتجات للمقارنة أولاً.");
              }
            }}
            className="group w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-sm font-bold text-gray-850 bg-white hover:bg-gray-50 border border-gray-150/70 hover:text-primary transition-all duration-200 text-right"
          >
            <div className="w-8.5 h-8.5 rounded-xl bg-gray-100/90 text-gray-600 group-hover:bg-primary/10 group-hover:text-primary flex items-center justify-center shrink-0 transition-colors">
              <GitCompare className="h-4.5 w-4.5" />
            </div>
            <span className="flex-1 text-right">مقارنة المنتجات</span>
            {compareList.length > 0 && (
              <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white shadow-md shrink-0">
                {compareList.length}
              </span>
            )}
          </button>
        </motion.div> */}

        {/* Track Orders Link in Mobile Menu */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: (visibleBottomLinks.length + 2) * 0.04 }}
        >
          <Link
            to="/track-order"
            onClick={onClose}
            className="group flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-sm font-bold text-gray-850 bg-white hover:bg-gray-50 border border-gray-150/70 hover:text-primary transition-all duration-200"
          >
            <div className="w-8.5 h-8.5 rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-100 flex items-center justify-center shrink-0 transition-colors">
              <PackageSearch className="h-4.5 w-4.5" />
            </div>
            <span className="flex-1 text-right">تتبع الطلبات والحجوزات</span>
            {trackedOrdersCount > 0 && (
              <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white shadow-sm shrink-0">
                {trackedOrdersCount}
              </span>
            )}
          </Link>
        </motion.div>
      </nav>

      {/* Social and Contact details in drawer */}
      <div
        className="p-5 border-t border-gray-150 shrink-0 space-y-4 bg-gray-50"
      >
        {settings.phone && (
          <a
            href={`tel:${settings.phone}`}
            className="flex items-center gap-2.5 text-sm font-extrabold text-gray-800 hover:text-primary transition-colors"
          >
            <div className="p-2 rounded-lg bg-primary/10">
              <Phone className="h-4 w-4 text-primary" />
            </div>
            <span dir="ltr">{settings.phone}</span>
          </a>
        )}

        <div>
          <p className="text-[11px] font-bold text-gray-400 mb-2.5 uppercase tracking-wider">تابعنا</p>
          <div className="flex gap-2 flex-wrap">
            <SocialBtn href="https://www.facebook.com/BazarElectronics1" bg="bg-blue-50" color="text-blue-600" hover="hover:bg-blue-100" label="فيسبوك">
              <FaFacebook className="w-5 h-5" />
            </SocialBtn>
            <SocialBtn href="https://www.tiktok.com/@ibrahim.moamen100" bg="bg-gray-100" color="text-gray-900" hover="hover:bg-gray-200" label="تيك توك">
              <FaTiktok className="w-5 h-5" />
            </SocialBtn>
            <SocialBtn href="https://www.youtube.com/@ibrahim-moamen" bg="bg-red-50" color="text-red-600" hover="hover:bg-red-100" label="يوتيوب">
              <FaYoutube className="w-5 h-5" />
            </SocialBtn>
            <SocialBtn
              href="https://wa.me/201024911062"
              bg="bg-emerald-50"
              color="text-emerald-600"
              hover="hover:bg-emerald-100"
              label="واتساب"
            >
              <FaWhatsapp className="w-5 h-5" />
            </SocialBtn>
          </div>
        </div>
      </div>
    </div>
  );
}

// Social Button Helper
function SocialBtn({
  href,
  bg,
  color,
  hover,
  label,
  children,
}: {
  href: string;
  bg: string;
  color: string;
  hover: string;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center ${bg} ${color} ${hover}`}
      aria-label={label}
    >
      {children}
    </a>
  );
}

// Facebook icon shim
function Facebook(props: any) {
  return (
    <svg
      fill="currentColor"
      viewBox="0 0 24 24"
      {...props}
    >
      <path d="M9 8H7v3h2v9h4v-9h3.6l.4-3H13V6c0-.5.5-1 1-1h2V2h-3a4 4 0 00-4 4v2z" />
    </svg>
  );
}

// Instagram icon shim
function Instagram(props: any) {
  return (
    <svg
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
      {...props}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

// Twitter icon shim
function Twitter(props: any) {
  return (
    <svg
      fill="currentColor"
      viewBox="0 0 24 24"
      {...props}
    >
      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
    </svg>
  );
}
