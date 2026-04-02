const API_BASE =
  (process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com").replace(/\/+$/, "");

class SyncService {
  constructor() {
    this.syncInterval = null;
    this.syncCallbacks = new Map();
    this.isSyncing = false;
  }

  startAutoSync(intervalMs = 30000) {
    this.stopAutoSync();

    this.syncInterval = setInterval(() => {
      this.syncAll();
    }, intervalMs);

    console.log("[Sync] Auto-sync started every", intervalMs, "ms");
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log("[Sync] Auto-sync stopped");
    }
  }

  async syncAll() {
    if (this.isSyncing) return;

    this.isSyncing = true;

    const endpoints = [
      { key: "user", url: `${API_BASE}/api/me` },
      { key: "activation", url: `${API_BASE}/api/me/activation-status` },
      { key: "tradingStatus", url: `${API_BASE}/api/trading/status` },
      { key: "integrationStatus", url: `${API_BASE}/api/integrations/status` },
      { key: "botStatus", url: `${API_BASE}/api/bot/status` },
      { key: "trades", url: `${API_BASE}/api/sniper/trades?limit=20` },
    ];

    try {
      await Promise.all(endpoints.map((endpoint) => this.sync(endpoint.key, endpoint.url)));
    } finally {
      this.isSyncing = false;
    }
  }

  async sync(key, url) {
    try {
      const token = localStorage.getItem("imali_token");
      if (!token) return { success: false, error: "No token" };

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`[${response.status}] ${text.slice(0, 200)}`);
      }

      const data = await response.json();

      if (this.syncCallbacks.has(key)) {
        this.syncCallbacks.get(key).forEach((cb) => {
          try {
            cb(data);
          } catch (err) {
            console.error(`[Sync] Callback failed for ${key}:`, err);
          }
        });
      }

      return { success: true, data };
    } catch (error) {
      console.error(`[Sync] Failed to sync ${key}:`, error);
      return { success: false, error };
    }
  }

  onSync(key, callback) {
    if (!this.syncCallbacks.has(key)) {
      this.syncCallbacks.set(key, new Set());
    }

    this.syncCallbacks.get(key).add(callback);

    return () => this.offSync(key, callback);
  }

  offSync(key, callback) {
    if (!this.syncCallbacks.has(key)) return;

    this.syncCallbacks.get(key).delete(callback);

    if (this.syncCallbacks.get(key).size === 0) {
      this.syncCallbacks.delete(key);
    }
  }

  clearAllListeners() {
    this.syncCallbacks.clear();
  }

  destroy() {
    this.stopAutoSync();
    this.clearAllListeners();
  }
}

export const syncService = new SyncService();