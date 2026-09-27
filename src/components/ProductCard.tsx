'use client';

import { Product } from "@/types/product";
import { copyToClipboard } from '@/utils/clipboard';
import { useStore } from "@/store/useStore";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getProductUrl } from "@/utils/url";
import { formatCurrency } from "@/utils/format";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { CARD_THEMES } from "@/lib/siteSettings";
import { CountdownBadge } from "@/components/CountdownBadge";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompareButton } from "@/components/ProductCompare/CompareButton";
import { extractProductKeySpecs } from "@/utils/productSeo";

const getConditionBadgeStyle = (val: string) => {
  const v = val.toLowerCase();
  if (v.includes('استيراد') || v.includes('import')) {
    return 'bg-blue-50 text-blue-700 border border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/50';
  }
  if (v.includes('جديد') || v.includes('new') || v.includes('زيرو')) {
    return 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50';
  }
  if (v.includes('مستعمل') || v.includes('used')) {
    return 'bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50';
  }
  return 'bg-violet-50 text-violet-700 border border-violet-200/60 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800/50';
};

interface ProductCardProps {
  product: Product;
  onView: () => void;
  onAddToCart?: () => void;
  showCopySpecsOnly?: boolean;
  viewMode?: 'grid' | 'list';
}

export const ProductCard = ({
  product,
  onView,
  onAddToCart,
  showCopySpecsOnly,
  viewMode = 'grid',
}: ProductCardProps) => {
  if (!product) return null;

  const addToCart = useStore((state) => state.addToCart);
  const cart = useStore((state) => state.cart);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { settings } = useSiteSettings();
  const cardThemeId = settings.cardTheme || 'classic';
  const cardTheme = CARD_THEMES.find(t => t.id === cardThemeId) || CARD_THEMES[0];

  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const availableQuantity = product.wholesaleInfo?.quantity;
  const isOutOfStock = availableQuantity !== undefined ? availableQuantity <= 0 : false;
  const isLowStock = availableQuantity !== undefined && availableQuantity > 0 && availableQuantity <= 5;

  const isNewProduct = product.createdAt
    ? (new Date().getTime() - new Date(product.createdAt).getTime()) / (1000 * 60 * 60 * 24) <= 3
    : false;

  const hasOptions =
    (product.color && product.color.trim() !== '') ||
    (product.sizes && product.sizes.length > 0) ||
    (product.addons && product.addons.length > 0) ||
    (product.customOptionGroups && product.customOptionGroups.length > 0);

  const condition = (product as any).condition || extractProductKeySpecs(product).condition;

  useEffect(() => {
    if (!product.specialOffer || !product.offerEndsAt) return;
    const calc = () => {
      const diff = new Date(product.offerEndsAt as string).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft(null); return; }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [product.specialOffer, product.offerEndsAt]);

  const isInCart = cart.some((item) => item.product?.id === product.id);

  const handleViewDetails = () => {
    navigate(getProductUrl(product));
  };

  const handleAddToCart = async () => {
    if (isOutOfStock) { toast.error("المنتج غير متوفر حالياً"); return; }
    if (isInCart) {
      toast.error(t("cart.productAlreadyInCart"), {
        action: { label: t("cart.viewCart"), onClick: () => navigate("/cart") },
      });
      return;
    }
    if (hasOptions) {
      navigate(getProductUrl(product));
      return;
    }
    try {
      await addToCart(product, 1);
      toast.success(`${t("cart.productAdded")}: ${product.name}`, {
        action: { label: t("cart.checkout"), onClick: () => navigate("/cart") },
        cancel: { label: t("cart.continueShopping"), onClick: () => { } },
        duration: 5000,
      });
      onAddToCart?.();
    } catch (error) {
      toast.error("خطأ في إضافة المنتج");
    }
  };

  const handleCopySpecs = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!product) return;
    const brand = product.brand;
    const category = product.subcategory || product.category;
    const processor = `${product.processor?.name || ''} ${product.processor?.processorGeneration ? `– ${product.processor.processorGeneration}` : ''}`.trim();
    const internalGpu = product.processor?.integratedGpu || 'غير محدد';
    const externalGpu = product.dedicatedGraphics?.hasDedicatedGraphics
      ? `${product.dedicatedGraphics.dedicatedGpuModel || product.dedicatedGraphics.name || ''} – ${product.dedicatedGraphics.vram ? `${product.dedicatedGraphics.vram}GB VRAM` : ''}`
      : 'غير متوفر';
    let storage = 'SSD M.2 – 256GB';
    const storageTypeFirst = product.name.match(/(?:SSD|HDD|NVMe)\s*[-:]?\s*(\d+\s*(?:GB|TB)?)/i);
    const storageSizeFirst = product.name.match(/(\d+\s*(?:GB|TB))\s*(?:SSD|HDD|NVMe)/i);
    if (storageTypeFirst) {
      let cap = storageTypeFirst[1];
      if (!/g|t/i.test(cap)) cap += 'GB';
      storage = `SSD M.2 – ${cap}`;
    } else if (storageSizeFirst) {
      storage = `SSD M.2 – ${storageSizeFirst[1]}`;
    }
    const display = product.display?.sizeInches ? `${product.display.sizeInches} بوصة` : '';
    const features = product.description?.includes('360') || product.name.includes('360') || product.name.includes('x360')
      ? 'يدعم اللمس واللف 360 درجة'
      : (product.display?.resolution ? `دقة الشاشة ${product.display.resolution}` : '');
    const sortedSizes = [...(product.sizes || [])].sort((a, b) => a.price - b.price);
    const priceToDisplay = product.specialOffer && product.discountPrice
      ? product.discountPrice
      : (product.specialOffer && product.discountPercentage
        ? product.price * (1 - product.discountPercentage / 100)
        : product.price);
    const ramSection = sortedSizes.length > 0
      ? `\n💾 الرامات والأسعار:\n${sortedSizes.map(size => `• برام ${size.label} بسعر: ${formatCurrency(size.price, 'جنيه')}`).join('\n')}`
      : '';
    const customOptionsSection = product.customOptionGroups && product.customOptionGroups.length > 0
      ? `\n🔧 مواصفات إضافية قابلة للتعديل:\n${product.customOptionGroups.map(group => `• ${group.name}`).join('\n')}`
      : '';
    const finalPriceSection = `\n💰 تبدأ الأسعار من: ${formatCurrency(priceToDisplay, 'جنيه')}`;
    const textLines = [
      `🔹 الماركة: ${brand}`,
      `🔹 الفئة: ${category}`,
      processor ? `🔹 المعالج: ${processor}` : null,
      `🔹 كرت الشاشة الداخلي: ${internalGpu}`,
      externalGpu !== 'غير متوفر' ? `🔹 كرت الشاشة الخارجي: ${externalGpu}` : null,
      `🔹 التخزين: ${storage}`,
      display ? `🔹 الشاشة: ${display}` : null,
      features ? `🔹 ${features}` : null,
      ramSection,
      customOptionsSection,
      finalPriceSection,
      ' ',
      '📸 يمكنك مشاهدة صور وفيديو اللابتوب والمواصفات كاملة',
      '🛒 مع إمكانية الشراء من خلال اللينك الرسمي على متجر بازار للموضه',
      `🔗 ${window.location.origin}${getProductUrl(product.id, product.name, product.category, product.subcategory)}`,
      '',
      'أو يمكن الشراء من هنا 👇',
      'فقط اترك اسمك، عنوانك، ورقم تليفونك',
      '',
      '🚚 مصاريف الشحن:',
      '• داخل القاهرة: 100 جنيه – التوصيل خلال 24 ساعة',
      '• باقي المحافظات: 180 جنيه – التوصيل خلال 72 ساعة'
    ].filter(Boolean);
    try {
      await copyToClipboard(textLines.join('\n'));
      toast.success("تم نسخ المواصفات بنجاح");
    } catch {
      toast.error("حدث خطأ أثناء النسخ");
    }
  };

  const discountedPrice =
    product.specialOffer && product.discountPrice
      ? product.discountPrice
      : (product.specialOffer && product.discountPercentage
        ? product.price - product.price * (product.discountPercentage / 100)
        : null);

  const currentImage = product.images?.[currentImageIndex] || product.images?.[0] || '/placeholder.svg';

  /* ─── LIST VIEW (unchanged layout) ─── */
  if (viewMode === 'list') {
    return (
      <div
        className={`pc-root list-mode group ${isOutOfStock ? 'opacity-60' : ''}`}
        onMouseEnter={() => product.images && product.images.length > 1 && setCurrentImageIndex(1)}
        onMouseLeave={() => setCurrentImageIndex(0)}
      >
        {/* Image */}
        <div className="pc-image-wrap relative overflow-hidden shrink-0 aspect-square w-[110px] xs:w-[140px] sm:w-[200px]">
          <img src={currentImage} alt={product.name || 'Product'} className="w-full h-full object-contain p-3 sm:p-4 mix-blend-multiply" loading="lazy" width="200" height="200" />
          {isNewProduct && (
            <div className="absolute top-0 left-3 z-20 bg-gradient-to-b from-[#ff5a5a] to-[#ff4242] text-white flex flex-col items-center justify-start pt-1.5 pb-2.5 px-1.5 shadow-sm min-w-[32px]" style={{ clipPath: 'polygon(100% 0, 100% 100%, 50% 82%, 0 100%, 0 0)' }}>
              <span className="text-[11px] font-black leading-none mt-1.5 mb-0.5">جديد</span>
            </div>
          )}
          {product.specialOffer && timeLeft && (
            <div className="absolute top-0 right-3 z-20">
              <CountdownBadge timeLeft={timeLeft} size="sm" />
            </div>
          )}
          {product.specialOffer && timeLeft && product.discountPercentage && (
            <div className="absolute top-2 left-2 z-10">
              <span className="text-[9px] font-black bg-red-500 text-white px-2 py-0.5 rounded-full shadow-sm">‏-{product.discountPercentage}%</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="pc-content-wrap flex flex-col flex-1 min-w-0 p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-1.5 mb-1" dir="rtl">
            <p className="pc-brand text-[10px] font-black uppercase tracking-widest truncate">
              {product.brand}
              {product.category && <span className="font-normal text-gray-400 normal-case"> · {product.category}</span>}
              {product.subcategory && <span className="font-normal text-gray-400 normal-case"> · {product.subcategory}</span>}
            </p>
            {condition && (
              <span className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-md leading-none ${getConditionBadgeStyle(condition)}`}>
                {condition}
              </span>
            )}
          </div>
          <h3 className="pc-name font-bold leading-snug cursor-pointer mb-3 line-clamp-3 text-sm sm:text-xs" onClick={handleViewDetails}>
            {product.name}
          </h3>
          <div className="mt-auto space-y-2.5">
            <div className="flex items-baseline gap-1.5">
              {discountedPrice !== null ? (
                <>
                  <span className="font-black text-base sm:text-lg text-gray-900 leading-none">{formatCurrency(discountedPrice, 'جنيه')}</span>
                  <span className="text-[11px] text-gray-400 line-through font-medium">{formatCurrency(product.price, 'جنيه')}</span>
                </>
              ) : (
                <span className="pc-price font-black text-base sm:text-lg leading-none">{formatCurrency(product.price, 'جنيه')}</span>
              )}
            </div>
            {showCopySpecsOnly ? (
              <Button className="w-full h-10 text-sm font-bold bg-gray-900 hover:bg-gray-800 text-white rounded-xl" onClick={handleCopySpecs}>
                نسخ المواصفات
              </Button>
            ) : (
              <div className="flex gap-2 w-full">
                <button
                  className={`pc-btn flex-1 h-10 transition-all cursor-pointer flex items-center justify-center gap-1.5 rounded-xl shrink-0 ${isOutOfStock ? '!text-[10px] sm:!text-xs font-bold px-1' : 'text-xs font-bold'
                    }`}
                  onClick={handleViewDetails}
                >
                  {!isOutOfStock && <Search className="w-3.5 h-3.5 hidden sm:block shrink-0" />}
                  <span className={`truncate ${isOutOfStock ? '!text-[10px] sm:!text-xs' : ''}`}>
                    {isOutOfStock ? 'نفذت الكمية' : 'التفاصيل'}
                  </span>
                </button>
                <CompareButton product={product} variant="icon" />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ─── GRID VIEW (new simple design) ─── */
  return (
    <div
      className={`pc-root group ${isOutOfStock ? 'opacity-60' : ''}`}
      onMouseEnter={() => product.images && product.images.length > 1 && setCurrentImageIndex(1)}
      onMouseLeave={() => setCurrentImageIndex(0)}
    >
      {/* ── IMAGE ── */}
      <div className="pc-image-wrap relative overflow-hidden w-full aspect-square">
        <img
          src={currentImage}
          alt={product.name || 'Product'}
          className="w-full h-full object-contain p-4 mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          width="300"
          height="300"
        />

        {/* New ribbon */}
        {isNewProduct && (
          <div
            className="absolute top-0 left-3 z-20 bg-gradient-to-b from-[#ff5a5a] to-[#ff4242] text-white flex flex-col items-center justify-start pt-1.5 pb-2.5 px-1.5 shadow-sm min-w-[32px]"
            style={{ clipPath: 'polygon(100% 0, 100% 100%, 50% 82%, 0 100%, 0 0)' }}
          >
            <span className="text-[11px] font-black leading-none mt-1.5 mb-0.5">جديد</span>
          </div>
        )}

        {/* Stock badge */}
        {(isOutOfStock || isLowStock) && (
          <div className="absolute top-2 left-2 z-10">
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isOutOfStock ? 'bg-gray-900 text-white' : 'bg-orange-100 text-orange-700'}`}>
              {isOutOfStock ? 'نفذت الكمية' : 'كمية محدودة'}
            </span>
          </div>
        )}

        {/* Countdown */}
        {product.specialOffer && timeLeft && (
          <div className="absolute top-0 right-3 z-20">
            <CountdownBadge timeLeft={timeLeft} size="md" />
          </div>
        )}

        {/* Discount pill */}
        {product.specialOffer && timeLeft && product.discountPercentage && (
          <div className="absolute top-2 left-2 z-10">
            <span className="text-[9px] font-black bg-red-500 text-white px-2 py-0.5 rounded-full shadow-sm">
              ‏-{product.discountPercentage}%
            </span>
          </div>
        )}

      </div>

      {/* ── CONTENT ── */}
      <div className="pc-content-wrap flex flex-col flex-1 min-w-0 px-3 pt-3 pb-3">

        {/* Category · Brand · Subcategory pills row */}
        <div className="flex flex-wrap items-center gap-1 mb-2" dir="rtl">
          {product.category && (
            <span className="inline-flex items-center text-[9.5px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md leading-none">
              {product.category}
            </span>
          )}
          {product.brand && (
            <span
              className="inline-flex items-center text-[9.5px] font-bold px-1.5 py-0.5 rounded-md leading-none"
              style={{ background: 'hsl(var(--primary)/0.08)', color: 'hsl(var(--primary))' }}
            >
              {product.brand}
            </span>
          )}
          {product.subcategory && product.subcategory !== product.category && (
            <span className="inline-flex items-center text-[9.5px] font-semibold text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md leading-none">
              {product.subcategory}
            </span>
          )}
          {condition && (
            <span className={`inline-flex items-center text-[9.5px] font-bold px-1.5 py-0.5 rounded-md leading-none ${getConditionBadgeStyle(condition)}`}>
              {condition}
            </span>
          )}
        </div>

        {/* Product Name */}
        <h3
          className="pc-name font-semibold text-[11.5px] leading-[1.4] mb-3 line-clamp-3 cursor-pointer"
          onClick={handleViewDetails}
        >
          {product.name}
        </h3>

        {/* Price + Button pinned to bottom */}
        <div className="mt-auto">
          {/* Price */}
          <div className="flex items-baseline gap-1.5 mb-2.5">
            {discountedPrice !== null ? (
              <>
                <span className="font-black text-base text-gray-900 leading-none">
                  {formatCurrency(discountedPrice, 'جنيه')}
                </span>
                <span className="text-[11px] text-gray-400 line-through font-medium">
                  {formatCurrency(product.price, 'جنيه')}
                </span>
              </>
            ) : (
              <span className="pc-price font-black text-base leading-none">
                {formatCurrency(product.price, 'جنيه')}
              </span>
            )}
          </div>

          {/* CTA Button */}
          {showCopySpecsOnly ? (
            <Button
              className="w-full h-10 text-sm font-bold bg-gray-900 hover:bg-gray-800 text-white rounded-xl transition-colors"
              onClick={handleCopySpecs}
            >
              نسخ المواصفات
            </Button>
          ) : (
            <div className="flex gap-2 w-full">
              <button
                className={`pc-btn flex-1 h-10 transition-all cursor-pointer flex items-center justify-center gap-1.5 rounded-xl shrink-0 ${isOutOfStock ? '!text-[10px] sm:!text-xs font-bold px-1' : 'text-xs font-bold'
                  }`}
                onClick={handleViewDetails}
              >
                {!isOutOfStock && <Search className="w-3.5 h-3.5 hidden sm:block shrink-0" />}
                <span className={`truncate ${isOutOfStock ? '!text-[10px] sm:!text-xs' : ''}`}>
                  {isOutOfStock ? 'نفذت الكمية' : 'التفاصيل'}
                </span>
              </button>
              <CompareButton product={product} variant="icon" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
