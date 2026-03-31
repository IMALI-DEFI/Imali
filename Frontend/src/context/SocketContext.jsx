// src/context/SocketContext.jsx
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import socketService from '../services/socketService';
import { useAuth } from './AuthContext';

// Create and export the context
export const SocketContext = createContext(null);

// Main hook that throws if used outside provider
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

// Safe hook that returns mock data instead of throwing
export const useSafeSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    console.warn('useSafeSocket used outside of SocketProvider - returning mock');
    return {
      isConnected: false,
      isConnecting: false,
      connectionError: null,
      reconnect: () => {},
      socket: null,
      lastTrade: null,
      lastPnlUpdate: null,
      trades: [],
      announcements: [],
      liveStats: {
        totalTrades: 0,
        totalPnl: 0,
        activeBots: 0,
        winRate: 0,
        wins: 0,
        losses: 0,
        totalReferrals: 0,
        totalRewardsPaid: 0,
        activeUsers: 0
      },
      botStatuses: [],
      leaderboard: [],
      referralEvents: [],
      systemMetrics: { cpu: 0, memory: 0, active_users: 0, tps: 0 },
      subscribeToTrades: () => {},
      subscribeToPnl: () => {},
      subscribeToAnnouncements: () => {},
      subscribeToReferrals: () => {},
      subscribeToLeaderboard: () => {},
      subscribeToSystemMetrics: () => {},
      clearAnnouncements: () => {},
      clearTrades: () => {},
      clearReferralEvents: () => {}
    };
  }
  return context;
};

export function SocketProvider({ children }) {
  const { token, refreshWebSocketToken } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  
  // Live data states
  const [lastTrade, setLastTrade] = useState(null);
  const [lastPnlUpdate, setLastPnlUpdate] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [trades, setTrades] = useState([]);
  const [liveStats, setLiveStats] = useState({
    totalTrades: 0,
    totalPnl: 0,
    activeBots: 0,
    winRate: 0,
    wins: 0,
    losses: 0,
    totalReferrals: 0,
    totalRewardsPaid: 0,
    activeUsers: 0
  });
  
  const [botStatuses, setBotStatuses] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [referralEvents, setReferralEvents] = useState([]);
  const [systemMetrics, setSystemMetrics] = useState({
    cpu: 0,
    memory: 0,
    active_users: 0,
    tps: 0,
    timestamp: null
  });
  
  const mountedRef = useRef(true);
  const reconnectTimeoutRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // Initialize WebSocket connection
  const initializeSocket = useCallback(async () => {
    if (!token) {
      console.log('[SocketContext] No token available, skipping connection');
      return;
    }

    if (isConnected) {
      console.log('[SocketContext] Already connected');
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);

    try {
      console.log('[SocketContext] Initializing WebSocket connection...');
      await socketService.connect(token);
      
      if (mountedRef.current) {
        setIsConnected(true);
        setIsConnecting(false);
        console.log('[SocketContext] WebSocket connected successfully');
      }
    } catch (error) {
      console.error('[SocketContext] Connection failed:', error);
      if (mountedRef.current) {
        setIsConnected(false);
        setIsConnecting(false);
        setConnectionError(error.message || 'Connection failed');
        
        reconnectTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current && !isConnected && token) {
            console.log('[SocketContext] Attempting reconnection...');
            initializeSocket();
          }
        }, 5000);
      }
    }
  }, [token, isConnected]);

  // Set up event listeners
  useEffect(() => {
    if (!socketService) return;

    const unsubscribeTrade = socketService.onTrade((trade) => {
      if (mountedRef.current) {
        setLastTrade(trade);
        setTrades(prev => [trade, ...prev].slice(0, 500));
        setLiveStats(prev => ({
          ...prev,
          totalTrades: prev.totalTrades + 1,
          totalPnl: prev.totalPnl + (trade.pnl || 0),
          wins: prev.wins + ((trade.pnl || 0) > 0 ? 1 : 0),
          losses: prev.losses + ((trade.pnl || 0) < 0 ? 1 : 0),
          winRate: (prev.wins + ((trade.pnl || 0) > 0 ? 1 : 0)) / 
                   (prev.totalTrades + 1) * 100
        }));
      }
    });

    const unsubscribePnl = socketService.onPnlUpdate((pnlData) => {
      if (mountedRef.current) {
        setLastPnlUpdate(pnlData);
        setLiveStats(prev => ({
          ...prev,
          totalPnl: pnlData.total_pnl || prev.totalPnl
        }));
      }
    });

    const unsubscribeAnnouncement = socketService.onAnnouncement((announcement) => {
      if (mountedRef.current) {
        setAnnouncements(prev => [announcement, ...prev].slice(0, 10));
        if (announcement.priority !== 'critical') {
          setTimeout(() => {
            setAnnouncements(prev => prev.filter(a => a.id !== announcement.id));
          }, 30000);
        }
      }
    });

    const unsubscribeBotStatus = socketService.onBotStatus((status) => {
      if (mountedRef.current) {
        setBotStatuses(status.bots || []);
        setLiveStats(prev => ({
          ...prev,
          activeBots: status.active_bots || 0,
          activeUsers: status.active_users || prev.activeUsers
        }));
      }
    });

    const unsubscribeReferral = socketService.onReferralEvent((event) => {
      if (mountedRef.current) {
        setReferralEvents(prev => [event, ...prev].slice(0, 50));
        setLiveStats(prev => ({
          ...prev,
          totalReferrals: prev.totalReferrals + 1,
          totalRewardsPaid: prev.totalRewardsPaid + (event.reward || 0)
        }));
      }
    });

    const unsubscribeLeaderboard = socketService.onLeaderboardUpdate((data) => {
      if (mountedRef.current) {
        setLeaderboard(data.leaderboard || []);
      }
    });

    const unsubscribeSystemMetric = socketService.onSystemMetric((metric) => {
      if (mountedRef.current) {
        setSystemMetrics({
          cpu: metric.cpu || 0,
          memory: metric.memory || 0,
          active_users: metric.active_users || 0,
          tps: metric.tps || 0,
          timestamp: new Date()
        });
        setLiveStats(prev => ({
          ...prev,
          activeUsers: metric.active_users || prev.activeUsers
        }));
      }
    });

    const unsubscribeConnected = socketService.onConnected(() => {
      if (mountedRef.current) {
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionError(null);
      }
    });

    const unsubscribeDisconnected = socketService.onDisconnected((data) => {
      if (mountedRef.current) {
        setIsConnected(false);
        if (data?.reason !== 'io client disconnect') {
          setConnectionError(data?.reason || 'Disconnected');
        }
      }
    });

    const unsubscribeError = socketService.onError((error) => {
      console.error('[SocketContext] Socket error:', error);
      if (mountedRef.current) {
        setConnectionError(error.message || 'Socket error');
      }
    });

    const unsubscribeTokenExpired = socketService.onTokenExpired(async () => {
      console.log('[SocketContext] Token expired, refreshing...');
      if (mountedRef.current && refreshWebSocketToken) {
        await refreshWebSocketToken();
        if (token) {
          initializeSocket();
        }
      }
    });

    return () => {
      unsubscribeTrade();
      unsubscribePnl();
      unsubscribeAnnouncement();
      unsubscribeBotStatus();
      unsubscribeReferral();
      unsubscribeLeaderboard();
      unsubscribeSystemMetric();
      unsubscribeConnected();
      unsubscribeDisconnected();
      unsubscribeError();
      unsubscribeTokenExpired();
    };
  }, [refreshWebSocketToken, token, initializeSocket]);

  // Start connection when token is available
  useEffect(() => {
    if (token && !isConnected && !isConnecting) {
      initializeSocket();
    }
  }, [token, isConnected, isConnecting, initializeSocket]);

  const reconnect = useCallback(async () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (socketService) {
      socketService.disconnect();
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    
    setTimeout(() => {
      if (mountedRef.current && token) {
        initializeSocket();
      }
    }, 500);
  }, [token, initializeSocket]);

  const subscribeToTrades = useCallback(() => {
    if (socketService && isConnected) {
      socketService.subscribeTrades();
    }
  }, [isConnected]);

  const subscribeToPnl = useCallback(() => {
    if (socketService && isConnected) {
      socketService.subscribePnl();
    }
  }, [isConnected]);

  const subscribeToAnnouncements = useCallback(() => {
    if (socketService && isConnected) {
      socketService.subscribeAnnouncements();
    }
  }, [isConnected]);

  const subscribeToReferrals = useCallback((userId) => {
    if (socketService && isConnected && userId) {
      socketService.subscribeReferrals(userId);
    }
  }, [isConnected]);

  const subscribeToLeaderboard = useCallback(() => {
    if (socketService && isConnected) {
      socketService.subscribeLeaderboard();
    }
  }, [isConnected]);

  const subscribeToSystemMetrics = useCallback(() => {
    if (socketService && isConnected) {
      socketService.subscribeSystemMetrics();
    }
  }, [isConnected]);

  const clearAnnouncements = useCallback(() => setAnnouncements([]), []);
  const clearTrades = useCallback(() => setTrades([]), []);
  const clearReferralEvents = useCallback(() => setReferralEvents([]), []);

  const value = {
    isConnected,
    isConnecting,
    connectionError,
    reconnect,
    socket: socketService,
    lastTrade,
    lastPnlUpdate,
    trades,
    announcements,
    liveStats,
    botStatuses,
    leaderboard,
    referralEvents,
    systemMetrics,
    subscribeToTrades,
    subscribeToPnl,
    subscribeToAnnouncements,
    subscribeToReferrals,
    subscribeToLeaderboard,
    subscribeToSystemMetrics,
    clearAnnouncements,
    clearTrades,
    clearReferralEvents,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export default SocketProvider;
