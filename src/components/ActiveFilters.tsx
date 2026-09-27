'use client';

import { useStore } from "@/store/useStore";
import { copyToClipboard } from '@/utils/clipboard';
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { X, Share2, Check } from "lucide-react";
import { useMemo, useState } from "react";
import { Filter } from "@/types/product";
import { Button } from "@/components/ui/button";
import { filterProducts, MANDATORY_SPEC_KEYS } from "@/utils/productFilter";

interface ActiveFilter {
  key: string;
  label: string;
  value: string;
  removeHandler: () => void;
}

export function ActiveFilters() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const filters = useStore((state) => state.filters);
  const setFilters = useStore((state) => state.setFilters);
  const products = useStore((state) => state.products) || [];

  // Calculate filtered products count using shared filter engine
  const filteredProductsCount = useMemo(() => {
    return filterProducts(products, filters).length;
  }, [products, filters]);

  // Helper to remove item from array filter
  const removeFromArray = (key: keyof Filter, value: any) => {
    const currentValues = (filters[key] as any[]) || [];
    const newValues = currentValues.filter((v) => v !== value);
    setFilters({ ...filters, [key]: newValues.length > 0 ? newValues : undefined });
  };

  // Get all active filters
  const getActiveFilters = (): ActiveFilter[] => {
    const activeFilters: ActiveFilter[] = [];

    // Search filter
    if (filters.search) {
      activeFilters.push({
        key: "search",
        label: t("navigation.search") || "البحث",
        value: filters.search,
        removeHandler: () => {
          setFilters({ ...filters, search: undefined });
        },
      });
    }

    // Special Offer
    if (filters.specialOffer) {
      activeFilters.push({
        key: "special-offer",
        label: "عروض خاصة",
        value: "تخفيضات فقط",
        removeHandler: () => {
          setFilters({ ...filters, specialOffer: undefined });
        },
      });
    }

    // Subcategory filter
    if (filters.subcategory && filters.subcategory.length > 0) {
      filters.subcategory.forEach(s => {
        activeFilters.push({
          key: `subcat-${s}`,
          label: t("filters.subcategory") || "القسم الفرعي",
          value: s,
          removeHandler: () => removeFromArray('subcategory', s),
        });
      });
    }

    // Brand filter
    if (filters.brand && filters.brand.length > 0) {
      filters.brand.forEach(b => {
        activeFilters.push({
          key: `brand-${b}`,
          label: t("filters.brand") || "الماركة",
          value: b,
          removeHandler: () => removeFromArray('brand', b),
        });
      });
    }

    // Color filter
    if (filters.color && filters.color.length > 0) {
      filters.color.forEach(c => {
        activeFilters.push({
          key: `color-${c}`,
          label: t("filters.color") || "اللون",
          value: c,
          removeHandler: () => removeFromArray('color', c),
        });
      });
    }

    // Size filter
    if (filters.size && filters.size.length > 0) {
      filters.size.forEach(s => {
        activeFilters.push({
          key: `size-${s}`,
          label: t("filters.size") || "المقاس",
          value: s,
          removeHandler: () => removeFromArray('size', s),
        });
      });
    }

    // Features filter
    if (filters.features && filters.features.length > 0) {
      const featureLabels: Record<string, string> = {
        touch: 'يدعم اللمس',
        x360: 'قابل للدوران 360°',
        detachable: 'قابل للفصل',
      };
      filters.features.forEach(feat => {
        activeFilters.push({
          key: `feature-${feat}`,
          label: 'مميزات خاصة',
          value: featureLabels[feat] || feat,
          removeHandler: () => removeFromArray('features', feat),
        });
      });
    }

    // Screen Size
    if (filters.screenSize && filters.screenSize.length > 0) {
      filters.screenSize.forEach(sz => {
        activeFilters.push({
          key: `screen-${sz}`,
          label: t("filters.screenSize") || "الشاشة",
          value: `${sz}"`,
          removeHandler: () => removeFromArray('screenSize', sz),
        });
      });
    }

    // Processor Brand
    if (filters.processorBrand && filters.processorBrand.length > 0) {
      filters.processorBrand.forEach(pb => {
        activeFilters.push({
          key: `proc-brand-${pb}`,
          label: "المعالج",
          value: pb,
          removeHandler: () => removeFromArray('processorBrand', pb),
        });
      });
    }

    // Processor Series
    if (filters.processorSeries && filters.processorSeries.length > 0) {
      filters.processorSeries.forEach(ps => {
        activeFilters.push({
          key: `proc-series-${ps}`,
          label: "فئة المعالج",
          value: ps,
          removeHandler: () => removeFromArray('processorSeries', ps),
        });
      });
    }

    // Dedicated GPU Name
    if (filters.dedicatedGraphicsName && filters.dedicatedGraphicsName.length > 0) {
      filters.dedicatedGraphicsName.forEach(gpu => {
        activeFilters.push({
          key: `gpu-${gpu}`,
          label: "كرت الشاشة",
          value: gpu,
          removeHandler: () => removeFromArray('dedicatedGraphicsName', gpu),
        });
      });
    }

    // Price range filters
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      const priceLabel =
        filters.minPrice !== undefined && filters.maxPrice !== undefined
          ? `${filters.minPrice} - ${filters.maxPrice} ${t("common.currency") || "جنيه"}`
          : filters.minPrice !== undefined
            ? `من ${filters.minPrice} ${t("common.currency") || "جنيه"}`
            : `حتى ${filters.maxPrice} ${t("common.currency") || "جنيه"}`;

      activeFilters.push({
        key: "priceRange",
        label: t("filters.priceRange") || "السعر",
        value: priceLabel,
        removeHandler: () => {
          setFilters({ ...filters, minPrice: undefined, maxPrice: undefined });
        },
      });
    }

    // Dynamic Specifications
    if (filters.dynamicSpecs && Object.keys(filters.dynamicSpecs).length > 0) {
      Object.entries(filters.dynamicSpecs).forEach(([specKey, values]) => {
        if (MANDATORY_SPEC_KEYS.includes(specKey)) return;
        if (values && values.length > 0) {
          values.forEach(val => {
            activeFilters.push({
              key: `dyn-${specKey}-${val}`,
              label: specKey,
              value: val,
              removeHandler: () => {
                const currentValues = filters.dynamicSpecs?.[specKey] || [];
                const newValues = currentValues.filter(v => v !== val);
                const newDynamicSpecs = { ...filters.dynamicSpecs };
                if (newValues.length > 0) {
                  newDynamicSpecs[specKey] = newValues;
                } else {
                  delete newDynamicSpecs[specKey];
                }
                setFilters({
                  ...filters,
                  dynamicSpecs: Object.keys(newDynamicSpecs).length > 0 ? newDynamicSpecs : undefined
                });
              }
            });
          });
        }
      });
    }

    return activeFilters;
  };

  const activeFilters = getActiveFilters();
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    const url = window.location.href;
    const success = await copyToClipboard(url);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 space-y-3">
      {/* Products Count + Share Button */}
      <div className="flex items-center justify-between pb-2 border-b">
        <span className="text-base font-semibold text-foreground">
          {t("products.title") || "المنتجات"}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
            {filteredProductsCount} {t("products.product") || "منتج"}
          </span>
          <button
            onClick={handleCopyLink}
            title={copied ? "تم النسخ!" : "مشاركة الرابط"}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-200 ${copied
              ? "bg-green-50 text-green-600 border-green-200"
              : "bg-muted/50 text-muted-foreground border-border hover:bg-primary/10 hover:text-primary hover:border-primary/20"
              }`}
          >
            {copied ? (
              <><Check className="h-3.5 w-3.5" /> تم النسخ!</>
            ) : (
              <><Share2 className="h-3.5 w-3.5" /> مشاركة</>
            )}
          </button>
        </div>
      </div>

      {/* Active Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          {t("filters.filteredBy") || "تم التصفية حسب:"}
        </span>
        {activeFilters.map((filter) => (
          <div
            key={filter.key}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm border border-primary/20"
          >
            <span className="font-medium">
              <span className="text-muted-foreground ml-1">{filter.label}:</span>
              {filter.value}
            </span>
            <button
              onClick={filter.removeHandler}
              className="ml-1 hover:bg-primary/20 rounded-full p-0.5 transition-colors"
              aria-label={t("common.delete") || "حذف"}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {activeFilters.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilters({
                search: undefined,
                category: undefined,
                subcategory: undefined,
                brand: undefined,
                color: undefined,
                size: undefined,
                minPrice: undefined,
                maxPrice: undefined,
                supplier: undefined,
                features: undefined,
                dynamicSpecs: undefined,
                processorBrand: undefined,
                processorSeries: undefined,
                processorGeneration: undefined,
                processorName: undefined,
                integratedGpu: undefined,
                dedicatedGraphicsName: undefined,
                hasDedicatedGraphics: undefined,
                screenSize: undefined,
                specialOffer: undefined,
              });
              if (window.location.pathname.includes('/products/')) {
                navigate('/products');
              }
            }}
            className="text-xs text-muted-foreground hover:text-red-500"
          >
            {t("filters.clearAll") || "إعادة تعيين"}
          </Button>
        )}
      </div>
    </div>
  );
}
