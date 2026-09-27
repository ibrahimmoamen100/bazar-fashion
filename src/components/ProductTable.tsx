'use client';

import { Product } from "@/types/product";
import { copyToClipboard } from '@/utils/clipboard';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow, format } from "date-fns";
import { ar } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  Timer,
  ArrowDownToLine,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useState, useRef, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { DEFAULT_SUPPLIER } from "@/constants/supplier";
import { formatCurrency } from "@/utils/format";
import { Input } from "@/components/ui/input";

interface ProductTableProps {
  products?: Product[];
  searchQuery: string;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  onUpdateQuantity?: (productId: string, newQuantity: number) => void;
  onUpdatePriority?: (productId: string, newPriority: number | null) => Promise<boolean>;
  onToggleArchive?: (productId: string, isArchived: boolean) => Promise<boolean>;
  onBulkDelete?: (productIds: string[]) => Promise<void>;
  onBulkArchive?: (productIds: string[], archiveStatus: boolean) => Promise<void>;
}

export function ProductTable({
  products = [],
  searchQuery,
  onEdit,
  onDelete,
  onUpdateQuantity,
  onUpdatePriority,
  onToggleArchive,
  onBulkDelete,
  onBulkArchive,
}: ProductTableProps) {
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [productToArchive, setProductToArchive] = useState<Product | null>(null);
  const [editingQuantity, setEditingQuantity] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingPriority, setEditingPriority] = useState<string | null>(null);
  const [editingPriorityProductId, setEditingPriorityProductId] = useState<string | null>(null);

  // Bulk Selection States
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showBulkArchiveDialog, setShowBulkArchiveDialog] = useState(false);
  const [bulkArchiveTargetStatus, setBulkArchiveTargetStatus] = useState<boolean>(true);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  const [visibleCount, setVisibleCount] = useState(12);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 12;

  const filteredProducts = (products || []).filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, products.length]);

  const hasMore = visibleCount < filteredProducts.length;
  const currentProducts = filteredProducts.slice(0, visibleCount);

  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => prev + PAGE_SIZE);
      setIsLoadingMore(false);
    }, 1500); // 1.5 seconds wait
  }, [isLoadingMore, hasMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "300px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const handleCopyId = async (id: string) => {
    const success = await copyToClipboard(id);
    if (success) toast.success("Product ID copied to clipboard");
  };

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
  };

  const handleConfirmDelete = () => {
    if (productToDelete) {
      onDelete(productToDelete.id);
      setProductToDelete(null);
      toast.success("Product deleted successfully");
    }
  };

  const handleQuantityEdit = (productId: string, currentQuantity: number) => {
    setEditingProductId(productId);
    setEditingQuantity(currentQuantity.toString());
  };

  const handleQuantitySave = () => {
    if (editingProductId && editingQuantity && onUpdateQuantity) {
      const newQuantity = parseInt(editingQuantity);
      if (!isNaN(newQuantity) && newQuantity >= 0) {
        onUpdateQuantity(editingProductId, newQuantity);
        toast.success("تم تحديث الكمية بنجاح");
      } else {
        toast.error("يرجى إدخال رقم صحيح");
      }
    }
    setEditingProductId(null);
    setEditingQuantity(null);
  };

  const handleQuantityCancel = () => {
    setEditingProductId(null);
    setEditingQuantity(null);
  };

  const handlePriorityEdit = (productId: string, currentPriority: number | undefined) => {
    setEditingPriorityProductId(productId);
    setEditingPriority(currentPriority?.toString() || "");
  };

  const handlePrioritySave = async () => {
    if (editingPriorityProductId && onUpdatePriority) {
      // Treat empty string or 0 as null (no priority)
      const parsedValue = editingPriority === "" ? null : parseInt(editingPriority);
      const newPriority = (parsedValue === null || parsedValue === 0) ? null : parsedValue;

      if (newPriority === null || (!isNaN(newPriority) && newPriority > 0)) {
        const success = await onUpdatePriority(editingPriorityProductId, newPriority);
        if (success) {
          toast.success("تم تحديث أولوية الظهور بنجاح");
        }
      } else {
        toast.error("يرجى إدخال رقم صحيح (1 أو أكثر)");
      }
    }
    setEditingPriorityProductId(null);
    setEditingPriority(null);
  };

  const handlePriorityCancel = () => {
    setEditingPriorityProductId(null);
    setEditingPriority(null);
  };

  const handleArchiveClick = (product: Product) => {
    setProductToArchive(product);
  };

  const handleConfirmArchive = async () => {
    if (productToArchive && onToggleArchive) {
      const success = await onToggleArchive(productToArchive.id, !productToArchive.isArchived);
      if (success) {
        toast.success(productToArchive.isArchived ? "تم إلغاء أرشفة المنتج بنجاح" : "تم أرشفة المنتج بنجاح");
      } else {
        toast.error("حدث خطأ أثناء تغيير حالة الأرشفة");
      }
      setProductToArchive(null);
    }
  };

  // Bulk selection handlers
  const allCurrentSelected =
    currentProducts.length > 0 &&
    currentProducts.every((p) => selectedIds.includes(p.id));

  const toggleSelectAll = () => {
    if (allCurrentSelected) {
      setSelectedIds((prev) => prev.filter((id) => !currentProducts.some((p) => p.id === id)));
    } else {
      const newSet = new Set([...selectedIds, ...currentProducts.map((p) => p.id)]);
      setSelectedIds(Array.from(newSet));
    }
  };

  const toggleSelectProduct = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleConfirmBulkDelete = async () => {
    if (onBulkDelete && selectedIds.length > 0) {
      setIsProcessingBulk(true);
      try {
        await onBulkDelete(selectedIds);
        setSelectedIds([]);
        setShowBulkDeleteDialog(false);
      } catch (e) {
        console.error(e);
      } finally {
        setIsProcessingBulk(false);
      }
    }
  };

  const handleConfirmBulkArchive = async () => {
    if (onBulkArchive && selectedIds.length > 0) {
      setIsProcessingBulk(true);
      try {
        await onBulkArchive(selectedIds, bulkArchiveTargetStatus);
        setSelectedIds([]);
        setShowBulkArchiveDialog(false);
      } catch (e) {
        console.error(e);
      } finally {
        setIsProcessingBulk(false);
      }
    }
  };

  return (
    <>
      {/* ── Bulk Actions Floating Bar ── */}
      {selectedIds.length > 0 && (
        <div className="sticky top-4 z-30 mb-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/20 bg-white/95 p-4 backdrop-blur-md shadow-lg transition-all animate-in fade-in-80">
          <div className="flex items-center gap-3">
            <Badge className="bg-primary text-white text-sm px-3 py-1 font-bold">
              تم تحديد {selectedIds.length} منتج
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds([])}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              إلغاء التحديد
            </Button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onBulkArchive && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setBulkArchiveTargetStatus(true);
                    setShowBulkArchiveDialog(true);
                  }}
                  className="gap-1.5 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 font-semibold"
                >
                  <Archive className="h-4 w-4" />
                  أرشفة المحدد ({selectedIds.length})
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setBulkArchiveTargetStatus(false);
                    setShowBulkArchiveDialog(true);
                  }}
                  className="gap-1.5 border-green-300 bg-green-50 text-green-800 hover:bg-green-100 font-semibold"
                >
                  <ArchiveRestore className="h-4 w-4" />
                  إلغاء أرشفة المحدد
                </Button>
              </>
            )}

            {onBulkDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowBulkDeleteDialog(true)}
                className="gap-1.5 font-semibold"
              >
                <Trash2 className="h-4 w-4" />
                حذف المحدد ({selectedIds.length})
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="rounded-lg border overflow-x-auto w-full">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[45px] text-center">
                <Checkbox
                  checked={allCurrentSelected}
                  onCheckedChange={toggleSelectAll}
                  aria-label="تحديد الكل"
                />
              </TableHead>
              <TableHead className="w-[300px]">المنتج</TableHead>
              <TableHead className="w-[140px] text-center">
                التصنيف والماركة
              </TableHead>
              <TableHead className="w-[120px] text-center">السعر</TableHead>
              <TableHead className="w-[120px] text-center">الحالة</TableHead>
              <TableHead className="w-[120px] text-center">الكمية</TableHead>
              <TableHead className="w-[100px] text-center">
                أولوية الظهور
              </TableHead>
              <TableHead className="w-[150px] text-center">
                العرض الخاص
              </TableHead>
              <TableHead className="w-[150px] text-center">
                تاريخ الإضافة
              </TableHead>
              <TableHead className="w-[80px] text-center">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentProducts.map((product) => (
              <TableRow
                key={product.id}
                className={selectedIds.includes(product.id) ? "bg-primary/5" : undefined}
              >
                <TableCell className="text-center">
                  <Checkbox
                    checked={selectedIds.includes(product.id)}
                    onCheckedChange={() => toggleSelectProduct(product.id)}
                    aria-label={`تحديد ${product.name}`}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-4">
                    <div className="relative h-16 w-16 rounded-lg overflow-hidden shrink-0">
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium">{product.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {(product.description?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || '').slice(0, 50)}{product.description ? '...' : ''}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex flex-col items-center gap-1">
                    {product.category ? (
                      <Badge variant="outline" className="font-normal">
                        {product.category}
                      </Badge>
                    ) : !product.brand && !product.subcategory ? (
                      <span className="text-muted-foreground text-xs">-</span>
                    ) : null}

                    {product.brand && (
                      <div className="flex items-center gap-1">
                        {product.category && (
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 128 128"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="text-muted-foreground shrink-0"
                          >
                            <path
                              d="M78.1 0v6.2c22.4 0 40.5 18.2 40.5 40.6s-18.1 40.6-40.5 40.6H17.9l27.9-28-4.5-4.5L5.5 90.8l36 36.2 4.5-4.5-28.8-28.9h60.9c25.8 0 46.7-21 46.7-46.8S103.9 0 78.1 0z"
                              stroke="currentColor"
                              strokeWidth="10"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                        <Badge
                          variant="secondary"
                          className="font-normal text-xs bg-primary/10 text-primary hover:bg-primary/15 border border-primary/20"
                        >
                          {product.brand}
                        </Badge>
                      </div>
                    )}

                    {product.subcategory && (
                      <div className="flex items-center gap-1">
                        {(product.category || product.brand) && (
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 128 128"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="text-muted-foreground shrink-0"
                          >
                            <path
                              d="M78.1 0v6.2c22.4 0 40.5 18.2 40.5 40.6s-18.1 40.6-40.5 40.6H17.9l27.9-28-4.5-4.5L5.5 90.8l36 36.2 4.5-4.5-28.8-28.9h60.9c25.8 0 46.7-21 46.7-46.8S103.9 0 78.1 0z"
                              stroke="currentColor"
                              strokeWidth="10"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                        <Badge
                          variant="secondary"
                          className="font-normal text-xs"
                        >
                          {product.subcategory}
                        </Badge>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {product.specialOffer && product.discountPercentage ? (
                    <div className="flex flex-col items-center gap-1">
                      <Badge variant="destructive" className="w-fit">
                        {formatCurrency(
                          product.discountPrice ||
                          (product.price -
                            (product.price * product.discountPercentage) / 100),
                          'جنيه'
                        )}
                      </Badge>
                      <span className="text-muted-foreground line-through text-xs">
                        {formatCurrency(product.price, 'جنيه')}
                      </span>
                    </div>
                  ) : (
                    <span>{formatCurrency(product.price, 'جنيه')}</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <Button
                    variant={product.isArchived ? "secondary" : "outline"}
                    size="sm"
                    className={`h-8 font-semibold w-20 ${product.isArchived ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200' : 'border-gray-200 hover:bg-gray-50'}`}
                    onClick={() => handleArchiveClick(product)}
                  >
                    {product.isArchived ? "مؤرشف" : "أرشفة"}
                  </Button>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex flex-col items-center gap-1">
                    {editingProductId === product.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="0"
                          value={editingQuantity || ""}
                          onChange={(e) => setEditingQuantity(e.target.value)}
                          className="w-16 h-8 text-center"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleQuantitySave();
                            } else if (e.key === "Escape") {
                              handleQuantityCancel();
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleQuantitySave}
                          className="h-8 w-8 p-0"
                        >
                          ✓
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleQuantityCancel}
                          className="h-8 w-8 p-0"
                        >
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <div
                        className="cursor-pointer hover:bg-gray-100 p-1 rounded"
                        onClick={() => handleQuantityEdit(product.id, product.wholesaleInfo?.quantity || 0)}
                        title="انقر لتعديل الكمية"
                      >
                        <Badge
                          variant={product.wholesaleInfo?.quantity && product.wholesaleInfo.quantity > 0 ? "default" : "destructive"}
                          className="font-normal"
                        >
                          {product.wholesaleInfo?.quantity || 0} متاح
                        </Badge>
                      </div>
                    )}
                    {product.wholesaleInfo?.purchasedQuantity && (
                      <span className="text-xs text-muted-foreground">
                        تم شراء: {product.wholesaleInfo.purchasedQuantity}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {editingPriorityProductId === product.id ? (
                    <div className="flex items-center justify-center gap-1">
                      <Input
                        type="number"
                        min="1"
                        placeholder="بدون"
                        value={editingPriority || ""}
                        onChange={(e) => setEditingPriority(e.target.value)}
                        className="w-16 h-8 text-center"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handlePrioritySave();
                          } else if (e.key === "Escape") {
                            handlePriorityCancel();
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handlePrioritySave}
                        className="h-8 w-8 p-0"
                      >
                        ✓
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handlePriorityCancel}
                        className="h-8 w-8 p-0"
                      >
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="cursor-pointer hover:bg-gray-100 p-1 rounded"
                      onClick={() => handlePriorityEdit(product.id, product.displayPriority)}
                      title="انقر لتعديل الأولوية"
                    >
                      <Badge
                        variant={product.displayPriority && product.displayPriority > 0 ? "default" : "secondary"}
                        className="font-normal"
                      >
                        {product.displayPriority && product.displayPriority > 0 ? product.displayPriority : "بدون"}
                      </Badge>
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {product.specialOffer ? (
                    <div className="flex flex-col items-center gap-1">
                      <Badge variant="secondary" className="w-fit">
                        {product.discountPercentage}% خصم
                      </Badge>
                      {product.offerEndsAt && (
                        <div className="flex items-center justify-center text-xs gap-1 text-muted-foreground">
                          <Timer className="h-3 w-3" />
                          <span>
                            {formatDistanceToNow(
                              new Date(product.offerEndsAt),
                              { addSuffix: true }
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm">
                      {format(
                        new Date(product.createdAt || new Date()),
                        "dd/MM/yyyy hh:mm a",
                        { locale: ar }
                      )
                        .replace("AM", "ص")
                        .replace("PM", "م")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(
                        new Date(product.createdAt || new Date()),
                        { addSuffix: true, locale: ar }
                      )}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">فتح القائمة</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => onEdit(product)}
                        className="flex items-center gap-2"
                      >
                        <Pencil className="h-4 w-4" />
                        تعديل
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(product)}
                        className="flex items-center gap-2 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        حذف
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleCopyId(product.id)}
                        className="flex items-center gap-2"
                      >
                        <Copy className="h-4 w-4" />
                        نسخ المعرف
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ── Infinite Scroll Sentinel ── */}
      <div ref={sentinelRef} className="mt-4 flex flex-col items-center gap-3 pb-4">
        {isLoadingMore && (
          <div className="flex items-center gap-2 text-blue-500 bg-white rounded-full px-5 py-2 shadow-sm border border-blue-100">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm font-semibold">جاري تحميل المزيد...</span>
          </div>
        )}
        {!hasMore && filteredProducts.length > 0 && (
          <div className="text-xs text-gray-400 font-medium py-2">
            ✓ تم عرض جميع المنتجات المعثور عليها ({filteredProducts.length})
          </div>
        )}
      </div>

      <AlertDialog
        open={!!productToDelete}
        onOpenChange={() => setProductToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              لا يمكن التراجع عن هذا الإجراء. سيتم حذف المنتج نهائياً.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!productToArchive}
        onOpenChange={() => setProductToArchive(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الإجراء</AlertDialogTitle>
            <AlertDialogDescription>
              {productToArchive?.isArchived
                ? "هل أنت متأكد من رغبتك في إلغاء أرشفة هذا المنتج وعرضه للعملاء مجدداً؟"
                : "هل أنت متأكد من رغبتك في أرشفة هذا المنتج؟ سيتم إخفاؤه من واجهة المتجر ولن يتمكن العملاء من رؤيته."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmArchive} className={productToArchive?.isArchived ? "bg-green-600 hover:bg-green-700" : "bg-amber-600 hover:bg-amber-700"}>
              {productToArchive?.isArchived ? "إلغاء الأرشفة" : "تأكيد الأرشفة"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Bulk Delete Dialog ── */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المنتجات المحددة نهائياً</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من رغبتك في حذف ({selectedIds.length}) منتج دفعة واحدة؟ لا يمكن التراجع عن هذا الإجراء وسيتم حذف البيانات نهائياً.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessingBulk}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmBulkDelete}
              disabled={isProcessingBulk}
              className="bg-destructive hover:bg-destructive/90 gap-2"
            >
              {isProcessingBulk && <Loader2 className="h-4 w-4 animate-spin" />}
              حذف {selectedIds.length} منتج
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Bulk Archive Dialog ── */}
      <AlertDialog open={showBulkArchiveDialog} onOpenChange={setShowBulkArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkArchiveTargetStatus ? "أرشفة المنتجات المحددة" : "إلغاء أرشفة المنتجات المحددة"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkArchiveTargetStatus
                ? `هل أنت متأكد من رغبتك في أرشفة (${selectedIds.length}) منتج؟ سيتم إخفاؤها من واجهة المتجر ولن تظهر للعملاء.`
                : `هل أنت متأكد من رغبتك في إلغاء أرشفة (${selectedIds.length}) منتج وعرضها للعملاء مجدداً؟`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessingBulk}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmBulkArchive}
              disabled={isProcessingBulk}
              className={bulkArchiveTargetStatus ? "bg-amber-600 hover:bg-amber-700 gap-2" : "bg-green-600 hover:bg-green-700 gap-2"}
            >
              {isProcessingBulk && <Loader2 className="h-4 w-4 animate-spin" />}
              {bulkArchiveTargetStatus ? `أرشفة ${selectedIds.length} منتج` : `إلغاء أرشفة ${selectedIds.length} منتج`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
