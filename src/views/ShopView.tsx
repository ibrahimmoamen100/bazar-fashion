'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { db, productsService } from '@/lib/firebase';
import { getActiveSuppliers } from '@/lib/suppliersCache';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Product, Filter } from '@/types/product';
import { ProductCard } from '@/components/ProductCard';
import { ProductModal } from '@/components/ProductModal';
import { ProductFilters } from '@/components/ProductFilters';
import { filterProducts, sortProducts } from '@/utils/productFilter';
import Footer from '@/components/Footer';
import { SEOHelmet } from '@/components/SEOHelmet';
import {
  Store, Phone, MapPin, Facebook, Instagram, Youtube,
  Filter as FilterIcon, X, ChevronRight, LayoutGrid, List,
  Tag, Search, Loader2, Laptop, Monitor, HardDrive, Cpu,
  Headphones, Shirt, Utensils, Grid, Sparkles, ArrowRight
} from 'lucide-react';
import { FaWhatsapp, FaTiktok } from 'react-icons/fa';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter,
} from '@/components/ui/drawer';
import { getCategoryNameFromSlug, getCategorySlugFromName } from '@/utils/category';
import { registerSupplierSlug } from '@/utils/url';

// ── Types & Social Meta ────────────────────────────────────────────────────────
interface SupplierInfo {
  id: string;
  name: string;
  slug: string;
  phone?: string;
  address?: string;
  logo?: string;
  coverImage?: string;
  description?: string;
  tags?: string[];
  socialLinks?: Record<string, string | null>;
  isArchived?: boolean;
}

const socialMeta: Record<string, { icon: React.ReactNode; label: string }> = {
  whatsapp: { icon: <FaWhatsapp className="h-4 w-4 text-green-500" />, label: 'واتساب' },
  facebook: { icon: <Facebook className="h-4 w-4 text-blue-600" />, label: 'فيسبوك' },
  instagram: { icon: <Instagram className="h-4 w-4 text-pink-500" />, label: 'انستغرام' },
  tiktok: { icon: <FaTiktok className="h-4 w-4 text-gray-800" />, label: 'تيك توك' },
  youtube: { icon: <Youtube className="h-4 w-4 text-red-600" />, label: 'يوتيوب' },
};

function slugify(name: string) {
  return (name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\u0600-\u06FFa-z0-9-]/g, '')
    .replace(/-+/g, '-');
}

// Category icon helper
function getCategoryIcon(slugOrName: string) {
  const s = slugOrName.toLowerCase();
  if (s.includes('laptop') || s.includes('لابتوب')) return <Laptop className="h-7 w-7 text-blue-600" />;
  if (s.includes('monitor') || s.includes('شاش')) return <Monitor className="h-7 w-7 text-indigo-600" />;
  if (s.includes('desktop') || s.includes('مكتبي')) return <Cpu className="h-7 w-7 text-purple-600" />;
  if (s.includes('storage') || s.includes('تخزين')) return <HardDrive className="h-7 w-7 text-emerald-600" />;
  if (s.includes('accessories') || s.includes('إكسسوار')) return <Headphones className="h-7 w-7 text-amber-600" />;
  if (s.includes('clothes') || s.includes('ملابس')) return <Shirt className="h-7 w-7 text-pink-600" />;
  if (s.includes('kitchen') || s.includes('مطبخ')) return <Utensils className="h-7 w-7 text-orange-600" />;
  return <Grid className="h-7 w-7 text-primary" />;
}

// ── Main ShopView Component ────────────────────────────────────────────────────
export default function ShopView() {
  const params = useParams<{
    shopSlug: string; category?: string; subcategory?: string;
  }>();
  const shopSlug = params.shopSlug || '';
  let rawCategoryParam = params.category;

  const navigate = useNavigate();

  const [supplier, setSupplier] = useState<SupplierInfo | null>(null);
  const [allShopProducts, setAllShopProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [filters, setFilters] = useState<Filter>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');

  // Normalize categoryParam: if "categories" or undefined -> show category list
  const activeCategorySlug = useMemo(() => {
    if (!rawCategoryParam || rawCategoryParam === 'categories') return null;
    return rawCategoryParam;
  }, [rawCategoryParam]);

  // Fetch supplier info with fallback to name / id / generated slug & fetch products lazily per category
  useEffect(() => {
    if (!shopSlug) return;
    (async () => {
      setLoading(true);
      try {
        let sup: SupplierInfo | null = supplier;
        const decodedShopSlug = decodeURIComponent(shopSlug).toLowerCase();

        if (!sup || (sup.slug !== shopSlug && sup.id !== shopSlug)) {
          // 1. Check cached active suppliers first (0 reads!)
          const cachedSuppliers = await getActiveSuppliers().catch(() => []);
          const cachedMatch = cachedSuppliers.find(s => {
            const sSlug = (s.slug || '').toLowerCase();
            const sName = (s.name || '').toLowerCase();
            const genSlug = slugify(s.name || '');
            return sSlug === decodedShopSlug || sName === decodedShopSlug || genSlug === decodedShopSlug || s.id === shopSlug;
          });

          if (cachedMatch) {
            sup = cachedMatch as SupplierInfo;
          } else {
            // 2. Query by exact slug field if not found in cache
            const snap = await getDocs(query(collection(db, 'suppliers'), where('slug', '==', shopSlug)));
            if (!snap.empty) {
              sup = { ...(snap.docs[0].data() as SupplierInfo), id: snap.docs[0].id };
            }
          }
        }

        // Default fallback for main platform merchant "bazar fashion"
        if (!sup && (decodedShopSlug === 'bazar-fashion' || shopSlug === 'bazar-fashion' || decodedShopSlug === 'bazar fashion' || decodedShopSlug === 'بازار للموضه')) {
          sup = {
            id: 'bazar-fashion',
            name: 'bazar fashion',
            slug: 'bazar-fashion',
            address: 'مول البستان وسط البلد - بجوار مترو انور السادات',
            phone: '01024911062',
            logo: '/logo3.png',
            coverImage: '/banner.jpg',
            description: 'متجر بازار للموضه - التاجر الافتراضي',
            isArchived: false,
          };
        }

        if (!sup || sup.isArchived) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        setSupplier(sup);
        if (sup.name && sup.slug) {
          registerSupplierSlug(sup.name, sup.slug);
        }

        // If accessed via old slug, ID, or Arabic name, normalize and update URL to canonical slug
        if (sup.slug && shopSlug !== sup.slug) {
          try {
            const currentPath = window.location.pathname;
            const decodedCurrent = decodeURIComponent(currentPath);
            const decodedShopSlug = decodeURIComponent(shopSlug);
            if (decodedCurrent.startsWith(`/${decodedShopSlug}`)) {
              const newPath = currentPath.replace(
                new RegExp(`^/(${encodeURIComponent(shopSlug)}|${shopSlug})`),
                `/${sup.slug}`
              );
              if (newPath !== currentPath) {
                navigate(newPath, { replace: true });
              }
            }
          } catch { }
        }

        // Fetch products lazily: If inside a category page, query ONLY products of that specific category!
        if (activeCategorySlug) {
          const catProds = await productsService.getProductsBySupplierAndCategory(sup.name, activeCategorySlug);
          const activeCatProds = catProds
            .map(p => ({ ...p, supplierSlug: sup.slug || (p as any).supplierSlug || shopSlug }))
            .filter(p => !p.isArchived);
          console.log(`🔥 [Firebase Reads - فئة محددة] تم جلب ${activeCatProds.length} منتج فقط من الفايربيز لقسم (${activeCategorySlug}) للمتجر: "${sup.name}"`);
          setAllShopProducts(activeCatProds);
        } else {
          // Inside Categories overview page: load shop products to build categories grid
          const prods = await productsService.getProductsBySupplierSlug(sup.name);
          const activeProds = prods
            .map(p => ({ ...p, supplierSlug: sup.slug || (p as any).supplierSlug || shopSlug }))
            .filter(p => !p.isArchived);
          console.log(`🔥 [Firebase Reads - أقسام المتجر] تم جلب ${activeProds.length} منتج من الفايربيز لبناء شبكة أقسام المتجر: "${sup.name}"`);
          setAllShopProducts(activeProds);
        }
      } catch (e) {
        console.error('Failed to fetch shop:', e);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [shopSlug, activeCategorySlug]);

  // Derive categories list available for this shop
  const shopCategories = useMemo(() => {
    const map = new Map<string, { slug: string; name: string; count: number; sampleImage?: string }>();

    allShopProducts.forEach(p => {
      const catName = p.category || 'أخرى (Other)';
      const catSlug = p.categorySlug || getCategorySlugFromName(catName) || 'other';

      if (!map.has(catSlug)) {
        map.set(catSlug, {
          slug: catSlug,
          name: getCategoryNameFromSlug(catSlug) || catName,
          count: 0,
          sampleImage: p.images?.[0] || '',
        });
      }
      const entry = map.get(catSlug)!;
      entry.count += 1;
      if (!entry.sampleImage && p.images?.[0]) {
        entry.sampleImage = p.images[0];
      }
    });

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [allShopProducts]);

  // Sync activeCategorySlug to filters.category
  useEffect(() => {
    if (activeCategorySlug) {
      setFilters(f => ({
        ...f,
        category: [activeCategorySlug],
      }));
    } else {
      setFilters(f => ({
        ...f,
        category: undefined,
      }));
    }
  }, [activeCategorySlug]);

  // Products belonging to the active category
  const categoryProducts = useMemo(() => {
    if (!activeCategorySlug) return [];
    return allShopProducts.filter(p =>
      p.categorySlug === activeCategorySlug ||
      p.category === activeCategorySlug ||
      getCategorySlugFromName(p.category) === activeCategorySlug
    );
  }, [allShopProducts, activeCategorySlug]);

  // Active Category Name for Header/Breadcrumbs
  const activeCategoryName = useMemo(() => {
    if (!activeCategorySlug) return '';
    return getCategoryNameFromSlug(activeCategorySlug) || activeCategorySlug;
  }, [activeCategorySlug]);

  // Filter category products by full multi-dimensional filters + search query + sort
  const displayedCategoryProducts = useMemo(() => {
    const filtered = filterProducts(categoryProducts, filters, categorySearchQuery);
    return sortProducts(filtered, filters.sortBy);
  }, [categoryProducts, filters, categorySearchQuery]);

  // Active filter badges for quick inspection and one-click removal
  const activeFilterBadges = useMemo(() => {
    const badges: Array<{ id: string; label: string; onRemove: () => void }> = [];

    if (filters.brand && filters.brand.length > 0) {
      filters.brand.forEach(b => {
        badges.push({
          id: `brand-${b}`,
          label: `الماركة: ${b}`,
          onRemove: () => setFilters({ ...filters, brand: filters.brand?.filter(x => x !== b) }),
        });
      });
    }

    if (filters.subcategory && filters.subcategory.length > 0) {
      filters.subcategory.forEach(s => {
        badges.push({
          id: `subcat-${s}`,
          label: `${s}`,
          onRemove: () => setFilters({ ...filters, subcategory: filters.subcategory?.filter(x => x !== s) }),
        });
      });
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      const minP = filters.minPrice ? `${filters.minPrice} ج` : '';
      const maxP = filters.maxPrice ? `${filters.maxPrice} ج` : '';
      badges.push({
        id: 'price',
        label: `السعر: ${minP || '0'} - ${maxP || 'الكل'}`,
        onRemove: () => setFilters({ ...filters, minPrice: undefined, maxPrice: undefined }),
      });
    }

    if (filters.specialOffer) {
      badges.push({
        id: 'special-offer',
        label: 'عروض خاصة فقط',
        onRemove: () => setFilters({ ...filters, specialOffer: undefined }),
      });
    }

    if (filters.features && filters.features.length > 0) {
      const featMap: Record<string, string> = { touch: 'يدعم اللمس', x360: 'قابل للدوران 360°', detachable: 'قابل للفصل' };
      filters.features.forEach(f => {
        badges.push({
          id: `feat-${f}`,
          label: featMap[f] || f,
          onRemove: () => setFilters({ ...filters, features: filters.features?.filter(x => x !== f) }),
        });
      });
    }

    if (filters.screenSize && filters.screenSize.length > 0) {
      filters.screenSize.forEach(sz => {
        badges.push({
          id: `screen-${sz}`,
          label: `${sz}"`,
          onRemove: () => setFilters({ ...filters, screenSize: filters.screenSize?.filter(x => x !== sz) }),
        });
      });
    }

    if (filters.processorBrand && filters.processorBrand.length > 0) {
      filters.processorBrand.forEach(pb => {
        badges.push({
          id: `pb-${pb}`,
          label: `معالج: ${pb}`,
          onRemove: () => setFilters({ ...filters, processorBrand: filters.processorBrand?.filter(x => x !== pb) }),
        });
      });
    }

    if (filters.processorSeries && filters.processorSeries.length > 0) {
      filters.processorSeries.forEach(ps => {
        badges.push({
          id: `ps-${ps}`,
          label: `${ps}`,
          onRemove: () => setFilters({ ...filters, processorSeries: filters.processorSeries?.filter(x => x !== ps) }),
        });
      });
    }

    if (filters.dedicatedGraphicsName && filters.dedicatedGraphicsName.length > 0) {
      filters.dedicatedGraphicsName.forEach(gpu => {
        badges.push({
          id: `gpu-${gpu}`,
          label: `GPU: ${gpu}`,
          onRemove: () => setFilters({ ...filters, dedicatedGraphicsName: filters.dedicatedGraphicsName?.filter(x => x !== gpu) }),
        });
      });
    }

    if (filters.dynamicSpecs && Object.keys(filters.dynamicSpecs).length > 0) {
      Object.entries(filters.dynamicSpecs).forEach(([k, vals]) => {
        vals.forEach(v => {
          badges.push({
            id: `dyn-${k}-${v}`,
            label: `${k}: ${v}`,
            onRemove: () => {
              const current = filters.dynamicSpecs?.[k] || [];
              const rem = current.filter(x => x !== v);
              const next = { ...filters.dynamicSpecs };
              if (rem.length > 0) next[k] = rem;
              else delete next[k];
              setFilters({ ...filters, dynamicSpecs: Object.keys(next).length > 0 ? next : undefined });
            },
          });
        });
      });
    }

    return badges;
  }, [filters]);

  const clearAllFilters = () => {
    setCategorySearchQuery('');
    setFilters({
      category: activeCategorySlug ? [activeCategorySlug] : undefined,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-gray-500 font-medium">جاري تحميل أقسام المتجر...</p>
        </div>
      </div>
    );
  }

  if (notFound || !supplier) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4 p-8 bg-white rounded-2xl border shadow-sm max-w-md">
          <Store className="h-20 w-20 text-gray-300 mx-auto" />
          <h1 className="text-2xl font-bold text-gray-700">المتجر غير موجود</h1>
          <p className="text-sm text-gray-500">ربما تم أرشفة هذا المتجر أو أن الرابط غير صحيح</p>
          <Link to="/shops" className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all font-semibold text-sm">
            <Store className="h-4 w-4" /> تصفح التجار
          </Link>
        </div>
      </div>
    );
  }

  const supplierSlug = supplier.slug || shopSlug;

  return (
    <>
      <SEOHelmet
        title={`${supplier.name}${activeCategoryName ? ` - ${activeCategoryName}` : ' - أقسام المتجر'}`}
        description={supplier.description || `تصفح أحدث منتجات ${supplier.name}`}
        url={`/${supplierSlug}${activeCategorySlug ? `/${activeCategorySlug}` : ''}`}
      />

      <div className="min-h-screen bg-gray-50/50">
        {/* ── Shop Banner Header ── */}
        <div className="relative container mx-auto bg-white border-b shadow-sm">
          {/* Back button to all shops */}

          <div className="   mx-auto top-2  right-8  absolute  z-20">
            <Link
              to="/shops"
              className="inline-flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2 bg-white/95 hover:bg-white text-gray-900 hover:text-primary border border-gray-200 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-extrabold shadow-md hover:shadow-lg backdrop-blur-md transition-all duration-200 group active:scale-95"
              title="الرجوع إلى صفحة التجار"
            >
              <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-0.5 transition-transform duration-200" />
              <span>جميع التجار</span>
            </Link>

          </div>

          {/* Cover Image */}
          {supplier.coverImage ? (
            <div className="h-36 md:h-48 overflow-hidden relative">
              <img
                src={supplier.coverImage}
                alt={supplier.name}
                className="w-full h-full object-cover"
                onError={e => (e.currentTarget.parentElement!.style.display = 'none')}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
            </div>
          ) : (
            <div className="h-16 sm:h-20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />
          )}

          <div className="max-w-7xl mx-auto px-4 py-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Logo - clickable when in category view */}
                {activeCategorySlug ? (
                  <Link
                    to={`/${supplier.slug || shopSlug}/categories`}
                    className="h-16 w-16 md:h-20 md:w-20 rounded-2xl bg-white border-2 border-primary/20 shadow-md overflow-hidden flex-shrink-0 flex items-center justify-center p-1 hover:border-primary/50 hover:shadow-lg transition-all duration-200"
                    title={`العودة لفئات ${supplier.name}`}
                  >
                    {supplier.logo ? (
                      <img src={supplier.logo} alt={supplier.name} className="h-full w-full object-contain rounded-xl" onError={e => (e.currentTarget.style.display = 'none')} />
                    ) : (
                      <span className="text-3xl font-extrabold text-primary">{supplier.name.charAt(0)}</span>
                    )}
                  </Link>
                ) : (
                  <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl bg-white border-2 border-primary/20 shadow-md overflow-hidden flex-shrink-0 flex items-center justify-center p-1">
                    {supplier.logo ? (
                      <img src={supplier.logo} alt={supplier.name} className="h-full w-full object-contain rounded-xl" onError={e => (e.currentTarget.style.display = 'none')} />
                    ) : (
                      <span className="text-3xl font-extrabold text-primary">{supplier.name.charAt(0)}</span>
                    )}
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {activeCategorySlug ? (
                      <Link
                        to={`/${supplier.slug || shopSlug}/categories`}
                        className="text-2xl md:text-3xl font-extrabold text-gray-900 hover:text-primary transition-colors duration-200 group flex items-center gap-1.5"
                        title={`العودة لفئات ${supplier.name}`}
                      >
                        {supplier.name}
                        <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-primary group-hover:-translate-x-0.5 transition-all duration-200" />
                      </Link>
                    ) : (
                      <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">{supplier.name}</h1>
                    )}
                    <span className="px-2.5 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full">
                      {allShopProducts.length} منتج
                    </span>
                  </div>
                  {supplier.description && (
                    <p className="text-sm text-gray-500 mt-1 max-w-2xl line-clamp-2">{supplier.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 mt-2">
                    {supplier.phone && (supplier as any).isPhonePublic !== false && (
                      <a href={`tel:${supplier.phone}`} className="text-xs text-gray-600 flex items-center gap-1.5 hover:text-primary transition-colors">
                        <Phone className="h-3.5 w-3.5 text-gray-400" />{supplier.phone}
                      </a>
                    )}
                    {supplier.address && (
                      <span className="text-xs text-gray-600 flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-gray-400" />{supplier.address}
                      </span>
                    )}
                    {/* Social Links */}
                    <div className="flex items-center gap-2">
                      {Object.entries(supplier.socialLinks || {}).map(([key, val]) =>
                        val ? (
                          <a key={key} href={val} target="_blank" rel="noopener"
                            className="hover:scale-110 transition-transform" title={socialMeta[key]?.label}>
                            {socialMeta[key]?.icon}
                          </a>
                        ) : null
                      )}
                    </div>
                  </div>
                </div>
              </div>


            </div>


          </div>
        </div>

        {/* ────────────────────────────────────────────────────────────────────── */}
        {/* VIEW 1: SHOP CATEGORIES PAGE (When NO category is selected)           */}
        {/* ────────────────────────────────────────────────────────────────────── */}
        {!activeCategorySlug ? (
          <div className="max-w-7xl mx-auto px-4 py-10">
            {/* Title Section */}
            <div className="text-center max-w-2xl mx-auto mb-10">

              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900">
                بتبحث عن اي ؟
              </h2>
              <p className="text-sm text-gray-500 mt-2">
                اضغط على أي من الاقسام التالية
              </p>
            </div>

            {shopCategories.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border">
                <Store className="h-16 w-16 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-400 font-medium">لا توجد أية منتجات في هذا المتجر بعد</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                {shopCategories.map((cat, idx) => (
                  <motion.div
                    key={cat.slug}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Link
                      to={`/${supplierSlug}/${cat.slug}`}
                      className="group block bg-white rounded-2xl border hover:border-primary/40 hover:shadow-md transition-shadow duration-300 overflow-hidden h-full"
                    >
                      {/* Image / Gradient Header */}
                      <div className="relative h-28 sm:h-36 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent overflow-hidden flex items-center justify-center p-2.5 sm:p-4">
                        {cat.sampleImage ? (
                          <img
                            src={cat.sampleImage}
                            alt={cat.name}
                            className="h-full object-contain group-hover:scale-105 transition-transform duration-500"
                            onError={e => (e.currentTarget.style.display = 'none')}
                          />
                        ) : (
                          getCategoryIcon(cat.name)
                        )}
                        <span className="absolute top-2 right-2 sm:top-3 sm:right-3 px-2 py-0.5 sm:px-2.5 sm:py-1 bg-white/90 backdrop-blur-sm rounded-lg text-[10px] sm:text-xs font-bold text-gray-700 shadow-sm">
                          {cat.count} منتج
                        </span>
                      </div>

                      {/* Card Body */}
                      <div className="p-3 sm:p-5 flex items-center justify-between gap-1.5 bg-white transition-colors duration-300 group-hover:bg-primary">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-gray-900 text-sm sm:text-lg group-hover:text-white transition-colors duration-300 truncate">
                            {cat.name}
                          </h3>
                          <p className="text-[10px] sm:text-xs text-gray-400 group-hover:text-white/85 mt-0.5 truncate transition-colors duration-300">
                            تصفح المنتجات
                          </p>
                        </div>
                        <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-primary/10 flex items-center justify-center transition-all duration-300 shrink-0 group-hover:bg-white group-hover:shadow-sm">
                          <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 rotate-180 text-primary transition-colors duration-300" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ──────────────────────────────────────────────────────────────────── */
          /* VIEW 2: SHOP CATEGORY PRODUCTS PAGE (When category is selected)      */
          /* ──────────────────────────────────────────────────────────────────── */
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex gap-6">
              {/* Desktop Sidebar: Rich ProductFilters (Category Section Removed) */}
              <aside className="hidden lg:block w-72 flex-shrink-0">
                <div className="bg-white rounded-2xl border p-4 shadow-sm sticky top-24">
                  <ProductFilters
                    productsOverride={categoryProducts}
                    hideCategoryFilter={true}
                    filtersOverride={filters}
                    onFilterChangeOverride={setFilters}
                  />
                </div>
              </aside>

              {/* Main Products Grid */}
              <div className="flex-1 min-w-0">
                {/* Toolbar */}
                <div className="flex flex-col gap-2.5 mb-4 bg-white p-3.5 rounded-2xl border">
                  {/* Row 1: Filter Button + View Toggle */}
                  <div className="flex items-center justify-between gap-3">
                    {/* Mobile Filter Drawer */}
                    <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
                      <DrawerTrigger asChild>
                        <Button variant="outline" size="sm" className="lg:hidden gap-1.5 font-bold">
                          <FilterIcon className="h-4 w-4 text-primary" />
                          تصفية {activeCategoryName} حسب
                        </Button>
                      </DrawerTrigger>
                      <DrawerContent className="rounded-t-3xl">
                        <DrawerHeader><DrawerTitle>تصفية {activeCategoryName} حسب</DrawerTitle></DrawerHeader>
                        <div className="overflow-y-auto max-h-[72vh] px-4 pb-4">
                          <ProductFilters
                            productsOverride={categoryProducts}
                            hideCategoryFilter={true}
                            filtersOverride={filters}
                            onFilterChangeOverride={setFilters}
                          />
                        </div>
                        <DrawerFooter>
                          <Button onClick={() => setDrawerOpen(false)}>تم وتطبيق الفلاتر</Button>
                        </DrawerFooter>
                      </DrawerContent>
                    </Drawer>

                    {/* View Mode Toggle */}
                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                        title="عرض شبكة"
                      >
                        <LayoutGrid className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                        title="عرض قائمة"
                      >
                        <List className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Row 2: Full-width Search Input */}
                  <div className="relative w-full">
                    <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder={`ابحث في ${activeCategoryName}...`}
                      value={categorySearchQuery}
                      onChange={e => setCategorySearchQuery(e.target.value)}
                      className="w-full pr-10 pl-8 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-primary focus:outline-none text-sm text-gray-800 transition-all font-medium"
                    />
                    {categorySearchQuery && (
                      <button
                        onClick={() => setCategorySearchQuery('')}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Row 3: Active Filters & Clear */}
                  {(activeFilterBadges.length > 0 || categorySearchQuery) && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-100">
                      <span className="text-xs font-bold text-gray-500 ml-1">
                        الفلاتر المطبقة:
                      </span>
                      {activeFilterBadges.map((badge) => (
                        <span
                          key={badge.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                        >
                          <span>{badge.label}</span>
                          <button
                            onClick={badge.onRemove}
                            className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                            title="إزالة هذا الفلتر"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                      {categorySearchQuery && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                          <span>بحث: "{categorySearchQuery}"</span>
                          <button
                            onClick={() => setCategorySearchQuery('')}
                            className="hover:bg-gray-200 rounded-full p-0.5 transition-colors"
                            title="إلغاء البحث"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      )}
                      <button
                        onClick={clearAllFilters}
                        className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline mr-auto px-2 py-1"
                      >
                        مسح الكل
                      </button>
                    </div>
                  )}

                  {/* Results Count */}
                  <div className="flex items-center justify-between text-xs text-gray-500 font-medium px-0.5 pt-0.5">
                    <span>
                      عرض <strong className="text-gray-900">{displayedCategoryProducts.length}</strong> من أصل <strong className="text-gray-900">{categoryProducts.length}</strong> منتج
                    </span>
                  </div>
                </div>

                {/* Products Grid */}
                {displayedCategoryProducts.length === 0 ? (
                  <div className="text-center py-24 bg-white rounded-2xl border">
                    <Store className="h-16 w-16 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-500">لا توجد منتجات مطابقة في هذا القسم</h3>
                    <p className="text-xs text-gray-400 mt-1">جرّب البحث باسم آخر أو تغيير الفلاتر المحددة</p>
                    {categorySearchQuery && (
                      <Button variant="outline" onClick={() => setCategorySearchQuery('')} className="mt-4 text-xs">
                        مسح كلمة البحث
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className={viewMode === 'grid'
                    ? 'grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4'
                    : 'flex flex-col gap-3'
                  }>
                    {displayedCategoryProducts.map((product, idx) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                      >
                        <ProductCard
                          product={product}
                          onView={() => setSelectedProduct(product)}
                          viewMode={viewMode}
                        />
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />

      {/* Product Details Modal */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          open={!!selectedProduct}
          onOpenChange={(open) => !open && setSelectedProduct(null)}
        />
      )}
    </>
  );
}

