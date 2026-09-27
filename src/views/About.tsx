'use client';

import React from "react";
import {
  FaWhatsapp,
  FaPhone,
  FaFacebook,
  FaTiktok,
  FaYoutube,
  FaMapMarkerAlt,
  FaShieldAlt,
  FaTruck,
  FaCheckCircle,
  FaHeart,
  FaUserTie,
  FaGem,
} from "react-icons/fa";
import { GiRunningShoe, GiClothes } from "react-icons/gi";
import { HiOutlineSparkles } from "react-icons/hi";
import { MdOutlineLocalOffer, MdLocationOn } from "react-icons/md";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";

const CONTACT_PHONE_PRIMARY = "01024911062";
const CONTACT_PHONE_ALT = "01017616072";
const CONTACT_WHATSAPP = "201024911062";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay },
});

const storeFeatures = [
  {
    icon: FaGem,
    title: "خامات بريميوم (Premium)",
    description:
      "نختار خامات منتجاتنا بعناية فائقة لضمان المتانة العالية والملمس المريح الذي يدوم معك طويلاً دون أن يفقد رونقه.",
    color: "from-amber-500 to-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-100",
    iconColor: "text-amber-600",
  },
  {
    icon: MdOutlineLocalOffer,
    title: "أسعار تنافسية ومدروسة",
    description:
      "نؤمن أن الأناقة والجودة العالية حق للجميع، لذلك نوفر أفضل قيمة سعرية في السوق دون المساومة على جودة المنتج.",
    color: "from-emerald-500 to-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    iconColor: "text-emerald-600",
  },
  {
    icon: FaTruck,
    title: "شحن لجميع المحافظات",
    description:
      "أينما كنت داخل جمهورية مصر العربية، نوفر لك شحناً سريعاً وموثوقاً يضمن وصول طلبك بأمان حتى باب منزلك.",
    color: "from-blue-500 to-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-100",
    iconColor: "text-blue-600",
  },
  {
    icon: FaHeart,
    title: "تصميم بسيط وأنيق",
    description:
      "تشكيلاتنا تجمع بين البساطة والذوق الرفيع المعاصر، لتمنحك إطلالة متناسقة وجذابة في كل وقت ومناسبة.",
    color: "from-rose-500 to-rose-600",
    bg: "bg-rose-50",
    border: "border-rose-100",
    iconColor: "text-rose-600",
  },
];

const categories = [
  {
    icon: GiRunningShoe,
    title: "الأحذية الرياضية والكاجوال",
    desc: "تشكيلة مختارة من أحدث الأحذية المريحة التي تناسب الاستخدام اليومي والحركة المستمرة بخامات متينة وفرش طبي مريح.",
    tag: "خامات مريحة وعملية",
  },
  {
    icon: GiClothes,
    title: "الملابس العصرية",
    desc: "تصاميم شبابية ورجالية تجمع بين الأناقة الهادئة والخامات القطنية الفاخرة التي تحافظ على مظهرها بعد الغسيل المتكرر.",
    tag: "إطلالة أنيقة وبسيطة",
  },
];

export default function About() {
  const { settings } = useSiteSettings();

  const handleWhatsApp = () => {
    const msg = encodeURIComponent("مرحباً، أود الاستفسار عن الموديلات المتاحة والأسعار في بازار فاشون");
    window.open(`https://wa.me/${CONTACT_WHATSAPP}?text=${msg}`, "_blank");
  };

  const handlePhone = (phone: string) => {
    window.open(`tel:${phone}`, "_self");
  };

  const socialLinks = [
    { icon: FaFacebook, href: "https://www.facebook.com/BazarElectronics1", label: "فيسبوك", bg: "bg-blue-600", hover: "hover:bg-blue-700" },
    { icon: FaTiktok, href: "https://www.tiktok.com/@ibrahim.moamen100", label: "تيك توك", bg: "bg-gray-900", hover: "hover:bg-black" },
    { icon: FaYoutube, href: "https://www.youtube.com/@ibrahim-moamen", label: "يوتيوب", bg: "bg-red-600", hover: "hover:bg-red-700" },
    { icon: FaWhatsapp, href: "https://wa.me/201024911062", label: "واتساب", bg: "bg-emerald-600", hover: "hover:bg-emerald-700" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/60" dir="rtl">
      <main className="flex-1">

        {/* ══════════════════════════════════════
            HERO SECTION
        ══════════════════════════════════════ */}
        <div
          className="relative overflow-hidden py-16 md:py-24 text-white"
          style={{
            background:
              "linear-gradient(135deg, var(--topbar-bg, #155654) 0%, color-mix(in srgb, var(--topbar-bg, #155654) 75%, #000) 100%)",
          }}
        >
          {/* Decorative shapes */}
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-white/5 blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-white/5 blur-3xl pointer-events-none" />

          <div className="container relative z-10 px-4">
            <motion.div className="max-w-3xl mx-auto text-center" {...fadeUp(0)}>
              {/* Logo / Badge */}
              <div className="mb-6 flex justify-center">
                <div className="p-3.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl">
                  <img
                    src={settings.logoUrl || "/logo3.png"}
                    alt={settings.storeName || "بازار فاشون"}
                    className="h-20 md:h-24 w-auto object-contain"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.svg";
                    }}
                  />
                </div>
              </div>

              {/* Tagline */}
              <div className="inline-flex items-center gap-2 bg-white/15 border border-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 mb-5 shadow-sm">
                <HiOutlineSparkles className="text-yellow-300 text-base" />
                <span className="text-white/95 text-xs md:text-sm font-semibold tracking-wide">
                  بازار فاشون — للأحذية والملابس العصرية
                </span>
              </div>

              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-5 leading-snug drop-shadow-sm">
                أناقة بسيطة وخامات <span className="text-yellow-300">Premium</span>
                <br />
                بأسعار تنافسية تناسب الجميع
              </h1>

              <p className="text-white/85 text-base md:text-lg leading-relaxed max-w-2xl mx-auto mb-6 font-normal">
                وجهتك الأولى للملابس والأحذية التي تجمع بين الذوق الرفيع والمتانة العالية. نهتم باختيار خامات ممتازة تدوم، وتصاميم مريحة ترضي تطلعاتكم مع خدمة شحن تصلك أينما كنت.
              </p>

              {/* Management Badge */}
              <div className="inline-flex items-center gap-2 bg-black/20 backdrop-blur-md border border-white/15 px-5 py-2 rounded-full mb-8 text-sm text-white/90">
                <FaUserTie className="text-yellow-300 text-sm" />
                <span>إدارة: <strong className="text-white font-bold">أحمد عبدالمؤمن</strong> &amp; <strong className="text-white font-bold">إبراهيم عبدالمؤمن</strong></span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                <Button
                  onClick={handleWhatsApp}
                  size="lg"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-7 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 gap-2 w-full sm:w-auto"
                >
                  <FaWhatsapp className="text-xl" />
                  تواصل عبر واتساب
                </Button>
                <Button
                  onClick={() => handlePhone(CONTACT_PHONE_PRIMARY)}
                  size="lg"
                  variant="outline"
                  className="border-2 border-white/40 text-white bg-white/10 hover:bg-white/20 font-bold px-7 rounded-full backdrop-blur-sm transition-all duration-300 hover:scale-105 gap-2 w-full sm:w-auto"
                >
                  <FaPhone className="text-sm" />
                  اتصال: {CONTACT_PHONE_PRIMARY}
                </Button>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ══════════════════════════════════════
            FEATURES / WHY CHOOSE US
        ══════════════════════════════════════ */}
        <div className="container py-16 md:py-20 px-4">
          <motion.div className="text-center max-w-2xl mx-auto mb-12" {...fadeUp(0.05)}>
            <span className="inline-block bg-primary/10 text-primary text-xs font-bold tracking-wider px-3.5 py-1.5 rounded-full mb-3">
              مميزاتنا
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3">
              لماذا يختار عملاؤنا بازار فاشون؟
            </h2>
            <p className="text-gray-600 text-sm md:text-base leading-relaxed">
              نضع رضا العميل وراحته في صدارة أولوياتنا من خلال معادلة تجمع الجودة الفائقة والسعر المناسب.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {storeFeatures.map((item, i) => (
              <motion.div
                key={i}
                {...fadeUp(0.1 + i * 0.08)}
                className={`bg-white rounded-2xl border ${item.border} p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col items-start group hover:-translate-y-1`}
              >
                <div className={`p-3.5 rounded-xl ${item.bg} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <item.icon className={`text-2xl ${item.iconColor}`} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed font-normal">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════
            COLLECTIONS / CATEGORIES OVERVIEW
        ══════════════════════════════════════ */}
        <div className="py-14 bg-white border-y border-gray-100">
          <div className="container px-4">
            <div className="max-w-4xl mx-auto">
              <motion.div className="text-center mb-10" {...fadeUp(0.05)}>
                <span className="inline-block bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1 rounded-full mb-2">
                  تشكيلاتنا
                </span>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                  تنسيقات عصرية لكل يوم
                </h2>
              </motion.div>

              <div className="grid md:grid-cols-2 gap-6">
                {categories.map((cat, idx) => (
                  <motion.div
                    key={idx}
                    {...fadeUp(0.1 + idx * 0.1)}
                    className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-6 sm:p-7 relative overflow-hidden flex flex-col justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-primary shadow-sm">
                          <cat.icon className="text-2xl" />
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                          {cat.tag}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2.5">{cat.title}</h3>
                      <p className="text-gray-600 text-sm leading-relaxed mb-4">{cat.desc}</p>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-500 font-medium pt-3 border-t border-slate-200/60">
                      <FaCheckCircle className="text-emerald-500 text-sm shrink-0" />
                      <span>متوفر بمقاسات وألوان متنوعة تلبي ذوقك</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════
            SHIPPING & GOVERNORATES HIGHLIGHT
        ══════════════════════════════════════ */}
        <div className="container py-14 px-4">
          <motion.div
            {...fadeUp(0.1)}
            className="max-w-4xl mx-auto rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-7 md:p-10 shadow-lg relative overflow-hidden"
          >
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-right">
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-3 py-1 text-xs font-semibold mb-3">
                  <FaTruck className="text-yellow-300" />
                  <span>تغطية شحن شاملة</span>
                </div>
                <h3 className="text-2xl md:text-3xl font-extrabold mb-2.5">
                  شحن سريع لجميع محافظات مصر
                </h3>
                <p className="text-white/85 text-sm md:text-base leading-relaxed">
                  نوفر لجميع عملائنا في القاهرة الكبرى والوجهين البحري والقبلي شحناً سريعاً آمناً مع إمكانية المعاينة قبل الاستلام لضمان راحة بالك واطمئنانك التام على طلبك.
                </p>
              </div>

              <div className="shrink-0">
                <Button
                  onClick={handleWhatsApp}
                  className="bg-white text-emerald-800 hover:bg-slate-100 font-bold px-7 py-3 rounded-full shadow-md text-sm transition-all hover:scale-105"
                >
                  اطلب الآن عبر واتساب
                </Button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ══════════════════════════════════════
            STORE LOCATION & MANAGEMENT DETAILS
        ══════════════════════════════════════ */}
        <div className="py-16 bg-slate-100/60 border-y border-slate-200/60">
          <div className="container px-4">
            <motion.div className="max-w-3xl mx-auto" {...fadeUp(0.1)}>
              <div className="text-center mb-8">
                <span className="inline-block bg-primary/10 text-primary text-xs font-bold px-3.5 py-1.5 rounded-full mb-2">
                  مقرنا وزيارتنا
                </span>
                <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2">
                  موقع الفرع والإدارة
                </h2>
                <p className="text-gray-600 text-sm">
                  يسعدنا استقبالكم وزيارتكم في مقرنا لاختيار وتجربة المنتجات مباشرة
                </p>
              </div>

              {/* Address Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm mb-6">
                <div className="flex items-start gap-4 mb-5">
                  <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center shrink-0">
                    <MdLocationOn className="text-2xl" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 mb-1">عنوان المتجر بالتفصيل</h4>
                    <p className="text-gray-700 text-sm md:text-base leading-relaxed font-medium">
                      القاهرة &mdash; شارع مؤسسة الزكاة &mdash; مستشفى اليوم الواحد &mdash; خلف السجل المدني الجديد
                    </p>
                  </div>
                </div>

                {/* Metro Note */}
                <div className="bg-amber-50/70 border border-amber-200/70 rounded-xl p-3.5 flex items-center gap-3 text-amber-900 text-sm">
                  <FaMapMarkerAlt className="text-amber-600 shrink-0" />
                  <span>
                    <strong>أقرب محطة مترو:</strong> محطة مترو <strong>عزبة النخل الشرقية</strong>
                  </span>
                </div>

                {/* Management Info */}
                <div className="mt-5 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <FaUserTie className="text-primary text-base" />
                    <span>إدارة المتجر: <strong>أحمد عبدالمؤمن</strong> و <strong>إبراهيم عبدالمؤمن</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                    <FaShieldAlt className="text-emerald-600" />
                    <span>معاملة موثوقة ومباشرة</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ══════════════════════════════════════
            CONTACT SECTION (Primary & Alt Phone)
        ══════════════════════════════════════ */}
        <div
          className="py-16 text-white"
          style={{
            background:
              "linear-gradient(135deg, var(--topbar-bg, #155654) 0%, color-mix(in srgb, var(--topbar-bg, #155654) 75%, #000) 100%)",
          }}
        >
          <div className="container px-4">
            <motion.div className="max-w-3xl mx-auto" {...fadeUp(0.1)}>
              <div className="text-center mb-10">
                <h2 className="text-2xl md:text-3xl font-extrabold mb-2">تواصل معنا مباشرة</h2>
                <p className="text-white/80 text-sm md:text-base">
                  نسعد بالرد على استفساراتكم وتأكيد طلباتكم عبر الأرقام التالية أو عبر الواتساب
                </p>
              </div>

              <div className="grid sm:grid-cols-3 gap-4 mb-8">
                {/* Primary Phone */}
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5 text-center flex flex-col justify-between hover:bg-white/15 transition-colors">
                  <div>
                    <div className="inline-flex p-3 rounded-xl bg-white/15 mb-3">
                      <FaPhone className="text-xl text-yellow-300" />
                    </div>
                    <h3 className="text-base font-bold mb-1">الرقم الرئيسي</h3>
                    <p className="text-white/70 text-xs mb-4">للاتصال والطلبات المباشرة</p>
                  </div>
                  <Button
                    onClick={() => handlePhone(CONTACT_PHONE_PRIMARY)}
                    variant="outline"
                    className="w-full border border-white/40 text-white bg-white/10 hover:bg-white/20 font-bold rounded-xl text-xs py-2"
                  >
                    {CONTACT_PHONE_PRIMARY}
                  </Button>
                </div>

                {/* Alt Phone */}
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5 text-center flex flex-col justify-between hover:bg-white/15 transition-colors">
                  <div>
                    <div className="inline-flex p-3 rounded-xl bg-white/15 mb-3">
                      <FaPhone className="text-xl text-emerald-300" />
                    </div>
                    <h3 className="text-base font-bold mb-1">الرقم البديل</h3>
                    <p className="text-white/70 text-xs mb-4">متاح للتواصل والمتابعة</p>
                  </div>
                  <Button
                    onClick={() => handlePhone(CONTACT_PHONE_ALT)}
                    variant="outline"
                    className="w-full border border-white/40 text-white bg-white/10 hover:bg-white/20 font-bold rounded-xl text-xs py-2"
                  >
                    {CONTACT_PHONE_ALT}
                  </Button>
                </div>

                {/* WhatsApp */}
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5 text-center flex flex-col justify-between hover:bg-white/15 transition-colors">
                  <div>
                    <div className="inline-flex p-3 rounded-xl bg-emerald-500/30 mb-3">
                      <FaWhatsapp className="text-xl text-emerald-300" />
                    </div>
                    <h3 className="text-base font-bold mb-1">محادثة واتساب</h3>
                    <p className="text-white/70 text-xs mb-4">استفسارات وتأكيد الطلب</p>
                  </div>
                  <Button
                    onClick={handleWhatsApp}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs py-2 shadow-md"
                  >
                    راسلنا الآن
                  </Button>
                </div>
              </div>

              {/* Social Media Links */}
              <div className="pt-6 border-t border-white/15 text-center">
                <p className="text-white/75 text-xs mb-4 font-medium">تابعونا على صفحاتنا الرسمية لمعرفة جديد العروض والموديلات:</p>
                <div className="flex flex-wrap justify-center gap-3">
                  {socialLinks.map((social, i) => (
                    <a
                      key={i}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-2 ${social.bg} ${social.hover} text-white text-xs font-semibold px-4 py-2 rounded-full shadow-sm hover:shadow transition-all hover:scale-105`}
                    >
                      <social.icon className="text-sm" />
                      <span>{social.label}</span>
                    </a>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}
