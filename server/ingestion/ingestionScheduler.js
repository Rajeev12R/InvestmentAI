/**
 * Ingestion Scheduler Abstraction.
 * Supports manual, periodic, and test-driven ingestion runs.
 */
class IngestionScheduler {
  constructor() {
    this.jobs = new Map();
    this.statusLogs = [];
    this.isRunning = false;
  }

  logStatus(message, details = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      message,
      details
    };
    this.statusLogs.unshift(entry);
    if (this.statusLogs.length > 50) this.statusLogs.pop();
    return entry;
  }

  getStatusLogs(ticker = null) {
    if (ticker) {
      return this.statusLogs.filter(l => l.details?.ticker === ticker.toUpperCase());
    }
    return this.statusLogs;
  }

  startPeriodicSchedule(intervalMs = 60000, taskFn = null) {
    if (this.isRunning) return;
    this.isRunning = true;
    this.logStatus('Periodic Ingestion Scheduler started (Development Mode)', { intervalMs });

    if (taskFn && typeof taskFn === 'function') {
      const intervalId = setInterval(async () => {
        try {
          await taskFn();
        } catch (err) {
          this.logStatus('Scheduled ingestion run error', { error: err.message });
        }
      }, intervalMs);

      this.jobs.set('DEFAULT_PERIODIC', intervalId);
    }
  }

  stopSchedule() {
    if (!this.isRunning) return;
    for (const [, id] of this.jobs.entries()) {
      clearInterval(id);
    }
    this.jobs.clear();
    this.isRunning = false;
    this.logStatus('Periodic Ingestion Scheduler stopped');
  }
}

export const ingestionScheduler = new IngestionScheduler();
