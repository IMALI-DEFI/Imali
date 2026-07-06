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

  const getToken = () => localStorage.getItem("imali_token");

  const fetchAnalytics = useCallback(async () => {
    const token = getToken();

    try {
      setLoading(true);

      const res = await fetch(`${apiBase}/api/admin/analytics/ga4`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();

      if (data?.success) {
        setAnalytics(data.data || analytics);
      }
    } catch (err) {
      console.error("Failed to load GA4 analytics:", err);
      showToast?.("Failed to load GA4 analytics", "error");
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
            className="rounded-xl border border-white/10 bg-white/5 p-4"
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
