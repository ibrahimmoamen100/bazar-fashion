'use client';

import React from "react";
import {
  FaWhatsapp,
  FaPhone,
  FaFacebook,
  FaTiktok,
  FaSearch,
  FaMapMarkerAlt,
  FaUser,
  FaStar,
  FaShieldAlt,
  FaExclamationTriangle,
  FaCommentAlt,
  FaCheckCircle,
  FaStore,
  FaMobileAlt,
  FaLaptop,
  FaTv,
  FaYoutube,
} from "react-icons/fa";
import { MdOutlineReviews, MdStorefront } from "react-icons/md";
import { HiOutlineSparkles } from "react-icons/hi";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";

const CONTACT_PHONE = "01024911062";
const CONTACT_WHATSAPP = "201024911062";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.65, delay },
});

const howItWorks = [
  {
    step: "01",
    icon: FaSearch,
    title: "نبحث في المولات",
    description:
      "فريقنا يجوب جميع مولات مصر والشركات التي تعرض الأجهزة الإلكترونية للعثور على أفضل الأسعار المتاحة.",
    color: "from-blue-500 to-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-100",
    iconColor: "text-blue-600",
  },
  {
    step: "02",
    icon: FaStore,
    title: "نعرض المنتج باسم التاجر",
    description:
      "كل منتج نجده يُعرض بالكامل مع اسم التاجر، عنوان محله، ورقم هاتفه — لا وسيط بينك وبين البائع.",
    color: "from-emerald-500 to-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    iconColor: "text-emerald-600",
  },
  {
    step: "03",
    icon: MdOutlineReviews,
    title: "مراجعات حقيقية",
    description:
      "لكل منتج صفحة خاصة به تحتوي على مراجعات حقيقية من مستخدمين — تطمئن قبل ما تشتري.",
    color: "from-purple-500 to-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-100",
    iconColor: "text-purple-600",
  },
];

const coverage = [
  { icon: FaLaptop, label: "لابتوبات" },
  { icon: FaMobileAlt, label: "موبايلات" },
  { icon: FaTv, label: "شاشات وتلفزيونات" },
  { icon: MdStorefront, label: "جميع مولات مصر" },
];

export default function About() {
  const { settings } = useSiteSettings();

  const handleWhatsApp = () => {
    const msg = encodeURIComponent("مرحباً، أريد الاستفسار عن منتج");
    window.open(`https://wa.me/${CONTACT_WHATSAPP}?text=${msg}`, "_blank");
  };

  const handlePhone = () => {
    window.open(`tel:${CONTACT_PHONE}`, "_self");
  };

  const handleComplaint = () => {
    const msg = encodeURIComponent(
      "مرحباً، لدي شكوى بخصوص أحد التجار المعروضين على الموقع وأريد الإبلاغ عن مشكلة."
    );
    window.open(`https://wa.me/${CONTACT_WHATSAPP}?text=${msg}`, "_blank");
  };

  const socialLinks = [
    { icon: FaFacebook, href: "https://www.facebook.com/BazarElectronics1", label: "فيسبوك", bg: "bg-blue-600", hover: "hover:bg-blue-700" },
    { icon: FaTiktok, href: "https://www.tiktok.com/@ibrahim.moamen100", label: "تيك توك", bg: "bg-gray-900", hover: "hover:bg-black" },
    { icon: FaYoutube, href: "https://www.youtube.com/@ibrahim-moamen", label: "يوتيوب", bg: "bg-red-600", hover: "hover:bg-red-700" },
    { icon: FaWhatsapp, href: "https://wa.me/201024911062", label: "واتساب", bg: "bg-emerald-600", hover: "hover:bg-emerald-700" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/40">
      <main className="flex-1">

        {/* ══════════════════════════════════════
            HERO
        ══════════════════════════════════════ */}
        <div
          className="relative overflow-hidden py-20 md:py-28"
          style={{
            background:
              "linear-gradient(135deg, var(--topbar-bg, #155654) 0%, color-mix(in srgb, var(--topbar-bg, #155654) 70%, #000) 100%)",
          }}
        >
          {/* Decorative blobs */}
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/8 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-white/5 blur-3xl pointer-events-none" />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-60 rounded-full bg-white/5 blur-3xl pointer-events-none" />

          <div className="container relative">
            <motion.div className="max-w-3xl mx-auto text-center" {...fadeUp(0)}>
              {/* Logo */}
              <div className="mb-7 flex justify-center">
                <div className="p-4 bg-white/15 backdrop-blur-sm rounded-3xl border border-white/25 shadow-2xl">
                  <img
                    src={settings.logoUrl || "/logo3.png"}
                    alt={settings.storeName}
                    className="h-24 md:h-28 w-auto object-contain"
                    onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }}
                  />
                </div>
              </div>

              <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-4 py-1.5 mb-5">
                <HiOutlineSparkles className="text-yellow-300 text-sm" />
                <span className="text-white/90 text-xs font-bold tracking-wide">
                  منصة مقارنة أسعار الللموضه - ملابس - أحذيه في مصر
                </span>
              </div>

              <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-5 leading-tight drop-shadow-lg">
                نحن نبحث عنك في المولات<br />
                <span className="text-yellow-300">لتحصل على أفضل سعر</span>
              </h1>

              <p className="text-white/80 text-base md:text-lg leading-relaxed max-w-2xl mx-auto mb-8">
                فريقنا يجوب جميع مولات مصر والشركات التي تعرض أجهزة إلكترونية، ويجمع لك أفضل الأسعار
                مع بيانات التاجر كاملةً — اسمه، عنوانه، ورقمه — لتتواصل معه مباشرةً دون أي وسيط.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={handleWhatsApp}
                  size="lg"
                  className="bg-green-500 hover:bg-green-600 text-white font-bold px-8 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 gap-2"
                >
                  <FaWhatsapp className="text-xl" />
                  تواصل عبر واتساب
                </Button>
                <Button
                  onClick={handlePhone}
                  size="lg"
                  variant="outline"
                  className="border-2 border-white/50 text-white bg-white/10 hover:bg-white/20 font-bold px-8 rounded-full backdrop-blur-sm transition-all duration-300 hover:scale-105 gap-2"
                >
                  <FaPhone className="text-base" />
                  {CONTACT_PHONE}
                </Button>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ══════════════════════════════════════
            HOW IT WORKS — 3 steps
        ══════════════════════════════════════ */}
        <div className="container py-20">
          <motion.div className="text-center mb-14" {...fadeUp(0.05)}>
            <span className="inline-block bg-primary/10 text-primary text-xs font-extrabold tracking-wider px-4 py-1.5 rounded-full mb-3 uppercase">
              كيف نعمل
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">
              من البحث في المول … إلى شاشتك
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto text-base">
              عملية بسيطة وشفافة تربطك مباشرةً بأفضل تاجر في أقرب مول منك
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {howItWorks.map((item, i) => (
              <motion.div
                key={i}
                {...fadeUp(0.1 + i * 0.12)}
                className={`relative bg-white rounded-2xl border ${item.border} shadow-sm p-8 hover:shadow-lg hover:-translate-y-2 transition-all duration-300 group`}
              >
                {/* Step number */}
                <div className="absolute top-5 left-6 rtl:right-6 rtl:left-auto text-5xl font-black text-gray-100 select-none leading-none">
                  {item.step}
                </div>

                <div className={`inline-flex p-4 rounded-2xl ${item.bg} mb-5 group-hover:scale-110 transition-transform duration-300 relative z-10`}>
                  <item.icon className={`text-3xl ${item.iconColor}`} />
                </div>
                <h3 className="text-xl font-extrabold text-gray-800 mb-3">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════
            COVERAGE STRIP
        ══════════════════════════════════════ */}
        <div
          className="py-12 border-y"
          style={{ backgroundColor: "color-mix(in srgb, var(--topbar-bg, #155654) 6%, white)" }}
        >
          <div className="container">
            <motion.div {...fadeUp(0.1)} className="text-center mb-8">
              <h2 className="text-2xl font-extrabold text-gray-800 mb-1">ما الذي نغطيه؟</h2>
              <p className="text-gray-500 text-sm">نشمل جميع فئات الأجهزة الإلكترونية عبر مولات مصر كاملةً</p>
            </motion.div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {coverage.map((c, i) => (
                <motion.div
                  key={i}
                  {...fadeUp(0.12 + i * 0.07)}
                  className="flex flex-col items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="p-3 rounded-2xl bg-primary/10">
                    <c.icon className="text-2xl text-primary" />
                  </div>
                  <span className="text-sm font-bold text-gray-700">{c.label}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════
            MERCHANT INFO FEATURE
        ══════════════════════════════════════ */}
        <div className="container py-20">
          <div className="grid md:grid-cols-2 gap-8 items-center max-w-5xl mx-auto">
            <motion.div {...fadeUp(0.1)}>
              <span className="inline-block bg-emerald-50 text-emerald-700 text-xs font-extrabold tracking-wider px-4 py-1.5 rounded-full mb-4 uppercase border border-emerald-100">
                شفافية تامة
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-5 leading-snug">
                كل منتج … مع بيانات<br />
                <span className="text-primary">التاجر كاملةً</span>
              </h2>
              <p className="text-gray-600 leading-relaxed mb-6">
                لا نخفي شيئاً — كل منتج تراه على موقعنا مصحوب بـ:
              </p>
              <ul className="space-y-3">
                {[
                  { icon: FaUser, text: "اسم التاجر بالكامل" },
                  { icon: FaMapMarkerAlt, text: "عنوان المحل داخل المول" },
                  { icon: FaPhone, text: "رقم هاتف التاجر للتواصل المباشر" },
                  { icon: MdOutlineReviews, text: "مراجعات حقيقية على المنتج في صفحته" },
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                      <item.icon className="text-primary text-sm" />
                    </div>
                    <span className="text-gray-700 font-medium text-sm">{item.text}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div {...fadeUp(0.2)}>
              {/* Mock product card demo */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-xl p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                    <FaLaptop className="text-3xl text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-primary mb-1 bg-primary/8 inline-block px-2 py-0.5 rounded-full">مول مثال — الدور الثاني</div>
                    <h4 className="font-extrabold text-gray-800 text-sm leading-snug">لابتوب HP Core i7 — أفضل سعر</h4>
                    <p className="text-2xl font-black text-primary mt-1">12,500 <span className="text-xs font-semibold">ج.م</span></p>
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-4 space-y-2 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <FaUser className="text-primary shrink-0" />
                    <span><strong>التاجر:</strong> محل الللموضه - ملابس - أحذيه الحديثة</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaMapMarkerAlt className="text-red-500 shrink-0" />
                    <span><strong>العنوان:</strong> مول العرب — الدور الثاني — محل 47</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaPhone className="text-emerald-600 shrink-0" />
                    <span><strong>الهاتف:</strong> 010xxxxxxxx</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 border-t border-gray-100 pt-3">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <FaStar key={s} className="text-amber-400 text-xs" />
                  ))}
                  <span className="text-xs text-gray-500 mr-1">٤.٨ (٢٣ مراجعة)</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ══════════════════════════════════════
            COMPLAINT SECTION
        ══════════════════════════════════════ */}
        <div className="bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 py-16 border-y border-orange-100">
          <div className="container">
            <motion.div className="max-w-2xl mx-auto text-center" {...fadeUp(0.1)}>
              <div className="inline-flex p-4 rounded-full bg-red-100 mb-5">
                <FaExclamationTriangle className="text-3xl text-red-500" />
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-800 mb-3">
                واجهت مشكلة مع أحد التجار؟
              </h2>
              <p className="text-gray-600 text-base leading-relaxed mb-2">
                إذا واجهت أي مشكلة مع تاجر معروض منتجه على موقعنا — سواء كانت بيانات خاطئة أو سلوك
                غير لائق — تواصل معنا فوراً وسنتخذ الإجراء المناسب.
              </p>
              <p className="text-gray-500 text-sm mb-7">
                نحن نهتم بسمعة الموقع وسنتعامل مع كل شكوى بجدية تامة.
              </p>
              <Button
                onClick={handleComplaint}
                size="lg"
                className="bg-red-500 hover:bg-red-600 text-white font-bold px-10 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 gap-2"
              >
                <FaCommentAlt />
                تقديم شكوى الآن
              </Button>
            </motion.div>
          </div>
        </div>

        {/* ══════════════════════════════════════
            SOCIAL MEDIA SECTION
        ══════════════════════════════════════ */}
        <div className="container py-20">
          <motion.div className="max-w-2xl mx-auto text-center" {...fadeUp(0.1)}>
            <div className="inline-flex items-center gap-2 bg-primary/8 text-primary text-xs font-extrabold tracking-wider px-4 py-1.5 rounded-full mb-5 border border-primary/15">
              <FaStar className="text-amber-400" />
              أحدث المراجعات والعروض
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
              تابعونا على السوشيال ميديا
            </h2>
            <p className="text-gray-500 text-base leading-relaxed mb-8">
              تابعونا لمشاهدة أحدث المراجعات على المنتجات الإلكترونية، أفضل العروض، ومقارنات
              الأسعار من مولات مصر أولاً بأول.
            </p>

            {socialLinks.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-4">
                {socialLinks.map((social, i) => (
                  <motion.a
                    key={i}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    {...fadeUp(0.12 + i * 0.08)}
                    className={`flex items-center gap-2.5 ${social.bg} ${social.hover} text-white font-bold px-6 py-3 rounded-full shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 text-sm`}
                  >
                    <social.icon className="text-lg" />
                    {social.label}
                  </motion.a>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">لم يتم إضافة روابط السوشيال ميديا بعد.</p>
            )}
          </motion.div>
        </div>

        {/* ══════════════════════════════════════
            CONTACT SECTION
        ══════════════════════════════════════ */}
        <div
          className="py-16"
          style={{
            background:
              "linear-gradient(135deg, var(--topbar-bg, #155654) 0%, color-mix(in srgb, var(--topbar-bg, #155654) 70%, #000) 100%)",
          }}
        >
          <div className="container">
            <motion.div className="max-w-3xl mx-auto" {...fadeUp(0.1)}>
              <div className="text-center mb-10">
                <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3">تواصل معنا</h2>
                <p className="text-white/75 text-base">
                  هل لديك سؤال؟ نحن هنا للمساعدة عبر واتساب أو مكالمة مباشرة
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                {/* WhatsApp Card */}
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-7 text-center hover:bg-white/15 transition-all duration-300 group">
                  <div className="inline-flex p-4 rounded-2xl bg-green-500/30 mb-4 group-hover:scale-110 transition-transform duration-300">
                    <FaWhatsapp className="text-3xl text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">واتساب</h3>
                  <p className="text-white/70 text-sm mb-5 leading-relaxed">
                    تواصل معنا عبر واتساب للحصول على مساعدة فورية
                  </p>
                  <Button
                    onClick={handleWhatsApp}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-bold rounded-full transition-all duration-300 hover:scale-105 gap-2 shadow-lg"
                  >
                    <FaWhatsapp className="text-base" />
                    {CONTACT_PHONE}
                  </Button>
                </div>

                {/* Phone Card */}
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-7 text-center hover:bg-white/15 transition-all duration-300 group">
                  <div className="inline-flex p-4 rounded-2xl bg-white/20 mb-4 group-hover:scale-110 transition-transform duration-300">
                    <FaPhone className="text-3xl text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">مكالمة مباشرة</h3>
                  <p className="text-white/70 text-sm mb-5 leading-relaxed">
                    اتصل بنا مباشرةً للحصول على المساعدة الفورية
                  </p>
                  <Button
                    onClick={handlePhone}
                    variant="outline"
                    className="w-full border-2 border-white/40 text-white bg-white/10 hover:bg-white/20 font-bold rounded-full transition-all duration-300 hover:scale-105 gap-2"
                  >
                    <FaPhone className="text-base" />
                    {CONTACT_PHONE}
                  </Button>
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
