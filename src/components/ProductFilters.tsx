'use client';

import { useStore } from "@/store/useStore";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { useState, useMemo, useEffect } from "react";
import { formatCurrency } from "@/utils/format";
import { Filter, Product } from "@/types/product";
import { getSiteSettings } from "@/lib/siteSettings";
import {
  matchProduct,
  extractAvailableOptions,
  MANDATORY_SPEC_KEYS,
} from "@/utils/productFilter";

interface FilterSectionProps {
  title: string;
  sectionId: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function FilterSection({ title, sectionId, isOpen, onToggle, children }: FilterSectionProps) {
  return (
    <div className="border-b border-gray-200 py-3">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between py-2 text-right group transition-all"
      >
        <span
          className={`text-xs font-black tracking-wider uppercase transition-colors ${
            isOpen ? 'text-primary' : 'text-gray-500 group-hover:text-gray-900'
          }`}
        >
          {title}
        </span>
        <span
          className={`text-base font-bold select-none leading-none ${
            isOpen ? 'text-primary' : 'text-gray-400'
          }`}
        >
          {isOpen ? '−' : '＋'}
        </span>
      </button>

      {isOpen && (
        <div className="pt-1 pb-2 animate-in fade-in duration-200">
          {children}
        </div>
      )}
    </div>
  );
}

const getBrandLogo = (brandName: string) => {
  const name = brandName.trim().toLowerCase();

  if (name === 'hp') {
    return (
      <div className="flex flex-col items-center justify-center">
        <span className="w-7 h-7 rounded-full border border-[#0096D6] flex items-center justify-center text-[#0096D6] font-serif italic font-black text-xs">
          hp
        </span>
      </div>
    );
  }

  if (name === 'dell') {
    return (
      <div className="flex flex-col items-center justify-center">
        <span className="w-7 h-7 rounded-full border border-[#0076c0] flex items-center justify-center text-[#0076c0] font-sans font-black text-[8px] tracking-tighter">
          DELL
        </span>
      </div>
    );
  }

  if (name === 'lenovo') {
    return (
      <span className="text-gray-900 border border-gray-800 px-1 py-0.5 text-[8px] font-sans font-black tracking-tight uppercase">
        Lenovo
      </span>
    );
  }

  if (name === 'asus') {
    return (
      <span className="text-[#00539b] font-sans font-black text-[10px] italic tracking-widest">
        ASUS
      </span>
    );
  }

  if (name === 'acer') {
    return (
      <span className="text-[#83B81A] font-sans font-black text-xs lowercase tracking-tighter">
        acer
      </span>
    );
  }

  if (name === 'apple') {
    return <span className="text-gray-800 text-sm"></span>;
  }

  if (name === 'gigabyte') {
    return (
      <span className="text-[#005CB9] font-sans font-black text-[8px] uppercase tracking-tighter">
        GIGABYTE
      </span>
    );
  }

  if (name === 'xpg') {
    return (
      <span className="text-red-600 font-sans font-black text-[10px] uppercase tracking-tighter">
        XPG
      </span>
    );
  }

  return (
    <span className="text-gray-700 font-sans font-extrabold text-[9px] uppercase truncate px-1">
      {brandName}
    </span>
  );
};

export interface ProductFiltersProps {
  productsOverride?: Product[];
  hideCategoryFilter?: boolean;
  filtersOverride?: Filter;
  onFilterChangeOverride?: (filters: Filter) => void;
}

export function ProductFilters({
  productsOverride,
  hideCategoryFilter = false,
  filtersOverride,
  onFilterChangeOverride,
}: ProductFiltersProps = {}) {
  const storeFilters = useStore((state) => state.filters) || {};
  const storeSetFilters = useStore((state) => state.setFilters);
  const storeProducts = useStore((state) => state.products) || [];

  const filters = filtersOverride || storeFilters;
  const setFilters = onFilterChangeOverride || storeSetFilters;
  const products = productsOverride || storeProducts;
  const { t } = useTranslation();
  const navigate = useNavigate();

  // ── Base products for calculating available facets in the current category/scope ──
  const baseCategoryProducts = useMemo(() => {
    if (productsOverride && productsOverride.length > 0) {
      return productsOverride.filter(p => !p.isArchived);
    }
    let list = products.filter(p => !p.isArchived);
    if (filters.category && filters.category.length > 0 && !filters.category.includes('all')) {
      list = list.filter(p =>
        filters.category?.includes(p.category) ||
        (p.categorySlug ? filters.category?.includes(p.categorySlug) : false)
      );
    }
    return list;
  }, [products, productsOverride, filters.category]);

  const {
    subcategories,
    brands,
    processorBrands,
    processorGenerations,
    processorSeries,
    processorNames,
    integratedGpus,
    screenSizes,
    gpuNames,
    dynamicSpecsAvailable,
    hasFeaturesTouch,
    hasFeatures360,
    hasFeaturesDetach,
    hasAnyFeature,
  } = useMemo(() => extractAvailableOptions(baseCategoryProducts), [baseCategoryProducts]);

  const getSubcategoryLabel = () => {
    const activeCategory = filters.category?.[0];
    if (!activeCategory) return t("filters.subcategory");
    const match = baseCategoryProducts.find(p => p.categorySlug === activeCategory);
    const resolvedName = match ? match.category : activeCategory;
    if (!resolvedName) return t("filters.subcategory");
    return `نوع ${resolvedName}`;
  };

  // Map each filter key to the accordion section that controls it
  const filterToAccordion: Record<string, string> = {
    minPrice: "price",
    maxPrice: "price",
    category: "category",
    brand: "brand",
    subcategory: "subcategory",
    features: "features",
    screenSize: "screen-size",
    processorBrand: "processor-brand",
    processorSeries: "processor-series",
    processorGeneration: "processor-gen",
    dedicatedGraphicsName: "gpu",
    dedicatedGpuBrand: "gpu",
    dedicatedGpuModel: "gpu",
    hasDedicatedGraphics: "gpu",
    integratedGpu: "integrated-gpu",
    processorName: "processor-name",
    specialOffer: "special-offer",
  };

  const computeInitialOpenSections = (): string[] => {
    const fromFilters = Object.entries(filterToAccordion)
      .filter(([key]) => {
        const val = (filters as any)[key];
        if (val === undefined || val === null) return false;
        if (Array.isArray(val)) return val.length > 0;
        return true;
      })
      .map(([, section]) => section);
    return Array.from(new Set(fromFilters));
  };

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initialList = computeInitialOpenSections();
    const result: Record<string, boolean> = {};
    initialList.forEach(key => {
      result[key] = true;
    });
    const defaults = ["price", "sort", "subcategory", "brand", "features"];
    defaults.forEach(key => {
      result[key] = true;
    });
    return result;
  });

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  useEffect(() => {
    getSiteSettings(true).then((s) => {
      const defaults = s.defaultOpenFilters || ["price", "sort", "subcategory", "brand", "features"];
      setOpenSections(prev => {
        const next = { ...prev };
        defaults.forEach(key => {
          next[key] = true;
        });
        return next;
      });
    });
  }, []);

  useEffect(() => {
    const sectionsToOpen = Object.entries(filterToAccordion)
      .filter(([key]) => {
        const val = (filters as any)[key];
        if (val === undefined || val === null) return false;
        if (Array.isArray(val)) return val.length > 0;
        return true;
      })
      .map(([, section]) => section);

    if (sectionsToOpen.length > 0) {
      setOpenSections((prev) => {
        const next = { ...prev };
        sectionsToOpen.forEach(sec => {
          next[sec] = true;
        });
        return next;
      });
    }
  }, [filters]);

  const optionRow =
    "flex w-full items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 hover:border-border/60 hover:bg-muted/60 transition-colors cursor-pointer text-sm";
  const optionSelected = "border-primary/60 bg-primary/5 font-bold";

  // Helper to toggle array filters
  const toggleFilter = (key: keyof Filter, value: any) => {
    const currentValues = (filters[key] as any[]) || [];
    const isSelected = currentValues.includes(value);

    let newValues;
    if (isSelected) {
      newValues = currentValues.filter((v) => v !== value);
    } else {
      newValues = [...currentValues, value];
    }

    setFilters({
      ...filters,
      [key]: newValues.length > 0 ? newValues : undefined
    });
  };

  const toggleDynamicFilter = (specKey: string, value: string) => {
    const specs = { ...(filters.dynamicSpecs || {}) };
    const currentValues = specs[specKey] || [];
    const isSelected = currentValues.includes(value);

    let newValues;
    if (isSelected) {
      newValues = currentValues.filter((v) => v !== value);
    } else {
      newValues = [...currentValues, value];
    }

    if (newValues.length > 0) {
      specs[specKey] = newValues;
    } else {
      delete specs[specKey];
    }

    setFilters({
      ...filters,
      dynamicSpecs: Object.keys(specs).length > 0 ? specs : undefined
    });
  };

  // ── Facet Counts Calculation (Amazon Standard: exclude dimension being counted) ──
  const getFilteredProducts = (excludeKey?: string) => {
    return baseCategoryProducts.filter((product) => {
      return matchProduct(product, filters, undefined, excludeKey);
    });
  };

  const subcategoryCounts = useMemo(() => {
    const p = getFilteredProducts('subcategory');
    const counts: Record<string, number> = {};
    p.forEach(prod => {
      if (prod.subcategory) counts[prod.subcategory] = (counts[prod.subcategory] || 0) + 1;
    });
    return counts;
  }, [baseCategoryProducts, filters]);

  const brandCounts = useMemo(() => {
    const p = getFilteredProducts('brand');
    const counts: Record<string, number> = {};
    p.forEach(prod => {
      if (prod.brand) counts[prod.brand] = (counts[prod.brand] || 0) + 1;
    });
    return counts;
  }, [baseCategoryProducts, filters]);

  const processorBrandCounts = useMemo(() => {
    const p = getFilteredProducts('processorBrand');
    const counts: Record<string, number> = {};
    p.forEach(prod => {
      const v = prod.processor?.processorBrand;
      if (v) counts[v] = (counts[v] || 0) + 1;
    });
    return counts;
  }, [baseCategoryProducts, filters]);

  const processorGenCounts = useMemo(() => {
    const p = getFilteredProducts('processorGeneration');
    const counts: Record<string, number> = {};
    p.forEach(prod => {
      const v = prod.processor?.processorGeneration;
      if (v) counts[v] = (counts[v] || 0) + 1;
    });
    return counts;
  }, [baseCategoryProducts, filters]);

  const processorSeriesCounts = useMemo(() => {
    const p = getFilteredProducts('processorSeries');
    const counts: Record<string, number> = {};
    p.forEach(prod => {
      const v = prod.processor?.processorSeries;
      if (v) counts[v] = (counts[v] || 0) + 1;
    });
    return counts;
  }, [baseCategoryProducts, filters]);

  const integratedGpuCounts = useMemo(() => {
    const p = getFilteredProducts('integratedGpu');
    const counts: Record<string, number> = {};
    p.forEach(prod => {
      const v = prod.processor?.integratedGpu;
      if (v) counts[v] = (counts[v] || 0) + 1;
    });
    return counts;
  }, [baseCategoryProducts, filters]);

  const processorNameCounts = useMemo(() => {
    const p = getFilteredProducts('processorName');
    const counts: Record<string, number> = {};
    p.forEach(prod => {
      const v = prod.processor?.name;
      if (v) counts[v] = (counts[v] || 0) + 1;
    });
    return counts;
  }, [baseCategoryProducts, filters]);

  const screenSizeCounts = useMemo(() => {
    const p = getFilteredProducts('screenSize');
    const counts: Record<string, number> = {};
    p.forEach(prod => {
      const v = prod.display?.sizeInches;
      if (v !== undefined) counts[String(v)] = (counts[String(v)] || 0) + 1;
    });
    return counts;
  }, [baseCategoryProducts, filters]);

  const gpuNameCounts = useMemo(() => {
    const p = getFilteredProducts('dedicatedGraphicsName');
    const counts: Record<string, number> = {};
    p.forEach(prod => {
      const v = prod.dedicatedGraphics?.name;
      if (v) counts[v] = (counts[v] || 0) + 1;
    });
    return counts;
  }, [baseCategoryProducts, filters]);

  const featureCounts = useMemo(() => {
    const p = getFilteredProducts('features');
    const counts: Record<string, number> = { touch: 0, x360: 0, detachable: 0 };
    p.forEach(prod => {
      const termTouch = "touch";
      const termX360 = "x360";
      const prodFeatures = prod.features || [];

      if (
        prodFeatures.includes('touch') ||
        (prod.name || '').toLowerCase().includes(termTouch) ||
        (prod.description || '').toLowerCase().includes(termTouch) ||
        prod.display?.panelType?.toLowerCase().includes(termTouch) ||
        prod.display?.resolution?.toLowerCase().includes(termTouch)
      ) {
        counts['touch'] = (counts['touch'] || 0) + 1;
      }

      if (
        prodFeatures.includes('x360') ||
        (prod.name || '').toLowerCase().includes(termX360) ||
        (prod.description || '').toLowerCase().includes(termX360)
      ) {
        counts['x360'] = (counts['x360'] || 0) + 1;
      }

      if (
        prodFeatures.includes('detachable') ||
        (prod.name || '').toLowerCase().includes('detachable') ||
        (prod.description || '').toLowerCase().includes('detachable')
      ) {
        counts['detachable'] = (counts['detachable'] || 0) + 1;
      }
    });
    return counts;
  }, [baseCategoryProducts, filters]);

  const dynamicSpecCounts = useMemo(() => {
    const counts: Record<string, Record<string, number>> = {};
    const keys = Object.keys(dynamicSpecsAvailable);
    keys.forEach(specKey => {
      const p = getFilteredProducts(`dynamicSpecs:${specKey}`);
      counts[specKey] = {};
      p.forEach(prod => {
        if (prod.specifications) {
          prod.specifications.forEach(spec => {
            if (spec.inFilter && spec.key === specKey && spec.value) {
              counts[specKey][spec.value] = (counts[specKey][spec.value] || 0) + 1;
            }
          });
        }
      });
    });
    return counts;
  }, [baseCategoryProducts, filters, dynamicSpecsAvailable]);

  // Section visibility guards
  const hasScreenSizeData = screenSizes.length > 0;
  const hasProcessorBrand = processorBrands.length > 0;
  const hasProcessorSeries = processorSeries.length > 0;
  const hasProcessorGen = processorGenerations.length > 0;
  const hasProcessorName = processorNames.length > 0;
  const hasIntegratedGpu = integratedGpus.length > 0;
  const hasDedicatedGpuData = gpuNames.length > 0;
  const hasSubcategoryData = subcategories.length > 0;

  // Price Limits
  const prices = useMemo(() => baseCategoryProducts.map(p => p.price), [baseCategoryProducts]);
  const hasPrices = prices.length > 0;
  const minPriceLimit = hasPrices ? Math.min(...prices) : 0;
  const maxPriceLimit = hasPrices ? Math.max(...prices) : 0;
  const priceRange: [number, number] = [
    filters.minPrice ?? minPriceLimit,
    filters.maxPrice ?? maxPriceLimit,
  ];

  const renderCheckboxOption = (
    idPrefix: string,
    label: string,
    isSelected: boolean,
    count: number,
    onChange: () => void
  ) => {
    const isZero = count === 0 && !isSelected;
    return (
      <Label
        key={idPrefix}
        htmlFor={idPrefix}
        className={`${optionRow} space-x-reverse justify-between ${
          isSelected ? optionSelected : isZero ? 'opacity-40' : ''
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <Checkbox
            id={idPrefix}
            checked={isSelected}
            disabled={isZero}
            onCheckedChange={onChange}
            className="shrink-0"
          />
          <span className="truncate" title={label}>{label}</span>
        </div>
        <span className="text-xs text-muted-foreground shrink-0 tabular-nums">({count})</span>
      </Label>
    );
  };

  return (
    <div className="w-full space-y-4 text-right">
      {/* 0. Special Offers Filter */}
      <FilterSection
        title="✨ العروض الخاصة"
        sectionId="special-offer"
        isOpen={!!openSections["special-offer"]}
        onToggle={() => toggleSection("special-offer")}
      >
        <div className="space-y-1 pt-1">
          <div className={`${optionRow} justify-between bg-red-50 hover:bg-red-100 border-red-100`}>
            <Label htmlFor="special-offer-filter" className="cursor-pointer text-red-700 font-bold w-full h-full flex-1">
              فقط تخفيضات وعروض خاصة
            </Label>
            <Checkbox
              id="special-offer-filter"
              checked={!!filters.specialOffer}
              onCheckedChange={(checked) => setFilters({ ...filters, specialOffer: checked ? true : undefined })}
              className="border-red-300 text-red-600 focus:ring-red-500 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
            />
          </div>
        </div>
      </FilterSection>

      {/* 1. Price Range Filter */}
      <FilterSection
        title={t("filters.priceRange")}
        sectionId="price"
        isOpen={!!openSections["price"]}
        onToggle={() => toggleSection("price")}
      >
        <div className="space-y-4 pt-2 px-1">
          <div className="flex items-center justify-between font-medium">
            <span className="text-xs text-muted-foreground">
              {formatCurrency(priceRange[1], 'جنيه')}{" "}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatCurrency(priceRange[0], 'جنيه')}{" "}
            </span>
          </div>
          <Slider
            value={priceRange}
            min={minPriceLimit}
            max={maxPriceLimit}
            step={1}
            disabled={!hasPrices}
            onValueChange={(value) =>
              setFilters({
                ...filters,
                minPrice: value[0],
                maxPrice: value[1],
              })
            }
          />
        </div>
      </FilterSection>

      {/* 2. Sort Filter */}
      <FilterSection
        title={t("filters.sortBy")}
        sectionId="sort"
        isOpen={!!openSections["sort"]}
        onToggle={() => toggleSection("sort")}
      >
        <RadioGroup
          value={filters.sortBy || "default"}
          onValueChange={(value: any) =>
            setFilters({ ...filters, sortBy: value === "default" ? undefined : value })
          }
          className="space-y-1 pt-1"
        >
          {[
            { val: 'default', text: t("filters.default") || "الافتراضي (الأولوية)" },
            { val: 'price-asc', text: t("filters.priceAsc") || "السعر: من الأقل للأعلى" },
            { val: 'price-desc', text: t("filters.priceDesc") || "السعر: من الأعلى للأقل" },
            { val: 'name-asc', text: t("filters.nameAsc") || "الاسم: أ - ي" },
            { val: 'name-desc', text: t("filters.nameDesc") || "الاسم: ي - أ" }
          ].map(({ val, text }) => (
            <Label key={val} className={`${optionRow} ${filters.sortBy === val || (!filters.sortBy && val === 'default') ? optionSelected : ""}`}>
              <RadioGroupItem value={val} className="h-4 w-4" />
              <span>{text}</span>
            </Label>
          ))}
        </RadioGroup>
      </FilterSection>

      {/* 4. Subcategory Filter */}
      {hasSubcategoryData && (
        <FilterSection
          title={getSubcategoryLabel()}
          sectionId="subcategory"
          isOpen={!!openSections["subcategory"]}
          onToggle={() => toggleSection("subcategory")}
        >
          <div className="space-y-1 pt-1">
            {subcategories.map((subcategory) => {
              const isSelected = filters.subcategory?.includes(subcategory) || false;
              const count = subcategoryCounts[subcategory] || 0;
              return renderCheckboxOption(
                `subcat-${subcategory}`,
                subcategory,
                isSelected,
                count,
                () => toggleFilter('subcategory', subcategory)
              );
            })}
          </div>
        </FilterSection>
      )}

      {/* 5. Brand Filter (List Rows with logo + name + count) */}
      {brands.length > 0 && (
        <FilterSection
          title={t("filters.brand")}
          sectionId="brand"
          isOpen={!!openSections["brand"]}
          onToggle={() => toggleSection("brand")}
        >
          <div className="space-y-1 pt-1">
            {brands.map((brand) => {
              const isSelected = filters.brand?.includes(brand) || false;
              const count = brandCounts[brand] || 0;
              const isZero = count === 0 && !isSelected;

              return (
                <button
                  key={brand}
                  type="button"
                  disabled={isZero}
                  onClick={() => toggleFilter('brand', brand)}
                  className={`w-full flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5 transition-all text-sm text-right ${
                    isSelected
                      ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/20 font-bold'
                      : isZero
                      ? 'border-transparent opacity-40 cursor-not-allowed'
                      : 'border-transparent hover:border-border/60 hover:bg-muted/60'
                  }`}
                  title={brand}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="shrink-0 w-8 h-8 rounded border border-gray-100 bg-white flex items-center justify-center overflow-hidden">
                      {getBrandLogo(brand)}
                    </span>
                    <span className="font-semibold text-gray-800 text-xs truncate" title={brand}>
                      {brand}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                    ({count})
                  </span>
                </button>
              );
            })}
          </div>
        </FilterSection>
      )}

      {/* Special Features */}
      {hasAnyFeature && (
        <FilterSection
          title="مميزات خاصة"
          sectionId="features"
          isOpen={!!openSections["features"]}
          onToggle={() => toggleSection("features")}
        >
          <div className="space-y-1 pt-1">
            {hasFeaturesTouch &&
              renderCheckboxOption(
                'feat-touch',
                ' يدعم اللمس',
                filters.features?.includes('touch') || false,
                featureCounts['touch'] || 0,
                () => toggleFilter('features', 'touch')
              )}
            {hasFeatures360 &&
              renderCheckboxOption(
                'feat-x360',
                ' قابل للدوران ',
                filters.features?.includes('x360') || false,
                featureCounts['x360'] || 0,
                () => toggleFilter('features', 'x360')
              )}
            {hasFeaturesDetach &&
              renderCheckboxOption(
                'feat-detachable',
                ' قابل للفصل',
                filters.features?.includes('detachable') || false,
                featureCounts['detachable'] || 0,
                () => toggleFilter('features', 'detachable')
              )}
          </div>
        </FilterSection>
      )}

      {/* 6. Screen Size */}
      {hasScreenSizeData && (
        <FilterSection
          title={t("filters.screenSize") || "حجم الشاشة"}
          sectionId="screen-size"
          isOpen={!!openSections["screen-size"]}
          onToggle={() => toggleSection("screen-size")}
        >
          <div className="space-y-1 pt-1">
            {screenSizes.map((size) =>
              renderCheckboxOption(
                `screen-${size}`,
                size + '"',
                filters.screenSize?.includes(size) || false,
                screenSizeCounts[size] || 0,
                () => toggleFilter('screenSize', size)
              )
            )}
          </div>
        </FilterSection>
      )}

      {/* 7. Processor Brand */}
      {hasProcessorBrand && (
        <FilterSection
          title={t("filters.processorBrand") || "نوع المعالج"}
          sectionId="processor-brand"
          isOpen={!!openSections["processor-brand"]}
          onToggle={() => toggleSection("processor-brand")}
        >
          <div className="space-y-1 pt-1">
            {processorBrands.map((brand) =>
              renderCheckboxOption(
                `proc-brand-${brand}`,
                brand,
                filters.processorBrand?.includes(brand) || false,
                processorBrandCounts[brand] || 0,
                () => toggleFilter('processorBrand', brand)
              )
            )}
          </div>
        </FilterSection>
      )}

      {/* 8. Processor Series */}
      {hasProcessorSeries && (
        <FilterSection
          title="فئة المعالج"
          sectionId="processor-series"
          isOpen={!!openSections["processor-series"]}
          onToggle={() => toggleSection("processor-series")}
        >
          <div className="space-y-1 pt-1">
            {processorSeries.map((series) =>
              renderCheckboxOption(
                `proc-series-${series}`,
                series,
                filters.processorSeries?.includes(series) || false,
                processorSeriesCounts[series] || 0,
                () => toggleFilter('processorSeries', series)
              )
            )}
          </div>
        </FilterSection>
      )}

      {/* 9. Processor Generation */}
      {hasProcessorGen && (
        <FilterSection
          title="جيل المعالج"
          sectionId="processor-gen"
          isOpen={!!openSections["processor-gen"]}
          onToggle={() => toggleSection("processor-gen")}
        >
          <div className="space-y-1 pt-1">
            {processorGenerations.map((gen) =>
              renderCheckboxOption(
                `proc-gen-${gen}`,
                gen,
                filters.processorGeneration?.includes(gen) || false,
                processorGenCounts[gen] || 0,
                () => toggleFilter('processorGeneration', gen)
              )
            )}
          </div>
        </FilterSection>
      )}

      {/* 10. Dedicated GPU */}
      {hasDedicatedGpuData && (
        <FilterSection
          title={t("filters.dedicatedGraphics") || "كرت الشاشة المنفصل"}
          sectionId="gpu"
          isOpen={!!openSections["gpu"]}
          onToggle={() => toggleSection("gpu")}
        >
          <div className="space-y-1 pt-1">
            {gpuNames.map((name) =>
              renderCheckboxOption(
                `gpu-name-${name}`,
                name,
                filters.dedicatedGraphicsName?.includes(name) || false,
                gpuNameCounts[name] || 0,
                () => toggleFilter('dedicatedGraphicsName', name)
              )
            )}
            <div className={`${optionRow} justify-between mt-2`}>
              <Label htmlFor="has-gpu">{t("filters.onlyWithGPU") || "مع كرت شاشة منفصل فقط"}</Label>
              <Checkbox
                id="has-gpu"
                checked={!!filters.hasDedicatedGraphics}
                onCheckedChange={(checked) =>
                  setFilters({ ...filters, hasDedicatedGraphics: checked ? true : undefined })
                }
              />
            </div>
          </div>
        </FilterSection>
      )}

      {/* 11. Integrated GPU */}
      {hasIntegratedGpu && (
        <FilterSection
          title="كرت الشاشة المدمج"
          sectionId="integrated-gpu"
          isOpen={!!openSections["integrated-gpu"]}
          onToggle={() => toggleSection("integrated-gpu")}
        >
          <div className="space-y-1 pt-1">
            {integratedGpus.map((gpu) =>
              renderCheckboxOption(
                `int-gpu-${gpu}`,
                gpu,
                filters.integratedGpu?.includes(gpu) || false,
                integratedGpuCounts[gpu] || 0,
                () => toggleFilter('integratedGpu', gpu)
              )
            )}
          </div>
        </FilterSection>
      )}

      {/* 12. Processor Name */}
      {hasProcessorName && (
        <FilterSection
          title={t("filters.processor") || "موديل المعالج"}
          sectionId="processor-name"
          isOpen={!!openSections["processor-name"]}
          onToggle={() => toggleSection("processor-name")}
        >
          <div className="space-y-1 pt-1">
            {processorNames.map((name) =>
              renderCheckboxOption(
                `proc-name-${name}`,
                name,
                filters.processorName?.includes(name) || false,
                processorNameCounts[name] || 0,
                () => toggleFilter('processorName', name)
              )
            )}
          </div>
        </FilterSection>
      )}

      {/* 13. Dynamic Specifications */}
      {Object.entries(dynamicSpecsAvailable).map(([specKey, values]) => {
        if (!values || values.length === 0) return null;
        const sectionKey = `dyn-${specKey}`;
        return (
          <FilterSection
            key={sectionKey}
            title={specKey}
            sectionId={sectionKey}
            isOpen={!!openSections[sectionKey]}
            onToggle={() => toggleSection(sectionKey)}
          >
            <div className="space-y-1 pt-1">
              {values.map((val) => {
                const isSelected = filters.dynamicSpecs?.[specKey]?.includes(val) || false;
                const count = dynamicSpecCounts[specKey]?.[val] || 0;
                return renderCheckboxOption(
                  `dyn-${specKey}-${val}`,
                  val,
                  isSelected,
                  count,
                  () => toggleDynamicFilter(specKey, val)
                );
              })}
            </div>
          </FilterSection>
        );
      })}

      <Button
        variant="outline"
        className="w-full mt-4 text-xs font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
        onClick={() => {
          setFilters({
            search: undefined,
            sortBy: undefined,
            specialOffer: undefined,
            category: hideCategoryFilter ? filters.category : undefined,
            subcategory: undefined,
            brand: undefined,
            color: undefined,
            size: undefined,
            minPrice: undefined,
            maxPrice: undefined,
            supplier: undefined,
            processorName: undefined,
            processorBrand: undefined,
            processorGeneration: undefined,
            processorSeries: undefined,
            integratedGpu: undefined,
            dedicatedGraphicsName: undefined,
            dedicatedGpuBrand: undefined,
            dedicatedGpuModel: undefined,
            hasDedicatedGraphics: undefined,
            screenSize: undefined,
            features: undefined,
            dynamicSpecs: undefined,
          });
        }}
      >
        {t("filters.clearAll") || "إعادة تعيين الفلاتر"}
      </Button>
    </div>
  );
}
