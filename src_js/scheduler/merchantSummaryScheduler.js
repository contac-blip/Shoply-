import { persistMerchantSummarySnapshot, scheduleMerchantSummaryJob } from '../platform/platformOperationsService.js';

export function startMerchantSummaryScheduler({ db, intervalMs = 60000, loadMetrics = async () => ({ orders: [], stockLevels: [], returnRequests: [] }) } = {}) {
  const settings = scheduleMerchantSummaryJob({ intervalMs, enabled: true });
  let isRunning = false;
  let timer = null;

  const executeJob = async () => {
    if (isRunning) {
      return;
    }

    isRunning = true;

    try {
      const metrics = await loadMetrics();
      const result = await persistMerchantSummarySnapshot(db, {
        tenantId: settings.tenantId || null,
        orders: metrics.orders || [],
        stockLevels: metrics.stockLevels || [],
        returnRequests: metrics.returnRequests || [],
      });

      if (result && result.persisted === false) {
        console.warn('Merchant summary snapshot skipped:', result.reason || 'unknown');
      }
    } catch (error) {
      console.error('Merchant summary scheduler failed:', error);
    } finally {
      isRunning = false;
    }
  };

  timer = setInterval(() => {
    executeJob();
  }, settings.intervalMs);

  const stop = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    isRunning = false;
    return true;
  };

  return {
    ...settings,
    timer,
    running: true,
    stop,
    executeJob,
  };
}

export default startMerchantSummaryScheduler;
