'use client';

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, ExternalLink, TrendingUp, Zap, Star } from "lucide-react";
import { useCompareStore } from "@/store/useCompareStore";
import { Product } from "@/types/product";
import { formatCurrency } from "@/utils/format";
import { getProductUrl } from "@/utils/url";
import { Link } from "react-router-dom";
import { createPortal } from "react-dom";
import { useState, useEffect, useMemo } from "react";
import { getColorByName } from "@/constants/colors";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface CompareRow {
  category: string;
  icon: string;
  rows: { label: string; getValue: (p: Product) => string | null; highlight?: "max" | "min" | "bool" }[];
}

// ─── Static rows ──────────────────────────────────────────────────────────────
const STATIC_ROWS: CompareRow[] = [
  {
    category: "المعلومات الأساسية",
    icon: "📋",
    rows: [
      {
        label: "السعر",
        getValue: (p) => {
          const price =
            p.specialOffer && p.discountPrice ? p.discountPrice :
              p.specialOffer && p.discountPercentage ? p.price * (1 - p.discountPercentage / 100) :
                p.price;
          return formatCurrency(price, "جنيه");
        },
        highlight: "min",
      },
      { label: "الماركة", getValue: (p) => p.brand || null },
      { label: "الفئة الفرعية", getValue: (p) => p.subcategory || null },
      {
        label: "الحالة",
        getValue: (p) => {
          const qty = p.wholesaleInfo?.quantity || 0;
          return qty > 0 ? `متوفر (${qty} قطعة)` : "نفذت الكمية";
        },
        highlight: "max",
      },
      { label: "عرض خاص", getValue: (p) => (p.specialOffer ? "✅ نعم" : null) },
    ],
  },
  {
    category: "كرت الشاشة",
    icon: "🎮",
    rows: [
      {
        label: "كرت شاشة منفصل",
        getValue: (p) => p.dedicatedGraphics?.hasDedicatedGraphics ? "✅ نعم" : "❌ لا",
        highlight: "bool",
      },
    ],
  },
];

// ─── CPU series & generation ranking ───────────────────────────────────────────
function scoreCPU(value: string): number {
  let score = 0;
  const val = value.toLowerCase();

  // 1. Series/Brand Rank
  if (val.includes("i9") || val.includes("ultra 9") || val.includes("ryzen 9")) {
    score += 90;
  } else if (val.includes("i7") || val.includes("ultra 7") || val.includes("ryzen 7")) {
    score += 75;
  } else if (val.includes("i5") || val.includes("ultra 5") || val.includes("ryzen 5")) {
    score += 60;
  } else if (val.includes("i3") || val.includes("ryzen 3")) {
    score += 45;
  } else if (val.includes("pentium") || val.includes("gold") || val.includes("celeron") || val.includes("athlon")) {
    score += 20;
  } else if (val.includes("xeon")) {
    score += 80;
  } else {
    score += 35; // Default/Unknown
  }

  // 2. Generation Extraction
  let gen = 0;

  // Try extracting from model number (e.g. i7-1185G7, i5-10300H, i7-8550U, i7-13700H)
  const intelModelMatch = val.match(/i[3579]-?(\d{1,2})\d{2,3}/);
  if (intelModelMatch) {
    gen = parseInt(intelModelMatch[1]);
  } else {
    // Try AMD Ryzen model number (e.g. Ryzen 7 5800U, Ryzen 5 7520U)
    const amdModelMatch = val.match(/ryzen\s*[3579]\s*(\d)\d{3}/);
    if (amdModelMatch) {
      gen = parseInt(amdModelMatch[1]);
    }
  }

  // Try explicit generation text (e.g. "11th gen", "الجيل 11")
  if (gen === 0) {
    const explicitGenMatch = val.match(/(\d+)(?:th\s*gen|th\s*generation|th|\s*الجيل)/) || val.match(/(?:الجيل|\bgen\b)\s*(\d+)/);
    if (explicitGenMatch) {
      gen = parseInt(explicitGenMatch[1]);
    }
  }

  // Arabic words for generation
  if (gen === 0) {
    if (val.includes("الحادي عشر") || val.includes("11")) gen = 11;
    else if (val.includes("الثاني عشر") || val.includes("12")) gen = 12;
    else if (val.includes("الثالث عشر") || val.includes("13")) gen = 13;
    else if (val.includes("الرابع عشر") || val.includes("14")) gen = 14;
    else if (val.includes("العاشر") || val.includes("10")) gen = 10;
    else if (val.includes("التاسع") || val.includes("9")) gen = 9;
    else if (val.includes("الثامن") || val.includes("8")) gen = 8;
    else if (val.includes("السابع") || val.includes("7")) gen = 7;
    else if (val.includes("السادس") || val.includes("6")) gen = 6;
    else if (val.includes("الخامس") || val.includes("5")) gen = 5;
    else if (val.includes("الرابع") || val.includes("4")) gen = 4;
    else if (val.includes("الثالث") || val.includes("3")) gen = 3;
    else if (val.includes("الثاني") || val.includes("2")) gen = 2;
  }

  if (gen > 0) {
    score += gen * 4; // Generation points (e.g. Gen 11 adds 44, Gen 8 adds 32)
  }

  return score;
}

// ─── GPU tier score ───────────────────────────────────────────────────────────
const GPU_TIER_SCORE: [RegExp, number][] = [
  // NVIDIA Desktop
  [/rtx\s*4090/i, 100], [/rtx\s*4080/i, 92], [/rtx\s*4070\s*ti/i, 87],
  [/rtx\s*4070/i, 82], [/rtx\s*4060\s*ti/i, 75], [/rtx\s*4060/i, 68],
  [/rtx\s*4050/i, 60], [/rtx\s*3090/i, 90], [/rtx\s*3080\s*ti/i, 85],
  [/rtx\s*3080/i, 80], [/rtx\s*3070\s*ti/i, 74], [/rtx\s*3070/i, 70],
  [/rtx\s*3060\s*ti/i, 65], [/rtx\s*3060/i, 60], [/rtx\s*3050/i, 50],
  // AMD Desktop
  [/rx\s*7900\s*xtx/i, 97], [/rx\s*7900\s*xt/i, 90], [/rx\s*7800\s*xt/i, 80],
  [/rx\s*7700\s*xt/i, 72], [/rx\s*7600/i, 62], [/rx\s*6900\s*xt/i, 88],
  [/rx\s*6800\s*xt/i, 82], [/rx\s*6700\s*xt/i, 70], [/rx\s*6600\s*xt/i, 60],
  // NVIDIA Laptop
  [/rtx\s*4080\s*(laptop|mobile)/i, 78], [/rtx\s*4070\s*(laptop|mobile)/i, 70],
  [/rtx\s*4060\s*(laptop|mobile)/i, 63], [/rtx\s*4050\s*(laptop|mobile)/i, 55],
  [/rtx\s*3080\s*(laptop|mobile)/i, 72], [/rtx\s*3070\s*(laptop|mobile)/i, 65],
  [/rtx\s*3060\s*(laptop|mobile)/i, 57], [/rtx\s*3050\s*(laptop|mobile)/i, 47],
  // General
  [/mx\s*9[0-9]0/i, 30], [/mx\s*[0-9]{3}/i, 20],
  [/gtx\s*1660\s*ti/i, 45], [/gtx\s*1660\s*super/i, 43], [/gtx\s*1660/i, 40],
  [/gtx\s*1650\s*super/i, 35], [/gtx\s*1650/i, 30],
];

function scoreGPU(value: string): number {
  const val = value.toLowerCase();
  for (const [re, score] of GPU_TIER_SCORE) {
    if (re.test(val)) return score;
  }

  // Fallback to extract numerical series
  const numMatch = val.match(/rtx\s*(\d{4})/i) || val.match(/rx\s*(\d{4})/i);
  if (numMatch) {
    const num = parseInt(numMatch[1]);
    if (num >= 4090) return 100;
    if (num >= 4080) return 92;
    if (num >= 4070) return 82;
    if (num >= 4060) return 68;
    if (num >= 4050) return 60;
    if (num >= 3090) return 90;
    if (num >= 3080) return 80;
    if (num >= 3070) return 70;
    if (num >= 3060) return 60;
    if (num >= 3050) return 50;
  }

  // Integrated graphics
  if (val.includes("integrated") || val.includes("مدمج") || val.includes("intel uhd") || val.includes("iris xe") || val.includes("radeon")) {
    return 15;
  }

  return 20;
}

// ─── Spec key rules: should we score this spec, and higher=better or lower=better?
interface SpecRule {
  weight: number;            // importance weight
  higherIsBetter: boolean;   // true = larger number wins
  scorer?: (value: string) => number | null; // custom scorer
}

const SPEC_RULES: [RegExp, SpecRule][] = [
  // CPU
  [/^(المعالج|اسم المعالج|processor|cpu)$/i, {
    weight: 30, higherIsBetter: true,
    scorer: (v) => scoreCPU(v)
  }],
  [/^(فئة المعالج|سلسلة المعالج)$/i, {
    weight: 25, higherIsBetter: true,
    scorer: (v) => scoreCPU(v)
  }],
  [/^(الجيل|generation|gen)$/i, {
    weight: 20, higherIsBetter: true,
    scorer: (v) => {
      const explicitGen = scoreCPU(v) - 35; // Remove series base score to get gen influence
      if (explicitGen > 0) return explicitGen;
      const m = v.match(/(\d+)/);
      return m ? parseInt(m[1]) * 5 : null;
    }
  }],
  [/^(عدد الأنوية|cores|نوى)$/i, { weight: 15, higherIsBetter: true }],
  [/^(عدد المسارات|threads)$/i, { weight: 10, higherIsBetter: true }],
  [/^(التردد الأساسي|base.?clock|base.?freq)/i, { weight: 10, higherIsBetter: true }],
  [/^(أقصى تردد|boost.?clock|turbo)/i, { weight: 12, higherIsBetter: true }],
  [/^(الكاش|cache)$/i, { weight: 8, higherIsBetter: true }],
  // RAM
  [/^(الرامات|ram|memory|ذاكرة)$/i, { weight: 20, higherIsBetter: true }],
  [/^(سرعة الرامات|ram.?speed)$/i, { weight: 8, higherIsBetter: true }],
  // Storage
  [/^(التخزين|storage|هارد|ssd|nvme)$/i, {
    weight: 15, higherIsBetter: true,
    scorer: (v) => {
      const tb = v.match(/(\d+(?:\.\d+)?)\s*tb/i);
      if (tb) return parseFloat(tb[1]) * 1000;
      const gb = v.match(/(\d+)\s*gb/i);
      if (gb) return parseInt(gb[1]);
      const m = v.match(/(\d+)/);
      return m ? parseInt(m[1]) : null;
    }
  }],
  // GPU
  [/^(كرت الشاشة|gpu|vga|بطاقة الرسوميات)$/i, {
    weight: 25, higherIsBetter: true,
    scorer: (v) => scoreGPU(v)
  }],
  [/^(حجم vram|vram|ذاكرة كرت)$/i, { weight: 18, higherIsBetter: true }],
  // Display
  [/^(حجم الشاشة|screen.?size|display.?size)$/i, { weight: 8, higherIsBetter: true }],
  [/^(معدل التحديث|refresh.?rate|hz)$/i, { weight: 10, higherIsBetter: true }],
  // Weight – lower is better
  [/^(الوزن|weight)$/i, { weight: 5, higherIsBetter: false }],
  // Battery
  [/^(البطارية|battery)$/i, { weight: 8, higherIsBetter: true }],
];

function getSpecRule(key: string): SpecRule | null {
  for (const [re, rule] of SPEC_RULES) {
    if (re.test(key.trim())) return rule;
  }
  return null;
}

// ─── Extract numeric value from a string ──────────────────────────────────────
function extractNumber(val: string): number | null {
  if (!val) return null;
  // Handle TB → GB
  const tb = val.match(/(\d+(?:\.\d+)?)\s*tb/i);
  if (tb) return parseFloat(tb[1]) * 1000;
  const m = val.match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}

// ─── Compute a performance score [0–100] for each product ────────────────────
function computeProductScores(products: Product[]): number[] {
  // For each matched spec key, calculate scores per product
  const allSpecKeys = Array.from(
    new Set(products.flatMap(p => (p.specifications || []).map(s => s.key)))
  );

  // Per-key: [productIdx] → rawScore
  const keyScores: { rule: SpecRule; scores: (number | null)[] }[] = [];

  for (const key of allSpecKeys) {
    const rule = getSpecRule(key);
    if (!rule) continue;

    const rawScores: (number | null)[] = products.map(p => {
      // Find case-insensitive match
      const spec = (p.specifications || []).find(s => s.key?.trim().toLowerCase() === key.trim().toLowerCase());
      if (!spec?.value) return null;
      const val = spec.value.trim();
      if (rule.scorer) {
        const scored = rule.scorer(val);
        if (scored !== null) return scored;
      }
      return extractNumber(val);
    });

    // Need at least 2 products with values to compare
    const validCount = rawScores.filter(v => v !== null).length;
    if (validCount < 1) continue;

    keyScores.push({ rule, scores: rawScores });
  }

  if (keyScores.length === 0) return products.map(() => 0);

  // Normalize each key's scores to [0–1] then apply weight
  const totalWeight = keyScores.reduce((s, k) => s + k.rule.weight, 0);
  const weightedScores: number[] = products.map(() => 0);

  for (const { rule, scores } of keyScores) {
    const validVals = scores.filter(v => v !== null) as number[];
    if (validVals.length === 0) continue;
    const minVal = Math.min(...validVals);
    const maxVal = Math.max(...validVals);
    const range = maxVal - minVal;

    scores.forEach((val, idx) => {
      if (val === null) {
        // Missing spec → neutral (average) so we don't penalize unfairly
        weightedScores[idx] += 0.5 * rule.weight;
      } else {
        const normalized = range === 0 ? 1 : (val - minVal) / range;
        const directed = rule.higherIsBetter ? normalized : 1 - normalized;
        weightedScores[idx] += directed * rule.weight;
      }
    });
  }

  // Scale to 0–100
  const maxPossible = totalWeight;
  return weightedScores.map(s => Math.round((s / maxPossible) * 100));
}

// ─── Value-for-money verdict ──────────────────────────────────────────────────
interface ValueVerdict {
  performanceScores: number[];   // 0–100 per product
  valueScores: number[];         // performance per unit price (normalized)
  bestValueIdx: number;
  bestPerformanceIdx: number;
}

function computeValueVerdict(products: Product[]): ValueVerdict {
  const getPrice = (p: Product) =>
    p.specialOffer && p.discountPrice ? p.discountPrice :
      p.specialOffer && p.discountPercentage ? p.price * (1 - p.discountPercentage / 100) :
        p.price;

  const performanceScores = computeProductScores(products);
  const prices = products.map(getPrice);

  // Advanced Value formula: Performance / Price^0.7 to avoid overpenalizing premium specs
  const rawValues = performanceScores.map((perf, i) => {
    const price = prices[i];
    if (price <= 0) return 0;
    return perf / Math.pow(price, 0.7);
  });

  const maxRawValue = Math.max(...rawValues);
  const valueScores = rawValues.map(v =>
    maxRawValue === 0 ? 0 : Math.round((v / maxRawValue) * 100)
  );

  const bestValueIdx = valueScores.indexOf(Math.max(...valueScores));
  const bestPerformanceIdx = performanceScores.indexOf(Math.max(...performanceScores));

  return { performanceScores, valueScores, bestValueIdx, bestPerformanceIdx };
}

// ─── Dynamic rows from specs (ALL specs, not just inFilter) ──────────────────
function buildDynamicRows(products: Product[]): CompareRow[] {
  // Collect ALL unique spec keys, preserving order of first appearance
  const seenKeys = new Set<string>();
  const orderedKeys: string[] = [];

  for (const p of products) {
    for (const spec of (p.specifications || [])) {
      if (!spec.key || !spec.value || !spec.value.trim()) continue;
      const trimmedKey = spec.key.trim();
      const lowerKey = trimmedKey.toLowerCase();
      if (!seenKeys.has(lowerKey)) {
        seenKeys.add(lowerKey);
        orderedKeys.push(trimmedKey);
      }
    }
  }

  // Also collect unique customOptionGroups names across all products
  const optionGroupNames: string[] = [];
  const seenOptionGroups = new Set<string>();
  for (const p of products) {
    for (const group of (p.customOptionGroups || [])) {
      if (!group.name || group.name.trim() === "") continue;
      const trimmedName = group.name.trim();
      const lowerName = trimmedName.toLowerCase();
      if (!seenOptionGroups.has(lowerName)) {
        seenOptionGroups.add(lowerName);
        optionGroupNames.push(trimmedName);
      }
    }
  }

  const rows: { label: string; getValue: (p: Product) => string | null; highlight?: "max" | "min" | "bool" }[] = [];

  // 1. Dynamic specifications from products
  orderedKeys.forEach((key) => {
    const rule = getSpecRule(key);
    rows.push({
      label: key,
      getValue: (p: Product) => {
        const normKey = key.trim().toLowerCase();
        const spec = p.specifications?.find((s) => s.key?.trim().toLowerCase() === normKey);
        return spec?.value ? spec.value.trim() : null;
      },
      highlight: rule
        ? rule.higherIsBetter ? "max" : "min"
        : undefined,
    });
  });

  // 2. Custom option groups (like "حجم الرامات", "مساحة الهارد")
  optionGroupNames.forEach((name) => {
    rows.push({
      label: name,
      getValue: (p: Product) => {
        const normName = name.trim().toLowerCase();
        const group = p.customOptionGroups?.find((g) => g.name?.trim().toLowerCase() === normName);
        if (!group || !group.options || group.options.length === 0) return null;
        return group.options.map(o => o.label).join("، ");
      }
    });
  });

  // 3. Colors
  const hasColors = products.some(p => p.color && p.color.trim() !== "");
  if (hasColors) {
    rows.push({
      label: "الألوان المتاحة",
      getValue: (p: Product) => {
        if (!p.color || p.color.trim() === "") return null;
        return p.color.split(",").map(c => getColorByName(c.trim()).name).join("، ");
      }
    });
  }

  // 4. Sizes
  const hasSizes = products.some(p => p.sizes && p.sizes.length > 0);
  if (hasSizes) {
    rows.push({
      label: "الأحجام المتوفرة",
      getValue: (p: Product) => {
        if (!p.sizes || p.sizes.length === 0) return null;
        return p.sizes.map(s => s.label).join("، ");
      }
    });
  }

  // 5. Addons
  const hasAddons = products.some(p => p.addons && p.addons.length > 0);
  if (hasAddons) {
    rows.push({
      label: "الإضافات المتاحة",
      getValue: (p: Product) => {
        if (!p.addons || p.addons.length === 0) return null;
        return p.addons.map(a => `${a.label} (+${a.price_delta} ج.م)`).join("، ");
      }
    });
  }

  if (rows.length === 0) return [];

  return [
    {
      category: "المواصفات والخصائص",
      icon: "📊",
      rows,
    },
  ];
}

function buildFeaturesRow(products: Product[]): CompareRow[] {
  const allFeatures = new Set<string>();
  for (const p of products) {
    for (const f of p.features || []) allFeatures.add(f);
  }
  if (allFeatures.size === 0) return [];

  return [
    {
      category: "المميزات",
      icon: "✨",
      rows: Array.from(allFeatures).map((feat) => ({
        label: feat,
        getValue: (p: Product) => (p.features || []).includes(feat) ? "✅ نعم" : "❌ لا",
        highlight: "bool" as const,
      })),
    },
  ];
}

// ─── Build best-index map ─────────────────────────────────────────────────────
function buildBestMap(products: Product[], rows: CompareRow[]): Map<string, number[]> {
  const best = new Map<string, number[]>();

  for (const group of rows) {
    for (const row of group.rows) {
      if (!row.highlight || row.highlight === "bool") continue;

      const rawValues = products.map((p) => row.getValue(p));

      // Try custom scorer first (for CPU / GPU rows)
      const key = row.label;
      const rule = getSpecRule(key);

      let numericValues: (number | null)[];
      if (rule?.scorer) {
        numericValues = rawValues.map(v => v ? (rule.scorer!(v) ?? extractNumber(v)) : null);
      } else {
        numericValues = rawValues.map(v => (v ? extractNumber(v) : null));
      }

      const validVals = numericValues.filter(v => v !== null) as number[];
      if (validVals.length === 0) continue;

      const target = row.highlight === "max" ? Math.max(...validVals) : Math.min(...validVals);
      const bestIndices = numericValues
        .map((v, i) => (v === target ? i : -1))
        .filter(i => i >= 0);

      best.set(row.label, bestIndices);
    }
  }
  return best;
}

// ─── Cell ─────────────────────────────────────────────────────────────────────
function CompareCell({
  value, isBest, isHighlightBool, colIndex,
}: {
  value: string | null;
  isBest: boolean;
  isHighlightBool: boolean;
  colIndex: number;
}) {
  const isEmpty = !value || value === "—";
  const isNegativeBool = isHighlightBool && value?.includes("❌");
  const isPositiveBool = isHighlightBool && value?.includes("✅");

  return (
    <td
      className={`px-4 py-3 text-sm text-center align-middle transition-colors
        ${colIndex % 2 === 0 ? "bg-white" : "bg-slate-50/60"}
        ${isBest ? "compare-cell-best" : ""}
        ${isEmpty ? "text-gray-300" : "text-gray-700"}
        ${isNegativeBool ? "text-red-400" : ""}
        ${isPositiveBool ? "text-emerald-600 font-semibold" : ""}
      `}
    >
      <div className="flex items-center justify-center gap-1.5">
        {isBest && !isHighlightBool && !isEmpty && (
          <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        )}
        <span>{value || "—"}</span>
      </div>
    </td>
  );
}

// ─── Value-for-Money Banner ───────────────────────────────────────────────────
function ValueForMoneyBanner({
  products,
  verdict,
}: {
  products: Product[];
  verdict: ValueVerdict;
}) {
  if (products.length < 2) return null;

  const { performanceScores, valueScores, bestValueIdx, bestPerformanceIdx } = verdict;
  const allSame = performanceScores.every(s => s === performanceScores[0]);

  const getPrice = (p: Product) =>
    p.specialOffer && p.discountPrice ? p.discountPrice :
      p.specialOffer && p.discountPercentage ? p.price * (1 - p.discountPercentage / 100) :
        p.price;

  return (
    <div className="mx-4 md:mx-8 my-4 rounded-2xl overflow-hidden border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 shadow-sm">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500">
        <Zap className="w-4 h-4 text-white" />
        <span className="text-sm font-bold text-white">تحليل القيمة مقابل السعر الاحترافي</span>
      </div>

      <div className="p-4">
        {allSame ? (
          <p className="text-sm text-amber-700 text-center font-semibold">
            المنتجات متماثلة في الأداء — الأرخص هو الخيار الأفضل للقيمة
          </p>
        ) : (
          <div className="space-y-3">
            {/* Score bars */}
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${products.length}, 1fr)` }}>
              {products.map((p, i) => {
                const perf = performanceScores[i];
                const isTopPerf = i === bestPerformanceIdx;
                const isTopValue = i === bestValueIdx;
                const price = getPrice(p);
                return (
                  <div key={p.id} className={`rounded-xl p-3 border-2 transition-all ${isTopValue ? "border-emerald-400 bg-emerald-50" : "border-transparent bg-white/70"}`}>
                    <p className="text-[11px] font-bold text-gray-700 line-clamp-1 mb-2 text-center">{p.name}</p>

                    {/* Performance bar */}
                    <div className="mb-2">
                      <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                        <span>قوة الأداء العام</span>
                        <span className="font-bold">{perf}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${isTopPerf ? "bg-gradient-to-r from-blue-500 to-blue-600" : "bg-gradient-to-r from-gray-300 to-gray-400"}`}
                          style={{ width: `${perf}%` }}
                        />
                      </div>
                    </div>

                    {/* Value bar */}
                    <div className="mb-2">
                      <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                        <span>مؤشر القيمة مقابل السعر</span>
                        <span className="font-bold text-emerald-600">{valueScores[i]}</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${isTopValue ? "bg-gradient-to-r from-emerald-400 to-emerald-500" : "bg-gradient-to-r from-gray-200 to-gray-300"}`}
                          style={{ width: `${Math.min((valueScores[i] / Math.max(...valueScores)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>

                    <p className="text-[10px] text-center text-gray-500 font-semibold">
                      {formatCurrency(price, "جنيه")}
                    </p>

                    <div className="flex flex-wrap justify-center gap-1 mt-2">
                      {isTopPerf && (
                        <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5" /> الأقوى أداءً
                        </span>
                      )}
                      {isTopValue && (
                        <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                          <TrendingUp className="w-2.5 h-2.5" /> الأفضل قيمةً
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Verdict text */}
            {(() => {
              const bestVal = products[bestValueIdx];
              const bestPerf = products[bestPerformanceIdx];
              const sameWinner = bestValueIdx === bestPerformanceIdx;

              if (sameWinner) {
                return (
                  <div className="text-center text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl py-2 px-3">
                    🏆 <span className="line-clamp-1">{bestVal.name}</span> يكتسح المقارنة! هو الأفضل أداءً والأفضل قيمة مقابل السعر في آن واحد (صفقة مثالية).
                  </div>
                );
              }

              const perfBestVal = performanceScores[bestValueIdx];
              const perfTopPerf = performanceScores[bestPerformanceIdx];
              const priceBestVal = getPrice(bestVal);
              const priceTopPerf = getPrice(bestPerf);

              const perfDiff = perfTopPerf - perfBestVal;
              const priceDiff = priceTopPerf - priceBestVal;
              const priceDiffPct = priceBestVal > 0 ? Math.round((priceDiff / priceBestVal) * 100) : 0;
              const perfDiffPct = perfBestVal > 0 ? Math.round((perfDiff / perfBestVal) * 100) : 0;

              // If performance increase is greater or comparable to price increase ratio, recommend top performance
              const justifiesPrice = perfDiffPct >= priceDiffPct * 0.8;

              if (justifiesPrice) {
                return (
                  <div className="space-y-2">
                    <div className="text-center text-xs text-gray-650 bg-white/90 border border-amber-200 rounded-xl py-2.5 px-3">
                      💡 المنتج <span className="font-bold text-blue-700">{bestPerf.name}</span> يوفر زيادة أداء قدرها <span className="font-bold text-emerald-600">+{perfDiffPct}% (+{perfDiff} نقطة)</span> مقابل زيادة في السعر تبلغ <span className="font-bold text-amber-600">+{priceDiffPct}%</span> فقط.
                      <p className="mt-1 font-semibold text-emerald-700">
                        النتيجة: القفزة في الأداء ممتازة وتستحق الدفع الإضافي، لذا يُوصى بالمنتج الأقوى كقيمة ممتازة للاستثمار طويل الأجل.
                      </p>
                    </div>
                    <div className="text-center text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl py-2 px-3 font-bold">
                      💰 خيار الميزانية الاقتصادي: {bestVal.name} (يقدم أداءً جيداً بسعر أقل).
                    </div>
                  </div>
                );
              } else {
                return (
                  <div className="space-y-2">
                    <div className="text-center text-xs text-gray-655 bg-white/90 border border-red-100 rounded-xl py-2.5 px-3">
                      💡 المنتج <span className="font-bold text-blue-700">{bestPerf.name}</span> أقوى بـ <span className="font-bold text-blue-600">+{perfDiffPct}%</span> لكن سعره يرتفع بشكل مبالغ فيه بنسبة <span className="font-bold text-red-500">+{priceDiffPct}%</span>.
                      <p className="mt-1 font-semibold text-red-600">
                        النتيجة: فرق السعر كبير جداً ولا يبرر الزيادة الطفيفة في قوة الأداء.
                      </p>
                    </div>
                    <div className="text-center text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl py-2.5 px-3 font-bold">
                      🏆 الخيار الأذكى: يُنصح بشدة بـ {bestVal.name} كأفضل صفقة تمنحك أعلى قيمة حقيقية مقابل كل جنيه تدفعه.
                    </div>
                  </div>
                );
              }
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export function CompareModal() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { compareList, isCompareOpen, closeCompare, removeFromCompare } =
    useCompareStore();

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = isCompareOpen ? "hidden" : "";
      return () => { document.body.style.overflow = ""; };
    }
  }, [isCompareOpen]);

  const products = compareList;

  const dynamicRows = useMemo(() => buildDynamicRows(products), [products]);
  const featuresRows = useMemo(() => buildFeaturesRow(products), [products]);
  const allRowGroups = useMemo(
    () => [...STATIC_ROWS, ...dynamicRows, ...featuresRows],
    [dynamicRows, featuresRows]
  );
  const bestMap = useMemo(
    () => buildBestMap(products, allRowGroups),
    [products, allRowGroups]
  );
  const verdict = useMemo(() => computeValueVerdict(products), [products]);

  const getEffectivePrice = (p: Product) =>
    p.specialOffer && p.discountPrice ? p.discountPrice :
      p.specialOffer && p.discountPercentage ? p.price * (1 - p.discountPercentage / 100) :
        p.price;

  const cheapestPrice = products.length > 0 ? Math.min(...products.map(getEffectivePrice)) : 0;

  if (!mounted || !isCompareOpen || compareList.length < 2) return null;

  const modal = (
    <AnimatePresence>
      {isCompareOpen && (
        <>
          <motion.div
            key="compare-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm"
            onClick={closeCompare}
          />

          <motion.div
            key="compare-modal"
            initial={{ opacity: 0, y: 60, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="fixed inset-0 z-[9999] flex flex-col bg-white"
            dir="rtl"
          >
            {/* Header */}
            <div className="compare-modal-header flex items-center justify-between px-4 md:px-8 py-4 border-b border-gray-100 bg-white/95 backdrop-blur-sm shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-md">
                  <span className="text-white text-sm">⚖️</span>
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">مقارنة المنتجات</h2>
                  <p className="text-xs text-gray-400">
                    {products.length} منتجات — {products[0]?.category}
                  </p>
                </div>
              </div>
              <button
                onClick={closeCompare}
                className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-auto">
              {/* Value-for-money banner */}
              <ValueForMoneyBanner products={products} verdict={verdict} />

              <div className="min-w-[500px] md:min-w-[768px]">
                <table className="w-full border-collapse">
                  {/* Product header */}
                  <thead>
                    <tr>
                      <th className="compare-label-col bg-slate-50 border-b border-gray-100 w-28 md:w-40 sticky right-0 z-10" />
                      {products.map((product, idx) => {
                        const effectivePrice = getEffectivePrice(product);
                        const isCheapest = effectivePrice === cheapestPrice;
                        const isBestValue = idx === verdict.bestValueIdx;
                        const isBestPerf = idx === verdict.bestPerformanceIdx;
                        return (
                          <th
                            key={product.id}
                            className={`px-3 py-4 md:py-5 text-center border-b min-w-[140px] md:min-w-[180px] transition-colors
                              ${isBestValue ? "border-emerald-200 bg-emerald-50/40" : idx % 2 === 0 ? "border-gray-100 bg-white" : "border-gray-100 bg-slate-50/60"}`}
                          >
                            <div className="flex flex-col items-center gap-1.5 md:gap-2">
                              <button
                                onClick={() => removeFromCompare(product.id)}
                                className="self-end text-gray-350 hover:text-red-500 transition-colors"
                                title="إزالة من المقارنة"
                              >
                                <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
                              </button>

                              <div className="w-16 h-16 md:w-24 md:h-24 rounded-xl md:rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden">
                                <img
                                  src={product.images?.[0] || "/placeholder.svg"}
                                  alt={product.name}
                                  className="w-full h-full object-contain p-1.5 md:p-2 mix-blend-multiply"
                                  loading="lazy"
                                />
                              </div>

                              <p className="text-[10px] md:text-xs font-bold text-gray-800 leading-snug text-center line-clamp-2 max-w-[120px] md:max-w-[160px]">
                                {product.name}
                              </p>

                              <div className="flex items-center gap-1">
                                {isCheapest && products.length > 1 && (
                                  <Trophy className="w-3 h-3 md:w-3.5 md:h-3.5 text-amber-500" />
                                )}
                                <span className={`text-xs md:text-sm font-black ${isCheapest && products.length > 1 ? "text-emerald-600" : "text-blue-600"}`}>
                                  {formatCurrency(effectivePrice, "جنيه")}
                                </span>
                              </div>

                              {product.specialOffer && product.discountPrice && (
                                <span className="text-[9px] md:text-[10px] text-gray-400 line-through">
                                  {formatCurrency(product.price, "جنيه")}
                                </span>
                              )}

                              <div className="flex gap-1 flex-wrap justify-center">
                                {isBestValue && (
                                  <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">
                                    💰 الأفضل قيمةً
                                  </span>
                                )}
                                {isBestPerf && (
                                  <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">
                                    ⚡ الأقوى أداءً
                                  </span>
                                )}
                              </div>

                              <Link
                                to={getProductUrl(product.id, product.name, product.category, product.subcategory)}
                                onClick={closeCompare}
                                className="flex items-center gap-1 text-[9px] md:text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 md:px-3 md:py-1.5 rounded-lg transition-colors"
                              >
                                <ExternalLink className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                عرض المنتج
                              </Link>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>

                  {/* Spec rows */}
                  <tbody>
                    {allRowGroups.map((group) => {
                      const visibleRows = group.rows.filter((row) =>
                        products.some((p) => row.getValue(p) !== null)
                      );
                      if (visibleRows.length === 0) return null;

                      return (
                        <React.Fragment key={`section-${group.category}`}>
                          <tr className="compare-section-header">
                            <td
                              colSpan={products.length + 1}
                              className="px-4 md:px-8 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gradient-to-r from-slate-100 to-slate-50 border-y border-slate-200 sticky right-0"
                            >
                              <span className="mr-1">{group.icon}</span>{" "}{group.category}
                            </td>
                          </tr>

                          {visibleRows.map((row) => {
                            const bestIndices = bestMap.get(row.label) || [];
                            return (
                              <tr key={row.label} className="hover:bg-blue-50/20 transition-colors group">
                                <td className="compare-label-col sticky right-0 bg-white group-hover:bg-blue-50/20 px-3 md:px-5 py-2.5 text-xs font-semibold text-gray-600 border-b border-gray-50 z-10 whitespace-nowrap">
                                  {row.label}
                                </td>
                                {products.map((product, idx) => (
                                  <CompareCell
                                    key={product.id}
                                    value={row.getValue(product)}
                                    isBest={bestIndices.includes(idx)}
                                    isHighlightBool={row.highlight === "bool"}
                                    colIndex={idx}
                                  />
                                ))}
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>

                <div className="h-16" />
              </div>
            </div>

            {/* Footer legend */}
            <div className="compare-modal-footer border-t border-gray-100 bg-slate-50/80 backdrop-blur-sm px-4 md:px-8 py-3 flex items-center gap-6 text-xs text-gray-500 shrink-0 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span>الأفضل في الخاصية</span>
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                <span>الأفضل قيمة مقابل السعر</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-blue-500" />
                <span>الأقوى أداءً</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-300 font-bold">—</span>
                <span>غير متوفر</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(modal, document.body);
}
