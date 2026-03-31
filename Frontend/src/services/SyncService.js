// src/services/SyncService.js
class SyncService {
    constructor() {
      this.syncInterval = null;
      this.syncCallbacks = new Map();
    }
  
    startAutoSync(intervalMs = 30000) {
      if (this.syncInterval) {
        clearInterval(this.syncInterval);
      }
  
      this.syncInterval = setInterval(() => {
        this.syncAll();
      }, intervalMs);
  
      console.log('[Sync] Auto-sync started every', intervalMs, 'ms');
    }
  
    stopAutoSync() {
      if (this.syncInterval) {
        clearInterval(this.syncInterval);
        this.syncInterval = null;
        console.log('[Sync] Auto-sync stopped');
      }
    }
  
    async syncAll() {
      const endpoints = [
        { key: 'user', url: '/api/me' },
        { key: 'activation', url: '/api/me/activation-status' },
        { key: 'tradingStatus', url: '/api/trading/status' },
        { key: 'integrationStatus', url: '/api/integrations/status' },
        { key: 'botStatus', url: '/api/bot/status' },
        { key: 'trades', url: '/api/sniper/trades?limit=20' },
      ];
  
      for (const endpoint of endpoints) {
        await this.sync(endpoint.key, endpoint.url);
      }
    }
  
    async sync(key, url) {
      try {
        const token = localStorage.getItem('imali_token');
        if (!token) return;
  
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
  
        if (this.syncCallbacks.has(key)) {
          this.syncCallbacks.get(key).forEach(cb => cb(data));
        }
      } catch (error) {
        console.error(`[Sync] Failed to sync ${key}:`, error);
      }
    }
  
    onSync(key, callback) {
      if (!this.syncCallbacks.has(key)) {
        this.syncCallbacks.set(key, new Set());
      }
      this.syncCallbacks.get(key).add(callback);
    }
  
    offSync(key, callback) {
      if (this.syncCallbacks.has(key)) {
        this.syncCallbacks.get(key).delete(callback);
      }
    }
  }
  
  export const syncService = new SyncService();