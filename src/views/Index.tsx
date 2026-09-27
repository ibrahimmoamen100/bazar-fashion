'use client';

import { useState, useEffect } from "react";
import { ProductModal } from "@/components/ProductModal";
import { useStore } from "@/store/useStore";
import { CategoriesCarousel } from "@/components/CategoriesCarousel";
import { ShopsCarousel } from "@/components/ShopsCarousel";
import { Product } from "@/types/product";
import { useTranslation } from "react-i18next";
import { SEOHelmet } from "@/components/SEOHelmet";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { ProductCarousel } from "@/components/ProductCarousel";
import { BrandsCarousel } from "@/components/BrandsCarousel";
import { ImportGuide } from "@/components/ImportGuide";
import Footer from "@/components/Footer";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Zap, Star, Shield, Truck, ChevronRight, Search, Users, ThumbsUp, TrendingUp, Cpu, Sparkles } from "lucide-react";
import { STORE_HERO_CAROUSEL } from "@/constants/store";
import { motion } from "framer-motion";



const MotionLink = motion.create(Link);

interface IndexProps {
  initialProducts?: Product[];
}

const Index = ({ initialProducts = [] }: IndexProps) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const storeProducts = useStore((state) => state.products) || [];
  const products = storeProducts.length > 0 ? storeProducts : initialProducts;
  const loadProducts = useStore((state) => state.loadProducts);
  const loading = useStore((state) => state.loading);
  const loadedCategory = useStore((state) => state.loadedCategory);
  const { t } = useTranslation();
  const [heroApi, setHeroApi] = useState<any>(null);
  const [isHeroHovered, setIsHeroHovered] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();
  const { settings } = useSiteSettings();

  // Signal to the GlobalSplash that the main page is ready and mounted
  useEffect(() => {
    window.dispatchEvent(new Event('app-ready'));
    return () => {
      // optional cleanup if we navigate away immediately, not really needed for splash
    };
  }, []);

  useEffect(() => {
    if ((storeProducts.length === 0 || loadedCategory !== undefined) && !loading) loadProducts();
  }, [storeProducts.length, loading, loadProducts, loadedCategory]);

  useEffect(() => {
    if (!heroApi || isHeroHovered) return;
    const interval = setInterval(() => {
      if (heroApi.canScrollNext()) {
        heroApi.scrollNext();
        setCurrentSlide((p) => p + 1);
      } else {
        heroApi.scrollTo(0);
        setCurrentSlide(0);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [heroApi, isHeroHovered]);

  const specialOffersProducts = products.filter(
    (p) => p && p.id && !p.isArchived && p.specialOffer && p.offerEndsAt && new Date(p.offerEndsAt as string) > new Date()
  );






  return (
    <>
      <div className="min-h-screen bg-gray-50/50">
        <SEOHelmet />

        <main>

          {/* ── Hero Section ── */}
          <section className="relative">
            <div
              onMouseEnter={() => setIsHeroHovered(true)}
              onMouseLeave={() => setIsHeroHovered(false)}
              className="relative"
            >
              <Carousel className="w-full group/carousel" setApi={setHeroApi}>
                <CarouselContent>
                  {STORE_HERO_CAROUSEL.map((slide, i) => (
                    <CarouselItem key={slide.id}>
                      <Link
                        to={slide.buttonLink}
                        className="block relative w-full md:w-[1300px] lg:mx-auto bg-white group overflow-hidden focus:outline-none"
                      >
                        <img
                          src={slide.image}
                          alt={slide.title || "Banner"}
                          className="w-full h-auto md:max-h-[550px] object-cover transition-transform duration-1000 group-hover:scale-[1.02]"
                          loading={i === 0 ? "eager" : "lazy"}
                          decoding={i === 0 ? "sync" : "async"}
                          fetchPriority={i === 0 ? "high" : "low"}
                          width="1300"
                          height="550"
                        />
                        {/* Subtle gradient at bottom for dots visibility */}
                        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-gray-900/40 to-transparent pointer-events-none" />
                      </Link>
                    </CarouselItem>
                  ))}
                </CarouselContent>

                <div className="hidden sm:block absolute inset-y-0 left-0 right-0 pointer-events-none opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-500">
                  <CarouselPrevious className="absolute left-6 top-1/2 -translate-y-1/2 pointer-events-auto border-white/20 bg-black/20 backdrop-blur-md text-white hover:bg-black/40 hover:text-white shadow-lg rounded-full w-12 h-12 transition-all" />
                  <CarouselNext className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-auto border-white/20 bg-black/20 backdrop-blur-md text-white hover:bg-black/40 hover:text-white shadow-lg rounded-full w-12 h-12 transition-all" />
                </div>

                {/* Slide dots */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-30 pointer-events-auto">
                  {STORE_HERO_CAROUSEL.map((_, i) => (
                    <button
                      key={i}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        heroApi?.scrollTo(i);
                        setCurrentSlide(i);
                      }}
                      className={`transition-all duration-300 rounded-full cursor-pointer ${currentSlide % STORE_HERO_CAROUSEL.length === i ? "w-8 h-2 bg-white shadow-[0_0_8px_rgba(0,0,0,0.5)]" : "w-2 h-2 bg-white/50 hover:bg-white/90"}`}
                    />
                  ))}
                </div>
              </Carousel>
            </div>
          </section>

          {/* ── Trust Badges ── */}
          {/* <section className="py-6 bg-white border-y border-gray-100">
            <div className="container">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {TRUST_BADGES.map((badge, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-3 rounded-2xl ${badge.bg} transition-all duration-300 hover:scale-[1.03]`}
                  >
                    <div className={`p-2 rounded-xl bg-white shadow-sm`}>
                      <badge.icon className={`h-5 w-5 ${badge.color}`} />
                    </div>
                    <span className="text-sm font-bold text-gray-700">{badge.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </section> */}

          <div className="container py-6 md:py-10 space-y-12 md:space-y-16">

            {/* ── Browse by Categories ── directly after hero */}
            <CategoriesCarousel initialProducts={products} />

            {/* ── Custom Builder Banner ("ابني تجميعتك") ── Minimal & Clean */}
            {/* <section className="relative">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5 }}
                className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-slate-50/80 to-orange-50/25 border border-slate-200/80 shadow-[0_15px_35px_rgba(0,0,0,0.03)] p-6 sm:p-8 md:p-10"
              >
                <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-orange-600 via-amber-500 to-orange-500" />

                <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-orange-500/8 blur-[90px] pointer-events-none" />
                <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-amber-500/8 blur-[90px] pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-10">
                  <div className="flex-1 text-center md:text-right space-y-4">
                    <div className="space-y-2">
                      <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-gray-950">
                        ابنِ تجميعتك
                      </h2>
                      <p className="text-gray-600 text-sm sm:text-base font-semibold leading-relaxed">
                        من متاجر حقيقية في المولات المختلفة — يوجد جديد ومستعمل استيراد
                      </p>
                    </div>

                    <div className="pt-2">
                      <Link
                        to="/builder"
                        className="inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-600 hover:from-orange-500 hover:to-amber-500 text-white font-black text-sm sm:text-base px-8 py-4 rounded-2xl shadow-[0_10px_25px_rgba(234,88,12,0.25)] hover:shadow-[0_15px_35px_rgba(234,88,12,0.4)] transition-all duration-300 transform hover:-translate-y-0.5"
                      >
                        <Cpu className="w-5 h-5" />
                        <span>ابدأ تجميع جهازك الآن</span>
                        <ArrowLeft className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>

                  <div className="w-full md:w-[460px] lg:w-[540px] shrink-0">
                    <Link
                      to="/builder"
                      className="group/card relative block rounded-2xl md:rounded-3xl p-1 transition-all duration-500"
                    >
                      <div className="absolute -inset-1 bg-gradient-to-r from-orange-500/25 via-amber-500/20 to-orange-600/30 rounded-[26px] blur-lg opacity-75 group-hover/card:opacity-100 transition duration-500" />

                      <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-slate-950 border border-slate-800/80 shadow-[0_15px_35px_rgba(0,0,0,0.15)]">
                        <img
                          src="/pc.png"
                          alt="ابني تجميعتك - بازار للموضه"
                          className="w-full h-auto object-cover transition-transform duration-700 ease-out group-hover/card:scale-[1.03]"
                          loading="lazy"
                        />
                      </div>
                    </Link>
                  </div>
                </div>
              </motion.div>
            </section> */}

            {/* ── Shop by Merchant ── */}
            {/* <ShopsCarousel /> */}

            {/* ── Special Offers ── */}
            {specialOffersProducts.length > 0 && (
              <section className="relative">
                {/* Section Container with Premium White Design & soft shadows */}
                <div className="relative rounded-3xl overflow-hidden bg-white border border-gray-100 p-6 sm:p-8 md:p-10 shadow-[0_20px_45px_rgba(0,0,0,0.05)]">
                  {/* Premium top gradient line */}
                  <div className="absolute top-0 left-0 right-0 h-[6px] bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500" />

                  {/* Decorative glowing background blobs (very subtle) */}
                  <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-red-500/5 blur-[80px] pointer-events-none" />
                  <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-orange-500/5 blur-[80px] pointer-events-none" />

                  <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-gray-100 pb-6">
                      <div className="flex items-center gap-4 sm:gap-6">
                        {/* CSS-coded floating rosette badge */}
                        <motion.div
                          animate={{
                            y: [0, -6, 0],
                            rotate: [0, 1.5, -1.5, 0]
                          }}
                          transition={{
                            duration: 5,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                          className="relative shrink-0"
                        >
                          <svg
                            viewBox="0 0 100 110"
                            className="w-16 h-16 sm:w-20 sm:h-20 drop-shadow-[0_6px_14px_rgba(200,0,0,0.4)]"
                          >
                            <defs>
                              <linearGradient id="rosetteG" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#ff5252" />
                                <stop offset="50%" stopColor="#cc1111" />
                                <stop offset="100%" stopColor="#880000" />
                              </linearGradient>
                              <linearGradient id="rosetteGloss" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
                                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                              </linearGradient>
                            </defs>

                            {/* Ribbon tails */}
                            <polygon points="36,72 22,105 37,96 50,72" fill="#7f1d1d" />
                            <polygon points="64,72 78,105 63,96 50,72" fill="#7f1d1d" />
                            <polygon points="36,72 18,100 34,92 50,72" fill="#991b1b" />
                            <polygon points="64,72 82,100 66,92 50,72" fill="#991b1b" />

                            {/* Scalloped rosette body — 24-point */}
                            {(() => {
                              const cx = 50, cy = 46, R = 38, depth = 4, n = 24;
                              const pts = [];
                              for (let i = 0; i <= n * 2; i++) {
                                const angle = (i * Math.PI * 2) / (n * 2);
                                const r = R + (i % 2 === 0 ? depth : -depth);
                                pts.push(`${i === 0 ? 'M' : 'L'} ${(cx + Math.cos(angle) * r).toFixed(1)} ${(cy + Math.sin(angle) * r).toFixed(1)}`);
                              }
                              return <path d={pts.join(' ') + ' Z'} fill="url(#rosetteG)" stroke="#7f1d1d" strokeWidth="0.5" />;
                            })()}

                            {/* Gloss overlay */}
                            {(() => {
                              const cx = 50, cy = 46, R = 38, depth = 4, n = 24;
                              const pts = [];
                              for (let i = 0; i <= n * 2; i++) {
                                const angle = (i * Math.PI * 2) / (n * 2);
                                const r = R + (i % 2 === 0 ? depth : -depth);
                                pts.push(`${i === 0 ? 'M' : 'L'} ${(cx + Math.cos(angle) * r).toFixed(1)} ${(cy + Math.sin(angle) * r).toFixed(1)}`);
                              }
                              return <path d={pts.join(' ') + ' Z'} fill="url(#rosetteGloss)" />;
                            })()}

                            {/* Inner dashed circle */}
                            <circle cx="50" cy="46" r="29" fill="none" stroke="white" strokeWidth="0.8" strokeDasharray="2.5 2" opacity="0.55" />

                            {/* Arabic text */}
                            <text x="50" y="41" textAnchor="middle" fill="white" fontSize="10" fontWeight="900" fontFamily="Cairo,Tajawal,Arial,sans-serif">عرض</text>
                            <text x="50" y="55" textAnchor="middle" fill="white" fontSize="10" fontWeight="900" fontFamily="Cairo,Tajawal,Arial,sans-serif">خاص</text>
                          </svg>
                        </motion.div>

                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="flex h-2 w-2 rounded-full bg-red-500 animate-ping" />
                            <span className="text-[11px] font-bold tracking-wider text-red-600 uppercase bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                              عروض حصرية ولفترة محدودة
                            </span>
                          </div>
                          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-gray-900">
                            {t("specialOffers.title")}
                          </h2>
                          <p className="text-sm text-gray-500 mt-1 font-medium">{t("specialOffers.subtitle")}</p>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => navigate("/products")}
                        className="group flex items-center justify-center gap-2 border-red-200 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 rounded-full px-6 py-2.5 text-sm font-bold shadow-sm transition-all duration-300"
                      >
                        عرض جميع العروض
                        <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform rtl:rotate-180" />
                      </Button>
                    </div>

                    {loading && products.length === 0 ? (
                      <div className="flex justify-center py-16">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
                      </div>
                    ) : (
                      <div className="special-offers-carousel-wrapper">
                        <ProductCarousel products={specialOffersProducts} />
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}



            {/* ── Wholesale & Bulk Section ── */}
            {/* {settings.isImporter !== false && (
              <section>
                <Link
                  to="/wholesale"
                  className="group flex flex-col md:flex-row items-center justify-between overflow-hidden rounded-2xl shadow-sm hover:shadow-md border border-gray-200/60 bg-white transition-all duration-300 min-h-[120px]"
                >
                  <div className="flex-1 p-5 md:p-8 text-right flex flex-col justify-center h-full">
                    <div className="flex items-center gap-3 mb-2 md:mb-3">

                      <h2 className="text-lg md:text-2xl font-bold text-gray-900">
                        قسم التوريدات والجملة
                      </h2>
                    </div>

                    <p className="text-sm text-gray-500 mb-0 md:mb-4 max-w-xl">
                      أسعار خاصة للشركات والموزعين — أجهزة أصلية بكميات كبيرة مع ضمان معتمد وعقود صيانة.
                    </p>

                    <div className="flex md:flex items-center gap-2 text-blue-800 font-semibold text-sm group-hover:text-indigo-700 transition-colors">
                      تصفح عروض الشركات
                      <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 duration-300" />
                    </div>
                  </div>

                  <div className="w-full md:w-[40%] h-32 md:h-full relative overflow-hidden bg-gray-50">
                    <div className="absolute inset-0  z-10" />
                    <img
                      src="/bg2.jpeg"
                      alt="التوريدات والجملة"
                      className="w-full h-full object-cover md:object-right transition-transform duration-700 group-hover:scale-105 opacity-90"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                </Link>
              </section>
            )} */}

            {/* ── Import Guide & Video ── moved above Brands */}
            {/* <ImportGuide /> */}







            {/* ── Brands ── */}
            {/* <section className="pb-4">
              <BrandsCarousel title={t("brands.title")} />
            </section> */}
          </div>

        </main>

        <Footer initialProducts={products} />

        <ProductModal product={selectedProduct} open={modalOpen} onOpenChange={setModalOpen} />
      </div>
    </>
  );
};

export default Index;
