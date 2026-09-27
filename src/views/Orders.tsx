'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Package,
  Calendar,
  MapPin,
  Phone,
  User,
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  Copy,
  Check,
  X,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDate, formatDateTime, formatCurrency } from '@/utils/format';
import { toast } from 'sonner';

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  totalPrice?: number;
  image: string;
  selectedSize?: {
    id: string;
    label: string;
    price: number;
  } | null;
  selectedAddons?: Array<{
    id: string;
    label: string;
    price_delta: number;
  }>;
}

interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  type?: 'online_purchase' | 'reservation';
  deliveryInfo?: {
    fullName: string;
    phoneNumber: string;
    address: string;
    city: string;
    notes?: string;
  };
  reservationInfo?: {
    fullName: string;
    phoneNumber: string;
    appointmentDate: string;
    appointmentTime: string;
    notes?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  orderCode?: string;
}

/* ─── Shipping Steps (matching TrackOrder + attached image) ─── */
const SHIPPING_STEPS = [
  { title: 'تم استلام الطلب', desc: 'قيد المراجعة' },
  { title: 'قيد التجهيز',    desc: 'تغليف وتجهيز' },
  { title: 'تم الشحن',       desc: 'مع مندوب الشحن' },
  { title: 'تم التوصيل',     desc: 'تم الاستلام بنجاح' },
];

const RESERVATION_STEPS = [
  { title: 'تسجيل الحجز', desc: 'تم استلام طلب الحجز' },
  { title: 'في الطريق',   desc: 'العميل في طريقه للمحل' },
  { title: 'وصلت المحل', desc: 'تم التواجد بالمحل' },
  { title: 'تأكيد الشراء', desc: 'تم الشراء وتفعيل الضمان' },
];

function getShippingStep(status: Order['status']): number {
  switch (status) {
    case 'pending':    return 0;
    case 'confirmed':
    case 'processing': return 1;
    case 'shipped':    return 2;
    case 'delivered':  return 3;
    case 'cancelled':  return -1;
    default:           return 0;
  }
}

function getReservationStep(status: string): number {
  if (status === 'cancelled') return -1;
  if (status === 'delivered') return 3;
  if (status === 'arrived')   return 2;
  if (status === 'on_the_way') return 1;
  if (status === 'confirmed' || status === 'processing') return 1;
  return 0; // pending
}

/* ─── Status Badge ─── */
function getStatusBadge(status: Order['status']) {
  const cfg: Record<string, { color: string; text: string }> = {
    pending:    { color: 'bg-yellow-100 text-yellow-800',  text: 'قيد الانتظار' },
    confirmed:  { color: 'bg-blue-100 text-blue-800',      text: 'تم التأكيد' },
    processing: { color: 'bg-indigo-100 text-indigo-800',  text: 'قيد التجهيز' },
    shipped:    { color: 'bg-purple-100 text-purple-800',  text: 'تم الشحن' },
    delivered:  { color: 'bg-green-100 text-green-800',    text: 'تم التوصيل' },
    cancelled:  { color: 'bg-red-100 text-red-800',        text: 'ملغي' },
  };
  const c = cfg[status] ?? cfg.pending;
  return <Badge className={c.color}>{c.text}</Badge>;
}

/* ─── CopyButton ─── */
function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success('تم نسخ رقم الطلب ✅');
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      title="نسخ رقم الطلب"
      className="inline-flex items-center gap-1.5 cursor-pointer group select-none"
    >
      <span className="font-mono font-bold text-primary group-hover:underline transition-all">
        {label ?? text}
      </span>
      <span className={`transition-colors ${copied ? 'text-green-600' : 'text-gray-400 group-hover:text-primary'}`}>
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </span>
    </button>
  );
}

/* ─── OrderStepper ─── */
function OrderStepper({ order }: { order: Order }) {
  const isReservation = order.type === 'reservation';
  const steps   = isReservation ? RESERVATION_STEPS : SHIPPING_STEPS;
  const current = isReservation ? getReservationStep(order.status) : getShippingStep(order.status);

  if (order.status === 'cancelled') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center text-red-700">
        <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="font-extrabold text-sm">تم إلغاء هذا الطلب</p>
        <p className="text-xs text-red-600/80 mt-1">يرجى التواصل مع إدارة المتجر لأي استفسار.</p>
      </div>
    );
  }

  return (
    <div className="relative grid grid-cols-4 gap-1 sm:gap-2 text-center py-2">
      {/* connecting line */}
      <div className="absolute top-[16px] sm:top-[18px] left-[12.5%] right-[12.5%] h-0.5 bg-gray-200 z-0" />
      {steps.map((step, idx) => {
        const isDone    = current >= idx;
        const isCurrent = current === idx;
        return (
          <div key={idx} className="flex flex-col items-center relative z-10">
            <div
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-sm ${
                isDone
                  ? 'bg-primary text-white ring-4 ring-primary/15'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {isDone ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" /> : idx + 1}
            </div>
            <span
              className={`text-[10px] sm:text-[11px] font-bold mt-1.5 sm:mt-2 leading-tight ${
                isCurrent ? 'text-primary' : isDone ? 'text-gray-800' : 'text-gray-400'
              }`}
            >
              {step.title}
            </span>
            <span className="text-[9px] text-gray-400 hidden sm:block">{step.desc}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Order Detail Modal ─── */
function OrderDetailModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const orderNumber = order.orderCode || order.id;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative z-10 bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[94vh] sm:max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between rounded-t-2xl sm:rounded-t-3xl z-10 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-gray-400 font-medium">تفاصيل الطلب</p>
              <CopyButton text={orderNumber} />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500 shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-6">
          {/* Stepper */}
          <div className="bg-gray-50 rounded-2xl p-3 sm:p-4">
            <h3 className="text-xs sm:text-sm font-black text-gray-900 flex items-center gap-2 mb-3 sm:mb-4">
              <ShieldCheck className="w-4 h-4 text-primary" />
              مراحل متابعة الطلب
            </h3>
            <OrderStepper order={order} />
          </div>

          {/* Delivery / Reservation Info */}
          <div>
            {order.type === 'reservation' && order.reservationInfo ? (
              <>
                <h4 className="font-semibold mb-2.5 sm:mb-3 flex items-center gap-2 text-xs sm:text-sm">
                  <Clock className="h-4 w-4 text-purple-600" /> تفاصيل الحجز
                </h4>
                <div className="space-y-2 text-xs sm:text-sm bg-purple-50/70 rounded-xl p-3.5 sm:p-4 border border-purple-100">
                  <p><strong>الاسم:</strong> {order.reservationInfo.fullName}</p>
                  <p><strong>الهاتف:</strong> {order.reservationInfo.phoneNumber}</p>
                  <p><strong>تاريخ الموعد:</strong> {order.reservationInfo.appointmentDate}</p>
                  <p><strong>الوقت:</strong> {order.reservationInfo.appointmentTime}</p>
                  {order.reservationInfo.notes && <p><strong>ملاحظات:</strong> {order.reservationInfo.notes}</p>}
                </div>
              </>
            ) : (
              <>
                <h4 className="font-semibold mb-2.5 sm:mb-3 flex items-center gap-2 text-xs sm:text-sm">
                  <MapPin className="h-4 w-4 text-blue-600" /> معلومات التوصيل
                </h4>
                <div className="space-y-2 text-xs sm:text-sm bg-blue-50/70 rounded-xl p-3.5 sm:p-4 border border-blue-100">
                  <p><strong>الاسم:</strong> {order.deliveryInfo?.fullName || 'غير محدد'}</p>
                  <p><strong>الهاتف:</strong> {order.deliveryInfo?.phoneNumber || 'غير محدد'}</p>
                  <p><strong>العنوان:</strong> {order.deliveryInfo?.address || 'غير محدد'}</p>
                  <p><strong>المدينة:</strong> {order.deliveryInfo?.city || 'غير محدد'}</p>
                  {order.deliveryInfo?.notes && <p><strong>ملاحظات:</strong> {order.deliveryInfo.notes}</p>}
                </div>
              </>
            )}
          </div>

          {/* Order Meta */}
          <div className="text-xs sm:text-sm space-y-2 bg-gray-50/70 rounded-xl p-3.5 sm:p-4 border border-gray-100">
            <div className="flex items-center gap-2 flex-wrap">
              <strong>رقم الطلب:</strong>
              <CopyButton text={orderNumber} />
            </div>
            <p><strong>تاريخ الطلب:</strong> {formatDateTime(order.createdAt)}</p>
            <p><strong>آخر تحديث:</strong> {formatDateTime(order.updatedAt)}</p>
            <p><strong>عدد المنتجات:</strong> {order.items.length}</p>
          </div>

          <Separator />

          {/* Items */}
          <div>
            <h4 className="font-semibold mb-3 sm:mb-4 text-xs sm:text-sm">المنتجات المطلوبة</h4>
            <div className="space-y-2.5 sm:space-y-3">
              {order.items.map((item, index) => (
                <div key={index} className="flex items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-100/70">
                  <img src={item.image} alt={item.productName} className="h-12 w-12 sm:h-14 sm:w-14 rounded-lg object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h5 className="font-medium text-xs sm:text-sm truncate">{item.productName}</h5>
                    {item.selectedSize && <p className="text-[11px] sm:text-xs text-blue-600 font-medium">📐 الحجم: {item.selectedSize.label}</p>}
                    {item.selectedAddons && item.selectedAddons.length > 0 && (
                      <p className="text-[11px] sm:text-xs text-green-600">➕ {item.selectedAddons.map((a) => a.label).join(', ')}</p>
                    )}
                    <p className="text-[11px] sm:text-xs text-muted-foreground">الكمية: {item.quantity}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-xs sm:text-sm text-gray-900">{formatCurrency(item.totalPrice ?? item.price * item.quantity, 'جنيه')}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">{formatCurrency(item.price, 'جنيه')} / قطعة</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Total */}
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">المجموع الكلي</p>
              <p className="text-xl sm:text-2xl font-black text-green-600">{formatCurrency(order.total, 'جنيه')}</p>
            </div>
            <div className="text-right">
              <p className="text-xs sm:text-sm text-muted-foreground mb-1">حالة الطلب</p>
              {getStatusBadge(order.status)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const Orders = () => {
  const { userProfile, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (userProfile?.uid) {
      fetchOrders();
    } else {
      setLoading(false);
    }
  }, [userProfile, authLoading]);

  const fetchOrders = async () => {
    if (!userProfile?.uid) return;
    try {
      setLoading(true);
      const q = query(collection(db, 'orders'), where('userId', '==', userProfile.uid));
      const snap = await getDocs(q);
      const data: Order[] = [];
      snap.forEach((doc) => {
        const d = doc.data();
        data.push({
          id: doc.id,
          ...d,
          createdAt: d.createdAt?.toDate?.() ?? d.createdAt ?? new Date(),
          updatedAt: d.updatedAt?.toDate?.() ?? d.updatedAt ?? new Date(),
        } as Order);
      });
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(data);
    } catch (err) {
      console.error('Error fetching orders:', err);
      toast.error('حدث خطأ أثناء جلب الطلبات');
    } finally {
      setLoading(false);
    }
  };

  const getTypeBadge = (type?: string) => {
    if (type === 'reservation') {
      return (
        <Badge className="bg-purple-100 text-purple-800 border-purple-200">
          حجز موعد في المحل
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-gray-300 text-gray-600">
        شراء أونلاين
      </Badge>
    );
  };

  /* ── Loading / Auth guards ── */
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">يرجى تسجيل الدخول</h2>
          <p className="text-muted-foreground mb-4">يجب عليك تسجيل الدخول لعرض طلباتك</p>
          <Link to="/"><Button>العودة للرئيسية</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container py-8">
        {/* Page Title */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">طلباتي</h1>
            <p className="text-muted-foreground">عرض جميع طلباتك السابقة والحالية</p>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p>جاري تحميل الطلبات...</p>
          </div>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد طلبات</h3>
              <p className="text-muted-foreground mb-4">لم تقم بأي طلب بعد. ابدأ بالتسوق الآن!</p>
              <Link to="/products"><Button>تصفح المنتجات</Button></Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => {
              const orderNumber = order.orderCode || order.id;
              return (
                <Card key={order.id} className="overflow-hidden">
                  <CardHeader className="bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-lg flex items-center gap-1">
                              طلب{' '}
                              {/* ── Copyable order number ── */}
                              <CopyButton text={orderNumber} label={`#${orderNumber.slice(-8)}`} />
                            </CardTitle>
                            {getTypeBadge(order.type)}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {formatDate(order.createdAt)}
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              {order.deliveryInfo?.fullName || order.reservationInfo?.fullName || 'غير محدد'}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {getStatusBadge(order.status)}
                        <div className="text-right">
                          <p className="font-semibold text-lg">{formatCurrency(order.total, 'جنيه')}</p>
                          <p className="text-sm text-muted-foreground">{order.items.length} منتج</p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6 space-y-6">
                    {/* ── Status Stepper ── */}
                    <div className="bg-gray-50 rounded-2xl p-4">
                      <h3 className="text-sm font-black text-gray-900 flex items-center gap-2 mb-4">
                        <ShieldCheck className="w-4 h-4 text-primary" />
                        مراحل متابعة الطلب
                      </h3>
                      <OrderStepper order={order} />
                    </div>

                    {/* ── Info Grid ── */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        {order.type === 'reservation' && order.reservationInfo ? (
                          <>
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              تفاصيل الحجز
                            </h4>
                            <div className="space-y-2 text-sm">
                              <p><strong>الاسم:</strong> {order.reservationInfo.fullName}</p>
                              <p><strong>الهاتف:</strong> {order.reservationInfo.phoneNumber}</p>
                              <p><strong>تاريخ الموعد:</strong> {order.reservationInfo.appointmentDate}</p>
                              <p><strong>الوقت:</strong> {order.reservationInfo.appointmentTime}</p>
                              {order.reservationInfo.notes && (
                                <p><strong>ملاحظات:</strong> {order.reservationInfo.notes}</p>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              معلومات التوصيل
                            </h4>
                            <div className="space-y-2 text-sm">
                              <p><strong>الاسم:</strong> {order.deliveryInfo?.fullName || 'غير محدد'}</p>
                              <p><strong>الهاتف:</strong> {order.deliveryInfo?.phoneNumber || 'غير محدد'}</p>
                              <p><strong>العنوان:</strong> {order.deliveryInfo?.address || 'غير محدد'}</p>
                              <p><strong>المدينة:</strong> {order.deliveryInfo?.city || 'غير محدد'}</p>
                              {order.deliveryInfo?.notes && (
                                <p><strong>ملاحظات:</strong> {order.deliveryInfo.notes}</p>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      <div>
                        <h4 className="font-semibold mb-3">تفاصيل الطلب</h4>
                        <div className="space-y-2 text-sm">
                          <p className="flex items-center gap-2 flex-wrap">
                            <strong>رقم الطلب:</strong>
                            <CopyButton text={orderNumber} />
                          </p>
                          <p><strong>تاريخ الطلب:</strong> {formatDateTime(order.createdAt)}</p>
                          <p><strong>آخر تحديث:</strong> {formatDateTime(order.updatedAt)}</p>
                          <p><strong>عدد المنتجات:</strong> {order.items.length}</p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* ── Order Items ── */}
                    <div>
                      <h4 className="font-semibold mb-4">المنتجات المطلوبة</h4>
                      <div className="space-y-4">
                        {order.items.map((item, index) => (
                          <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                            <img
                              src={item.image}
                              alt={item.productName}
                              className="h-16 w-16 rounded-md object-cover"
                            />
                            <div className="flex-1">
                              <h5 className="font-medium">{item.productName}</h5>
                              {item.selectedSize && (
                                <p className="text-sm text-blue-600 font-medium">
                                  📐 الحجم: {item.selectedSize.label}
                                </p>
                              )}
                              {item.selectedAddons && item.selectedAddons.length > 0 && (
                                <p className="text-sm text-green-600">
                                  ➕ الإضافات: {item.selectedAddons.map((a) => a.label).join(', ')}
                                </p>
                              )}
                              <p className="text-sm text-muted-foreground">الكمية: {item.quantity}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">
                                {formatCurrency(item.totalPrice ?? item.price * item.quantity, 'جنيه')}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {formatCurrency(item.price, 'جنيه')} للقطعة
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* ── Summary + Details Button ── */}
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-muted-foreground">المجموع الكلي</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(order.total, 'جنيه')}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">حالة الطلب</p>
                          {getStatusBadge(order.status)}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedOrder(order)}
                        >
                          تفاصيل الطلب
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Order Detail Modal ── */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
};

export default Orders;