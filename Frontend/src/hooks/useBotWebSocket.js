import { useState, useEffect, useCallback, useRef } from "react";

const WS_URL =
  process.env.REACT_APP_WS_URL ||
  "ws://129.213.90.84:8000/ws/dashboard";

export default function useBotWebSocket() {
  const [botData, setBotData] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [lastEvent, setLastEvent] = useState(null);

  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const pingTimerRef = useRef(null);
  const mountedRef = useRef(true);
  const reconnectCount = useRef(0);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    // Clean up existing connection
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
    }

    const token = localStorage.getItem("imali_token");
    const url = token ? `${WS_URL}?token=${token}` : WS_URL;

    console.log("[WebSocket] Connecting to:", url);

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      console.log("[WebSocket] Connected");
      setConnected(true);
      setError(null);
      reconnectCount.current = 0;

      // Start ping interval
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

        console.log("[WebSocket] Event:", type, data ? `(${Object.keys(data).length} keys)` : "");
        setLastEvent({ type, timestamp });

        switch (type) {
          // ── Full snapshot (initial load or manual request) ──
          case "initial_snapshot":
          case "snapshot":
            setBotData(data);
            console.log(
              "[WebSocket] Snapshot loaded:",
              data?.active_trade_count || 0,
              "active,",
              data?.completed_trade_count || 0,
              "completed trades"
            );
            break;

          // ── Bot state changed (started/stopped/paused/error) ──
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

          // ── New trade opened ──
          case "new_trade":
            setBotData((prev) => {
              if (!prev) return prev;

              // Avoid duplicates
              const existingIds = new Set(
                (prev.active_trades || []).map((t) => t.id)
              );
              if (data?.id && existingIds.has(data.id)) {
                return prev;
              }

              const newActiveTrades = [
                ...(prev.active_trades || []),
                {
                  ...data,
                  _live: true,
                  _source: "ws",
                },
              ];

              // Update stats
              const newStats = { ...(prev.stats || {}) };
              newStats.trades_total = (newStats.trades_total || 0) + 1;
              newStats.trades_today = (newStats.trades_today || 0) + 1;

              // Track exchange-specific counts
              const exchange = String(data?.exchange || "").toUpperCase();
              if (exchange.includes("OKX")) {
                newStats.spot_trades = (newStats.spot_trades || 0) + 1;
              } else if (exchange.includes("ALPACA")) {
                newStats.stock_trades = (newStats.stock_trades || 0) + 1;
              } else if (exchange.includes("FUTURE")) {
                newStats.futures_trades = (newStats.futures_trades || 0) + 1;
              } else {
                newStats.sniper_trades = (newStats.sniper_trades || 0) + 1;
              }

              // Track volume
              const amount = parseFloat(data?.amount || 0);
              const price = parseFloat(data?.entry_price || 0);
              newStats.total_volume =
                (newStats.total_volume || 0) + amount * price;

              return {
                ...prev,
                active_trades: newActiveTrades,
                active_trade_count: newActiveTrades.length,
                stats: newStats,
                last_heartbeat: timestamp,
              };
            });
            break;

          // ── Trade closed with P&L ──
          case "trade_closed":
            setBotData((prev) => {
              if (!prev) return prev;

              const tradeId = data?.trade_id;
              const pnl = parseFloat(data?.pnl || 0);

              // Find and remove from active trades
              let closedTrade = null;
              const remainingActive = [];

              for (const t of prev.active_trades || []) {
                if (t.id === tradeId) {
                  closedTrade = {
                    ...t,
                    pnl,
                    pnl_usd: pnl,
                    closed_at: timestamp,
                    _live: false,
                  };
                } else {
                  remainingActive.push(t);
                }
              }

              // Add to completed trades
              const newCompleted = [
                ...(prev.completed_trades || []),
                ...(closedTrade ? [closedTrade] : []),
              ].slice(-500); // Keep last 500

              // Recalculate win rate from completed trades
              const totalCompleted = newCompleted.length;
              const wins = newCompleted.filter(
                (t) => parseFloat(t.pnl || t.pnl_usd || 0) > 0
              ).length;
              const winRate =
                totalCompleted > 0
                  ? ((wins / totalCompleted) * 100).toFixed(1)
                  : 0;

              const newStats = { ...(prev.stats || {}) };
              newStats.win_rate = parseFloat(winRate);
              newStats.best_trade = Math.max(
                newStats.best_trade || 0,
                pnl
              );
              newStats.worst_trade = Math.min(
                newStats.worst_trade || 0,
                pnl
              );

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

          // ── Live P&L update for an active trade ──
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

              return {
                ...prev,
                active_trades: updatedActive,
                last_heartbeat: timestamp,
              };
            });
            break;

          // ── Network status change ──
          case "network_update":
            setBotData((prev) => {
              if (!prev) return prev;

              const networkName =
                data?.name || data?.network || "unknown";
              const updatedNetworks = {
                ...(prev.networks || {}),
                [networkName]: {
                  state: data?.state || "idle",
                  updated_at: timestamp,
                  ...data,
                },
              };

              // Recompute active networks
              const activeNetworks = Object.entries(updatedNetworks)
                .filter(
                  ([, info]) =>
                    info.state === "running"
                )
                .map(([name]) => name);

              return {
                ...prev,
                networks: updatedNetworks,
                active_networks: activeNetworks,
                last_heartbeat: timestamp,
              };
            });
            break;

          // ── Full stats replacement ──
          case "stats_update":
            setBotData((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                stats: { ...(prev.stats || {}), ...data },
                last_heartbeat: timestamp,
              };
            });
            break;

          // ── P&L update ──
          case "pnl_update":
            setBotData((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                pnl_total:
                  data?.pnl_total !== undefined
                    ? data.pnl_total
                    : prev.pnl_total,
                pnl_today:
                  data?.pnl_today !== undefined
                    ? data.pnl_today
                    : prev.pnl_today,
                last_heartbeat: timestamp,
              };
            });
            break;

          // ── Bot error ──
          case "error":
            console.warn(
              "[WebSocket] Bot error:",
              data?.message || data
            );
            setBotData((prev) => {
              if (!prev) return prev;
              const newErrors = [
                ...(prev.error_log || []),
                {
                  message: data?.message || "Unknown error",
                  context: data?.context,
                  timestamp,
                },
              ].slice(-50);

              return {
                ...prev,
                error_log: newErrors,
                last_heartbeat: timestamp,
              };
            });
            break;

          // ── Heartbeat (keep-alive with mini state) ──
          case "heartbeat":
            setBotData((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                state: data?.state || prev.state,
                active_trade_count:
                  data?.active_trades !== undefined
                    ? data.active_trades
                    : prev.active_trade_count,
                pnl_today:
                  data?.pnl_today !== undefined
                    ? data.pnl_today
                    : prev.pnl_today,
                pnl_total:
                  data?.pnl_total !== undefined
                    ? data.pnl_total
                    : prev.pnl_total,
                last_heartbeat:
                  data?.last_heartbeat || timestamp,
              };
            });
            break;

          // ── Pong (response to our ping) ──
          case "pong":
            // Update mini state included in pong
            if (data) {
              setBotData((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  state: data?.state || prev.state,
                  active_trade_count:
                    data?.active_trades !== undefined
                      ? data.active_trades
                      : prev.active_trade_count,
                  pnl_today:
                    data?.pnl_today !== undefined
                      ? data.pnl_today
                      : prev.pnl_today,
                  pnl_total:
                    data?.pnl_total !== undefined
                      ? data.pnl_total
                      : prev.pnl_total,
                  last_heartbeat: timestamp,
                };
              });
            }
            break;

          default:
            console.log(
              "[WebSocket] Unhandled message type:",
              type,
              data
            );
        }
      } catch (err) {
        console.error("[WebSocket] Failed to parse message:", err);
      }
    };

    ws.onclose = (event) => {
      if (!mountedRef.current) return;
      console.log("[WebSocket] Disconnected, code:", event.code);
      setConnected(false);

      // Clear ping interval
      if (pingTimerRef.current) {
        clearInterval(pingTimerRef.current);
        pingTimerRef.current = null;
      }

      // Reconnect with exponential backoff (max 30s)
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }

      const delay = Math.min(
        3000 * Math.pow(1.5, reconnectCount.current),
        30000
      );
      reconnectCount.current++;

      console.log(
        `[WebSocket] Reconnecting in ${Math.round(delay / 1000)}s (attempt ${reconnectCount.current})`
      );

      reconnectTimerRef.current = setTimeout(() => {
        if (mountedRef.current) connect();
      }, delay);
    };

    ws.onerror = (err) => {
      console.error("[WebSocket] Error:", err);
      setError("WebSocket connection failed");
    };
  }, []);

  const requestSnapshot = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "request_snapshot" }));
      console.log("[WebSocket] Requested snapshot");
    }
  }, []);

  // Connect on mount, clean up on unmount
  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;

      if (pingTimerRef.current) {
        clearInterval(pingTimerRef.current);
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {}
      }
    };
  }, [connect]);

  return {
    botData,
    connected,
    error,
    lastEvent,
    requestSnapshot,
  };
}
