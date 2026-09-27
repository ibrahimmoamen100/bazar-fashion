'use client';

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveSuppliers, getSupplierSlug } from '@/lib/suppliersCache';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Store, ChevronLeft } from 'lucide-react';
import { motion, Variants } from 'framer-motion';

interface Supplier {
  id: string;
  name: string;
  slug?: string;
  logo?: string;
  coverImage?: string;
  description?: string;
  isArchived?: boolean;
  displayOrder?: number;
}

function slugify(name: string) {
  return (name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\u0600-\u06FFa-z0-9-]/g, '')
    .replace(/-+/g, '-');
}

function getShopSlug(s: Supplier): string {
  if (s.slug && s.slug.trim()) return s.slug.trim();
  return slugify(s.name) || s.id;
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.07, duration: 0.45, ease: 'easeOut' },
  }),
};

export const ShopsCarousel = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    getActiveSuppliers().then((list) => {
      if (isMounted) {
        setSuppliers(list.slice(0, 12) as Supplier[]);
        setLoading(false);
      }
    }).catch((e) => {
      console.error('Failed to load suppliers for carousel', e);
      if (isMounted) setLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading && suppliers.length === 0) {
    return (
      <section className="py-4 md:py-6">
        <div className="w-full">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 shrink-0">
              <Store className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl md:text-3xl font-black text-gray-900 leading-tight">تصفح حسب التجار</h2>
              <p className="text-xs md:text-sm text-gray-400 mt-0.5 font-medium">جاري تحميل التجار...</p>
            </div>
          </div>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </div>
      </section>
    );
  }

  if (suppliers.length === 0) return null;

  return (
    <section className="py-4 md:py-6">
      <div className="w-full">

        {/* Section Header */}
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 shrink-0">
              <Store className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl md:text-3xl font-black text-gray-900 leading-tight">
                تصفح حسب التجار
              </h2>
              <p className="text-xs md:text-sm text-gray-400 mt-0.5 font-medium">
                {suppliers.length} متجر متاح — اختر ما يناسبك
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            onClick={() => navigate('/shops')}
            className="group hidden sm:flex items-center gap-1.5 text-primary hover:bg-primary/5 font-bold text-sm rounded-full px-4"
          >
            عرض الكل
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
          </Button>
        </div>

        {/* Carousel */}
        <div className="relative">
          <Carousel opts={{ align: 'start', loop: true }} className="w-full">
            <CarouselContent className="-ml-3 md:-ml-4">
              {suppliers.map((supplier, idx) => {
                const slug = getSupplierSlug(supplier);
                const coverImg = supplier.coverImage;
                const logo = supplier.logo;

                return (
                  <CarouselItem
                    key={supplier.id}
                    className="pl-3 md:pl-4 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 py-2"
                  >
                    <motion.div
                      custom={idx}
                      variants={cardVariants}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true, margin: '-40px' }}
                      onClick={() => navigate(`/${slug}/categories`)}
                      className="group relative flex flex-col bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 cursor-pointer h-full"
                    >
                      {/* Image / Logo Area */}
                      <div className="aspect-[3/2.5] w-full overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5 relative">
                        {coverImg ? (
                          <>
                            <img
                              src={coverImg}
                              alt={supplier.name}
                              className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                              loading="lazy"
                            />
                            {logo && (
                              <div className="absolute top-2.5 right-2.5 w-9 h-9 rounded-xl bg-white shadow-md overflow-hidden flex items-center justify-center p-1 border border-white/80">
                                <img src={logo} alt={supplier.name} className="w-full h-full object-contain" />
                              </div>
                            )}
                          </>
                        ) : logo ? (
                          <div className="w-full h-full flex items-center justify-center p-4 bg-white">
                            <img
                              src={logo}
                              alt={supplier.name}
                              className="max-h-full max-w-full object-contain transition-transform duration-500 ease-out group-hover:scale-105"
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-5xl font-black text-primary/30 select-none">
                              {supplier.name.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Footer / Bottom Content */}
                      <div className="p-3 sm:p-4 flex items-center justify-between gap-2 bg-white transition-colors duration-300 group-hover:bg-primary">
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 text-xs sm:text-sm group-hover:text-white transition-colors duration-300 truncate">
                            {supplier.name}
                          </h3>
                          <p className="text-[10px] sm:text-xs text-gray-400 font-semibold group-hover:text-white/85 transition-colors duration-300 truncate">
                            تصفح المنتجات
                          </p>
                        </div>
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center transition-all duration-300 shrink-0 group-hover:bg-white group-hover:shadow-sm">
                          <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary transition-colors duration-300" />
                        </div>
                      </div>
                    </motion.div>
                  </CarouselItem>
                );
              })}
            </CarouselContent>

            <div className="hidden md:block">
              <CarouselPrevious className="left-2 shadow-md border-gray-200 hover:bg-primary hover:text-white hover:border-primary transition-all" />
              <CarouselNext className="right-2 shadow-md border-gray-200 hover:bg-primary hover:text-white hover:border-primary transition-all" />
            </div>
          </Carousel>
        </div>

        {/* Mobile view all */}
        <div className="text-center mt-6 sm:hidden">
          <Button
            variant="outline"
            onClick={() => navigate('/shops')}
            className="group border-2 border-primary/20 text-primary hover:bg-primary hover:text-white hover:border-primary transition-all duration-300 rounded-full px-8"
          >
            عرض جميع التجار
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
          </Button>
        </div>
      </div>
    </section>
  );
};
