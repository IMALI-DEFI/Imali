// src/admin/GA4Analytics.jsx
import React, { useEffect, useState, useCallback } from 'react';

const trackGA4 = (eventName, params = {}) => {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", eventName, {
      page_path: window.location.pathname,
      page_location: window.location.href,
      ...params,
    });
  }
};

export default function GA4Analytics({ apiBase, showToast }) {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    adminViews: 0,
    tabClicks: 0,
    adminActions: 0,
    actionErrors: 0,
    signups: 0,
    subscriptions: 0,
    exchangeConnects: 0,
    walletConnects: 0,
  });
  const [error, setError] = useState(null);

  const getToken = () => localStorage.getItem("imali_token");

  const fetchAnalytics = useCallback(async () => {
    const token = getToken();

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${apiBase}/api/admin/analytics/ga4`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      // Check if response is JSON
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("API endpoint not available yet");
      }

      const data = await res.json();

      if (res.status === 404) {
        throw new Error("GA4 Analytics endpoint not configured yet");
      }

      if (data?.success) {
        setAnalytics(data.data || analytics);
      } else {
        throw new Error(data?.message || "Failed to load analytics");
      }
    } catch (err) {
      console.error("Failed to load GA4 analytics:", err);
      setError(err.message || "Failed to load GA4 analytics");
      // Don't show toast for 404 as it's expected when endpoint isn't ready
      if (!err.message.includes("not available") && !err.message.includes("not configured")) {
        showToast?.("Failed to load GA4 analytics", "error");
      }
    } finally {
      setLoading(false);
    }
  }, [apiBase, showToast]);

  useEffect(() => {
    trackGA4("admin_ga4_analytics_view");
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <span>📡</span> GA4 Analytics
          </h3>
          <p className="text-sm text-white/50">
            Admin activity and funnel tracking overview.
          </p>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-6 text-center">
          <div className="mb-3 text-5xl">📡</div>
          <h4 className="mb-2 text-lg font-semibold text-amber-300">GA4 Analytics Coming Soon</h4>
          <p className="mx-auto max-w-md text-sm text-white/60">
            The GA4 Analytics endpoint is being configured. Check back later for detailed admin activity tracking.
          </p>
          <p className="mt-2 text-xs text-white/40">
            Error: {error}
          </p>
          <button
            onClick={fetchAnalytics}
            className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/20 px-4 py-2 text-sm font-medium text-amber-300 transition hover:bg-amber-500/30"
          >
            Retry
          </button>
        </div>

        {/* Show placeholder metrics */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["📊", "Admin Views", 0],
            ["🧭", "Tab Clicks", 0],
            ["⚡", "Admin Actions", 0],
            ["⚠️", "Action Errors", 0],
            ["👤", "Signups", 0],
            ["💳", "Subscriptions", 0],
            ["🔌", "Exchange Connects", 0],
            ["👛", "Wallet Connects", 0],
          ].map(([icon, label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-white/10 bg-white/5 p-4 opacity-50"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-2xl">{icon}</span>
                <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs text-emerald-300">
                  GA4
                </span>
              </div>
              <div className="text-3xl font-bold text-white">
                {Number(value || 0).toLocaleString()}
              </div>
              <div className="text-sm text-white/50">{label}</div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4">
          <h4 className="mb-2 font-semibold text-cyan-300">Recommended Events</h4>
          <p className="text-sm text-white/60">
            Track signup, login, wallet connect, exchange connect, subscription started,
            live trading enabled, referral click, enterprise request, admin action success,
            and admin action error.
          </p>
          <div className="mt-3 rounded-lg bg-white/5 p-3">
            <p className="text-xs text-white/40">
              💡 To enable GA4 tracking, configure the endpoint at <code className="rounded bg-white/10 px-2 py-0.5 text-cyan-300">/api/admin/analytics/ga4</code>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const cards = [
    ["📊", "Admin Views", analytics.adminViews],
    ["🧭", "Tab Clicks", analytics.tabClicks],
    ["⚡", "Admin Actions", analytics.adminActions],
    ["⚠️", "Action Errors", analytics.actionErrors],
    ["👤", "Signups", analytics.signups],
    ["💳", "Subscriptions", analytics.subscriptions],
    ["🔌", "Exchange Connects", analytics.exchangeConnects],
    ["👛", "Wallet Connects", analytics.walletConnects],
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <span>📡</span> GA4 Analytics
        </h3>
        <p className="text-sm text-white/50">
          Admin activity and funnel tracking overview.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(([icon, label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-white/20"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-2xl">{icon}</span>
              <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs text-emerald-300">
                GA4
              </span>
            </div>
            <div className="text-3xl font-bold text-white">
              {Number(value || 0).toLocaleString()}
            </div>
            <div className="text-sm text-white/50">{label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4">
        <h4 className="mb-2 font-semibold text-cyan-300">Recommended Events</h4>
        <p className="text-sm text-white/60">
          Track signup, login, wallet connect, exchange connect, subscription started,
          live trading enabled, referral click, enterprise request, admin action success,
          and admin action error.
        </p>
      </div>
    </div>
  );
}
