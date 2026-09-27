'use client';

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ShoppingCart,
  Share2,
  Printer,
  Sparkles,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  RefreshCw,
  Layers,
  CheckCircle2,
  Tag,
  ArrowLeft,
  ArrowRight,
  Home,
  X,
  Plus,
  Info,
  Truck,
  CalendarClock,
  Loader2,
  PhoneCall,
  Settings as SettingsIcon,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { toast } from "sonner";
import { useStore } from "@/store/useStore";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { BUILDER_PRESETS as DEFAULT_PRESETS } from "@/constants/builderPresets";
import { builderService } from "@/lib/builderService";
import { BuilderPreset, BuilderStep, BuilderOption } from "@/types/builder";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { STORE_GOVERNORATES, STORE_CONFIG } from "@/constants/store";
import OrderSuccessModal from "@/components/OrderSuccessModal";
import ReservationSuccessModal from "@/components/ReservationSuccessModal";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { BuilderPrintSheet } from "@/components/builder/BuilderPrintSheet";
import { BuilderPrintModal } from "@/components/builder/BuilderPrintModal";
import { generateOrderTrackingCode, saveTrackedOrder } from "@/utils/orderTracking";

interface BuilderViewProps {
  initialSlug?: string;
}

export default function BuilderView({ initialSlug }: BuilderViewProps = {}) {
  const router = useRouter();
  const routeParams = useParams();
  const rawParamSlug = routeParams?.slug;
  const paramSlug = typeof rawParamSlug === 'string' ? rawParamSlug : Array.isArray(rawParamSlug) ? rawParamSlug[0] : "";
  const currentSlug = (initialSlug || paramSlug || "").trim().toLowerCase();

  const { settings } = useSiteSettings();
  const addToCart = useStore((s) => s.addToCart);

  // Dynamic preset state
  const [currentPreset, setCurrentPreset] = useState<BuilderPreset | null>(null);
  const [loading, setLoading] = useState(true);

  // Load single preset with caching on mount or slug change
  useEffect(() => {
    let isMounted = true;
    async function fetchDynamicData() {
      setLoading(true);
      try {
        const targetSlug = currentSlug || "am4-budget";
        const presetData = await builderService.getPresetBySlugOrId(targetSlug);

        if (isMounted && presetData) {
          setCurrentPreset(presetData);
        }
      } catch (err) {
        console.warn("BuilderView: failed to fetch dynamic data", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchDynamicData();
    return () => {
      isMounted = false;
    };
  }, [currentSlug]);


  // Selected options per step: map of { [stepId]: BuilderOption | null }
  const [selections, setSelections] = useState<{ [stepId: string]: BuilderOption | null }>({});

  // Sync selections whenever presets from Firebase or active preset changes
  useEffect(() => {
    if (currentPreset && currentPreset.steps) {
      setSelections((prev) => {
        const updated: { [stepId: string]: BuilderOption | null } = {};
        currentPreset.steps.forEach((step) => {
          const existing = prev[step.id];
          const stillExists = existing ? step.options.some((o) => o.id === existing.id) : false;
          if (stillExists) {
            updated[step.id] = existing;
          } else {
            const defaultOpt = step.options.find((o) => o.id === step.defaultOptionId) || (step.required ? step.options[0] : null);
            updated[step.id] = defaultOpt || null;
          }
        });
        return updated;
      });
    }
  }, [currentPreset]);


  // Select or Deselect an option
  const handleToggleOption = (step: BuilderStep, option: BuilderOption) => {
    setSelections((prev) => {
      const current = prev[step.id];
      if (current?.id === option.id) {
        // If required, don't allow unselecting completely (or show warning)
        if (step.required) {
          toast.info("هذا المكون أساسي في التجميعة، يمكنك تغييره بخيار آخر");
          return prev;
        }
        return { ...prev, [step.id]: null };
      }
      return { ...prev, [step.id]: option };
    });
  };

  // Note for PDF / export
  const [pdfNote, setPdfNote] = useState("");
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Price calculations
  const { originalPrice, totalPrice, savingsAmount, discountPercent } = useMemo(() => {
    if (!currentPreset) {
      return { originalPrice: 0, totalPrice: 0, savingsAmount: 0, discountPercent: 0 };
    }
    let baseSum = 0;
    Object.values(selections).forEach((opt) => {
      if (opt) baseSum += opt.price;
    });

    const discountRate = (currentPreset.discountPercentage || 0) / 100;
    const discounted = Math.round(baseSum * (1 - discountRate));
    const savings = baseSum - discounted;

    return {
      originalPrice: baseSum,
      totalPrice: discounted > 0 ? discounted : baseSum,
      savingsAmount: savings,
      discountPercent: currentPreset.discountPercentage || 0,
    };
  }, [selections, currentPreset]);

  // Missing required components
  const missingRequiredSteps = useMemo(() => {
    if (!currentPreset) return [];
    return currentPreset.steps.filter((s) => s.required && !selections[s.id]);
  }, [currentPreset, selections]);

  // Dynamic count of total available options in current preset
  const totalOptionsCount = useMemo(() => {
    if (!currentPreset || !currentPreset.steps) return 0;
    return currentPreset.steps.reduce((acc, step) => acc + (step.options?.length || 0), 0);
  }, [currentPreset]);

  // Memoized selected items for print/export sheet
  const selectedPrintItems = useMemo(() => {
    if (!currentPreset) return [];
    return Object.entries(selections)
      .filter(([_, opt]) => opt !== null)
      .map(([stepId, opt]) => {
        const step = currentPreset.steps.find((s) => s.id === stepId);
        return {
          stepId,
          stepName: step?.name || "",
          stepNameEn: step?.nameEn,
          option: opt!,
        };
      });
  }, [currentPreset, selections]);

  // ── Checkout Form State ──
  const [formData, setFormData] = useState<{
    orderType: 'online_purchase' | 'reservation';
    fullName: string;
    phoneNumber: string;
    governorate: string;
    address: string;
    appointmentDate: string;
    appointmentTime: string;
    notes: string;
  }>({
    orderType: 'online_purchase',
    fullName: '',
    phoneNumber: '',
    governorate: '',
    address: '',
    appointmentDate: '',
    appointmentTime: '',
    notes: '',
  });

  const [formErrors, setFormErrors] = useState<Partial<Record<string, boolean>>>({});
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Success modals state
  const [orderSuccess, setOrderSuccess] = useState<{
    isOpen: boolean;
    orderCode?: string;
    type: 'online' | 'reservation';
    whatsappUrl: string;
    totalAmount: number;
    items: any[];
    deliveryInfo: any;
    reservationInfo: any;
  }>({
    isOpen: false,
    type: 'online',
    whatsappUrl: '',
    totalAmount: 0,
    items: [],
    deliveryInfo: null,
    reservationInfo: null,
  });

  // Selected Governorate and Shipping calculation
  const selectedGov = useMemo(() => {
    return STORE_GOVERNORATES.find((g) => g.name === formData.governorate);
  }, [formData.governorate]);

  const shippingCost = useMemo(() => {
    if (formData.orderType !== 'online_purchase') return 0;
    return selectedGov?.shippingCost ?? 0;
  }, [formData.orderType, selectedGov]);

  const finalOrderTotal = totalPrice + shippingCost;

  // Handle Order Submit (Online Purchase or Branch Reservation)
  const handleSubmitOrder = async () => {
    if (!currentPreset) return;

    // 1. Validate required steps
    if (missingRequiredSteps.length > 0) {
      toast.error(`يرجى تحديد المكونات الأساسية المطلوبة أولاً: ${missingRequiredSteps.map((s) => s.name).join(", ")}`);
      const firstMissingId = missingRequiredSteps[0].id;
      const el = document.getElementById(`step-${firstMissingId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // 2. Validate form inputs
    const errors: Partial<Record<string, boolean>> = {};
    if (!formData.fullName.trim()) errors.fullName = true;
    if (!formData.phoneNumber.trim() || !/^01[0-9]{9,}$/.test(formData.phoneNumber.trim())) {
      errors.phoneNumber = true;
    }

    if (formData.orderType === 'online_purchase') {
      if (!formData.governorate) errors.governorate = true;
      if (!formData.address.trim()) errors.address = true;
    } else {
      if (!formData.appointmentDate) errors.appointmentDate = true;
      if (!formData.appointmentTime) errors.appointmentTime = true;
    }

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      toast.error("يرجى ملء جميع الحقول المطلوبة بشكل صحيح");
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const selectedItems = Object.entries(selections)
        .filter(([_, opt]) => opt !== null)
        .map(([stepId, opt]) => {
          const step = currentPreset.steps.find((s) => s.id === stepId);
          return {
            stepId,
            stepName: step?.name || "",
            option: opt!,
          };
        });

      const orderLines = selectedItems.map(
        (item, idx) => `${idx + 1}. *${item.stepName}*: ${item.option.name} (${item.option.price.toLocaleString()} ج.م)`
      ).join("\n");

      const customerNotes = formData.notes?.trim() || '';

      const orderItem = {
        productId: `bundle-${currentPreset.id}`,
        productName: `تجميعة متكاملة: ${currentPreset.title}`,
        quantity: 1,
        price: totalPrice,
        totalPrice: totalPrice,
        image: currentPreset.showcaseImage || selectedItems[0]?.option.image || '',
        selectedOptionGroups: selectedItems.map((item) => ({
          groupId: item.stepId,
          groupName: item.stepName,
          optionId: item.option.id,
          optionLabel: `${item.option.name} (${item.option.price.toLocaleString()} ج.م)`,
          extraPrice: item.option.price,
        })),
      };

      const orderCode = generateOrderTrackingCode();

      const orderData = {
        orderCode,
        userId: `guest-${Date.now()}`,
        customerName: formData.fullName.trim(),
        customerPhone: formData.phoneNumber.trim(),
        total: finalOrderTotal,
        subtotal: totalPrice,
        shippingCost: shippingCost,
        status: 'pending',
        type: formData.orderType === 'reservation' ? 'reservation' : 'online',
        orderType: formData.orderType === 'reservation' ? 'حجز منتج في الفرع' : 'شراء أونلاين',
        isBundle: true,
        bundleTitle: currentPreset.title,
        bundleId: currentPreset.id,
        deliveryInfo: {
          fullName: formData.fullName.trim(),
          phoneNumber: formData.phoneNumber.trim(),
          address: formData.orderType === 'reservation' ? 'استلام من مقر المحل' : formData.address.trim(),
          city: formData.orderType === 'reservation' ? 'استلام من الفرع' : formData.governorate,
          notes: customerNotes,
        },
        reservationInfo: formData.orderType === 'reservation' ? {
          fullName: formData.fullName.trim(),
          phoneNumber: formData.phoneNumber.trim(),
          appointmentDate: formData.appointmentDate,
          appointmentTime: formData.appointmentTime,
          notes: customerNotes,
        } : null,
        items: [orderItem],
        bundleComponents: selectedItems.map((item) => ({
          stepName: item.stepName,
          productId: item.option.productId || item.option.id,
          name: item.option.name,
          brand: item.option.brand || '',
          price: item.option.price,
          image: item.option.image,
        })),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      // Save order into Firestore 'orders' collection
      await addDoc(collection(db, "orders"), orderData);

      // Save order to localStorage for customer tracking
      saveTrackedOrder({
        orderCode,
        type: formData.orderType === 'reservation' ? 'reservation' : 'online',
        total: finalOrderTotal,
        createdAt: new Date().toISOString(),
        itemsCount: selectedItems.length,
        customerName: formData.fullName.trim() || 'عميل تجميعات',
        customerPhone: formData.phoneNumber.trim(),
        status: 'pending',
      });

      // Construct WhatsApp link
      const phone = settings.whatsapp || settings.phone || STORE_CONFIG.contact.whatsapp || "01024911062";
      const cleanPhone = phone.replace(/\D/g, "");
      const formattedPhone = cleanPhone.startsWith("2") ? cleanPhone : `2${cleanPhone}`;

      const customerInfo = formData.orderType === 'reservation'
        ? [
            `👤 الاسم: ${formData.fullName}`,
            `📱 الهاتف: ${formData.phoneNumber}`,
            `📅 التاريخ: ${formData.appointmentDate}`,
            `⏰ الوقت: ${formData.appointmentTime}`,
            `🏷 النوع: حجز من الفرع`,
            formData.notes ? `📝 ملاحظات: ${formData.notes}` : null,
          ].filter(Boolean).join('\n')
        : [
            `👤 الاسم: ${formData.fullName}`,
            `🏙 المحافظة: ${formData.governorate}`,
            `📍 العنوان: ${formData.address}`,
            `📱 الهاتف: ${formData.phoneNumber}`,
            `🏷 النوع: شراء أونلاين`,
            formData.notes ? `📝 ملاحظات: ${formData.notes}` : null,
          ].filter(Boolean).join('\n');

      const waMsg = [
        formData.orderType === 'reservation' ? '📅 طلب حجز تجميعة جديدة' : '🚀 طلب شراء تجميعة أونلاين جديدة',
        '========================',
        formData.orderType === 'reservation' ? `🔢 كود الحجز للتتبع وتأكيد الوصول: *${orderCode}*` : `🔢 كود تتبع الطلب: *${orderCode}*`,
        '========================',
        `💻 التجميعة: *${currentPreset.title}*`,
        '========================',
        '*قطع التجميعة المختارة:*',
        orderLines,
        '========================',
        '*بيانات العميل:*',
        customerInfo,
        '========================',
        shippingCost > 0 ? `🚚 مصاريف الشحن: ${shippingCost.toLocaleString()} ج.م` : null,
        `💰 الإجمالي النهائي: ${finalOrderTotal.toLocaleString()} ج.م`,
        '========================',
        formData.orderType === 'reservation' ? 'يرجى تأكيد الحجز وتجهيز التجميعة للاستلام.' : 'يرجى تأكيد الطلب والبدء بالتجهيز والشحن.'
      ].filter(Boolean).join('\n');

      const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(waMsg)}`;

      // Trigger Success UI
      setOrderSuccess({
        isOpen: true,
        orderCode,
        type: formData.orderType === 'reservation' ? 'reservation' : 'online',
        whatsappUrl,
        totalAmount: finalOrderTotal,
        items: [orderItem],
        deliveryInfo: formData.orderType === 'reservation' ? null : {
          fullName: formData.fullName,
          phoneNumber: formData.phoneNumber,
          address: formData.address,
          city: formData.governorate,
          notes: customerNotes,
        },
        reservationInfo: formData.orderType === 'reservation' ? {
          fullName: formData.fullName,
          phoneNumber: formData.phoneNumber,
          appointmentDate: formData.appointmentDate,
          appointmentTime: formData.appointmentTime,
          notes: customerNotes,
        } : null,
      });

      toast.success(formData.orderType === 'reservation' ? 'تم تسجيل حجز التجميعة بنجاح!' : 'تم تسجيل طلب التجميعة بنجاح!');
      setIsMobileDrawerOpen(false);
    } catch (error: any) {
      console.error('Order creation error:', error);
      toast.error('حدث خطأ أثناء إتمام الطلب: ' + (error.message || 'يرجى المحاولة لاحقاً'));
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Share Build
  const handleShareBuild = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success("تم نسخ رابط التجميعة للحافظة! يمكنك مشاركته مع أصدقائك 🔗");
    }
  };

  // Print / PDF Export
  const handlePrint = () => {
    if (missingRequiredSteps.length > 0) {
      toast.warning(`تنبيه: لم يتم اختيار بعض المكونات الأساسية المطلوبة (${missingRequiredSteps.map((s) => s.name).join('، ')})`);
    }
    setIsPrintModalOpen(true);
  };

  // Reset selections
  const handleReset = () => {
    if (!currentPreset) return;
    const initial: { [stepId: string]: BuilderOption | null } = {};
    currentPreset.steps.forEach((step) => {
      const defaultOpt = step.options.find((o) => o.id === step.defaultOptionId) || (step.required ? step.options[0] : null);
      initial[step.id] = defaultOpt || null;
    });
    setSelections(initial);
    setPdfNote("");
    toast.info("تمت إعادة ضبط الاختيارات إلى الحالة الافتراضية");
  };

  // Dual-Tab Order Form Component
  const renderCheckoutForm = () => (
    <div className="space-y-4 pt-4 border-t border-gray-100 animate-in fade-in duration-300">
      <div className="space-y-2">
        <Label className="text-sm font-bold text-gray-900">أو أختر نوع الطلب</Label>
        <div className="flex p-1 bg-gray-100 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setFormData((prev) => ({ ...prev, orderType: 'online_purchase', appointmentDate: '', appointmentTime: '' }));
              setFormErrors({});
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs sm:text-sm border-2 font-bold rounded-lg transition-all ${
              formData.orderType === 'online_purchase'
                ? 'border-primary text-primary shadow-sm bg-white'
                : 'text-gray-500 hover:text-gray-900 border-transparent'
            }`}
          >
            <Truck className="w-4 h-4 shrink-0" />
            <span>شراء أونلاين</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setFormData((prev) => ({ ...prev, orderType: 'reservation', governorate: '', address: '' }));
              setFormErrors({});
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs sm:text-sm border-2 font-bold rounded-lg transition-all ${
              formData.orderType === 'reservation'
                ? 'border-primary text-primary shadow-sm bg-white'
                : 'text-gray-500 hover:text-gray-900 border-transparent'
            }`}
          >
            <CalendarClock className="w-4 h-4 shrink-0" />
            <span>حجز من الفرع</span>
          </button>
        </div>

        {formData.orderType === 'online_purchase' && (
          <p className="text-xs font-medium text-primary bg-primary/5 p-2.5 rounded-lg border border-primary/20 leading-relaxed text-center">
            شحن اللاب لحد عندك خلال 24-48 ساعة
          </p>
        )}
        {formData.orderType === 'reservation' && (
          <p className="text-xs font-medium text-primary bg-primary/5 p-2.5 rounded-lg border border-primary/20 leading-relaxed text-center">
            حجز و الاستلام في المحل بصوره الحجز خلال 24-48 ساعة
          </p>
        )}
      </div>

      {/* Full Name */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-gray-700">
          الاسم بالكامل <span className="text-red-500">*</span>
        </Label>
        <Input
          placeholder="أدخل اسمك الكريم"
          value={formData.fullName}
          onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))}
          className={`h-9 bg-white text-xs ${formErrors.fullName ? 'border-red-500 ring-1 ring-red-500' : ''}`}
        />
        {formErrors.fullName && <p className="text-[10px] text-red-500 font-medium">مطلوب</p>}
      </div>

      {/* Phone Number */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-gray-700">
          رقم الهاتف <span className="text-red-500">*</span>
        </Label>
        <Input
          placeholder="01xxxxxxxxx"
          type="tel"
          dir="ltr"
          value={formData.phoneNumber}
          onChange={(e) => setFormData((prev) => ({ ...prev, phoneNumber: e.target.value }))}
          className={`h-9 bg-white text-xs text-right ${formErrors.phoneNumber ? 'border-red-500 ring-1 ring-red-500' : ''}`}
        />
        {formErrors.phoneNumber && (
          <p className="text-[10px] text-red-500 font-medium">يرجى إدخال رقم هاتف مصري صحيح يبدأ بـ 01</p>
        )}
      </div>

      {/* Online Purchase Fields */}
      {formData.orderType === 'online_purchase' && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-700">
              المحافظة <span className="text-red-500">*</span>
            </Label>
            <select
              value={formData.governorate}
              onChange={(e) => setFormData((prev) => ({ ...prev, governorate: e.target.value }))}
              className={`flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-xs shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary ${
                formErrors.governorate ? 'border-red-500 ring-1 ring-red-500' : ''
              }`}
            >
              <option value="">اختر المحافظة</option>
              {STORE_GOVERNORATES.map((gov) => (
                <option key={gov.name} value={gov.name}>
                  {gov.name}
                </option>
              ))}
            </select>
            {formErrors.governorate && <p className="text-[10px] text-red-500 font-medium">مطلوب</p>}

            {formData.governorate ? (
              <div className="bg-primary/5 rounded-md p-2 border border-primary/10 mt-1.5 flex justify-between items-center px-3">
                <span className="text-xs text-primary font-medium">
                  الشحن: <span className="font-bold text-primary text-xs">
                    {selectedGov?.shippingCost ? `${selectedGov.shippingCost} ج.م` : 'مجاني'}
                  </span>
                </span>
                <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full font-medium">
                  {selectedGov?.deliveryTime || 'خلال 48 ساعة'}
                </span>
              </div>
            ) : (
              <p className="text-[10px] text-gray-500 mt-1">
                سيتم التواصل لتأكيد مصاريف الشحن
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-700">
              العنوان بالتفصيل <span className="text-red-500">*</span>
            </Label>
            <Textarea
              placeholder="اسم الشارع، رقم العمارة، علامة مميزة..."
              value={formData.address}
              onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
              className={`min-h-[55px] bg-white text-xs resize-none ${
                formErrors.address ? 'border-red-500 ring-1 ring-red-500' : ''
              }`}
            />
            {formErrors.address && <p className="text-[10px] text-red-500 font-medium">مطلوب</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-700">
              ملاحظات <span className="text-gray-400 font-normal">(اختياري)</span>
            </Label>
            <Textarea
              placeholder="أي تعليمات إضافية..."
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              className="min-h-[40px] bg-white text-xs resize-none"
            />
          </div>
        </>
      )}

      {/* Branch Reservation Fields */}
      {formData.orderType === 'reservation' && (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">
                تاريخ الحجز <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={formData.appointmentDate}
                min={new Date().toISOString().split('T')[0]}
                max={new Date(new Date().setDate(new Date().getDate() + 2)).toISOString().split('T')[0]}
                onChange={(e) => setFormData((prev) => ({ ...prev, appointmentDate: e.target.value }))}
                className={`h-9 bg-white text-xs ${formErrors.appointmentDate ? 'border-red-500 ring-1 ring-red-500' : ''}`}
              />
              {formErrors.appointmentDate && <p className="text-[10px] text-red-500 font-medium">مطلوب</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">
                الوقت <span className="text-red-500">*</span>
              </Label>
              <Input
                type="time"
                value={formData.appointmentTime}
                onChange={(e) => setFormData((prev) => ({ ...prev, appointmentTime: e.target.value }))}
                className={`h-9 bg-white text-xs ${formErrors.appointmentTime ? 'border-red-500 ring-1 ring-red-500' : ''}`}
              />
              {formErrors.appointmentTime && <p className="text-[10px] text-red-500 font-medium">مطلوب</p>}
            </div>
          </div>

          {formData.appointmentDate && formData.appointmentTime ? (
            <p className="text-[10px] text-red-500 mt-1 leading-tight">
              يرجى زيارة المحل خلال الفترة المحددة، وفي حال عدم الحضور سيتم اعتبار الحجز ملغيًا تلقائيًا.
            </p>
          ) : (
            <p className="text-xs text-primary/80 mt-1">
              الحجز في المحل في فتره لا تتجاوز اليومين
            </p>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-700">
              ملاحظات <span className="text-gray-400 font-normal">(اختياري)</span>
            </Label>
            <Textarea
              placeholder="أي تفاصيل أخرى..."
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              className="min-h-[40px] bg-white text-xs resize-none"
            />
          </div>
        </>
      )}

      {/* Submit Button */}
      <Button
        className="w-full h-auto text-base font-black bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl py-3.5 transition-all duration-300 mt-4 shadow-sm hover:scale-[1.01] active:scale-[0.98]"
        onClick={handleSubmitOrder}
        disabled={isSubmittingOrder}
      >
        {isSubmittingOrder ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>جاري تسجيل الطلب...</span>
          </span>
        ) : (
          formData.orderType === 'reservation' ? 'إتمام الحجز' : 'إتمام الطلب'
        )}
      </Button>
    </div>
  );

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center p-8">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
          <h3 className="text-base font-bold text-gray-800">جاري تجهيز التجميعات والقطع المتاحة...</h3>
          <p className="text-xs text-gray-500 mt-1">يرجى الانتظار لحظات قليلة</p>
        </div>
      </div>
    );
  }

  // Empty State if no preset found
  if (!currentPreset) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] py-20 px-4" dir="rtl">
        <div className="max-w-md mx-auto bg-white rounded-3xl p-8 border border-gray-200 text-center shadow-sm">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Layers className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-gray-900 mb-2">التجميعة المطلوبة غير متوفرة</h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-6">
            لم نتمكن من العثور على التجميعة المحددة، يمكنك تصفح التجميعات المتاحة في مجمع التجميعات.
          </p>
          <Link
            to="/builder"
            className="inline-flex items-center justify-center px-6 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition shadow-xs"
          >
            الانتقال إلى مجمع التجميعات
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-28 lg:pb-16 text-gray-900 font-sans" dir="rtl">
      {/* ── Cohesive Build Hero Header & Breadcrumb ── */}
      <div className="container mx-auto px-4 pt-6 pb-2">
        {/* Breadcrumb */}
        <nav aria-label="breadcrumb" className="mb-4 flex items-center justify-between gap-3 text-sm bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm animate-fade-slide-in flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap text-sm">
            <Link
              to="/builder"
              className="text-gray-400 hover:text-primary transition-colors duration-200 font-medium"
            >
              ابني تجميعتك
            </Link>

            {currentPreset.categoryLabel && (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-gray-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
                <span className="text-gray-400 font-medium">{currentPreset.categoryLabel}</span>
              </>
            )}

            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-gray-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>

            <span className="font-extrabold text-primary bg-primary/5 border border-primary/20 px-3 py-1 rounded-xl text-xs sm:text-sm shadow-sm max-w-[200px] sm:max-w-none truncate">
              {currentPreset.title}
            </span>
          </div>

          {/* Back link to all builds */}
          <Link
            to="/builder"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-primary text-xs font-bold transition-all border border-gray-100 shrink-0"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>تصفح جميع التجميعات</span>
          </Link>
        </nav>
        <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-6 shadow-xs relative overflow-hidden">
          {/* Decorative ambient gradient */}
          <div className="absolute top-0 left-0 w-80 h-80 bg-primary/[0.04] rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            {/* Title, Image Preview, and Badges */}
            <div className="flex items-start sm:items-center gap-4 sm:gap-5">
              {currentPreset.showcaseImage && (
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 min-w-[80px] min-h-[80px] max-w-[96px] max-h-[96px] rounded-2xl overflow-hidden border border-gray-200/90 shadow-xs shrink-0 bg-gray-100 aspect-square">
                  <img
                    src={currentPreset.showcaseImage}
                    alt={currentPreset.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center flex-wrap gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary text-xs font-bold">
                    {currentPreset.categoryLabel}
                  </span>
                  {currentPreset.badge && (
                    <span className="px-2.5 py-0.5 rounded-lg bg-emerald-600 text-white text-xs font-black shadow-2xs">
                      {currentPreset.badge}
                    </span>
                  )}
                  {currentPreset.discountPercentage && currentPreset.discountPercentage > 0 && (
                    <span className="px-2.5 py-0.5 rounded-lg bg-red-50 text-red-600 border border-red-100 text-xs font-black">
                      وفر {currentPreset.discountPercentage}%
                    </span>
                  )}
                </div>

                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900 tracking-tight">
                  {currentPreset.title}
                </h1>

                {currentPreset.description && (
                  <p className="text-xs sm:text-sm text-gray-500 max-w-2xl leading-relaxed">
                    {currentPreset.description}
                  </p>
                )}
              </div>
            </div>

            {/* Quick Stats Pills & Share Action */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 pt-4 lg:pt-0 border-t lg:border-t-0 border-gray-100">
              <div className="flex items-center gap-2 bg-gray-50 px-3.5 py-2 rounded-xl border border-gray-200/70 text-xs font-bold text-gray-700">
                <Layers className="w-4 h-4 text-primary" />
                <span>{currentPreset.steps?.length || 0} قطع أساسية</span>
              </div>

              <div className="flex items-center gap-2 bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-100 text-xs font-bold text-emerald-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>توافق مضمون 100%</span>
              </div>

              <button
                onClick={handleShareBuild}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 transition font-bold text-xs shadow-2xs hover:border-gray-300"
                title="مشاركة رابط التجميعة"
              >
                <Share2 className="w-3.5 h-3.5 text-primary" />
                <span>مشاركة</span>
              </button>
            </div>
          </div>
        </div>
      </div>



      {/* ── Main Workspace: Steps on Right (in RTL), Sticky Sidebar on Left ── */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left / Center: Steps & Options (lg:col-span-8) */}
          <div className="lg:col-span-8 space-y-8">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 border-r-4 border-primary pr-3">
                <h2 className="text-lg sm:text-xl font-black text-gray-900">
                  مكونات التجميعة
                </h2>
                <span className="text-xs text-gray-500">
                  ({currentPreset.steps.length} خطوات)
                </span>
              </div>

              <button
                onClick={handleReset}
                className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1 transition"
              >
                <RefreshCw className="w-3 h-3" />
                <span>إعادة تعيين</span>
              </button>
            </div>

            {/* Steps Container */}
            <div className="space-y-6">
              {currentPreset.steps.map((step, stepIndex) => {
                const selectedOpt = selections[step.id];

                return (
                  <div
                    key={step.id}
                    id={`step-${step.id}`}
                    className="bg-white rounded-2xl border border-gray-200/80 p-4 sm:p-6 shadow-xs hover:border-primary/30 transition-colors"
                  >
                    {/* Step Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center text-xs font-black shrink-0">
                          {stepIndex + 1}
                        </span>
                        
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base sm:text-lg font-bold text-gray-900">
                              {step.name}
                            </h3>
                            {step.nameEn && (
                              <span className="text-xs text-gray-400 font-medium hidden sm:inline">
                                ({step.nameEn})
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Required / Optional Tag */}
                        {step.required ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-600 border border-red-100">
                            مطلوب Required
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600">
                            اختياري Optional
                          </span>
                        )}
                      </div>

                      <span className="text-xs text-gray-400 font-medium">
                        {step.options.length} {step.options.length === 1 ? "خيار" : "خيارات"}
                      </span>
                    </div>

                    {/* Options Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                      {step.options.map((option) => {
                        const isOptionSelected = selectedOpt?.id === option.id;

                        return (
                          <motion.div
                            key={option.id}
                            whileHover={{ y: -3 }}
                            transition={{ duration: 0.15 }}
                            onClick={() => handleToggleOption(step, option)}
                            className={`group relative flex flex-col justify-between p-2 sm:p-4 rounded-lg sm:rounded-xl border-2 cursor-pointer transition-all duration-200 bg-white ${
                              isOptionSelected
                                ? "border-primary shadow-md shadow-primary/10 bg-primary/5 ring-1 ring-primary/30"
                                : "border-gray-100 hover:border-gray-300 hover:shadow-xs"
                            }`}
                          >
                            {/* Brand Tag / Logo */}
                            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                              {option.brand ? (
                                <span className="text-[9px] sm:text-[11px] font-bold text-primary bg-primary/10 px-1.5 sm:px-2 py-0.5 rounded truncate max-w-[55px] sm:max-w-none">
                                  {option.brand}
                                </span>
                              ) : <span />}

                              {/* Radio / Checkbox Indicator */}
                              <div
                                className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center transition-all shrink-0 ${
                                  isOptionSelected
                                    ? "bg-primary text-white shadow-xs"
                                    : "border-2 border-gray-300 group-hover:border-gray-400"
                                }`}
                              >
                                {isOptionSelected && <Check className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 stroke-[3]" />}
                              </div>
                            </div>

                            {/* Product Image */}
                            <div className="relative w-full h-24 sm:h-36 mb-2 sm:mb-3 flex items-center justify-center bg-gray-50 rounded-md sm:rounded-lg p-1.5 sm:p-2 overflow-hidden">
                              <img
                                src={option.image}
                                alt={option.name}
                                className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                                loading="lazy"
                              />
                            </div>

                            {/* Product Name & Specs */}
                            <div className="flex-1 mb-1.5 sm:mb-3">
                              <h4 className="text-[10px] sm:text-[13px] font-bold text-gray-800 line-clamp-2 leading-snug sm:leading-relaxed mb-0.5 sm:mb-1" title={option.name}>
                                {option.name}
                              </h4>
                              {option.specs && (
                                <p className="text-[9px] sm:text-[11px] text-gray-400 line-clamp-1 hidden sm:block">
                                  {option.specs}
                                </p>
                              )}
                            </div>

                            {/* Price and Price Difference Badge */}
                            <div className="pt-1.5 sm:pt-2 border-t border-gray-100 flex items-end justify-between gap-1">
                              <div>
                                <div className="hidden sm:block text-xs text-gray-400">الكمية: {option.quantity || 1}</div>
                                <div className="flex items-baseline gap-1 flex-wrap">
                                  <span className="text-[11px] sm:text-sm font-black text-gray-900">
                                    {option.price.toLocaleString()} <span className="text-[9px] sm:text-[10px] font-medium text-gray-500">ج</span>
                                  </span>
                                  {option.originalPrice && option.originalPrice > option.price && (
                                    <span className="text-[9px] sm:text-[10px] text-gray-400 line-through hidden sm:inline">
                                      {option.originalPrice.toLocaleString()}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Price delta or Selected tag */}
                              <div className="text-left">
                                {isOptionSelected ? (
                                  <span className="inline-block text-[9px] sm:text-[11px] font-bold text-primary bg-primary/10 px-1.5 sm:px-2 py-0.5 rounded">
                                    ✓
                                  </span>
                                ) : option.priceDelta !== undefined && option.priceDelta !== 0 ? (
                                  <span
                                    className={`inline-block text-[9px] sm:text-[11px] font-bold px-1 sm:px-1.5 py-0.5 rounded ${
                                      option.priceDelta > 0
                                        ? "text-purple-600 bg-purple-50"
                                        : "text-emerald-600 bg-emerald-50"
                                    }`}
                                  >
                                    {option.priceDelta > 0 ? `+${option.priceDelta.toLocaleString()}` : option.priceDelta.toLocaleString()}
                                  </span>
                                ) : (
                                  <span className="hidden sm:inline text-[10px] text-gray-400">أساسي</span>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          {/* Right: Sticky Summary Sidebar (Desktop lg:col-span-4) */}
          <div className="hidden lg:block lg:col-span-4 sticky top-24 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden">
              
              {/* Build Showcase Artwork / Banner */}
              <div className="relative h-44 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 overflow-hidden">
                <img
                  src={currentPreset.showcaseImage}
                  alt={currentPreset.title}
                  className="w-full h-full object-cover opacity-80 mix-blend-overlay hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-4">
                  <span className="text-[11px] uppercase tracking-wider text-primary font-black">
                    BUILD YOUR SETUP
                  </span>
                  <h3 className="text-lg font-black text-white">
                    {currentPreset.title}
                  </h3>
                  <p className="text-xs text-gray-300 line-clamp-1 font-medium">
                    {currentPreset.description}
                  </p>
                </div>
              </div>

              {/* Live Checklist: "Your Selection" */}
              <div className="p-4 sm:p-5 border-b border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h4 className="text-sm font-black text-gray-900">
                    اختياراتك (Your Selection)
                  </h4>
                </div>

                <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1 scrollbar-thin">
                  {currentPreset.steps.map((step) => {
                    const opt = selections[step.id];
                    return (
                      <div
                        key={step.id}
                        className="flex items-start justify-between gap-2 text-xs py-1 border-b border-gray-50 last:border-0"
                      >
                        <div className="flex items-start gap-1.5 flex-1 min-w-0">
                          {opt ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                          )}
                          
                          <div className="min-w-0">
                            <span className="font-bold text-gray-700 ml-1">
                              {step.nameEn || step.name}:
                            </span>
                            {opt ? (
                              <span className="text-gray-500 truncate block text-[11px]" title={opt.name}>
                                {opt.name}
                              </span>
                            ) : (
                              <span className="text-red-500 text-[11px] font-medium block">
                                لم يتم الاختيار (No selection)
                              </span>
                            )}
                          </div>
                        </div>

                        {opt && (
                          <span className="font-bold text-gray-900 shrink-0 text-[11px]">
                            {opt.price.toLocaleString()} ج.م
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Savings & Pricing Box */}
              <div className="p-4 sm:p-5 bg-gradient-to-b from-orange-50/20 to-white">
                
                {/* You Save Banner */}
                {savingsAmount > 0 && (
                  <div className="flex items-center justify-between bg-primary text-white px-3.5 py-2.5 rounded-xl mb-4 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      <span className="text-xs font-bold">أنت توفر (You save)</span>
                    </div>
                    <span className="text-xs font-black">
                      {savingsAmount.toLocaleString()} ج.م (-{discountPercent}%)
                    </span>
                  </div>
                )}

                {/* Price Breakdown */}
                <div className="space-y-1.5 mb-4">
                  {savingsAmount > 0 && (
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>السعر الأصلي:</span>
                      <span className="line-through">{originalPrice.toLocaleString()} ج.م</span>
                    </div>
                  )}

                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-sm font-bold text-gray-700">
                      سعر التجميعة:
                    </span>
                    <span className="text-lg font-black text-gray-900">
                      {totalPrice.toLocaleString()} <span className="text-xs font-medium text-gray-500">ج.م</span>
                    </span>
                  </div>

                  {formData.orderType === 'online_purchase' && formData.governorate && (
                    <div className="flex items-baseline justify-between text-xs text-gray-600">
                      <span>الشحن ({formData.governorate}):</span>
                      <span className="font-bold text-primary">
                        {shippingCost > 0 ? `+${shippingCost.toLocaleString()} ج.م` : 'مجاناً'}
                      </span>
                    </div>
                  )}

                  <div className="flex items-baseline justify-between pt-2 border-t border-gray-100">
                    <span className="text-sm font-black text-gray-900">
                      الإجمالي النهائي:
                    </span>
                    <span className="text-2xl font-black text-primary">
                      {finalOrderTotal.toLocaleString()} <span className="text-xs font-medium text-gray-500">ج.م</span>
                    </span>
                  </div>
                </div>

                {/* Dual-Tab Order Form */}
                {renderCheckoutForm()}

                {/* Note for PDF / Export */}
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <label className="block text-[11px] font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                    <span>ملاحظات لعرض السعر / ملف PDF:</span>
                    <span className="text-[10px] text-gray-400 font-normal">اختياري</span>
                  </label>
                  <input
                    type="text"
                    value={pdfNote}
                    onChange={(e) => setPdfNote(e.target.value)}
                    placeholder="مثال: خصم خاص، موعد استلام محدد، اسم المهندس..."
                    className="w-full text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-primary transition mb-2"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePrint}
                      className="flex-1 inline-flex items-center justify-center gap-2 text-xs font-bold py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm hover:shadow transition-all active:scale-[0.98]"
                    >
                      <Printer className="w-4 h-4 text-amber-400" />
                      <span>تصدير وطباعة عرض الأسعار (PDF)</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Floating Bottom Bar on Mobile ── */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 p-3 z-40 shadow-2xl flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] text-gray-500 font-medium">
            {savingsAmount > 0 && <span className="text-emerald-600 font-bold ml-1">وفرت {savingsAmount.toLocaleString()} ج.م</span>}
            إجمالي التجميعة:
          </div>
          <div className="text-lg font-black text-primary">
            {finalOrderTotal.toLocaleString()} <span className="text-xs font-normal text-gray-500">ج.م</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Open Mobile Drawer with Order Form */}
          <Sheet open={isMobileDrawerOpen} onOpenChange={setIsMobileDrawerOpen}>
            <SheetTrigger asChild>
              <Button size="sm" className="font-bold text-xs h-10 px-4 bg-primary text-white hover:bg-primary/90 rounded-xl shadow-md shadow-primary/20">
                <Sparkles className="w-3.5 h-3.5 ml-1" />
                <span>إتمام الطلب أو الحجز</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto px-5 py-6">
              <SheetHeader className="text-right mb-4">
                <SheetTitle className="text-base font-black flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>تجميعتك: {currentPreset.title}</span>
                </SheetTitle>
              </SheetHeader>

              {/* Checklist */}
              <div className="space-y-2 mb-4">
                {currentPreset.steps.map((step) => {
                  const opt = selections[step.id];
                  return (
                    <div key={step.id} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        {opt ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-amber-500" />}
                        <span className="font-bold text-gray-800">{step.name}:</span>
                        <span className="text-gray-500 truncate max-w-[150px]">{opt ? opt.name : "لم يتم الاختيار"}</span>
                      </div>
                      {opt && <span className="font-black text-gray-900">{opt.price.toLocaleString()} ج.م</span>}
                    </div>
                  );
                })}
              </div>

              {/* Price summary */}
              <div className="bg-gray-50 p-3.5 rounded-xl space-y-1 mb-4 text-xs">
                {savingsAmount > 0 && (
                  <div className="flex justify-between text-gray-400">
                    <span>السعر الأصلي:</span>
                    <span className="line-through">{originalPrice.toLocaleString()} ج.م</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm text-gray-900 pt-1">
                  <span>سعر التجميعة:</span>
                  <span className="text-gray-900 text-base">{totalPrice.toLocaleString()} ج.م</span>
                </div>
                {formData.orderType === 'online_purchase' && formData.governorate && (
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>الشحن:</span>
                    <span className="font-bold text-primary">
                      {shippingCost > 0 ? `+${shippingCost.toLocaleString()} ج.م` : 'مجاناً'}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm text-gray-900 pt-2 border-t border-gray-200">
                  <span>الإجمالي النهائي:</span>
                  <span className="text-primary text-xl font-black">{finalOrderTotal.toLocaleString()} ج.م</span>
                </div>
              </div>

              {/* Form inside Mobile Drawer */}
              {renderCheckoutForm()}

              {/* Note for PDF / Export on Mobile */}
              <div className="mt-4 pt-3 border-t border-gray-100">
                <button
                  onClick={handlePrint}
                  className="w-full flex items-center justify-center gap-2 text-xs font-bold py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm transition-all"
                >
                  <Printer className="w-4 h-4 text-amber-400" />
                  <span>تصدير وطباعة عرض الأسعار (PDF)</span>
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* ── Success Modals (Online & Reservation) ── */}
      <OrderSuccessModal
        open={orderSuccess.isOpen && orderSuccess.type === 'online'}
        onClose={() => setOrderSuccess((prev) => ({ ...prev, isOpen: false }))}
        orderCode={orderSuccess.orderCode}
        items={orderSuccess.items}
        deliveryInfo={orderSuccess.deliveryInfo}
        totalAmount={orderSuccess.totalAmount}
        whatsappUrl={orderSuccess.whatsappUrl}
      />

      <ReservationSuccessModal
        open={orderSuccess.isOpen && orderSuccess.type === 'reservation'}
        onClose={() => setOrderSuccess((prev) => ({ ...prev, isOpen: false }))}
        orderCode={orderSuccess.orderCode}
        items={orderSuccess.items}
        reservationInfo={orderSuccess.reservationInfo}
        totalAmount={orderSuccess.totalAmount}
        whatsappUrl={orderSuccess.whatsappUrl}
      />

      {/* ── Printable Specification Sheet (Hidden on screen, active on print) ── */}
      {currentPreset && (
        <BuilderPrintSheet
          preset={currentPreset}
          selectedItems={selectedPrintItems}
          originalPrice={originalPrice}
          totalPrice={totalPrice}
          savingsAmount={savingsAmount}
          discountPercent={discountPercent}
          pdfNote={pdfNote}
          customerName={formData.fullName}
          customerPhone={formData.phoneNumber}
        />
      )}

      {/* ── Print / PDF Preview Modal ── */}
      {currentPreset && (
        <BuilderPrintModal
          open={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          preset={currentPreset}
          selectedItems={selectedPrintItems}
          originalPrice={originalPrice}
          totalPrice={totalPrice}
          savingsAmount={savingsAmount}
          discountPercent={discountPercent}
          pdfNote={pdfNote}
          customerName={formData.fullName}
          customerPhone={formData.phoneNumber}
        />
      )}
    </div>
  );
}
