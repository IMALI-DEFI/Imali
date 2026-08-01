// src/hooks/useAutoSync.js
import { useEffect, useState, useCallback } from 'react';
import { syncService } from '../services/SyncService';
import { wsService } from '../services/WebSocketService';

export const useAutoSync = (key, url, enabled = true) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    try {
      const token = localStorage.getItem('imali_token');
      if (!token) return;

      setLoading(true);
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [url, enabled]);

  useEffect(() => {
    if (!enabled) return;

    // Initial fetch
    fetchData();

    // Setup auto-sync
    const handleSync = (newData) => {
      setData(newData);
    };

    syncService.onSync(key, handleSync);

    return () => {
      syncService.offSync(key, handleSync);
    };
  }, [key, enabled, fetchData]);

  const refresh = useCallback(() => {
    return fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh };
};

// WebSocket hook for real-time updates
export const useWebSocket = (eventType, callback) => {
  useEffect(() => {
    if (!callback) return;

    wsService.on(eventType, callback);

    return () => {
      wsService.off(eventType, callback);
    };
  }, [eventType, callback]);
};