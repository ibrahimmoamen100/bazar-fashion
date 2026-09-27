'use client';

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { getCategorySlugFromName, getCategoryNameFromSlug } from '@/utils/category';
import { Product } from '@/types/product';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LayoutGrid, Package, ChevronLeft } from 'lucide-react';
import { motion, Variants } from 'framer-motion';

interface CategoriesCarouselProps {
  initialProducts?: Product[];
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.05, duration: 0.4, ease: 'easeOut' },
  }),
};

export const CategoriesCarousel = ({ initialProducts = [] }: CategoriesCarouselProps) => {
  const navigate = useNavigate();
  const storeProducts = useStore((state) => state.products) || [];
  const products = storeProducts.length > 0 ? storeProducts : initialProducts;
  const loading = useStore((state) => state.loading);

  const categoriesData = useMemo(() => {
    const map: Record<
      string,
      { name: string; count: number; image: string; slug: string; customImage?: string }
    > = {};

    products.forEach((p) => {
      if (p.category && !p.isArchived) {
        const slug = getCategorySlugFromName(p.category);
        if (!map[p.category]) {
          map[p.category] = {
            name: p.category,
            count: 0,
            image: p.images?.[0] || '/placeholder.png',
            slug,
          };
        }
        map[p.category].count += 1;

        // Extract custom category image if available
        const customImg = p.specifications?.find((s: any) => s.key === 'الفئة')?.categoryImage;
        if (customImg && !map[p.category].customImage) {
          map[p.category].customImage = customImg;
        }

        // Prefer actual product image over fallback
        if (p.images?.[0] && (!map[p.category].image || map[p.category].image === '/placeholder.png')) {
          map[p.category].image = p.images[0];
        }
      }
    });

    return Object.values(map)
      .map((cat) => ({
        ...cat,
        image: cat.customImage || cat.image,
      }))
      .sort((a, b) => b.count - a.count);
  }, [products]);

  if (loading && categoriesData.length === 0) {
    return (
      <section className="py-4 md:py-6">
        <div className="w-full">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 shrink-0">
              <LayoutGrid className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl md:text-3xl font-black text-gray-900 leading-tight">
                تصفح حسب الأقسام
              </h2>
              <p className="text-xs md:text-sm text-gray-400 mt-0.5 font-medium">
                جاري تحميل الأقسام...
              </p>
            </div>
          </div>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </div>
      </section>
    );
  }

  if (categoriesData.length === 0) return null;

  return (
    <section className="py-2 md:py-4">
      <div className="w-full">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 shrink-0">
              <LayoutGrid className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl md:text-3xl font-black text-gray-900 leading-tight">
                تصفح حسب الأقسام
              </h2>
              <p className="text-xs md:text-sm text-gray-400 mt-0.5 font-medium">
                {categoriesData.length} قسم متاح — اختر القسم المناسب
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            onClick={() => navigate('/categories')}
            className="group hidden sm:flex items-center gap-1.5 text-primary hover:bg-primary/5 font-bold text-sm rounded-full px-4"
          >
            عرض الكل
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
          </Button>
        </div>

        {/* Categories Carousel */}
        <div className="relative">
          <Carousel opts={{ align: 'start', loop: true }} className="w-full">
            <CarouselContent className="-ml-3 md:-ml-4">
              {categoriesData.map((cat, idx) => (
                <CarouselItem
                  key={cat.slug}
                  className="pl-3 md:pl-4 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 py-2"
                >
                  <motion.div
                    custom={idx}
                    variants={cardVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-40px' }}
                    onClick={() => navigate(`/products/${cat.slug}`)}
                    className="group relative flex flex-col bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 cursor-pointer h-full"
                  >
                    {/* Image Area */}
                    <div className="aspect-[3/2.5] w-full overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5 relative">
                      <img
                        src={cat.image}
                        alt={getCategoryNameFromSlug(cat.name)}
                        className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                        loading="lazy"
                      />

                      {/* Product Count Badge */}
                      <span className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/95 backdrop-blur text-gray-800 text-[10px] sm:text-xs font-extrabold shadow-sm border border-gray-100/60">
                        <Package className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" />
                        <span>{cat.count} منتج</span>
                      </span>
                    </div>

                    {/* Footer / Bottom Content */}
                    <div className="p-3 sm:p-4 flex items-center justify-between gap-2 bg-white transition-colors duration-300 group-hover:bg-primary">
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-xs sm:text-sm group-hover:text-white transition-colors duration-300 truncate">
                          {getCategoryNameFromSlug(cat.name)}
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
              ))}
            </CarouselContent>

            <div className="hidden md:block">
              <CarouselPrevious className="left-2 shadow-md border-gray-200 hover:bg-primary hover:text-white hover:border-primary transition-all" />
              <CarouselNext className="right-2 shadow-md border-gray-200 hover:bg-primary hover:text-white hover:border-primary transition-all" />
            </div>
          </Carousel>
        </div>

        {/* Mobile View All Button */}
        <div className="text-center mt-6 sm:hidden">
          <Button
            variant="outline"
            onClick={() => navigate('/categories')}
            className="group border-2 border-primary/20 text-primary hover:bg-primary hover:text-white hover:border-primary transition-all duration-300 rounded-full px-8"
          >
            عرض جميع الأقسام
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
          </Button>
        </div>
      </div>
    </section>
  );
};
