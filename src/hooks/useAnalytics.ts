import { useState, useEffect, useCallback } from 'react';
import { analytics, AnalyticsData } from '@/lib/analytics';
import { toast } from 'sonner';

export const useAnalytics = (timeRange: number = 30) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [realTimeVisitors, setRealTimeVisitors] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log(`[Analytics] Loading data for ${timeRange} days...`);
      const analyticsData = await analytics.getAnalyticsData(timeRange);
      console.log('[Analytics] Data loaded:', {
        totalVisitors: analyticsData.totalVisitors,
        pageViews: analyticsData.pageViews,
        topPages: analyticsData.topPages.length,
        topReferrers: analyticsData.topReferrers.length,
        hourlyTraffic: analyticsData.hourlyTraffic.length,
        dailyTraffic: analyticsData.dailyTraffic.length,
      });
      setData(analyticsData);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('[Analytics] Error loading data:', err);
      const errStr = (err?.message || err?.code || String(err)).toLowerCase();
      if (errStr.includes('resource-exhausted') || errStr.includes('quota')) {
        setQuotaExceeded(true);
        const quotaMsg = 'تم النفاذ المؤقت للحصة المجانية اليومية لقراءة البيانات من Firebase (Quota Exceeded / Resource Exhausted). يرجى التريث حتى تجديد الحصة أو مسح بيانات الإحصائيات القديمة لتوفير المساحة.';
        setError(quotaMsg);
        toast.error(quotaMsg, { duration: 7000 });
      } else {
        const errorMessage = err instanceof Error ? err.message : 'فشل في تحميل البيانات';
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  const loadRealTimeData = useCallback(async () => {
    if (quotaExceeded) return;
    try {
      const visitors = await analytics.getRealTimeVisitors();
      setRealTimeVisitors(visitors);
    } catch (err: any) {
      const errStr = (err?.message || err?.code || String(err)).toLowerCase();
      if (errStr.includes('resource-exhausted') || errStr.includes('quota')) {
        setQuotaExceeded(true);
      } else {
        console.error('Error loading real-time data:', err);
      }
    }
  }, [quotaExceeded]);

  // Load initial data only if timeRange > 0
  useEffect(() => {
    if (timeRange > 0) {
      loadData();
    }
  }, [loadData, timeRange]);

  // Set up real-time updates (stop if quota exceeded)
  useEffect(() => {
    if (timeRange > 0 && !quotaExceeded) {
      loadRealTimeData();
      const interval = setInterval(loadRealTimeData, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [loadRealTimeData, timeRange, quotaExceeded]);

  // Auto-refresh data every 2 minutes (stop if quota exceeded)
  useEffect(() => {
    if (timeRange > 0 && !quotaExceeded) {
      const refreshInterval = setInterval(() => {
        console.log('[Analytics] Auto-refreshing data...');
        loadData();
      }, 2 * 60 * 1000); // Update every 2 minutes
      return () => clearInterval(refreshInterval);
    }
  }, [loadData, timeRange, quotaExceeded]);

  const refreshData = useCallback(() => {
    setQuotaExceeded(false);
    loadData();
    loadRealTimeData();
  }, [loadData, loadRealTimeData]);

  const exportData = useCallback(() => {
    if (!data) return;

    const exportData = {
      ...data,
      exportDate: new Date().toISOString(),
      timeRange: `${timeRange} days`,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('تم تصدير البيانات بنجاح');
  }, [data, timeRange]);

  return {
    data,
    loading,
    error,
    realTimeVisitors,
    lastUpdated,
    refreshData,
    exportData,
  };
}; 