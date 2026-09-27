import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import arTranslations from "./ar.json";

// Initialize once — يعمل على السيرفر والمتصفح معاً
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      ar: { translation: arTranslations },
    },
    lng: "ar",
    fallbackLng: "ar",
    // Synchronous init — يمنع ظهور مفاتيح الترجمة قبل اكتمال التهيئة
    initImmediate: false,
    interpolation: { escapeValue: false },
  });
}

// Set RTL direction (browser only)
if (typeof window !== "undefined" && document.documentElement) {
  document.documentElement.dir = "rtl";
  document.documentElement.lang = "ar";
}

export default i18n;
