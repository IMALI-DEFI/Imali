// src/hooks/useBotWebSocket.js
import { useState, useEffect, useCallback, useRef } from 'react';

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

    if (wsRef.current) {
      wsRef.current.close();
    }

    console.log('[WebSocket] Connecting to:', WS_URL);
    
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
            
          case 'heartbeat':
            setBotData(prev => ({ ...prev, ...data.data }));
            break;
            
          case 'pong':
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

  const sendPing = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ping' }));
    }
  }, []);

  const requestSnapshot = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'request_snapshot' }));
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();

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
