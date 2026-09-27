/**
 * Migration utility: renames old localStorage keys to the new `bazar-fashion_` prefixed keys.
 * Runs once per browser session and is safe to call multiple times.
 */

const MIGRATION_FLAG = 'bazar-fashion_migration_v1_done';

const KEY_MAP: Record<string, string> = {
  // Store / Cart
  'shop-storage':                 'bazar-fashion_shop-storage',
  'bazar_shop-storage':           'bazar-fashion_shop-storage',
  'storee-cart':                  'bazar-fashion_storee-cart',
  'bazar_storee-cart':            'bazar-fashion_storee-cart',
  'storee-products':              'bazar-fashion_storee-products',
  'bazar_storee-products':        'bazar-fashion_storee-products',
  'storee-filters':               'bazar-fashion_storee-filters',
  'bazar_storee-filters':         'bazar-fashion_storee-filters',

  // Site Settings & Splash
  'site_settings_cache':          'bazar-fashion_site_settings_cache',
  'bazar_site_settings_cache':    'bazar-fashion_site_settings_cache',
  'splash_logo_cached_url':       'bazar-fashion_splash_logo_cached_url',
  'bazar_splash_logo_cached_url': 'bazar-fashion_splash_logo_cached_url',
  'splash_settings_cache':        'bazar-fashion_splash_settings_cache',
  'bazar_splash_settings_cache':  'bazar-fashion_splash_settings_cache',
  'bazarx_categories_tree_cache': 'bazar-fashion_categories_tree_cache',
  'bazar_categories_tree_cache':  'bazar-fashion_categories_tree_cache',

  // Products Fallback & Catalog Cache
  'local_products_fallback':      'bazar-fashion_local_products_fallback',
  'bazar_local_products_fallback':'bazar-fashion_local_products_fallback',
  'cached_products':              'bazar-fashion_cached_products',
  'catalog_version':              'bazar-fashion_catalog_version',

  // Sales & Cashier
  'cashier-sales':                'bazar-fashion_cashier-sales',
  'bazar_cashier-sales':          'bazar-fashion_cashier-sales',

  // Analytics & Demographics
  'returning_visitor':            'bazar-fashion_returning_visitor',
  'bazar_returning_visitor':      'bazar-fashion_returning_visitor',
  'analytics-data':               'bazar-fashion_analytics-data',
  'bazar_analytics-data':         'bazar-fashion_analytics-data',
  'profit-analysis-data':         'bazar-fashion_profit-analysis-data',
  'bazar_profit-analysis-data':   'bazar-fashion_profit-analysis-data',
  'orders-data':                  'bazar-fashion_orders-data',
  'bazar_orders-data':            'bazar-fashion_orders-data',
  'user_age':                     'bazar-fashion_user_age',
  'bazar_user_age':               'bazar-fashion_user_age',
  'user_gender':                  'bazar-fashion_user_gender',
  'bazar_user_gender':            'bazar-fashion_user_gender',

  // Checkout info
  'checkout_fullName':            'bazar-fashion_checkout_fullName',
  'bazar_checkout_fullName':      'bazar-fashion_checkout_fullName',
  'checkout_phoneNumber':         'bazar-fashion_checkout_phoneNumber',
  'bazar_checkout_phoneNumber':   'bazar-fashion_checkout_phoneNumber',
  'checkout_city':                'bazar-fashion_checkout_city',
  'bazar_checkout_city':          'bazar-fashion_checkout_city',
  'checkout_address':             'bazar-fashion_checkout_address',
  'bazar_checkout_address':       'bazar-fashion_checkout_address',
  'checkout_notes':               'bazar-fashion_checkout_notes',
  'bazar_checkout_notes':         'bazar-fashion_checkout_notes',

  // Order Tracking
  'bazar_tracked_orders':         'bazar-fashion_tracked_orders',

  // Auth sessions
  'admin_session_token':          'bazar-fashion_admin_session_token',
  'bazar_admin_session_token':    'bazar-fashion_admin_session_token',
  'attendance_session_token':     'bazar-fashion_attendance_session_token',
  'bazar_attendance_session_token':'bazar-fashion_attendance_session_token',
  'dashboard_user_session':       'bazar-fashion_dashboard_user_session',
  'bazar_dashboard_user_session': 'bazar-fashion_dashboard_user_session',
  'dashboard_auth':               'bazar-fashion_dashboard_auth',
  'bazar_dashboard_auth':         'bazar-fashion_dashboard_auth',

  // Builder Service
  'bazar_builder_summaries_v2':   'bazar-fashion_builder_summaries_v2',
  'bazar_builder_categories_v2':  'bazar-fashion_builder_categories_v2',
  'bazar_dynamic_builder_presets_v2': 'bazar-fashion_dynamic_builder_presets_v2',
  'bazar_builder_version_token_v2':   'bazar-fashion_builder_version_token_v2',

  // Admin tools
  'bazarx_last_custom_options':   'bazar-fashion_last_custom_options',
  'bazar_last_custom_options':    'bazar-fashion_last_custom_options',
  'bazarx_custom_spec_profiles':  'bazar-fashion_custom_spec_profiles',
  'bazar_custom_spec_profiles':   'bazar-fashion_custom_spec_profiles',
  'bazarx_default_filters':       'bazar-fashion_default_filters',
  'bazar_default_filters':        'bazar-fashion_default_filters',
  'bazarx_filters_case_added':    'bazar-fashion_filters_case_added',
  'bazar_filters_case_added':     'bazar-fashion_filters_case_added',

  // Admin config cleanup
  'admin_config_local':           'bazar-fashion_admin_config_local',
  'bazar_admin_config_local':     'bazar-fashion_admin_config_local',
  'admin_config':                 'bazar-fashion_admin_config',
  'bazar_admin_config':           'bazar-fashion_admin_config',
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
      console.warn(`[bazar-fashion migration] Failed to migrate key "${oldKey}":`, e);
    }
  }

  // Migrate dynamic form_persistence_* and builder_preset_* keys
  try {
    const allKeys = Object.keys(localStorage);
    for (const key of allKeys) {
      if ((key.startsWith('form_persistence_') || key.startsWith('bazar_form_persistence_')) && !key.startsWith('bazar-fashion_')) {
        const cleanKey = key.replace(/^(bazar_)?form_persistence_/, '');
        const newKey = `bazar-fashion_form_persistence_${cleanKey}`;
        const value = localStorage.getItem(key);
        if (value !== null && localStorage.getItem(newKey) === null) {
          localStorage.setItem(newKey, value);
        }
        localStorage.removeItem(key);
        migratedCount++;
      } else if (key.startsWith('bazar_builder_preset_v2_') && !key.startsWith('bazar-fashion_')) {
        const cleanKey = key.replace(/^bazar_builder_preset_v2_/, '');
        const newKey = `bazar-fashion_builder_preset_v2_${cleanKey}`;
        const value = localStorage.getItem(key);
        if (value !== null && localStorage.getItem(newKey) === null) {
          localStorage.setItem(newKey, value);
        }
        localStorage.removeItem(key);
        migratedCount++;
      }
    }
  } catch (e) {
    console.warn('[bazar-fashion migration] Failed to migrate dynamic keys:', e);
  }

  // Mark migration as done
  localStorage.setItem(MIGRATION_FLAG, '1');

  if (migratedCount > 0) {
    console.log(`[bazar-fashion migration] Migrated ${migratedCount} localStorage key(s) to bazar-fashion_ prefix.`);
  }
}
