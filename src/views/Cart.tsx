'use client';

import { useStore } from "@/store/useStore";
import { ProductModal } from "@/components/ProductModal";
import LoginRequiredModal from "@/components/LoginRequiredModal";
import { useState, useEffect } from "react";
import { Product, CartItem } from "@/types/product";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageCircle,
  Eye,
  Settings,
  ShoppingBag,
  Truck,
  MapPin,
  CalendarClock,
  User,
  Phone,
  AlertCircle,
  Trash2 as Trash2Icon,
  CheckCircle,
  ClipboardCopy,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { checkOrderSpam } from "@/lib/spamProtection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { DEFAULT_SUPPLIER } from "@/constants/supplier";
import { formatCurrency } from "@/utils/format";
import { getColorByName } from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { addDoc, collection } from "firebase/firestore";
import { db, updateProductQuantitiesAtomically, createOrderAndUpdateProductQuantitiesAtomically } from "@/lib/firebase";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ReservationSuccessModal from "@/components/ReservationSuccessModal";
import OrderSuccessModal from "@/components/OrderSuccessModal";
import { STORE_GOVERNORATES } from "@/constants/store";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { getProductUrl } from "@/utils/url";
import { checkCoupon, incrementCouponUsage, Coupon } from "@/lib/coupons";
import { trackMetaInitiateCheckout, trackMetaPurchase } from "@/lib/metaPixel";
import { Tag, Loader2, Ticket } from "lucide-react";
import { generateOrderTrackingCode, saveTrackedOrder } from "@/utils/orderTracking";

interface ReservationFormData {
  fullName: string;
  phoneNumber: string;
  appointmentDate: string;
  appointmentTime: string;
  depositMethod?: 'vodafone_cash' | 'instapay' | 'store_visit';
  notes?: string;
}

interface DeliveryFormData {
  fullName: string;
  phoneNumber: string;
  address: string;
  city: string;
  notes?: string;
}

interface SupplierGroup {
  supplierName: string;
  supplierPhone: string;
  items: { product: Product; quantity: number }[];
  total: number;
}

interface CustomerInfo {
  fullName: string;
  phoneNumber: string;
  city: string;
  address: string;
  notes: string;
}

interface SupplierGroupCheckoutProps {
  group: {
    supplierName: string;
    supplierPhone: string;
    supplierLogo?: string;
    items: CartItem[];
  };
  customerInfo: CustomerInfo;
  setCustomerInfo: React.Dispatch<React.SetStateAction<CustomerInfo>>;
  onOrderSuccess: (data: {
    orderCode?: string;
    type: 'online' | 'reservation';
    governorate?: string;
    whatsappUrl: string;
    totalAmount: number;
    supplierKey: string;
    supplierPhone?: string;
    supplierName?: string;
    supplierLogo?: string;
    items?: any[];
    reservationInfo?: any;
    deliveryInfo?: any;
  }) => void;
  onDeleteProduct: (productId: string) => void;
  onUpdateQuantity: (
    productId: string,
    quantity: number,
    selectedSizeId: string | null,
    selectedOptionGroups: any[],
    selectedAddonIds: string[],
    selectedColor?: string
  ) => void;
  userProfile: any;
  formatCurrency: (value: number, currency?: string) => string;
  getColorByName: (color: string) => { name: string; hex?: string };
  getProductUrl: (id: string, name: string, category?: string, subcategory?: string) => string;
}

const SupplierGroupCheckout: React.FC<SupplierGroupCheckoutProps> = ({
  group,
  customerInfo,
  setCustomerInfo,
  onOrderSuccess,
  onDeleteProduct,
  onUpdateQuantity,
  userProfile,
  formatCurrency,
  getColorByName,
  getProductUrl
}) => {
  // ── Local coupon state per supplier group ──
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [isCouponFieldOpen, setIsCouponFieldOpen] = useState(false);
  const [isCouponLoading, setIsCouponLoading] = useState(false);

  const handleApplyCoupon = async () => {
    setCouponError('');
    if (!couponInput.trim()) return;
    setIsCouponLoading(true);
    try {
      const result = await checkCoupon(couponInput);
      if (result.coupon) {
        if (result.coupon.applicableProductIds && result.coupon.applicableProductIds.length > 0) {
          const hasApplicableProduct = group.items.some(
            item => item.product?.id && result.coupon!.applicableProductIds!.includes(item.product.id)
          );
          if (!hasApplicableProduct) {
            setCouponError('هذا الكوبون لا يشمل منتجات هذا التاجر');
            setAppliedCoupon(null);
            return;
          }
        }
        setAppliedCoupon(result.coupon);
        setIsCouponFieldOpen(false);
        toast.success('تم تفعيل الكوبون بنجاح!');
      } else {
        setCouponError(result.error || 'كوبون غير صالح أو غير مفعل');
        setAppliedCoupon(null);
      }
    } finally {
      setIsCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponInput('');
    setAppliedCoupon(null);
    setCouponError('');
    setIsCouponFieldOpen(false);
    toast.info('تم إلغاء الكوبون');
  };
  const canBuyOnline = group.items.every(item => item.product.allowOnline !== false);
  const canReserve = group.items.every(item => item.product.allowReservation !== false);

  const [orderType, setOrderType] = useState<"online_purchase" | "reservation">(
    (!canBuyOnline && canReserve) ? "reservation" : "online_purchase"
  );

  useEffect(() => {
    if (!canBuyOnline && canReserve) {
      setOrderType("reservation");
    } else if (canBuyOnline && !canReserve) {
      setOrderType("online_purchase");
    }
  }, [canBuyOnline, canReserve]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid }
  } = useForm<DeliveryFormData>({
    mode: 'onChange',
    defaultValues: {
      fullName: customerInfo.fullName,
      phoneNumber: customerInfo.phoneNumber,
      city: customerInfo.city,
      address: customerInfo.address,
      notes: customerInfo.notes
    }
  });

  const {
    register: registerReservation,
    handleSubmit: handleSubmitReservation,
    setValue: setValueReservation,
    watch: watchReservation,
    formState: { errors: reservationErrors, isValid: isReservationValid }
  } = useForm<ReservationFormData>({
    mode: 'onChange',
    defaultValues: {
      fullName: customerInfo.fullName,
      phoneNumber: customerInfo.phoneNumber,
      notes: customerInfo.notes,
      depositMethod: 'vodafone_cash'
    }
  });

  // Watchers to sync changes back to parent
  const watchedFullName = watch("fullName");
  const watchedPhoneNumber = watch("phoneNumber");
  const watchedCity = watch("city");
  const watchedAddress = watch("address");
  const watchedNotes = watch("notes");

  const watchedResFullName = watchReservation("fullName");
  const watchedResPhone = watchReservation("phoneNumber");
  const watchedResNotes = watchReservation("notes");

  // Sync from Delivery Form to parent customerInfo
  useEffect(() => {
    if (watchedFullName !== undefined && watchedFullName !== customerInfo.fullName) {
      setCustomerInfo(prev => ({ ...prev, fullName: watchedFullName }));
      localStorage.setItem('bazar-fashion_checkout_fullName', watchedFullName);
    }
  }, [watchedFullName]);

  useEffect(() => {
    if (watchedPhoneNumber !== undefined && watchedPhoneNumber !== customerInfo.phoneNumber) {
      setCustomerInfo(prev => ({ ...prev, phoneNumber: watchedPhoneNumber }));
      localStorage.setItem('bazar-fashion_checkout_phoneNumber', watchedPhoneNumber);
    }
  }, [watchedPhoneNumber]);

  useEffect(() => {
    if (watchedCity !== undefined && watchedCity !== customerInfo.city) {
      setCustomerInfo(prev => ({ ...prev, city: watchedCity }));
      localStorage.setItem('bazar-fashion_checkout_city', watchedCity);
    }
  }, [watchedCity]);

  useEffect(() => {
    if (watchedAddress !== undefined && watchedAddress !== customerInfo.address) {
      setCustomerInfo(prev => ({ ...prev, address: watchedAddress }));
      localStorage.setItem('bazar-fashion_checkout_address', watchedAddress);
    }
  }, [watchedAddress]);

  useEffect(() => {
    if (watchedNotes !== undefined && watchedNotes !== customerInfo.notes) {
      setCustomerInfo(prev => ({ ...prev, notes: watchedNotes }));
      localStorage.setItem('bazar-fashion_checkout_notes', watchedNotes);
    }
  }, [watchedNotes]);

  // Sync from Reservation Form to parent customerInfo
  useEffect(() => {
    if (watchedResFullName !== undefined && watchedResFullName !== customerInfo.fullName) {
      setCustomerInfo(prev => ({ ...prev, fullName: watchedResFullName }));
      localStorage.setItem('bazar-fashion_checkout_fullName', watchedResFullName);
    }
  }, [watchedResFullName]);

  useEffect(() => {
    if (watchedResPhone !== undefined && watchedResPhone !== customerInfo.phoneNumber) {
      setCustomerInfo(prev => ({ ...prev, phoneNumber: watchedResPhone }));
      localStorage.setItem('bazar-fashion_checkout_phoneNumber', watchedResPhone);
    }
  }, [watchedResPhone]);

  useEffect(() => {
    if (watchedResNotes !== undefined && watchedResNotes !== customerInfo.notes) {
      setCustomerInfo(prev => ({ ...prev, notes: watchedResNotes }));
      localStorage.setItem('bazar-fashion_checkout_notes', watchedResNotes);
    }
  }, [watchedResNotes]);

  // Sync from parent customerInfo to Delivery Form
  useEffect(() => {
    if (customerInfo.fullName !== watchedFullName) {
      setValue("fullName", customerInfo.fullName, { shouldValidate: true });
    }
  }, [customerInfo.fullName]);

  useEffect(() => {
    if (customerInfo.phoneNumber !== watchedPhoneNumber) {
      setValue("phoneNumber", customerInfo.phoneNumber, { shouldValidate: true });
    }
  }, [customerInfo.phoneNumber]);

  useEffect(() => {
    if (customerInfo.city !== watchedCity) {
      setValue("city", customerInfo.city, { shouldValidate: true });
    }
  }, [customerInfo.city]);

  useEffect(() => {
    if (customerInfo.address !== watchedAddress) {
      setValue("address", customerInfo.address, { shouldValidate: true });
    }
  }, [customerInfo.address]);

  useEffect(() => {
    if (customerInfo.notes !== watchedNotes) {
      setValue("notes", customerInfo.notes);
    }
  }, [customerInfo.notes]);

  // Sync from parent customerInfo to Reservation Form
  useEffect(() => {
    if (customerInfo.fullName !== watchedResFullName) {
      setValueReservation("fullName", customerInfo.fullName, { shouldValidate: true });
    }
  }, [customerInfo.fullName]);

  useEffect(() => {
    if (customerInfo.phoneNumber !== watchedResPhone) {
      setValueReservation("phoneNumber", customerInfo.phoneNumber, { shouldValidate: true });
    }
  }, [customerInfo.phoneNumber]);

  useEffect(() => {
    if (customerInfo.notes !== watchedResNotes) {
      setValueReservation("notes", customerInfo.notes);
    }
  }, [customerInfo.notes]);

  // Financial calculations for this group
  const groupSubtotal = group.items.reduce((sum, item) => sum + item.totalPrice, 0);

  const groupCouponDiscount = (() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.applicableProductIds && appliedCoupon.applicableProductIds.length > 0) {
      const applicableItems = group.items.filter(
        item => item.product?.id && appliedCoupon.applicableProductIds!.includes(item.product.id)
      );
      const applicableTotal = applicableItems.reduce((sum, item) => sum + item.totalPrice, 0);
      if (applicableTotal <= 0) return 0;
      return appliedCoupon.type === 'percentage'
        ? (applicableTotal * appliedCoupon.value) / 100
        : appliedCoupon.value;
    }
    return appliedCoupon.type === 'percentage'
      ? (groupSubtotal * appliedCoupon.value) / 100
      : appliedCoupon.value;
  })();

  const selectedCity = watchedCity;
  const shippingCost = STORE_GOVERNORATES.find(g => g.name === selectedCity)?.shippingCost || 0;
  const currentShippingCost = orderType === "online_purchase" ? shippingCost : 0;
  const numericShippingCost = typeof currentShippingCost === 'number' ? currentShippingCost : 0;

  const groupTotal = Math.max(0, groupSubtotal - groupCouponDiscount) + numericShippingCost;

  // Date constraints for Reservation
  const todayDate = new Date();
  const maxDate = new Date();
  maxDate.setDate(todayDate.getDate() + 2);
  const minDateStr = todayDate.toISOString().split('T')[0];
  const maxDateStr = maxDate.toISOString().split('T')[0];

  const getSupplierWhatsAppNumber = (_phone?: string) => {
    return '201024911062';
  };

  const mapCartItemsToOrderItems = (cartItems: any[]) => {
    return cartItems
      .filter((item) => item.product && item.product.id)
      .map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.unitFinalPrice,
        totalPrice: item.totalPrice,
        image: item.product.images[0],
        selectedSize: item.selectedSize ? {
          id: item.selectedSize.id,
          label: item.selectedSize.label,
          price: item.selectedSize.price
        } : null,
        selectedAddons: item.selectedAddons.map((addon: any) => ({
          id: addon.id,
          label: addon.label,
          price_delta: addon.price_delta
        })),
        selectedOptionGroups: item.selectedOptionGroups || [],
        selectedColor: item.selectedColor,
        wholesaleInfo: item.product.wholesaleInfo ? {
          supplierName: item.product.wholesaleInfo.supplierName || '',
          supplierPhone: item.product.wholesaleInfo.supplierPhone || '',
          supplierAddress: item.product.wholesaleInfo.supplierAddress || '',
          supplierLogo: item.product.wholesaleInfo.supplierLogo || ''
        } : null
      }));
  };

  const formatOrderLines = (items: any[]) => {
    return items.map((item, i) => {
      const lines: string[] = [];
      lines.push(`${i + 1}. ${item.productName}`);
      lines.push(`   الكمية: ${item.quantity}`);
      if (item.selectedSize) lines.push(`   الحجم: ${item.selectedSize.label}`);
      if (item.selectedColor) {
        const colorName = getColorByName(item.selectedColor).name || item.selectedColor;
        lines.push(`   اللون: ${colorName}`);
      }
      if (item.selectedOptionGroups && item.selectedOptionGroups.length > 0) {
        lines.push(`   المواصفات: \n${item.selectedOptionGroups.map((opt: any) => `      - ${opt.groupName}: ${opt.optionLabel} (+${formatCurrency(opt.extraPrice, 'جنيه')})`).join('\n')}`);
      }
      lines.push(`   السعر: ${formatCurrency(item.totalPrice, 'جنيه')}`);
      return lines.join('\n');
    }).join('\n---------\n');
  };

  const processOrder = async (orderData: any, message: string) => {
    const whatsappNumber = getSupplierWhatsAppNumber(group.supplierPhone);
    const deductions = group.items
      .filter((item) => item.product && item.product.id)
      .map(item => ({
        productId: item.product.id,
        quantityToDeduct: item.quantity
      }));

    try {
      if (typeof createOrderAndUpdateProductQuantitiesAtomically === 'function') {
        await createOrderAndUpdateProductQuantitiesAtomically(orderData, deductions);
      } else {
        await addDoc(collection(db, 'orders'), orderData);
        if (typeof updateProductQuantitiesAtomically === 'function') {
          await updateProductQuantitiesAtomically(deductions);
        }
      }

      if (appliedCoupon?.id) {
        await incrementCouponUsage(appliedCoupon.id);
      }

      // Save order to localStorage for easy customer tracking
      if (orderData.orderCode) {
        saveTrackedOrder({
          orderCode: orderData.orderCode,
          type: orderData.type === 'reservation' ? 'reservation' : 'online',
          total: orderData.total,
          createdAt: new Date().toISOString(),
          itemsCount: group.items.length,
          customerName: orderData.deliveryInfo?.fullName || orderData.reservationInfo?.fullName || 'عميل بازار',
          customerPhone: orderData.deliveryInfo?.phoneNumber || orderData.reservationInfo?.phoneNumber,
          status: 'pending',
        });
      }

      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

      onOrderSuccess({
        orderCode: orderData.orderCode,
        type: orderData.type === 'reservation' ? 'reservation' : 'online',
        governorate: orderData.type === 'reservation' ? undefined : orderData.deliveryInfo?.city,
        whatsappUrl,
        totalAmount: orderData.total,
        supplierKey: group.supplierName || group.supplierPhone || '__default__',
        supplierPhone: group.supplierPhone,
        supplierName: group.supplierName,
        supplierLogo: group.supplierLogo,
        items: group.items,
        reservationInfo: orderData.type === 'reservation' ? orderData.reservationInfo : null,
        deliveryInfo: orderData.type === 'reservation' ? null : orderData.deliveryInfo
      });

    } catch (error) {
      console.error('Error processing order:', error);
      toast.error('حدث خطأ في حفظ الطلب');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDeliverySubmit = async (data: DeliveryFormData) => {
    setIsSubmitting(true);

    const spamResult = await checkOrderSpam({
      orderType: 'online_purchase',
      fullName: data.fullName,
      phoneNumber: data.phoneNumber,
      address: data.address,
      productId: ""
    });

    if (spamResult.isSpam) {
      toast.error(spamResult.message);
      setIsSubmitting(false);
      return;
    }

    const orderItems = mapCartItemsToOrderItems(group.items);
    const deliveryInfo = {
      fullName: data.fullName,
      phoneNumber: data.phoneNumber,
      address: data.address,
      city: data.city,
      notes: data.notes || ''
    };

    const orderCode = generateOrderTrackingCode();

    const orderData = {
      orderCode,
      userId: userProfile?.uid || `guest-${Date.now()}`,
      items: orderItems,
      total: groupTotal,
      couponCode: appliedCoupon?.code || null,
      couponDiscountAmount: groupCouponDiscount,
      status: 'pending',
      deliveryInfo,
      createdAt: new Date(),
      updatedAt: new Date(),
      supplierName: group.supplierName || '',
      supplierPhone: group.supplierPhone || '',
    };

    const orderLines = formatOrderLines(orderItems);
    const deliverySection = [
      `👤 الاسم: ${deliveryInfo.fullName}`,
      `🏙 المحافظة: ${deliveryInfo.city}`,
      `📍 العنوان: ${deliveryInfo.address}`,
      `📱 الهاتف: ${deliveryInfo.phoneNumber}`,
      deliveryInfo.notes ? `📝 ملاحظات: ${deliveryInfo.notes}` : null,
    ].filter(Boolean).join('\n');

    const message = [
      '🚀 طلب جديد (شراء أونلاين)',
      '========================',
      `🔢 كود تتبع الطلب: *${orderCode}*`,
      '========================',
      group.supplierName ? `🏢 المحل / المورد: ${group.supplierName}` : null,
      orderLines,
      '========================',
      '*بيانات الشحن:*',
      deliverySection,
      '========================',
      appliedCoupon ? `🎟 كود الخصم: ${appliedCoupon.code} (-${formatCurrency(groupCouponDiscount, 'جنيه')})` : null,
      shippingCost !== 0 ? `🚚 مصاريف الشحن: ${formatCurrency(shippingCost, 'جنيه')}` : null,
      `💰 الإجمالي النهائي: ${formatCurrency(groupTotal, 'جنيه')}`,
      `📅 التاريخ: ${new Date().toLocaleDateString('ar-EG')}`,
      '========================',
      'يرجى تأكيد الطلب ومراجعة تكاليف الشحن'
    ].join('\n');

    await processOrder(orderData, message);
  };

  const handleReservationSubmit = async (data: ReservationFormData) => {
    setIsSubmitting(true);

    const selectedDate = new Date(data.appointmentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 2);

    if (selectedDate > maxDate) {
      toast.error("عذراً، لا يمكن الحجز لأكثر من يومين مقدماً");
      setIsSubmitting(false);
      return;
    }
    if (selectedDate < today) {
      toast.error("تاريخ الحجز لا يمكن أن يكون في الماضي");
      setIsSubmitting(false);
      return;
    }

    const spamResult = await checkOrderSpam({
      orderType: 'reservation',
      fullName: data.fullName,
      phoneNumber: data.phoneNumber,
      appointmentDate: data.appointmentDate,
      appointmentTime: data.appointmentTime,
      productId: ""
    });

    if (spamResult.isSpam) {
      toast.error(spamResult.message);
      setIsSubmitting(false);
      return;
    }

    const orderItems = mapCartItemsToOrderItems(group.items);
    const reservationInfo = {
      fullName: data.fullName,
      phoneNumber: data.phoneNumber,
      appointmentDate: data.appointmentDate,
      appointmentTime: data.appointmentTime,
      depositMethod: data.depositMethod,
      notes: data.notes || ''
    };

    const orderCode = generateOrderTrackingCode();

    const orderData = {
      orderCode,
      userId: userProfile?.uid || `guest-${Date.now()}`,
      items: orderItems,
      total: groupTotal,
      couponCode: appliedCoupon?.code || null,
      couponDiscountAmount: groupCouponDiscount,
      status: 'pending',
      type: 'reservation',
      reservationInfo,
      deliveryInfo: {
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        address: 'استلام من المحل',
        city: 'لا يوجد',
        notes: `حجز موعد: ${data.appointmentDate}`
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      supplierName: group.supplierName || '',
      supplierPhone: group.supplierPhone || '',
    };

    const orderLines = formatOrderLines(orderItems);
    const reservationDetails = [
      `👤 الاسم: ${reservationInfo.fullName}`,
      `📱 الهاتف: ${reservationInfo.phoneNumber}`,
      `📅 التاريخ: ${reservationInfo.appointmentDate}`,
      `⏰ الوقت: ${reservationInfo.appointmentTime}`,
      reservationInfo.notes ? `📝 ملاحظات: ${reservationInfo.notes}` : null,
    ].filter(Boolean).join('\n');

    const message = [
      '📅 طلب حجز منتج',
      '========================',
      `🔢 كود الحجز للتتبع وتأكيد الوصول: *${orderCode}*`,
      '========================',
      group.supplierName ? `🏢 المحل / المورد: ${group.supplierName}` : null,
      orderLines,
      '========================',
      '*تفاصيل الحجز:*',
      reservationDetails,
      '========================',
      appliedCoupon ? `🎟 كود الخصم: ${appliedCoupon.code} (-${formatCurrency(groupCouponDiscount, 'جنيه')})` : null,
      `💰 الإجمالي النهائي: ${formatCurrency(groupTotal, 'جنيه')}`,
      '========================',
      `   سأرسل العربون بعد هذه الرساله *`,
    ].join('\n');

    await processOrder(orderData, message);
  };

  return (
    <Card className="overflow-hidden border-gray-200 shadow-sm mb-6">
      {/* Supplier Header */}
      <CardHeader className="bg-gray-50/50 py-3.5 border-b flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          {group.supplierLogo ? (
            <img 
              src={group.supplierLogo} 
              alt={group.supplierName || 'التاجر'} 
              className="h-8 w-8 object-contain rounded border border-gray-200 bg-white p-0.5" 
              onError={(e) => (e.currentTarget.style.display = 'none')} 
            />
          ) : null}
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-800">{group.supplierName || 'تاجر عام'}</span>
          </div>
        </div>
        <span className="text-xs font-medium bg-primary/10 text-primary px-2.5 py-1 rounded-full">
          عدد المنتجات: {group.items.reduce((acc, item) => acc + item.quantity, 0)}
        </span>
      </CardHeader>

      <CardContent className="p-0">
        {/* Products List */}
        <div className="divide-y divide-gray-100">
          {group.items.map((item) => (
            <div
              key={`${item.product.id}-${item.selectedSize?.id || 'no-size'}-${item.selectedAddons.map((a: any) => a.id).sort().join('-')}-${JSON.stringify(item.selectedOptionGroups || [])}`}
              className="flex gap-4 p-4 hover:bg-gray-50/50 transition-colors group"
            >
              {/* Product Image */}
              <Link
                to={getProductUrl(item.product.id, item.product.name, item.product.category, item.product.subcategory)}
                className="relative h-20 w-20 flex-shrink-0 rounded-lg border border-gray-200 overflow-hidden bg-white hover:border-primary/50 hover:shadow-sm transition-all duration-200 cursor-pointer block"
              >
                {(() => {
                  const availableColors = item.product.color ? item.product.color.split(',').map((c: any) => c.trim()) : [];
                  const colorImageMapping: { [key: string]: string } = {};
                  availableColors.forEach((color: string, index: number) => {
                    if (item.product.images && item.product.images[index]) {
                      colorImageMapping[color] = item.product.images[index];
                    }
                  });
                  const displayImage = item.selectedColor && colorImageMapping[item.selectedColor]
                    ? colorImageMapping[item.selectedColor]
                    : item.product.images[0];
                  return (
                    <img
                      src={displayImage}
                      alt={item.product.name}
                      className="h-full w-full object-contain p-1"
                    />
                  );
                })()}
              </Link>

              {/* Product Details */}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <Link
                      to={getProductUrl(item.product.id, item.product.name, item.product.category, item.product.subcategory)}
                      className="font-semibold text-gray-900 md:text-sm text-xs line-clamp-2 hover:text-primary transition-colors duration-200"
                    >
                      {item.product.name}
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-gray-400 hover:text-red-500 hover:bg-red-50 h-7 w-7 transition-colors"
                      onClick={() => onDeleteProduct(item.product.id)}
                    >
                      <Trash2Icon className="h-4.5 w-4.5" />
                    </Button>
                  </div>

                  <div className="text-xs text-gray-500 mt-1 space-y-1">
                    {item.selectedSize && (
                      <p className="flex items-center gap-2">
                        <span className="w-12">الحجم:</span>
                        <span className="font-medium text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">{item.selectedSize.label}</span>
                      </p>
                    )}
                    {item.selectedColor && (
                      <p className="flex items-center gap-2">
                        <span className="w-12">اللون:</span>
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200">
                          <span className="w-2.5 h-2.5 rounded-full border shadow-xs" style={{ backgroundColor: item.selectedColor }} />
                          <span className="font-medium text-gray-800 text-[10px]">{getColorByName(item.selectedColor).name}</span>
                        </span>
                      </p>
                    )}
                    {item.selectedOptionGroups && item.selectedOptionGroups.length > 0 && (
                      <div className="flex flex-col gap-0.5 mt-0.5 border-t border-gray-100 pt-0.5">
                        {item.selectedOptionGroups.map((opt: any, idx: number) => (
                          <p key={idx} className="flex items-center gap-2">
                            <span className="w-12 text-gray-400">{opt.groupName}:</span>
                            <span className="font-medium text-gray-800 bg-gray-50 px-1.5 py-0.5 rounded border text-[10px]">{opt.optionLabel}</span>
                          </p>
                        ))}
                      </div>
                    )}
                    {item.selectedAddons && item.selectedAddons.length > 0 && (
                      <p className="flex items-start gap-2">
                        <span className="w-12 shrink-0 mt-0.5">الإضافات:</span>
                        <span className="flex flex-wrap gap-0.5">
                          {item.selectedAddons.map((a: any) => (
                            <span key={a.id} className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-100">
                              {a.label}
                            </span>
                          ))}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-dashed border-gray-100">
                  {/* Quantity controls */}
                  <div className="flex items-center border border-gray-200 rounded-md bg-white shadow-xs overflow-hidden h-7">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-none hover:bg-gray-100"
                      onClick={() => {
                        const newQuantity = Math.max(0, item.quantity - 1);
                        if (newQuantity === 0) onDeleteProduct(item.product.id);
                        else {
                          onUpdateQuantity(
                            item.product.id,
                            newQuantity,
                            item.selectedSize?.id || null,
                            item.selectedOptionGroups || [],
                            item.selectedAddons?.map((a: any) => a.id) || [],
                            item.selectedColor
                          );
                        }
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14" /></svg>
                    </Button>
                    <span className="w-8 text-center text-xs font-semibold text-gray-900">{item.quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-none hover:bg-gray-100"
                      onClick={() => {
                        onUpdateQuantity(
                          item.product.id,
                          item.quantity + 1,
                          item.selectedSize?.id || null,
                          item.selectedOptionGroups || [],
                          item.selectedAddons?.map((a: any) => a.id) || [],
                          item.selectedColor
                        );
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                    </Button>
                  </div>
                  <span className="font-bold text-xs md:text-sm text-primary">
                    {formatCurrency(item.totalPrice, 'جنيه')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Per-Supplier Coupon Section */}
        <div className="px-4 pt-3 pb-1">
          {!appliedCoupon ? (
            <div className="rounded-xl border border-dashed border-purple-200 overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => setIsCouponFieldOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-purple-50/60 hover:bg-purple-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-purple-500" />
                  <span className="text-xs font-bold text-purple-800">لديك كوبون خصم لهذا التاجر؟</span>
                </div>
                <CheckCircle className={`w-3.5 h-3.5 transition-all duration-200 ${isCouponFieldOpen ? 'rotate-45 text-red-400' : 'text-purple-300'}`} />
              </button>
              {isCouponFieldOpen && (
                <div className="px-4 pb-4 pt-3 bg-white border-t border-purple-100">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        placeholder="رمز الكوبون"
                        value={couponInput}
                        onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
                        className={`h-9 bg-white text-xs uppercase text-center font-bold tracking-widest ${couponError ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleApplyCoupon(); }}
                        autoFocus
                      />
                      {couponError && <span className="absolute -bottom-5 right-1 text-[9px] text-red-500 font-medium">{couponError}</span>}
                    </div>
                    <Button
                      onClick={handleApplyCoupon}
                      disabled={isCouponLoading || !couponInput.trim()}
                      className="h-9 px-4 bg-purple-700 text-white text-xs font-bold hover:bg-purple-800"
                    >
                      {isCouponLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'تفعيل'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <div>
                  <div className="font-bold text-green-800 text-xs">كوبون مفعّل!</div>
                  <div className="font-mono text-[10px] text-green-600 font-bold tracking-widest">{appliedCoupon.code}</div>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleRemoveCoupon} className="text-red-400 hover:text-red-600 hover:bg-red-50 h-7 px-2 text-xs font-bold">
                إلغاء
              </Button>
            </div>
          )}
        </div>

        {/* Collapsible Form Section */}
        <div className="bg-gray-50/50 border-t border-gray-100 p-4 mt-3">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="checkout-form" className="border-b-0">
              <AccordionTrigger className="hover:no-underline py-2.5 px-4 bg-white hover:bg-gray-50/80 rounded-xl border border-gray-200/80 shadow-xs flex items-center justify-between text-sm font-bold text-gray-700">
                <span className="flex items-center gap-2 text-primary">
                  <User className="w-4 h-4" />
                  شحن ودفع / حجز منتجات {group.supplierName || 'التاجر'}
                </span>
              </AccordionTrigger>
              <AccordionContent className="pt-4 px-1 pb-0 space-y-4">
                <Tabs value={orderType} onValueChange={(v) => setOrderType(v as any)} className="w-full">
                  {canBuyOnline && canReserve ? (
                    <TabsList className="grid w-full grid-cols-2 mb-4 h-10 p-1 bg-gray-100">
                      <TabsTrigger value="online_purchase" className="h-full text-xs data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-xs">
                        <Truck className="h-3.5 w-3.5 mr-1.5" />
                        شراء أونلاين
                      </TabsTrigger>
                      <TabsTrigger value="reservation" className="h-full text-xs data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-xs">
                        <CalendarClock className="h-3.5 w-3.5 mr-1.5" />
                        حجز منتج
                      </TabsTrigger>
                    </TabsList>
                  ) : (
                    <div className="mb-4">
                      {canBuyOnline ? (
                        <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-center">
                          🚚 منتجات هذا التاجر تدعم الشراء والشحن أونلاين فقط
                        </p>
                      ) : (
                        <p className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 p-3 rounded-xl text-center">
                          🏢 منتجات هذا التاجر تدعم الحجز والاستلام الشخصي من الفرع فقط
                        </p>
                      )}
                    </div>
                  )}

                  {/* Online Purchase Tab Content */}
                  <TabsContent value="online_purchase" className="space-y-4">
                    {/* Payment Info inside online purchase */}
                    <Accordion type="multiple" className="w-full">
                      <AccordionItem value="payment-info" className="bg-purple-50/40 rounded-lg border border-purple-100 px-3.5 mb-4">
                        <AccordionTrigger className="hover:no-underline py-2 text-xs font-bold text-purple-900">
                          <span className="flex items-center gap-2">
                            <MessageCircle className="h-4 w-4 text-purple-600" />
                            طرق دفع عربون الجدية للتاجر
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="pb-2 pt-1 text-xs space-y-2">
                          <div className="bg-white/75 p-2.5 rounded border border-purple-100/60 space-y-1">
                            <span className="font-semibold text-purple-800 block">فودافون كاش / انستا باي إدارة بازار:</span>
                            <span className="text-sm font-bold font-mono dir-ltr text-left block text-purple-700 select-all">
                              01024911062
                            </span>
                          </div>
                          <span className="text-[10px] text-purple-700 leading-relaxed block">
                            * بعد التحويل، يرجى إرسال لقطة شاشة للتحويل للتاجر عبر الواتساب لتأكيد الطلب وشحنه.
                          </span>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>

                    {/* Form Fields */}
                    <form onSubmit={handleSubmit(onDeliverySubmit)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-gray-600">الاسم بالكامل <span className="text-red-500">*</span></Label>
                          <Input
                            placeholder="أدخل اسمك الكامل"
                            {...register('fullName', { required: 'هذا الحقل إلزامي' })}
                            className={`h-9 text-xs ${errors.fullName ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                          />
                          {errors.fullName && <p className="text-[10px] text-red-500">{errors.fullName.message}</p>}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-gray-600">رقم الهاتف <span className="text-red-500">*</span></Label>
                          <Input
                            type="tel"
                            placeholder="01XXXXXXXXX"
                            {...register('phoneNumber', {
                              required: 'هذا الحقل إلزامي',
                              pattern: {
                                value: /^01[0-9]{9,}$/,
                                message: 'رقم هاتف غير صحيح'
                              }
                            })}
                            className={`h-9 text-xs ${errors.phoneNumber ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                          />
                          {errors.phoneNumber && <p className="text-[10px] text-red-500">{errors.phoneNumber.message}</p>}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-gray-600">المحافظة <span className="text-red-500">*</span></Label>
                        <select
                          {...register('city', { required: 'هذا الحقل إلزامي' })}
                          className={`flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${errors.city ? 'border-red-500' : ''}`}
                        >
                          <option value="">اختر المحافظة</option>
                          {STORE_GOVERNORATES.map(gov => (
                            <option key={gov.name} value={gov.name}>
                              {gov.name} - {formatCurrency(gov.shippingCost, 'جنيه')}
                            </option>
                          ))}
                        </select>
                        {errors.city && <p className="text-[10px] text-red-500">{errors.city.message}</p>}
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-gray-600">العنوان بالتفصيل <span className="text-red-500">*</span></Label>
                        <Input
                          placeholder="الشارع، رقم العمارة، الشقة"
                          {...register('address', { required: 'هذا الحقل إلزامي' })}
                          className={`h-9 text-xs ${errors.address ? 'border-red-500' : ''}`}
                        />
                        {errors.address && <p className="text-[10px] text-red-500">{errors.address.message}</p>}
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-gray-600">ملاحظات <span className="text-gray-400 text-[10px]">(اختياري)</span></Label>
                        <Textarea
                          placeholder="تعليمات إضافية للتوصيل..."
                          className="resize-none min-h-[60px] text-xs"
                          {...register('notes')}
                        />
                      </div>

                      {/* Group Financial Breakdown */}
                      <div className="bg-gray-100/70 rounded-xl p-3 space-y-2 border border-gray-200/50 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500">إجمالي المنتجات</span>
                          <span className="font-semibold">{formatCurrency(groupSubtotal, 'جنيه')}</span>
                        </div>
                        {groupCouponDiscount > 0 && (
                          <div className="flex justify-between text-green-700">
                            <span>خصم الكوبون</span>
                            <span className="font-bold">- {formatCurrency(groupCouponDiscount, 'جنيه')}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-500">مصاريف الشحن</span>
                          <span className="font-semibold">{formatCurrency(shippingCost, 'جنيه')}</span>
                        </div>
                        <div className="flex justify-between border-t border-gray-200 pt-2 font-bold text-sm text-primary">
                          <span>الإجمالي النهائي للتاجر</span>
                          <span>{formatCurrency(groupTotal, 'جنيه')}</span>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={!isValid || isSubmitting}
                        className="w-full h-11 text-sm bg-primary hover:bg-primary/90 shadow-xs hover:shadow-sm text-white"
                      >
                        {isSubmitting ? 'جاري إرسال الطلب...' : (
                          <span className="flex items-center justify-center gap-1.5">
                            <FaWhatsapp className="h-4 w-4" />
                            إتمام الطلب مع {group.supplierName || 'التاجر'} عبر واتساب
                          </span>
                        )}
                      </Button>
                    </form>
                  </TabsContent>

                  {/* Reservation Tab Content */}
                  <TabsContent value="reservation" className="space-y-4">
                    {/* Reservation Deposit Info */}
                    <Accordion type="multiple" className="w-full">
                      <AccordionItem value="deposit-info" className="bg-blue-50/40 rounded-lg border border-blue-100 px-3.5 mb-4">
                        <AccordionTrigger className="hover:no-underline py-2 text-xs font-bold text-blue-900">
                          <span className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-blue-600" />
                            دفع جدية حجز للتاجر
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="pb-2 pt-1 text-xs space-y-2">
                          <p className="text-blue-800 leading-relaxed text-[11px]">
                            لضمان حجز المنتجات، يرجى تحويل مبلغ <span className="font-bold text-blue-900 bg-blue-100 px-1 py-0.5 rounded">200 جنيه</span> كجدية حجز.
                          </p>
                          <div className="bg-white/75 p-2.5 rounded border border-blue-100/60 space-y-1">
                            <span className="font-semibold text-blue-800 block">فودافون كاش / انستا باي إدارة بازار:</span>
                            <span className="text-sm font-bold font-mono dir-ltr text-left block text-blue-700 select-all">
                              01024911062
                            </span>
                          </div>
                          <span className="text-[10px] text-blue-700 block">
                            * يرجى إرسال لقطة شاشة للتحويل عبر واتساب بعد إتمام الحجز.
                          </span>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>

                    <form onSubmit={handleSubmitReservation(handleReservationSubmit)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-gray-600">الاسم بالكامل <span className="text-red-500">*</span></Label>
                          <Input
                            placeholder="الاسم"
                            {...registerReservation("fullName", { required: "مطلوب" })}
                            className={`h-9 text-xs ${reservationErrors.fullName ? 'border-red-500' : ''}`}
                          />
                          {reservationErrors.fullName && <p className="text-[10px] text-red-500">{reservationErrors.fullName.message}</p>}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-gray-600">رقم الهاتف <span className="text-red-500">*</span></Label>
                          <Input
                            placeholder="01XXXXXXXXX"
                            {...registerReservation("phoneNumber", {
                              required: "مطلوب",
                              pattern: { value: /^01[0-9]{9,}$/, message: "رقم غير صحيح" }
                            })}
                            className={`h-9 text-xs ${reservationErrors.phoneNumber ? 'border-red-500' : ''}`}
                          />
                          {reservationErrors.phoneNumber && <p className="text-[10px] text-red-500">{reservationErrors.phoneNumber.message}</p>}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-gray-600">التاريخ <span className="text-red-500">*</span></Label>
                          <Input
                            type="date"
                            min={minDateStr}
                            max={maxDateStr}
                            {...registerReservation("appointmentDate", { required: "مطلوب" })}
                            className={`h-9 text-xs ${reservationErrors.appointmentDate ? 'border-red-500' : ''}`}
                          />
                          {reservationErrors.appointmentDate && <p className="text-[10px] text-red-500">مطلوب</p>}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-gray-600">الوقت <span className="text-red-500">*</span></Label>
                          <Input
                            type="time"
                            {...registerReservation("appointmentTime", { required: "مطلوب" })}
                            className={`h-9 text-xs ${reservationErrors.appointmentTime ? 'border-red-500' : ''}`}
                          />
                          {reservationErrors.appointmentTime && <p className="text-[10px] text-red-500">مطلوب</p>}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-gray-600">ملاحظات إضافية <span className="text-gray-400 text-[10px]">(اختياري)</span></Label>
                        <Textarea
                          placeholder="تفاصيل أخرى..."
                          {...registerReservation("notes")}
                          className="min-h-[50px] text-xs resize-none"
                        />
                      </div>

                      {/* Group Financial Breakdown (Reservation has no shipping) */}
                      <div className="bg-gray-100/70 rounded-xl p-3 space-y-2 border border-gray-200/50 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500">إجمالي المنتجات</span>
                          <span className="font-semibold">{formatCurrency(groupSubtotal, 'جنيه')}</span>
                        </div>
                        {groupCouponDiscount > 0 && (
                          <div className="flex justify-between text-green-700">
                            <span>خصم الكوبون</span>
                            <span className="font-bold">- {formatCurrency(groupCouponDiscount, 'جنيه')}</span>
                          </div>
                        )}
                        <div className="flex justify-between border-t border-gray-200 pt-2 font-bold text-sm text-primary">
                          <span>الإجمالي النهائي للحجز</span>
                          <span>{formatCurrency(Math.max(0, groupSubtotal - groupCouponDiscount), 'جنيه')}</span>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={!isReservationValid || isSubmitting}
                        className="w-full h-11 text-sm bg-primary hover:bg-primary/90 shadow-xs hover:shadow-sm text-white"
                      >
                        {isSubmitting ? 'جاري إتمام الحجز...' : (
                          <span className="flex items-center justify-center gap-1.5">
                            <FaWhatsapp className="h-4 w-4" />
                            تأكيد الحجز مع {group.supplierName || 'التاجر'} عبر واتساب
                          </span>
                        )}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </CardContent>
    </Card>
  );
};

const Cart = () => {
  const cart = useStore((state) => state.cart);
  const removeFromCart = useStore((state) => state.removeFromCart);
  const getCartTotal = useStore((state) => state.getCartTotal);
  const getCartItemPrice = useStore((state) => state.getCartItemPrice);
  const updateCartItemQuantity = useStore((state) => state.updateCartItemQuantity);
  const { userProfile } = useAuth();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { t } = useTranslation();
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [showClearCartAlert, setShowClearCartAlert] = useState(false);
  const [showLoginRequiredModal, setShowLoginRequiredModal] = useState(false);
  const navigate = useNavigate();

  // Shared Customer Info state
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    fullName: '',
    phoneNumber: '',
    city: '',
    address: '',
    notes: '',
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCustomerInfo({
        fullName: localStorage.getItem('bazar-fashion_checkout_fullName') || localStorage.getItem('bazar_checkout_fullName') || '',
        phoneNumber: localStorage.getItem('bazar-fashion_checkout_phoneNumber') || localStorage.getItem('bazar_checkout_phoneNumber') || '',
        city: localStorage.getItem('bazar-fashion_checkout_city') || localStorage.getItem('bazar_checkout_city') || '',
        address: localStorage.getItem('bazar-fashion_checkout_address') || localStorage.getItem('bazar_checkout_address') || '',
        notes: localStorage.getItem('bazar-fashion_checkout_notes') || localStorage.getItem('bazar_checkout_notes') || '',
      });
    }
  }, []);

  useEffect(() => {
    if (cart.length > 0) {
      const items = cart.map(i => ({
        id: i.product?.id,
        quantity: i.quantity,
        price: i.unitFinalPrice || i.product?.price || 0,
      }));
      trackMetaInitiateCheckout(items, totalAmount);
    }
  }, [cart.length]);

  const [lastSuccessfulSupplierKey, setLastSuccessfulSupplierKey] = useState<string | null>(null);

  // Order Success Modal State
  const [orderSuccess, setOrderSuccess] = useState<{
    isOpen: boolean;
    orderCode?: string;
    type: 'online' | 'reservation';
    governorate?: string;
    whatsappUrl: string;
    totalAmount?: number;
    supplierPhone?: string;
    supplierName?: string;
    supplierLogo?: string;
    items?: any[];
    reservationInfo?: {
      fullName: string;
      phoneNumber: string;
      appointmentDate: string;
      appointmentTime: string;
      notes?: string;
    } | null;
    deliveryInfo?: {
      fullName: string;
      phoneNumber: string;
      address: string;
      city: string;
      notes?: string;
    } | null;
  }>({
    isOpen: false,
    type: 'online',
    whatsappUrl: '',
    deliveryInfo: null
  });

  const totalAmount = getCartTotal();


  // Group cart items by supplier

  const cartBySupplier = (() => {
    const groups: Record<string, { supplierName: string; supplierPhone: string; supplierLogo?: string; items: typeof cart }> = {};
    cart.filter(item => item.product && item.product.id).forEach(item => {
      const trimmedPhone = (item.product.wholesaleInfo?.supplierPhone || '').trim();
      const trimmedName = (item.product.wholesaleInfo?.supplierName || '').trim();
      const key = trimmedName || trimmedPhone || '__default__';
      if (!groups[key]) {
        groups[key] = {
          supplierName: trimmedName,
          supplierPhone: trimmedPhone,
          supplierLogo: item.product.wholesaleInfo?.supplierLogo,
          items: []
        };
      }
      groups[key].items.push(item);
    });
    return Object.values(groups);
  })();

  const handleCloseSuccessModal = () => {
    setOrderSuccess(prev => ({ ...prev, isOpen: false }));
    if (lastSuccessfulSupplierKey) {
      const remainingItems = useStore.getState().cart.filter(item => {
        const trimmedPhone = (item.product.wholesaleInfo?.supplierPhone || '').trim();
        const trimmedName = (item.product.wholesaleInfo?.supplierName || '').trim();
        const key = trimmedName || trimmedPhone || '__default__';
        return key !== lastSuccessfulSupplierKey;
      });
      useStore.setState({ cart: remainingItems });
      if (remainingItems.length === 0) {
        navigate('/products');
      }
    } else {
      useStore.getState().clearCart(true);
      navigate('/products');
    }
    useStore.getState().loadProducts();
    setLastSuccessfulSupplierKey(null);
  };

  const handleOrderSuccess = (data: {
    orderCode?: string;
    type: 'online' | 'reservation';
    governorate?: string;
    whatsappUrl: string;
    totalAmount: number;
    supplierKey: string;
    supplierPhone?: string;
    supplierName?: string;
    supplierLogo?: string;
    items?: any[];
    reservationInfo?: any;
    deliveryInfo?: any;
  }) => {
    setLastSuccessfulSupplierKey(data.supplierKey);
    setOrderSuccess({
      isOpen: true,
      orderCode: data.orderCode,
      type: data.type,
      governorate: data.governorate,
      whatsappUrl: data.whatsappUrl,
      totalAmount: data.totalAmount,
      supplierPhone: data.supplierPhone,
      supplierName: data.supplierName,
      supplierLogo: data.supplierLogo,
      items: data.items,
      reservationInfo: data.reservationInfo,
      deliveryInfo: data.deliveryInfo
    });
    // Track Meta Purchase / Reservation event (Pixel + CAPI)
    const orderItems = (data.items || []).map((i: any) => ({
      id: i.product?.id || i.id,
      quantity: i.quantity || 1,
    }));
    trackMetaPurchase(`ord_${Date.now()}`, data.totalAmount, orderItems);
  };

  const handleDeleteClick = (productId: string) => {
    setProductToDelete(productId);
    setShowDeleteAlert(true);
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen">
        <main className="container py-8">
          {/* Breadcrumb */}
          <nav aria-label="breadcrumb" className="mb-6 flex items-center gap-1.5 text-sm bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm animate-fade-slide-in flex-wrap">
            <span className="font-extrabold text-primary bg-primary/5 border border-primary/20 px-3 py-1 rounded-xl text-xs sm:text-sm shadow-sm">
              {t("cart.title")}
            </span>
          </nav>

          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">{t("cart.title")}</h1>
          </div>

          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="bg-white rounded-lg border shadow-sm p-8 max-w-md w-full text-center">
              <div className="mx-auto mb-6">
                <div className="bg-gray-100 rounded-full p-6 w-20 h-20 mx-auto flex items-center justify-center">
                  <ShoppingBag className="w-10 h-10 text-gray-400" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {t("cart.emptyTitle")}
              </h2>
              <p className="text-gray-600 mb-8">
                {t("cart.emptyDescription")}
              </p>
              <div className="space-y-3">
                <Button
                  onClick={() => navigate("/products")}
                  className="w-full bg-primary hover:bg-primary/90 text-white"
                  size="lg"
                >
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  {t("cart.startShopping")}
                </Button>
                <Button
                  onClick={() => navigate("/")}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  العودة للرئيسية
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <main className="container py-8">
        {/* Breadcrumb */}
        <nav aria-label="breadcrumb" className="mb-6 flex items-center gap-1.5 text-sm bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm animate-fade-slide-in flex-wrap">
          <span className="font-extrabold text-primary bg-primary/5 border border-primary/20 px-3 py-1 rounded-xl text-xs sm:text-sm shadow-sm">
            {t("cart.title")}
          </span>
        </nav>

        <h1 className="text-3xl font-bold mb-8">{t("cart.title")}</h1>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Right Column: Supplier Checkout Cards */}
          <div className="lg:col-span-2 space-y-6">
            {cartBySupplier.map((group, gi) => (
              <SupplierGroupCheckout
                key={gi}
                group={group}
                customerInfo={customerInfo}
                setCustomerInfo={setCustomerInfo}
                onOrderSuccess={handleOrderSuccess}
                onDeleteProduct={handleDeleteClick}
                onUpdateQuantity={updateCartItemQuantity}
                userProfile={userProfile}
                formatCurrency={formatCurrency}
                getColorByName={getColorByName}
                getProductUrl={getProductUrl}
              />
            ))}
          </div>

          {/* Left Column: Grand Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              <Card className="border-gray-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-gray-50/50 py-4 border-b">
                  <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5 text-primary" />
                    ملخص السلة الإجمالي
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>إجمالي المنتجات في السلة</span>
                      <span className="font-semibold">{cart.reduce((acc, item) => acc + item.quantity, 0)} منتج</span>
                    </div>
                    <div className="flex justify-between text-gray-600 border-b pb-3 border-gray-100">
                      <span className="text-lg font-bold text-gray-800">المجموع الفرعي</span>
                      <span className="text-xl font-bold text-gray-900">{formatCurrency(totalAmount, 'جنيه')}</span>
                    </div>

                  </div>

                  {/* Clear cart and instructions */}
                  <div className="pt-4 space-y-4 border-t border-gray-100">
                    <Button
                      variant="outline"
                      className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200 transition-colors h-10 text-xs"
                      onClick={() => setShowClearCartAlert(true)}
                    >
                      <Trash2Icon className="h-4 w-4 mr-2" />
                      مسح السلة بالكامل
                    </Button>

                    <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-800 space-y-2">
                      <div className="flex items-center gap-2 font-bold text-amber-900">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        طريقة إتمام الطلب:
                      </div>
                      <p className="leading-relaxed">
                        بما أن سلتك تحتوي على منتجات من تجار مختلفين، فقد قمنا بتقسيم طلبك حسب كل تاجر. يرجى مراجعة وتأكيد بيانات كل تاجر وإتمام طلبه عبر زر الواتساب المخصص له بشكل منفصل.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>حذف المنتج</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف هذا المنتج من السلة؟
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={async () => {
                if (productToDelete) {
                  try {
                    removeFromCart(productToDelete);
                    toast.success("تم حذف المنتج من السلة");
                  } catch (error) {
                    toast.error("خطأ في حذف المنتج");
                  }
                }
                setShowDeleteAlert(false);
                setProductToDelete(null);
              }}>
                حذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Clear Cart Confirmation Dialog */}
        <AlertDialog open={showClearCartAlert} onOpenChange={setShowClearCartAlert}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>مسح السلة</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من مسح جميع المنتجات من السلة؟ سيتم استعادة الكميات المحفوظة في المخزن.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={async () => {
                try {
                  await clearCart();
                  setShowClearCartAlert(false);
                  toast.success("تم مسح السلة");
                } catch (error) {
                  console.error('Error clearing cart:', error);
                  toast.error("فشل في مسح السلة");
                }
              }}>
                مسح
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <ProductModal
          product={selectedProduct}
          open={modalOpen}
          onOpenChange={setModalOpen}
          hideAddToCart={true}
        />
        <LoginRequiredModal
          open={showLoginRequiredModal}
          onOpenChange={setShowLoginRequiredModal}
        />

        {/* Success Modal */}
        <OrderSuccessModal
          open={orderSuccess.isOpen && orderSuccess.type === 'online'}
          onClose={handleCloseSuccessModal}
          orderCode={orderSuccess.orderCode}
          items={orderSuccess.items ? orderSuccess.items.map(item => ({
            productId: item.product.id || '',
            productName: item.product.name,
            price: item.unitFinalPrice,
            quantity: item.quantity,
            image: item.product.images?.[0] || '',
            selectedSize: item.selectedSize,
            selectedColor: item.selectedColor,
            selectedOptionGroups: item.selectedOptionGroups ? item.selectedOptionGroups.map((opt: any) => ({
              groupName: opt.groupName,
              optionLabel: opt.optionLabel,
              extraPrice: opt.extraPrice
            })) : null
          })) : []}
          deliveryInfo={orderSuccess.deliveryInfo || null}
          totalAmount={orderSuccess.totalAmount || 0}
          whatsappUrl={orderSuccess.whatsappUrl}
          supplierName={orderSuccess.supplierName}
          supplierLogo={orderSuccess.supplierLogo}
        />

        {/* Reservation Success Modal */}
        <ReservationSuccessModal
          open={orderSuccess.isOpen && orderSuccess.type === 'reservation'}
          onClose={handleCloseSuccessModal}
          orderCode={orderSuccess.orderCode}
          items={orderSuccess.items ? orderSuccess.items.map(item => ({
            productId: item.product.id || '',
            productName: item.product.name,
            price: item.unitFinalPrice,
            quantity: item.quantity,
            image: item.product.images?.[0] || '',
            selectedSize: item.selectedSize,
            selectedColor: item.selectedColor,
            selectedOptionGroups: item.selectedOptionGroups ? item.selectedOptionGroups.map((opt: any) => ({
              groupName: opt.groupName,
              optionLabel: opt.optionLabel,
              extraPrice: opt.extraPrice
            })) : null
          })) : []}
          reservationInfo={orderSuccess.reservationInfo || null}
          totalAmount={orderSuccess.totalAmount || 0}
          whatsappUrl={orderSuccess.whatsappUrl}
          supplierName={orderSuccess.supplierName}
          supplierLogo={orderSuccess.supplierLogo}
        />

      </main>
    </div>
  );
};

export default Cart;

function getCartItemPrice(item: any) {
  if (typeof item?.unitFinalPrice === "number") {
    return item.unitFinalPrice;
  }
  const now = new Date();
  const product = item?.product || {};
  let price = Number(product.price ?? 0);
  const hasDiscount =
    product.specialOffer &&
    typeof product.discountPercentage === "number" &&
    product.discountPercentage > 0;

  if (hasDiscount) {
    const endsAt = product.offerEndsAt ? new Date(product.offerEndsAt) : null;
    if (!endsAt || endsAt > now) {
      const discount = Number(product.discountPercentage);
      price = price * (1 - discount / 100);
    }
  }

  if (item?.selectedSize?.price != null) {
    price += Number(item.selectedSize.price);
  }

  if (Array.isArray(item?.selectedAddons)) {
    price += item.selectedAddons.reduce((sum: number, addon: any) => {
      return sum + Number(addon.price_delta ?? addon.price ?? 0);
    }, 0);
  }
  return Math.round(price * 100) / 100;
}

async function clearCart(): Promise<void> {
  const store = useStore.getState();
  const currentCart = store.cart ?? [];
  if (currentCart.length === 0) {
    if (typeof store.clearCart === "function") {
      store.clearCart();
    } else if (typeof (store as any).setCart === "function") {
      (store as any).setCart([]);
    }
    return;
  }
  const restorePayload = currentCart
    .filter((item: any) => item.product && item.product.id)
    .map((item: any) => ({
      productId: item.product.id,
      quantityToRestore: item.quantity,
    }));
  const negativeDeductPayload = currentCart
    .filter((item: any) => item.product && item.product.id)
    .map((item: any) => ({
      productId: item.product.id,
      quantityToDeduct: -item.quantity,
    }));

  try {
    const lib = await import("@/lib/firebase");
    if (typeof lib.restoreProductQuantitiesAtomically === "function") {
      try {
        await lib.restoreProductQuantitiesAtomically(restorePayload);
      } catch {
        await lib.restoreProductQuantitiesAtomically(restorePayload as any);
      }
    } else if (typeof lib.updateProductQuantitiesAtomically === "function") {
      await lib.updateProductQuantitiesAtomically(negativeDeductPayload);
    }
  } catch (err) {
    console.warn("clearCart: failed to restore quantities atomically", err);
  } finally {
    if (typeof store.clearCart === "function") {
      store.clearCart();
    } else if (typeof (store as any).setCart === "function") {
      (store as any).setCart([]);
    } else if (typeof (store as any).removeAll === "function") {
      (store as any).removeAll();
    }
  }
}
