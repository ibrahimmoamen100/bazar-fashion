// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, doc, getDocs, getDoc, addDoc, setDoc, updateDoc, deleteDoc, query, orderBy, where, Timestamp, runTransaction, serverTimestamp } from 'firebase/firestore';
import { Product, CatalogMeta } from '@/types/product';
import {
  Employee,
  AttendanceRecord,
  MonthlySummary,
  ExcuseStatus,
  DeductionType,
  AttendanceStatus,
  AttendanceSettings,
  ExcusedAbsencePolicy,
  DEFAULT_ATTENDANCE_SETTINGS,
  SalaryAdvance,
  calculateDelayDeduction,
  calculateOvertime,
  calculateDelay,
  getEmployeeDailyWage,
} from '@/types/attendance';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAmXrW6t3i_feJOWa3lafUg7yp7deYND6k",
  authDomain: "bazar-fashion.firebaseapp.com",
  projectId: "bazar-fashion",
  storageBucket: "bazar-fashion.firebasestorage.app",
  messagingSenderId: "316960267880",
  appId: "1:316960267880:web:9b9b9b100be9ef314fa5dd",
  measurementId: "G-L11MGSMPXN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize Firebase Analytics with proper async support check
// This will be null if Analytics is not supported (e.g., server-side rendering, ad blockers)
export let analytics: Analytics | null = null;

// Async initialization of Analytics
(async () => {
  if (typeof window !== 'undefined') {
    try {
      const supported = await isSupported();
      if (supported) {
        analytics = getAnalytics(app);
        console.log('✅ Firebase Analytics initialized successfully');
      } else {
        console.warn('⚠️ Firebase Analytics is not supported in this environment');
      }
    } catch (error) {
      console.warn('⚠️ Analytics initialization failed:', error);
    }
  }
})();

// Firebase Products Service
export class FirebaseProductsService {
  private collectionName = 'products';

  // ── getCatalogVersion in-memory throttle ──────────────────────────────────
  private _catalogVersionCache: string | null = null;
  private _catalogVersionTimestamp = 0;
  private static CATALOG_VERSION_TTL_MS = 3 * 60 * 1000; // 3 minutes

  private replaceUndefinedWithNull<T>(value: T): T {
    if (Array.isArray(value)) {
      return (value as any).map((item: any) =>
        this.replaceUndefinedWithNull(item)
      ) as T;
    }

    if (value instanceof Date) {
      return value;
    }

    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, any>).map(([key, val]) => [
          key,
          this.replaceUndefinedWithNull(val === undefined ? null : val),
        ])
      ) as T;
    }

    return (value === undefined ? (null as any) : value) as T;
  }

  // Generate a URL-friendly slug from a product name
  private slugifyProductName(name: string): string {
    const maxWords = 25;
    const normalized = name
      .trim()
      // Replace underscores with spaces first
      .replace(/[_]+/g, ' ')
      // Collapse multiple whitespace
      .replace(/\s+/g, ' ');

    // Limit to first N words
    const words = normalized.split(' ').slice(0, maxWords);
    const limited = words.join(' ');

    // Convert to lowercase for consistency
    const lower = limited.toLowerCase();

    // Keep letters (including non-latin), numbers and spaces; replace others with a space
    const cleaned = lower.replace(/[^\p{L}\p{N}\s-]+/gu, ' ');

    // Replace spaces and consecutive dashes with single dash, and trim
    const dashed = cleaned
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    // Optionally cap total length for nicer URLs
    const maxLen = 120;
    return dashed.length > maxLen ? dashed.slice(0, maxLen).replace(/-+$/g, '') : dashed;
  }

  // Ensure unique slug by checking Firestore doc IDs and appending a counter if needed
  private async ensureUniqueSlug(baseSlug: string): Promise<string> {
    let candidate = baseSlug || 'product';
    let attempt = 1;

    // Check if a document with this ID already exists
    // Try a reasonable number of attempts to avoid infinite loops
    while (attempt <= 100) {
      const ref = doc(db, this.collectionName, candidate);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        return candidate;
      }
      attempt += 1;
      candidate = `${baseSlug}-${attempt}`;
    }
    // Fallback: timestamp-based suffix
    return `${baseSlug}-${Date.now().toString(36)}`;
  }

  // ── Catalog Version Token Management & Caching ──────────────────────────────

  // Fetch remote catalog version document (_meta/catalog)
  // Throttled: returns in-memory cached value for up to 3 minutes to avoid repeated reads
  async getCatalogVersion(): Promise<string | null> {
    const now = Date.now();
    if (
      this._catalogVersionCache !== null &&
      now - this._catalogVersionTimestamp < FirebaseProductsService.CATALOG_VERSION_TTL_MS
    ) {
      return this._catalogVersionCache;
    }
    try {
      const metaRef = doc(db, '_meta', 'catalog');
      const snap = await getDoc(metaRef);
      if (snap.exists()) {
        const data = snap.data() as CatalogMeta;
        const version = data?.version || null;
        this._catalogVersionCache = version;
        this._catalogVersionTimestamp = now;
        return version;
      }
      return null;
    } catch (error) {
      console.warn('⚠️ Failed to fetch catalog version (offline or permission):', error);
      return null;
    }
  }

  // Update catalog version token in _meta/catalog
  async updateCatalogVersion(targetPaths?: string | string[]): Promise<string> {
    try {
      const metaRef = doc(db, '_meta', 'catalog');
      const newVersion =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

      await setDoc(
        metaRef,
        {
          version: newVersion,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Bust in-memory throttle so next getCatalogVersion reads fresh value
      this._catalogVersionCache = newVersion;
      this._catalogVersionTimestamp = Date.now();

      // If in browser, update local catalog_version immediately
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('catalog_version', newVersion);
        } catch { }
      }

      // Trigger on-demand ISR revalidation in background for specific paths
      this.triggerISRRevalidation(targetPaths);

      console.log('⚡ Updated catalog version token to:', newVersion);
      return newVersion;
    } catch (error) {
      console.error('❌ Failed to update catalog version:', error);
      return `${Date.now()}`;
    }
  }

  // Background trigger for Next.js On-Demand ISR
  triggerISRRevalidation(target?: string | string[]): void {
    if (typeof window !== 'undefined') {
      const secret = 'bazar-revalidate-secret-token-2025';
      const body = Array.isArray(target)
        ? { paths: target }
        : target
          ? { path: target }
          : {};

      fetch('/api/revalidate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${secret}`,
        },
        body: JSON.stringify(body),
      }).catch((err) => {
        console.warn('⚠️ ISR revalidation trigger notice:', err);
      });
    }
  }

  /**
   * Immediately invalidate ALL client-side product caches.
   * Called after every write operation (add / update / delete product).
   * Pattern inspired by Amazon's "Cache-Aside with Write-Through Invalidation":
   *   1. Remove persisted catalog from localStorage
   *   2. Remove stored version token from localStorage
   *   3. Reset the in-memory version throttle so the next getAllProducts() call
   *      always fetches a fresh version check from Firestore (never serves stale 3-min cache)
   */
  invalidateProductsCache(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem('cached_products');
      localStorage.removeItem('catalog_version');
    } catch {
      // Ignore storage errors
    }
    // Reset in-memory version throttle so next getCatalogVersion() reads from Firestore
    this._catalogVersionCache = null;
    this._catalogVersionTimestamp = 0;
    console.log('🗑️ [CacheInvalidation] Products cache cleared — next load will fetch fresh data from Firestore');
  }

  // Get all products with catalog version cache verification
  async getAllProducts(forceRefresh: boolean = false): Promise<Product[]> {
    const CACHE_KEY = 'cached_products';
    const VERSION_KEY = 'catalog_version';

    // ── Server-Side Rendering / ISR (Direct Firestore Query) ──────────────────
    if (typeof window === 'undefined') {
      try {
        const productsRef = collection(db, this.collectionName);
        const q = query(productsRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);

        const products: Product[] = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          products.push({
            ...data,
            id: docSnap.id,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
            offerEndsAt: data.offerEndsAt?.toDate?.()?.toISOString() || data.offerEndsAt,
            expirationDate: data.expirationDate?.toDate?.()?.toISOString() || data.expirationDate,
          } as Product);
        });
        return products;
      } catch (error) {
        console.error('Failed to load products server-side:', error);
        return [];
      }
    }

    // ── Client-Side Cache & Version Strategy ──────────────────────────────────
    const localVersion = localStorage.getItem(VERSION_KEY);
    const cachedProductsJson = localStorage.getItem(CACHE_KEY);

    // 1. If not forcing refresh, check remote catalog version token (1 lightweight read)
    if (!forceRefresh) {
      try {
        const remoteVersion = await this.getCatalogVersion();

        // If remote version matches local cached version and cache exists, return cached data immediately (0 extra reads!)
        if (remoteVersion && localVersion && remoteVersion === localVersion && cachedProductsJson) {
          try {
            const cachedProducts: Product[] = JSON.parse(cachedProductsJson);
            if (Array.isArray(cachedProducts) && cachedProducts.length > 0) {
              console.log('⚡ [CatalogCache] Serving', cachedProducts.length, 'products from cache (version:', remoteVersion, ')');
              return cachedProducts;
            }
          } catch (parseError) {
            console.warn('⚠️ [CatalogCache] Failed to parse cached products:', parseError);
          }
        }
      } catch (versionError) {
        console.warn('⚠️ [CatalogCache] Error checking catalog version, checking local cache fallback:', versionError);
        if (cachedProductsJson) {
          try {
            const cachedProducts: Product[] = JSON.parse(cachedProductsJson);
            if (Array.isArray(cachedProducts) && cachedProducts.length > 0) {
              console.log('📦 [CatalogCache] Network offline/unstable: Serving fallback cached products');
              return cachedProducts;
            }
          } catch { }
        }
      }
    }

    // 2. Fetch fresh products from Firestore if versions differ, forceRefresh is true, or cache is missing
    try {
      console.log('🔄 [CatalogCache] Fetching fresh catalog from Firestore…');
      const productsRef = collection(db, this.collectionName);
      const q = query(productsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      const products: Product[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        products.push({
          ...data,
          id: docSnap.id,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          offerEndsAt: data.offerEndsAt?.toDate?.()?.toISOString() || data.offerEndsAt,
          expirationDate: data.expirationDate?.toDate?.()?.toISOString() || data.expirationDate,
        } as Product);
      });

      // Fetch or initialize latest remote version
      let currentVersion = await this.getCatalogVersion();
      if (!currentVersion) {
        currentVersion = await this.updateCatalogVersion();
      }

      // Update localStorage with fresh products and current version
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(products));
        if (currentVersion) {
          localStorage.setItem(VERSION_KEY, currentVersion);
        }
      } catch (storageError) {
        console.warn('⚠️ Failed to cache products in localStorage:', storageError);
      }

      // Merge & sync any offline fallback products if present
      try {
        const localProductsKey = 'bazar_local_products_fallback';
        const localProductsJson = localStorage.getItem(localProductsKey);
        if (localProductsJson) {
          const localProducts: Product[] = JSON.parse(localProductsJson);
          console.log('📦 Found', localProducts.length, 'products in localStorage fallback');
          const firebaseIds = new Set(products.map((p) => p.id));
          const uniqueLocalProducts = localProducts.filter((p) => !firebaseIds.has(p.id));

          if (uniqueLocalProducts.length > 0) {
            console.log('🚀 Syncing ' + uniqueLocalProducts.length + ' local products to Firebase...');
            (async () => {
              try {
                const successfullySyncedIds = new Set<string>();
                for (const p of uniqueLocalProducts) {
                  try {
                    const docRef = doc(db, this.collectionName, p.id);
                    const { id, _savedLocally, ...productDataWithoutId } = p as any;
                    const productData = {
                      ...productDataWithoutId,
                      createdAt: productDataWithoutId.createdAt
                        ? Timestamp.fromDate(new Date(productDataWithoutId.createdAt))
                        : Timestamp.now(),
                      offerEndsAt: productDataWithoutId.offerEndsAt
                        ? Timestamp.fromDate(new Date(productDataWithoutId.offerEndsAt))
                        : null,
                      expirationDate: productDataWithoutId.expirationDate
                        ? Timestamp.fromDate(new Date(productDataWithoutId.expirationDate))
                        : null,
                    };

                    const cleanData = Object.fromEntries(
                      Object.entries(productData).filter(([_, v]) => v !== undefined)
                    );

                    await setDoc(docRef, cleanData);
                    console.log('✅ Auto-synced product to Firebase:', p.id);
                    successfullySyncedIds.add(p.id);
                  } catch (syncError) {
                    console.error('❌ Failed to auto-sync product ' + p.id + ' to Firebase:', syncError);
                  }
                }

                if (successfullySyncedIds.size > 0) {
                  const currentLocalJson = localStorage.getItem(localProductsKey);
                  if (currentLocalJson) {
                    const currentLocal: Product[] = JSON.parse(currentLocalJson);
                    const remainingLocalProducts = currentLocal.filter((p) => !successfullySyncedIds.has(p.id));

                    if (remainingLocalProducts.length === 0) {
                      localStorage.removeItem(localProductsKey);
                      console.log('✅ All local products synced and removed from localStorage fallback.');
                    } else {
                      localStorage.setItem(localProductsKey, JSON.stringify(remainingLocalProducts));
                    }
                  }
                  await this.updateCatalogVersion();
                }
              } catch (e) {
                console.error('Auto-sync process failed:', e);
              }
            })();

            products.push(...uniqueLocalProducts);
          }
        }
      } catch (localError) {
        console.warn('⚠️ Error loading local products:', localError);
      }

      return products;
    } catch (error: any) {
      console.warn('⚠️ Failed to load products from Firebase (falling back to localStorage):', error?.message || error);

      // Fallback to cached products
      if (cachedProductsJson) {
        try {
          const cachedProducts: Product[] = JSON.parse(cachedProductsJson);
          if (Array.isArray(cachedProducts) && cachedProducts.length > 0) {
            console.log('✅ Loaded', cachedProducts.length, 'products from cached_products fallback');
            return cachedProducts;
          }
        } catch { }
      }

      // Secondary fallback to localStorage
      try {
        const localProductsKey = 'bazar_local_products_fallback';
        const localProductsJson = localStorage.getItem(localProductsKey);
        if (localProductsJson) {
          const localProducts: Product[] = JSON.parse(localProductsJson);
          console.log('✅ Loaded', localProducts.length, 'products from localStorage fallback');
          return localProducts;
        }
        return [];
      } catch (localError) {
        console.error('❌ Error loading products from localStorage:', localError);
        return [];
      }
    }
  }

  // Get product by ID
  async getProductById(id: string): Promise<Product | null> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          ...data,
          id: docSnap.id,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          offerEndsAt: data.offerEndsAt?.toDate?.()?.toISOString() || data.offerEndsAt,
          expirationDate: data.expirationDate?.toDate?.()?.toISOString() || data.expirationDate,
        } as Product;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting product:', error);
      throw error;
    }
  }

  // Add new product
  async addProduct(product: Omit<Product, 'id'>): Promise<Product> {
    const normalizedProduct = this.replaceUndefinedWithNull(product);

    // Clean the product data by removing undefined values
    const cleanProduct = Object.fromEntries(
      Object.entries(normalizedProduct).filter(([_, value]) => value !== undefined)
    );

    // Build slug from product name and ensure uniqueness
    const baseSlug = this.slugifyProductName((cleanProduct as any).name || 'product');

    // Try Firebase first
    try {
      const productsRef = collection(db, this.collectionName);

      // Convert dates to Firestore Timestamps
      const productData = {
        ...cleanProduct,
        createdAt: (cleanProduct as any).createdAt ? Timestamp.fromDate(new Date((cleanProduct as any).createdAt)) : Timestamp.now(),
        offerEndsAt: (cleanProduct as any).offerEndsAt ? Timestamp.fromDate(new Date((cleanProduct as any).offerEndsAt)) : null,
        expirationDate: (cleanProduct as any).expirationDate ? Timestamp.fromDate(new Date((cleanProduct as any).expirationDate)) : null,
      };

      const uniqueSlug = await this.ensureUniqueSlug(baseSlug);

      // Create document with custom ID equal to the slug
      const docRef = doc(productsRef, uniqueSlug);
      await setDoc(docRef, productData);

      console.log('✅ Product added to Firebase successfully:', uniqueSlug);

      // Update Catalog Version Token for cache invalidation & ISR
      // Includes /categories so the category page also gets fresh ISR content
      await this.updateCatalogVersion(['/', '/categories', `/product/${uniqueSlug}`]);

      // Immediately bust client-side cache so admin sees the new product right away
      this.invalidateProductsCache();

      return {
        ...(cleanProduct as any),
        createdAt: (cleanProduct as any).createdAt || new Date().toISOString(),
        id: uniqueSlug,
      } as Product;
    } catch (error: any) {
      console.warn('⚠️ Failed to add product to Firebase (falling back to localStorage):', error?.message || error);

      // Fallback to localStorage
      try {
        const uniqueSlug = baseSlug + '-' + Date.now();
        const productWithId = {
          ...(cleanProduct as any),
          createdAt: (cleanProduct as any).createdAt || new Date().toISOString(),
          id: uniqueSlug,
        } as Product;

        // Save to localStorage
        const localProductsKey = 'bazar_local_products_fallback';
        const existingProducts = localStorage.getItem(localProductsKey);
        const products = existingProducts ? JSON.parse(existingProducts) : [];
        products.push(productWithId);
        localStorage.setItem(localProductsKey, JSON.stringify(products));

        console.log('✅ Product saved to localStorage as fallback:', uniqueSlug);
        console.warn('⚠️ Product saved locally due to Firebase permissions issue. Product will be available but not synced to Firebase.');

        // Add a flag to indicate this was saved locally
        (productWithId as any)._savedLocally = true;

        return productWithId;
      } catch (localError) {
        console.error('❌ Error saving product to localStorage:', localError);
        throw new Error('فشل في إضافة المنتج. يرجى المحاولة مرة أخرى.');
      }
    }
  }

  // Update product
  async updateProduct(id: string, product: Partial<Product>): Promise<Product> {
    try {
      console.log(`Firebase: Updating product ${id} with data:`, product);
      const docRef = doc(db, this.collectionName, id);

      const normalizedProduct = this.replaceUndefinedWithNull(product);

      // Clean the product data by removing undefined values
      const cleanProduct = Object.fromEntries(
        Object.entries(normalizedProduct).filter(([_, value]) => value !== undefined)
      );

      // Convert dates to Firestore Timestamps
      const updateData: any = { ...cleanProduct };
      if ((cleanProduct as any).createdAt) {
        updateData.createdAt = Timestamp.fromDate(new Date((cleanProduct as any).createdAt));
      }
      if ((cleanProduct as any).offerEndsAt) {
        updateData.offerEndsAt = Timestamp.fromDate(new Date((cleanProduct as any).offerEndsAt));
      }
      if ((cleanProduct as any).expirationDate) {
        updateData.expirationDate = Timestamp.fromDate(new Date((cleanProduct as any).expirationDate));
      }

      console.log(`Firebase: Final update data:`, updateData);
      await updateDoc(docRef, updateData);
      console.log(`Firebase: Document updated successfully`);

      // Update Catalog Version Token for cache invalidation & ISR
      await this.updateCatalogVersion(['/', '/categories', `/product/${id}`]);

      // Immediately bust client-side cache
      this.invalidateProductsCache();

      const updatedProduct = await this.getProductById(id) as Product;
      console.log(`Firebase: Retrieved updated product:`, updatedProduct);
      return updatedProduct;
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  // Delete product
  async deleteProduct(id: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await deleteDoc(docRef);

      // Update Catalog Version Token for cache invalidation & ISR
      await this.updateCatalogVersion(['/', '/categories', `/product/${id}`]);

      // Immediately bust client-side cache
      this.invalidateProductsCache();
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  // ── Helper: Load cached catalog from localStorage ────────────────────────
  private _getCachedCatalog(): Product[] | null {
    if (typeof window === 'undefined') return null;
    try {
      const json = localStorage.getItem('cached_products');
      if (!json) return null;
      const parsed: Product[] = JSON.parse(json);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
    } catch {
      return null;
    }
  }

  // Get products by category (cache-first: filters local catalog → falls back to Firestore)
  async getProductsByCategory(categoryOrSlug: string): Promise<Product[]> {
    // ── L1/L2: Try filtering cached full catalog first (0 reads!) ─────────────
    if (typeof window !== 'undefined') {
      const catalog = this._getCachedCatalog();
      if (catalog) {
        const term = categoryOrSlug.toLowerCase();
        const filtered = catalog.filter(p =>
          (p as any).categorySlug?.toLowerCase() === term ||
          (p as any).category?.toLowerCase() === term
        );
        if (filtered.length > 0) {
          console.log(`⚡ [CatalogCache] getProductsByCategory "${categoryOrSlug}": ${filtered.length} products from cache (0 reads)`);
          filtered.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          });
          return filtered;
        }
      }
    }

    // ── L3: Firestore fallback (2 parallel queries, merged & deduplicated) ────
    try {
      const productsRef = collection(db, this.collectionName);
      const slugQuery = query(productsRef, where('categorySlug', '==', categoryOrSlug));
      const nameQuery = query(productsRef, where('category', '==', categoryOrSlug));

      const [slugSnapshot, nameSnapshot] = await Promise.all([
        getDocs(slugQuery),
        getDocs(nameQuery),
      ]);

      const seenIds = new Set<string>();
      const products: Product[] = [];

      const pushDoc = (docSnap: any) => {
        if (seenIds.has(docSnap.id)) return;
        seenIds.add(docSnap.id);
        const data = docSnap.data();
        products.push({
          ...data,
          id: docSnap.id,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          offerEndsAt: data.offerEndsAt?.toDate?.()?.toISOString() || data.offerEndsAt,
          expirationDate: data.expirationDate?.toDate?.()?.toISOString() || data.expirationDate,
        } as Product);
      };

      slugSnapshot.forEach(pushDoc);
      nameSnapshot.forEach(pushDoc);

      products.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      return products;
    } catch (error) {
      console.error('Error getting products by category:', error);
      throw error;
    }
  }

  // Get products by category + subcategory (cache-first: filters local catalog → falls back to Firestore)
  async getProductsByCategoryAndSubcategory(categoryOrSlug: string, subcategoryOrSlug: string): Promise<Product[]> {
    // ── L1/L2: Try filtering cached full catalog first (0 reads!) ─────────────
    if (typeof window !== 'undefined') {
      const catalog = this._getCachedCatalog();
      if (catalog) {
        const catTerm = categoryOrSlug.toLowerCase();
        const subTerm = subcategoryOrSlug.toLowerCase();
        const filtered = catalog.filter(p => {
          const catMatch =
            (p as any).categorySlug?.toLowerCase() === catTerm ||
            (p as any).category?.toLowerCase() === catTerm;
          const subMatch =
            (p as any).subcategorySlug?.toLowerCase() === subTerm ||
            (p as any).subcategory?.toLowerCase() === subTerm;
          return catMatch && subMatch;
        });
        if (filtered.length > 0) {
          console.log(`⚡ [CatalogCache] getProductsByCategoryAndSubcategory "${categoryOrSlug}/${subcategoryOrSlug}": ${filtered.length} products from cache (0 reads)`);
          filtered.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          });
          return filtered;
        }
      }
    }

    // ── L3: Firestore fallback (4 → now optimized to 2 parallel queries) ─────
    try {
      const productsRef = collection(db, this.collectionName);

      // Try slug-slug combination first, then name-slug, then slug-name, then name-name
      const queries = [
        query(productsRef, where('categorySlug', '==', categoryOrSlug), where('subcategorySlug', '==', subcategoryOrSlug)),
        query(productsRef, where('categorySlug', '==', categoryOrSlug), where('subcategory', '==', subcategoryOrSlug)),
        query(productsRef, where('category', '==', categoryOrSlug), where('subcategorySlug', '==', subcategoryOrSlug)),
        query(productsRef, where('category', '==', categoryOrSlug), where('subcategory', '==', subcategoryOrSlug)),
      ];

      const snapshots = await Promise.all(queries.map(q => getDocs(q)));

      const seenIds = new Set<string>();
      const products: Product[] = [];

      const pushDoc = (docSnap: any) => {
        if (seenIds.has(docSnap.id)) return;
        seenIds.add(docSnap.id);
        const data = docSnap.data();
        products.push({
          ...data,
          id: docSnap.id,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          offerEndsAt: data.offerEndsAt?.toDate?.()?.toISOString() || data.offerEndsAt,
          expirationDate: data.expirationDate?.toDate?.()?.toISOString() || data.expirationDate,
        } as Product);
      };

      snapshots.forEach(snapshot => snapshot.forEach(pushDoc));

      products.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      return products;
    } catch (error) {
      console.error('Error getting products by category and subcategory:', error);
      throw error;
    }
  }


  // ── Supplier / Shop Product Queries ────────────────────────────────────────

  /** Build a Product from a Firestore DocumentSnapshot */
  private docToProduct(d: any): Product {
    const data = d.data();
    return {
      ...data,
      id: d.id,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      offerEndsAt: data.offerEndsAt?.toDate?.()?.toISOString() || data.offerEndsAt,
      expirationDate: data.expirationDate?.toDate?.()?.toISOString() || data.expirationDate,
    } as Product;
  }

  /** Get all products belonging to a specific supplier (matched by name or id/slug) */
  async getProductsBySupplierSlug(supplierName: string): Promise<Product[]> {
    try {
      const ref = collection(db, this.collectionName);

      if (supplierName.toLowerCase() === 'bazar fashion' || supplierName === 'bazar-fashion' || supplierName === 'بازار للموضه') {
        const [snap1, snap2] = await Promise.all([
          getDocs(query(ref, where('wholesaleInfo.supplierName', '==', 'bazar fashion'))),
          getDocs(query(ref, where('supplierSlug', '==', 'bazar-fashion'))),
        ]);
        const map = new Map<string, Product>();
        snap1.forEach(d => map.set(d.id, this.docToProduct(d)));
        snap2.forEach(d => map.set(d.id, this.docToProduct(d)));
        const products = Array.from(map.values());
        products.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        return products;
      }

      const q = query(ref, where('wholesaleInfo.supplierName', '==', supplierName));
      const snap = await getDocs(q);
      const products: Product[] = [];
      snap.forEach(d => products.push(this.docToProduct(d)));
      products.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      return products;
    } catch (error) {
      console.error('Error getting products by supplier:', error);
      throw error;
    }
  }

  /** Get products of a supplier filtered by category directly from Firestore */
  async getProductsBySupplierAndCategory(supplierName: string, categoryOrSlug: string): Promise<Product[]> {
    try {
      const ref = collection(db, this.collectionName);
      let q = query(
        ref,
        where('wholesaleInfo.supplierName', '==', supplierName),
        where('categorySlug', '==', categoryOrSlug)
      );
      let snap = await getDocs(q);

      if (snap.empty) {
        q = query(
          ref,
          where('wholesaleInfo.supplierName', '==', supplierName),
          where('category', '==', categoryOrSlug)
        );
        snap = await getDocs(q);
      }

      const products: Product[] = [];
      snap.forEach(d => {
        const prod = this.docToProduct(d);
        if (!prod.isArchived) products.push(prod);
      });
      return products;
    } catch (error) {
      console.error('Error getting products by supplier and category:', error);
      const allSupplierProducts = await this.getProductsBySupplierSlug(supplierName);
      return allSupplierProducts.filter(p =>
        (p.category === categoryOrSlug || p.categorySlug === categoryOrSlug) && !p.isArchived
      );
    }
  }

  /** Get products of a supplier filtered by category and subcategory */
  async getProductsBySupplierCategorySubcategory(supplierName: string, categoryOrSlug: string, subcategoryOrSlug: string): Promise<Product[]> {
    try {
      const catProducts = await this.getProductsBySupplierAndCategory(supplierName, categoryOrSlug);
      return catProducts.filter(p =>
        p.subcategory === subcategoryOrSlug || p.subcategorySlug === subcategoryOrSlug
      );
    } catch (error) {
      console.error('Error getting products by supplier, category, subcategory:', error);
      throw error;
    }
  }

  // Get active products (not archived)
  async getActiveProducts(): Promise<Product[]> {
    try {
      const productsRef = collection(db, this.collectionName);
      const q = query(
        productsRef,
        where('isArchived', '==', false)
      );
      const querySnapshot = await getDocs(q);

      const products: Product[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        products.push({
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          offerEndsAt: data.offerEndsAt?.toDate?.()?.toISOString() || data.offerEndsAt,
          expirationDate: data.expirationDate?.toDate?.()?.toISOString() || data.expirationDate,
        } as Product);
      });

      // Sort by createdAt desc to avoid composite index requirement
      products.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      return products;
    } catch (error) {
      console.error('Error getting active products:', error);
      throw error;
    }
  }

  // Search products
  async searchProducts(searchTerm: string): Promise<Product[]> {
    try {
      const productsRef = collection(db, this.collectionName);
      const q = query(productsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      const products: Product[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const product = {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          offerEndsAt: data.offerEndsAt?.toDate?.()?.toISOString() || data.offerEndsAt,
          expirationDate: data.expirationDate?.toDate?.()?.toISOString() || data.expirationDate,
        } as Product;

        // Filter by search term
        if (
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.description.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          products.push(product);
        }
      });

      return products;
    } catch (error) {
      console.error('Error searching products:', error);
      throw error;
    }
  }
}

// Create and export the products service instance
export const productsService = new FirebaseProductsService();
export const getCatalogVersion = () => productsService.getCatalogVersion();
export const updateCatalogVersion = () => productsService.updateCatalogVersion();

// Check if tracking is globally enabled
export const isTrackingEnabled = async (): Promise<boolean> => {
  try {
    const snap = await getDoc(doc(db, "admin_config", "settings"));
    if (snap.exists()) {
      return snap.data().trackingEnabled !== false;
    }
    return true;
  } catch (error) {
    console.error("Error checking tracking status:", error);
    return true; // Default to true on error
  }
};

// Firebase Sales Service
export interface CashierSale {
  id: string;
  items: {
    product: {
      id: string;
      name: string;
      price: number;
      wholesaleInfo?: {
        purchasePrice: number;
        quantity: number;
      };
    };
    quantity: number;
    selectedSize?: {
      id: string;
      label: string;
      price: number;
    };
    selectedAddons: {
      id: string;
      label: string;
      price_delta: number;
    }[];
    unitFinalPrice: number;
    totalPrice: number;
  }[];
  totalAmount: number;
  timestamp: Date;
  customerName?: string;
  customerPhone?: string;
  paymentMethod?: 'vodafone_cash' | 'instaPay' | 'cash';
}

export class FirebaseSalesService {
  private collectionName = 'cashier-sales';

  // Get all sales
  async getAllSales(): Promise<CashierSale[]> {
    try {
      const salesRef = collection(db, this.collectionName);
      const q = query(salesRef, orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);

      const sales: CashierSale[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        sales.push({
          ...data,
          id: doc.id,
          timestamp: data.timestamp?.toDate?.() || new Date(data.timestamp),
        } as CashierSale);
      });

      return sales;
    } catch (error) {
      console.error('Error getting sales:', error);
      throw error;
    }
  }

  // Add new sale
  async addSale(sale: Omit<CashierSale, 'id'>): Promise<CashierSale> {
    try {
      const trackingEnabled = await isTrackingEnabled();
      if (!trackingEnabled) {
        console.warn('⚠️ Tracking is manually disabled. Skipping Firebase write for cashier sale.');
        throw new Error('Tracking manually disabled'); // Throw error to trigger Cashier's localStorage backup
      }

      const salesRef = collection(db, this.collectionName);

      // Convert timestamp to Firestore Timestamp
      const saleData = {
        ...sale,
        timestamp: Timestamp.fromDate(sale.timestamp),
      };

      const docRef = await addDoc(salesRef, saleData);

      return {
        ...sale,
        id: docRef.id,
      } as CashierSale;
    } catch (error) {
      console.error('Error adding sale:', error);
      throw error;
    }
  }

  // Get sales by date range
  async getSalesByDateRange(startDate: Date, endDate: Date): Promise<CashierSale[]> {
    try {
      const salesRef = collection(db, this.collectionName);
      const q = query(
        salesRef,
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        where('timestamp', '<=', Timestamp.fromDate(endDate)),
        orderBy('timestamp', 'desc')
      );
      const querySnapshot = await getDocs(q);

      const sales: CashierSale[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        sales.push({
          ...data,
          id: doc.id,
          timestamp: data.timestamp?.toDate?.() || new Date(data.timestamp),
        } as CashierSale);
      });

      return sales;
    } catch (error) {
      console.error('Error getting sales by date range:', error);
      throw error;
    }
  }

  // Delete sale
  async deleteSale(id: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting sale:', error);
      throw error;
    }
  }

  // Clear all sales
  async clearAllSales(): Promise<void> {
    try {
      const salesRef = collection(db, this.collectionName);
      const querySnapshot = await getDocs(salesRef);

      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error clearing all sales:', error);
      throw error;
    }
  }
}

// Create and export the sales service instance
export const salesService = new FirebaseSalesService();

// Atomic quantity update interface
interface QuantityUpdate {
  productId: string;
  quantityToDeduct: number;
}

// Atomic quantity restore interface
interface QuantityRestore {
  productId: string;
  quantityToRestore: number;
}

// Atomic quantity update function for preventing race conditions
export const updateProductQuantitiesAtomically = async (updates: QuantityUpdate[]): Promise<void> => {
  return runTransaction(db, async (transaction) => {
    // First, read all product documents
    const productDocs = await Promise.all(
      updates.map(update => {
        const productRef = doc(db, 'products', update.productId);
        return transaction.get(productRef);
      })
    );

    // Check if all products exist and have sufficient quantities
    const updatedQuantities: { [key: string]: number } = {};

    for (let i = 0; i < updates.length; i++) {
      const update = updates[i];
      const productDoc = productDocs[i];

      if (!productDoc.exists()) {
        throw new Error(`المنتج ${update.productId} غير موجود`);
      }

      const productData = productDoc.data() as Product;
      const currentQuantity = productData.wholesaleInfo?.quantity || 0;
      const newQuantity = Math.max(0, currentQuantity - update.quantityToDeduct);

      if (currentQuantity < update.quantityToDeduct) {
        console.warn(`تحذير: الكمية المطلوبة (${update.quantityToDeduct}) أكبر من المتوفر (${currentQuantity}) للمنتج ${productData.name}`);
      }

      updatedQuantities[update.productId] = newQuantity;
    }

    // Now update all products atomically
    for (let i = 0; i < updates.length; i++) {
      const update = updates[i];
      const productDoc = productDocs[i];
      const productData = productDoc.data() as Product;
      const newQuantity = updatedQuantities[update.productId];

      const productRef = doc(db, 'products', update.productId);
      transaction.update(productRef, {
        'wholesaleInfo.quantity': newQuantity
      });

      console.log(`Transaction: تحديث المنتج ${productData.name} من ${productData.wholesaleInfo?.quantity || 0} إلى ${newQuantity}`);
    }
  });
};

// Atomic quantity restore function for restoring quantities back to products
export const restoreProductQuantitiesAtomically = async (restores: QuantityRestore[]): Promise<void> => {
  return runTransaction(db, async (transaction) => {
    // First, read all product documents
    const productDocs = await Promise.all(
      restores.map(restore => {
        const productRef = doc(db, 'products', restore.productId);
        return transaction.get(productRef);
      })
    );

    // Check if all products exist and calculate new quantities
    const updatedQuantities: { [key: string]: number } = {};

    for (let i = 0; i < restores.length; i++) {
      const restore = restores[i];
      const productDoc = productDocs[i];

      if (!productDoc.exists()) {
        throw new Error(`المنتج ${restore.productId} غير موجود`);
      }

      const productData = productDoc.data() as Product;
      const currentQuantity = productData.wholesaleInfo?.quantity || 0;
      const newQuantity = currentQuantity + restore.quantityToRestore;

      updatedQuantities[restore.productId] = newQuantity;
    }

    // Now update all products atomically
    for (let i = 0; i < restores.length; i++) {
      const restore = restores[i];
      const productDoc = productDocs[i];
      const productData = productDoc.data() as Product;
      const newQuantity = updatedQuantities[restore.productId];

      const productRef = doc(db, 'products', restore.productId);
      transaction.update(productRef, {
        'wholesaleInfo.quantity': newQuantity
      });

      console.log(`Transaction: استعادة المنتج ${productData.name} من ${productData.wholesaleInfo?.quantity || 0} إلى ${newQuantity}`);
    }
  });
};

// Create an order document and update product quantities atomically in a single
// Firestore transaction. This prevents races where orders are created but stock
// isn't deducted (or vice versa).
export const createOrderAndUpdateProductQuantitiesAtomically = async (
  orderPayload: any,
  quantityUpdates: QuantityUpdate[]
): Promise<{ orderId: string }> => {
  return runTransaction(db, async (transaction) => {
    // Create a new order doc with an auto-generated ID
    const ordersRef = collection(db, 'orders');
    const newOrderRef = doc(ordersRef); // create a DocumentReference with auto ID

    // Read product docs to validate and compute new quantities
    const productDocs = await Promise.all(
      quantityUpdates.map(u => transaction.get(doc(db, 'products', u.productId)))
    );

    for (let i = 0; i < quantityUpdates.length; i++) {
      const update = quantityUpdates[i];
      const productDoc = productDocs[i];
      if (!productDoc.exists()) {
        throw new Error(`المنتج ${update.productId} غير موجود`);
      }

      const productData = productDoc.data() as Product;
      const currentQuantity = productData.wholesaleInfo?.quantity || 0;

      if (currentQuantity < update.quantityToDeduct) {
        throw new Error(`عذراً، الكمية المتوفرة للمنتج ${productData.name} هي ${currentQuantity}، ولكن طلبت ${update.quantityToDeduct}`);
      }

      const newQuantity = currentQuantity - update.quantityToDeduct;

      // Update product quantity in transaction
      transaction.update(doc(db, 'products', update.productId), {
        'wholesaleInfo.quantity': newQuantity
      });
    }

    // Write the order document
    transaction.set(newOrderRef, {
      ...orderPayload,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    console.log('✅ Transaction: Order created with ID:', newOrderRef.id);
    console.log('✅ Transaction: Product quantities updated for', quantityUpdates.length, 'products');

    return { orderId: newOrderRef.id };
  });
};

// Firebase Employees Service
export class FirebaseEmployeesService {
  private collectionName = 'employees';

  // Get all employees
  async getAllEmployees(): Promise<Employee[]> {
    try {
      const employeesRef = collection(db, this.collectionName);
      const q = query(employeesRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      const employees: Employee[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        employees.push({
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        } as Employee);
      });

      return employees;
    } catch (error) {
      console.error('Error getting employees:', error);
      throw error;
    }
  }

  // Get employee by ID
  async getEmployeeById(id: string): Promise<Employee | null> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          ...data,
          id: docSnap.id,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        } as Employee;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting employee:', error);
      throw error;
    }
  }

  // Add new employee
  async addEmployee(employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Promise<Employee> {
    try {
      const employeesRef = collection(db, this.collectionName);

      const employeeData = {
        ...employee,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = await addDoc(employeesRef, employeeData);

      return {
        ...employee,
        id: docRef.id,
        createdAt: employeeData.createdAt.toDate().toISOString(),
        updatedAt: employeeData.updatedAt.toDate().toISOString(),
      } as Employee;
    } catch (error) {
      console.error('Error adding employee:', error);
      throw error;
    }
  }

  // Update employee
  async updateEmployee(id: string, employee: Partial<Employee>): Promise<Employee> {
    try {
      const docRef = doc(db, this.collectionName, id);

      const updateData: any = { ...employee };
      delete updateData.id;
      delete updateData.createdAt;
      updateData.updatedAt = Timestamp.now();

      await updateDoc(docRef, updateData);

      const updatedEmployee = await this.getEmployeeById(id) as Employee;
      return updatedEmployee;
    } catch (error) {
      console.error('Error updating employee:', error);
      throw error;
    }
  }

  // Delete employee
  async deleteEmployee(id: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting employee:', error);
      throw error;
    }
  }
}

// Create and export the employees service instance
export const employeesService = new FirebaseEmployeesService();

// Firebase Attendance Service
export class FirebaseAttendanceService {
  private collectionName = 'attendance';
  private advancesCollectionName = 'salary_advances';
  private summaryCollectionName = 'attendance_summaries';

  private getSummaryDocId(employeeId: string, month: string) {
    return `${employeeId}_${month}`;
  }

  private mapRecord(docId: string, data: any): AttendanceRecord {
    const status: AttendanceStatus = (data.status as AttendanceStatus) || (data.checkInTime ? 'present' : 'absent');
    const storedExcuseStatus = (data.excuseStatus as ExcuseStatus | 'approved') || 'rejected';
    const excuseStatus: ExcuseStatus =
      storedExcuseStatus === 'approved' ? 'accepted' : storedExcuseStatus;
    const normalizedDailyNet =
      typeof data.dailyNet === 'number'
        ? data.dailyNet
        : (data.overtimeAmount ?? 0) - (data.deductionAmount ?? 0);

    return {
      ...data,
      id: docId,
      status,
      excuseStatus,
      notes: data.notes ?? null,
      excuseNote: data.excuseNote ?? null,
      excuseResolution: (data.excuseResolution as 'no_deduct' | 'hourly' | null) ?? null,
      dailyWage: typeof data.dailyWage === 'number' ? data.dailyWage : 0,
      dailyNet: normalizedDailyNet,
      excusedAbsencePolicy:
        (data.excusedAbsencePolicy as ExcusedAbsencePolicy) ||
        DEFAULT_ATTENDANCE_SETTINGS.excusedAbsencePolicy,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
    } as AttendanceRecord;
  }

  private calculateBaseImpact(
    status: AttendanceStatus,
    dailyWage: number,
    policy: ExcusedAbsencePolicy,
    excuseStatus?: ExcuseStatus
  ): number {
    if (status === 'present') return dailyWage;
    if (status === 'absent') return -dailyWage;
    if (status === 'absent_excused') {
      if (excuseStatus === 'rejected') return -dailyWage;
      if (excuseStatus === 'accepted') return 0;
      // Pending review should not affect salary yet
      return 0;
    }
    return policy === 'deduct' ? -dailyWage : 0;
  }

  // Get all attendance records
  async getAllAttendanceRecords(): Promise<AttendanceRecord[]> {
    try {
      const attendanceRef = collection(db, this.collectionName);
      const q = query(attendanceRef, orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);

      const records: AttendanceRecord[] = [];
      querySnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        records.push(this.mapRecord(docSnapshot.id, data));
      });

      return records;
    } catch (error) {
      console.error('Error getting attendance records:', error);
      throw error;
    }
  }

  // Get attendance records by employee
  async getAttendanceRecordsByEmployee(employeeId: string): Promise<AttendanceRecord[]> {
    try {
      const attendanceRef = collection(db, this.collectionName);
      // Use only where clause to avoid index requirement, then sort in memory
      const q = query(
        attendanceRef,
        where('employeeId', '==', employeeId)
      );
      const querySnapshot = await getDocs(q);

      const records: AttendanceRecord[] = [];
      querySnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        records.push(this.mapRecord(docSnapshot.id, data));
      });

      // Sort by date descending in memory (newest first)
      records.sort((a, b) => {
        if (a.date > b.date) return -1;
        if (a.date < b.date) return 1;
        return 0;
      });

      return records;
    } catch (error) {
      console.error('Error getting attendance records by employee:', error);
      throw error;
    }
  }

  // Get attendance records by date range
  async getAttendanceRecordsByDateRange(startDate: string, endDate: string): Promise<AttendanceRecord[]> {
    try {
      const attendanceRef = collection(db, this.collectionName);
      const q = query(
        attendanceRef,
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'desc')
      );
      const querySnapshot = await getDocs(q);

      const records: AttendanceRecord[] = [];
      querySnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        records.push(this.mapRecord(docSnapshot.id, data));
      });

      return records;
    } catch (error) {
      console.error('Error getting attendance records by date range:', error);
      throw error;
    }
  }

  // Get attendance record by employee and date
  async getAttendanceRecordByEmployeeAndDate(employeeId: string, date: string): Promise<AttendanceRecord | null> {
    try {
      const attendanceRef = collection(db, this.collectionName);
      const q = query(
        attendanceRef,
        where('employeeId', '==', employeeId),
        where('date', '==', date)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return this.mapRecord(doc.id, data);
    } catch (error) {
      console.error('Error getting attendance record:', error);
      throw error;
    }
  }

  // Add salary advance
  async addSalaryAdvance(
    employee: Employee,
    payload: { amount: number; month: string; note?: string | null }
  ): Promise<SalaryAdvance> {
    try {
      const docRef = await addDoc(collection(db, this.advancesCollectionName), {
        employeeId: employee.id,
        employeeName: employee.name,
        month: payload.month,
        amount: payload.amount,
        note: payload.note || null,
        createdAt: Timestamp.now(),
      });

      return {
        id: docRef.id,
        employeeId: employee.id,
        employeeName: employee.name,
        month: payload.month,
        amount: payload.amount,
        note: payload.note || null,
        createdAt: Timestamp.now().toDate().toISOString(),
      };
    } catch (error) {
      console.error('Error adding salary advance:', error);
      throw error;
    }
  }

  // Get salary advances for an employee and month
  async getSalaryAdvances(employeeId: string, month: string): Promise<SalaryAdvance[]> {
    try {
      const advancesRef = collection(db, this.advancesCollectionName);
      const q = query(
        advancesRef,
        where('employeeId', '==', employeeId),
        where('month', '==', month)
      );
      const snap = await getDocs(q);
      const advances: SalaryAdvance[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        advances.push({
          id: docSnap.id,
          employeeId: data.employeeId,
          employeeName: data.employeeName,
          month: data.month,
          amount: data.amount,
          note: data.note || null,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        });
      });
      advances.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      return advances;
    } catch (error) {
      console.error('Error getting salary advances:', error);
      throw error;
    }
  }

  // Get salary advances for a month (optionally filtered by employee)
  async getSalaryAdvancesByMonth(month: string, employeeId?: string): Promise<SalaryAdvance[]> {
    try {
      const advancesRef = collection(db, this.advancesCollectionName);
      const constraints = [
        where('month', '==', month),
        ...(employeeId ? [where('employeeId', '==', employeeId)] : []),
      ];
      const q = query(advancesRef, ...constraints);
      const snap = await getDocs(q);
      const advances: SalaryAdvance[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        advances.push({
          id: docSnap.id,
          employeeId: data.employeeId,
          employeeName: data.employeeName,
          month: data.month,
          amount: data.amount,
          note: data.note || null,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        });
      });
      advances.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      return advances;
    } catch (error) {
      console.error('Error getting salary advances by month:', error);
      throw error;
    }
  }

  // Delete salary advance
  async deleteSalaryAdvance(id: string): Promise<void> {
    try {
      const docRef = doc(db, this.advancesCollectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting salary advance:', error);
      throw error;
    }
  }

  // Add or update attendance record
  async addOrUpdateAttendanceRecord(
    employee: Employee,
    payload: {
      date: string;
      status: AttendanceStatus;
      checkInTime?: string | null;
      checkOutTime?: string | null;
      excuseText?: string | null;
      notes?: string | null;
      settings?: AttendanceSettings | null;
    }
  ): Promise<AttendanceRecord> {
    try {
      const {
        date,
        status,
        checkInTime,
        checkOutTime,
        excuseText,
        notes,
        settings,
      } = payload;

      // Check if record exists
      const existingRecord = await this.getAttendanceRecordByEmployeeAndDate(employee.id, date);

      const normalizedStatus: AttendanceStatus =
        status || (checkInTime ? 'present' : 'absent');
      const effectiveSettings = settings || DEFAULT_ATTENDANCE_SETTINGS;
      const dailyWage = getEmployeeDailyWage(employee);
      const effectiveCheckIn = normalizedStatus === 'present' ? checkInTime || null : null;
      const effectiveCheckOut = normalizedStatus === 'present' ? checkOutTime || null : null;

      const delayMinutes =
        normalizedStatus === 'present' && effectiveCheckIn
          ? calculateDelay(effectiveCheckIn, employee.workingHours)
          : 0;
      const hasExcuse = normalizedStatus === 'absent_excused' || !!excuseText;
      const existingWasExcused = existingRecord?.status === 'absent_excused';
      let excuseStatus: ExcuseStatus;
      let excuseResolution: 'no_deduct' | 'hourly' | null =
        existingRecord?.excuseResolution ?? null;

      if (existingRecord) {
        excuseStatus = existingRecord.excuseStatus;

        if (!hasExcuse) {
          excuseStatus = 'rejected';
          excuseResolution = null;
        } else if (!existingRecord.hasExcuse && hasExcuse) {
          excuseStatus = 'pending';
          excuseResolution = null;
        } else if (normalizedStatus === 'absent_excused' && !existingWasExcused) {
          excuseStatus = 'pending';
          excuseResolution = null;
        }
      } else {
        excuseStatus = hasExcuse ? 'pending' : 'rejected';
        excuseResolution = null;
      }

      const shouldApplyDelayDeduction =
        normalizedStatus === 'present' ||
        (normalizedStatus === 'absent_excused' &&
          excuseStatus === 'accepted' &&
          excuseResolution === 'hourly');

      const deduction = shouldApplyDelayDeduction
        ? calculateDelayDeduction(
          delayMinutes,
          excuseStatus,
          employee.monthlySalary,
          employee.monthlyWorkingHours,
          dailyWage
        )
        : { type: 'none' as const, amount: 0 };

      // Calculate overtime
      const overtime =
        normalizedStatus === 'present'
          ? calculateOvertime(
            effectiveCheckIn,
            effectiveCheckOut,
            employee.workingHours,
            employee.monthlySalary,
            employee.monthlyWorkingHours
          )
          : { hours: 0, amount: 0 };

      // Calculate daily net
      const baseImpact = this.calculateBaseImpact(
        normalizedStatus,
        dailyWage,
        effectiveSettings.excusedAbsencePolicy,
        excuseStatus
      );
      const dailyNet = baseImpact - deduction.amount + overtime.amount;

      const recordData: Omit<AttendanceRecord, 'id' | 'createdAt' | 'updatedAt'> = {
        employeeId: employee.id,
        employeeName: employee.name,
        date,
        checkInTime: effectiveCheckIn,
        checkOutTime: effectiveCheckOut,
        status: normalizedStatus,
        delayMinutes,
        hasExcuse,
        excuseText: excuseText || null,
        excuseStatus,
        deductionType: deduction.type,
        deductionAmount: deduction.amount,
        overtimeHours: overtime.hours,
        overtimeAmount: overtime.amount,
        dailyWage,
        dailyNet,
        excusedAbsencePolicy: effectiveSettings.excusedAbsencePolicy,
        excuseResolution,
        excuseNote: existingRecord?.excuseNote || null,
        notes: notes || null,
      };

      if (existingRecord) {
        // Update existing record
        const docRef = doc(db, this.collectionName, existingRecord.id);
        const payload = {
          ...recordData,
          updatedAt: Timestamp.now(),
        };
        await updateDoc(docRef, payload);

        return {
          ...recordData,
          id: existingRecord.id,
          createdAt: existingRecord.createdAt,
          updatedAt: Timestamp.now().toDate().toISOString(),
        } as AttendanceRecord;
      } else {
        // Create new record
        const attendanceRef = collection(db, this.collectionName);
        const docRef = await addDoc(attendanceRef, {
          ...recordData,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });

        return {
          ...recordData,
          id: docRef.id,
          createdAt: Timestamp.now().toDate().toISOString(),
          updatedAt: Timestamp.now().toDate().toISOString(),
        } as AttendanceRecord;
      }
    } catch (error) {
      console.error('Error adding/updating attendance record:', error);
      throw error;
    }
  }

  // Update excuse status
  async updateExcuseStatus(
    recordId: string,
    status: ExcuseStatus,
    employee: Employee,
    note?: string | null,
    resolution?: 'no_deduct' | 'hourly' | null
  ): Promise<AttendanceRecord> {
    try {
      const docRef = doc(db, this.collectionName, recordId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Attendance record not found');
      }

      const data = docSnap.data() as AttendanceRecord;
      const currentStatus: AttendanceStatus =
        (data.status as AttendanceStatus) || (data.checkInTime ? 'present' : 'absent');
      const dailyWage =
        typeof (data as any).dailyWage === 'number'
          ? data.dailyWage
          : getEmployeeDailyWage(employee);
      const policy: ExcusedAbsencePolicy =
        (data.excusedAbsencePolicy as ExcusedAbsencePolicy) ||
        DEFAULT_ATTENDANCE_SETTINGS.excusedAbsencePolicy;

      let nextResolution: 'no_deduct' | 'hourly' | null =
        typeof resolution !== 'undefined' ? resolution : data.excuseResolution || null;

      if (status !== 'accepted') {
        nextResolution = null;
      } else if (!nextResolution) {
        nextResolution = 'hourly';
      }

      let deduction = { type: 'none' as DeductionType, amount: 0 };
      if (currentStatus === 'present') {
        deduction = calculateDelayDeduction(
          data.delayMinutes,
          status,
          employee.monthlySalary,
          employee.monthlyWorkingHours,
          dailyWage
        );
      } else if (
        currentStatus === 'absent_excused' &&
        status === 'accepted' &&
        nextResolution === 'hourly' &&
        data.delayMinutes > 0
      ) {
        deduction = calculateDelayDeduction(
          data.delayMinutes,
          status,
          employee.monthlySalary,
          employee.monthlyWorkingHours,
          dailyWage
        );
      }

      if (status === 'accepted' && nextResolution === 'no_deduct') {
        deduction = { type: 'none', amount: 0 };
      }

      // Calculate daily net again
      const baseImpact = this.calculateBaseImpact(
        currentStatus,
        dailyWage,
        policy,
        status
      );
      const dailyNet = baseImpact - deduction.amount + (data.overtimeAmount || 0);

      const resolvedNote =
        typeof note === 'undefined'
          ? data.excuseNote ?? null
          : typeof note === 'string' && note.trim().length > 0
            ? note.trim()
            : null;

      await updateDoc(docRef, {
        excuseStatus: status,
        excuseNote: resolvedNote,
        excuseResolution: nextResolution,
        deductionType: deduction.type,
        deductionAmount: deduction.amount,
        dailyWage,
        excusedAbsencePolicy: policy,
        dailyNet,
        updatedAt: Timestamp.now(),
      });

      const updatedRecord = await this.getAttendanceRecordByEmployeeAndDate(employee.id, data.date) as AttendanceRecord;
      return updatedRecord;
    } catch (error) {
      console.error('Error updating excuse status:', error);
      throw error;
    }
  }

  // Get monthly summary for an employee
  async getMonthlySummary(employeeId: string, month: string): Promise<MonthlySummary | null> {
    try {
      const employee = await employeesService.getEmployeeById(employeeId);
      if (!employee) {
        return null;
      }

      // Get all records for the month
      const startDate = `${month}-01`;
      const endDate = `${month}-31`;
      const records = await this.getAttendanceRecordsByDateRange(startDate, endDate);
      const employeeRecords = records.filter(r => r.employeeId === employeeId);

      const hasDailyWageData = employeeRecords.some(record => record.dailyWage && record.dailyWage > 0);

      if (!hasDailyWageData) {
        let totalDeductions = 0;
        let totalOvertime = 0;
        let attendanceDays = 0;
        let absentDays = 0;
        let totalDelayMinutes = 0;
        let pendingExcuses = 0;
        let acceptedExcuses = 0;
        let rejectedExcuses = 0;

        employeeRecords.forEach(record => {
          if (record.checkInTime) {
            attendanceDays++;
            totalDeductions += record.deductionAmount;
            totalOvertime += record.overtimeAmount;
            totalDelayMinutes += record.delayMinutes;

            if (record.excuseStatus === 'pending') pendingExcuses++;
            else if (record.excuseStatus === 'accepted') acceptedExcuses++;
            else if (record.excuseStatus === 'rejected') rejectedExcuses++;
          } else {
            absentDays++;
          }
        });

        const finalSalary = employee.monthlySalary - totalDeductions + totalOvertime;
        const advances = await this.getSalaryAdvances(employeeId, month);
        const totalAdvances = advances.reduce((sum, adv) => sum + (adv.amount || 0), 0);
        const netSalaryAfterAdvances = finalSalary - totalAdvances;

        return {
          employeeId,
          employeeName: employee.name,
          month,
          baseSalary: employee.monthlySalary,
          totalDeductions,
          totalOvertime,
          finalSalary,
          totalAdvances,
          netSalaryAfterAdvances,
          attendanceDays,
          absentDays,
          excusedAbsentDays: 0,
          recordedDays: employeeRecords.length,
          totalDelayMinutes,
          pendingExcuses,
          acceptedExcuses,
          rejectedExcuses,
        };
      }

      let totalDeductions = 0;
      let totalOvertime = 0;
      let presentDays = 0;
      let absentDays = 0;
      let excusedAbsentDays = 0;
      let totalDelayMinutes = 0;
      let pendingExcuses = 0;
      let acceptedExcuses = 0;
      let rejectedExcuses = 0;
      let finalSalary = 0;
      let totalAdvances = 0;

      employeeRecords.forEach(record => {
        finalSalary += record.dailyNet || 0;

        if (record.status === 'present') {
          presentDays++;
          totalDeductions += record.deductionAmount;
          totalOvertime += record.overtimeAmount;
          totalDelayMinutes += record.delayMinutes;
        } else if (record.status === 'absent') {
          absentDays++;
          totalDeductions += record.dailyWage;
        } else if (record.status === 'absent_excused') {
          if (record.excuseStatus === 'accepted') {
            excusedAbsentDays++;
          } else if (record.excuseStatus === 'rejected') {
            absentDays++;
            totalDeductions += record.dailyWage;
          }
        }

        if (record.hasExcuse) {
          if (record.excuseStatus === 'pending') pendingExcuses++;
          else if (record.excuseStatus === 'accepted') acceptedExcuses++;
          else if (record.excuseStatus === 'rejected') rejectedExcuses++;
        }
      });

      const advances = await this.getSalaryAdvances(employeeId, month);
      totalAdvances = advances.reduce((sum, adv) => sum + (adv.amount || 0), 0);
      const netSalaryAfterAdvances = finalSalary - totalAdvances;

      return {
        employeeId,
        employeeName: employee.name,
        month,
        baseSalary: employee.monthlySalary,
        totalDeductions,
        totalOvertime,
        finalSalary,
        totalAdvances,
        netSalaryAfterAdvances,
        attendanceDays: presentDays,
        absentDays,
        excusedAbsentDays,
        recordedDays: employeeRecords.length,
        totalDelayMinutes,
        pendingExcuses,
        acceptedExcuses,
        rejectedExcuses,
      };
    } catch (error) {
      console.error('Error getting monthly summary:', error);
      throw error;
    }
  }

  private async getMonthlySummaryFromArchive(employeeId: string, month: string): Promise<MonthlySummary | null> {
    try {
      const docId = this.getSummaryDocId(employeeId, month);
      const docRef = doc(db, this.summaryCollectionName, docId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      return {
        ...(data as MonthlySummary),
        generatedAt: data.generatedAt?.toDate?.()?.toISOString() || data.generatedAt,
      };
    } catch (error) {
      console.error('Error getting archived summary:', error);
      throw error;
    }
  }

  async saveMonthlySummary(employeeId: string, month: string): Promise<void> {
    try {
      const summary = await this.getMonthlySummary(employeeId, month);
      if (!summary) return;

      const docId = this.getSummaryDocId(employeeId, month);
      const docRef = doc(db, this.summaryCollectionName, docId);
      await setDoc(docRef, {
        ...summary,
        generatedAt: Timestamp.now(),
      }, { merge: true });
    } catch (error) {
      console.error('Error saving monthly summary:', error);
      throw error;
    }
  }

  async getMonthlySummaryWithArchive(employeeId: string, month: string): Promise<MonthlySummary | null> {
    try {
      const liveSummary = await this.getMonthlySummary(employeeId, month);
      const currentMonth = new Date().toISOString().slice(0, 7);

      if (
        liveSummary &&
        (
          month === currentMonth ||
          (liveSummary.recordedDays ?? 0) > 0
        )
      ) {
        return liveSummary;
      }

      const archived = await this.getMonthlySummaryFromArchive(employeeId, month);
      return archived || liveSummary;
    } catch (error) {
      console.error('Error getting monthly summary with archive:', error);
      throw error;
    }
  }

  // Delete attendance record
  async deleteAttendanceRecord(id: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting attendance record:', error);
      throw error;
    }
  }
}

// Create and export the attendance service instance
export const attendanceService = new FirebaseAttendanceService();

export class FirebaseAttendanceSettingsService {
  private collectionName = 'attendance_settings';
  private docId = 'general';

  async getSettings(): Promise<AttendanceSettings> {
    try {
      const docRef = doc(db, this.collectionName, this.docId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        await setDoc(docRef, DEFAULT_ATTENDANCE_SETTINGS);
        return DEFAULT_ATTENDANCE_SETTINGS;
      }

      const data = docSnap.data() as Partial<AttendanceSettings>;
      return {
        ...DEFAULT_ATTENDANCE_SETTINGS,
        ...data,
      };
    } catch (error) {
      console.error('Error getting attendance settings:', error);
      return DEFAULT_ATTENDANCE_SETTINGS;
    }
  }

  async updateSettings(update: Partial<AttendanceSettings>): Promise<AttendanceSettings> {
    try {
      const docRef = doc(db, this.collectionName, this.docId);
      await setDoc(docRef, update, { merge: true });
      return this.getSettings();
    } catch (error) {
      console.error('Error updating attendance settings:', error);
      throw error;
    }
  }
}

export interface DeleteAnalyticsOptions {
  period: 'all' | '7' | '30' | '60' | '90' | 'custom';
  fromDate?: string;
  toDate?: string;
}

// Add function to clear analytics data with optional period filtering
export const clearAnalyticsDataByPeriod = async (options: DeleteAnalyticsOptions): Promise<void> => {
  try {
    const { period, fromDate, toDate } = options;

    if (period === 'all' && !fromDate && !toDate) {
      return await clearAllAnalyticsData();
    }

    let startDate: Date | null = null;
    let endDate: Date | null = null;

    const now = new Date();
    if (period === '7') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === '30') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (period === '60') {
      startDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    } else if (period === '90') {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else if (period === 'custom') {
      if (fromDate) {
        startDate = new Date(fromDate);
        startDate.setHours(0, 0, 0, 0);
      }
      if (toDate) {
        endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
      }
    }

    const collectionsToProcess = ['page_views', 'visitor_sessions', 'page_interactions', 'daily_stats'];

    for (const collName of collectionsToProcess) {
      const collRef = collection(db, collName);
      const snap = await getDocs(collRef);

      const docsToDelete: any[] = [];

      snap.forEach(docSnap => {
        const data = docSnap.data();
        let itemDate: Date | null = null;

        if (collName === 'daily_stats') {
          const dateStr = data.date || docSnap.id;
          if (dateStr && typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            itemDate = new Date(dateStr);
          }
        }

        if (!itemDate) {
          const rawTime = data.timestamp || data.startTime || data.createdAt || data.lastActive;
          if (rawTime) {
            if (rawTime.toDate && typeof rawTime.toDate === 'function') {
              itemDate = rawTime.toDate();
            } else if (rawTime instanceof Date) {
              itemDate = rawTime;
            } else if (typeof rawTime === 'string' || typeof rawTime === 'number') {
              itemDate = new Date(rawTime);
            }
          }
        }

        if (itemDate && !isNaN(itemDate.getTime())) {
          let matches = true;
          if (startDate && itemDate < startDate) matches = false;
          if (endDate && itemDate > endDate) matches = false;

          if (matches) {
            docsToDelete.push(docSnap.ref);
          }
        } else if (period === 'all') {
          docsToDelete.push(docSnap.ref);
        }
      });

      const deletePromises = docsToDelete.map(ref => deleteDoc(ref));
      await Promise.all(deletePromises);
    }
  } catch (error) {
    console.error('Error clearing analytics data by period:', error);
    throw error;
  }
};

// Add function to clear analytics data
export const clearAllAnalyticsData = async (): Promise<void> => {
  try {
    const collectionsToClear = ['page_views', 'visitor_sessions', 'page_interactions', 'daily_stats', 'page_stats'];
    for (const collName of collectionsToClear) {
      const collRef = collection(db, collName);
      const snap = await getDocs(collRef);
      // Batch deletes in sets of 500 would be preferred for large sets, 
      // but simple promise all is sufficient for typical sized sets being cleared often
      const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);
    }
  } catch (error) {
    console.error('Error clearing analytics data:', error);
    throw error;
  }
};

// Add function to clear profit data (orders from firebase)
export const clearAllProfitData = async (): Promise<void> => {
  try {
    const ordersRef = collection(db, 'orders');
    const snap = await getDocs(ordersRef);
    const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletePromises);
  } catch (error) {
    console.error('Error clearing profit data:', error);
    throw error;
  }
};
export const attendanceSettingsService = new FirebaseAttendanceSettingsService();

// ────────────────────────────────────────────────────────────────────────────
// Spec Profiles Service  – stores admin-created spec profiles in Firestore
// Collection: spec_profiles / doc id = profile name (slugified)
// ────────────────────────────────────────────────────────────────────────────
export interface SpecProfileField {
  key: string;
  filterSlug: string;
  inFilter: boolean;
  isDropdown: boolean;
}

export interface SpecProfile {
  id: string;            // Firestore doc id  (slug of name)
  name: string;          // human-readable label (profile display name)
  categoryValue?: string; // actual value written into the "الفئة" spec field
  subcategoryValue?: string; // actual value written into the "الفئة الفرعية" spec field
  subcategorySlug?: string;  // filterSlug for "الفئة الفرعية"
  fields: SpecProfileField[];
  createdAt: string;
  categoryImage?: string;
}

export class FirebaseSpecProfilesService {
  private collectionName = 'spec_profiles';

  private toId(name: string): string {
    if (!name || typeof name !== 'string') {
      return `profile-${Date.now()}`;
    }
    const clean = name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-');
    return encodeURIComponent(clean).replace(/%/g, '_') || `profile-${Date.now()}`;
  }

  async getAllProfiles(): Promise<SpecProfile[]> {
    let fbProfiles: SpecProfile[] = [];
    try {
      const ref = collection(db, this.collectionName);
      const snap = await getDocs(ref);
      fbProfiles = snap.docs.map(d => {
        const data = d.data();
        return {
          ...data,
          id: d.id,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        };
      }) as SpecProfile[];

      // Sort in-memory by createdAt descending
      fbProfiles.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    } catch (error) {
      console.error('Error loading spec profiles from Firestore:', error);
    }

    // Load and merge with localStorage backup to ensure offline availability and robustness
    try {
      const saved = localStorage.getItem('bazar_custom_spec_profiles');
      if (saved) {
        const parsed: Record<string, any> = JSON.parse(saved);
        const localProfiles = Object.entries(parsed).map(([name, data]) => {
          const fields = Array.isArray(data) ? data : (data || {}).fields;
          const categoryImage = Array.isArray(data) ? undefined : (data || {}).categoryImage;
          const categoryValue = Array.isArray(data) ? undefined : (data || {}).categoryValue;
          const subcategoryValue = Array.isArray(data) ? undefined : (data || {}).subcategoryValue;
          const subcategorySlug = Array.isArray(data) ? undefined : (data || {}).subcategorySlug;
          return {
            id: this.toId(name),
            name,
            ...(categoryValue ? { categoryValue } : {}),
            ...(subcategoryValue ? { subcategoryValue } : {}),
            ...(subcategorySlug ? { subcategorySlug } : {}),
            fields: (fields || []).map((f: any) => ({
              key: f.key || '',
              filterSlug: f.filterSlug || '',
              inFilter: !!f.inFilter,
              isDropdown: !!f.isDropdown,
            })),
            categoryImage,
            createdAt: new Date().toISOString(),
          };
        });

        // Merge, prioritizing Firestore versions
        const fbIds = new Set(fbProfiles.map(p => p.id));
        const uniqueLocal = localProfiles.filter(p => !fbIds.has(p.id));
        return [...fbProfiles, ...uniqueLocal];
      }
    } catch (e) {
      console.warn('Failed to parse localStorage spec profiles:', e);
    }

    return fbProfiles;
  }

  async saveProfile(
    name: string,
    fields: SpecProfileField[],
    categoryImage?: string,
    categoryValue?: string,
    subcategoryValue?: string,
    subcategorySlug?: string
  ): Promise<SpecProfile> {
    const id = this.toId(name);

    // Explicitly map fields to prevent undefined values which Firestore setDoc rejects
    const cleanFields = (fields || []).map(f => ({
      key: f.key || '',
      filterSlug: f.filterSlug || '',
      inFilter: !!f.inFilter,
      isDropdown: !!f.isDropdown,
    }));

    const profile: Omit<SpecProfile, 'id'> = {
      name,
      fields: cleanFields,
      createdAt: new Date().toISOString(),
      ...(categoryImage ? { categoryImage } : {}),
      ...(categoryValue ? { categoryValue } : {}),
      ...(subcategoryValue ? { subcategoryValue } : {}),
      ...(subcategorySlug ? { subcategorySlug } : {}),
    };

    // Save to localStorage as a robust local backup
    try {
      const saved = localStorage.getItem('bazar_custom_spec_profiles');
      const current: Record<string, any> = saved ? JSON.parse(saved) : {};
      current[name] = { fields: cleanFields, categoryImage, categoryValue, subcategoryValue, subcategorySlug };
      localStorage.setItem('bazar_custom_spec_profiles', JSON.stringify(current));
    } catch (e) {
      console.warn('Failed to save spec profile to localStorage backup:', e);
    }

    try {
      const docRef = doc(db, this.collectionName, id);
      await setDoc(docRef, {
        ...profile,
        createdAt: Timestamp.now(),
      });
      return { ...profile, id };
    } catch (error) {
      console.error('Error saving spec profile to Firestore:', error);
      throw error; // Propagate the error so the UI handles it
    }
  }

  async deleteProfile(id: string): Promise<void> {
    // Delete from localStorage backup
    try {
      const saved = localStorage.getItem('bazar_custom_spec_profiles');
      if (saved) {
        const parsed: Record<string, SpecProfileField[]> = JSON.parse(saved);
        const updated = Object.fromEntries(
          Object.entries(parsed).filter(([name]) => this.toId(name) !== id)
        );
        localStorage.setItem('bazar_custom_spec_profiles', JSON.stringify(updated));
      }
    } catch (e) {
      console.warn('Failed to delete profile from localStorage backup:', e);
    }

    // Delete from Firestore
    try {
      await deleteDoc(doc(db, this.collectionName, id));
    } catch (error) {
      console.error('Error deleting spec profile from Firestore:', error);
      throw error; // Propagate the error to the UI
    }
  }
}

export const specProfilesService = new FirebaseSpecProfilesService();

export default app;