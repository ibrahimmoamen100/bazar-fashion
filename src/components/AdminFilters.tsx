import { useState, useEffect, useMemo, useRef } from "react";
import { useStore } from "@/store/useStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Package,
  Tag,
  Timer,
  RefreshCw,
  AlertTriangle,
  Store,
  Search,
  ChevronDown,
  Check,
  X,
} from "lucide-react";
import { formatPrice } from "@/utils/format";
import { useTranslation } from "react-i18next";

function SearchableSupplierSelect({
  value,
  suppliers,
  onChange,
}: {
  value?: string;
  suppliers: string[];
  onChange: (val: string | undefined) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredSuppliers = useMemo(() => {
    if (!search.trim()) return suppliers;
    const q = search.toLowerCase().trim();
    return suppliers.filter((s) => s.toLowerCase().includes(q));
  }, [suppliers, search]);

  const selectedText = value || "جميع التجار";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="truncate">{selectedText}</span>
        <div className="flex items-center gap-1">
          {value && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange(undefined);
              }}
              className="p-1 hover:bg-secondary rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
              title="تصفية بالكل"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-80">
          <div className="p-2 border-b flex items-center gap-2 bg-muted/40">
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              placeholder="ابحث عن اسم التاجر..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="max-h-48 overflow-y-auto p-1 space-y-0.5">
            <button
              type="button"
              onClick={() => {
                onChange(undefined);
                setIsOpen(false);
                setSearch("");
              }}
              className={`flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer ${
                !value ? "bg-accent/50 font-bold text-primary" : ""
              }`}
            >
              <span>جميع التجار</span>
              {!value && <Check className="h-4 w-4 text-primary" />}
            </button>

            {filteredSuppliers.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">
                لا يوجد تجار بهذا الاسم
              </div>
            ) : (
              filteredSuppliers.map((supplierName) => (
                <button
                  key={supplierName}
                  type="button"
                  onClick={() => {
                    onChange(supplierName);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className={`flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer ${
                    value === supplierName ? "bg-accent/50 font-bold text-primary" : ""
                  }`}
                >
                  <span className="truncate">{supplierName}</span>
                  {value === supplierName && <Check className="h-4 w-4 text-primary" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface AdminFiltersProps {
  filters: {
    minPrice?: number;
    maxPrice?: number;
    category?: string;
    supplier?: string;
    isArchived?: boolean;
    archivedStatus?: "all" | "archived" | "active";
    stockStatus?: "all" | "out-of-stock" | "low-stock";
  };
  onFilterChange: (filters: any) => void;
  uniqueSuppliers?: string[];
}

export function AdminFilters({
  filters,
  onFilterChange,
}: AdminFiltersProps) {
  const products = useStore((state) => state.products) || [];
  const { t } = useTranslation();

  // Get unique categories
  const categories = Array.from(
    new Set(products.map((p) => p.category).filter(Boolean))
  );

  // Get unique suppliers
  const suppliers = Array.from(
    new Set(
      products
        .map((p) => p.wholesaleInfo?.supplierName || (p as any).supplierName)
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, 'ar'));

  return (
    <Card className="p-6 mb-6 bg-card shadow-sm border-none">
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onFilterChange({
              minPrice: undefined,
              maxPrice: undefined,
              category: undefined,
              supplier: undefined,
              isArchived: false,
              archivedStatus: "active",
              stockStatus: "all",
            })
          }
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          إعادة تعيين
        </Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Price Range */}
        <div className="space-y-2 bg-secondary/10 p-4 rounded-lg">
          <Label className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4 text-primary" />
            نطاق السعر
          </Label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="الحد الأقصى"
              value={filters.maxPrice || ""}
              onChange={(e) =>
                onFilterChange({
                  ...filters,
                  maxPrice: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="text-left"
            />
            <Input
              type="number"
              placeholder="الحد الأدنى"
              value={filters.minPrice || ""}
              onChange={(e) =>
                onFilterChange({
                  ...filters,
                  minPrice: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="text-left"
            />
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {filters.maxPrice ? formatPrice(filters.maxPrice) : "0"}{" "}
              {t("common.currency")}
            </span>
            <span>
              {filters.minPrice ? formatPrice(filters.minPrice) : "0"}{" "}
              {t("common.currency")}
            </span>
          </div>
        </div>

        {/* Category */}
        <div className="space-y-2 bg-secondary/10 p-4 rounded-lg">
          <Label className="flex items-center gap-2 text-base">
            <Tag className="h-4 w-4 text-primary" />
            التصنيف
          </Label>
          <Select
            value={filters.category || "all"}
            onValueChange={(value) =>
              onFilterChange({
                ...filters,
                category: value === "all" ? undefined : value,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر التصنيف" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع التصنيفات</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Supplier / Merchant */}
        <div className="space-y-2 bg-secondary/10 p-4 rounded-lg">
          <Label className="flex items-center gap-2 text-base">
            <Store className="h-4 w-4 text-primary" />
            التاجر / المتجر
          </Label>
          <SearchableSupplierSelect
            value={filters.supplier}
            suppliers={suppliers}
            onChange={(supplierName) =>
              onFilterChange({
                ...filters,
                supplier: supplierName,
              })
            }
          />
        </div>

        {/* Stock Status */}
        <div className="space-y-2 bg-secondary/10 p-4 rounded-lg">
          <Label className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-primary" />
            حالة المخزون
          </Label>
          <Select
            value={filters.stockStatus || "all"}
            onValueChange={(value) =>
              onFilterChange({
                ...filters,
                stockStatus: value,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر حالة المخزون" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="low-stock">أقل من 5 منتجات</SelectItem>
              <SelectItem value="out-of-stock">نفدت الكمية</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div className="space-y-2 bg-secondary/10 p-4 rounded-lg">
          <Label className="flex items-center gap-2 text-base">
            <Timer className="h-4 w-4 text-primary" />
            حالة المنتج
          </Label>
          <Select
            value={filters.archivedStatus || "active"}
            onValueChange={(value) =>
              onFilterChange({
                ...filters,
                archivedStatus: value,
                isArchived: value === "archived",
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع المنتجات</SelectItem>
              <SelectItem value="active">المنتجات النشطة</SelectItem>
              <SelectItem value="archived">المنتجات المؤرشفة</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Quick Toggle */}
        <div className="space-y-2 bg-secondary/10 p-4 rounded-lg">
          <Label className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4 text-primary" />
            عرض المنتجات المؤرشفة
          </Label>
          <div className="flex items-center space-x-2">
            <Switch
              checked={!!filters.isArchived}
              onCheckedChange={(checked) =>
                onFilterChange({
                  ...filters,
                  isArchived: checked,
                  archivedStatus: checked ? "archived" : "active",
                })
              }
            />
            <Label className="text-sm text-muted-foreground">
              {filters.isArchived ? "إظهار المؤرشفة" : "إخفاء المؤرشفة"}
            </Label>
          </div>
        </div>
      </div>
    </Card>
  );
}
