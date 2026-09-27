'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Package,
  Truck,
  Store,
  MapPin,
  Calendar,
  Clock,
  Phone,
  User,
  Copy,
  Check,
  AlertCircle,
  RefreshCw,
  Trash2,
  ChevronRight,
  MessageCircle,
  CheckCircle2,
  Cpu,
  ArrowRight,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/utils/format';
import { STORE_CONFIG } from '@/constants/store';
import {
  fetchOrderByTrackingCode,
  searchOrdersByCodeOrPhone,
  getTrackedOrders,
  saveTrackedOrder,
  confirmStoreArrival,
  confirmOnTheWay,
  confirmPurchase,
  removeTrackedOrder,
  TrackedOrderSummary,
} from '@/utils/orderTracking';

export default function TrackOrder() {
  const location = useLocation();
  const navigate = useNavigate();

  const [searchCode, setSearchCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrderIndex, setSelectedOrderIndex] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [recentOrders, setRecentOrders] = useState<TrackedOrderSummary[]>([]);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isConfirmingArrival, setIsConfirmingArrival] = useState(false);
  const [isConfirmingOnTheWay, setIsConfirmingOnTheWay] = useState(false);
  const [isConfirmingPurchase, setIsConfirmingPurchase] = useState(false);
  const [purchaseConfirmedAt, setPurchaseConfirmedAt] = useState<Date | null>(null);

  const activeOrder = orders[selectedOrderIndex] || orders[0] || null;

  // Load recent orders from localStorage
  const refreshRecentOrders = useCallback(() => {
    setRecentOrders(getTrackedOrders());
  }, []);

  useEffect(() => {
    refreshRecentOrders();
    const handleStorageUpdate = () => refreshRecentOrders();
    window.addEventListener('bazar_tracked_orders_updated', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);
    return () => {
      window.removeEventListener('bazar_tracked_orders_updated', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, [refreshRecentOrders]);

  // Handle URL query parameter ?code=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search || location.search);
    const codeFromUrl = params.get('code');
    if (codeFromUrl && codeFromUrl.trim()) {
      setSearchCode(codeFromUrl.trim());
      handleLookup(codeFromUrl.trim());
    }
  }, []);

  // Lookup orders by code or phone number
  const handleLookup = async (codeToLookup?: string) => {
    const query = (codeToLookup || searchCode).trim();
    if (!query) {
      toast.error('يرجى كتابة كود الطلب أو رقم الهاتف أولاً');
      return;
    }

    setLoading(true);
    setHasSearched(true);
    try {
      const results = await searchOrdersByCodeOrPhone(query);
      if (results && results.length > 0) {
        setOrders(results);
        setSelectedOrderIndex(0);

        // Auto-save found orders to recent tracked orders
        results.forEach((res) => {
          if (res.orderCode) {
            saveTrackedOrder({
              orderCode: res.orderCode,
              orderId: res.id,
              type: res.type === 'reservation' ? 'reservation' : 'online',
              total: res.total || 0,
              createdAt: res.createdAt?.toDate ? res.createdAt.toDate().toISOString() : new Date(res.createdAt || Date.now()).toISOString(),
              itemsCount: res.items?.length || 0,
              customerName: res.deliveryInfo?.fullName || res.reservationInfo?.fullName || 'عميل',
              customerPhone: res.deliveryInfo?.phoneNumber || res.reservationInfo?.phoneNumber,
              status: res.status || 'pending',
              customerArrived: res.customerArrived,
            });
          }
        });
        refreshRecentOrders();

        if (results.length === 1) {
          if (results[0].orderCode) {
            setSearchCode(results[0].orderCode);
          }
          toast.success('تم العثور على الطلب بنجاح');
        } else {
          toast.success(`تم العثور على ${results.length} طلبات مسجلة لهذا الرقم`);
        }
      } else {
        setOrders([]);
        setSelectedOrderIndex(0);
        toast.error('لم يتم العثور على أي طلب مسجل بهذا الكود أو رقم الهاتف');
      }
    } catch (err) {
      console.error('Error fetching order:', err);
      toast.error('حدث خطأ أثناء البحث عن الطلب. يرجى المحاولة لاحقاً.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    toast.success('تم نسخ كود الطلب بنجاح');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Confirm arrival for reservations
  const handleConfirmArrival = async () => {
    if (!activeOrder || !activeOrder.id) return;
    setIsConfirmingArrival(true);
    try {
      const res = await confirmStoreArrival(activeOrder.id, activeOrder.orderCode);
      if (res.success) {
        setOrders((prev) =>
          prev.map((ord, idx) =>
            idx === selectedOrderIndex
              ? {
                ...ord,
                status: 'arrived',
                customerArrived: true,
                arrivedAt: res.arrivedAt,
              }
              : ord
          )
        );
        toast.success('تم تأكيد وصولك إلى المحل بنجاح! نرحب بك وسيقوم موظف الفرع بخدمتك فوراً 🎉');
      } else {
        toast.error(res.error || 'فشل تأكيد الوصول، يرجى المحاولة مجدداً');
      }
    } catch (error) {
      console.error('Error confirming arrival:', error);
      toast.error('حدث خطأ أثناء تأكيد الوصول');
    } finally {
      setIsConfirmingArrival(false);
    }
  };

  const handleRemoveRecent = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    removeTrackedOrder(code);
    refreshRecentOrders();
    toast.info('تمت إزالة الطلب من القائمة المحفوظة');
  };

  const getStatusText = (status: string) => {
    const map: Record<string, string> = {
      pending: 'قيد الانتظار',
      confirmed: 'تم استلام الطلب',
      processing: 'قيد التجهيز',
      shipped: 'تم الشحن',
      delivered: 'تم التوصيل',
      cancelled: 'ملغي',
      arrived: 'تم وصول العميل 📍',
    };
    return map[status] || status;
  };

  // Stepper calculations
  const isReservation = activeOrder?.type === 'reservation' || !!activeOrder?.reservationInfo;

  const getShippingStepIndex = (status: string) => {
    switch (status) {
      case 'delivered':
        return 3;
      case 'shipped':
        return 2;
      case 'processing':
        return 1;
      case 'confirmed':
      case 'pending':
        return 0;
      case 'cancelled':
        return -1;
      default:
        return 0;
    }
  };

  const getReservationStepIndex = (status: string) => {
    if (status === 'cancelled') return -1;
    if (status === 'delivered') return 3;
    if (status === 'arrived') return 2;
    if (status === 'on_the_way') return 1;
    if (status === 'confirmed' || status === 'processing') return 1;
    return 0;
  };

  const currentStep = isReservation
    ? getReservationStepIndex(activeOrder?.status || 'pending')
    : getShippingStepIndex(activeOrder?.status || 'pending');

  const storePhone = activeOrder?.supplierPhone || STORE_CONFIG.contact.phone || '01024911062';
  const cleanPhone = storePhone.replace(/\D/g, '').replace(/^0/, '20');
  const whatsappHelpUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    `مرحباً، أود الاستفسار عن ${isReservation ? 'حجزي' : 'طلبي'} رقم: ${activeOrder?.orderCode || activeOrder?.id || ''}`
  )}`;

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20 pt-6 px-4 md:px-8" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ── Breadcrumb & Title ── */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Link to="/" className="hover:text-primary transition-colors">الرئيسية</Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 rotate-180" />
            <span className="text-primary font-bold">تتبع الطلبات والحجوزات</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-gray-100 shadow-xs">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2.5">
                <span className="p-2 rounded-2xl bg-primary/10 text-primary">
                  <Package className="w-6 h-6" />
                </span>
                تتبع حالة الطلب والحجز
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">
                أدخل كود الطلب أو رقم الهاتف المسجل به لمعرفة الحالة ومتابعة مراحل الطلب
              </p>
            </div>

            {activeOrder && (
              <button
                type="button"
                onClick={() => handleLookup()}
                disabled={loading}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-all self-start sm:self-center"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                تحديث البيانات
              </button>
            )}
          </div>
        </div>

        {/* ── Search Bar Card ── */}
        <div className="bg-white p-4 sm:p-6 rounded-3xl border border-gray-100 shadow-xs">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLookup();
            }}
            className="flex flex-col sm:flex-row gap-2.5"
          >
            <div className="relative flex-1">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                placeholder="أدخل كود الطلب (مثل BZ-481920) أو رقم الهاتف المسجل به..."
                className="w-full h-12 pr-11 pl-4 rounded-2xl border border-gray-200 bg-gray-50/50 text-xs sm:text-sm font-bold text-gray-900 placeholder:text-gray-400 placeholder:text-[11px] sm:placeholder:text-sm outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="h-12 px-7 rounded-2xl font-extrabold text-sm text-white bg-primary hover:bg-primary/90 transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  جاري البحث...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  تتبع الطلب
                </>
              )}
            </button>
          </form>

          {/* Quick Helper Note */}
          <div className="flex items-center gap-1.5 mt-3 text-[11px] sm:text-xs text-gray-500 font-medium">
            <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>يمكنك البحث باستخدام <strong>كود الطلب</strong> أو <strong>رقم الهاتف</strong> الذي سجلت به الطلب.</span>
          </div>

          {/* ── Recent Orders from LocalStorage ── */}
          {recentOrders.length > 0 && (
            <div className="mt-5 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  طلباتك المحفوظة على هذا الجهاز ({recentOrders.length})
                </span>
                <span className="text-[11px] text-gray-400">انقر للعرض المباشر</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {recentOrders.map((rec) => {
                  const isSelected = activeOrder?.orderCode === rec.orderCode;
                  return (
                    <div
                      key={rec.orderCode}
                      onClick={() => {
                        setSearchCode(rec.orderCode);
                        handleLookup(rec.orderCode);
                      }}
                      className={`group relative flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${isSelected
                          ? 'bg-primary/5 border-primary/40 ring-2 ring-primary/20 shadow-xs'
                          : 'bg-gray-50/70 hover:bg-white border-gray-150 hover:border-primary/30 hover:shadow-sm'
                        }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-black text-gray-900 group-hover:text-primary transition-colors">
                            {rec.orderCode}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${rec.type === 'reservation'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-blue-100 text-blue-700'
                              }`}
                          >
                            {rec.type === 'reservation' ? 'حجز' : 'شحن'}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 font-medium truncate mt-0.5">
                          {formatCurrency(rec.total, 'جنيه')} • {new Date(rec.createdAt).toLocaleDateString('ar-EG')}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleRemoveRecent(e, rec.orderCode)}
                        title="إزالة من المحفوظات"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0 ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Search Results ── */}
        <AnimatePresence mode="wait">
          {activeOrder && (
            <motion.div
              key={activeOrder.id || activeOrder.orderCode}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="space-y-6"
            >
              {/* ── Multiple Orders Selector (When more than 1 order found for phone) ── */}
              {orders.length > 1 && (
                <div className="bg-white rounded-3xl border border-primary/20 p-4 sm:p-5 shadow-xs space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-xs shrink-0 ring-2 ring-primary/20">
                        {orders.length}
                      </span>
                      <div>
                        <h3 className="text-sm sm:text-base font-black text-gray-900">
                          الطلبات المسجلة لهذا الرقم ({orders.length} طلبات)
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          انقر على أي طلب من القائمة أدناه لعرض مراحل تتبعه وتفاصيله
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Responsive Order Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                    {orders.map((ord, idx) => {
                      const isSelected = idx === selectedOrderIndex;
                      const isRes = ord.type === 'reservation' || !!ord.reservationInfo;
                      const ordCode = ord.orderCode || ord.id.slice(-8);

                      return (
                        <button
                          key={ord.id || idx}
                          type="button"
                          onClick={() => setSelectedOrderIndex(idx)}
                          className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between relative cursor-pointer ${isSelected
                              ? 'bg-primary/5 border-primary ring-2 ring-primary/20 shadow-xs'
                              : 'bg-gray-50/70 hover:bg-white border-gray-200/80 hover:border-primary/30 hover:shadow-xs'
                            }`}
                        >
                          <div className="flex items-center justify-between gap-2 w-full mb-2">
                            <span className="font-mono text-xs sm:text-sm font-black text-primary" dir="ltr">
                              #{ordCode}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isRes
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-blue-100 text-blue-800'
                                }`}
                            >
                              {isRes ? 'حجز بالفرع' : 'شحن أونلاين'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs w-full text-gray-600 mb-1">
                            <span className="font-semibold text-gray-700">{getStatusText(ord.status)}</span>
                            <span className="font-black text-gray-900">
                              {formatCurrency(ord.total, 'جنيه')}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-gray-400 w-full pt-2 border-t border-gray-150/60 mt-1">
                            <span>{ord.createdAt?.toDate ? formatDate(ord.createdAt.toDate()) : formatDate(ord.createdAt)}</span>
                            <span>{ord.items?.length || 1} منتجات</span>
                          </div>

                          {isSelected && (
                            <span className="text-[10px] font-bold text-primary flex items-center justify-center gap-1 mt-2 pt-1.5 border-t border-primary/10">
                              <Check className="w-3.5 h-3.5" /> معروض حالياً
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Order Header Banner ── */}
              <div className="bg-white rounded-3xl border border-gray-100 p-5 sm:p-6 shadow-xs relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-gray-400">كود الطلب:</span>
                      <span className="font-mono text-lg font-black text-primary bg-primary/5 border border-primary/20 px-3 py-1 rounded-xl flex items-center gap-2 select-all">
                        {activeOrder.orderCode || activeOrder.id}
                        <button
                          type="button"
                          onClick={() => handleCopyCode(activeOrder.orderCode || activeOrder.id)}
                          title="نسخ الكود"
                          className="text-primary hover:text-primary/70 transition-colors"
                        >
                          {copiedCode ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </span>
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full ${isReservation
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                          }`}
                      >
                        {isReservation ? '📅 حجز واستلام من المحل' : '🚚 شحن وتوصيل أونلاين'}
                      </span>
                    </div>

                    <p className="text-xs text-gray-400 font-medium">
                      تاريخ التسجيل:{' '}
                      {activeOrder.createdAt?.toDate
                        ? activeOrder.createdAt.toDate().toLocaleString('ar-EG')
                        : new Date(activeOrder.createdAt || Date.now()).toLocaleString('ar-EG')}
                    </p>
                  </div>

                  {/* Supplier/Store Badge */}
                  {(activeOrder.supplierName || STORE_CONFIG.name) && (
                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200/80 px-3.5 py-2 rounded-2xl shrink-0 self-start sm:self-center">
                      <Store className="w-4 h-4 text-gray-600" />
                      <div className="text-right">
                        <span className="text-[10px] text-gray-400 block leading-none">المحل / المورد</span>
                        <span className="text-xs font-extrabold text-gray-800">
                          {activeOrder.supplierName || STORE_CONFIG.displayName || STORE_CONFIG.name}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Status Stepper ── */}
              <div className="bg-white rounded-3xl border border-gray-100 p-5 sm:p-6 shadow-xs space-y-4">
                <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  مراحل متابعة الطلب
                </h3>

                {activeOrder.status === 'cancelled' ? (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center text-red-700">
                    <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                    <p className="font-extrabold text-sm">تم إلغاء هذا الطلب</p>
                    <p className="text-xs text-red-600/80 mt-1">يرجى التواصل مع إدارة المتجر إذا كان لديك أي استفسار.</p>
                  </div>
                ) : isReservation ? (
                  /* Reservation Stepper */
                  <div className="relative py-2">
                    <div className="grid grid-cols-4 gap-2 text-center">
                      {[
                        { title: 'تسجيل الحجز', desc: 'تم استلام طلب الحجز' },
                        { title: 'في الطريق', desc: 'العميل في طريقه للمحل' },
                        { title: 'وصلت المحل', desc: 'تم التواجد بالمحل' },
                        { title: 'تأكيد الشراء', desc: 'تم الشراء وتفعيل الضمان' },
                      ].map((step, idx) => {
                        const isDone = currentStep >= idx;
                        const isCurrent = currentStep === idx;
                        return (
                          <div key={idx} className="flex flex-col items-center relative">
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-xs ${isDone
                                  ? 'bg-primary text-white ring-4 ring-primary/15'
                                  : 'bg-gray-100 text-gray-400'
                                }`}
                            >
                              {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : idx + 1}
                            </div>
                            <span
                              className={`text-[11px] sm:text-xs font-extrabold mt-2 ${isCurrent ? 'text-primary' : isDone ? 'text-gray-800' : 'text-gray-400'
                                }`}
                            >
                              {step.title}
                            </span>
                            <span className="text-[9px] sm:text-[10px] text-gray-400 hidden sm:block">
                              {step.desc}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* Online Shipping Stepper */
                  <div className="relative py-2">
                    <div className="grid grid-cols-4 gap-2 text-center">
                      {[
                        { title: 'تم استلام الطلب', desc: 'قيد المراجعة' },
                        { title: 'قيد التجهيز', desc: 'تغليف وتجهيز' },
                        { title: 'تم الشحن', desc: 'مع مندوب الشحن' },
                        { title: 'تم التوصيل', desc: 'تم الاستلام بنجاح' },
                      ].map((step, idx) => {
                        const isDone = currentStep >= idx;
                        const isCurrent = currentStep === idx;
                        return (
                          <div key={idx} className="flex flex-col items-center relative">
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-xs ${isDone
                                  ? 'bg-primary text-white ring-4 ring-primary/15'
                                  : 'bg-gray-100 text-gray-400'
                                }`}
                            >
                              {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : idx + 1}
                            </div>
                            <span
                              className={`text-[11px] sm:text-xs font-extrabold mt-2 ${isCurrent ? 'text-primary' : isDone ? 'text-gray-800' : 'text-gray-400'
                                }`}
                            >
                              {step.title}
                            </span>
                            <span className="text-[9px] sm:text-[10px] text-gray-400 hidden sm:block">
                              {step.desc}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* ── RESERVATION ACTIONS (For Reservations) ── */}
              {isReservation && activeOrder.status !== 'cancelled' && activeOrder.status !== 'delivered' && (
                <div className="space-y-4">

                  {/* Step 1: Customer NOT yet on the way — show "I'm on the way" button */}
                  {(activeOrder.status === 'pending' || activeOrder.status === 'confirmed') && (
                    <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100/50 rounded-3xl border-2 border-blue-200 p-5 sm:p-6 shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <h4 className="text-base font-black text-blue-950 flex items-center gap-2">
                            <Truck className="w-5 h-5 text-blue-600" />
                            هل ستتوجه إلى المحل قريباً؟
                          </h4>
                          <p className="text-xs sm:text-sm text-blue-800 leading-relaxed font-medium">
                            اضغط على الزر عند توجهك للمحل لاستلام طلبك. سيتم إشعار موظفينا بأنك في الطريق.
                          </p>
                          <p className="text-[11px] text-indigo-700 font-bold flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            سيتم تفعيل ضمان bazar fashion من لحظة تأكيد الشراء
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!activeOrder?.id) return;
                            setIsConfirmingOnTheWay(true);
                            try {
                              const res = await confirmOnTheWay(activeOrder.id, activeOrder.orderCode);
                              if (res.success) {
                                setOrders((prev) =>
                                  prev.map((ord, idx) =>
                                    idx === selectedOrderIndex ? { ...ord, status: 'on_the_way' } : ord
                                  )
                                );
                                toast.success('تم تسجيل أنك في الطريق! سيقوم فريقنا بالتحضير لاستقبالك 🚗');
                              } else {
                                toast.error(res.error || 'فشل التحديث');
                              }
                            } catch {
                              toast.error('حدث خطأ، يرجى المحاولة مجدداً');
                            } finally {
                              setIsConfirmingOnTheWay(false);
                            }
                          }}
                          disabled={isConfirmingOnTheWay}
                          className="h-12 px-6 rounded-2xl font-black text-sm text-white transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 shrink-0 bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
                        >
                          {isConfirmingOnTheWay ? (
                            <><RefreshCw className="w-4 h-4 animate-spin" />جاري التسجيل...</>
                          ) : (
                            <><Truck className="w-4 h-4" />أنا في الطريق الآن</>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 2: on_the_way — show "Confirm Arrival" */}
                  {activeOrder.status === 'on_the_way' && (
                    <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100/50 rounded-3xl border-2 border-emerald-200 p-5 sm:p-6 shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <h4 className="text-base font-black text-emerald-950 flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-emerald-600" />
                            هل وصلت إلى مقر المحل الآن؟
                          </h4>
                          <p className="text-xs sm:text-sm text-emerald-800 leading-relaxed font-medium">
                            اضغط عند تواجدك في المحل لتسجيل وصولك وتجهيز استلامك دون أي انتظار.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleConfirmArrival}
                          disabled={isConfirmingArrival}
                          className="h-12 px-6 rounded-2xl font-black text-sm text-white transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 shrink-0 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {isConfirmingArrival ? (
                            <><RefreshCw className="w-4 h-4 animate-spin" />جاري التأكيد...</>
                          ) : (
                            <><CheckCircle2 className="w-4 h-4" />تأكيد وصولي إلى المحل الآن</>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 3: arrived — show "Confirm Purchase" */}
                  {activeOrder.status === 'arrived' && (
                    <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100/50 rounded-3xl border-2 border-amber-300 p-5 sm:p-6 shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1.5">
                          <h4 className="text-base font-black text-amber-950 flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-amber-600" />
                            تأكيد إتمام الشراء وتفعيل الضمان
                          </h4>
                          <p className="text-xs sm:text-sm text-amber-800 leading-relaxed font-medium">
                            اضغط على الزر بعد إتمام عملية الشراء من المحل لتفعيل ضمان{' '}
                            <strong>bazar fashion</strong> الخاص بك فوراً.
                          </p>
                          <p className="text-[11px] text-amber-700 font-bold">
                            ⚠️ تأكد من أن التاريخ على الفاتورة يطابق تاريخ اليوم لصحة الضمان.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!activeOrder?.id) return;
                            setIsConfirmingPurchase(true);
                            try {
                              const res = await confirmPurchase(activeOrder.id, activeOrder.orderCode);
                              if (res.success) {
                                setPurchaseConfirmedAt(res.purchasedAt);
                                setOrders((prev) =>
                                  prev.map((ord, idx) =>
                                    idx === selectedOrderIndex
                                      ? { ...ord, status: 'delivered', purchasedAt: res.purchasedAt, warrantyActivated: true }
                                      : ord
                                  )
                                );
                                toast.success('تم تأكيد الشراء وتفعيل ضمانك بنجاح! 🎉🛡️');
                              } else {
                                toast.error(res.error || 'فشل تأكيد الشراء');
                              }
                            } catch {
                              toast.error('حدث خطأ، يرجى المحاولة مجدداً');
                            } finally {
                              setIsConfirmingPurchase(false);
                            }
                          }}
                          disabled={isConfirmingPurchase}
                          className="h-12 px-6 rounded-2xl font-black text-sm text-white transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 shrink-0 bg-amber-600 hover:bg-amber-700 disabled:opacity-60"
                        >
                          {isConfirmingPurchase ? (
                            <><RefreshCw className="w-4 h-4 animate-spin" />جاري التأكيد...</>
                          ) : (
                            <><ShieldCheck className="w-4 h-4" />تم الشراء — فعّل ضماني الآن</>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 4: delivered — warranty activated banner */}
                  {activeOrder.status === 'delivered' && (
                    <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-green-100/50 rounded-3xl border-2 border-green-300 p-5 sm:p-6 shadow-xs">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-green-500 text-white flex items-center justify-center shrink-0 shadow-md">
                          <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-base font-black text-green-900">تم تفعيل ضمانك بنجاح! 🛡️🎉</h4>
                          <p className="text-xs sm:text-sm text-green-800/90 leading-relaxed font-medium">
                            مبروك! تم تفعيل ضمان <strong>bazar fashion</strong> الخاص بك من لحظة تأكيد الشراء.
                            يُرجى الاحتفاظ بفاتورة المحل لتطابق تاريخ الضمان.
                          </p>
                          {(purchaseConfirmedAt || activeOrder.purchasedAt) && (
                            <span className="text-[11px] text-green-700 font-bold block pt-1">
                              🕐 تاريخ بدء الضمان:{' '}
                              {purchaseConfirmedAt
                                ? purchaseConfirmedAt.toLocaleString('ar-EG')
                                : activeOrder.purchasedAt?.toDate
                                  ? activeOrder.purchasedAt.toDate().toLocaleString('ar-EG')
                                  : new Date(activeOrder.purchasedAt).toLocaleString('ar-EG')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* ── WARRANTY BANNER for Online Orders (delivered) ── */}
              {!isReservation && activeOrder.status === 'delivered' && (
                <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-green-100/50 rounded-3xl border-2 border-green-300 p-5 sm:p-6 shadow-xs">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-green-500 text-white flex items-center justify-center shrink-0 shadow-md">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-base font-black text-green-900 flex items-center gap-2">
                        تم تفعيل ضمان bazar fashion! 🛡️🎉
                        {activeOrder.warrantyActivated && (
                          <span className="text-[10px] font-bold bg-green-200 text-green-800 px-1.5 py-0.5 rounded-full">مفعّل ✅</span>
                        )}
                      </h4>
                      <p className="text-xs sm:text-sm text-green-800/90 leading-relaxed font-medium">
                        مبروك! تم تفعيل ضمان <strong>bazar fashion</strong> الخاص بك من لحظة تسليم طلبك.
                        يُرجى الاحتفاظ بفاتورة المحل وتأكد من تطابق التاريخ أدناه مع ما هو مكتوب عليها.
                      </p>

                      {/* Warranty date box */}
                      {(activeOrder.warrantyStartDate || activeOrder.deliveredAt || activeOrder.updatedAt) && (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
                          <div className="inline-flex items-center gap-2 bg-white/80 border border-green-200 rounded-2xl px-4 py-2.5 shadow-xs">
                            <span className="text-[11px] text-green-700 font-bold shrink-0">🕐 تاريخ بدء الضمان:</span>
                            <span className="text-xs font-black text-green-900 font-mono" dir="ltr">
                              {activeOrder.warrantyStartDate
                                ? (activeOrder.warrantyStartDate?.toDate
                                  ? activeOrder.warrantyStartDate.toDate().toLocaleString('ar-EG')
                                  : new Date(activeOrder.warrantyStartDate).toLocaleString('ar-EG'))
                                : activeOrder.deliveredAt
                                  ? (activeOrder.deliveredAt?.toDate
                                    ? activeOrder.deliveredAt.toDate().toLocaleString('ar-EG')
                                    : new Date(activeOrder.deliveredAt).toLocaleString('ar-EG'))
                                  : activeOrder.updatedAt?.toDate
                                    ? activeOrder.updatedAt.toDate().toLocaleString('ar-EG')
                                    : new Date(activeOrder.updatedAt || Date.now()).toLocaleString('ar-EG')}
                            </span>
                          </div>
                        </div>
                      )}

                      <p className="text-[10px] sm:text-[11px] text-amber-700 font-bold">
                        ⚠️ تأكد من مطابقة هذا التاريخ مع التاريخ المكتوب على الفاتورة الورقية من المحل لصحة الضمان.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Details Grid: Info & Items ── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Right: Items List & Total */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-xs space-y-4">
                    <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                      <Package className="w-4 h-4 text-primary" />
                      المنتجات في الطلب ({activeOrder.items?.length || 0})
                    </h3>

                    {/* Bundle indicator if bundle */}
                    {activeOrder.isBundle && (
                      <div className="p-3 bg-primary/5 rounded-2xl border border-primary/20 flex items-center gap-2">
                        <Cpu className="w-5 h-5 text-primary shrink-0" />
                        <div>
                          <p className="text-xs font-black text-primary">تجميعة كمبيوتر مخصصة</p>
                          <p className="text-[11px] text-gray-600">{activeOrder.bundleTitle || 'تجميعة متكاملة'}</p>
                        </div>
                      </div>
                    )}

                    {/* Items List */}
                    <div className="divide-y divide-gray-100">
                      {activeOrder.items?.map((item: any, idx: number) => (
                        <div key={idx} className="py-3 flex items-center gap-3.5 first:pt-0 last:pb-0">
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.productName || item.name}
                              className="w-14 h-14 object-contain rounded-2xl bg-gray-50 border border-gray-100 p-1 shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                              {item.productName || item.name}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-1 flex-wrap">
                              <span className="font-bold text-gray-700">الكمية: {item.quantity || 1}</span>
                              {item.selectedSize && <span>• المقاس: {item.selectedSize.label || item.selectedSize}</span>}
                              {item.selectedColor && <span>• اللون: {item.selectedColor}</span>}
                            </div>
                          </div>
                          <div className="text-left shrink-0">
                            <p className="text-xs sm:text-sm font-black text-gray-900">
                              {formatCurrency(item.totalPrice || item.price * (item.quantity || 1), 'جنيه')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Bundle components detailed breakdown */}
                    {activeOrder.bundleComponents && activeOrder.bundleComponents.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-gray-100">
                        <p className="text-xs font-bold text-gray-500 mb-2">مكونات التجميعة:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {activeOrder.bundleComponents.map((comp: any, cIdx: number) => (
                            <div key={cIdx} className="p-2 rounded-xl bg-gray-50 border border-gray-100">
                              <span className="text-[10px] text-gray-400 block">{comp.stepName}</span>
                              <span className="font-bold text-gray-800 truncate block">{comp.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Financial Breakdown */}
                  <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-xs space-y-3">
                    <h3 className="text-sm font-black text-gray-900">الملخص المالي</h3>
                    <div className="space-y-2 text-xs font-medium text-gray-600">
                      {activeOrder.subtotal && (
                        <div className="flex justify-between">
                          <span>المجموع الفرعي</span>
                          <span>{formatCurrency(activeOrder.subtotal, 'جنيه')}</span>
                        </div>
                      )}
                      {activeOrder.couponDiscountAmount ? (
                        <div className="flex justify-between text-green-600 font-bold">
                          <span>خصم الكوبون ({activeOrder.couponCode})</span>
                          <span>-{formatCurrency(activeOrder.couponDiscountAmount, 'جنيه')}</span>
                        </div>
                      ) : null}
                      {activeOrder.shippingCost !== undefined && activeOrder.shippingCost > 0 && (
                        <div className="flex justify-between">
                          <span>تكاليف الشحن</span>
                          <span>{formatCurrency(activeOrder.shippingCost, 'جنيه')}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-black text-gray-900 pt-2 border-t border-gray-100">
                        <span>الإجمالي الكلي</span>
                        <span className="text-primary text-base font-mono">{formatCurrency(activeOrder.total, 'جنيه')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Left: Customer & Delivery / Reservation Details */}
                <div className="space-y-4">
                  <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-xs space-y-3.5">
                    <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      بيانات العميل
                    </h3>

                    <div className="space-y-2.5 text-xs">
                      <div className="flex items-center gap-2 text-gray-700">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        <span className="font-bold">{activeOrder.deliveryInfo?.fullName || activeOrder.reservationInfo?.fullName || activeOrder.customerName || '—'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        <span className="font-mono font-bold" dir="ltr">{activeOrder.deliveryInfo?.phoneNumber || activeOrder.reservationInfo?.phoneNumber || activeOrder.customerPhone || '—'}</span>
                      </div>
                    </div>

                    {/* Specific info depending on type */}
                    {isReservation ? (
                      <div className="pt-3 border-t border-gray-100 space-y-2.5">
                        <h4 className="text-xs font-black text-purple-900 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-purple-600" />
                          تفاصيل موعد الحجز
                        </h4>
                        <div className="bg-purple-50/60 rounded-2xl p-3 border border-purple-100 space-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-purple-700">تاريخ الموعد:</span>
                            <span className="font-bold text-purple-900">{activeOrder.reservationInfo?.appointmentDate || 'اليوم'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-purple-700">وقت الموعد:</span>
                            <span className="font-bold text-purple-900" dir="ltr">{activeOrder.reservationInfo?.appointmentTime || '12:00'}</span>
                          </div>
                          {activeOrder.reservationInfo?.notes && (
                            <div className="pt-1 border-t border-purple-100 text-[11px] text-purple-800">
                              <span className="font-bold">ملاحظات: </span>
                              {activeOrder.reservationInfo.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="pt-3 border-t border-gray-100 space-y-2.5">
                        <h4 className="text-xs font-black text-blue-900 flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-blue-600" />
                          عنوان التوصيل
                        </h4>
                        <div className="bg-blue-50/60 rounded-2xl p-3 border border-blue-100 space-y-1 text-xs">
                          <p className="font-bold text-blue-900">{activeOrder.deliveryInfo?.city || 'المحافظة'}</p>
                          <p className="text-blue-800 text-[11px] leading-relaxed">{activeOrder.deliveryInfo?.address || 'العنوان'}</p>
                          {activeOrder.deliveryInfo?.notes && (
                            <p className="text-[10px] text-blue-700 pt-1 border-t border-blue-100">
                              ملاحظة: {activeOrder.deliveryInfo.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* WhatsApp Help CTA */}
                    <div className="pt-3 border-t border-gray-100">
                      <a
                        href={whatsappHelpUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-white text-xs transition-all active:scale-98 shadow-sm hover:opacity-95"
                        style={{ background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)' }}
                      >
                        <MessageCircle className="w-4 h-4" />
                        تواصل مع المتجر بشأن هذا الطلب
                      </a>
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {!activeOrder && hasSearched && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-gray-100 p-8 text-center space-y-3 shadow-xs"
            >
              <div className="w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h3 className="text-base font-extrabold text-gray-900">لم يتم العثور على أي طلبات مسجلة</h3>
              <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
                تأكد من كتابة كود الطلب بشكل صحيح (مثل <span className="font-mono font-bold text-gray-700">BZ-123456</span>) أو إدخال نفس رقم الهاتف الذي سجلت به الطلب.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
