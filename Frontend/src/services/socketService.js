// src/services/socketService.js
import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.connecting = false;
    this.currentToken = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3; // Reduced for faster fallback
    this.reconnectDelay = 1000;
    this.wsAvailable = true; // Track if WebSocket is available
    this.fallbackMode = false; // Track if we're in fallback mode
    
    // Event listeners
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
      reconnect_failed: []
    };
    
    this.subscriptions = {
      trades: false,
      pnl: false,
      announcements: false,
      referrals: false,
      leaderboard: false,
      systemMetrics: false
    };
  }

  /**
   * Connect to WebSocket server with fallback
   */
  connect(token) {
    return new Promise((resolve, reject) => {
      // If already in fallback mode, resolve immediately
      if (this.fallbackMode) {
        console.log('[SocketService] Running in fallback mode - WebSocket disabled');
        this._emit('connected', { connected: false, fallback: true });
        resolve();
        return;
      }

      if (this.socket && this.connected) {
        console.log('[SocketService] Already connected');
        resolve();
        return;
      }

      if (this.connecting) {
        console.log('[SocketService] Already connecting');
        const checkInterval = setInterval(() => {
          if (this.connected) {
            clearInterval(checkInterval);
            resolve();
          } else if (!this.connecting) {
            clearInterval(checkInterval);
            reject(new Error('Connection cancelled'));
          }
        }, 100);
        return;
      }

      this.currentToken = token;
      this.connecting = true;
      this.reconnectAttempts = 0;

      // Get WebSocket URL
      let wsUrl = process.env.REACT_APP_WS_URL;
      
      if (!wsUrl) {
        // Use relative URL for same-origin WebSocket
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        wsUrl = `${protocol}//${host}`;
      }
      
      console.log('[SocketService] Attempting to connect to:', wsUrl);

      // Set a connection timeout
      const connectionTimeout = setTimeout(() => {
        if (this.connecting) {
          console.log('[SocketService] Connection timeout - switching to fallback mode');
          this._enableFallbackMode();
          this.connecting = false;
          this._emit('connected', { connected: false, fallback: true });
          resolve(); // Resolve anyway to not break the app
        }
      }, 5000);

      try {
        this.socket = io(wsUrl, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: this.reconnectDelay,
          reconnectionDelayMax: 5000,
          timeout: 10000,
          autoConnect: true,
          forceNew: true,
          path: '/socket.io/',
          query: { token: token },
          auth: { token: token },
          withCredentials: true
        });

        // Connection event handlers
        this.socket.on('connect', () => {
          clearTimeout(connectionTimeout);
          console.log('[SocketService] Connected successfully');
          this.connected = true;
          this.connecting = false;
          this.reconnectAttempts = 0;
          this.fallbackMode = false;
          this.wsAvailable = true;
          
          this._resubscribeAll();
          this._emit('connect', { connected: true });
          this._emit('connected', { connected: true });
          resolve();
        });

        this.socket.on('disconnect', (reason) => {
          console.log('[SocketService] Disconnected:', reason);
          this.connected = false;
          this.connecting = false;
          this._emit('disconnect', { reason });
          this._emit('disconnected', { reason });
          
          // Don't retry on certain disconnects
          if (reason === 'io server disconnect') {
            this._enableFallbackMode();
          }
        });

        this.socket.on('connect_error', (error) => {
          console.error('[SocketService] Connection error:', error.message);
          this._emit('connect_error', error);
          
          // Don't immediately fail - let Socket.IO try to reconnect
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('[SocketService] Max reconnection attempts reached - switching to fallback mode');
            this._enableFallbackMode();
            this.connecting = false;
            if (!this.connected) {
              this._emit('connected', { connected: false, fallback: true });
              resolve(); // Resolve with fallback mode
            }
          }
        });

        this.socket.on('error', (error) => {
          console.error('[SocketService] Socket error:', error);
          this._emit('error', error);
        });

        // Reconnection handlers
        this.socket.on('reconnect_attempt', (attemptNumber) => {
          console.log('[SocketService] Reconnect attempt:', attemptNumber);
          this.reconnectAttempts = attemptNumber;
          this._emit('reconnect_attempt', { attempt: attemptNumber });
        });

        this.socket.on('reconnect', () => {
          console.log('[SocketService] Reconnected');
          this.connected = true;
          this.connecting = false;
          this.fallbackMode = false;
          this._resubscribeAll();
          this._emit('reconnect', {});
          this._emit('connected', { connected: true, reconnected: true });
        });

        this.socket.on('reconnect_failed', () => {
          console.error('[SocketService] Reconnection failed - switching to fallback mode');
          this._enableFallbackMode();
          this.connecting = false;
        });

        // Custom event handlers
        this.socket.on('trade', (data) => this._emit('trade', data));
        this.socket.on('pnl_update', (data) => this._emit('pnl_update', data));
        this.socket.on('announcement', (data) => this._emit('announcement', data));
        this.socket.on('bot_status', (data) => this._emit('bot_status', data));
        this.socket.on('referral', (data) => this._emit('referral', data));
        this.socket.on('leaderboard_update', (data) => this._emit('leaderboard_update', data));
        this.socket.on('system_metric', (data) => this._emit('system_metric', data));
        this.socket.on('subscribed', (data) => this._emit('subscribed', data));

      } catch (error) {
        console.error('[SocketService] Failed to create socket:', error);
        this._enableFallbackMode();
        this.connecting = false;
        clearTimeout(connectionTimeout);
        this._emit('connected', { connected: false, fallback: true });
        resolve(); // Resolve with fallback mode
      }
    });
  }

  /**
   * Enable fallback mode (WebSocket disabled, use REST API polling)
   */
  _enableFallbackMode() {
    this.fallbackMode = true;
    this.wsAvailable = false;
    this.connected = false;
    this.connecting = false;
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    console.log('[SocketService] Entering fallback mode - using REST API polling');
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connected = false;
    this.connecting = false;
    this.currentToken = null;
    this.fallbackMode = false;
    
    Object.keys(this.subscriptions).forEach(key => {
      this.subscriptions[key] = false;
    });
    
    console.log('[SocketService] Disconnected manually');
  }

  reconnect(newToken) {
    if (this.fallbackMode) {
      console.log('[SocketService] In fallback mode, attempting to re-enable WebSocket');
      this.fallbackMode = false;
      this.wsAvailable = true;
    }
    
    console.log('[SocketService] Reconnecting...');
    this.disconnect();
    if (newToken) {
      this.currentToken = newToken;
    }
    return this.connect(this.currentToken);
  }

  _resubscribeAll() {
    if (!this.socket || !this.connected || this.fallbackMode) return;
    
    if (this.subscriptions.trades) {
      this.socket.emit('subscribe_trades', {});
    }
    if (this.subscriptions.pnl) {
      this.socket.emit('subscribe_pnl', {});
    }
    if (this.subscriptions.announcements) {
      this.socket.emit('subscribe_announcements', {});
    }
    if (this.subscriptions.referrals && this.referralUserId) {
      this.socket.emit('subscribe_referrals', { user_id: this.referralUserId });
    }
    if (this.subscriptions.leaderboard) {
      this.socket.emit('subscribe_leaderboard', {});
    }
    if (this.subscriptions.systemMetrics) {
      this.socket.emit('subscribe_system_metrics', {});
    }
  }

  // Subscription methods with fallback awareness
  subscribeTrades() {
    this.subscriptions.trades = true;
    if (this.socket && this.connected && !this.fallbackMode) {
      this.socket.emit('subscribe_trades', {});
      console.log('[SocketService] Subscribed to trades');
    } else {
      console.log('[SocketService] Trades subscription stored (will use fallback)');
    }
  }

  subscribePnl() {
    this.subscriptions.pnl = true;
    if (this.socket && this.connected && !this.fallbackMode) {
      this.socket.emit('subscribe_pnl', {});
      console.log('[SocketService] Subscribed to P&L');
    } else {
      console.log('[SocketService] P&L subscription stored (will use fallback)');
    }
  }

  subscribeAnnouncements() {
    this.subscriptions.announcements = true;
    if (this.socket && this.connected && !this.fallbackMode) {
      this.socket.emit('subscribe_announcements', {});
      console.log('[SocketService] Subscribed to announcements');
    } else {
      console.log('[SocketService] Announcements subscription stored (will use fallback)');
    }
  }

  subscribeReferrals(userId) {
    if (userId) {
      this.subscriptions.referrals = true;
      this.referralUserId = userId;
      if (this.socket && this.connected && !this.fallbackMode) {
        this.socket.emit('subscribe_referrals', { user_id: userId });
        console.log('[SocketService] Subscribed to referrals for user:', userId);
      } else {
        console.log('[SocketService] Referrals subscription stored (will use fallback)');
      }
    }
  }

  subscribeLeaderboard() {
    this.subscriptions.leaderboard = true;
    if (this.socket && this.connected && !this.fallbackMode) {
      this.socket.emit('subscribe_leaderboard', {});
      console.log('[SocketService] Subscribed to leaderboard');
    } else {
      console.log('[SocketService] Leaderboard subscription stored (will use fallback)');
    }
  }

  subscribeSystemMetrics() {
    this.subscriptions.systemMetrics = true;
    if (this.socket && this.connected && !this.fallbackMode) {
      this.socket.emit('subscribe_system_metrics', {});
      console.log('[SocketService] Subscribed to system metrics');
    } else {
      console.log('[SocketService] System metrics subscription stored (will use fallback)');
    }
  }

  // Event listener registration methods
  onConnect(callback) {
    return this._addListener('connect', callback);
  }

  onConnected(callback) {
    return this._addListener('connected', callback);
  }

  onDisconnect(callback) {
    return this._addListener('disconnect', callback);
  }

  onDisconnected(callback) {
    return this._addListener('disconnected', callback);
  }

  onConnectError(callback) {
    return this._addListener('connect_error', callback);
  }

  onError(callback) {
    return this._addListener('error', callback);
  }

  onTrade(callback) {
    return this._addListener('trade', callback);
  }

  onPnlUpdate(callback) {
    return this._addListener('pnl_update', callback);
  }

  onAnnouncement(callback) {
    return this._addListener('announcement', callback);
  }

  onBotStatus(callback) {
    return this._addListener('bot_status', callback);
  }

  onReferralEvent(callback) {
    return this._addListener('referral', callback);
  }

  onLeaderboardUpdate(callback) {
    return this._addListener('leaderboard_update', callback);
  }

  onSystemMetric(callback) {
    return this._addListener('system_metric', callback);
  }

  onSubscribed(callback) {
    return this._addListener('subscribed', callback);
  }

  onTokenExpired(callback) {
    return this._addListener('token_expired', callback);
  }

  onReconnectAttempt(callback) {
    return this._addListener('reconnect_attempt', callback);
  }

  onReconnect(callback) {
    return this._addListener('reconnect', callback);
  }

  onReconnectFailed(callback) {
    return this._addListener('reconnect_failed', callback);
  }

  _addListener(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => this._removeListener(event, callback);
  }

  _removeListener(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  _emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (err) {
          console.error(`[SocketService] Error in ${event} listener:`, err);
        }
      });
    }
  }

  // Utility methods
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
      reconnectAttempts: this.reconnectAttempts
    };
  }

  emit(event, data) {
    if (this.socket && this.connected && !this.fallbackMode) {
      this.socket.emit(event, data);
    } else {
      console.warn('[SocketService] Cannot emit event - not connected or in fallback mode');
    }
  }
}

const socketService = new SocketService();
export default socketService;
