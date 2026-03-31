// src/services/socketService.js
import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.connecting = false;
    this.currentToken = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.listeners = {
      // Core events
      connect: [],
      disconnect: [],
      connect_error: [],
      error: [],
      
      // Custom events
      trade: [],
      pnl_update: [],
      announcement: [],
      bot_status: [],
      referral: [],
      leaderboard_update: [],
      system_metric: [],
      subscribed: [],
      token_expired: []
    };
    
    // Store subscription status
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
   * Connect to WebSocket server
   * @param {string} token - WebSocket authentication token
   * @returns {Promise}
   */
  connect(token) {
    return new Promise((resolve, reject) => {
      if (this.socket && this.connected) {
        console.log('[SocketService] Already connected');
        resolve();
        return;
      }

      if (this.connecting) {
        console.log('[SocketService] Already connecting');
        // Wait for connection
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

      // Get WebSocket URL from environment or construct from current host
      let wsUrl = process.env.REACT_APP_WS_URL;
      
      if (!wsUrl) {
        // Auto-detect based on current protocol
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        wsUrl = `${protocol}//${host}`;
      }
      
      console.log('[SocketService] Connecting to:', wsUrl);

      try {
        // Initialize Socket.IO with Flask-SocketIO compatible configuration
        this.socket = io(wsUrl, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: this.reconnectDelay,
          reconnectionDelayMax: 5000,
          timeout: 20000,
          autoConnect: true,
          forceNew: true,
          path: '/socket.io/',
          query: { token: token },
          auth: { token: token },
          withCredentials: true
        });

        // Connection timeout handler
        const timeoutId = setTimeout(() => {
          if (!this.connected && this.connecting) {
            console.error('[SocketService] Connection timeout');
            this.connecting = false;
            reject(new Error('Connection timeout'));
          }
        }, 10000);

        // Connection event handlers
        this.socket.on('connect', () => {
          clearTimeout(timeoutId);
          console.log('[SocketService] Connected successfully');
          this.connected = true;
          this.connecting = false;
          this.reconnectAttempts = 0;
          
          // Re-subscribe to previously subscribed rooms
          this._resubscribeAll();
          
          this._emit('connect', { connected: true });
          resolve();
        });

        this.socket.on('disconnect', (reason) => {
          console.log('[SocketService] Disconnected:', reason);
          this.connected = false;
          this.connecting = false;
          this._emit('disconnect', { reason });
        });

        this.socket.on('connect_error', (error) => {
          console.error('[SocketService] Connection error:', error.message);
          this._emit('connect_error', error);
          
          // Check if token is invalid
          if (error.message === 'Invalid token' || error.message.includes('token')) {
            this._emit('token_expired', { error });
          }
          
          if (!this.connecting) {
            reject(error);
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
          this._resubscribeAll();
          this._emit('reconnect', {});
        });

        this.socket.on('reconnect_failed', () => {
          console.error('[SocketService] Reconnection failed');
          this.connecting = false;
          this._emit('reconnect_failed', {});
        });

        // Custom event handlers from server
        this.socket.on('trade', (data) => {
          console.log('[SocketService] Trade received:', data);
          this._emit('trade', data);
        });

        this.socket.on('pnl_update', (data) => {
          console.log('[SocketService] P&L update received:', data);
          this._emit('pnl_update', data);
        });

        this.socket.on('announcement', (data) => {
          console.log('[SocketService] Announcement received:', data);
          this._emit('announcement', data);
        });

        this.socket.on('bot_status', (data) => {
          console.log('[SocketService] Bot status received:', data);
          this._emit('bot_status', data);
        });

        this.socket.on('referral', (data) => {
          console.log('[SocketService] Referral event received:', data);
          this._emit('referral', data);
        });

        this.socket.on('leaderboard_update', (data) => {
          console.log('[SocketService] Leaderboard update received:', data);
          this._emit('leaderboard_update', data);
        });

        this.socket.on('system_metric', (data) => {
          console.log('[SocketService] System metric received:', data);
          this._emit('system_metric', data);
        });

        this.socket.on('subscribed', (data) => {
          console.log('[SocketService] Subscribed to:', data);
          this._emit('subscribed', data);
        });

        this.socket.on('connected', (data) => {
          console.log('[SocketService] Server confirmed connection:', data);
        });

      } catch (error) {
        console.error('[SocketService] Failed to create socket:', error);
        this.connecting = false;
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.connecting = false;
      this.currentToken = null;
      
      // Reset subscriptions
      Object.keys(this.subscriptions).forEach(key => {
        this.subscriptions[key] = false;
      });
      
      console.log('[SocketService] Disconnected manually');
    }
  }

  /**
   * Reconnect with new token
   * @param {string} newToken - New WebSocket token
   */
  async reconnect(newToken) {
    console.log('[SocketService] Reconnecting with new token...');
    this.disconnect();
    this.currentToken = newToken;
    return this.connect(newToken);
  }

  /**
   * Resubscribe to all previously subscribed rooms
   * @private
   */
  _resubscribeAll() {
    if (!this.socket || !this.connected) return;
    
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

  /**
   * Subscribe to trade updates
   */
  subscribeTrades() {
    if (this.socket && this.connected) {
      this.socket.emit('subscribe_trades', {});
      this.subscriptions.trades = true;
      console.log('[SocketService] Subscribed to trades');
    } else {
      console.warn('[SocketService] Cannot subscribe to trades - not connected');
    }
  }

  /**
   * Subscribe to P&L updates
   */
  subscribePnl() {
    if (this.socket && this.connected) {
      this.socket.emit('subscribe_pnl', {});
      this.subscriptions.pnl = true;
      console.log('[SocketService] Subscribed to P&L');
    } else {
      console.warn('[SocketService] Cannot subscribe to P&L - not connected');
    }
  }

  /**
   * Subscribe to announcements
   */
  subscribeAnnouncements() {
    if (this.socket && this.connected) {
      this.socket.emit('subscribe_announcements', {});
      this.subscriptions.announcements = true;
      console.log('[SocketService] Subscribed to announcements');
    } else {
      console.warn('[SocketService] Cannot subscribe to announcements - not connected');
    }
  }

  /**
   * Subscribe to referral events for a specific user
   * @param {string} userId - User ID to subscribe to
   */
  subscribeReferrals(userId) {
    if (this.socket && this.connected && userId) {
      this.socket.emit('subscribe_referrals', { user_id: userId });
      this.subscriptions.referrals = true;
      this.referralUserId = userId;
      console.log('[SocketService] Subscribed to referrals for user:', userId);
    } else {
      console.warn('[SocketService] Cannot subscribe to referrals - not connected or no userId');
    }
  }

  /**
   * Subscribe to leaderboard updates
   */
  subscribeLeaderboard() {
    if (this.socket && this.connected) {
      this.socket.emit('subscribe_leaderboard', {});
      this.subscriptions.leaderboard = true;
      console.log('[SocketService] Subscribed to leaderboard');
    } else {
      console.warn('[SocketService] Cannot subscribe to leaderboard - not connected');
    }
  }

  /**
   * Subscribe to system metrics (admin only)
   */
  subscribeSystemMetrics() {
    if (this.socket && this.connected) {
      this.socket.emit('subscribe_system_metrics', {});
      this.subscriptions.systemMetrics = true;
      console.log('[SocketService] Subscribed to system metrics');
    } else {
      console.warn('[SocketService] Cannot subscribe to system metrics - not connected');
    }
  }

  /**
   * Unsubscribe from a specific room
   * @param {string} room - Room name to unsubscribe from
   */
  unsubscribe(room) {
    if (this.socket && this.connected) {
      this.socket.emit('unsubscribe', { room });
      console.log('[SocketService] Unsubscribed from:', room);
      
      // Update subscription status
      switch(room) {
        case 'trades':
          this.subscriptions.trades = false;
          break;
        case 'pnl':
          this.subscriptions.pnl = false;
          break;
        case 'announcements':
          this.subscriptions.announcements = false;
          break;
        case 'referrals':
          this.subscriptions.referrals = false;
          break;
        case 'leaderboard':
          this.subscriptions.leaderboard = false;
          break;
        case 'system_metrics':
          this.subscriptions.systemMetrics = false;
          break;
        default:
          break;
      }
    }
  }

  // ============= Event Listener Registration Methods =============

  onConnect(callback) {
    return this._addListener('connect', callback);
  }

  onDisconnect(callback) {
    return this._addListener('disconnect', callback);
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

  /**
   * Add event listener
   * @private
   */
  _addListener(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    
    // Return unsubscribe function
    return () => this._removeListener(event, callback);
  }

  /**
   * Remove event listener
   * @private
   */
  _removeListener(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  /**
   * Emit event to all listeners
   * @private
   */
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

  // ============= Utility Methods =============

  /**
   * Check if socket is connected
   * @returns {boolean}
   */
  isConnected() {
    return this.connected;
  }

  /**
   * Get the current socket instance
   * @returns {object|null}
   */
  getSocket() {
    return this.socket;
  }

  /**
   * Get connection status
   * @returns {object}
   */
  getStatus() {
    return {
      connected: this.connected,
      connecting: this.connecting,
      token: this.currentToken ? `${this.currentToken.substring(0, 20)}...` : null,
      subscriptions: { ...this.subscriptions },
      reconnectAttempts: this.reconnectAttempts
    };
  }

  /**
   * Manually emit an event to the server
   * @param {string} event - Event name
   * @param {object} data - Event data
   */
  emit(event, data) {
    if (this.socket && this.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('[SocketService] Cannot emit event - not connected');
    }
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
