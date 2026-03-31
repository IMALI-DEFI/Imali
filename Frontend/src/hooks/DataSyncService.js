// src/services/DataSyncService.js
class DataSyncService {
    constructor() {
      this.pendingUpdates = new Map();
      this.lastSync = new Map();
    }
    
    async sync(key, fetchFn, options = {}) {
      const { priority = 'normal', retry = true } = options;
      
      try {
        const data = await fetchFn();
        this.lastSync.set(key, Date.now());
        this.pendingUpdates.delete(key);
        return { success: true, data };
      } catch (error) {
        if (retry) {
          this.pendingUpdates.set(key, { fetchFn, timestamp: Date.now(), priority });
          this.scheduleRetry(key);
        }
        return { success: false, error };
      }
    }
    
    scheduleRetry(key) {
      setTimeout(async () => {
        const pending = this.pendingUpdates.get(key);
        if (pending) {
          await this.sync(key, pending.fetchFn, { retry: false });
        }
      }, 5000);
    }
    
    getLastSync(key) {
      return this.lastSync.get(key);
    }
  }
  
  export const dataSync = new DataSyncService();