class DataSyncService {
  constructor() {
    this.pendingUpdates = new Map();
    this.lastSync = new Map();
    this.inFlight = new Map();
    this.retryTimers = new Map();
  }

  async sync(key, fetchFn, options = {}) {
    const { priority = "normal", retry = true, retryDelay = 5000 } = options;

    if (this.inFlight.has(key)) {
      return this.inFlight.get(key);
    }

    const promise = (async () => {
      try {
        const data = await fetchFn();
        this.lastSync.set(key, Date.now());
        this.pendingUpdates.delete(key);
        this.clearRetry(key);
        return { success: true, data };
      } catch (error) {
        if (retry) {
          this.pendingUpdates.set(key, {
            fetchFn,
            timestamp: Date.now(),
            priority,
            retryDelay,
          });
          this.scheduleRetry(key, retryDelay);
        }
        return { success: false, error };
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }

  scheduleRetry(key, delay = 5000) {
    this.clearRetry(key);

    const timer = setTimeout(async () => {
      const pending = this.pendingUpdates.get(key);
      if (pending) {
        await this.sync(key, pending.fetchFn, {
          retry: false,
          priority: pending.priority,
          retryDelay: pending.retryDelay,
        });
      }
    }, delay);

    this.retryTimers.set(key, timer);
  }

  clearRetry(key) {
    const timer = this.retryTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.retryTimers.delete(key);
    }
  }

  getLastSync(key) {
    return this.lastSync.get(key) || null;
  }

  cancel(key) {
    this.pendingUpdates.delete(key);
    this.clearRetry(key);
    this.inFlight.delete(key);
  }

  clearAll() {
    for (const key of this.retryTimers.keys()) {
      this.clearRetry(key);
    }
    this.pendingUpdates.clear();
    this.inFlight.clear();
  }
}

export const dataSync = new DataSyncService();