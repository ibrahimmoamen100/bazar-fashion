'use client';

import { useState, useEffect, useMemo, useCallback } from "react";
import { specProfilesService, SpecProfile } from "@/lib/firebase";
import { toast } from "sonner";
import { useStore } from "@/store/useStore";
import { getCategorySlugFromName } from "@/utils/category";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  PlusCircle,
  X,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  LayoutTemplate,
  GripVertical,
} from "lucide-react";


export interface SpecRow {
  id: string;
  key: string;
  value: string;
  inFilter: boolean;
  filterSlug?: string;
  isDropdown?: boolean;
  categoryImage?: string;
}

interface SpecificationsEditorProps {
  category: string;
  specifications: SpecRow[];
  onChange: (specs: SpecRow[]) => void;
  features?: string[];
  onFeaturesChange?: (features: string[]) => void;
}

// ────────────────────────────────────────────────────────────────
// Profile definitions
// ────────────────────────────────────────────────────────────────

type SpecTemplate = { key: string; placeholder: string };
type SectionTemplate = { title: string; icon: string; specs: SpecTemplate[] };

const LAPTOP_PROFILE: SectionTemplate[] = [
  {
    title: "المعالج (Processor)",
    icon: "cpu",
    specs: [
      { key: "المعالج", placeholder: "مثال: Intel Core i7-13700H" },
      { key: "فئة المعالج", placeholder: "مثال: Intel Core i7" },
      { key: "الجيل", placeholder: "مثال: الجيل الثالث عشر" },
      { key: "عدد الأنوية", placeholder: "مثال: 14 نواة" },
      { key: "عدد المسارات", placeholder: "مثال: 20 مسار" },
      { key: "التردد الأساسي", placeholder: "مثال: 2.4 GHz" },
      { key: "أقصى تردد", placeholder: "مثال: 5.0 GHz" },
      { key: "الكاش", placeholder: "مثال: 24 MB" },
      { key: "الكرت المدمج", placeholder: "مثال: Intel UHD Graphics 770" },
    ],
  },
  {
    title: "الذاكرة والتخزين",
    icon: "package",
    specs: [
      { key: "الرامات", placeholder: "مثال: 16 GB DDR5" },
      { key: "سرعة الرامات", placeholder: "مثال: 4800 MHz" },
      { key: "التخزين", placeholder: "مثال: 512 GB NVMe SSD" },
      { key: "فتحة توسعة", placeholder: "مثال: فتحة M.2 إضافية" },
    ],
  },
  {
    title: "الشاشة (Display)",
    icon: "monitor",
    specs: [
      { key: "حجم الشاشة", placeholder: "مثال: 15.6 بوصة" },
      { key: "دقة الشاشة", placeholder: "مثال: 1920×1080 FHD" },
      { key: "معدل التحديث", placeholder: "مثال: 144 Hz" },
      { key: "نوع الشاشة", placeholder: "مثال: IPS Anti-Glare" },
      { key: "سطوع الشاشة", placeholder: "مثال: 300 nits" },
    ],
  },
  {
    title: "كرت الشاشة (GPU)",
    icon: "zap",
    specs: [
      { key: "كرت الشاشة", placeholder: "مثال: NVIDIA RTX 4060" },
      { key: "حجم VRAM", placeholder: "مثال: 8 GB" },
      { key: "نوع VRAM", placeholder: "مثال: GDDR6" },
    ],
  },
  {
    title: "المواصفات العامة",
    icon: "package",
    specs: [
      { key: "البطارية", placeholder: "مثال: 72 Wh" },
      { key: "نظام التشغيل", placeholder: "مثال: Windows 11 Home" },
      { key: "الوزن", placeholder: "مثال: 1.9 كجم" },
      { key: "لوحة المفاتيح", placeholder: "مثال: Backlit Arabic/English" },
      { key: "المنافذ", placeholder: "مثال: 2× USB-A، 1× USB-C، HDMI، SD" },
      { key: "الواي فاي", placeholder: "مثال: Wi-Fi 6E (802.11ax)" },
      { key: "البلوتوث", placeholder: "مثال: Bluetooth 5.2" },
    ],
  },
];

const DESKTOP_PROFILE: SectionTemplate[] = [
  {
    title: "المعالج (Processor)",
    icon: "cpu",
    specs: [
      { key: "المعالج", placeholder: "مثال: Intel Core i9-13900K" },
      { key: "فئة المعالج", placeholder: "مثال: Intel Core i9" },
      { key: "الجيل", placeholder: "مثال: الجيل الثالث عشر" },
      { key: "عدد الأنوية", placeholder: "مثال: 24 نواة" },
      { key: "عدد المسارات", placeholder: "مثال: 32 مسار" },
      { key: "التردد الأساسي", placeholder: "مثال: 3.0 GHz" },
      { key: "أقصى تردد", placeholder: "مثال: 5.8 GHz" },
      { key: "الكاش", placeholder: "مثال: 36 MB" },
      { key: "الكرت المدمج", placeholder: "مثال: Intel UHD Graphics 770" },
    ],
  },
  {
    title: "كرت الشاشة (GPU)",
    icon: "zap",
    specs: [
      { key: "كرت الشاشة", placeholder: "مثال: NVIDIA RTX 4090" },
      { key: "حجم VRAM", placeholder: "مثال: 24 GB" },
      { key: "نوع VRAM", placeholder: "مثال: GDDR6X" },
    ],
  },
  {
    title: "الذاكرة والتخزين",
    icon: "package",
    specs: [
      { key: "الرامات", placeholder: "مثال: 32 GB DDR5" },
      { key: "سرعة الرامات", placeholder: "مثال: 6000 MHz" },
      { key: "أماكن الرامات", placeholder: "مثال: 4 أماكن" },
      { key: "أنواع التخزين", placeholder: "مثال: 512GB SSD + 1TB HDD" },
      { key: "أماكن التخزين", placeholder: "مثال: 2 مكان M.2 + 2 مكان SATA" },
    ],
  },
  {
    title: "اللوحة الأم والطاقة",
    icon: "cpu",
    specs: [
      { key: "اللوحة الأم", placeholder: "مثال: ASUS ROG STRIX Z790-F" },
      { key: "مصدر الطاقة", placeholder: "مثال: 850W 80+ Gold" },
      { key: "الكيس", placeholder: "مثال: NZXT H510" },
    ],
  },
  {
    title: "المواصفات العامة",
    icon: "package",
    specs: [
      { key: "نظام التشغيل", placeholder: "مثال: Windows 11 Pro" },
      { key: "المنافذ الأمامية", placeholder: "مثال: 2× USB-A، 1× USB-C" },
      { key: "المنافذ الخلفية", placeholder: "مثال: 2× USB 3.2، HDMI، DP" },
    ],
  },
];

const MONITOR_PROFILE: SectionTemplate[] = [
  {
    title: "الشاشة (Display)",
    icon: "monitor",
    specs: [
      { key: "حجم الشاشة", placeholder: "مثال: 27 بوصة" },
      { key: "دقة الشاشة", placeholder: "مثال: 2560×1440 QHD" },
      { key: "معدل التحديث", placeholder: "مثال: 165 Hz" },
      { key: "زمن الاستجابة", placeholder: "مثال: 1 ms GTG" },
      { key: "نوع اللوح", placeholder: "مثال: IPS" },
      { key: "السطوع", placeholder: "مثال: 400 nits" },
      { key: "نسبة التباين", placeholder: "مثال: 1000:1" },
      { key: "تغطية sRGB", placeholder: "مثال: 99% sRGB" },
    ],
  },
  {
    title: "المنافذ والتوصيلات",
    icon: "zap",
    specs: [
      { key: "DisplayPort", placeholder: "مثال: 1× DisplayPort 1.4" },
      { key: "HDMI", placeholder: "مثال: 2× HDMI 2.1" },
      { key: "USB Hub", placeholder: "مثال: 4× USB 3.0" },
      { key: "مقبس الصوت", placeholder: "مثال: 3.5mm" },
    ],
  },
  {
    title: "المواصفات العامة",
    icon: "package",
    specs: [
      { key: "تقنية Sync", placeholder: "مثال: G-Sync Compatible / FreeSync Premium" },
      { key: "HDR", placeholder: "مثال: HDR10" },
      { key: "الحامل", placeholder: "مثال: قابل للتعديل في الارتفاع والإمالة" },
      { key: "VESA", placeholder: "مثال: 100×100 mm" },
      { key: "استهلاك الطاقة", placeholder: "مثال: 40W" },
    ],
  },
];

const ACCESSORIES_PROFILE: SectionTemplate[] = [
  {
    title: "المواصفات الأساسية",
    icon: "keyboard",
    specs: [
      { key: "النوع", placeholder: "مثال: لاسلكي / سلكي" },
      { key: "التوصيل", placeholder: "مثال: USB / Bluetooth / 2.4GHz" },
      { key: "المدى", placeholder: "مثال: 10 متر" },
    ],
  },
  {
    title: "مواصفات إضافية",
    icon: "package",
    specs: [
      { key: "البطارية", placeholder: "مثال: AA × 2 أو مدمجة 1500 mAh" },
      { key: "التوافق", placeholder: "مثال: Windows / macOS / Android" },
      { key: "الأبعاد", placeholder: "مثال: 44 × 15 × 3 سم" },
      { key: "الوزن", placeholder: "مثال: 250 جرام" },
      { key: "ضمان", placeholder: "مثال: سنة" },
    ],
  },
];

const PROFILES: Record<string, SectionTemplate[]> = {
  laptop: LAPTOP_PROFILE,
  desktop: DESKTOP_PROFILE,
  monitor: MONITOR_PROFILE,
  accessories: ACCESSORIES_PROFILE,
};

const PROFILE_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  laptop: { label: "لابتوب", emoji: "💻", color: "bg-blue-50 border-blue-200 text-blue-700" },
  desktop: { label: "كيس استيراد", emoji: "🖥️", color: "bg-purple-50 border-purple-200 text-purple-700" },
  monitor: { label: "شاشة", emoji: "🖵", color: "bg-green-50 border-green-200 text-green-700" },
  accessories: { label: "إكسسوار", emoji: "⌨️", color: "bg-orange-50 border-orange-200 text-orange-700" },
};



// ────────────────────────────────────────────────────────────────
// Single spec row
// ────────────────────────────────────────────────────────────────
function SpecRowItem({
  spec,
  keyPlaceholder = "اسم الخاصية",
  valuePlaceholder = "القيمة",
  keyReadOnly = false,
  isMandatory = false,
  options = [],
  onUpdate,
  onRemove,
  draggable = false,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  isDragging = false,
}: {
  spec: SpecRow;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  keyReadOnly?: boolean;
  isMandatory?: boolean;
  options?: string[];
  onUpdate: (field: "key" | "value" | "inFilter" | "filterSlug" | "isDropdown" | "categoryImage", val: string | boolean | undefined) => void;
  onRemove: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onDrop?: (e: React.DragEvent) => void;
  isDragging?: boolean;
}) {
  const [showSlug, setShowSlug] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = e.target.value.trim();
    if (!val) return;

    const isNumber = /^[\d.,]+$/.test(val);
    if (isNumber) {
      const suffixes: Record<string, string> = {
        "التردد الأساسي": "GHz",
        "أقصى تردد": "GHz",
        "الكاش": "MB",
        "سرعة الرامات": "MHz",
        "معدل التحديث": "Hz",
        "سطوع الشاشة": "nits",
        "حجم VRAM": "GB",
        "زمن الاستجابة": "ms",
        "حجم الشاشة": "بوصة",
        "المدى": "متر",
        "الرامات": "GB",
        "استهلاك الطاقة": "W",
        "عمر البطارية": "ساعات",
        "الوزن": "كجم",
      };

      const suffix = suffixes[spec.key];
      if (suffix) {
        onUpdate("value", `${val} ${suffix}`);
      }
    }
  };

  return (
    <div
      draggable={draggable && !isMandatory && !isInputFocused}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDrop={onDrop}
      className={`flex flex-col gap-2 bg-background rounded-lg border p-3 shadow-sm mb-2 transition-all duration-200 ${isDragging
        ? "border-amber-400 bg-amber-50/20 opacity-60 scale-[0.99] shadow-inner"
        : "border-gray-200 hover:border-gray-300 hover:shadow-md"
        }`}
    >
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center w-full">
        {draggable && !isMandatory && (
          <div
            className="cursor-grab active:cursor-grabbing p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-colors shrink-0 hidden sm:flex items-center justify-center"
            title="اسحب لإعادة الترتيب"
          >
            <GripVertical className="h-4 w-4" />
          </div>
        )}

        {keyReadOnly ? (
          <div className="w-full sm:w-40 shrink-0">
            <span className="text-sm font-bold text-muted-foreground px-1">{spec.key}</span>
          </div>
        ) : (
          <Input
            className="w-full sm:w-40 shrink-0 text-sm font-semibold"
            placeholder={keyPlaceholder}
            value={spec.key}
            onChange={(e) => onUpdate("key", e.target.value)}
            onFocus={() => setIsInputFocused(true)}
            onBlur={(e) => {
              setIsInputFocused(false);
              handleBlur(e);
            }}
          />
        )}

        <div className="flex-1 w-full bg-white relative rounded-md border border-input focus-within:ring-1 focus-within:ring-ring focus-within:border-ring transition-shadow flex items-center pr-2">
          {spec.isDropdown ? (
            <select
              className="flex-1 h-9 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-0 px-2 py-1 cursor-pointer"
              value={spec.value}
              onChange={(e) => onUpdate("value", e.target.value)}
              onFocus={() => setIsInputFocused(true)}
              onBlur={(e) => {
                setIsInputFocused(false);
                handleBlur(e);
              }}
            >
              <option value="" disabled hidden>اختر من القائمة المسبقة...</option>
              {options.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              className="flex-1 h-9 bg-transparent border-0 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-0 px-2 py-1 outline-none font-medium"
              placeholder={valuePlaceholder}
              value={spec.value}
              onFocus={() => setIsInputFocused(true)}
              onBlur={(e) => {
                setIsInputFocused(false);
                handleBlur(e);
              }}
              onChange={(e) => onUpdate("value", e.target.value)}
              list={options.length > 0 ? `datalist-${spec.id}` : undefined}
            />
          )}

          {options.length > 0 && !spec.isDropdown && (
            <datalist id={`datalist-${spec.id}`}>
              {options.map(opt => <option key={opt} value={opt} />)}
            </datalist>
          )}

          {options.length > 0 && (
            <div className="flex items-center gap-1.5 border-r border-gray-100 pr-2 my-1 mr-1">
              <Switch
                id={`dropdown-${spec.id}`}
                checked={spec.isDropdown || false}
                onCheckedChange={(v) => onUpdate("isDropdown", v)}
                className="scale-75 data-[state=checked]:bg-amber-500"
              />
              <Label htmlFor={`dropdown-${spec.id}`} className="text-[10px] text-muted-foreground cursor-pointer whitespace-nowrap hidden sm:block">
                تصفح الخيارات
              </Label>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0 mr-auto sm:ml-0 mt-2 sm:mt-0 w-full sm:w-auto justify-end">
          <div
            className={`flex items-center gap-1.5 h-9 px-2 rounded-md border transition-colors ${isMandatory
              ? "bg-blue-100/70 border-blue-300 cursor-not-allowed"
              : "bg-blue-50/50 border-blue-100 cursor-pointer hover:bg-blue-100/50"
              }`}
            title={isMandatory ? "التصفية مفعّلة دائماً لهذه الخاصية الأساسية" : undefined}
          >
            <Switch
              id={`filter-${spec.id}`}
              checked={isMandatory ? true : spec.inFilter}
              onCheckedChange={(v) => { if (!isMandatory) onUpdate("inFilter", v); }}
              disabled={isMandatory}
              className="data-[state=checked]:bg-blue-600 scale-90 disabled:opacity-100"
            />
            <Label
              htmlFor={`filter-${spec.id}`}
              className={`text-xs font-bold whitespace-nowrap ${isMandatory ? "text-blue-700 cursor-not-allowed" : "text-blue-900/70 cursor-pointer"
                }`}
            >
              تصفية
              {isMandatory && <span className="mr-1 text-[9px] bg-blue-200 text-blue-700 px-1 rounded font-semibold">مثبّت</span>}
            </Label>
          </div>

          <button
            type="button"
            onClick={() => setShowSlug(!showSlug)}
            className={`flex items-center gap-1 h-9 px-2.5 rounded-md border text-xs font-bold transition-all ${showSlug
              ? "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
              : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
              }`}
            title="تعديل الاسم البرمجي (Slug)"
          >
            <span>Slug</span>
            {showSlug ? (
              <ChevronUp className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 shrink-0" />
            )}
          </button>

          {!isMandatory && (
            <button
              type="button"
              onClick={onRemove}
              className="p-1.5 rounded-md text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors bg-gray-50 border border-gray-100"
              title="حذف المواصفة"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {spec.key && showSlug && (
        <div className="flex flex-col gap-1.5 mt-1.5 pt-2 border-t border-dashed border-gray-200 animate-in fade-in slide-in-from-top-1 bg-muted/20 p-2.5 rounded-md">
          {spec.key === "الفئة" && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full mb-2">
              <Label className="text-xs font-semibold text-gray-500 w-full sm:w-40 shrink-0">رابط صورة الفئة (Image URL)</Label>
              <div className="flex-1 w-full max-w-sm flex flex-col gap-1.5">
                <Input
                  className="h-8 text-xs w-full bg-white border-gray-200 focus-visible:ring-blue-500 transition-all font-semibold"
                  placeholder="https://example.com/image.png"
                  dir="ltr"
                  value={spec.categoryImage || ""}
                  onChange={(e) => onUpdate("categoryImage", e.target.value)}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
                />
                {spec.categoryImage && (
                  <div className="relative w-16 h-16 rounded border overflow-hidden mt-1 bg-gray-50 flex items-center justify-center">
                    <img
                      src={spec.categoryImage}
                      alt="Category Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://placehold.co/100x100?text=Error';
                      }}
                    />
                  </div>
                )}
              </div>
              <p className="text-[10px] text-gray-400 hidden lg:block">رابط الصورة المخصصة لعرضها لهذه الفئة في المتجر</p>
            </div>
          )}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full">
            <Label className="text-xs font-semibold text-gray-500 w-full sm:w-40 shrink-0">الاسم البرمجي (Slug)</Label>
            <div className="flex-1 w-full max-w-sm flex items-center relative group">
              <span className="absolute left-3 text-[11px] text-gray-400 font-mono select-none pointer-events-none font-bold group-focus-within:text-blue-500 transition-colors">
                slug:
              </span>
              <Input
                className="h-8 text-xs font-mono w-full bg-white pl-[45px] text-left border-gray-200 focus-visible:ring-blue-500 transition-all font-semibold text-blue-800"
                placeholder="e.g. screen-size"
                dir="ltr"
                value={spec.filterSlug || ""}
                onChange={(e) => {
                  const val = e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                  onUpdate("filterSlug", val);
                }}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
              />
            </div>
            <p className="text-[10px] text-gray-400 hidden lg:block">الاسم البرمجي الفريد لهذه الخاصية للـ SEO</p>
          </div>
          {spec.filterSlug && (
            <div className="flex items-center gap-2 text-[10px] text-gray-500 mr-auto sm:mr-[172px] font-mono select-none bg-white px-2 py-1 rounded border border-gray-100 shadow-sm animate-in fade-in w-fit" dir="ltr">
              <span className="text-gray-400">SEO Link:</span>
              <span className="text-blue-600 font-semibold">?{spec.filterSlug}=</span>
              <span className="text-green-600 font-bold bg-green-50 px-1 rounded">{spec.value || "value"}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Common Specifications Slug Mapping
// ────────────────────────────────────────────────────────────────
const COMMON_SPEC_SLUGS: Record<string, string> = {
  "المعالج": "processor",
  "فئة المعالج": "processor-series",
  "الجيل": "generation",
  "عدد الأنوية": "cores",
  "عدد المسارات": "threads",
  "التردد الأساسي": "base-clock",
  "أقصى تردد": "boost-clock",
  "الكاش": "cache",
  "الكرت المدمج": "integrated-gpu",
  "الرامات": "ram",
  "سرعة الرامات": "ram-speed",
  "التخزين": "storage",
  "فتحة توسعة": "expansion-slot",
  "حجم الشاشة": "screen-size",
  "دقة الشاشة": "resolution",
  "معدل التحديث": "refresh-rate",
  "نوع الشاشة": "panel-type",
  "سطوع الشاشة": "brightness",
  "كرت الشاشة": "gpu",
  "حجم VRAM": "vram",
  "نوع VRAM": "vram-type",
  "البطارية": "battery",
  "نظام التشغيل": "os",
  "الوزن": "weight",
  "لوحة المفاتيح": "keyboard",
  "المنافذ": "ports",
  "الواي فاي": "wifi",
  "البلوتوث": "bluetooth",
  "اللوحة الأم": "motherboard",
  "مصدر الطاقة": "power-supply",
  "الكيس": "case",
  "زمن الاستجابة": "response-time",
  "النوع": "type",
  "التوصيل": "connection",
};

const getAutoSlug = (key: string, slugMap: Record<string, string> = {}): string => {
  if (!key) return "";
  const trimmedKey = key.trim();

  if (slugMap[trimmedKey]) return slugMap[trimmedKey];
  if (COMMON_SPEC_SLUGS[trimmedKey]) return COMMON_SPEC_SLUGS[trimmedKey];

  return trimmedKey
    .toLowerCase()
    .replace(/[^\w\s\u0600-\u06FF-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
};

// ────────────────────────────────────────────────────────────────
// Global Filter State Key
// ────────────────────────────────────────────────────────────────
const GLOBAL_FILTER_STORAGE_KEY = "bazar_default_filters";
const DEFAULT_GLOBAL_FILTERS = [
  "فئة المعالج",
  "الجيل",
  "الكرت المدمج",
  "حجم الشاشة",
  "كرت الشاشة",
  "حجم VRAM",
  "الكيس",
];

// ────────────────────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────────────────────
export function SpecificationsEditor({
  category,
  specifications,
  onChange,
  features = [],
  onFeaturesChange,
}: SpecificationsEditorProps) {
  const [outerOpen, setOuterOpen] = useState(true);

  const [customProfiles, setCustomProfiles] = useState<SpecProfile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [newProfileName, setNewProfileName] = useState("");
  const [showSaveProfileInline, setShowSaveProfileInline] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<SpecProfile | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [activeCustomProfile, setActiveCustomProfile] = useState<SpecProfile | null>(null);

  const loadProfiles = useCallback(async () => {
    setProfilesLoading(true);
    try {
      const profiles = await specProfilesService.getAllProfiles();
      setCustomProfiles(profiles);
    } catch (error: any) {
      console.error("Error loading spec profiles:", error);
      toast.error(`❌ خطأ أثناء تحميل البروفايلات: ${error?.message || error}`);
      setCustomProfiles([]);
    } finally {
      setProfilesLoading(false);
    }
  }, []);

  useEffect(() => { loadProfiles(); }, [loadProfiles]);

  const autoProfileKey =
    Object.keys(PROFILES).find((k) => category?.toLowerCase().includes(k)) ?? null;

  const [manualProfileKey, setManualProfileKey] = useState<string | null>(null);
  const [showProfilePicker, setShowProfilePicker] = useState(false);

  const profileKey = manualProfileKey ?? autoProfileKey;
  const profile = profileKey ? PROFILES[profileKey] : null;

  const products = useStore((state) => state.products) || [];
  const { slugMap, optionsMap } = useMemo(() => {
    const sMap: Record<string, string> = {};
    const oMap: Record<string, Set<string>> = {};

    products.forEach(p => {
      if (p.specifications) {
        p.specifications.forEach(spec => {
          if (spec.key && spec.value) {
            if (!oMap[spec.key]) oMap[spec.key] = new Set();
            if (spec.value.trim() !== '') oMap[spec.key].add(spec.value.trim());
          }
          if (spec.inFilter && spec.key && spec.filterSlug) {
            sMap[spec.key] = spec.filterSlug;
          }
        });
      }
    });

    const formattedOMap: Record<string, string[]> = {};
    for (const k in oMap) {
      formattedOMap[k] = Array.from(oMap[k]).sort();
    }
    return { slugMap: sMap, optionsMap: formattedOMap };
  }, [products]);

  // Maps category SPEC VALUES (e.g. "لابتوب جيمنج") → their filterSlug
  // Built from existing products so switching profiles auto-fills the correct slug
  const categoryValueSlugMap = useMemo(() => {
    const map: Record<string, string> = {};
    products.forEach((p) => {
      if (p.specifications) {
        const catSpec = p.specifications.find((s) => s.key === "الفئة");
        if (catSpec?.value?.trim() && catSpec?.filterSlug) {
          map[catSpec.value.trim()] = catSpec.filterSlug;
        }
      }
    });
    return map;
  }, [products]);

  // Maps subcategory SPEC VALUES → their filterSlug
  // Built from existing products so switching profiles auto-fills the correct slug
  const subcategoryValueSlugMap = useMemo(() => {
    const map: Record<string, string> = {};
    products.forEach((p) => {
      if (p.specifications) {
        const subcatSpec = p.specifications.find((s) => s.key === "الفئة الفرعية");
        if (subcatSpec?.value?.trim() && subcatSpec?.filterSlug) {
          map[subcatSpec.value.trim()] = subcatSpec.filterSlug;
        }
      }
    });
    return map;
  }, [products]);

  // Mandatory Categories options & brands computed dynamically
  const uniqueBrands = useMemo(() => {
    const brands = products.map((product) => product.brand).filter(Boolean);
    return [...new Set(brands)].sort();
  }, [products]);

  const allCategories = useMemo(() => {
    const categories = products.map((product) => product.category).filter(Boolean);
    const uniqueCategories = [...new Set(categories)].sort();
    const fixedValues = ["desktop", "laptop", "storage", "monitor", "network", "accessories", "other"];
    const displayNames: Record<string, string> = {
      desktop: "كمبيوتر مكتبي (Desktop)",
      laptop: "لابتوب (Laptop)",
      storage: "وحدات تخزين (Storage)",
      monitor: "شاشات (Monitor)",
      network: "أجهزة شبكات (Network)",
      accessories: "إكسسوارات وملحقات (Accessories)",
      other: "أخرى (Other)"
    };

    // Union display names and raw custom category strings
    const mapped = uniqueCategories.map(c => displayNames[c] || c);
    fixedValues.forEach(v => {
      const label = displayNames[v];
      if (!mapped.includes(label)) mapped.push(label);
    });
    return mapped.sort();
  }, [products]);

  const knownSpecsConfig = useMemo(() => {
    const config: Record<string, { filterSlug: string; inFilter: boolean }> = {};

    // 1. Scan built-in/common spec slugs
    for (const key in COMMON_SPEC_SLUGS) {
      config[key] = {
        filterSlug: COMMON_SPEC_SLUGS[key],
        inFilter: DEFAULT_GLOBAL_FILTERS.includes(key),
      };
    }

    // 2. Scan custom profiles fields
    customProfiles.forEach((profile) => {
      profile.fields.forEach((f) => {
        if (f.key) {
          config[f.key] = {
            filterSlug: f.filterSlug || config[f.key]?.filterSlug || "",
            inFilter: f.inFilter || config[f.key]?.inFilter || false,
          };
        }
      });
    });

    // 3. Scan all products' specifications
    products.forEach((p) => {
      if (p.specifications) {
        p.specifications.forEach((spec) => {
          if (spec.key) {
            config[spec.key] = {
              filterSlug: spec.filterSlug || config[spec.key]?.filterSlug || "",
              inFilter: spec.inFilter || config[spec.key]?.inFilter || false,
            };
          }
        });
      }
    });

    return config;
  }, [products, customProfiles]);

  const getUniqueSubcategories = (catLabel: string) => {
    const displayNamesRev: Record<string, string> = {
      "كمبيوتر مكتبي (Desktop)": "desktop",
      "لابتوب (Laptop)": "laptop",
      "وحدات تخزين (Storage)": "storage",
      "شاشات (Monitor)": "monitor",
      "أجهزة شبكات (Network)": "network",
      "إكسسوارات وملحقات (Accessories)": "accessories",
      "أخرى (Other)": "other"
    };
    const catValue = displayNamesRev[catLabel] || catLabel;

    const subs = products
      .filter((product) => product.category === catValue)
      .map((product) => product.subcategory)
      .filter(Boolean) as string[];
    return [...new Set(subs)].sort();
  };

  const [globalFilterKeys, setGlobalFilterKeys] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(GLOBAL_FILTER_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (!parsed.includes("الكيس") && !localStorage.getItem("bazar_filters_case_added")) {
          parsed.push("الكيس");
          localStorage.setItem("bazar_filters_case_added", "true");
        }
        return parsed;
      }
    } catch (e) { }
    return DEFAULT_GLOBAL_FILTERS;
  });

  const updateGlobalFilterKeys = (newKeys: string[]) => {
    setGlobalFilterKeys(newKeys);
    localStorage.setItem(GLOBAL_FILTER_STORAGE_KEY, JSON.stringify(newKeys));
  };

  // Enforce mandatory keys "الفئة", "الفئة الفرعية", "العلامة التجارية"
  const mandatoryKeys: string[] = [];

  useEffect(() => {
    let updated = [...specifications];
    let changed = false;

    mandatoryKeys.forEach((key) => {
      const exists = updated.some((s) => s.key === key);
      if (!exists) {
        let defaultSlug = "category";
        if (key === "الفئة الفرعية") defaultSlug = "subcategory";
        if (key === "العلامة التجارية") defaultSlug = "brand";

        updated.unshift({
          id: crypto.randomUUID(),
          key,
          value: "",
          inFilter: true,
          filterSlug: defaultSlug,
        });
        changed = true;
      }
    });

    if (changed) {
      onChange(updated);
    }
  }, [specifications, onChange]);

  const addManualSpec = () => {
    const newSpec: SpecRow = {
      id: crypto.randomUUID(),
      key: "",
      value: "",
      inFilter: false,
      filterSlug: "",
    };
    onChange([...specifications, newSpec]);
  };

  const applyProfile = (key?: string) => {
    const pk = key ?? profileKey;
    if (!pk) return;
    const prof = PROFILES[pk];
    const profileSpecs: SpecRow[] = prof.flatMap((section) =>
      section.specs.map((s) => ({
        id: crypto.randomUUID(),
        key: s.key,
        value: "",
        inFilter: globalFilterKeys.includes(s.key),
        filterSlug: getAutoSlug(s.key, slugMap),
        isDropdown: false
      }))
    );
    const existingKeys = specifications.filter((s) => s.value.trim()).map((s) => s.key);
    const newKeys = profileSpecs.filter((s) => !existingKeys.includes(s.key));
    onChange([...specifications.filter((s) => s.value.trim() || mandatoryKeys.includes(s.key)), ...newKeys]);
  };

  const saveCustomProfile = async () => {
    // Profile display name = what the user typed
    const resolvedName = newProfileName.trim();
    if (!resolvedName) {
      toast.error("لا يمكن حفظ البروفايل: يرجى كتابة اسم للبروفايل");
      return;
    }

    // Capture the actual "الفئة" spec value separately (may differ from profile name)
    const categorySpec = specifications.find((s) => s.key === "الفئة");
    const categoryImage = categorySpec?.categoryImage?.trim() || undefined;
    const categoryValue = categorySpec?.value?.trim() || undefined; // e.g. "إكسسوارات"

    // Capture the actual "الفئة الفرعية" spec value and slug separately
    const subcategorySpec = specifications.find((s) => s.key === "الفئة الفرعية");
    const subcategoryValue = subcategorySpec?.value?.trim() || ""; 
    const subcategorySlug = subcategorySpec?.filterSlug?.trim() || undefined;

    const validSpecs = specifications.filter((s) => s.key && s.key.trim() !== "" && !mandatoryKeys.includes(s.key));
    if (validSpecs.length === 0) {
      toast.error("لا توجد مواصفات إضافية صالحة لحفظها في البروفايل");
      return;
    }

    const fields = validSpecs.map((s) => ({
      key: s.key.trim(),
      filterSlug: s.filterSlug || getAutoSlug(s.key.trim(), slugMap),
      inFilter: s.inFilter,
      isDropdown: s.isDropdown || false,
    }));
    try {
      // Pass categoryValue and subcategory parameters so the profile knows what to restore
      await specProfilesService.saveProfile(
        resolvedName, 
        fields, 
        categoryImage, 
        categoryValue, 
        subcategoryValue, 
        subcategorySlug
      );
      toast.success(`✅ تم حفظ البروفايل "${resolvedName}" في Firebase بنجاح`);
      setNewProfileName("");
      setShowSaveProfileInline(false);
      await loadProfiles();
    } catch (error: any) {
      console.error("Error saving spec profile:", error);
      toast.error(`❌ فشل حفظ البروفايل: ${error?.message || error}`);
    }
  };

  const applyCustomProfile = (profile: SpecProfile) => {
    const newSpecs: SpecRow[] = profile.fields.map((item) => ({
      id: crypto.randomUUID(),
      key: item.key,
      value: "",
      inFilter: item.inFilter,
      filterSlug: item.filterSlug,
      isDropdown: item.isDropdown,
    }));

    // The actual category value to write into the "الفئة" field:
    // - New profiles store categoryValue separately from the display name
    // - Old profiles (without categoryValue) fall back to profile.name for backward compat
    const targetCategoryValue = profile.categoryValue || profile.name;
    
    // Subcategory value to write into the "الفئة الفرعية" field:
    // - If subcategoryValue is explicitly stored (even if empty string), we apply it
    // - If it's undefined (older profiles), we don't overwrite the current subcategory value (set it to null so we skip updating)
    const targetSubcategoryValue = profile.subcategoryValue !== undefined ? profile.subcategoryValue : null;

    const existingSpecs = specifications
      .filter((s) => s.value.trim() || mandatoryKeys.includes(s.key))
      .map((s) => {
        if (s.key === "الفئة") {
          // Look up slug by the real category VALUE (not the profile display name)
          const resolvedSlug =
            categoryValueSlugMap[targetCategoryValue] ||
            s.filterSlug ||
            "category";
          return {
            ...s,
            value: targetCategoryValue,
            filterSlug: resolvedSlug,
            categoryImage: profile.categoryImage || s.categoryImage,
          };
        }
        if (s.key === "الفئة الفرعية" && targetSubcategoryValue !== null) {
          const resolvedSlug =
            profile.subcategorySlug ||
            subcategoryValueSlugMap[targetSubcategoryValue] ||
            s.filterSlug ||
            "subcategory";
          return {
            ...s,
            value: targetSubcategoryValue,
            filterSlug: resolvedSlug,
          };
        }
        return s;
      });
    const existingKeys = existingSpecs.map((s) => s.key);
    const toAdd = newSpecs.filter((s) => !existingKeys.includes(s.key));
    onChange([...existingSpecs, ...toAdd]);
    setActiveCustomProfile(profile); // track which custom profile is active
    setShowProfilePicker(false);
    toast.success(`✅ تم تطبيق البروفايل "${profile.name}"`);
  };

  // Update (overwrite) the currently active custom profile with current specs
  const updateCustomProfile = async () => {
    if (!activeCustomProfile) return;

    const categorySpec = specifications.find((s) => s.key === "الفئة");
    const categoryImage = categorySpec?.categoryImage?.trim() || undefined;
    const categoryValue = categorySpec?.value?.trim() || undefined;

    const subcategorySpec = specifications.find((s) => s.key === "الفئة الفرعية");
    const subcategoryValue = subcategorySpec?.value?.trim() || "";
    const subcategorySlug = subcategorySpec?.filterSlug?.trim() || undefined;

    const validSpecs = specifications.filter((s) => s.key && s.key.trim() !== "" && !mandatoryKeys.includes(s.key));
    if (validSpecs.length === 0) {
      toast.error("لا توجد مواصفات إضافية صالحة للتحديث");
      return;
    }

    const fields = validSpecs.map((s) => ({
      key: s.key.trim(),
      filterSlug: s.filterSlug || getAutoSlug(s.key.trim(), slugMap),
      inFilter: s.inFilter,
      isDropdown: s.isDropdown || false,
    }));

    try {
      // saveProfile with same name → same id → setDoc overwrites the existing document
      const updated = await specProfilesService.saveProfile(
        activeCustomProfile.name, 
        fields, 
        categoryImage, 
        categoryValue,
        subcategoryValue,
        subcategorySlug
      );
      setActiveCustomProfile(updated);
      toast.success(`✅ تم تحديث البروفايل "${activeCustomProfile.name}" بنجاح`);
      await loadProfiles();
    } catch (error: any) {
      console.error("Error updating spec profile:", error);
      toast.error(`❌ فشل تحديث البروفايل: ${error?.message || error}`);
    }
  };
  const deleteCustomProfile = async (profile: SpecProfile) => {
    try {
      await specProfilesService.deleteProfile(profile.id);
      toast.success(`تم حذف البروفايل "${profile.name}"`);
      await loadProfiles();
    } catch (error: any) {
      console.error("Error deleting spec profile:", error);
      toast.error(`❌ فشل حذف البروفايل: ${error?.message || error}`);
    }
  };

  const clearAll = () => {
    const mandatory = specifications.filter((s) => mandatoryKeys.includes(s.key));
    onChange(mandatory);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    // Retrieve otherSpecs array and drag within it
    const otherSpecs = specifications.filter((s) => !mandatoryKeys.includes(s.key));
    const mandatorySpecs = specifications.filter((s) => mandatoryKeys.includes(s.key));

    const reordered = [...otherSpecs];
    const draggedItem = reordered[draggedIndex];
    reordered.splice(draggedIndex, 1);
    reordered.splice(index, 0, draggedItem);

    setDraggedIndex(index);
    onChange([...mandatorySpecs, ...reordered]);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const updateSpec = (id: string, field: keyof Omit<SpecRow, 'id'>, val: string | boolean | undefined) => {
    const specToUpdate = specifications.find((s) => s.id === id);
    if (!specToUpdate) return;

    let autoSlug = specToUpdate.filterSlug;
    let autoInFilter = specToUpdate.inFilter;

    if (field === "key" && typeof val === "string") {
      const trimmedKey = val.trim();
      const known = knownSpecsConfig[trimmedKey];
      if (known) {
        autoSlug = known.filterSlug;
        autoInFilter = known.inFilter;
      } else {
        autoSlug = getAutoSlug(val, slugMap);
        autoInFilter = globalFilterKeys.includes(trimmedKey) || mandatoryKeys.includes(trimmedKey);
      }
    } else if (!autoSlug && specToUpdate.key) {
      autoSlug = getAutoSlug(specToUpdate.key, slugMap);
    }

    if (field === "inFilter" || (field === "key" && typeof val === "string")) {
      const activeInFilter = field === "inFilter" ? (val as boolean) : autoInFilter;
      const targetKey = field === "key" ? (val as string).trim() : specToUpdate.key;

      if (!mandatoryKeys.includes(targetKey)) {
        let newGlobals = [...globalFilterKeys];
        if (activeInFilter && !newGlobals.includes(targetKey)) {
          newGlobals.push(targetKey);
        } else if (!activeInFilter) {
          newGlobals = newGlobals.filter((k) => k !== targetKey);
        }
        updateGlobalFilterKeys(newGlobals);
      }
    }

    onChange(specifications.map((s) => {
      if (s.id !== id) return s;
      if (field === "key" && typeof val === "string") {
        return {
          ...s,
          key: val,
          filterSlug: autoSlug,
          inFilter: autoInFilter,
        };
      }
      return {
        ...s,
        [field]: val,
        filterSlug: field === 'filterSlug' ? (val as string) : autoSlug
      };
    }));
  };

  const removeSpec = (id: string) => {
    onChange(specifications.filter((s) => s.id !== id));
  };

  const handleProfileSpecChange = (
    sectionKey: string,
    field: "key" | "value" | "inFilter" | "filterSlug" | "isDropdown" | "categoryImage",
    value: string | boolean | undefined
  ) => {
    const existing = specifications.find((s) => s.key === sectionKey);
    if (existing) {
      updateSpec(existing.id, field as any, value);
    } else {
      let defaultSlug = getAutoSlug(sectionKey, slugMap);
      if (sectionKey === "الفئة") defaultSlug = "category";
      if (sectionKey === "الفئة الفرعية") defaultSlug = "subcategory";
      if (sectionKey === "العلامة التجارية") defaultSlug = "brand";

      const defaultInFilter = globalFilterKeys.includes(sectionKey) || mandatoryKeys.includes(sectionKey);

      const newSpec: SpecRow = {
        id: crypto.randomUUID(),
        key: sectionKey,
        value: "",
        inFilter: defaultInFilter,
        filterSlug: defaultSlug,
        isDropdown: false,
      };

      if (field === "inFilter") {
        newSpec.inFilter = value as boolean;
        if (!mandatoryKeys.includes(sectionKey)) {
          let newGlobals = [...globalFilterKeys];
          if (value === true && !newGlobals.includes(sectionKey)) {
            newGlobals.push(sectionKey);
          } else if (value === false) {
            newGlobals = newGlobals.filter((k) => k !== sectionKey);
          }
          updateGlobalFilterKeys(newGlobals);
        }
      } else {
        (newSpec as any)[field] = value;
      }

      onChange([...specifications, newSpec]);
    }
  };

  const handleProfileSpecRemove = (sectionKey: string) => {
    // Cannot delete mandatory specs
    if (mandatoryKeys.includes(sectionKey)) return;
    onChange(specifications.filter((s) => s.key !== sectionKey));
  };

  const getProfileValue = (key: string): SpecRow => {
    const found = specifications.find((s) => s.key === key);
    let defaultSlug = getAutoSlug(key, slugMap);
    if (key === "الفئة") defaultSlug = "category";
    if (key === "الفئة الفرعية") defaultSlug = "subcategory";
    if (key === "العلامة التجارية") defaultSlug = "brand";

    return found ?? { id: `ph-${key}`, key, value: "", inFilter: globalFilterKeys.includes(key) || mandatoryKeys.includes(key), filterSlug: defaultSlug };
  };



  const otherSpecs = specifications.filter((s) => !mandatoryKeys.includes(s.key));

  const filledCount = specifications.filter((s) => s.value.trim() && !mandatoryKeys.includes(s.key)).length;

  return (
    <div className="space-y-0">
      <button
        type="button"
        onClick={() => setOuterOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors text-right"
      >
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          <span className="text-sm font-bold">المواصفات والخصائص (جدول التفاصيل)</span>
          {filledCount > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              {filledCount} مواصفة إضافية
            </span>
          )}
          {profileKey && (
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PROFILE_LABELS[profileKey].color}`}>
              {PROFILE_LABELS[profileKey].emoji} {PROFILE_LABELS[profileKey].label}
            </span>
          )}
        </div>
        {outerOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {outerOpen && (
        <div className="border border-t-0 rounded-b-lg p-4 space-y-4 bg-card">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowProfilePicker((v) => !v)}
                className="text-xs gap-1 border-dashed font-semibold"
              >
                <LayoutTemplate className="h-3 w-3" />
                {activeCustomProfile
                  ? `📋 ${activeCustomProfile.name}`
                  : profileKey
                  ? `البروفايل: ${PROFILE_LABELS[profileKey].emoji} ${PROFILE_LABELS[profileKey].label}`
                  : "اختر بروفايل للمواصفات"}
                <ChevronDown className="h-3 w-3" />
              </Button>

              {/* Update button - only shown when a custom profile is active */}
              {activeCustomProfile && specifications.some((s) => s.key && s.key.trim() !== "" && !mandatoryKeys.includes(s.key)) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={updateCustomProfile}
                  className="text-xs gap-1 border-dashed text-blue-700 border-blue-300 hover:bg-blue-50 animate-in fade-in zoom-in-95 duration-200 font-semibold"
                >
                  🔄 تحديث البروفايل
                </Button>
              )}

              {specifications.some((s) => s.key && s.key.trim() !== "" && !mandatoryKeys.includes(s.key)) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const catVal = specifications.find((s) => s.key === "الفئة")?.value?.trim() || "";
                    if (!showSaveProfileInline) setNewProfileName(catVal);
                    setShowSaveProfileInline((v) => !v);
                  }}
                  className="text-xs gap-1 border-dashed text-green-700 border-green-300 hover:bg-green-50 animate-in fade-in zoom-in-95 duration-200 font-semibold"
                >
                  💾 حفظ بروفايل جديد
                </Button>
              )}

              {otherSpecs.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  className="text-xs text-destructive hover:bg-destructive/10 font-semibold"
                >
                  <X className="h-3 w-3 ml-1" />
                  مسح الحقول الإضافية
                </Button>
              )}
            </div>
          </div>

          {showSaveProfileInline && (
            <div className="rounded-lg border border-green-200 bg-green-50/60 p-3 space-y-2 animate-in fade-in slide-in-from-top-1">
              <p className="text-xs font-semibold text-green-800">💾 حفظ المواصفات الحالية كبروفايل مخصص في Firebase</p>
              <p className="text-[11px] text-green-700/70">سيتم حفظ جميع أسماء الحقول والـ Slug والإعدادات (بدون القيم) لإعادة استخدامها لاحقاً.</p>
              {/* Profile name input + preview */}
              {(() => {
                const catSpec = specifications.find((s) => s.key === "الفئة");
                const catImg = catSpec?.categoryImage?.trim() || "";
                return (
                  <div className="flex items-center gap-3 bg-white border border-green-200 rounded-lg px-3 py-2">
                    {catImg ? (
                      <img src={catImg} alt={newProfileName} className="h-10 w-10 rounded-lg object-cover border border-gray-100 shrink-0" />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center text-lg shrink-0">📁</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-green-700 font-semibold mb-1">اسم البروفايل (يمكن تعديله)</p>
                      <input
                        type="text"
                        className="w-full h-7 text-xs border border-green-300 rounded-md px-2 bg-white focus:outline-none focus:ring-1 focus:ring-green-500 font-medium"
                        placeholder="مثال: لابتوب جيمنج، كيبورد ميكانيكي..."
                        value={newProfileName}
                        onChange={(e) => setNewProfileName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveCustomProfile(); } }}
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        onClick={saveCustomProfile}
                        className="text-xs bg-green-600 hover:bg-green-700 text-white font-semibold"
                      >
                        حفظ
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => { setShowSaveProfileInline(false); setNewProfileName(""); }}
                        className="text-xs font-semibold"
                      >
                        إلغاء
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {showProfilePicker && (
            <div className="rounded-lg border bg-background p-3 shadow-md">
              {profilesLoading ? (
                <p className="text-xs text-center text-muted-foreground py-4 font-semibold">جارٍ تحميل البروفايلات...</p>
              ) : customProfiles.length === 0 ? (
                <div className="text-center py-6 space-y-2">
                  <p className="text-3xl">📭</p>
                  <p className="text-xs text-muted-foreground font-semibold">لا توجد بروفايلات محفوظة بعد</p>
                  <p className="text-[11px] text-muted-foreground/70">أضف المواصفات ثم اضغط "حفظ كبروفايل" لإنشاء أول بروفايل</p>
                </div>
              ) : (
                <>
                  <p className="text-xs font-semibold text-muted-foreground mb-3">⭐ بروفايلاتي المحفوظة:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {customProfiles.map((prof) => {
                      const isActive = activeCustomProfile?.id === prof.id;
                      return (
                        <div key={prof.id} className="relative group">
                          <button
                            type="button"
                            onClick={() => applyCustomProfile(prof)}
                            className={`w-full flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 text-xs font-semibold transition-all hover:scale-105 ${
                              isActive
                                ? "border-amber-500 bg-amber-50 shadow-md"
                                : "border-amber-200 bg-amber-50/40 hover:bg-amber-50 hover:border-amber-400 hover:shadow-sm"
                            }`}
                          >
                            {prof.categoryImage ? (
                              <img
                                src={prof.categoryImage}
                                alt={prof.name}
                                className="w-12 h-12 rounded-lg object-cover border border-amber-200 shadow-sm"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center text-xl border border-amber-200">
                                📁
                              </div>
                            )}
                            <span className="text-center leading-tight text-amber-900 line-clamp-2">{prof.name}</span>
                            <span className="text-[10px] text-amber-600 font-normal">{prof.fields.length} حقل</span>
                            {isActive && (
                              <span className="text-[9px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full font-bold">محدد</span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setProfileToDelete(prof); }}
                            className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 p-0.5 rounded-full bg-white border border-red-200 text-red-500 hover:bg-red-50 hover:text-red-700 transition-all shadow-sm"
                            title="حذف البروفايل"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
          {/* Column labels for extra specs */}

          <div className="hidden sm:flex items-center gap-2 px-2 text-xs text-muted-foreground pt-2">
            <span className="w-40 shrink-0">اسم الخاصية</span>
            <span className="flex-1">القيمة / التفاصيل</span>
            <span className="w-28 text-center">إظهار في التصفية</span>
            <span className="w-8" />
          </div>

          {/* ── Fixed/Mandatory specifications section at the very top ── */}

          {mandatoryKeys.map((key) => {
            const spec = getProfileValue(key);
            let options: string[] = [];
            if (key === "الفئة") {
              options = allCategories;
            } else if (key === "الفئة الفرعية") {
              const activeCat = specifications.find(s => s.key === "الفئة")?.value || "";
              options = getUniqueSubcategories(activeCat);
            } else if (key === "العلامة التجارية") {
              options = uniqueBrands;
            }

            return (
              <SpecRowItem
                key={key}
                spec={spec}
                keyReadOnly={true}
                isMandatory={true}
                valuePlaceholder={`أدخل ${key} (مطلوب) *`}
                options={options}
                onUpdate={(field, val) => handleProfileSpecChange(key, field as any, val as any)}
                onRemove={() => handleProfileSpecRemove(key)}
              />
            );
          })}




          {(() => {
            // Determine whether to show the screen features block
            const hasDisplaySection = profile
              ? profile.some((sec) => sec.title === "الشاشة (Display)")
              : false;

            return (
              <div className="space-y-2">
                {otherSpecs.length === 0 && (
                  <div className="text-center py-8 border rounded-lg border-dashed space-y-2">
                    <LayoutTemplate className="h-8 w-8 mx-auto text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground font-semibold">
                      اختر بروفايل لملء المواصفات تلقائياً، أو أضف صفوفاً يدوياً للمواصفات الإضافية
                    </p>
                  </div>
                )}
                {otherSpecs.map((spec, index) => (
                  <SpecRowItem
                    key={spec.id}
                    spec={spec}
                    keyReadOnly={false}
                    valuePlaceholder="القيمة"
                    options={
                      spec.key?.trim().match(/^(الفئة|category)$/i) ? allCategories :
                      spec.key?.trim().match(/^(الفئة الفرعية|subcategory)$/i) ? getUniqueSubcategories(specifications.find(s => s.key?.trim().match(/^(الفئة|category)$/i))?.value || "") :
                      spec.key?.trim().match(/^(العلامة التجارية|الماركة|brand)$/i) ? uniqueBrands :
                      optionsMap[spec.key] || []
                    }
                    onUpdate={(field, val) => updateSpec(spec.id, field, val)}
                    onRemove={() => removeSpec(spec.id)}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    isDragging={draggedIndex === index}
                  />
                ))}

                {/* Screen features block – shown for laptop/monitor profiles */}
                {hasDisplaySection && onFeaturesChange && (
                  <div className="mt-2 p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
                    <h4 className="text-[11px] font-bold text-blue-900 mb-3">مميزات الشاشة الإضافية (تستخدم للفلترة في المتجر)</h4>
                    <div className="flex flex-wrap gap-4">
                      {[
                        { id: "touch", label: "تدعم اللمس" },
                        { id: "x360", label: "قابل للدوران (x360)" },
                        { id: "detachable", label: "قابل للفصل" },
                      ].map((feature) => (
                        <div key={feature.id} className="flex items-center space-x-2 space-x-reverse">
                          <Switch
                            id={`feature-${feature.id}`}
                            checked={(features || []).includes(feature.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                onFeaturesChange([...(features || []), feature.id]);
                              } else {
                                onFeaturesChange((features || []).filter(f => f !== feature.id));
                              }
                            }}
                            className="scale-75"
                          />
                          <Label htmlFor={`feature-${feature.id}`} className="text-[11px] font-medium cursor-pointer">
                            {feature.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          <Button
            type="button"
            variant="outline"
            onClick={addManualSpec}
            className="w-full border-dashed text-sm font-semibold"
          >
            <PlusCircle className="h-4 w-4 ml-2" />
            إضافة صف مواصفة إضافي
          </Button>

          <AlertDialog open={!!profileToDelete} onOpenChange={() => setProfileToDelete(null)}>
            <AlertDialogContent className="max-w-[400px]">
              <AlertDialogHeader className="space-y-2">
                <AlertDialogTitle className="text-right text-lg font-bold text-gray-900">هل أنت متأكد من حذف البروفايل؟</AlertDialogTitle>
                <AlertDialogDescription className="text-right text-sm text-muted-foreground leading-relaxed">
                  سيتم حذف بروفايل <strong className="text-red-600 font-semibold">"{profileToDelete?.name}"</strong> نهائيًا من الحساب والـ Firebase. لن تتمكن من استعادته مرة أخرى.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex flex-row-reverse gap-2 mt-4">
                <AlertDialogCancel className="mt-0 flex-1 bg-gray-100 hover:bg-gray-200 border-none text-gray-700 font-semibold">إلغاء</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    if (profileToDelete) {
                      await deleteCustomProfile(profileToDelete);
                      setProfileToDelete(null);
                    }
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white border-none font-semibold"
                >
                  تأكيد الحذف
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}
