/**
 * Migration utility: renames old localStorage keys to the new `bazar_` prefixed keys.
 * Runs once per browser session and is safe to call multiple times.
 */

const MIGRATION_FLAG = 'bazar_migration_v1_done';

const KEY_MAP: Record<string, string> = {
  'shop-storage':               'bazar_shop-storage',
  'site_settings_cache':        'bazar_site_settings_cache',
  'splash_logo_cached_url':     'bazar_splash_logo_cached_url',
  'splash_settings_cache':      'bazar_splash_settings_cache',
  'bazarx_categories_tree_cache': 'bazar_categories_tree_cache',
  'local_products_fallback':    'bazar_local_products_fallback',
  'cashier-sales':              'bazar_cashier-sales',
  'returning_visitor':          'bazar_returning_visitor',
  'analytics-data':             'bazar_analytics-data',
  'profit-analysis-data':       'bazar_profit-analysis-data',
  'orders-data':                'bazar_orders-data',
  'checkout_fullName':          'bazar_checkout_fullName',
  'checkout_phoneNumber':       'bazar_checkout_phoneNumber',
  'checkout_city':              'bazar_checkout_city',
  'checkout_address':           'bazar_checkout_address',
  'checkout_notes':             'bazar_checkout_notes',
  'storee-cart':                'bazar_storee-cart',
  'storee-products':            'bazar_storee-products',
  'storee-filters':             'bazar_storee-filters',
  // Auth sessions
  'admin_session_token':        'bazar_admin_session_token',
  'attendance_session_token':   'bazar_attendance_session_token',
  'dashboard_user_session':     'bazar_dashboard_user_session',
  'dashboard_auth':             'bazar_dashboard_auth',
  // Admin tools
  'bazarx_last_custom_options': 'bazar_last_custom_options',
  'bazarx_custom_spec_profiles': 'bazar_custom_spec_profiles',
  'bazarx_default_filters':     'bazar_default_filters',
  'bazarx_filters_case_added':  'bazar_filters_case_added',
  // Analytics demographics
  'user_age':                   'bazar_user_age',
  'user_gender':                'bazar_user_gender',
  // Admin config cleanup
  'admin_config_local':         'bazar_admin_config_local',
  'admin_config':               'bazar_admin_config',
};

export function migrateLocalStorageKeys(): void {
  if (typeof window === 'undefined') return;

  // Already migrated
  if (localStorage.getItem(MIGRATION_FLAG)) return;

  let migratedCount = 0;

  for (const [oldKey, newKey] of Object.entries(KEY_MAP)) {
    try {
      const value = localStorage.getItem(oldKey);
      if (value !== null) {
        // Only migrate if the new key doesn't already have data
        if (localStorage.getItem(newKey) === null) {
          localStorage.setItem(newKey, value);
        }
        localStorage.removeItem(oldKey);
        migratedCount++;
      }
    } catch (e) {
      console.warn(`[bazar migration] Failed to migrate key "${oldKey}":`, e);
    }
  }

  // Migrate dynamic form_persistence_* keys
  try {
    const allKeys = Object.keys(localStorage);
    for (const key of allKeys) {
      if (key.startsWith('form_persistence_') && !key.startsWith('bazar_')) {
        const newKey = `bazar_${key}`;
        const value = localStorage.getItem(key);
        if (value !== null && localStorage.getItem(newKey) === null) {
          localStorage.setItem(newKey, value);
        }
        localStorage.removeItem(key);
        migratedCount++;
      }
    }
  } catch (e) {
    console.warn('[bazar migration] Failed to migrate form_persistence_ keys:', e);
  }

  // Mark migration as done
  localStorage.setItem(MIGRATION_FLAG, '1');

  if (migratedCount > 0) {
    console.log(`[bazar migration] Migrated ${migratedCount} localStorage key(s) to bazar_ prefix.`);
  }
}
