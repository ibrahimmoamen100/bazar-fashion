'use client';

/**
 * MetaPixelInitializer
 * ---------------------
 * Dynamically injects and manages the Meta (Facebook) Pixel script.
 * Supports Next.js App Router route transitions and fallback Pixel ID.
 */
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { HARDCODED_PIXEL_ID } from '@/lib/metaPixel';

declare global {
  interface Window {
    fbq: (...args: unknown[]) => void;
    _fbq: unknown;
  }
}

export function MetaPixelInitializer() {
  const { settings } = useSiteSettings();
  const pathname = usePathname();
  const initializedPixelId = useRef<string | null>(null);
  const isFirstMount = useRef(true);

  const pixelId = settings?.metaPixelId?.trim() || HARDCODED_PIXEL_ID;

  // ── Step 1: Inject & initialize pixel when ID is available ──────────
  useEffect(() => {
    if (!pixelId || pixelId === 'YOUR_PIXEL_ID_HERE') return;
    if (initializedPixelId.current === pixelId) return;

    // Inject base Meta Pixel bootstrap code if not already present
    if (typeof window !== 'undefined' && typeof window.fbq !== 'function') {
      (function (f: Window, b: Document, e: string, v: string) {
        const n: unknown = function (...args: unknown[]) {
          (n as { callMethod?: Function; queue: unknown[]; loaded: boolean; version: string }).callMethod
            ? (n as { callMethod: Function }).callMethod(...args)
            : (n as { queue: unknown[] }).queue.push(args);
        };
        const fnObj = n as {
          push: unknown;
          loaded: boolean;
          version: string;
          queue: unknown[];
          callMethod?: Function;
        };
        if (!f._fbq) f._fbq = n;
        fnObj.push = n;
        fnObj.loaded = true;
        fnObj.version = '2.0';
        fnObj.queue = [];
        f.fbq = n as (...args: unknown[]) => void;
        const t = b.createElement(e) as HTMLScriptElement;
        t.async = true;
        t.src = v;
        const s = b.getElementsByTagName(e)[0];
        s.parentNode?.insertBefore(t, s);
      })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    }

    if (typeof window.fbq === 'function') {
      window.fbq('init', pixelId);
      window.fbq('track', 'PageView');
      initializedPixelId.current = pixelId;
    }
  }, [pixelId]);

  // ── Step 2: Track PageView on route navigation (Next.js App Router) ──
  useEffect(() => {
    if (!pixelId) return;

    // Skip the very first mount because Step 1 already tracks the initial PageView
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      window.fbq('track', 'PageView');
    }
  }, [pathname, pixelId]);

  if (!pixelId) return null;

  return (
    <noscript>
      <img
        height="1"
        width="1"
        style={{ display: 'none' }}
        src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
        alt=""
      />
    </noscript>
  );
}

// ── Helper: fire any fbq event safely ───────────────────────────────────
export function trackPixelEvent(event: string, data?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
    if (data) {
      window.fbq('track', event, data);
    } else {
      window.fbq('track', event);
    }
  }
}
