import React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  Calendar,
  Clock,
  User,
  Phone,
  MessageCircle,
  X,
  Package,
  Store,
  Cpu,
  ChevronRight,
  CalendarDays,
  Copy,
  Check,
  PackageSearch,
  MapPin,
} from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import { STORE_CONFIG } from '@/constants/store';
import { Link } from 'react-router-dom';

interface ReservationSuccessModalProps {
  open: boolean;
  onClose: () => void;
  orderCode?: string;
  items: Array<{
    productId: string;
    productName: string;
    price: number;
    quantity: number;
    image: string;
    selectedSize?: { label: string } | null;
    selectedColor?: string | null;
    selectedOptionGroups?: Array<{ groupName: string; optionLabel: string; extraPrice: number }> | null;
  }>;
  reservationInfo: {
    fullName: string;
    phoneNumber: string;
    appointmentDate: string;
    appointmentTime: string;
    notes?: string;
  } | null;
  totalAmount: number;
  whatsappUrl: string;
  supplierName?: string;
  supplierLogo?: string;
}

const ReservationSuccessModal: React.FC<ReservationSuccessModalProps> = ({
  open,
  onClose,
  orderCode,
  items,
  reservationInfo,
  totalAmount,
  whatsappUrl,
  supplierName,
  supplierLogo,
}) => {
  const storeName = supplierName || STORE_CONFIG.displayName || STORE_CONFIG.name;
  const [copied, setCopied] = React.useState(false);

  const handleCopyCode = () => {
    if (!orderCode) return;
    navigator.clipboard.writeText(orderCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Detect if this is a bundle reservation (builder)
  const isBundle = items.length === 1 && items[0]?.productId?.startsWith('bundle-');
  const bundleItem = isBundle ? items[0] : null;
  const bundleComponents = bundleItem?.selectedOptionGroups ?? [];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent
        className="w-[calc(100vw-1.5rem)] sm:max-w-md mx-auto p-0 overflow-hidden rounded-2xl border-0 focus:outline-none focus-visible:outline-none"
        style={{ boxShadow: '0 24px 60px -12px rgba(15,23,42,0.35)' }}
      >
        <VisuallyHidden><DialogTitle>تأكيد الحجز</DialogTitle></VisuallyHidden>

        {/* Close Button - Top Right */}
        <button
          onClick={onClose}
          type="button"
          aria-label="إغلاق النافذة"
          className="absolute top-3 right-3 z-50 p-1.5 rounded-full bg-white/20 hover:bg-white/40 text-white transition-all shadow-sm active:scale-90"
        >
          <X className="w-4 h-4 stroke-[2.5]" />
        </button>

        <div className="overflow-y-auto max-h-[88vh]" dir="rtl">

          {/* ── HEADER ── */}
          <div
            className="px-5 pt-6 pb-10 text-center relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.75) 100%)' }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_65%)]" />

            {/* Store branding strip */}
            <div className="relative z-10 flex items-center justify-center mb-3">
              <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 px-3 py-1 rounded-full">
                {supplierLogo ? (
                  <img src={supplierLogo} alt={storeName} className="w-3.5 h-3.5 object-contain rounded-full bg-white p-0.5" />
                ) : (
                  <Store className="w-3 h-3 text-white/90" />
                )}
                <span className="text-white/90 text-[10px] font-bold tracking-wide">{storeName}</span>
              </div>
            </div>

            {/* Animated Checkmark */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.08 }}
              className="relative z-10 inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/20 mb-3 mx-auto"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-md">
                <CheckCircle className="w-6 h-6" style={{ color: 'hsl(var(--primary))' }} strokeWidth={2.5} />
              </div>
            </motion.div>

            <h2 className="relative z-10 text-white text-lg font-black mb-1 drop-shadow">تم الحجز بنجاح! 🎉</h2>
            <p className="relative z-10 text-white/80 text-xs font-medium">
              📸 خذ سكرين شوت الآن لحفظ تفاصيل حجزك
            </p>
          </div>

          {/* ── BODY ── */}
          <div className="bg-slate-50 px-4 pb-5 -mt-5 relative z-10 space-y-3 pt-1">

            {/* ── Reservation Tracking Code Box ── */}
            {orderCode && (
              <div className="bg-white rounded-2xl border-2 border-primary/20 p-3.5 shadow-xs text-center">
                <div className="flex items-center justify-center gap-1 text-[11px] text-primary font-bold mb-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>كود الحجز لتأكيد وصولك للمحل</span>
                </div>
                <div className="flex items-center justify-center gap-2 bg-primary/5 rounded-xl py-2 px-3 border border-primary/15 mb-2">
                  <span className="font-mono text-base sm:text-lg font-black tracking-wider text-primary select-all">
                    {orderCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="p-1 rounded-md text-primary hover:bg-primary/10 transition-colors shrink-0"
                    title="نسخ الكود"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2 text-[11px] text-gray-500">
                  <span>يمكنك تأكيد وصولك للفرع بنقرة واحدة</span>
                  <Link
                    to={`/track-order?code=${encodeURIComponent(orderCode)}`}
                    onClick={onClose}
                    className="text-primary font-black hover:underline flex items-center gap-1 shrink-0"
                  >
                    <PackageSearch className="w-3.5 h-3.5" />
                    تتبع الحجز
                  </Link>
                </div>
              </div>
            )}

            {/* ── Bundle Card ── */}
            {isBundle && bundleItem ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Bundle header row */}
                <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-slate-100 bg-slate-50/80">
                  <Cpu className="w-4 h-4 shrink-0" style={{ color: 'hsl(var(--primary))' }} />
                  <span className="text-[11px] font-bold text-slate-700 flex-1">مكونات التجميعة المحجوزة</span>
                </div>

                {/* Bundle identity */}
                <div className="flex items-center gap-3 px-3.5 py-3 border-b border-slate-100">
                  {bundleItem.image && (
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                      <img src={bundleItem.image} alt={bundleItem.productName} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-800 font-black text-sm leading-snug">{bundleItem.productName}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: 'hsl(var(--primary)/0.1)', color: 'hsl(var(--primary))' }}
                      >
                        ×1
                      </span>
                      <span className="text-slate-900 font-black text-sm">{formatCurrency(bundleItem.price, 'جنيه')}</span>
                    </div>
                  </div>
                </div>

                {/* Components list */}
                {bundleComponents.length > 0 && (
                  <div className="divide-y divide-slate-50">
                    {bundleComponents.map((comp, i) => (
                      <div key={i} className="flex items-start gap-2 px-3.5 py-2.5">
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-bold text-slate-400 block leading-none mb-0.5">{comp.groupName}</span>
                          <span className="text-xs font-semibold text-slate-700 leading-snug">{comp.optionLabel}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* ── Regular Items (non-bundle) ── */
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-slate-100 bg-slate-50/80">
                  <Package className="w-4 h-4 shrink-0" style={{ color: 'hsl(var(--primary))' }} />
                  <span className="text-[11px] font-bold text-slate-700">المنتجات المحجوزة</span>
                </div>
                <div className="divide-y divide-slate-50">
                  {items.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 px-3.5 py-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                        {item.image
                          ? <img src={item.image} alt={item.productName} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><Package className="w-4 h-4 text-slate-300" /></div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-800 font-bold text-xs leading-snug">{item.productName}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.selectedSize && (
                            <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">{item.selectedSize.label}</span>
                          )}
                          {item.selectedColor && (
                            <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">{item.selectedColor}</span>
                          )}
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded font-bold"
                            style={{ background: 'hsl(var(--primary)/0.08)', color: 'hsl(var(--primary))' }}
                          >
                            ×{item.quantity}
                          </span>
                        </div>
                      </div>
                      <p className="text-slate-900 font-black text-xs shrink-0">{formatCurrency(item.price * item.quantity, 'جنيه')}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Reservation Info Card ── */}
            {reservationInfo && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-slate-100 bg-slate-50/80">
                  <CalendarDays className="w-4 h-4 shrink-0" style={{ color: 'hsl(var(--primary))' }} />
                  <span className="text-[11px] font-bold text-slate-700">تفاصيل موعد الحجز بالفرع</span>
                </div>

                {/* Name & Phone */}
                <div className="grid grid-cols-2 divide-x divide-x-reverse divide-slate-100 border-b border-slate-100">
                  <div className="px-3.5 py-3 flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[9px] text-slate-400 font-semibold mb-0.5">الاسم</p>
                      <p className="text-xs text-slate-800 font-bold truncate">{reservationInfo.fullName}</p>
                    </div>
                  </div>
                  <div className="px-3.5 py-3 flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[9px] text-slate-400 font-semibold mb-0.5">الهاتف</p>
                      <p className="text-xs text-slate-800 font-bold" dir="ltr">{reservationInfo.phoneNumber}</p>
                    </div>
                  </div>
                </div>

                {/* Appointment Date & Time */}
                <div className="grid grid-cols-2 divide-x divide-x-reverse divide-slate-100">
                  <div className="px-3.5 py-3 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[9px] text-slate-400 font-semibold mb-0.5">تاريخ الموعد</p>
                      <p className="text-xs font-black text-slate-800">{reservationInfo.appointmentDate}</p>
                    </div>
                  </div>
                  <div className="px-3.5 py-3 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[9px] text-slate-400 font-semibold mb-0.5">وقت الموعد</p>
                      <p className="text-xs font-black text-slate-800" dir="ltr">{reservationInfo.appointmentTime}</p>
                    </div>
                  </div>
                </div>

                {/* Notes (Only if entered by customer) */}
                {reservationInfo.notes && (
                  <div className="px-3.5 py-2.5 border-t border-slate-100 bg-amber-50/50">
                    <p className="text-[9px] text-amber-600 font-bold mb-0.5">ملاحظات</p>
                    <p className="text-[11px] text-slate-700 leading-relaxed">{reservationInfo.notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Total ── */}
            <div
              className="flex items-center justify-between px-4 py-3 rounded-2xl text-white"
              style={{ background: 'linear-gradient(135deg, hsl(var(--primary)/0.9) 0%, hsl(var(--primary)) 100%)' }}
            >
              <span className="text-white/90 text-sm font-bold">الإجمالي المستحق</span>
              <span className="text-lg font-black tracking-tight">{formatCurrency(totalAmount, 'جنيه')}</span>
            </div>

            {/* ── Store Footer ── */}
            <div className="flex items-center justify-center gap-2 py-0.5">
              <div className="h-px flex-1 bg-slate-200" />
              <div className="flex items-center gap-1 text-slate-400">
                {supplierLogo ? (
                  <img src={supplierLogo} alt={storeName} className="w-3.5 h-3.5 object-contain rounded-full bg-white p-0.5" />
                ) : (
                  <Store className="w-3 h-3" />
                )}
                <span className="text-[10px] font-semibold">{storeName}</span>
              </div>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            {/* ── WhatsApp Button ── */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-white text-sm transition-all active:scale-[0.98] shadow-md hover:opacity-95"
              style={{ background: 'linear-gradient(135deg,#25D366 0%,#128C7E 100%)' }}
            >
              <MessageCircle className="w-4 h-4" />
              تأكيد الحجز عبر واتساب
            </a>

            {/* ── Track Reservation & Confirm Arrival Button ── */}
            {orderCode && (
              <Link
                to={`/track-order?code=${encodeURIComponent(orderCode)}`}
                onClick={onClose}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-100/80 text-xs transition-all shadow-xs"
              >
                <PackageSearch className="w-4 h-4 text-primary" />
                تتبع الحجز وتأكيد الوصول للفرع
              </Link>
            )}

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReservationSuccessModal;
