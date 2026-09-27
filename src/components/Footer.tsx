'use client';

import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  Facebook,
  Mail,
  Phone,
  MapPin,
  Youtube,
  Store,
  LayoutGrid,
  ChevronLeft,
} from "lucide-react";
import { FaTiktok, FaWhatsapp } from "react-icons/fa";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { getActiveSuppliers } from "@/lib/suppliersCache";
import { useStore } from "@/store/useStore";
import { getCategorySlugFromName, getCategoryNameFromSlug } from "@/utils/category";

const DEFAULT_FOOTER_CATEGORIES = [
  { name: "لابتوب (Laptop)", slug: "laptops", image: "/lap.png" },
  { name: "شاشات (Monitor)", slug: "monitors", image: "/monitor.png" },
  { name: "كمبيوتر مكتبي (Desktop)", slug: "desktops", image: "/pc.png" },
  { name: "إكسسوارات وملحقات (Accessories)", slug: "accessories", image: "/access.png" },
];

interface FooterSupplier {
  id: string;
  name: string;
  slug?: string;
  logo?: string;
  isArchived?: boolean;
  displayOrder?: number;
}

function slugify(name: string) {
  return (name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\u0600-\u06FFa-z0-9-]/g, '')
    .replace(/-+/g, '-');
}

function getSupplierSlug(s: FooterSupplier): string {
  if (s.slug && s.slug.trim()) return s.slug.trim();
  return slugify(s.name) || s.id;
}

/** Convert a Google Maps share URL → embeddable iframe src */
function getEmbedUrl(url: string): string {
  const match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  return match ? `https://maps.google.com/maps?q=${match[1]},${match[2]}&hl=ar&z=16&output=embed` : '';
}

import { Product } from "@/types/product";

interface FooterProps {
  initialProducts?: Product[];
}

export default function Footer({ initialProducts = [] }: FooterProps = {}) {
  const { t } = useTranslation();
  const { settings } = useSiteSettings();
  const [footerSuppliers, setFooterSuppliers] = useState<FooterSupplier[]>([]);
  const [cachedCategories, setCachedCategories] = useState<Array<{ name: string; slug: string; image?: string }> | null>(null);
  const storeProducts = useStore((s) => s.products) || [];
  const products = storeProducts.length > 0 ? storeProducts : initialProducts;

  useEffect(() => {
    // Only read localStorage on the client after mount to prevent SSR hydration mismatches
    try {
      const cached = localStorage.getItem('bazar_categories_tree_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCachedCategories(
            parsed.slice(0, 4).map((c: any) => ({
              name: c.name,
              slug: c.slug || getCategorySlugFromName(c.name),
              image: c.categoryImage,
            }))
          );
        }
      }
    } catch {
      // silent
    }
  }, []);

  const footerCategories = useMemo(() => {
    const map: Record<string, { name: string; count: number; image?: string; slug: string }> = {};
    products.forEach((p) => {
      if (p.category && !p.isArchived) {
        const slug = getCategorySlugFromName(p.category);
        if (!map[p.category]) {
          map[p.category] = {
            name: p.category,
            count: 0,
            image: p.specifications?.find((s: any) => s.key === "الفئة")?.categoryImage || p.images?.[0],
            slug,
          };
        }
        map[p.category].count += 1;
        const customImg = p.specifications?.find((s: any) => s.key === "الفئة")?.categoryImage;
        if (customImg && !map[p.category].image) {
          map[p.category].image = customImg;
        }
      }
    });

    const list = Object.values(map).sort((a, b) => b.count - a.count);
    if (list.length > 0) {
      return list.slice(0, 4);
    }

    if (cachedCategories && cachedCategories.length > 0) {
      return cachedCategories;
    }

    return DEFAULT_FOOTER_CATEGORIES;
  }, [products, cachedCategories]);

  useEffect(() => {
    let isMounted = true;
    getActiveSuppliers().then((suppliers) => {
      if (isMounted) {
        setFooterSuppliers(suppliers.slice(0, 4) as FooterSupplier[]);
      }
    }).catch(() => { });
    return () => {
      isMounted = false;
    };
  }, []);

  const socialLinks = [
    { name: "فيسبوك", href: "https://www.facebook.com/BazarElectronics1", icon: <Facebook className="h-4 w-4" />, hover: 'hover:bg-blue-600' },
    { name: "تيك توك", href: "https://www.tiktok.com/@ibrahim.moamen100", icon: <FaTiktok className="h-4 w-4" />, hover: 'hover:bg-gray-700' },
    { name: "يوتيوب", href: "https://www.youtube.com/@ibrahim-moamen", icon: <Youtube className="h-4 w-4" />, hover: 'hover:bg-red-600' },
    { name: "واتساب", href: "https://wa.me/201024911062", icon: <FaWhatsapp className="h-4 w-4" />, hover: 'hover:bg-green-600' },
  ];

  // Branches from settings
  const branches = (settings.branches || []);

  return (
    <footer
      className="text-white transition-colors duration-300"
      style={{ background: 'var(--footer-bg, #0f172a)' }}
    >
      {/* Top accent line */}
      <div className="h-1" style={{ background: 'linear-gradient(to right, hsl(var(--primary)), hsl(var(--secondary)), hsl(var(--primary)))' }} />

      <div className="container py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">

          {/* About */}
          <div>
            <img src={settings.logoUrl || "/logo3.png"} alt={settings.storeName || "بازار للموضه"} className="h-14 w-auto mb-4 opacity-90" width="140" height="56" loading="lazy" />
            <p className="text-slate-400 text-sm leading-relaxed mb-5">
              {settings.footerTagline || t("footer.aboutDescription")}
            </p>
            {socialLinks.length > 0 && (
              <div className="flex gap-3 flex-wrap">
                {socialLinks.map((link, i) => (
                  <a
                    key={i}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-2.5 rounded-xl bg-white/8 ${link.hover} text-slate-400 hover:text-white transition-all duration-300`}
                    aria-label={link.name}
                  >
                    {link.icon}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">
              {t("footer.quickLinks")}
            </h3>
            <ul className="space-y-2.5">
              {[
                { id: "home", to: "/", label: settings.navLinks?.home || t("footer.home") },
                { id: "categories", to: "/categories", label: settings.navLinks?.categories || "الأقسام" },
                // { id: "shops", to: "/shops", label: settings.navLinks?.shops || "التجار" },
                // { id: "wholesale", to: "/wholesale", label: settings.navLinks?.wholesale || t("footer.wholesale") },
                { id: "about", to: "/about", label: settings.navLinks?.about || t("footer.about") },
                // { id: "locations", to: "/locations", label: settings.navLinks?.locations || t("footer.locations") },
              ]
                .filter(item => item.id !== "wholesale" || settings.isImporter !== false)
                .map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className="text-slate-400 hover:text-white text-sm transition-colors duration-200 flex items-center gap-2 group"
                    >
                      <span className="w-1 h-1 rounded-full bg-blue-500 group-hover:w-2 transition-all duration-200" />
                      {item.label}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>

          {/* Merchants */}
          {/* <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <Store className="h-3.5 w-3.5" />
              التجار
            </h3>
            <ul className="space-y-2.5">
              {footerSuppliers.length > 0
                ? footerSuppliers.map((supplier) => (
                  <li key={supplier.id}>
                    <Link
                      to={`/${getSupplierSlug(supplier)}/categories`}
                      className="text-slate-400 hover:text-white text-sm transition-colors duration-200 flex items-center gap-2.5 group"
                    >
                      {supplier.logo ? (
                        <img
                          src={supplier.logo}
                          alt={supplier.name}
                          className="w-5 h-5 rounded-md object-contain bg-white/10 shrink-0"
                          loading="lazy"
                        />
                      ) : (
                        <span className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center shrink-0">
                          <Store className="h-3 w-3 text-slate-500" />
                        </span>
                      )}
                      <span className="truncate">{supplier.name}</span>
                    </Link>
                  </li>
                ))
                : ["", "", ""].map((_, i) => (
                  <li key={i} className="h-4 w-32 bg-white/5 rounded animate-pulse" />
                ))}

              <li>
                <Link
                  to="/shops"
                  className="text-blue-400 hover:text-blue-300 text-sm transition-colors duration-200 flex items-center gap-1.5 group font-semibold mt-1"
                >
                  <ChevronLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
                  عرض المزيد
                </Link>
              </li>
            </ul>
          </div> */}

          {/* Categories */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <LayoutGrid className="h-3.5 w-3.5" />
              الأقسام
            </h3>
            <ul className="space-y-2.5">
              {footerCategories.map((cat) => (
                <li key={cat.slug}>
                  <Link
                    to={`/products/${cat.slug}`}
                    className="text-slate-400 hover:text-white text-sm transition-colors duration-200 flex items-center gap-2.5 group"
                  >
                    {cat.image ? (
                      <img
                        src={cat.image}
                        alt={getCategoryNameFromSlug(cat.name)}
                        className="w-5 h-5 rounded-md object-cover bg-white/10 shrink-0"
                        loading="lazy"
                      />
                    ) : (
                      <span className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center shrink-0">
                        <LayoutGrid className="h-3 w-3 text-slate-500" />
                      </span>
                    )}
                    <span className="truncate">{getCategoryNameFromSlug(cat.name)}</span>
                  </Link>
                </li>
              ))}

              {/* Show more */}
              <li>
                <Link
                  to="/categories"
                  className="text-blue-400 hover:text-blue-300 text-sm transition-colors duration-200 flex items-center gap-1.5 group font-semibold mt-1"
                >
                  <ChevronLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
                  عرض المزيد
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom */}
        <div className="border-t border-white/8 mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
          <p>
            © {new Date().getFullYear()} {settings.footerCopyright || t("footer.copyright")}
          </p>
          <p className="flex items-center gap-1.5">
            Made with ❤️ by Ibrahim Moamen
          </p>
        </div>
      </div>
    </footer>
  );
}
