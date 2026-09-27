'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

// Pages whose scroll position should be PRESERVED when navigating back to them.
const PRESERVE_SCROLL_PATTERNS = [
  /^\/products(\/category\/[^/]+)?$/,
];

function shouldPreserveScroll(pathname: string): boolean {
  return PRESERVE_SCROLL_PATTERNS.some((pattern) => pattern.test(pathname));
}

export function ScrollToTop() {
  const pathname = usePathname();
  const prevPathnameRef = useRef<string>(pathname);

  useEffect(() => {
    const from = prevPathnameRef.current;
    const to = pathname;
    prevPathnameRef.current = to;

    // If we are returning to a products listing page, do NOT scroll to top.
    if (shouldPreserveScroll(to)) return;

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);

  return null;
}
