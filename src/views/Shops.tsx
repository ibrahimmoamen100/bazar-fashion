'use client';

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, limit, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { SEOHelmet } from '@/components/SEOHelmet';
import Footer from '@/components/Footer';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Store, Search, X, Phone, MapPin, Tag, ChevronRight,
  Facebook, Instagram, Youtube
} from 'lucide-react';
import { FaWhatsapp, FaTiktok } from 'react-icons/fa';
import { registerSupplierSlug } from '@/utils/url';

interface Supplier {
  id: string;
  name: string;
  slug: string;
  phone?: string;
  isPhonePublic?: boolean;
  address?: string;
  logo?: string;
  coverImage?: string;
  description?: string;
  tags?: string[];
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    whatsapp?: string;
    tiktok?: string;
    youtube?: string;
  };
  isArchived?: boolean;
}

const socialIcons: Record<string, { icon: React.ReactNode; label: string }> = {
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

function getSupplierSlug(s: Supplier): string {
  if (s.slug && s.slug.trim()) return s.slug.trim();
  return slugify(s.name) || s.id;
}

const PAGE_SIZE = 10;

export default function Shops() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // ── Initial load ──
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'suppliers'),
          orderBy('name'),
          limit(PAGE_SIZE)
        );
        const snap = await getDocs(q);
        const list = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Supplier))
          .filter(s => !s.isArchived);
        // Sort by displayOrder (1, 2, 3...) then name alphabetically (0 or missing = default)
        list.sort((a, b) => {
          const orderA = (a as any).displayOrder;
          const orderB = (b as any).displayOrder;
          const oa = orderA && orderA > 0 ? orderA : 999999;
          const ob = orderB && orderB > 0 ? orderB : 999999;
          if (oa !== ob) return oa - ob;
          return a.name.localeCompare(b.name, 'ar');
        });
        list.forEach(s => {
          if (s.name && s.slug) registerSupplierSlug(s.name, s.slug);
        });
        console.log(`🔥 [Firebase Reads - صفحة التجار] تم جلب ${list.length} تاجر من الفايربيز (دفعة من ${snap.docs.length})`);
        setSuppliers(list);
        const last = snap.docs[snap.docs.length - 1] || null;
        setLastDoc(last);
        setHasMore(snap.docs.length === PAGE_SIZE);
      } catch (e) {
        console.error('Failed to load suppliers', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Load more ──
  const loadMore = async () => {
    if (!lastDoc || loadingMore) return;
    setLoadingMore(true);
    try {
      const q = query(
        collection(db, 'suppliers'),
        orderBy('name'),
        startAfter(lastDoc),
        limit(PAGE_SIZE)
      );
      const snap = await getDocs(q);
      const newItems = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Supplier))
        .filter(s => !s.isArchived);
      newItems.forEach(s => {
        if (s.name && s.slug) registerSupplierSlug(s.name, s.slug);
      });
      console.log(`🔥 [Firebase Reads - تحميل المزيد من التجار] تم جلب ${newItems.length} تاجر إضافي من الفايربيز`);
      setSuppliers(prev => [...prev, ...newItems]);
      const last = snap.docs[snap.docs.length - 1] || null;
      setLastDoc(last);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (e) {
      console.error('Failed to load more suppliers', e);
    } finally {
      setLoadingMore(false);
    }
  };

  // Collect all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    suppliers.forEach(s => (s.tags || []).forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [suppliers]);

  // Filter suppliers
  const filtered = useMemo(() => {
    let result = suppliers;
    if (activeTag) result = result.filter(s => s.tags?.includes(activeTag));
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.tags?.some(t => t.toLowerCase().includes(q))
      );
    }
    return result;
  }, [suppliers, activeTag, searchQuery]);

  return (
    <>
      <SEOHelmet
        title="التجار - تسوق من أفضل المتاجر"
        description="اكتشف مجموعة من أفضل التجار والمتاجر المتخصصة"
        url="/shops"
      />

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Hero */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary to-primary/70 text-white pt-20 pb-16 px-4">
          <div className="absolute inset-0 opacity-10">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-white"
                style={{
                  width: `${Math.random() * 120 + 40}px`,
                  height: `${Math.random() * 120 + 40}px`,
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  opacity: Math.random() * 0.3 + 0.05,
                }}
              />
            ))}
          </div>
          <div className="relative max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 mb-5 text-sm font-medium">
              <Store className="h-4 w-4" />
              <span>منصة متعددة التجار</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
              تسوق من أفضل المتاجر
            </h1>
            <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
              اختر متجرك المفضل وتصفح منتجاته بسهولة — كل متجر يعرض منتجاته الخاصة
            </p>

            {/* Search */}
            <div className="relative max-w-lg mx-auto">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/60" />
              <input
                type="text"
                placeholder="ابحث عن متجر..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pr-12 pl-4 py-3.5 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 text-white placeholder-white/60 focus:outline-none focus:bg-white/30 transition-all text-base"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Tags Filter */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-8">
              <span className="text-sm font-semibold text-gray-500 flex items-center gap-1 ml-2">
                <Tag className="h-4 w-4" /> تصفية:
              </span>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTag(null)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${activeTag === null
                  ? 'bg-primary text-white shadow-md shadow-primary/30'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                الكل ({suppliers.length})
              </motion.button>
              {allTags.map(tag => {
                const count = suppliers.filter(s => s.tags?.includes(tag)).length;
                return (
                  <motion.button
                    key={tag}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${activeTag === tag
                      ? 'bg-primary text-white shadow-md shadow-primary/30'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                  >
                    #{tag} ({count})
                  </motion.button>
                );
              })}
            </div>
          )}

          {/* Results count */}
          {!loading && (
            <p className="text-sm text-gray-500 mb-5">
              {filtered.length === suppliers.length
                ? `${suppliers.length} متجر محمّل${hasMore ? ' (يوجد المزيد)' : ''}`
                : `${filtered.length} من ${suppliers.length} متجر`}
            </p>
          )}

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border h-48 sm:h-52 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24">
              <Store className="h-16 w-16 text-gray-200 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-400">لا يوجد متاجر</h2>
              <p className="text-gray-400 mt-2">جرّب تغيير الفلاتر أو مصطلح البحث</p>
            </div>
          ) : (
            <>
              <AnimatePresence mode="popLayout">
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-5">
                  {filtered.map((s, idx) => (
                    <motion.div
                      key={s.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.05, duration: 0.3 }}
                    >
                      <div
                        role="link"
                        tabIndex={0}
                        onClick={() => navigate(`/${getSupplierSlug(s)}/categories`)}
                        onKeyDown={e => e.key === 'Enter' && navigate(`/${getSupplierSlug(s)}/categories`)}
                        className="group flex flex-col justify-between h-full bg-white rounded-2xl border hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 overflow-hidden cursor-pointer"
                      >
                        <div>
                          {/* Cover / Header */}
                          <div className="relative h-24 sm:h-32 bg-gradient-to-br from-primary/15 to-primary/5 overflow-hidden">
                            {s.coverImage ? (
                              <img
                                src={s.coverImage}
                                alt={s.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                onError={e => (e.currentTarget.style.display = 'none')}
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Store className="h-10 w-10 sm:h-14 sm:w-14 text-primary/20" />
                              </div>
                            )}
                          </div>

                          {/* Logo - placed outside cover to avoid overflow-hidden clipping */}
                          <div className="relative h-0">
                            <div className="absolute -top-5 sm:-top-6 right-2.5 sm:right-4">
                              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-white border-2 border-white shadow-md overflow-hidden flex items-center justify-center">
                                {s.logo ? (
                                  <img src={s.logo} alt={s.name} className="h-full w-full object-contain"
                                    onError={e => (e.currentTarget.style.display = 'none')} />
                                ) : (
                                  <span className="text-sm sm:text-lg font-bold text-primary">{s.name.charAt(0)}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="p-2.5 sm:p-4 pt-6 sm:pt-8">
                            {/* Name */}
                            <h2 className="font-bold text-gray-900 text-sm sm:text-lg group-hover:text-primary transition-colors line-clamp-1">
                              {s.name}
                            </h2>

                            {/* Description */}
                            {s.description && (
                              <p className="text-[11px] sm:text-sm text-gray-500 mt-0.5 sm:mt-1 line-clamp-1 sm:line-clamp-2">{s.description}</p>
                            )}

                            {/* Phone / Address */}
                            <div className="mt-1.5 sm:mt-2 space-y-0.5 sm:space-y-1">
                              {s.phone && s.isPhonePublic !== false && (
                                <p className="text-[10px] sm:text-xs text-gray-500 flex items-center gap-1">
                                  <Phone className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                                  <span className="truncate">{s.phone}</span>
                                </p>
                              )}
                              {s.address && (
                                <p className="text-[10px] sm:text-xs text-gray-500 flex items-center gap-1">
                                  <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                                  <span className="truncate">{s.address}</span>
                                </p>
                              )}
                            </div>

                            {/* Social Links */}
                            {Object.values(s.socialLinks || {}).some(Boolean) && (
                              <div className="flex items-center gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                                {Object.entries(s.socialLinks || {}).map(([key, val]) =>
                                  val ? (
                                    <a
                                      key={key}
                                      href={val}
                                      target="_blank"
                                      rel="noopener"
                                      onClick={e => e.stopPropagation()}
                                      className="hover:scale-110 transition-transform"
                                      title={socialIcons[key]?.label}
                                    >
                                      {socialIcons[key]?.icon}
                                    </a>
                                  ) : null
                                )}
                              </div>
                            )}

                            {/* Tags */}
                            {(s.tags || []).length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2 sm:mt-3">
                                {(s.tags || []).map(tag => (
                                  <span
                                    key={tag}
                                    className="px-1.5 py-0.5 bg-primary/8 text-primary text-[9px] sm:text-[10px] font-semibold rounded-full"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* CTA */}
                        <div className="px-2.5 sm:px-4 pb-2.5 sm:pb-4 pt-1 flex items-center justify-between border-t border-gray-50 mt-1">
                          <span className="text-[10px] sm:text-xs text-gray-400">تصفح المنتجات</span>
                          <span className="flex items-center gap-0.5 sm:gap-1 text-primary text-xs sm:text-sm font-semibold group-hover:gap-1.5 transition-all">
                            دخول <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </AnimatePresence>

              {/* Load More Button */}
              {!loading && hasMore && (
                <div className="text-center mt-10">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="inline-flex items-center gap-3 px-8 py-3 bg-primary text-white font-bold rounded-2xl hover:bg-primary/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-primary/20"
                  >
                    {loadingMore ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        جاري التحميل...
                      </>
                    ) : (
                      <>
                        <Store className="h-5 w-5" />
                        تحميل المزيد من التجار
                      </>
                    )}
                  </button>
                </div>
              )}

              {!loading && !hasMore && suppliers.length > 0 && (
                <p className="text-center text-xs text-gray-400 mt-8">تم عرض جميع التجار المتاحين ({suppliers.length})</p>
              )}
            </>
          )}
        </div>
      </div>

      <Footer />
    </>
  );
}
