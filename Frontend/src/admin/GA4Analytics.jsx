// src/admin/GA4Analytics.jsx
import React, { useEffect, useState, useCallback } from 'react';

// Track GA4 events
const trackGA4 = (eventName, params = {}) => {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", eventName, {
      page_path: window.location.pathname,
      page_location: window.location.href,
      ...params,
    });
  }
};

// Get GA4 client ID from cookies or localStorage
const getGA4ClientId = () => {
  try {
    // Try to get from _ga cookie
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === '_ga') {
        const parts = value.split('.');
        return parts[parts.length - 1];
      }
    }
    // Fallback to localStorage
    return localStorage.getItem('ga_client_id') || null;
  } catch (e) {
    return null;
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
  const [ga4Status, setGa4Status] = useState('checking');

  const getToken = () => localStorage.getItem("imali_token");

  // Fetch analytics from backend (when available)
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
        setGa4Status('connected');
      } else {
        throw new Error(data?.message || "Failed to load analytics");
      }
    } catch (err) {
      console.error("Failed to load GA4 analytics:", err);
      setError(err.message || "Failed to load GA4 analytics");
      setGa4Status('backend_unavailable');
      
      // Try to get local GA4 data
      try {
        const clientId = getGA4ClientId();
        if (clientId) {
          // We have a GA4 client ID, show that tracking is active
          setGa4Status('tracking_active');
        }
      } catch (e) {
        // Ignore
      }
    } finally {
      setLoading(false);
    }
  }, [apiBase, showToast]);

  useEffect(() => {
    // Track that admin viewed GA4 analytics page
    trackGA4("admin_ga4_analytics_view");
    
    // Check if GA4 is loaded
    const checkGA4 = () => {
      if (typeof window !== "undefined" && typeof window.gtag === "function") {
        setGa4Status('loaded');
      } else {
        setGa4Status('not_loaded');
      }
    };
    
    checkGA4();
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  // Show "Coming Soon" state when backend isn't ready
  if (error && ga4Status !== 'tracking_active') {
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
          <h4 className="mb-2 text-lg font-semibold text-amber-300">GA4 Analytics Dashboard</h4>
          <p className="mx-auto max-w-md text-sm text-white/60">
            {ga4Status === 'loaded' ? 
              '✅ GA4 tracking is active on the frontend. Backend analytics API is being configured.' :
              '🔄 GA4 Analytics endpoint is being configured. Check back later for detailed admin activity tracking.'
            }
          </p>
          {ga4Status === 'loaded' && (
            <div className="mt-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
              <p className="text-sm text-emerald-300">
                ✅ GA4 is tracking events from your browser
              </p>
            </div>
          )}
          <p className="mt-2 text-xs text-white/40">
            {error && `Error: ${error}`}
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
          <h4 className="mb-2 font-semibold text-cyan-300">📊 GA4 Implementation Status</h4>
          <div className="space-y-2 text-sm text-white/60">
            <div className="flex items-center gap-2">
              <span className={ga4Status === 'loaded' ? 'text-emerald-400' : 'text-yellow-400'}>
                {ga4Status === 'loaded' ? '✅' : '⏳'}
              </span>
              <span>Frontend GA4 Tracking: {ga4Status === 'loaded' ? 'Active' : 'Checking...'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-yellow-400">⏳</span>
              <span>Backend Analytics API: Pending</span>
            </div>
          </div>
          <div className="mt-3 rounded-lg bg-white/5 p-3">
            <p className="text-xs text-white/40">
              💡 To enable the full analytics dashboard, implement the endpoint at{' '}
              <code className="rounded bg-white/10 px-2 py-0.5 text-cyan-300">/api/admin/analytics/ga4</code>
            </p>
            <p className="mt-1 text-xs text-white/30">
              The endpoint should return analytics data with fields: adminViews, tabClicks, adminActions, 
              actionErrors, signups, subscriptions, exchangeConnects, walletConnects
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show real analytics data when available
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
        {ga4Status === 'tracking_active' && (
          <div className="mt-1 text-xs text-emerald-400">
            ✅ GA4 tracking active
          </div>
        )}
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4">
          <h4 className="mb-2 font-semibold text-cyan-300">🎯 Tracked Events</h4>
          <ul className="space-y-1 text-sm text-white/60">
            <li>• signup - New user registration</li>
            <li>• login - User login</li>
            <li>• wallet_connect - Wallet connection</li>
            <li>• exchange_connect - Exchange connection</li>
            <li>• subscription_started - Subscription start</li>
            <li>• live_trading_enabled - Live trading activated</li>
            <li>• referral_click - Referral link click</li>
            <li>• enterprise_request - Enterprise request</li>
            <li>• admin_action_success - Successful admin action</li>
            <li>• admin_action_error - Admin action error</li>
          </ul>
        </div>
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-4">
          <h4 className="mb-2 font-semibold text-purple-300">📈 Funnel Stages</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40">1.</span>
              <span className="text-sm text-white/60">Visitor → Signup</span>
              <span className="ml-auto text-xs text-emerald-400">{analytics.signups || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40">2.</span>
              <span className="text-sm text-white/60">Signup → Wallet Connect</span>
              <span className="ml-auto text-xs text-emerald-400">{analytics.walletConnects || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40">3.</span>
              <span className="text-sm text-white/60">Wallet → Exchange Connect</span>
              <span className="ml-auto text-xs text-emerald-400">{analytics.exchangeConnects || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40">4.</span>
              <span className="text-sm text-white/60">Exchange → Subscription</span>
              <span className="ml-auto text-xs text-emerald-400">{analytics.subscriptions || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
