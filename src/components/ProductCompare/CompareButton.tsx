'use client';

import { useState } from "react";
import { GitCompare, Check } from "lucide-react";
import { Product } from "@/types/product";
import { useCompareStore } from "@/store/useCompareStore";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface CompareButtonProps {
  product: Product;
  className?: string;
  variant?: 'icon' | 'text';
}

export function CompareButton({ product, className = "", variant = 'icon' }: CompareButtonProps) {
  const { addToCompare, removeFromCompare, isInCompare, compareList, clearCompare } =
    useCompareStore();
  const [showConfirm, setShowConfirm] = useState(false);
  const inCompare = isInCompare(product.id);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (inCompare) {
      removeFromCompare(product.id);
      toast.info("تم إزالة المنتج من المقارنة");
      return;
    }

    const result = addToCompare(product);

    if (result.success) {
      toast.success("تمت إضافة المنتج للمقارنة", {
        description: `${compareList.length + 1} منتج في المقارنة`,
        duration: 2000,
      });
    } else {
      // Different category prompt
      if (
        compareList.length > 0 &&
        compareList[0].category !== product.category
      ) {
        setShowConfirm(true);
      } else {
        toast.error(result.message);
      }
    }
  };

  const handleConfirmClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    clearCompare();
    // Re-add with fresh list
    setTimeout(() => {
      addToCompare(product);
      toast.success("تمت إضافة المنتج للمقارنة (فئة جديدة)");
    }, 50);
    setShowConfirm(false);
  };

  const handleCancelConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowConfirm(false);
  };

  return (
    <div className={`relative ${variant === 'text' ? 'w-full' : ''} ${className}`}>
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 8 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 p-3 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs font-semibold text-gray-700 mb-2 leading-relaxed" dir="rtl">
              فئات مختلفة! هل تريد مسح المقارنة الحالية؟
            </p>
            <div className="flex gap-1.5 justify-center">
              <button
                onClick={handleConfirmClear}
                className="text-[11px] font-bold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
              >
                نعم، ابدأ جديدة
              </button>
              <button
                onClick={handleCancelConfirm}
                className="text-[11px] font-bold bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {variant === 'icon' ? (
        <button
          onClick={handleClick}
          title={inCompare ? "إزالة من المقارنة" : "إضافة للمقارنة"}
          aria-label={inCompare ? "إزالة من المقارنة" : "إضافة للمقارنة"}
          className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 border shrink-0 ${
            inCompare
              ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200 hover:bg-blue-700"
              : "bg-slate-100 border-slate-200 text-gray-500 hover:bg-slate-200 hover:text-blue-600"
          }`}
        >
          <AnimatePresence mode="wait">
            {inCompare ? (
              <motion.span
                key="check"
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 90 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-center"
              >
                <Check className="w-4 h-4" />
              </motion.span>
            ) : (
              <motion.span
                key="compare"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center justify-center"
              >
                <GitCompare className="w-4 h-4" />
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      ) : (
        <button
          onClick={handleClick}
          className={`w-full h-10 text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 rounded-xl border ${
            inCompare
              ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200"
              : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
          }`}
        >
          <AnimatePresence mode="wait">
            {inCompare ? (
              <motion.span
                key="check-text"
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 90 }}
                transition={{ duration: 0.2 }}
                className="flex items-center shrink-0"
              >
                <Check className="w-3.5 h-3.5" />
              </motion.span>
            ) : (
              <motion.span
                key="compare-text"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center shrink-0"
              >
                <GitCompare className="w-3.5 h-3.5" />
              </motion.span>
            )}
          </AnimatePresence>
          <span>{inCompare ? "مضاف للمقارنة" : "قارن"}</span>
        </button>
      )}
    </div>
  );
}

