import { io } from "socket.io-client";

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.connecting = false;
    this.currentToken = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.reconnectDelay = 1000;
    this.wsAvailable = true;
    this.fallbackMode = false;
    this.connectionTimeout = null;
    this.referralUserId = null;

    this.listeners = {
      connect: [],
      disconnect: [],
      connect_error: [],
      error: [],
      connected: [],
      disconnected: [],
      trade: [],
      pnl_update: [],
      announcement: [],
      bot_status: [],
      referral: [],
      leaderboard_update: [],
      system_metric: [],
      subscribed: [],
      token_expired: [],
      reconnect_attempt: [],
      reconnect: [],
      reconnect_failed: [],
    };

    this.subscriptions = {
      trades: false,
      pnl: false,
      announcements: false,
      referrals: false,
      leaderboard: false,
      systemMetrics: false,
    };
  }

  getServerUrl() {
    return (
      process.env.REACT_APP_WS_URL ||
      process.env.REACT_APP_API_BASE_URL ||
      "https://api.imali-defi.com"
    );
  }

  clearConnectionTimeout() {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  connect(token) {
    return new Promise((resolve) => {
      if (this.fallbackMode) {
        console.log("[SocketService] Running in fallback mode - WebSocket disabled");
        this._emit("connected", { connected: false, fallback: true });
        resolve();
        return;
      }

      if (this.socket && this.connected) {
        console.log("[SocketService] Already connected");
        resolve();
        return;
      }

      if (this.connecting) {
        console.log("[SocketService] Already connecting");
        resolve();
        return;
      }

      this.currentToken = token || null;
      this.connecting = true;
      this.reconnectAttempts = 0;

      const serverUrl = this.getServerUrl();
      console.log("[SocketService] Attempting to connect to:", serverUrl);

      try {
        if (this.socket) {
          this.socket.removeAllListeners();
          this.socket.disconnect();
          this.socket = null;
        }

        this.socket = io(serverUrl, {
          path: "/socket.io/",
          transports: ["websocket", "polling"],
          withCredentials: true,
          autoConnect: true,
          forceNew: true,
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: this.reconnectDelay,
          reconnectionDelayMax: 5000,
          timeout: 10000,
          auth: token ? { token } : {},
          query: token ? { token } : {},
        });

        this.connectionTimeout = setTimeout(() => {
          if (this.connecting && !this.connected) {
            console.log("[SocketService] Connection timeout - switching to fallback mode");
            this._enableFallbackMode();
            this._emit("connected", { connected: false, fallback: true });
            resolve();
          }
        }, 5000);

        this.socket.on("connect", () => {
          this.clearConnectionTimeout();
          console.log("[SocketService] Connected successfully");

          this.connected = true;
          this.connecting = false;
          this.reconnectAttempts = 0;
          this.fallbackMode = false;
          this.wsAvailable = true;

          this._resubscribeAll();
          this._emit("connect", { connected: true });
          this._emit("connected", { connected: true });
          resolve();
        });

        this.socket.on("disconnect", (reason) => {
          console.log("[SocketService] Disconnected:", reason);
          this.connected = false;
          this.connecting = false;

          this._emit("disconnect", { reason });
          this._emit("disconnected", { reason });

          if (reason === "io server disconnect") {
            this._enableFallbackMode();
          }
        });

        this.socket.on("connect_error", (error) => {
          console.error("[SocketService] Connection error:", error?.message || error);

          this._emit("connect_error", error);

          this.reconnectAttempts += 1;

          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log("[SocketService] Max reconnection attempts reached - switching to fallback mode");
            this._enableFallbackMode();
            this._emit("connected", { connected: false, fallback: true });
            resolve();
          }
        });

        this.socket.on("error", (error) => {
          console.error("[SocketService] Socket error:", error);
          this._emit("error", error);
        });

        this.socket.io.on("reconnect_attempt", (attemptNumber) => {
          console.log("[SocketService] Reconnect attempt:", attemptNumber);
          this.reconnectAttempts = attemptNumber;
          this._emit("reconnect_attempt", { attempt: attemptNumber });
        });

        this.socket.io.on("reconnect", (attemptNumber) => {
          console.log("[SocketService] Reconnected");
          this.connected = true;
          this.connecting = false;
          this.fallbackMode = false;
          this.reconnectAttempts = 0;

          this._resubscribeAll();
          this._emit("reconnect", { attempt: attemptNumber });
          this._emit("connected", { connected: true, reconnected: true });
        });

        this.socket.io.on("reconnect_failed", () => {
          console.error("[SocketService] Reconnection failed - switching to fallback mode");
          this._enableFallbackMode();
          this._emit("reconnect_failed", {});
        });

        this.socket.on("trade", (data) => this._emit("trade", data));
        this.socket.on("pnl_update", (data) => this._emit("pnl_update", data));
        this.socket.on("announcement", (data) => this._emit("announcement", data));
        this.socket.on("bot_status", (data) => this._emit("bot_status", data));
        this.socket.on("referral", (data) => this._emit("referral", data));
        this.socket.on("leaderboard_update", (data) => this._emit("leaderboard_update", data));
        this.socket.on("system_metric", (data) => this._emit("system_metric", data));
        this.socket.on("subscribed", (data) => this._emit("subscribed", data));
        this.socket.on("token_expired", (data) => this._emit("token_expired", data));
      } catch (error) {
        console.error("[SocketService] Failed to create socket:", error);
        this.clearConnectionTimeout();
        this._enableFallbackMode();
        this._emit("connected", { connected: false, fallback: true });
        resolve();
      }
    });
  }

  _enableFallbackMode() {
    this.clearConnectionTimeout();
    this.fallbackMode = true;
    this.wsAvailable = false;
    this.connected = false;
    this.connecting = false;

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    console.log("[SocketService] Entering fallback mode - using REST API polling");
  }

  disconnect() {
    this.clearConnectionTimeout();

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.connected = false;
    this.connecting = false;
    this.currentToken = null;
    this.fallbackMode = false;
    this.referralUserId = null;

    Object.keys(this.subscriptions).forEach((key) => {
      this.subscriptions[key] = false;
    });

    console.log("[SocketService] Disconnected manually");
  }

  reconnect(newToken) {
    if (this.fallbackMode) {
      console.log("[SocketService] In fallback mode, attempting to re-enable WebSocket");
      this.fallbackMode = false;
      this.wsAvailable = true;
    }

    console.log("[SocketService] Reconnecting...");
    this.disconnect();

    if (newToken) {
      this.currentToken = newToken;
    }

    return this.connect(this.currentToken);
  }

  _resubscribeAll() {
    if (!this.socket || !this.connected || this.fallbackMode) return;

    if (this.subscriptions.trades) {
      this.socket.emit("subscribe_trades", {});
    }
    if (this.subscriptions.pnl) {
      this.socket.emit("subscribe_pnl", {});
    }
    if (this.subscriptions.announcements) {
      this.socket.emit("subscribe_announcements", {});
    }
    if (this.subscriptions.referrals && this.referralUserId) {
      this.socket.emit("subscribe_referrals", { user_id: this.referralUserId });
    }
    if (this.subscriptions.leaderboard) {
      this.socket.emit("subscribe_leaderboard", {});
    }
    if (this.subscriptions.systemMetrics) {
      this.socket.emit("subscribe_system_metrics", {});
    }
  }

  subscribeTrades() {
    this.subscriptions.trades = true;
    if (this.socket && this.connected && !this.fallbackMode) {
      this.socket.emit("subscribe_trades", {});
    }
  }

  subscribePnl() {
    this.subscriptions.pnl = true;
    if (this.socket && this.connected && !this.fallbackMode) {
      this.socket.emit("subscribe_pnl", {});
    }
  }

  subscribeAnnouncements() {
    this.subscriptions.announcements = true;
    if (this.socket && this.connected && !this.fallbackMode) {
      this.socket.emit("subscribe_announcements", {});
    }
  }

  subscribeReferrals(userId) {
    if (!userId) return;
    this.subscriptions.referrals = true;
    this.referralUserId = userId;

    if (this.socket && this.connected && !this.fallbackMode) {
      this.socket.emit("subscribe_referrals", { user_id: userId });
    }
  }

  subscribeLeaderboard() {
    this.subscriptions.leaderboard = true;
    if (this.socket && this.connected && !this.fallbackMode) {
      this.socket.emit("subscribe_leaderboard", {});
    }
  }

  subscribeSystemMetrics() {
    this.subscriptions.systemMetrics = true;
    if (this.socket && this.connected && !this.fallbackMode) {
      this.socket.emit("subscribe_system_metrics", {});
    }
  }

  onConnect(callback) {
    return this._addListener("connect", callback);
  }

  onConnected(callback) {
    return this._addListener("connected", callback);
  }

  onDisconnect(callback) {
    return this._addListener("disconnect", callback);
  }

  onDisconnected(callback) {
    return this._addListener("disconnected", callback);
  }

  onConnectError(callback) {
    return this._addListener("connect_error", callback);
  }

  onError(callback) {
    return this._addListener("error", callback);
  }

  onTrade(callback) {
    return this._addListener("trade", callback);
  }

  onPnlUpdate(callback) {
    return this._addListener("pnl_update", callback);
  }

  onAnnouncement(callback) {
    return this._addListener("announcement", callback);
  }

  onBotStatus(callback) {
    return this._addListener("bot_status", callback);
  }

  onReferralEvent(callback) {
    return this._addListener("referral", callback);
  }

  onLeaderboardUpdate(callback) {
    return this._addListener("leaderboard_update", callback);
  }

  onSystemMetric(callback) {
    return this._addListener("system_metric", callback);
  }

  onSubscribed(callback) {
    return this._addListener("subscribed", callback);
  }

  onTokenExpired(callback) {
    return this._addListener("token_expired", callback);
  }

  onReconnectAttempt(callback) {
    return this._addListener("reconnect_attempt", callback);
  }

  onReconnect(callback) {
    return this._addListener("reconnect", callback);
  }

  onReconnectFailed(callback) {
    return this._addListener("reconnect_failed", callback);
  }

  _addListener(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }

    this.listeners[event].push(callback);

    return () => this._removeListener(event, callback);
  }

  _removeListener(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
  }

  _emit(event, data) {
    if (!this.listeners[event]) return;

    this.listeners[event].forEach((callback) => {
      try {
        callback(data);
      } catch (err) {
        console.error(`[SocketService] Error in ${event} listener:`, err);
      }
    });
  }

  isConnected() {
    return this.connected && !this.fallbackMode;
  }

  isFallbackMode() {
    return this.fallbackMode;
  }

  getSocket() {
    return this.socket;
  }

  getStatus() {
    return {
      connected: this.connected,
      connecting: this.connecting,
      fallbackMode: this.fallbackMode,
      wsAvailable: this.wsAvailable,
      token: this.currentToken ? `${this.currentToken.substring(0, 20)}...` : null,
      subscriptions: { ...this.subscriptions },
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  emit(event, data) {
    if (this.socket && this.connected && !this.fallbackMode) {
      this.socket.emit(event, data);
    } else {
      console.warn("[SocketService] Cannot emit event - not connected or in fallback mode");
    }
  }
}

const socketService = new SocketService();
export default socketService;