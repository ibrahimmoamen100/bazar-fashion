'use client';

import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useRouter } from "next/navigation";
import {
  Layers,
  ChevronLeft,
  Search,
  Home,
  Cpu,
} from "lucide-react";
import { builderService } from "@/lib/builderService";
import { BuilderPresetSummary } from "@/types/builder";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Input } from "@/components/ui/input";

export default function BuilderHubView() {
  const router = useRouter();

  const [summaries, setSummaries] = useState<BuilderPresetSummary[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; label: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [fetchedSummaries, fetchedCategories] = await Promise.all([
          builderService.getPresetSummaries(),
          builderService.getCategories(),
        ]);
        if (isMounted) {
          setSummaries(fetchedSummaries || []);
          if (fetchedCategories && fetchedCategories.length > 0) {
            setCategories(fetchedCategories);
          }
        }
      } catch (err) {
        console.warn("BuilderHubView: error fetching data", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filtered summaries based on category and search query
  const filteredSummaries = useMemo(() => {
    let list = summaries;

    if (selectedCategory !== 'all') {
      list = list.filter((p) => p.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((p) =>
        p.title.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.categoryLabel && p.categoryLabel.toLowerCase().includes(q)) ||
        (p.badge && p.badge.toLowerCase().includes(q))
      );
    }

    return list;
  }, [summaries, selectedCategory, searchQuery]);

  // Counts per category
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = { all: summaries.length };
    summaries.forEach((p) => {
      if (p.category) {
        map[p.category] = (map[p.category] || 0) + 1;
      }
    });
    return map;
  }, [summaries]);

  const handleCardClick = (preset: BuilderPresetSummary) => {
    const targetSlug = preset.slug || preset.id;
    router.push(`/builder/${targetSlug}`);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 text-gray-900 font-sans" dir="rtl">
      {/* ── Main Container ── */}
      <div className="container mx-auto px-4 pt-6 sm:pt-8 pb-4 max-w-6xl">
        {/* Breadcrumb */}
        <nav aria-label="breadcrumb" className="mb-6 flex items-center gap-1.5 text-sm bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm animate-fade-slide-in flex-wrap">
          <span className="font-extrabold text-primary bg-primary/5 border border-primary/20 px-3 py-1 rounded-xl text-xs sm:text-sm shadow-sm flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-primary" />
            <span>ابني تجميعتك</span>
          </span>
        </nav>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-gray-200/70">
          <div>
            <h1 className="text-xl sm:text-3xl font-black text-gray-900 tracking-tight">
              تجميعات مخصصة
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              اختر التجميعة المناسبة، وابدأ تخصيص كل قطعة حسب ميزانيتك واحتياجاتك.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="text"
              placeholder="بحث في التجميعات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pr-8 pl-3 bg-white rounded-xl border-gray-200 text-xs focus:ring-primary focus:border-primary shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* ── Category Filter Pills ── */}
        <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => {
            const count = categoryCounts[cat.id] || 0;
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 border ${
                  isSelected
                    ? "bg-primary text-white border-primary shadow-2xs"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Builds Grid ── */}
      <div className="container mx-auto px-4 max-w-6xl mt-4">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-3 h-72 space-y-2">
                <div className="h-40 bg-gray-200 rounded-xl w-full" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
                <div className="h-7 bg-gray-100 rounded-lg w-full mt-auto" />
              </div>
            ))}
          </div>
        ) : filteredSummaries.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200/80 p-8 text-center max-w-sm mx-auto shadow-2xs mt-8">
            <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-gray-800 mb-1">لا توجد نتائج</h3>
            <p className="text-xs text-gray-500 mb-4">
              {searchQuery
                ? `لم نجد نتائج مطابقة لـ "${searchQuery}"`
                : "لا توجد تجميعات متاحة في هذا القسم حالياً"}
            </p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="px-3.5 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition shadow-2xs"
            >
              عرض الكل
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
            {filteredSummaries.map((preset) => {
              return (
                <div
                  key={preset.id}
                  onClick={() => handleCardClick(preset)}
                  className="group relative bg-white rounded-xl sm:rounded-2xl border border-gray-200/80 hover:border-primary/50 shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between overflow-hidden cursor-pointer"
                >
                  {/* Image & Badges */}
                  <div className="relative h-28 sm:h-44 md:h-48 w-full overflow-hidden bg-gray-100">
                    <img
                      src={preset.showcaseImage}
                      alt={preset.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />

                    {/* Top Badges */}
                    <div className="absolute top-1.5 right-1.5 sm:top-2.5 sm:right-2.5 flex items-center gap-1 flex-wrap">
                      {preset.badge && (
                        <span className="bg-emerald-600 text-white text-[9px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded shadow-2xs">
                          {preset.badge}
                        </span>
                      )}
                      {preset.discountPercentage && preset.discountPercentage > 0 && (
                        <span className="bg-red-600 text-white text-[9px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded shadow-2xs">
                          -{preset.discountPercentage}%
                        </span>
                      )}
                    </div>

                    <div className="absolute top-1.5 left-1.5 sm:top-2.5 sm:left-2.5">
                      <span className="bg-black/60 backdrop-blur-xs text-white text-[8px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded line-clamp-1 max-w-[60px] sm:max-w-none">
                        {preset.categoryLabel}
                      </span>
                    </div>

                    {/* Bottom Image Stats */}
                    <div className="absolute bottom-1.5 right-1.5 left-1.5 sm:bottom-2.5 sm:right-2.5 sm:left-2.5 flex items-center justify-between text-[9px] sm:text-[11px] text-white/95 font-bold">
                      <span className="flex items-center gap-0.5 sm:gap-1 bg-black/40 backdrop-blur-xs px-1.5 sm:px-2 py-0.5 rounded">
                        <Layers className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary" />
                        <span>{preset.stepsCount} قطع</span>
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-2 sm:p-3.5 flex flex-col justify-between flex-1 gap-1.5 sm:gap-3">
                    <div>
                      <h3 className="text-[11px] sm:text-sm font-black text-gray-900 group-hover:text-primary transition-colors line-clamp-2">
                        {preset.title}
                      </h3>
                      {preset.description && (
                        <p className="text-[9px] sm:text-[11px] text-gray-400 line-clamp-1 mt-0.5 leading-relaxed hidden sm:block">
                          {preset.description}
                        </p>
                      )}
                    </div>

                    {/* Price & CTA Action */}
                    <div className="pt-1.5 sm:pt-2.5 border-t border-gray-100 flex items-center justify-between gap-1">
                      <div>
                        <span className="text-[8px] sm:text-[10px] text-gray-400 block font-medium hidden sm:block">
                          من:
                        </span>
                        <span className="text-[10px] sm:text-sm font-black text-primary">
                          {preset.estimatedPrice > 0
                            ? `${preset.estimatedPrice.toLocaleString()} ج`
                            : "حسب الاختيار"}
                        </span>
                      </div>

                      <div className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-gray-100 text-gray-700 font-bold text-[9px] sm:text-xs group-hover:bg-primary group-hover:text-white transition-all">
                        <span>تخصيص</span>
                        <ChevronLeft className="w-2.5 h-2.5 sm:w-3 sm:h-3 group-hover:-translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
