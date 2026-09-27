'use client';

import { MapPin } from "lucide-react";
import { Link } from "react-router-dom";
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

        {/* ── Left: Location Link (مقر المخزن بدلاً من رقم الهاتف) ── */}
        <div className="flex items-center">
          <Link
            to="/locations"
            className="group flex items-center gap-1.5 py-1 px-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs transition-all duration-200 hover:scale-105 shadow-xs"
            aria-label={settings.navLinks?.locations || "مقر المخزن"}
          >
            <MapPin className="h-3.5 w-3.5 text-yellow-300 group-hover:scale-110 transition-transform" />
            <span>{settings.navLinks?.locations || "مقر المخزن"}</span>
          </Link>
        </div>

        {/* ── Right: Social Icons ── */}
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

      </div>
    </div>
  );
}
