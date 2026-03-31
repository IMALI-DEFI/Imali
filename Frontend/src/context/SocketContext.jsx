// src/context/SocketContext.jsx
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import socketService from '../services/socketService';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

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
  
  // Bot status
  const [botStatuses, setBotStatuses] = useState([]);
  
  // Referral data
  const [leaderboard, setLeaderboard] = useState([]);
  const [referralEvents, setReferralEvents] = useState([]);
  
  // Admin metrics
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
        
        // Attempt reconnect after 5 seconds
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

    // Trade event handler
    const unsubscribeTrade = socketService.onTrade((trade) => {
      console.log('[SocketContext] New trade received:', trade);
      
      if (mountedRef.current) {
        // Update last trade
        setLastTrade(trade);
        
        // Add to trades list (keep last 500)
        setTrades(prev => [trade, ...prev].slice(0, 500));
        
        // Update live stats
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

    // P&L update handler
    const unsubscribePnl = socketService.onPnlUpdate((pnlData) => {
      console.log('[SocketContext] P&L update received:', pnlData);
      if (mountedRef.current) {
        setLastPnlUpdate(pnlData);
        setLiveStats(prev => ({
          ...prev,
          totalPnl: pnlData.total_pnl || prev.totalPnl
        }));
      }
    });

    // Announcement handler
    const unsubscribeAnnouncement = socketService.onAnnouncement((announcement) => {
      console.log('[SocketContext] New announcement:', announcement);
      if (mountedRef.current) {
        setAnnouncements(prev => [announcement, ...prev].slice(0, 10));
        
        // Auto-dismiss after 30 seconds for non-critical announcements
        if (announcement.priority !== 'critical') {
          setTimeout(() => {
            setAnnouncements(prev => prev.filter(a => a.id !== announcement.id));
          }, 30000);
        }
      }
    });

    // Bot status handler
    const unsubscribeBotStatus = socketService.onBotStatus((status) => {
      console.log('[SocketContext] Bot status update:', status);
      if (mountedRef.current) {
        setBotStatuses(status.bots || []);
        setLiveStats(prev => ({
          ...prev,
          activeBots: status.active_bots || 0,
          activeUsers: status.active_users || prev.activeUsers
        }));
      }
    });

    // Referral event handler
    const unsubscribeReferral = socketService.onReferralEvent((event) => {
      console.log('[SocketContext] Referral event:', event);
      if (mountedRef.current) {
        setReferralEvents(prev => [event, ...prev].slice(0, 50));
        setLiveStats(prev => ({
          ...prev,
          totalReferrals: prev.totalReferrals + 1,
          totalRewardsPaid: prev.totalRewardsPaid + (event.reward || 0)
        }));
      }
    });

    // Leaderboard update handler
    const unsubscribeLeaderboard = socketService.onLeaderboardUpdate((data) => {
      console.log('[SocketContext] Leaderboard update:', data);
      if (mountedRef.current) {
        setLeaderboard(data.leaderboard || []);
      }
    });

    // System metric handler (admin only)
    const unsubscribeSystemMetric = socketService.onSystemMetric((metric) => {
      console.log('[SocketContext] System metric update:', metric);
      if (mountedRef.current) {
        setSystemMetrics({
          cpu: metric.cpu || 0,
          memory: metric.memory || 0,
          active_users: metric.active_users || 0,
          tps: metric.tps || 0,
          timestamp: new Date()
        });
        
        // Update live stats with active users
        setLiveStats(prev => ({
          ...prev,
          activeUsers: metric.active_users || prev.activeUsers
        }));
      }
    });

    // Connection event handlers
    const unsubscribeConnected = socketService.onConnected(() => {
      console.log('[SocketContext] Socket connected event');
      if (mountedRef.current) {
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionError(null);
      }
    });

    const unsubscribeDisconnected = socketService.onDisconnected((data) => {
      console.log('[SocketContext] Socket disconnected:', data?.reason);
      if (mountedRef.current) {
        setIsConnected(false);
        // Don't set error for normal disconnections
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
        // Reconnect with new token
        if (token) {
          initializeSocket();
        }
      }
    });

    // Cleanup function
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

  // Manual reconnect function
  const reconnect = useCallback(async () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (socketService) {
      socketService.disconnect();
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    
    // Small delay before reconnecting
    setTimeout(() => {
      if (mountedRef.current && token) {
        initializeSocket();
      }
    }, 500);
  }, [token, initializeSocket]);

  // Subscribe to specific rooms
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

  // Clear old data periodically
  useEffect(() => {
    const clearOldData = setInterval(() => {
      if (mountedRef.current) {
        // Keep only last 500 trades
        setTrades(prev => prev.slice(0, 500));
        // Keep only last 100 referral events
        setReferralEvents(prev => prev.slice(0, 100));
      }
    }, 60000); // Clear every minute
    
    return () => clearInterval(clearOldData);
  }, []);

  const value = {
    // Connection state
    isConnected,
    isConnecting,
    connectionError,
    reconnect,
    
    // Socket instance for advanced usage
    socket: socketService,
    
    // Live data
    lastTrade,
    lastPnlUpdate,
    trades,
    announcements,
    liveStats,
    botStatuses,
    
    // Referral data
    leaderboard,
    referralEvents,
    
    // Admin metrics
    systemMetrics,
    
    // Subscription methods
    subscribeToTrades,
    subscribeToPnl,
    subscribeToAnnouncements,
    subscribeToReferrals,
    subscribeToLeaderboard,
    subscribeToSystemMetrics,
    
    // Helper methods
    clearAnnouncements: () => setAnnouncements([]),
    clearTrades: () => setTrades([]),
    clearReferralEvents: () => setReferralEvents([]),
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

// Custom hook for using the socket context
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

// Optional: Higher-order component for socket-aware components
export const withSocket = (Component) => {
  return function WithSocketComponent(props) {
    const socketContext = useSocket();
    return <Component {...props} socket={socketContext} />;
  };
};