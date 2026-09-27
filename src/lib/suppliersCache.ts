import { db } from './firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { registerSupplierSlug } from '@/utils/url';

export interface CachedSupplier {
  id: string;
  name: string;
  slug?: string;
  phone?: string;
  isPhonePublic?: boolean;
  address?: string;
  logo?: string;
  coverImage?: string;
  description?: string;
  tags?: string[];
  displayOrder?: number;
  isArchived?: boolean;
}

const SUPPLIERS_CACHE_KEY = 'bazar_active_suppliers_cache';
const SUPPLIERS_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

// In-Memory L1 Cache
let inMemorySuppliers: CachedSupplier[] | null = null;
let inMemoryTimestamp = 0;
let inFlightPromise: Promise<CachedSupplier[]> | null = null;

export function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\u0600-\u06FFa-z0-9-]/g, '')
    .replace(/-+/g, '-');
}

export function getSupplierSlug(s: { slug?: string; name: string; id: string }): string {
  if (s.slug && s.slug.trim()) return s.slug.trim();
  return slugify(s.name) || s.id;
}

/**
 * Returns active suppliers from Memory (L1) -> SessionStorage (L2) -> Firestore (L3)
 * Concurrent calls share the same in-flight network request.
 */
export async function getActiveSuppliers(forceRefresh: boolean = false): Promise<CachedSupplier[]> {
  const now = Date.now();

  // 1. L1: In-memory cache check
  if (!forceRefresh && inMemorySuppliers && now - inMemoryTimestamp < SUPPLIERS_CACHE_TTL_MS) {
    return inMemorySuppliers;
  }

  // 2. L2: SessionStorage check (persists across page reloads in the same tab, 0 reads)
  if (!forceRefresh && typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem(SUPPLIERS_CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.data && now - parsed.timestamp < SUPPLIERS_CACHE_TTL_MS) {
          inMemorySuppliers = parsed.data;
          inMemoryTimestamp = parsed.timestamp;
          if (Array.isArray(parsed.data)) {
            parsed.data.forEach((s: any) => {
              if (s.name && s.slug) registerSupplierSlug(s.name, s.slug);
            });
          }
          return inMemorySuppliers!;
        }
      }
    } catch {
      // Fallback silently if storage unavailable
    }
  }

  // 3. Deduplicate concurrent requests (if Footer and Carousel load at the same time, make only 1 read!)
  if (inFlightPromise) {
    return inFlightPromise;
  }

  inFlightPromise = (async () => {
    try {
      const q = query(
        collection(db, 'suppliers'),
        where('isArchived', '==', false)
      );
      const snap = await getDocs(q);
      const list: CachedSupplier[] = snap.docs.map((d) => {
        const data = d.data() as any;
        const computedSlug = data.slug || slugify(data.name || '') || d.id;
        return {
          id: d.id,
          ...data,
          slug: computedSlug,
          isArchived: false,
        };
      });

      // Sort by displayOrder (1, 2, 3...), then alphabetically
      list.sort((a, b) => {
        const oa = a.displayOrder && a.displayOrder > 0 ? a.displayOrder : 999999;
        const ob = b.displayOrder && b.displayOrder > 0 ? b.displayOrder : 999999;
        if (oa !== ob) return oa - ob;
        return a.name.localeCompare(b.name, 'ar');
      });

      // Register slugs globally in URL cache
      list.forEach((s) => {
        if (s.name && s.slug) registerSupplierSlug(s.name, s.slug);
      });

      // Update L1
      inMemorySuppliers = list;
      inMemoryTimestamp = Date.now();

      // Update L2
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(
            SUPPLIERS_CACHE_KEY,
            JSON.stringify({ data: list, timestamp: inMemoryTimestamp })
          );
        } catch {
          // Ignore storage quota
        }
      }

      console.log(`⚡ [SuppliersCache] Fetched and cached ${list.length} active suppliers from Firebase`);
      return list;
    } catch (error) {
      console.error('Failed to fetch active suppliers:', error);
      return inMemorySuppliers || [];
    } finally {
      inFlightPromise = null;
    }
  })();

  return inFlightPromise;
}

/**
 * Invalidate suppliers cache (call after admin creates, edits, archives, or deletes a supplier)
 */
export function invalidateSuppliersCache(): void {
  inMemorySuppliers = null;
  inMemoryTimestamp = 0;
  inFlightPromise = null;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(SUPPLIERS_CACHE_KEY);
    } catch {}
  }
}
