'use client';

import React, { useEffect, useState, useMemo } from 'react';
import QRCode from 'qrcode';
import { STORE_CONFIG } from '@/constants/store';
import { BuilderPreset, BuilderOption } from '@/types/builder';
import {
  ShieldCheck,
  Wrench,
  Cpu,
  Phone,
  MapPin,
  Globe,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

interface SelectedComponentItem {
  stepId: string;
  stepName: string;
  stepNameEn?: string;
  option: BuilderOption;
}

interface BuilderPrintSheetProps {
  preset: BuilderPreset;
  selectedItems: SelectedComponentItem[];
  originalPrice: number;
  totalPrice: number;
  savingsAmount: number;
  discountPercent: number;
  pdfNote?: string;
  customerName?: string;
  customerPhone?: string;
  forceVisible?: boolean;
}

export const BuilderPrintSheet: React.FC<BuilderPrintSheetProps> = ({
  preset,
  selectedItems,
  originalPrice,
  totalPrice,
  savingsAmount,
  discountPercent,
  pdfNote,
  customerName,
  customerPhone,
  forceVisible = false,
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  // Fixed quotation code for this session
  const quotationRef = useMemo(() => {
    const presetCode = (preset?.id || 'PC').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
    const dateCode = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    return `BZR-${presetCode}-${dateCode}`;
  }, [preset?.id]);

  // Current Arabic & Gregorian formatted dates
  const currentDateAr = useMemo(() => {
    return new Intl.DateTimeFormat('ar-EG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  }, []);

  const currentDateEn = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  }, []);

  // Generate WhatsApp Order Link for the QR code
  useEffect(() => {
    const orderLines = selectedItems
      .map((item, idx) => `${idx + 1}. ${item.stepName}: ${item.option.name}`)
      .join('\n');

    const whatsappText =
      `طلب / استفسار عن تجميعة من موقع بازار للموضه:\n` +
      `------------------------\n` +
      `💻 التجميعة: ${preset?.title || 'تجميعة مخصصة'}\n` +
      `🔖 رقم العرض: #${quotationRef}\n` +
      `------------------------\n` +
      `القطع المختارة:\n${orderLines}\n` +
      `------------------------\n` +
      `💰 الإجمالي المطلوب: ${totalPrice.toLocaleString()} ج.م\n` +
      (customerName ? `👤 العميل: ${customerName}\n` : '') +
      (pdfNote ? `📝 ملاحظة: ${pdfNote}\n` : '') +
      `------------------------\n` +
      `يرجى تأكيد التوافر وتجهيز التجميعة.`;

    const phone = STORE_CONFIG.contact.whatsapp || '01024911062';
    const cleanPhone = phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('2') ? cleanPhone : `2${cleanPhone}`;
    const qrTargetUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(whatsappText)}`;

    QRCode.toDataURL(qrTargetUrl, {
      width: 130,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then(setQrCodeUrl)
      .catch((err) => console.error('Error generating QR Code:', err));
  }, [preset, selectedItems, quotationRef, totalPrice, customerName, pdfNote]);

  return (
    <div
      id={forceVisible ? undefined : "builder-print-sheet"}
      className={`${forceVisible ? 'block' : 'hidden print:block'} bg-white text-slate-900 font-sans p-4 max-w-[210mm] mx-auto box-border`}
      dir="rtl"
      style={{ width: '100%', maxWidth: '210mm' }}
    >
      {/* ── TOP ACCENT BAR ── */}
      <div className="h-1.5 w-full bg-gradient-to-r from-slate-900 via-amber-500 to-slate-900 rounded-full mb-4" />

      {/* ── HEADER ── */}
      <div className="flex items-start justify-between border-b-2 border-slate-900/90 pb-3 mb-4">
        {/* Right (RTL): Brand & Store Info */}
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl border border-slate-200 bg-slate-50 p-1 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
            <img
              src="/logo3.png"
              alt="bazar fashion"
              className="w-full h-full object-contain"
              onError={(e) => {
                // Fallback if image fails to render
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-950 tracking-tight">
                بازار للموضه
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 text-amber-400 tracking-wider uppercase">
                Official Quote
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-600 mt-0.5 tracking-wide">
              bazar fashion • SPECIALIZED PC BUILDS & HARDWARE
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              مدينة نصر - القاهرة • هاتف ومبيعات: {STORE_CONFIG.contact.phone}
            </p>
          </div>
        </div>

        {/* Left (RTL): Quotation Meta & Reference */}
        <div className="text-left" dir="ltr">
          <div className="inline-block bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Ref No:</span>
              <span className="font-mono font-bold text-slate-900">#{quotationRef}</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
              <span>{currentDateEn}</span>
              <span>•</span>
              <span dir="rtl">{currentDateAr}</span>
            </div>
            <div className="text-[9px] font-bold text-emerald-700 bg-emerald-50 rounded px-1.5 py-0.5 mt-1 text-center border border-emerald-200">
              ✓ تسعير وتوافق معتمد (Verified Specs)
            </div>
          </div>
        </div>
      </div>

      {/* ── BUILD TITLE & META STRIP ── */}
      <div className="bg-gradient-to-l from-slate-900 to-slate-800 text-white rounded-xl p-3.5 mb-4 shadow-sm flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
              {preset.categoryLabel || 'تجميعة كمبيوتر احترافية'}
            </span>
            <span className="text-slate-500 text-xs">•</span>
            <span className="text-xs text-slate-300">
              {selectedItems.length} مكونات رئيسية
            </span>
          </div>
          <h2 className="text-lg font-black text-white mt-0.5">
            تجميعة: {preset.title}
          </h2>
        </div>

        <div className="text-left bg-white/10 backdrop-blur-sm border border-white/10 px-3 py-1.5 rounded-lg">
          <span className="text-[9px] font-medium text-slate-300 block">الإجمالي المعتمد</span>
          <span className="text-base font-black text-amber-400">
            {totalPrice.toLocaleString()} <span className="text-[11px] font-normal text-white">ج.م</span>
          </span>
        </div>
      </div>

      {/* ── SPECIFICATIONS TABLE ── */}
      <div className="border border-slate-200 rounded-xl overflow-hidden mb-4 shadow-sm">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white text-[11px] font-bold">
              <th className="py-2.5 px-3 w-8 text-center border-l border-slate-800">#</th>
              <th className="py-2.5 px-3 w-36 border-l border-slate-800">المكوّن / الفئة</th>
              <th className="py-2.5 px-3">اسم القطعة والمواصفات الكاملة</th>
              <th className="py-2.5 px-2 w-12 text-center border-r border-slate-800">الكمية</th>
              <th className="py-2.5 px-3 w-24 text-left border-r border-slate-800">سعر الوحدة</th>
              <th className="py-2.5 px-3 w-24 text-left">الإجمالي</th>
            </tr>
          </thead>
          <tbody className="text-xs divide-y divide-slate-100">
            {selectedItems.map((item, index) => (
              <tr
                key={item.stepId}
                className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}
              >
                {/* Index */}
                <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px] border-l border-slate-100">
                  {index + 1}
                </td>

                {/* Category / Step */}
                <td className="py-2 px-3 border-l border-slate-100">
                  <div className="font-bold text-slate-800 text-[11px]">{item.stepName}</div>
                  {item.stepNameEn && (
                    <div className="text-[9px] text-slate-400 font-medium uppercase tracking-wide">
                      {item.stepNameEn}
                    </div>
                  )}
                </td>

                {/* Product Specification & Thumbnail */}
                <td className="py-2 px-3">
                  <div className="flex items-center gap-2.5">
                    {item.option.image ? (
                      <img
                        src={item.option.image}
                        alt={item.option.name}
                        className="w-8 h-8 rounded-md object-contain bg-white border border-slate-200 p-0.5 shrink-0"
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                        <Cpu className="w-4 h-4 text-slate-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 text-[11px] leading-snug">
                        {item.option.name}
                      </div>
                      {item.option.brand && (
                        <span className="inline-block text-[9px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded mt-0.5">
                          {item.option.brand}
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                {/* Quantity */}
                <td className="py-2 px-2 text-center font-bold text-slate-700 text-xs border-r border-slate-100">
                  1
                </td>

                {/* Unit Price */}
                <td className="py-2 px-3 text-left font-semibold text-slate-600 text-xs border-r border-slate-100" dir="ltr">
                  {item.option.price.toLocaleString()} <span className="text-[10px] text-slate-400">EGP</span>
                </td>

                {/* Total */}
                <td className="py-2 px-3 text-left font-black text-slate-950 text-xs" dir="ltr">
                  {item.option.price.toLocaleString()} <span className="text-[10px] text-slate-500 font-normal">EGP</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── FINANCIAL SUMMARY & QR CODE SECTION ── */}
      <div className="grid grid-cols-12 gap-3 mb-4 items-stretch">
        {/* Financial Summary Card (7 cols) */}
        <div className="col-span-7 bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-200/80">
              <span className="text-slate-500 font-medium">سعر القطع الفردية (Original Total):</span>
              <span className={`font-bold ${savingsAmount > 0 ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                {originalPrice.toLocaleString()} ج.م
              </span>
            </div>

            {savingsAmount > 0 && (
              <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-200/80">
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>خصم التجميعة المعتمدة (You Save):</span>
                </span>
                <span className="font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded text-[11px]">
                  - {savingsAmount.toLocaleString()} ج.م ({discountPercent}%)
                </span>
              </div>
            )}
          </div>

          {/* Final Total Banner */}
          <div className="mt-3 bg-slate-950 text-white rounded-lg p-2.5 px-3 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[10px] text-slate-300 font-medium block">
                الإجمالي النهائي الشامل للتجميع والضمان
              </span>
              <span className="text-xs text-amber-400 font-semibold">
                Total Amount Payable
              </span>
            </div>
            <div className="text-left" dir="ltr">
              <span className="text-xl font-black text-amber-400">
                {totalPrice.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-white ml-1">EGP</span>
            </div>
          </div>
        </div>

        {/* Dynamic WhatsApp / Order Verification QR Code (5 cols) */}
        <div className="col-span-5 bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
          <div className="w-24 h-24 shrink-0 bg-slate-50 border border-slate-200 rounded-lg p-1 flex items-center justify-center">
            {qrCodeUrl ? (
              <img
                src={qrCodeUrl}
                alt="Order QR Code"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full bg-slate-100 rounded animate-pulse" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <span className="inline-block text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 mb-1">
              QR Fast Order
            </span>
            <p className="text-[11px] font-bold text-slate-900 leading-tight">
              امسح الكود بكاميرا هاتفك
            </p>
            <p className="text-[9px] text-slate-500 leading-relaxed mt-0.5">
              لفتح مواصفات التجميعة وطلبها مباشرة عبر واتساب مع فريق المبيعات.
            </p>
            <div className="text-[10px] font-bold text-slate-700 mt-1 flex items-center gap-1" dir="ltr">
              <Phone className="w-3 h-3 text-slate-400" />
              <span>+20 102 491 1062</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── OPTIONAL NOTES SECTION ── */}
      {pdfNote && pdfNote.trim() && (
        <div className="mb-3 bg-amber-50/70 border border-amber-200/80 rounded-xl p-2.5 px-3">
          <div className="flex items-center gap-1.5 text-amber-900 font-bold text-[11px] mb-0.5">
            <span>📝 ملاحظات خاصة بالطلب / التقرير:</span>
          </div>
          <p className="text-xs text-amber-950 leading-relaxed whitespace-pre-line">
            {pdfNote.trim()}
          </p>
        </div>
      )}

      {/* ── GUARANTEE & STORE SERVICES STRIP ── */}
      <div className="grid grid-cols-3 gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2.5 mb-3 text-center">
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-700 font-bold">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>قطع أصلية 100% بضمان الوكلاء المعتمدين</span>
        </div>
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-700 font-bold border-x border-slate-200 px-2">
          <Wrench className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>تجميع احترافي مجاني وتنظيم أسلاك دقيق</span>
        </div>
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-700 font-bold">
          <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>فحص استقرار وضغط وتحديث BIOS مجاناً</span>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div className="border-t border-slate-200 pt-2.5 flex items-center justify-between text-[10px] text-slate-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-slate-400" />
            <span>مول البستان وسط البلد - بجوار مترو انور السادات</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Phone className="w-3 h-3 text-slate-400" />
            <span>01024911062</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Globe className="w-3 h-3 text-slate-400" />
            <span>bazar-fashion.com</span>
          </span>
        </div>

        <div className="text-[9px] text-slate-400">
          تم إصدار هذا العرض إلكترونياً من منصة بازار للموضه
        </div>
      </div>
    </div>
  );
};

export default BuilderPrintSheet;
