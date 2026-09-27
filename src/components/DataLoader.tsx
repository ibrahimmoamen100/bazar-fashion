'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';

const SYNC_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const DataLoader = () => {
  const { loadProducts, loading } = useStore();
  const isSyncingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const lastSync = localStorage.getItem('last_sync_time');
      const needsSync = !lastSync || Date.now() - Number(lastSync) > SYNC_TTL_MS;

      if (!loading && needsSync && !isSyncingRef.current) {
        isSyncingRef.current = true;
        localStorage.setItem('last_sync_time', String(Date.now()));
        console.log('⚡ [DataLoader] Sync TTL reached or initial visit. Checking catalog version token...');
        loadProducts().finally(() => {
          isSyncingRef.current = false;
        });
      }
    } catch (e) {
      console.warn('⚠️ [DataLoader] Error checking sync TTL in localStorage:', e);
    }
  }, [loadProducts, loading]); // pathname removed intentionally — TTL guards against redundant fetches

  return null;
};