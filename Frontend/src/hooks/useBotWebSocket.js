// src/hooks/useBotWebSocket.js
import { useState, useEffect, useCallback, useRef } from 'react';

// Use environment variable or fallback to your server IP
const WS_URL = process.env.REACT_APP_WS_URL || 'ws://129.213.90.84:8000/ws/dashboard';

export default function useBotWebSocket() {
  const [botData, setBotData] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    console.log('[WebSocket] Connecting to:', WS_URL);
    
    // Add auth token if needed
    const token = localStorage.getItem('imali_token');
    const url = token ? `${WS_URL}?token=${token}` : WS_URL;
    
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      console.log('[WebSocket] Connected');
      setConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      
      try {
        const data = JSON.parse(event.data);
        console.log('[WebSocket] Message:', data.type);
        
        switch (data.type) {
          case 'initial_snapshot':
          case 'snapshot':
            setBotData(data.data);
            break;
            
          case 'state_change':
            setBotData(prev => ({ ...prev, ...data.data }));
            break;
            
          case 'new_trade':
            setBotData(prev => ({
              ...prev,
              active_trades: [...(prev?.active_trades || []), data.data],
              active_trade_count: (prev?.active_trade_count || 0) + 1
            }));
            break;
            
          case 'trade_closed':
            setBotData(prev => ({
              ...prev,
              active_trades: (prev?.active_trades || []).filter(t => t.id !== data.data.trade_id),
              active_trade_count: Math.max(0, (prev?.active_trade_count || 1) - 1),
              pnl_total: (prev?.pnl_total || 0) + (data.data.pnl || 0),
              pnl_today: (prev?.pnl_today || 0) + (data.data.pnl || 0)
            }));
            break;
            
          case 'heartbeat':
            setBotData(prev => ({ ...prev, ...data.data }));
            break;
            
          case 'pong':
            // Connection alive, ignore
            break;
            
          default:
            console.log('[WebSocket] Unknown message type:', data.type);
        }
      } catch (err) {
        console.error('[WebSocket] Failed to parse message:', err);
      }
    };

    ws.onclose = (event) => {
      if (!mountedRef.current) return;
      console.log('[WebSocket] Disconnected, code:', event.code);
      setConnected(false);
      
      // Attempt to reconnect after 3 seconds
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      reconnectTimerRef.current = setTimeout(() => {
        console.log('[WebSocket] Attempting to reconnect...');
        connect();
      }, 3000);
    };

    ws.onerror = (err) => {
      console.error('[WebSocket] Error:', err);
      setError('WebSocket connection failed');
    };
  }, []);

  // Send a ping to keep connection alive
  const sendPing = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ping' }));
    }
  }, []);

  // Request a fresh snapshot
  const requestSnapshot = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'request_snapshot' }));
    }
  }, []);

  // Connect on mount, cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    connect();

    // Set up ping interval (every 25 seconds)
    const pingInterval = setInterval(sendPing, 25000);

    return () => {
      mountedRef.current = false;
      clearInterval(pingInterval);
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect, sendPing]);

  return {
    botData,
    connected,
    error,
    requestSnapshot
  };
}
