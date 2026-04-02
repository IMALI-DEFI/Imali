import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import socketService from "../services/socketService";
import { useAuth } from "./AuthContext";

export const SocketContext = createContext(null);

const DEFAULT_LIVE_STATS = {
  totalTrades: 0,
  totalPnl: 0,
  activeBots: 0,
  winRate: 0,
  wins: 0,
  losses: 0,
  totalReferrals: 0,
  totalRewardsPaid: 0,
  activeUsers: 0,
};

const DEFAULT_SYSTEM_METRICS = {
  cpu: 0,
  memory: 0,
  active_users: 0,
  tps: 0,
  timestamp: null,
};

const SAFE_SOCKET_VALUE = {
  isConnected: false,
  isConnecting: false,
  connectionError: null,
  reconnect: async () => false,
  socket: null,
  lastTrade: null,
  lastPnlUpdate: null,
  trades: [],
  announcements: [],
  liveStats: DEFAULT_LIVE_STATS,
  botStatuses: [],
  leaderboard: [],
  referralEvents: [],
  systemMetrics: DEFAULT_SYSTEM_METRICS,
  subscribeToTrades: () => {},
  subscribeToPnl: () => {},
  subscribeToAnnouncements: () => {},
  subscribeToReferrals: () => {},
  subscribeToLeaderboard: () => {},
  subscribeToSystemMetrics: () => {},
  clearAnnouncements: () => {},
  clearTrades: () => {},
  clearReferralEvents: () => {},
};

export const useSocket = () => {
  return useContext(SocketContext) || SAFE_SOCKET_VALUE;
};

export const useSafeSocket = () => {
  return useContext(SocketContext) || SAFE_SOCKET_VALUE;
};

export function SocketProvider({ children }) {
  const auth = useAuth?.() || {};
  const token = auth?.token || null;
  const refreshWebSocketToken = auth?.refreshWebSocketToken;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  const [lastTrade, setLastTrade] = useState(null);
  const [lastPnlUpdate, setLastPnlUpdate] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [trades, setTrades] = useState([]);
  const [liveStats, setLiveStats] = useState(DEFAULT_LIVE_STATS);
  const [botStatuses, setBotStatuses] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [referralEvents, setReferralEvents] = useState([]);
  const [systemMetrics, setSystemMetrics] = useState(DEFAULT_SYSTEM_METRICS);

  const mountedRef = useRef(false);
  const reconnectTimeoutRef = useRef(null);
  const connectAttemptRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      try {
        socketService?.disconnect?.();
      } catch (err) {
        console.warn("[SocketContext] disconnect on unmount failed:", err);
      }
    };
  }, []);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    clearReconnectTimer();

    if (!mountedRef.current || !token) return;

    const delay = Math.min(5000 * Math.max(connectAttemptRef.current, 1), 15000);

    reconnectTimeoutRef.current = setTimeout(async () => {
      if (!mountedRef.current || !token) return;
      try {
        await initializeSocketRef.current?.();
      } catch (err) {
        console.warn("[SocketContext] scheduled reconnect failed:", err);
      }
    }, delay);
  }, [clearReconnectTimer, token]);

  const initializeSocket = useCallback(async () => {
    if (!mountedRef.current) return false;

    if (!token) {
      setIsConnected(false);
      setIsConnecting(false);
      setConnectionError(null);
      return false;
    }

    if (isConnecting || isConnected) {
      return isConnected;
    }

    setIsConnecting(true);
    setConnectionError(null);

    try {
      connectAttemptRef.current += 1;

      await socketService?.connect?.(token);

      if (!mountedRef.current) return false;

      setIsConnected(true);
      setIsConnecting(false);
      setConnectionError(null);
      connectAttemptRef.current = 0;
      clearReconnectTimer();

      return true;
    } catch (error) {
      console.error("[SocketContext] Connection failed:", error);

      if (!mountedRef.current) return false;

      setIsConnected(false);
      setIsConnecting(false);
      setConnectionError(error?.message || "Connection failed");

      scheduleReconnect();
      return false;
    }
  }, [token, isConnecting, isConnected, clearReconnectTimer, scheduleReconnect]);

  const initializeSocketRef = useRef(initializeSocket);
  useEffect(() => {
    initializeSocketRef.current = initializeSocket;
  }, [initializeSocket]);

  useEffect(() => {
    if (!token) {
      clearReconnectTimer();
      setIsConnected(false);
      setIsConnecting(false);
      setConnectionError(null);

      try {
        socketService?.disconnect?.();
      } catch (err) {
        console.warn("[SocketContext] disconnect after token cleared failed:", err);
      }
      return;
    }

    if (!isConnected && !isConnecting) {
      initializeSocket();
    }
  }, [token, isConnected, isConnecting, initializeSocket, clearReconnectTimer]);

  useEffect(() => {
    if (!socketService) return undefined;

    const safe = (fn) => {
      try {
        return typeof fn === "function" ? fn : () => {};
      } catch (err) {
        console.warn("[SocketContext] listener registration failed:", err);
        return () => {};
      }
    };

    const unsubscribeTrade = safe(
      socketService?.onTrade?.((trade) => {
        if (!mountedRef.current || !trade) return;

        const pnl = Number(trade?.pnl ?? trade?.pnl_usd ?? 0);

        setLastTrade(trade);
        setTrades((prev) => [trade, ...prev].slice(0, 500));
        setLiveStats((prev) => {
          const wins = prev.wins + (pnl > 0 ? 1 : 0);
          const losses = prev.losses + (pnl < 0 ? 1 : 0);
          const totalTrades = prev.totalTrades + 1;
          const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

          return {
            ...prev,
            totalTrades,
            totalPnl: prev.totalPnl + pnl,
            wins,
            losses,
            winRate,
          };
        });
      })
    );

    const unsubscribePnl = safe(
      socketService?.onPnlUpdate?.((pnlData) => {
        if (!mountedRef.current || !pnlData) return;

        setLastPnlUpdate(pnlData);
        setLiveStats((prev) => ({
          ...prev,
          totalPnl: Number(pnlData?.total_pnl ?? prev.totalPnl),
        }));
      })
    );

    const unsubscribeAnnouncement = safe(
      socketService?.onAnnouncement?.((announcement) => {
        if (!mountedRef.current || !announcement) return;

        setAnnouncements((prev) => [announcement, ...prev].slice(0, 10));

        if (announcement?.priority !== "critical" && announcement?.id) {
          setTimeout(() => {
            if (!mountedRef.current) return;
            setAnnouncements((prev) => prev.filter((a) => a.id !== announcement.id));
          }, 30000);
        }
      })
    );

    const unsubscribeBotStatus = safe(
      socketService?.onBotStatus?.((status) => {
        if (!mountedRef.current || !status) return;

        const bots = Array.isArray(status?.bots) ? status.bots : [];
        setBotStatuses(bots);

        setLiveStats((prev) => ({
          ...prev,
          activeBots: Number(status?.active_bots ?? bots.filter((b) => b?.is_active).length ?? 0),
          activeUsers: Number(status?.active_users ?? prev.activeUsers),
        }));
      })
    );

    const unsubscribeReferral = safe(
      socketService?.onReferralEvent?.((event) => {
        if (!mountedRef.current || !event) return;

        const reward = Number(event?.reward ?? 0);

        setReferralEvents((prev) => [event, ...prev].slice(0, 50));
        setLiveStats((prev) => ({
          ...prev,
          totalReferrals: prev.totalReferrals + 1,
          totalRewardsPaid: prev.totalRewardsPaid + reward,
        }));
      })
    );

    const unsubscribeLeaderboard = safe(
      socketService?.onLeaderboardUpdate?.((data) => {
        if (!mountedRef.current || !data) return;
        setLeaderboard(Array.isArray(data?.leaderboard) ? data.leaderboard : []);
      })
    );

    const unsubscribeSystemMetric = safe(
      socketService?.onSystemMetric?.((metric) => {
        if (!mountedRef.current || !metric) return;

        setSystemMetrics({
          cpu: Number(metric?.cpu ?? 0),
          memory: Number(metric?.memory ?? 0),
          active_users: Number(metric?.active_users ?? 0),
          tps: Number(metric?.tps ?? 0),
          timestamp: new Date().toISOString(),
        });

        setLiveStats((prev) => ({
          ...prev,
          activeUsers: Number(metric?.active_users ?? prev.activeUsers),
        }));
      })
    );

    const unsubscribeConnected = safe(
      socketService?.onConnected?.(() => {
        if (!mountedRef.current) return;
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionError(null);
        connectAttemptRef.current = 0;
        clearReconnectTimer();
      })
    );

    const unsubscribeDisconnected = safe(
      socketService?.onDisconnected?.((data) => {
        if (!mountedRef.current) return;

        setIsConnected(false);
        setIsConnecting(false);

        const reason = data?.reason || "Disconnected";
        if (reason !== "io client disconnect") {
          setConnectionError(reason);
          scheduleReconnect();
        }
      })
    );

    const unsubscribeError = safe(
      socketService?.onError?.((error) => {
        console.error("[SocketContext] Socket error:", error);

        if (!mountedRef.current) return;
        setConnectionError(error?.message || "Socket error");
      })
    );

    const unsubscribeTokenExpired = safe(
      socketService?.onTokenExpired?.(async () => {
        try {
          if (typeof refreshWebSocketToken === "function") {
            await refreshWebSocketToken();
          }
        } catch (err) {
          console.error("[SocketContext] Token refresh failed:", err);
        }
      })
    );

    return () => {
      try {
        unsubscribeTrade?.();
        unsubscribePnl?.();
        unsubscribeAnnouncement?.();
        unsubscribeBotStatus?.();
        unsubscribeReferral?.();
        unsubscribeLeaderboard?.();
        unsubscribeSystemMetric?.();
        unsubscribeConnected?.();
        unsubscribeDisconnected?.();
        unsubscribeError?.();
        unsubscribeTokenExpired?.();
      } catch (err) {
        console.warn("[SocketContext] listener cleanup failed:", err);
      }
    };
  }, [refreshWebSocketToken, clearReconnectTimer, scheduleReconnect]);

  const reconnect = useCallback(async () => {
    try {
      clearReconnectTimer();
      setIsConnected(false);
      setIsConnecting(false);
      setConnectionError(null);

      socketService?.disconnect?.();
      return await initializeSocket();
    } catch (err) {
      console.error("[SocketContext] reconnect failed:", err);
      setConnectionError(err?.message || "Reconnect failed");
      return false;
    }
  }, [initializeSocket, clearReconnectTimer]);

  const subscribeToTrades = useCallback(() => {
    try {
      if (isConnected) socketService?.subscribeTrades?.();
    } catch (err) {
      console.warn("[SocketContext] subscribeToTrades failed:", err);
    }
  }, [isConnected]);

  const subscribeToPnl = useCallback(() => {
    try {
      if (isConnected) socketService?.subscribePnl?.();
    } catch (err) {
      console.warn("[SocketContext] subscribeToPnl failed:", err);
    }
  }, [isConnected]);

  const subscribeToAnnouncements = useCallback(() => {
    try {
      if (isConnected) socketService?.subscribeAnnouncements?.();
    } catch (err) {
      console.warn("[SocketContext] subscribeToAnnouncements failed:", err);
    }
  }, [isConnected]);

  const subscribeToReferrals = useCallback(
    (userId) => {
      try {
        if (isConnected && userId) socketService?.subscribeReferrals?.(userId);
      } catch (err) {
        console.warn("[SocketContext] subscribeToReferrals failed:", err);
      }
    },
    [isConnected]
  );

  const subscribeToLeaderboard = useCallback(() => {
    try {
      if (isConnected) socketService?.subscribeLeaderboard?.();
    } catch (err) {
      console.warn("[SocketContext] subscribeToLeaderboard failed:", err);
    }
  }, [isConnected]);

  const subscribeToSystemMetrics = useCallback(() => {
    try {
      if (isConnected) socketService?.subscribeSystemMetrics?.();
    } catch (err) {
      console.warn("[SocketContext] subscribeToSystemMetrics failed:", err);
    }
  }, [isConnected]);

  const clearAnnouncements = useCallback(() => setAnnouncements([]), []);
  const clearTrades = useCallback(() => setTrades([]), []);
  const clearReferralEvents = useCallback(() => setReferralEvents([]), []);

  const value = useMemo(
    () => ({
      isConnected,
      isConnecting,
      connectionError,
      reconnect,
      socket: socketService || null,
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
    }),
    [
      isConnected,
      isConnecting,
      connectionError,
      reconnect,
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
    ]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export default SocketProvider;