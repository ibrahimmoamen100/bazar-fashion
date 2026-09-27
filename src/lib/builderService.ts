import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { BuilderPreset, BuilderPresetSummary } from "@/types/builder";
import { BUILDER_PRESETS as DEFAULT_PRESETS } from "@/constants/builderPresets";

const BUILDER_CONFIG_COLLECTION = "admin_config";
const BUILDER_DOC_ID = "builder_presets";

// ── Cache Storage Keys ──
const CACHE_KEY_SUMMARIES = "bazar_builder_summaries_v2";
const CACHE_KEY_CATEGORIES = "bazar_builder_categories_v2";
const CACHE_KEY_PRESETS_MASTER = "bazar_dynamic_builder_presets_v2";
const CACHE_KEY_PRESET_PREFIX = "bazar_builder_preset_v2_";
// Stores the last known `updatedAt` token from Firestore to detect remote changes
const CACHE_KEY_VERSION_TOKEN = "bazar_builder_version_token_v2";

// 24 Hours Cache TTL (Long-term cache to preserve Firebase free tier)
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
// How often to ping Firestore to check for a new version (5 minutes)
const VERSION_CHECK_INTERVAL_MS = 5 * 60 * 1000;

// In-memory flag to avoid hammering Firestore with version checks within same session
let lastVersionCheckTime = 0;

interface CacheEnvelope<T> {
  timestamp: number;
  data: T;
}

// ── In-Memory Runtime Cache (Zero I/O during session navigation) ──
let memorySummaries: CacheEnvelope<BuilderPresetSummary[]> | null = null;
let memoryCategories: CacheEnvelope<Array<{ id: string; label: string }>> | null = null;
const memoryPresetsMap = new Map<string, CacheEnvelope<BuilderPreset>>();

function isCacheFresh(envelope: CacheEnvelope<any> | null, ttl = CACHE_TTL_MS): boolean {
  if (!envelope || !envelope.data) return false;
  return Date.now() - envelope.timestamp < ttl;
}

function normalizePresetsWithSlugs(presets: BuilderPreset[]): BuilderPreset[] {
  return presets.map((p) => {
    if (!p.slug || !p.slug.trim()) {
      const fallback = (p.id || "preset").toLowerCase().replace(/^preset-/, "").replace(/[^a-z0-9-_]/g, "-");
      return { ...p, slug: fallback || "pc-build" };
    }
    return p;
  });
}

function calculateEstimatedPrice(preset: BuilderPreset): number {
  if (!preset || !preset.steps) return 0;
  const base = preset.steps.reduce((sum, step) => {
    const opt = step.options?.find((o) => o.id === step.defaultOptionId) || (step.required && step.options?.length ? step.options[0] : null);
    return sum + (opt ? opt.price : 0);
  }, 0);
  const discount = (preset.discountPercentage || 0) / 100;
  return Math.round(base * (1 - discount));
}

function extractPresetSummary(preset: BuilderPreset): BuilderPresetSummary {
  return {
    id: preset.id,
    slug: (preset.slug || preset.id).toLowerCase(),
    title: preset.title,
    category: preset.category,
    categoryLabel: preset.categoryLabel,
    badge: preset.badge,
    discountPercentage: preset.discountPercentage,
    showcaseImage: preset.showcaseImage,
    description: preset.description,
    stepsCount: preset.steps?.length || 0,
    estimatedPrice: calculateEstimatedPrice(preset),
  };
}

export const builderService = {
  /**
   * Checks Firestore for the latest `updatedAt` version token.
   * If it differs from the locally cached token, it invalidates ALL caches.
   * This is the core mechanism that ensures users always see fresh data.
   * Only pings Firestore once every VERSION_CHECK_INTERVAL_MS to save reads.
   */
  async checkAndInvalidateIfStale(): Promise<boolean> {
    if (typeof window === "undefined") return false;

    const now = Date.now();
    // Throttle: don't re-check within the same session interval
    if (now - lastVersionCheckTime < VERSION_CHECK_INTERVAL_MS) return false;
    lastVersionCheckTime = now;

    try {
      const docRef = doc(db, BUILDER_CONFIG_COLLECTION, BUILDER_DOC_ID);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return false;

      const remoteToken: string = docSnap.data()?.updatedAt || "";
      if (!remoteToken) return false;

      const localToken = localStorage.getItem(CACHE_KEY_VERSION_TOKEN) || "";

      if (remoteToken !== localToken) {
        // ✅ Remote data is newer → wipe ALL local caches
        console.info("[builderService] Remote data changed, invalidating cache...", { localToken, remoteToken });
        this.invalidateCache();
        localStorage.setItem(CACHE_KEY_VERSION_TOKEN, remoteToken);
        return true; // Cache was invalidated
      }
    } catch (e) {
      console.warn("[builderService] Version check failed (network?), using cached data.", e);
    }
    return false;
  },

  /**
   * Get lightweight preset summaries for the /builder hub page.
   * This does NOT load heavy steps/options, saving memory and Firebase reads.
   * Flow: Version Check → Memory → LocalStorage → Firebase
   */
  async getPresetSummaries(): Promise<BuilderPresetSummary[]> {
    // 0. Version check: if remote data changed, wipe stale caches first
    await this.checkAndInvalidateIfStale();

    // 1. Check in-memory cache (0ms, 0 reads)
    if (memorySummaries && Array.isArray(memorySummaries.data) && memorySummaries.data.length > 0) {
      return memorySummaries.data;
    }

    // 2. Check localStorage cache with TTL
    if (typeof window !== "undefined") {
      try {
        const localRaw = localStorage.getItem(CACHE_KEY_SUMMARIES);
        if (localRaw) {
          const envelope: CacheEnvelope<BuilderPresetSummary[]> = JSON.parse(localRaw);
          if (envelope && Array.isArray(envelope.data) && envelope.data.length > 0 && isCacheFresh(envelope)) {
            memorySummaries = envelope;
            return envelope.data;
          }
        }
      } catch (e) {
        console.warn("builderService: error reading summaries from localStorage", e);
      }
    }

    // 3. Fallback: fetch full presets once, generate summaries, and cache them
    return this.revalidateSummaries();
  },

  /**
   * Initial seed / revalidation of preset summaries
   */
  async revalidateSummaries(): Promise<BuilderPresetSummary[]> {
    try {
      const presets = await this.getPresets();
      const summaries = presets.map(extractPresetSummary);

      const envelope: CacheEnvelope<BuilderPresetSummary[]> = {
        timestamp: Date.now(),
        data: summaries,
      };

      memorySummaries = envelope;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(CACHE_KEY_SUMMARIES, JSON.stringify(envelope));
        } catch (e) {}
      }

      return summaries;
    } catch (e) {
      console.warn("builderService: revalidation failed, using defaults", e);
      const defaults = normalizePresetsWithSlugs(DEFAULT_PRESETS).map(extractPresetSummary);
      return defaults;
    }
  },

  /**
   * Get a single preset with its full steps and options for /builder/[slug].
   * Only called when a visitor actually opens that specific build page!
   * Checks In-Memory Cache -> LocalStorage Cache -> Firebase (Only first time).
   * Once cached, subsequent visits use ZERO Firebase reads!
   */
  async getPresetBySlugOrId(slugOrId: string): Promise<BuilderPreset | null> {
    const clean = (slugOrId || "").trim().toLowerCase();
    if (!clean) return null;

    // 0. Version check: wipe stale caches if remote data changed
    await this.checkAndInvalidateIfStale();

    // 1. Check In-Memory Map (Instant 0ms, 0 reads)
    const inMem = memoryPresetsMap.get(clean);
    if (inMem && inMem.data) {
      return inMem.data;
    }

    // 2. Check LocalStorage dedicated key (Instant 0ms, 0 reads)
    if (typeof window !== "undefined") {
      try {
        const localKey = `${CACHE_KEY_PRESET_PREFIX}${clean}`;
        const localRaw = localStorage.getItem(localKey);
        if (localRaw) {
          const envelope: CacheEnvelope<BuilderPreset> = JSON.parse(localRaw);
          if (envelope && envelope.data) {
            memoryPresetsMap.set(clean, envelope);
            return envelope.data;
          }
        }
      } catch (e) {}
    }

    // 3. Check master presets list (from local storage or Firestore)
    const allPresets = await this.getPresets();
    const matched = allPresets.find(
      (p) => (p.slug && p.slug.toLowerCase() === clean) || p.id.toLowerCase() === clean
    );

    if (matched) {
      const envelope: CacheEnvelope<BuilderPreset> = {
        timestamp: Date.now(),
        data: matched,
      };

      // Cache under both id and slug
      memoryPresetsMap.set(clean, envelope);
      if (matched.id) memoryPresetsMap.set(matched.id.toLowerCase(), envelope);
      if (matched.slug) memoryPresetsMap.set(matched.slug.toLowerCase(), envelope);

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`${CACHE_KEY_PRESET_PREFIX}${clean}`, JSON.stringify(envelope));
          if (matched.slug) {
            localStorage.setItem(`${CACHE_KEY_PRESET_PREFIX}${matched.slug.toLowerCase()}`, JSON.stringify(envelope));
          }
        } catch (e) {}
      }

      return matched;
    }

    return null;
  },


  /**
   * Get all builder presets (Master).
   * Priority: Memory -> LocalStorage with TTL -> Firestore -> Default Fallback Presets
   */
  async getPresets(): Promise<BuilderPreset[]> {
    // 1. Check LocalStorage master cache first with TTL
    if (typeof window !== "undefined") {
      try {
        const localRaw = localStorage.getItem(CACHE_KEY_PRESETS_MASTER);
        if (localRaw) {
          const envelope: CacheEnvelope<BuilderPreset[]> = JSON.parse(localRaw);
          if (envelope && Array.isArray(envelope.data) && envelope.data.length > 0) {
            if (isCacheFresh(envelope)) {
              return envelope.data;
            }
          }
        }
      } catch (e) {}
    }

    // 2. Fetch from Firestore
    try {
      if (typeof window !== "undefined") {
        const docRef = doc(db, BUILDER_CONFIG_COLLECTION, BUILDER_DOC_ID);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && Array.isArray(data.presets)) {
            const normalized = normalizePresetsWithSlugs(data.presets as BuilderPreset[]);
            const envelope: CacheEnvelope<BuilderPreset[]> = {
              timestamp: Date.now(),
              data: normalized,
            };
            localStorage.setItem(CACHE_KEY_PRESETS_MASTER, JSON.stringify(envelope));
            return normalized;
          }
        } else {
          // Document does not exist in Firestore yet: seed it with defaults
          console.log("builderService: Initializing builder_presets in Firestore with defaults...");
          const cleanDefaults = normalizePresetsWithSlugs(JSON.parse(JSON.stringify(DEFAULT_PRESETS)));
          await setDoc(docRef, {
            presets: cleanDefaults,
            updatedAt: new Date().toISOString(),
          });
          const envelope: CacheEnvelope<BuilderPreset[]> = {
            timestamp: Date.now(),
            data: cleanDefaults,
          };
          localStorage.setItem(CACHE_KEY_PRESETS_MASTER, JSON.stringify(envelope));
          return cleanDefaults;
        }
      }
    } catch (err) {
      console.warn("builderService: failed to fetch from Firestore, checking fallback cache...", err);
    }

    // 3. Fallback to existing stale cache or hardcoded defaults
    if (typeof window !== "undefined") {
      try {
        const localRaw = localStorage.getItem(CACHE_KEY_PRESETS_MASTER);
        if (localRaw) {
          const parsed = JSON.parse(localRaw);
          const data = Array.isArray(parsed) ? parsed : parsed.data;
          if (Array.isArray(data) && data.length > 0) {
            return normalizePresetsWithSlugs(data);
          }
        }
      } catch (e) {}
    }

    return normalizePresetsWithSlugs(DEFAULT_PRESETS);
  },

  /**
   * Save builder presets to both Firestore and LocalStorage.
   * Automatically invalidates and updates all caches so changes reflect immediately!
   */
  async savePresets(presets: BuilderPreset[]): Promise<{ success: boolean; error?: string }> {
    try {
      const cleanPresets = normalizePresetsWithSlugs(JSON.parse(JSON.stringify(presets)));

      // 1. Immediately update LocalStorage and In-Memory caches
      const now = Date.now();
      const masterEnvelope: CacheEnvelope<BuilderPreset[]> = {
        timestamp: now,
        data: cleanPresets,
      };

      const summaries = cleanPresets.map(extractPresetSummary);
      const summaryEnvelope: CacheEnvelope<BuilderPresetSummary[]> = {
        timestamp: now,
        data: summaries,
      };

      memorySummaries = summaryEnvelope;

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(CACHE_KEY_PRESETS_MASTER, JSON.stringify(masterEnvelope));
          localStorage.setItem(CACHE_KEY_SUMMARIES, JSON.stringify(summaryEnvelope));

          // Also update individual preset caches
          cleanPresets.forEach((p) => {
            const singleEnv: CacheEnvelope<BuilderPreset> = { timestamp: now, data: p };
            if (p.id) {
              memoryPresetsMap.set(p.id.toLowerCase(), singleEnv);
              localStorage.setItem(`${CACHE_KEY_PRESET_PREFIX}${p.id.toLowerCase()}`, JSON.stringify(singleEnv));
            }
            if (p.slug) {
              memoryPresetsMap.set(p.slug.toLowerCase(), singleEnv);
              localStorage.setItem(`${CACHE_KEY_PRESET_PREFIX}${p.slug.toLowerCase()}`, JSON.stringify(singleEnv));
            }
          });
        } catch (e) {}
      }

      // 2. Persist to Firestore with the new version token
      const newVersionToken = new Date().toISOString();
      const docRef = doc(db, BUILDER_CONFIG_COLLECTION, BUILDER_DOC_ID);
      await setDoc(docRef, {
        presets: cleanPresets,
        updatedAt: newVersionToken,
      }, { merge: true });

      // 3. Update the local version token so the admin doesn't invalidate their own fresh cache
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(CACHE_KEY_VERSION_TOKEN, newVersionToken);
        } catch (e) {}
      }
      // Reset the version check timer so next visitor gets a fresh check sooner
      lastVersionCheckTime = 0;

      return { success: true };
    } catch (err: any) {
      console.error("builderService: error saving presets", err);
      return { success: false, error: err.message || "Failed to save presets" };
    }
  },

  /**
   * Invalidate all builder caches (used when changes happen or on demand)
   */
  invalidateCache() {
    memorySummaries = null;
    memoryCategories = null;
    memoryPresetsMap.clear();

    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(CACHE_KEY_SUMMARIES);
        localStorage.removeItem(CACHE_KEY_CATEGORIES);
        localStorage.removeItem(CACHE_KEY_PRESETS_MASTER);
        
        // Remove individual preset cached entries
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(CACHE_KEY_PRESET_PREFIX)) {
            localStorage.removeItem(key);
          }
        }
      } catch (e) {}
    }
  },

  /**
   * Reset presets to default initial presets in Firebase and LocalStorage
   */
  async resetToDefaults(): Promise<{ success: boolean; presets: BuilderPreset[] }> {
    try {
      const cleanDefaults = normalizePresetsWithSlugs(JSON.parse(JSON.stringify(DEFAULT_PRESETS)));
      await this.savePresets(cleanDefaults);
      return { success: true, presets: cleanDefaults };
    } catch (err) {
      console.error("builderService: error resetting to defaults", err);
      return { success: true, presets: DEFAULT_PRESETS };
    }
  },

  /**
   * Get dynamic builder categories from Firestore/LocalStorage with caching
   */
  async getCategories(): Promise<Array<{ id: string; label: string }>> {
    const DEFAULT_CATEGORIES = [
      { id: 'all', label: 'جميع الأقسام' },
      { id: 'pc', label: '🖥️ تجميعات كمبيوتر وجيمنج' },
      { id: 'office', label: '💼 جمع مكتبك وست أب' },
      { id: 'apartment', label: '🛋️ جهز شقتك وغرفتك' },
      { id: 'custom', label: '⚙️ بناء حر ومخصص' },
    ];

    if (isCacheFresh(memoryCategories)) {
      return memoryCategories!.data;
    }

    if (typeof window !== "undefined") {
      try {
        const local = localStorage.getItem(CACHE_KEY_CATEGORIES);
        if (local) {
          const envelope: CacheEnvelope<Array<{ id: string; label: string }>> = JSON.parse(local);
          if (envelope && Array.isArray(envelope.data) && envelope.data.length > 0) {
            memoryCategories = envelope;
            if (isCacheFresh(envelope)) {
              return envelope.data;
            }
          }
        }
      } catch (e) {}
    }

    try {
      if (typeof window !== "undefined") {
        const docRef = doc(db, BUILDER_CONFIG_COLLECTION, "builder_categories");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && Array.isArray(data.categories) && data.categories.length > 0) {
            const envelope = { timestamp: Date.now(), data: data.categories };
            memoryCategories = envelope;
            localStorage.setItem(CACHE_KEY_CATEGORIES, JSON.stringify(envelope));
            return data.categories;
          }
        } else {
          // Seed initial categories
          await setDoc(docRef, {
            categories: DEFAULT_CATEGORIES,
            updatedAt: new Date().toISOString(),
          });
          const envelope = { timestamp: Date.now(), data: DEFAULT_CATEGORIES };
          memoryCategories = envelope;
          localStorage.setItem(CACHE_KEY_CATEGORIES, JSON.stringify(envelope));
          return DEFAULT_CATEGORIES;
        }
      }
    } catch (err) {
      console.warn("builderService: error fetching categories from Firestore", err);
    }

    return DEFAULT_CATEGORIES;
  },

  /**
   * Save builder categories to Firestore and LocalStorage
   */
  async saveCategories(categories: Array<{ id: string; label: string }>): Promise<{ success: boolean; error?: string }> {
    try {
      const clean = JSON.parse(JSON.stringify(categories));
      const envelope = { timestamp: Date.now(), data: clean };
      memoryCategories = envelope;

      if (typeof window !== "undefined") {
        localStorage.setItem(CACHE_KEY_CATEGORIES, JSON.stringify(envelope));
      }

      const docRef = doc(db, BUILDER_CONFIG_COLLECTION, "builder_categories");
      await setDoc(docRef, {
        categories: clean,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      return { success: true };
    } catch (err: any) {
      console.error("builderService: error saving categories", err);
      return { success: false, error: err.message };
    }
  }
};
