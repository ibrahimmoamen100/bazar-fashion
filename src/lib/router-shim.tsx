'use client';

/**
 * react-router-dom compatibility shim for Next.js App Router
 *
 * Maps react-router-dom API surface → Next.js equivalents transparently.
 * SSR-safe: all hooks return sensible defaults on the server.
 */

import NextLink from 'next/link';
import type { ComponentProps } from 'react';
import {
  useRouter,
  usePathname,
  useSearchParams as nextUseSearchParams,
  useParams as nextUseParams,
} from 'next/navigation';
import { useEffect } from 'react';

// ─── Link ─────────────────────────────────────────────────────────────────────
// react-router-dom uses `to`; next/link uses `href` — this wrapper accepts both.
type NextLinkProps = ComponentProps<typeof NextLink>;
interface LinkProps extends Omit<NextLinkProps, 'href'> {
  to?: string;
  href?: string;
}

export function Link({ to, href, children, ...rest }: LinkProps) {
  const destination = (to ?? href ?? '/') as string;
  return (
    <NextLink href={destination} {...rest}>
      {children}
    </NextLink>
  );
}

// ─── useNavigate ──────────────────────────────────────────────────────────────
export function useNavigate() {
  const router = useRouter();
  return (to: string, options?: { replace?: boolean; state?: any }) => {
    if (options?.replace) {
      router.replace(to);
    } else {
      router.push(to);
    }
  };
}

// ─── useLocation ──────────────────────────────────────────────────────────────
// NOTE: does NOT call useSearchParams here — that hook requires <Suspense>.
// Components that need search params should call useSearchParams() directly.
export function useLocation() {
  const pathname = usePathname() ?? '/';
  return {
    pathname,
    search: typeof window !== 'undefined' ? window.location.search : '',
    hash: typeof window !== 'undefined' ? window.location.hash : '',
    state: null,
    key: 'default',
  };
}

// ─── useSearchParams ──────────────────────────────────────────────────────────
// Returns [ReadonlyURLSearchParams, setSearchParams] matching react-router-dom API
// NOTE: This hook requires a <Suspense> boundary in Next.js App Router.
// If called outside Suspense, it returns an empty URLSearchParams as a safe fallback.
export function useSearchParams() {
  // nextUseSearchParams() throws a special promise (Suspense signal) when no boundary exists.
  // We wrap it safely: components using this MUST be inside a <Suspense> wrapper.
  const searchParams = nextUseSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const setSearchParams = (nextInit: any) => {
    const current = new URLSearchParams(searchParams?.toString() ?? '');
    let newParams: URLSearchParams;
    if (typeof nextInit === 'function') {
      newParams = nextInit(current);
    } else if (nextInit instanceof URLSearchParams) {
      newParams = nextInit;
    } else {
      newParams = new URLSearchParams(nextInit);
    }
    router.push(`${pathname}?${newParams.toString()}`);
  };

  return [searchParams, setSearchParams] as const;
}

// ─── useParams ────────────────────────────────────────────────────────────────
export function useParams<
  T extends Record<string, string | string[]> = Record<string, string>,
>(): T {
  return nextUseParams() as T;
}

// ─── Navigate ─────────────────────────────────────────────────────────────────
interface NavigateProps {
  to: string;
  replace?: boolean;
}

export function Navigate({ to, replace = false }: NavigateProps) {
  const router = useRouter();
  useEffect(() => {
    if (replace) {
      router.replace(to);
    } else {
      router.push(to);
    }
  }, [to, replace, router]);
  return null;
}

// ─── No-ops (Next.js file-system routing handles these) ───────────────────────
export function BrowserRouter({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function Routes({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function Route({
  element,
}: {
  path?: string;
  element?: React.ReactNode;
}) {
  return <>{element}</>;
}
