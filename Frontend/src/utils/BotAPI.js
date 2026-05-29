// Add to BotAPI.js - Paper Trading Worker Control Methods

/* ================= PAPER TRADING WORKER CONTROL ================= */

// Force trigger a paper trade execution
export const executePaperTrade = async () => {
  try {
    const response = await requestWithDedupe(userApi, {
      method: "post",
      url: "/api/trading/paper/execute",
      data: {},
    });

    const data = unwrap(response);
    return {
      success: true,
      trade: data?.data?.trade || data?.trade || null,
      message: data?.message || "Paper trade executed",
    };
  } catch (error) {
    // Fallback: try alternative endpoint
    try {
      const response2 = await requestWithDedupe(userApi, {
        method: "post",
        url: "/api/paper-trading/execute",
        data: {},
      });
      const data2 = unwrap(response2);
      return {
        success: true,
        trade: data2?.data?.trade || data2?.trade || null,
        message: "Paper trade executed",
      };
    } catch (fallbackError) {
      return handleApiError(error, "Failed to execute paper trade");
    }
  }
};

// Check if paper trading worker is running
export const getPaperTradingStatus = async () => {
  try {
    const response = await requestWithDedupe(userApi, {
      method: "get",
      url: "/api/trading/paper/status",
    });

    const data = unwrap(response);
    return {
      success: true,
      worker_running: data?.data?.worker_running === true,
      last_execution: data?.data?.last_execution || null,
      next_execution: data?.data?.next_execution || null,
      active_users: data?.data?.active_users || 0,
      queue_size: data?.data?.queue_size || 0,
      last_error: data?.data?.last_error || null,
    };
  } catch (error) {
    // If endpoint doesn't exist, try alternative
    try {
      const response2 = await requestWithDedupe(userApi, {
        method: "get",
        url: "/api/paper-trading/status",
      });
      const data2 = unwrap(response2);
      return {
        success: true,
        worker_running: data2?.data?.worker_running === true,
        last_execution: data2?.data?.last_execution || null,
        next_execution: data2?.data?.next_execution || null,
        active_users: data2?.data?.active_users || 0,
        queue_size: data2?.data?.queue_size || 0,
        last_error: data2?.data?.last_error || null,
      };
    } catch (fallbackError) {
      return {
        success: false,
        worker_running: false,
        error: getErrorMessage(error, "Status check failed"),
      };
    }
  }
};

// Manually start the paper trading worker
export const startPaperWorker = async () => {
  try {
    const response = await requestWithDedupe(userApi, {
      method: "post",
      url: "/api/trading/paper/start-worker",
      data: {},
    });

    const data = unwrap(response);
    return {
      success: true,
      message: data?.message || "Paper trading worker started",
    };
  } catch (error) {
    // Try alternative endpoint
    try {
      const response2 = await requestWithDedupe(userApi, {
        method: "post",
        url: "/api/paper-trading/start-worker",
        data: {},
      });
      const data2 = unwrap(response2);
      return {
        success: true,
        message: data2?.message || "Paper trading worker started",
      };
    } catch (fallbackError) {
      return handleApiError(error, "Failed to start paper worker");
    }
  }
};

// Manually stop the paper trading worker
export const stopPaperWorker = async () => {
  try {
    const response = await requestWithDedupe(userApi, {
      method: "post",
      url: "/api/trading/paper/stop-worker",
      data: {},
    });

    const data = unwrap(response);
    return {
      success: true,
      message: data?.message || "Paper trading worker stopped",
    };
  } catch (error) {
    // Try alternative endpoint
    try {
      const response2 = await requestWithDedupe(userApi, {
        method: "post",
        url: "/api/paper-trading/stop-worker",
        data: {},
      });
      const data2 = unwrap(response2);
      return {
        success: true,
        message: data2?.message || "Paper trading worker stopped",
      };
    } catch (fallbackError) {
      return handleApiError(error, "Failed to stop paper worker");
    }
  }
};

// Check paper trading requirements
export const getPaperTradingRequirements = async () => {
  try {
    const response = await requestWithDedupe(userApi, {
      method: "get",
      url: "/api/trading/paper/requirements",
    });

    const data = unwrap(response);
    return {
      success: true,
      requirements: data?.data || {
        requires_api_keys: false,
        requires_trial: true,
        trial_required: true,
        max_daily_trades: 100,
        min_balance: 1000,
        interval_seconds: 60,
      },
    };
  } catch (error) {
    // Default for Starter plan - no API keys required
    return {
      success: true,
      requirements: {
        requires_api_keys: false,
        requires_trial: true,
        trial_required: true,
        max_daily_trades: 100,
        min_balance: 1000,
        interval_seconds: 60,
      },
    };
  }
};

// Get paper trading trade history
export const getPaperTradingHistory = async (limit = 50, skipCache = false) => {
  const cacheKey = `paper_trading_history_${limit}`;

  if (!skipCache) {
    const cached = getCached(cacheKey, 30000);
    if (cached) return cached;
  }

  try {
    const response = await requestWithDedupe(userApi, {
      method: "get",
      url: `/api/trading/paper/history?limit=${limit}`,
    });

    const data = unwrap(response);
    const result = {
      success: true,
      trades: data?.data?.trades || data?.trades || [],
      summary: data?.data?.summary || data?.summary || {},
    };

    setCached(cacheKey, result);
    return result;
  } catch (error) {
    return {
      success: false,
      trades: [],
      summary: {},
      error: getErrorMessage(error, "Failed to load paper trading history"),
    };
  }
};

// Enhanced togglePaperTrading that ensures worker starts
export const togglePaperTradingEnhanced = async (enabled) => {
  const nextEnabled = !!enabled;

  const endpoints = [
    { method: "patch", url: "/api/user/paper-trading", data: { enabled: nextEnabled } },
    { method: "post", url: "/api/user/paper-trading", data: { enabled: nextEnabled } },
    { method: "post", url: "/api/trading/paper/enable", data: { enabled: nextEnabled } },
    { method: "post", url: "/api/me/paper-trading", data: { enabled: nextEnabled } },
  ];

  let lastError = null;
  let successResponse = null;

  for (const endpoint of endpoints) {
    try {
      const response = await requestWithDedupe(userApi, endpoint);
      const data = unwrap(response);
      const row = data?.data || data || {};

      clearTradingCache();

      const paperTradingEnabled = normalizeBool(
        row?.paper_trading_enabled ?? row?.enabled ?? row?.is_enabled,
        nextEnabled
      );

      successResponse = {
        success: true,
        enabled: paperTradingEnabled,
        paper_trading_enabled: paperTradingEnabled,
        message: row?.message || (paperTradingEnabled ? "Paper trading enabled" : "Paper trading disabled"),
        data,
      };
      break;
    } catch (error) {
      lastError = error;
      const status = error?.response?.status;
      if (status !== 404 && status !== 405) break;
    }
  }

  if (!successResponse) {
    return handleApiError(lastError, "Failed to toggle paper trading");
  }

  // CRITICAL: After toggling paper trading ON, start the worker and execute first trade
  if (nextEnabled && successResponse.success) {
    try {
      // 1. Start the worker
      await startPaperWorker();
      console.log("[BotAPI] Paper worker started");

      // 2. Execute an immediate trade to test
      await executePaperTrade();
      console.log("[BotAPI] First paper trade executed");
      
      successResponse.message = "Paper trading enabled! Your first trade has been executed. The bot will continue trading automatically.";
    } catch (workerError) {
      console.warn("[BotAPI] Worker start failed:", workerError.message);
      successResponse.message = "Paper trading enabled. The bot will start trading shortly.";
    }
  }

  return successResponse;
};
export default BotAPI; 
