'use client';

import React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Printer, X, Download, Share2 } from 'lucide-react';
import { BuilderPreset, BuilderOption } from '@/types/builder';
import { BuilderPrintSheet } from './BuilderPrintSheet';

interface SelectedComponentItem {
  stepId: string;
  stepName: string;
  stepNameEn?: string;
  option: BuilderOption;
}

interface BuilderPrintModalProps {
  open: boolean;
  onClose: () => void;
  preset: BuilderPreset;
  selectedItems: SelectedComponentItem[];
  originalPrice: number;
  totalPrice: number;
  savingsAmount: number;
  discountPercent: number;
  pdfNote?: string;
  customerName?: string;
  customerPhone?: string;
}

export const BuilderPrintModal: React.FC<BuilderPrintModalProps> = ({
  open,
  onClose,
  preset,
  selectedItems,
  originalPrice,
  totalPrice,
  savingsAmount,
  discountPercent,
  pdfNote,
  customerName,
  customerPhone,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent
        className="w-[calc(100vw-1.5rem)] sm:max-w-4xl mx-auto p-0 overflow-hidden rounded-2xl border-0 shadow-2xl print:hidden focus:outline-none"
        style={{ maxHeight: '92vh' }}
        dir="rtl"
      >
        <VisuallyHidden>
          <DialogTitle>معاينة وثيقة مواصفات التجميعة</DialogTitle>
        </VisuallyHidden>

        {/* Modal Toolbar */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                معاينة وثيقة عرض الأسعار والمواصفات
              </h3>
              <p className="text-[11px] text-slate-400">
                تصميم احترافي مخصص لمتجر بازار للموضه جاهز للطباعة أو الحفظ كـ PDF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة / حفظ كـ PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              aria-label="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Document Preview Container (Paper-like view) */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-slate-100/80 flex justify-center" style={{ maxHeight: 'calc(92vh - 65px)' }}>
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden w-full max-w-[210mm]">
            {/* Inline instance of the sheet with forced visible styling on screen */}
            <div className="print-modal-preview">
              <BuilderPrintSheet
                preset={preset}
                selectedItems={selectedItems}
                originalPrice={originalPrice}
                totalPrice={totalPrice}
                savingsAmount={savingsAmount}
                discountPercent={discountPercent}
                pdfNote={pdfNote}
                customerName={customerName}
                customerPhone={customerPhone}
                forceVisible={true}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BuilderPrintModal;
