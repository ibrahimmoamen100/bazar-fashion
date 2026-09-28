'use client';

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useStore } from "@/store/useStore";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { Video, Scale, Star, Coins } from "lucide-react";

// ─── Logo cache helpers ────────────────────────────────────────────────────────
const LOGO_CACHE_KEY = 'bazar-fashion_splash_logo_cached_url';
const SPLASH_SETTINGS_CACHE_KEY = 'bazar-fashion_splash_settings_cache';

interface CachedSplashSettings {
  splashTextColor: string;
  splashBgColor: string;
  splashText: string;
  splashTheme: string;
}

/** Returns the last successfully used logo URL from localStorage */
function getCachedLogoUrl(): string {
  try { return localStorage.getItem(LOGO_CACHE_KEY) || localStorage.getItem('bazar_splash_logo_cached_url') || ''; } catch { return ''; }
}

/** Persists the logo URL so the next visit can use it immediately */
function saveCachedLogoUrl(url: string) {
  try { if (url) localStorage.setItem(LOGO_CACHE_KEY, url); } catch { /* noop */ }
}

/** Returns cached splash visual settings from localStorage */
function getCachedSplashSettings(): CachedSplashSettings | null {
  try {
    const raw = localStorage.getItem(SPLASH_SETTINGS_CACHE_KEY) || localStorage.getItem('bazar_splash_settings_cache');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/** Persists splash visual settings to avoid color flash on next visit */
function saveCachedSplashSettings(s: CachedSplashSettings) {
  try { localStorage.setItem(SPLASH_SETTINGS_CACHE_KEY, JSON.stringify(s)); } catch { /* noop */ }
}

/** Preloads an image URL into the browser cache via a hidden <link> tag */
function preloadImage(url: string) {
  if (!url || typeof document === 'undefined') return;
  // Avoid duplicate preload links
  if (document.querySelector(`link[rel="preload"][href="${url}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = url;
  document.head.appendChild(link);
}

// ─── Particle helpers ─────────────────────────────────────────────────────────
// Pre-generate stable particle data to avoid Math.random() in render (hydration mismatch)
const PARTICLE_DATA = Array.from({ length: 22 }, (_, i) => ({
  size: 4 + ((i * 7 + 3) % 9),         // deterministic size 4–12
  x: (i * 4.55 + 2) % 100,             // deterministic x 0–100
  delay: (i * 0.09) % 2,               // deterministic delay 0–2
  dur: 2.5 + (i * 0.09) % 2,           // deterministic duration 2.5–4.5
  yEnd: -(400 + (i * 13) % 300),       // deterministic y offset
}));

function Particles({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {PARTICLE_DATA.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{ width: p.size, height: p.size, left: `${p.x}%`, bottom: '-20px', background: color, opacity: 0.5 } as React.CSSProperties}
          animate={{ y: [0, p.yEnd], opacity: [0.5, 0] }}
          transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

// ─── Wave background ──────────────────────────────────────────────────────────
function WaveBackground({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute bottom-0 left-0 right-0"
          style={{
            height: `${35 + i * 15}%`,
            background: color,
            opacity: 0.12 + i * 0.06,
            borderRadius: '60% 60% 0 0 / 40% 40% 0 0',
          }}
          animate={{ y: [0, -14 + i * 5, 0], scaleX: [1, 1.03, 1] }}
          transition={{ duration: 3.5 + i * 0.7, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

// ─── Neon glow ring ───────────────────────────────────────────────────────────
function NeonRing({ color }: { color: string }) {
  return (
    <>
      <motion.div
        className="absolute rounded-full border-2"
        style={{ width: 220, height: 220, borderColor: color, boxShadow: `0 0 30px ${color}88, inset 0 0 30px ${color}44` }}
        animate={{ scale: [1, 1.05, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute rounded-full border"
        style={{ width: 300, height: 300, borderColor: color, opacity: 0.3 }}
        animate={{ scale: [1, 1.08, 1], rotate: [0, 360] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />
    </>
  );
}

// ─── PopupText: word-by-word staggered popup animation ────────────────────────
const wordContainerVariants = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.35,
      staggerChildren: 0.13,
    },
  },
};

const wordVariants = {
  hidden: {
    opacity: 0,
    scale: 0.4,
    y: 22,
    filter: 'blur(8px)',
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      type: 'spring' as const,
      stiffness: 320,
      damping: 22,
      mass: 0.8,
    },
  },
};

function PopupText({
  text,
  color,
  theme,
}: {
  text: string;
  color: string;
  theme: string;
}) {
  // Split into words (RTL-safe)
  const words = text.trim().split(/\s+/);
  const isNeon = theme === 'neon';

  return (
    <motion.span
      className="inline-flex flex-wrap items-center justify-center font-black leading-tight select-none"
      style={{
        gap: 'clamp(0.35rem, 1.2vw, 0.6rem)',
        direction: 'rtl',
      }}
      variants={wordContainerVariants}
      initial="hidden"
      animate="visible"
    >
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          variants={wordVariants}
          style={{
            display: 'inline-block',
            color,
            fontSize: 'clamp(1.6rem, 5.5vw, 2.7rem)',
            textShadow: isNeon
              ? `0 0 20px ${color}cc, 0 0 40px ${color}66`
              : `0 2px 16px ${color}33`,
            willChange: 'transform, opacity',
          }}
        >
          {word}
        </motion.span>
      ))}
    </motion.span>
  );
}


// ─── PremiumSplashContent ───────────────────────────────────────────────────
function PremiumSplashContent({
  textColor,
  theme,
}: {
  textColor: string;
  theme: string;
}) {
  const isNeon = theme === 'neon';
  const textShadowStyle = isNeon
    ? { textShadow: `0 0 25px ${textColor}cc, 0 0 50px ${textColor}66` }
    : { textShadow: `0 2px 14px ${textColor}22` };

  // Unique animations for each item
  const item1Variants: Variants = {
    hidden: { opacity: 0, scale: 0.7 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { type: 'spring', stiffness: 140, damping: 14, delay: 0.1 }
    }
  };

  const item2Variants: Variants = {
    hidden: { opacity: 0, scale: 0.7 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { type: 'spring', stiffness: 140, damping: 14, delay: 0.45 }
    }
  };

  const item3Variants: Variants = {
    hidden: { opacity: 0, scale: 0.7 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { type: 'spring', stiffness: 140, damping: 14, delay: 0.8 }
    }
  };

  const item4Variants: Variants = {
    hidden: { opacity: 0, scale: 0.7 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { type: 'spring', stiffness: 140, damping: 14, delay: 1.15 }
    }
  };

  const separatorVariants: Variants = {
    hidden: { opacity: 0, scale: 0 },
    visible: (delay: number) => ({
      opacity: 0.6,
      scale: 1,
      transition: { type: 'spring', stiffness: 100, delay }
    })
  };

  const subtextVariants: Variants = {
    hidden: { opacity: 0, y: 30, filter: 'blur(8px)', scale: 0.92 },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 70,
        damping: 14,
        delay: 1.6
      }
    }
  };

  const taglineVariants: Variants = {
    hidden: { opacity: 0, y: 20, scale: 0.88, filter: 'blur(6px)' },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: 'blur(0px)',
      transition: {
        type: 'spring',
        stiffness: 60,
        damping: 13,
        delay: 2.05
      }
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center select-none animate-in fade-in duration-500"
      style={{ gap: 'clamp(1.5rem, 5vw, 2.5rem)', marginTop: '0.5rem' }}
    >
      {/* Main phrase */}
      <motion.div
        className="flex items-center justify-center font-black text-center"
        style={{
          fontSize: 'clamp(1.1rem, 4.5vw, 2.6rem)',
          color: textColor,
          direction: 'rtl',
          ...textShadowStyle
        }}
        initial={{ opacity: 0, y: 18, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ delay: 0.5, duration: 0.7, ease: 'easeOut' }}
      >
        بازار الأزياء - استمتع بالتسوق الآن
      </motion.div>

    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export const GlobalSplash = () => {
  const [mounted, setMounted] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [isAppReady, setIsAppReady] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const { settings, loading: settingsLoading } = useSiteSettings();
  const loading = useStore((state) => state.loading);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    splashEnabled = true,
    splashTheme = 'elegant',
    splashText = 'أقل سعر في المول',
    splashSubtext = '',
    splashShowLogo = true,
    splashLogoUrl = '',
    splashBgColor = '#ffffff',
    splashTextColor = '#f8701b',
    splashDuration = 2.5,
    logoUrl = '/logo3.png',
  } = settings;

  // ── Determine real logo src from settings ────────────────────────────────
  const logoSrc = splashLogoUrl?.trim() || logoUrl || '/logo3.png';

  // ── Instant cached splash settings: avoids color flash on next visit ───────
  // On first render we use the localStorage cached colors (if any), so the
  // correct brand color is shown immediately without waiting for Firebase.
  const [displayTextColor, setDisplayTextColor] = useState<string>(
    () => getCachedSplashSettings()?.splashTextColor || splashTextColor
  );
  const [displayBgColor, setDisplayBgColor] = useState<string>(
    () => getCachedSplashSettings()?.splashBgColor || splashBgColor
  );
  const [displayTheme, setDisplayTheme] = useState<string>(
    () => getCachedSplashSettings()?.splashTheme || splashTheme
  );
  const [displayText, setDisplayText] = useState<string>(
    () => getCachedSplashSettings()?.splashText || splashText
  );

  const isCustomSplash =
    displayText === 'أقل سعر في المول' ||
    displayText === '🎥 نصور • نقارن • نراجع • نوفر' ||
    displayText === 'نبحث • نسأل • نُقارن • نوفّر' ||
    displayText.includes('نصور') ||
    displayText.includes('نبحث') ||
    displayText.includes('اقل سعر') ||
    displayText.includes('أقل سعر');

  // ── Instant logo: use localStorage cache so the logo shows immediately ─────
  // Falls back to: cached → default local file → resolved logoSrc
  const [displayLogoSrc, setDisplayLogoSrc] = useState<string>(
    () => getCachedLogoUrl() || '/logo3.png'
  );

  // Sync display values ONLY after Firebase settings have fully loaded.
  // This prevents DEFAULT_SETTINGS values from overwriting valid cached data
  // before Firebase responds — which was the cause of the green flash.
  useEffect(() => {
    if (settingsLoading) return;
    if (!logoSrc) return;

    setDisplayLogoSrc(logoSrc);
    saveCachedLogoUrl(logoSrc);
    preloadImage(logoSrc);

    // Update and cache the visual splash settings
    setDisplayTextColor(splashTextColor);
    setDisplayBgColor(splashBgColor);
    setDisplayTheme(splashTheme);
    setDisplayText(splashText);
    saveCachedSplashSettings({
      splashTextColor,
      splashBgColor,
      splashText,
      splashTheme,
    });
  }, [logoSrc, settingsLoading, splashTextColor, splashBgColor, splashTheme, splashText]);
  // ── Splash must stay long enough for BOTH texts to appear and be readable:
  // • Main content finishes animating at ~1.5 s
  // • Tagline appears at ~2.05 s
  // • Reader needs ~2 more seconds after the tagline → floor = 4.2 s
  // App data loads in the background at full speed; only the screen waits.
  const minMs = Math.max(4200, (splashDuration ?? 2.5) * 1000);

  useEffect(() => {
    const t = setTimeout(() => setMinTimeElapsed(true), minMs);
    return () => clearTimeout(t);
  }, [minMs]);

  useEffect(() => {
    const handleReady = () => setIsAppReady(true);
    window.addEventListener('app-ready', handleReady);
    const fallback = setTimeout(() => setIsAppReady(true), 5000);
    return () => { window.removeEventListener('app-ready', handleReady); clearTimeout(fallback); };
  }, []);

  useEffect(() => {
    if (!loading && isAppReady && minTimeElapsed) {
      // Short exit pause so the tagline is seen before fade-out begins
      setTimeout(() => setShowSplash(false), 350);
    }
  }, [loading, isAppReady, minTimeElapsed]);

  if (!splashEnabled || !showSplash) return null;

  // ── Logo entrance ────────────────────────────────────────────────────────
  const logoVariantMap: Record<string, object> = {
    elegant: { initial: { scale: 0.6, opacity: 0, y: 30 }, animate: { scale: 1, opacity: 1, y: 0 }, transition: { duration: 0.9, ease: 'easeOut' } },
    neon: { initial: { scale: 0.8, opacity: 0 }, animate: { scale: 1, opacity: 1 }, transition: { duration: 0.6 } },
    minimal: { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8 } },
    wave: { initial: { scale: 0.7, opacity: 0, rotate: -6 }, animate: { scale: 1, opacity: 1, rotate: 0 }, transition: { type: 'spring', stiffness: 180, damping: 14 } },
    particles: { initial: { scale: 1.3, opacity: 0 }, animate: { scale: 1, opacity: 1 }, transition: { duration: 0.7, ease: 'easeOut' } },
  };
  const logoAnim = logoVariantMap[splashTheme] || logoVariantMap.elegant;

  // ── Subtext animation ────────────────────────────────────────────────────
  const subtextAnim = { initial: { opacity: 0, y: 10 }, animate: { opacity: 0.7, y: 0 }, transition: { delay: 1.1, duration: 0.6 } };

  // ── Background content per theme ─────────────────────────────────────────
  const bgContent: Record<string, React.ReactNode> = {
    elegant: null,
    neon: (
      <>
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at center, ${displayTextColor}18 0%, transparent 70%)` }} />
        <NeonRing color={displayTextColor} />
      </>
    ),
    minimal: null,
    wave: <WaveBackground color={displayTextColor} />,
    particles: <Particles color={displayTextColor} />,
  };

  // Responsive logo size using clamp for all screen sizes
  const logoSize = 'clamp(165px, 26vw, 260px)';

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {showSplash && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: displayTheme === 'elegant' ? 0.96 : 1 }}
          transition={{ duration: 0.65, ease: 'easeInOut' }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden"
          style={{
            width: '100dvw',
            height: '100dvh',
            background: displayBgColor,
            margin: 0,
            padding: 0,
          }}
        >
          {/* Background decoration */}
          {bgContent[displayTheme]}

          {/* Main content */}
          <div
            className="relative z-10 flex flex-col items-center justify-center text-center"
            style={{ gap: 'clamp(0.75rem, 2.5vw, 1.5rem)', padding: 'clamp(1.5rem, 5vw, 3rem)' }}
          >

            {/* Logo with pulsing shadow glow */}
            {splashShowLogo && (
              <div
                className="relative flex items-center justify-center"
                style={{ marginBottom: 'clamp(0.5rem, 2vw, 1.25rem)' }}
              >
                {/* Background glow circle */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{
                    opacity: [0.12, 0.28, 0.12],
                    scale: [0.92, 1.08, 0.92]
                  }}
                  transition={{
                    opacity: { duration: 3.5, repeat: Infinity, ease: "easeInOut" },
                    scale: { duration: 3.5, repeat: Infinity, ease: "easeInOut" }
                  }}
                  className="absolute rounded-full blur-3xl pointer-events-none"
                  style={{
                    width: logoSize,
                    height: logoSize,
                    backgroundColor: displayTextColor,
                  }}
                />

                <motion.img
                  src={displayLogoSrc}
                  alt="Loading..."
                  className="object-contain relative z-10"
                  fetchPriority="high"
                  decoding="async"
                  style={{
                    width: logoSize,
                    height: logoSize,
                    filter: displayTheme === 'neon' ? `drop-shadow(0 0 16px ${displayTextColor}aa)` : 'none',
                  }}
                  onError={() => {
                    // If the cached URL fails, fall back to the fresh one
                    if (displayLogoSrc !== logoSrc) setDisplayLogoSrc(logoSrc);
                  }}
                  {...(logoAnim as any)}
                />
              </div>
            )}

            {/* Splash text/content animation */}
            {isCustomSplash ? (
              <PremiumSplashContent
                textColor={displayTextColor}
                theme={displayTheme}
              />
            ) : (
              <>
                {/* Popup Text Animation */}
                <div style={{ marginBottom: 'clamp(0.25rem, 1vw, 0.5rem)' }}>
                  <PopupText
                    text={displayText}
                    color={displayTextColor}
                    theme={displayTheme}
                  />
                </div>

                {/* Subtext */}
                {splashSubtext?.trim() && (
                  <motion.p
                    className="font-medium"
                    style={{
                      color: displayTextColor,
                      fontSize: 'clamp(0.75rem, 2vw, 1rem)',
                    }}
                    {...(subtextAnim as any)}
                  >
                    {splashSubtext}
                  </motion.p>
                )}
              </>
            )}

            {/* Loading dots */}
            <motion.div
              className="flex"
              style={{ gap: 'clamp(0.3rem, 0.8vw, 0.5rem)', marginTop: 'clamp(0.25rem, 1vw, 0.5rem)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="rounded-full"
                  style={{
                    width: 'clamp(5px, 1.2vw, 8px)',
                    height: 'clamp(5px, 1.2vw, 8px)',
                    background: displayTextColor,
                    opacity: 0.5,
                  }}
                  animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.3, 1] }}
                  transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }}
                />
              ))}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
