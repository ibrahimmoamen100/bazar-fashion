'use client';

import { Phone } from "lucide-react";
import {
  FaFacebookF,
  FaWhatsapp,
  FaTiktok,
  FaYoutube,
} from "react-icons/fa";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";

export function Topbar() {
  const { settings } = useSiteSettings();

  const socialLinks = [
    {
      href: "https://www.facebook.com/BazarElectronics1",
      icon: <FaFacebookF className="h-3.5 w-3.5" />,
      hoverColor: "hover:text-blue-300",
      label: "Facebook",
    },
    {
      href: "https://wa.me/201024911062",
      icon: <FaWhatsapp className="h-3.5 w-3.5" />,
      hoverColor: "hover:text-green-300",
      label: "WhatsApp",
    },
    {
      href: "https://www.tiktok.com/@ibrahim.moamen100",
      icon: <FaTiktok className="h-3.5 w-3.5" />,
      hoverColor: "hover:text-white",
      label: "TikTok",
    },
    {
      href: "https://www.youtube.com/@ibrahim-moamen",
      icon: <FaYoutube className="h-3.5 w-3.5" />,
      hoverColor: "hover:text-red-300",
      label: "YouTube",
    },
  ];

  return (
    <div
      className="text-white text-xs relative z-30"
      style={{ backgroundColor: "var(--topbar-bg, #155654)" }}
    >
      <div className="container flex h-10 items-center justify-between gap-4 px-4 md:px-8">

        {/* ── Left: Phone + Location ── */}
        <div className="hidden sm:flex items-center gap-4">
          {settings.phone && (
            <a
              href={`tel:${settings.phone}`}
              className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors font-semibold"
              dir="ltr"
              aria-label="اتصل بنا"
            >
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span>{settings.phone}</span>
            </a>
          )}

          {settings.phone && (
            <span className="w-px h-4 bg-white/20" />
          )}

          {/* <Link
            to="/locations"
            className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors font-semibold"
            aria-label="فروعنا"
          >
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>
              {settings.navLinks?.locations || "فروعنا"}
            </span>
          </Link> */}
        </div>

        {/* ── Center: Social Icons ── */}
        <div className="flex items-center gap-1.5">
          {socialLinks.map((link, i) => (
            <a
              key={i}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={link.label}
              className={`
                flex items-center justify-center w-7 h-7 rounded-lg
                border border-white/25 bg-white/10
                text-white/80
                ${link.hoverColor}
                hover:bg-white/20 hover:border-white/40
                transition-all duration-200 hover:scale-110
              `}
            >
              {link.icon}
            </a>
          ))}
        </div>


        {/* Mobile: show phone call button instead of location link */}
        <div className="flex sm:hidden items-center gap-2">
          {settings.phone ? (
            <a
              href={`tel:${settings.phone}`}
              className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors font-semibold"
              dir="ltr"
              aria-label="اتصل بنا"
            >
              <Phone className="h-3 w-3 shrink-0" />
              <span>{settings.phone}</span>
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
