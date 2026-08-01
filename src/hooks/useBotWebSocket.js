// src/hooks/useBotWebSocket.js
import { useState, useEffect, useCallback, useRef } from "react";
import BotAPI from "../utils/BotAPI";

// WebSocket should be on the SAME server as the bot API
const BOT_HOST = process.env.REACT_APP_BOT_WS_URL || "ws://129.213.90.84:8011";
const WS_PATH = "/ws/dashboard";

// Helper to safely extract data from API responses
const safeExtract = (response, fallback = null) => {
  if (!response) return fallback;
  // Handle { success: true, data: {...} }
  if (response.data && typeof response.data === 'object') {
    return response.data;
  }
  // Handle direct object
  return response;
};

export default function useBotWebSocket() {
  const [botData, setBotData] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [lastEvent, setLastEvent] = useState(null);

  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const pingTimerRef = useRef(null);
  const restPollRef = useRef(null);
  const mountedRef = useRef(true);
  const reconnectCount = useRef(0);
  const wsFailedRef = useRef(false);

  /* ─── REST Fallback: poll /api/all/stats when WS is down ─── */
  const fetchViaRest = useCallback(async () => {
    if (!mountedRef.current) return;

    try {
      // Use getAllStats and getTrades from BotAPI
      const [statsResult, tradesResult] = await Promise.allSettled([
        BotAPI.getAllStats(),
        BotAPI.getTrades(),
      ]);

      if (!mountedRef.current) return;

      // Handle nested responses
      const stats = statsResult.status === "fulfilled" 
        ? safeExtract(statsResult.value)
        : null;
        
      const tradesData = tradesResult.status === "fulfilled" 
        ? safeExtract(tradesResult.value)
        : null;

      if (stats || tradesData) {
        setBotData((prev) => {
          const trades = tradesData?.trades || tradesData || [];
          const activeTrades = Array.isArray(trades)
            ? trades.filter((t) => !t.closed_at)
            : [];
          const completedTrades = Array.isArray(trades)
            ? trades.filter((t) => !!t.closed_at)
            : [];

          return {
            ...(prev || {}),
            state: stats?.bot_state || stats?.state || prev?.state || "idle",
            active_trades: activeTrades,
            active_trade_count: activeTrades.length,
            completed_trades: completedTrades.slice(-200),
            completed_trade_count: completedTrades.length,
            pnl_total: stats?.pnl_total ?? stats?.total_pnl ?? prev?.pnl_total ?? 0,
            pnl_today: stats?.pnl_today ?? stats?.today_pnl ?? prev?.pnl_today ?? 0,
            stats: {
              ...(prev?.stats || {}),
              trades_total: stats?.total_trades ?? trades.length ?? 0,
              trades_today: stats?.trades_today ?? 0,
              win_rate: stats?.win_rate ?? 0,
              total_volume: stats?.total_volume ?? 0,
              spot_trades: stats?.spot_trades ?? 0,
              futures_trades: stats?.futures_trades ?? 0,
              stock_trades: stats?.stock_trades ?? 0,
              sniper_trades: stats?.sniper_trades ?? 0,
              ...(stats?.stats || {}),
            },
            networks: stats?.networks || prev?.networks || {},
            last_heartbeat: new Date().toISOString(),
            _source: "rest",
          };
        });

        // Clear error since REST works
        setError(null);
      }
    } catch (err) {
      // Don't spam console — just log once
      if (!restPollRef.current?._errLogged) {
        console.warn("[Dashboard] REST fallback failed:", err?.message || "Network error");
        if (restPollRef.current) restPollRef.current._errLogged = true;
      }
    }
  }, []);

  /* ─── Start REST polling (when WebSocket is unavailable) ─── */
  const startRestPolling = useCallback(() => {
    // Clear existing
    if (restPollRef.current?.interval) {
      clearInterval(restPollRef.current.interval);
    }

    // Do initial fetch
    fetchViaRest();

    // Poll every 10s
    const interval = setInterval(fetchViaRest, 10000);
    restPollRef.current = { interval, _errLogged: false };

    console.log("[Dashboard] REST polling started (WS unavailable)");
  }, [fetchViaRest]);

  /* ─── Stop REST polling ─── */
  const stopRestPolling = useCallback(() => {
    if (restPollRef.current?.interval) {
      clearInterval(restPollRef.current.interval);
      restPollRef.current = null;
      console.log("[Dashboard] REST polling stopped (WS connected)");
    }
  }, []);

  /* ─── WebSocket Connection ─── */
  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    if (wsRef.current) {
      try { wsRef.current.close(); } catch {}
    }

    const token = localStorage.getItem("imali_token");
    const wsUrl = `${BOT_HOST}${WS_PATH}${token ? `?token=${token}` : ""}`;

    console.log("[WebSocket] Connecting to:", wsUrl);

    let ws;
    try {
      ws = new WebSocket(wsUrl);
    } catch (err) {
      console.warn("[WebSocket] Failed to create connection:", err.message);
      wsFailedRef.current = true;
      startRestPolling();
      return;
    }

    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      console.log("[WebSocket] Connected");
      setConnected(true);
      setError(null);
      reconnectCount.current = 0;
      wsFailedRef.current = false;

      // Stop REST polling since WS is working
      stopRestPolling();

      // Start ping
      if (pingTimerRef.current) clearInterval(pingTimerRef.current);
      pingTimerRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 25000);
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;

      try {
        const msg = JSON.parse(event.data);
        const { type, data, timestamp } = msg;

        // Don't log pongs to reduce noise
        if (type !== "pong") {
          console.log("[WebSocket] Event:", type);
        }

        setLastEvent({ type, timestamp });

        switch (type) {
          case "initial_snapshot":
          case "snapshot":
            setBotData(data);
            console.log(
              "[WebSocket] Snapshot:",
              data?.active_trade_count || 0, "active,",
              data?.completed_trade_count || 0, "completed"
            );
            break;

          case "state_change":
            setBotData((prev) => {
              if (!prev) return data;
              return {
                ...prev,
                state: data?.state || prev.state,
                mode: data?.mode || prev.mode,
                start_time: data?.start_time || prev.start_time,
                last_heartbeat: timestamp,
              };
            });
            break;

          case "new_trade":
            setBotData((prev) => {
              if (!prev) return prev;

              const existingIds = new Set(
                (prev.active_trades || []).map((t) => t.id)
              );
              if (data?.id && existingIds.has(data.id)) return prev;

              const newActive = [
                ...(prev.active_trades || []),
                { ...data, _live: true, _source: "ws" },
              ];

              const newStats = { ...(prev.stats || {}) };
              newStats.trades_total = (newStats.trades_total || 0) + 1;
              newStats.trades_today = (newStats.trades_today || 0) + 1;

              const ex = String(data?.exchange || "").toUpperCase();
              if (ex.includes("OKX")) newStats.spot_trades = (newStats.spot_trades || 0) + 1;
              else if (ex.includes("ALPACA")) newStats.stock_trades = (newStats.stock_trades || 0) + 1;
              else if (ex.includes("FUTURE")) newStats.futures_trades = (newStats.futures_trades || 0) + 1;
              else newStats.sniper_trades = (newStats.sniper_trades || 0) + 1;

              const amount = parseFloat(data?.amount || 0);
              const price = parseFloat(data?.entry_price || 0);
              newStats.total_volume = (newStats.total_volume || 0) + amount * price;

              return {
                ...prev,
                active_trades: newActive,
                active_trade_count: newActive.length,
                stats: newStats,
                last_heartbeat: timestamp,
              };
            });
            break;

          case "trade_closed":
            setBotData((prev) => {
              if (!prev) return prev;

              const tradeId = data?.trade_id;
              const pnl = parseFloat(data?.pnl || 0);

              let closedTrade = null;
              const remainingActive = [];
              for (const t of prev.active_trades || []) {
                if (t.id === tradeId) {
                  closedTrade = { ...t, pnl, pnl_usd: pnl, closed_at: timestamp, _live: false };
                } else {
                  remainingActive.push(t);
                }
              }

              const newCompleted = [
                ...(prev.completed_trades || []),
                ...(closedTrade ? [closedTrade] : []),
              ].slice(-500);

              const totalCompleted = newCompleted.length;
              const wins = newCompleted.filter((t) => parseFloat(t.pnl || t.pnl_usd || 0) > 0).length;
              const winRate = totalCompleted > 0 ? ((wins / totalCompleted) * 100) : 0;

              const newStats = { ...(prev.stats || {}) };
              newStats.win_rate = parseFloat(winRate.toFixed(1));
              newStats.best_trade = Math.max(newStats.best_trade || 0, pnl);
              newStats.worst_trade = Math.min(newStats.worst_trade || 0, pnl);

              return {
                ...prev,
                active_trades: remainingActive,
                active_trade_count: remainingActive.length,
                completed_trades: newCompleted,
                completed_trade_count: newCompleted.length,
                pnl_total: (prev.pnl_total || 0) + pnl,
                pnl_today: (prev.pnl_today || 0) + pnl,
                stats: newStats,
                last_heartbeat: timestamp,
              };
            });
            break;

          case "trade_update":
            setBotData((prev) => {
              if (!prev) return prev;
              const tradeId = data?.trade_id || data?.id;
              if (!tradeId) return prev;

              const updatedActive = (prev.active_trades || []).map((t) => {
                if (t.id === tradeId) {
                  return {
                    ...t,
                    current_pnl: data.current_pnl,
                    current_price: data.current_price,
                    pnl_usd: data.current_pnl ?? t.pnl_usd,
                    _updated_at: timestamp,
                  };
                }
                return t;
              });

              return { ...prev, active_trades: updatedActive, last_heartbeat: timestamp };
            });
            break;

          case "network_update":
            setBotData((prev) => {
              if (!prev) return prev;
              const name = data?.name || data?.network || "unknown";
              const networks = {
                ...(prev.networks || {}),
                [name]: { state: data?.state || "idle", updated_at: timestamp, ...data },
              };
              const activeNetworks = Object.entries(networks)
                .filter(([, info]) => info.state === "running")
                .map(([n]) => n);

              return { ...prev, networks, active_networks: activeNetworks, last_heartbeat: timestamp };
            });
            break;

          case "stats_update":
            setBotData((prev) => {
              if (!prev) return prev;
              return { ...prev, stats: { ...(prev.stats || {}), ...data }, last_heartbeat: timestamp };
            });
            break;

          case "pnl_update":
            setBotData((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                pnl_total: data?.pnl_total ?? prev.pnl_total,
                pnl_today: data?.pnl_today ?? prev.pnl_today,
                last_heartbeat: timestamp,
              };
            });
            break;

          case "error":
            console.warn("[WebSocket] Bot error:", data?.message);
            setBotData((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                error_log: [
                  ...(prev.error_log || []),
                  { message: data?.message || "Unknown", context: data?.context, timestamp },
                ].slice(-50),
                last_heartbeat: timestamp,
              };
            });
            break;

          case "heartbeat":
            setBotData((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                state: data?.state || prev.state,
                active_trade_count: data?.active_trades ?? prev.active_trade_count,
                pnl_today: data?.pnl_today ?? prev.pnl_today,
                pnl_total: data?.pnl_total ?? prev.pnl_total,
                last_heartbeat: data?.last_heartbeat || timestamp,
              };
            });
            break;

          case "pong":
            if (data) {
              setBotData((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  state: data?.state || prev.state,
                  active_trade_count: data?.active_trades ?? prev.active_trade_count,
                  pnl_today: data?.pnl_today ?? prev.pnl_today,
                  pnl_total: data?.pnl_total ?? prev.pnl_total,
                  last_heartbeat: timestamp,
                };
              });
            }
            break;

          default:
            console.log("[WebSocket] Unhandled:", type);
        }
      } catch (err) {
        console.error("[WebSocket] Parse error:", err);
      }
    };

    ws.onclose = (event) => {
      if (!mountedRef.current) return;
      console.log("[WebSocket] Disconnected, code:", event.code);
      setConnected(false);

      if (pingTimerRef.current) {
        clearInterval(pingTimerRef.current);
        pingTimerRef.current = null;
      }

      // Start REST polling as fallback
      startRestPolling();

      // Reconnect with exponential backoff, max 30s
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);

      const delay = Math.min(3000 * Math.pow(1.5, reconnectCount.current), 30000);
      reconnectCount.current++;

      // Stop trying WebSocket after 10 failed attempts — REST takes over
      if (reconnectCount.current > 10) {
        console.warn("[WebSocket] Giving up on WS after 10 attempts. Using REST only.");
        wsFailedRef.current = true;
        return;
      }

      console.log(`[WebSocket] Reconnecting in ${Math.round(delay / 1000)}s (attempt ${reconnectCount.current})`);
      reconnectTimerRef.current = setTimeout(() => {
        if (mountedRef.current) connect();
      }, delay);
    };

    ws.onerror = () => {
      // Don't set error immediately — onclose will handle reconnect
      console.warn("[WebSocket] Connection error");
    };
  }, [startRestPolling, stopRestPolling, fetchViaRest]);

  const requestSnapshot = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "request_snapshot" }));
      console.log("[WebSocket] Requested snapshot");
    } else {
      // Fallback to REST
      fetchViaRest();
    }
  }, [fetchViaRest]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (pingTimerRef.current) clearInterval(pingTimerRef.current);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (restPollRef.current?.interval) clearInterval(restPollRef.current.interval);
      if (wsRef.current) {
        try { wsRef.current.close(); } catch {}
      }
    };
  }, [connect]);

  return { botData, connected, error, lastEvent, requestSnapshot };
}
