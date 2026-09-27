'use client';

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, GitCompare, Trash2 } from "lucide-react";
import { useCompareStore } from "@/store/useCompareStore";
import { createPortal } from "react-dom";

export function CompareBar() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { compareList, removeFromCompare, clearCompare, openCompare, isCompareOpen } =
    useCompareStore();

  const count = compareList.length;
  const canCompare = count >= 2;

  if (!mounted || count === 0 || isCompareOpen) return null;

  const bar = (
    <AnimatePresence>
      {count > 0 && !isCompareOpen && (
        <motion.div
          key="compare-bar"
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
          className="compare-bar fixed bottom-0 left-0 right-0 z-[9990]"
          dir="rtl"
        >
          {/* Glassmorphism container */}
          <div className="compare-bar-inner mx-auto max-w-4xl flex items-center gap-3 px-4 md:px-6 py-3 md:py-4">
            {/* Label */}
            <div className="hidden md:flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-gray-600">مقارنة</span>
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center">
                {count}
              </span>
            </div>

            {/* Products thumbnails */}
            <div className="flex items-center gap-3 flex-1 overflow-x-auto py-2 px-2 scrollbar-none">
              {compareList.map((product) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="compare-thumb relative shrink-0 group"
                >
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl bg-white border border-gray-200 overflow-hidden shadow-sm">
                    <img
                      src={product.images?.[0] || "/placeholder.svg"}
                      alt={product.name}
                      className="w-full h-full object-contain p-1.5 mix-blend-multiply"
                      loading="lazy"
                    />
                  </div>
                  {/* Remove button */}
                  <button
                    onClick={() => removeFromCompare(product.id)}
                    className="absolute -top-1 -left-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md md:opacity-0 md:group-hover:opacity-100 transition-opacity z-20"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                  {/* Product name tooltip */}
                  <p className="absolute bottom-full mb-2 right-1/2 translate-x-1/2 text-[10px] font-semibold text-white bg-gray-900/90 px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 max-w-[120px] truncate">
                    {product.name}
                  </p>
                </motion.div>
              ))}

              {/* Empty slots */}
              {Array.from({ length: Math.max(0, 4 - count) }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="w-14 h-14 md:w-16 md:h-16 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center shrink-0"
                >
                  <span className="text-gray-300 text-xl">+</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Clear button */}
              <button
                onClick={clearCompare}
                title="مسح المقارنة"
                className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-500 flex items-center justify-center transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {/* Compare button */}
              <motion.button
                whileHover={canCompare ? { scale: 1.03 } : {}}
                whileTap={canCompare ? { scale: 0.97 } : {}}
                onClick={canCompare ? openCompare : undefined}
                disabled={!canCompare}
                className={`compare-now-btn flex items-center gap-2 px-4 md:px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  canCompare
                    ? "bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90 cursor-pointer"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              >
                <GitCompare className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {canCompare ? "قارن الآن" : `أضف منتجاً آخر`}
                </span>
                {canCompare && (
                  <span className="inline sm:hidden text-xs">قارن</span>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(bar, document.body);
}
