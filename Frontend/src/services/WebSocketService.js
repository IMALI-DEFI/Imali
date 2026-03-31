// src/services/WebSocketService.js
class WebSocketService {
    constructor() {
      this.socket = null;
      this.listeners = new Map();
      this.reconnectAttempts = 0;
      this.maxReconnectAttempts = 5;
      this.reconnectDelay = 3000;
    }
  
    connect(token) {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        return;
      }
  
      const wsUrl = `wss://api.imali-defi.com/ws?token=${token}`;
      this.socket = new WebSocket(wsUrl);
  
      this.socket.onopen = () => {
        console.log('[WebSocket] Connected');
        this.reconnectAttempts = 0;
        this.emit('connected', { status: 'connected' });
      };
  
      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit(data.type, data.payload);
        } catch (error) {
          console.error('[WebSocket] Parse error:', error);
        }
      };
  
      this.socket.onclose = () => {
        console.log('[WebSocket] Disconnected');
        this.reconnect();
      };
  
      this.socket.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        this.emit('error', error);
      };
    }
  
    reconnect() {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.log('[WebSocket] Max reconnect attempts reached');
        return;
      }
  
      setTimeout(() => {
        this.reconnectAttempts++;
        const token = localStorage.getItem('imali_token');
        if (token) {
          this.connect(token);
        }
      }, this.reconnectDelay);
    }
  
    disconnect() {
      if (this.socket) {
        this.socket.close();
        this.socket = null;
      }
    }
  
    on(event, callback) {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, new Set());
      }
      this.listeners.get(event).add(callback);
    }
  
    off(event, callback) {
      if (this.listeners.has(event)) {
        this.listeners.get(event).delete(callback);
      }
    }
  
    emit(event, data) {
      if (this.listeners.has(event)) {
        this.listeners.get(event).forEach(callback => callback(data));
      }
    }
  }
  
  export const wsService = new WebSocketService();