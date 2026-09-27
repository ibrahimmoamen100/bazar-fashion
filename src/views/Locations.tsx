'use client';

import React, { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Footer from "@/components/Footer";
import {
  Warehouse,
  Phone,
  Clock,
  MapPin,
  Navigation,
  ExternalLink,
  Copy,
  Check,
  Truck,
  ShieldCheck,
  Boxes,
  Sparkles,
  Share2,
} from "lucide-react";
import {
  FaWhatsapp,
  FaSubway,
  FaCar,
  FaUserTie,
  FaCheckCircle,
} from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { toast } from "sonner";

const CONTACT_PHONE_PRIMARY = "01024911062";
const CONTACT_PHONE_ALT = "01017616072";
const CONTACT_WHATSAPP = "201024911062";

const DEFAULT_ADDRESS =
  "القاهرة — شارع مؤسسة الزكاة — مستشفى اليوم الواحد — خلف السجل المدني الجديد";
const DEFAULT_METRO = "محطة مترو عزبة النخل الشرقية";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 22 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay },
});

const EXACT_EMBED_URL =
  "https://www.google.com/maps/embed?pb=!1m24!1m12!1m3!1d635.5931640902394!2d31.339247293316003!3d30.14440275269818!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!4m9!3e2!4m3!3m2!1d30.1444735!2d31.339196299999998!4m3!3m2!1d30.144468!2d31.33919!5e1!3m2!1sen!2seg!4v1790525605383!5m2!1sen!2seg";
const EXACT_MAPS_LINK = "https://maps.google.com/?q=30.1444735,31.3391963";

/** Convert a Google Maps share URL or coordinates → embeddable iframe src */
function getEmbedUrl(url?: string): string {
  if (!url) return EXACT_EMBED_URL;
  if (url.includes("/maps/embed")) return url;
  if (url.includes("30.1444") || url.includes("31.339") || url.includes("30.138")) {
    return EXACT_EMBED_URL;
  }
  const match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match) {
    return `https://maps.google.com/maps?q=${match[1]},${match[2]}&hl=ar&z=17&output=embed`;
  }
  const qMatch = url.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch) {
    return `https://maps.google.com/maps?q=${qMatch[1]},${qMatch[2]}&hl=ar&z=17&output=embed`;
  }
  return EXACT_EMBED_URL;
}

export default function Locations() {
  const { settings } = useSiteSettings();
  const [copied, setCopied] = useState(false);

  // Normalize branches to warehouses format
  const warehouses = useMemo(() => {
    const list = settings.branches || [];
    if (list.length === 0) {
      return [
        {
          id: "main-warehouse",
          name: "المخزن الرئيسي (بازار فاشون)",
          address: DEFAULT_ADDRESS,
          phone: CONTACT_PHONE_PRIMARY,
          workingHours: "يومياً: ١٠:٠٠ ص - ١٠:٠٠ م",
          googleMapsUrl: EXACT_MAPS_LINK,
          embedUrl: EXACT_EMBED_URL,
        },
      ];
    }
    return list.map((b) => {
      // Clean up legacy names that say "الفرع" to "المخزن"
      let formattedName = b.name;
      if (formattedName.includes("الفرع الرئيسي") || formattedName === "الفرع الرئيسي") {
        formattedName = "المخزن الرئيسي (مركز التجهيز والاستلام)";
      } else if (formattedName.includes("الفرع")) {
        formattedName = formattedName.replace("الفرع", "المخزن");
      }
      return {
        ...b,
        name: formattedName,
        googleMapsUrl: b.googleMapsUrl || EXACT_MAPS_LINK,
        embedUrl:
          b.id === "warehouse1" || b.id === "branch1" || b.id === "main-warehouse"
            ? EXACT_EMBED_URL
            : getEmbedUrl(b.googleMapsUrl),
      };
    });
  }, [settings.branches]);

  const [selectedId, setSelectedId] = useState<string>(
    warehouses[0]?.id || "main-warehouse"
  );

  const selectedWarehouse =
    warehouses.find((w) => w.id === selectedId) || warehouses[0];

  const handleCopyAddress = (addressText: string) => {
    const fullTextToCopy = `${addressText} - أقرب محطة مترو: ${DEFAULT_METRO}`;
    navigator.clipboard
      .writeText(fullTextToCopy)
      .then(() => {
        setCopied(true);
        toast.success("تم نسخ عنوان المخزن بنجاح إلى الحافظة!");
        setTimeout(() => setCopied(false), 2500);
      })
      .catch(() => {
        toast.info(fullTextToCopy);
      });
  };

  const handleShare = (warehouse: typeof selectedWarehouse) => {
    const shareText = `عنوان مخزن بازار فاشون:\n${warehouse.address}\nأقرب مترو: ${DEFAULT_METRO}\nللتواصل: ${warehouse.phone || CONTACT_PHONE_PRIMARY}`;
    if (navigator.share) {
      navigator
        .share({
          title: "موقع مخزن بازار فاشون",
          text: shareText,
          url: warehouse.googleMapsUrl || window.location.href,
        })
        .catch(() => {});
    } else {
      handleCopyAddress(warehouse.address);
    }
  };

  const openWhatsApp = (phone?: string) => {
    const target = phone
      ? phone.replace(/\D/g, "")
      : CONTACT_WHATSAPP;
    const msg = encodeURIComponent(
      "مرحباً بازار فاشون، أود الاستفسار عن موعد زيارة المخزن أو استلام طلب."
    );
    window.open(`https://wa.me/${target}?text=${msg}`, "_blank");
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70" dir="rtl">
      <main className="flex-1">

        {/* ══════════════════════════════════════
            HERO BANNER
        ══════════════════════════════════════ */}
        <div
          className="relative text-white py-16 md:py-24 overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, var(--topbar-bg, #155654) 0%, color-mix(in srgb, var(--topbar-bg, #155654) 75%, #000) 100%)",
          }}
        >
          {/* Subtle glowing ambient spheres */}
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-20 w-80 h-80 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-white/5 blur-3xl pointer-events-none" />

          <div className="container relative z-10 px-4 text-center">
            <motion.div {...fadeUp(0)} className="max-w-3xl mx-auto">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-white/15 border border-white/20 backdrop-blur-md rounded-full px-4 py-1.5 mb-5 shadow-sm">
                <Boxes className="text-yellow-300 w-4 h-4" />
                <span className="text-white/95 text-xs md:text-sm font-bold tracking-wide">
                  بازار فاشون — مركز التجهيز والمخزن الرئيسي
                </span>
              </div>

              {/* Title */}
              <h1 className="text-3xl md:text-5xl font-extrabold mb-4 leading-tight drop-shadow-sm">
                مقر المخزن <span className="text-yellow-300">ونقطة الاستلام</span>
              </h1>

              {/* Subtitle */}
              <p className="text-white/85 text-base md:text-lg leading-relaxed max-w-2xl mx-auto mb-7 font-normal">
                {settings.locationsPage?.heroSubtitle ||
                  "يسعدنا استقبالكم في مقر مخزننا لمعاينة واستلام أحدث تشكيلات الملابس والأحذية العصرية، أو لتنسيق الشحن السريع لجميع المحافظات."}
              </p>

              {/* Management Note */}
              <div className="inline-flex items-center gap-2 bg-black/20 backdrop-blur-md border border-white/15 px-5 py-2 rounded-full text-xs md:text-sm text-white/90">
                <FaUserTie className="text-yellow-300 text-sm" />
                <span>
                  إدارة المتجر: <strong className="text-white font-bold">أحمد عبدالمؤمن</strong> &amp; <strong className="text-white font-bold">إبراهيم عبدالمؤمن</strong>
                </span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ══════════════════════════════════════
            QUICK HIGHLIGHTS STRIP
        ══════════════════════════════════════ */}
        <div className="bg-white border-b border-slate-200/80 shadow-xs py-3.5">
          <div className="container px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              <div className="flex items-center justify-center gap-2 text-xs md:text-sm font-semibold text-slate-700">
                <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>شحن لكافة المحافظات</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs md:text-sm font-semibold text-slate-700">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                <span>معاينة وفحص قبل الاستلام</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs md:text-sm font-semibold text-slate-700">
                <FaSubway className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>قرب مترو عزبة النخل</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs md:text-sm font-semibold text-slate-700">
                <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>يومياً ١٠ ص حتى ١٠ م</span>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════
            MAIN CONTENT: WAREHOUSE DETAILS & MAP
        ══════════════════════════════════════ */}
        <div className="container py-12 md:py-16 px-4 flex-1">
          {/* Multiple warehouses selector if more than 1 */}
          {warehouses.length > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
              {warehouses.map((w) => {
                const isSelected = selectedId === w.id;
                return (
                  <button
                    key={w.id}
                    onClick={() => setSelectedId(w.id)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs md:text-sm font-bold transition-all border ${
                      isSelected
                        ? "bg-primary text-white border-primary shadow-md scale-105"
                        : "bg-white text-slate-700 border-slate-200 hover:border-primary/40 hover:bg-slate-50"
                    }`}
                  >
                    <Warehouse className="w-4 h-4" />
                    <span>{w.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="grid lg:grid-cols-12 gap-8 items-start">

            {/* ── Right Column: Warehouse Card (7 Cols) ── */}
            <motion.div
              className="lg:col-span-7 space-y-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              {/* Main Card */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 relative overflow-hidden">
                {/* Header with live status pill */}
                <div className="flex flex-wrap items-start justify-between gap-3 mb-6 pb-5 border-b border-slate-100">
                  <div className="flex items-center gap-3.5">
                    <div className="w-13 h-13 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
                      <Warehouse className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                          {selectedWarehouse.name}
                        </h2>
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        مركز التخزين، فحص الجودة، والتسليم الفوري
                      </p>
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>مفتوح ومتاح للزيارة</span>
                  </div>
                </div>

                {/* Detailed Address Block */}
                <div className="bg-slate-50/90 rounded-2xl border border-slate-200/80 p-5 mb-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 mt-0.5 border border-red-100">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-400 block mb-0.5">
                          العنوان بالتفصيل:
                        </span>
                        <p className="text-sm sm:text-base font-bold text-slate-800 leading-relaxed">
                          {selectedWarehouse.address || DEFAULT_ADDRESS}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCopyAddress(selectedWarehouse.address || DEFAULT_ADDRESS)}
                      className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-primary hover:bg-white border border-slate-200 transition-all shadow-xs"
                      title="نسخ العنوان"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600">تم النسخ</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>نسخ</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Nearest Metro Station Box */}
                  <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl px-4 py-2.5 flex items-center gap-2.5 text-amber-900 text-xs sm:text-sm">
                    <FaSubway className="text-amber-600 text-base shrink-0" />
                    <span className="leading-snug">
                      <strong>أقرب محطة مترو:</strong> {DEFAULT_METRO}
                    </span>
                  </div>
                </div>

                {/* Working Hours & Management Row */}
                <div className="grid sm:grid-cols-2 gap-4 mb-6">
                  {/* Working Hours */}
                  <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-150">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-medium text-slate-400 block">
                        مواعيد العمل
                      </span>
                      <span className="text-sm font-bold text-slate-800">
                        {selectedWarehouse.workingHours || "يومياً: ١٠:٠٠ ص - ١٠:٠٠ م"}
                      </span>
                    </div>
                  </div>

                  {/* Management */}
                  <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-150">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                      <FaUserTie className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-medium text-slate-400 block">
                        إدارة المخزن
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-slate-800">
                        أحمد عبدالمؤمن &amp; إبراهيم عبدالمؤمن
                      </span>
                    </div>
                  </div>
                </div>

                {/* Phone Numbers & Communication Buttons */}
                <div className="space-y-3 pt-2">
                  <span className="text-xs font-bold text-slate-500 block">
                    أرقام الاتصال المباشر ومتابعة الطلبات:
                  </span>

                  <div className="grid sm:grid-cols-3 gap-3">
                    {/* Primary Phone */}
                    <a
                      href={`tel:${CONTACT_PHONE_PRIMARY}`}
                      className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition-all shadow-sm hover:scale-[1.02]"
                    >
                      <Phone className="w-3.5 h-3.5 text-yellow-300" />
                      <span>{CONTACT_PHONE_PRIMARY}</span>
                    </a>

                    {/* Alt Phone */}
                    <a
                      href={`tel:${CONTACT_PHONE_ALT}`}
                      className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 text-xs font-bold transition-all shadow-xs hover:scale-[1.02]"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>بديل: {CONTACT_PHONE_ALT}</span>
                    </a>

                    {/* WhatsApp */}
                    <button
                      onClick={() => openWhatsApp(selectedWarehouse.phone)}
                      className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm hover:scale-[1.02]"
                    >
                      <FaWhatsapp className="w-4 h-4" />
                      <span>واتساب المخزن</span>
                    </button>
                  </div>
                </div>

                {/* Action footer */}
                <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <button
                    onClick={() => handleShare(selectedWarehouse)}
                    className="flex items-center gap-1.5 text-slate-600 hover:text-primary font-bold py-1 px-2 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>مشاركة موقع المخزن</span>
                  </button>

                  {selectedWarehouse.googleMapsUrl && (
                    <a
                      href={selectedWarehouse.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline font-bold"
                    >
                      <span>فتح على تطبيق خرائط Google</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>

              {/* How to Reach Us / Transit Directions */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-7">
                <h3 className="text-base font-extrabold text-slate-900 mb-4 flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-primary" />
                  <span>دليل الوصول السريع إلى المخزن</span>
                </h3>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150 flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0 mt-0.5">
                      <FaSubway className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 mb-1">
                        بالمترو (الخط الأول - المرج)
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed font-normal">
                        النزول بمحطة <strong>عزبة النخل الشرقية</strong>، ومنها ركوب مواصلة شارع مؤسسة الزكاة والنزول أمام <strong>مستشفى اليوم الواحد</strong> (المخزن خلف السجل المدني الجديد).
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150 flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-blue-100 text-blue-700 shrink-0 mt-0.5">
                      <FaCar className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 mb-1">
                        بالسيارة أو التاكسي
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed font-normal">
                        الوصول عبر الطريق الدائري مخرج <strong>شارع مؤسسة الزكاة</strong>، التوجه مباشرة نحو مستشفى اليوم الواحد وخلف السجل المدني الجديد.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ── Left Column: Interactive Map Hub (5 Cols) ── */}
            <motion.div
              className="lg:col-span-5 sticky top-24 space-y-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col">
                {/* Map Top Bar */}
                <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-xs font-bold">الخريطة المباشرة للمخزن</span>
                  </div>
                  {selectedWarehouse.googleMapsUrl && (
                    <a
                      href={selectedWarehouse.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-yellow-300 hover:text-white flex items-center gap-1 font-semibold transition-colors"
                    >
                      <span>عرض ملء الشاشة</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {/* Map Frame */}
                <div className="relative w-full h-[380px] sm:h-[440px] bg-slate-100">
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                    <MapPin className="w-10 h-10 animate-bounce" />
                  </div>
                  <iframe
                    key={selectedWarehouse.id}
                    src={selectedWarehouse.embedUrl || getEmbedUrl(selectedWarehouse.googleMapsUrl)}
                    title={`موقع ${selectedWarehouse.name}`}
                    className="w-full h-full relative z-10"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>

                {/* Map Footer Action */}
                <div className="p-4 bg-slate-50 border-t border-slate-200/70 flex flex-col gap-2">
                  <Button
                    onClick={() => {
                      if (selectedWarehouse.googleMapsUrl) {
                        window.open(selectedWarehouse.googleMapsUrl, "_blank");
                      } else {
                        window.open(EXACT_MAPS_LINK, "_blank");
                      }
                    }}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>فتح اتجاهات السير عبر خرائط Google</span>
                  </Button>

                  <p className="text-[11px] text-center text-slate-500 font-medium">
                    يمكنك مشاركة الموقع مع سائق التاكسي أو سيارات التوصيل بسهولة
                  </p>
                </div>
              </div>

              {/* Warehouse Guarantee Box */}
              <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-xl bg-white/20">
                    <Truck className="w-5 h-5 text-yellow-300" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">شحن فوري لباب منزلك</h4>
                    <p className="text-[11px] text-white/80">لست بحاجة لزيارة المخزن إن كنت بعيداً</p>
                  </div>
                </div>
                <p className="text-xs text-white/90 leading-relaxed font-normal mb-3">
                  نقوم بشحن طلبات الأحذية والملابس إلى كافة محافظات مصر مع إمكانية الفحص والمعاينة قبل الدفع.
                </p>
                <button
                  onClick={() => openWhatsApp()}
                  className="w-full py-2 bg-white text-emerald-800 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  اطلب الآن وشحن لباب بيتك
                </button>
              </div>
            </motion.div>

          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}
