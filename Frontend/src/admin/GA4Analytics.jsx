// src/admin/GA4Analytics.jsx
import React, { useEffect, useState } from 'react';

// Track GA4 events helper
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
  const [loading, setLoading] = useState(false);
  const [ga4Status, setGa4Status] = useState('checking');
  const [trackingId, setTrackingId] = useState(null);

  useEffect(() => {
    // Check if GA4 is loaded
    const checkGA4 = () => {
      if (typeof window !== "undefined") {
        // Check if gtag is available
        if (typeof window.gtag === "function") {
          setGa4Status('active');
          // Try to get tracking ID from the page
          const scripts = document.querySelectorAll('script[src*="googletagmanager"]');
          if (scripts.length > 0) {
            const src = scripts[0].src;
            const match = src.match(/id=([A-Za-z0-9-]+)/);
            if (match) {
              setTrackingId(match[1]);
            }
          }
        } else {
          setGa4Status('not_loaded');
        }
      }
    };

    // Track that admin viewed GA4 analytics page
    trackGA4("admin_ga4_analytics_view");

    checkGA4();
    
    // Check again after a short delay
    const timer = setTimeout(checkGA4, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Function to manually track events for testing
  const trackTestEvent = (eventName) => {
    trackGA4(eventName, {
      test: true,
      timestamp: new Date().toISOString()
    });
    showToast?.(`✅ Tracked: ${eventName}`, 'success');
  };

  const events = [
    { name: 'signup', label: 'New User Signup', emoji: '👤' },
    { name: 'login', label: 'User Login', emoji: '🔑' },
    { name: 'wallet_connect', label: 'Wallet Connected', emoji: '👛' },
    { name: 'exchange_connect', label: 'Exchange Connected', emoji: '🔌' },
    { name: 'subscription_started', label: 'Subscription Started', emoji: '💳' },
    { name: 'live_trading_enabled', label: 'Live Trading Enabled', emoji: '📈' },
    { name: 'referral_click', label: 'Referral Click', emoji: '🔗' },
    { name: 'enterprise_request', label: 'Enterprise Request', emoji: '🏢' },
    { name: 'admin_action_success', label: 'Admin Action Success', emoji: '✅' },
    { name: 'admin_action_error', label: 'Admin Action Error', emoji: '❌' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <span>📡</span> GA4 Analytics
        </h3>
        <p className="text-sm text-white/50">
          Google Analytics 4 tracking and event monitoring
        </p>
      </div>

      {/* GA4 Status Card */}
      <div className={`rounded-xl border p-4 ${
        ga4Status === 'active' 
          ? 'border-emerald-500/20 bg-emerald-500/10' 
          : 'border-yellow-500/20 bg-yellow-500/10'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">
              {ga4Status === 'active' ? '✅' : '⏳'}
            </span>
            <div>
              <h4 className="font-semibold">
                {ga4Status === 'active' ? 'GA4 Tracking Active' : 'GA4 Status Unknown'}
              </h4>
              <p className="text-sm text-white/50">
                {ga4Status === 'active' 
                  ? `Tracking ID: ${trackingId || 'G-KDRSH4G2Y9'}`
                  : 'Checking GA4 integration...'
                }
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className={`inline-block rounded-full px-2 py-1 text-xs ${
              ga4Status === 'active'
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-yellow-500/20 text-yellow-300'
            }`}>
              {ga4Status === 'active' ? 'Live' : 'Checking'}
            </span>
          </div>
        </div>
        {ga4Status === 'active' && (
          <div className="mt-3 text-xs text-white/40">
            🎯 Events are being sent to Google Analytics in real-time
          </div>
        )}
      </div>

      {/* Tracked Events List */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h4 className="mb-3 font-semibold flex items-center gap-2">
          <span>📋</span> Tracked Events
          <span className="ml-2 text-xs text-white/40 font-normal">
            (Click to test)
          </span>
        </h4>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <button
              key={event.name}
              onClick={() => trackTestEvent(event.name)}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-sm transition hover:bg-white/10 hover:border-white/20"
            >
              <span>{event.emoji}</span>
              <span className="flex-1">{event.label}</span>
              <span className="text-xs text-white/30">▶</span>
            </button>
          ))}
        </div>
      </div>

      {/* Event Details */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4">
          <h4 className="mb-2 font-semibold text-cyan-300">🔍 How It Works</h4>
          <ul className="space-y-2 text-sm text-white/60">
            <li className="flex items-start gap-2">
              <span className="text-cyan-400">1.</span>
              <span>Events are automatically tracked when users interact with the platform</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400">2.</span>
              <span>All events are sent to Google Analytics with the tracking ID <code className="rounded bg-white/10 px-1 text-cyan-300">G-KDRSH4G2Y9</code></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400">3.</span>
              <span>View detailed analytics in the <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Google Analytics Dashboard</a></span>
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-4">
          <h4 className="mb-2 font-semibold text-purple-300">📈 Funnel Stages</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40">1.</span>
              <span className="text-sm text-white/60">Visitor → Signup</span>
              <span className="ml-auto text-xs text-emerald-400">Tracked as <code className="rounded bg-white/10 px-1">signup</code></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40">2.</span>
              <span className="text-sm text-white/60">Signup → Wallet Connect</span>
              <span className="ml-auto text-xs text-emerald-400">Tracked as <code className="rounded bg-white/10 px-1">wallet_connect</code></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40">3.</span>
              <span className="text-sm text-white/60">Wallet → Exchange Connect</span>
              <span className="ml-auto text-xs text-emerald-400">Tracked as <code className="rounded bg-white/10 px-1">exchange_connect</code></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40">4.</span>
              <span className="text-sm text-white/60">Exchange → Subscription</span>
              <span className="ml-auto text-xs text-emerald-400">Tracked as <code className="rounded bg-white/10 px-1">subscription_started</code></span>
            </div>
          </div>
        </div>
      </div>

      {/* Test Instructions */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
        <h4 className="mb-2 font-semibold text-amber-300">🧪 Test Events</h4>
        <p className="text-sm text-white/60">
          Click any event button above to send a test event to GA4. Check the 
          <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline ml-1">
            Google Analytics Dashboard
          </a>
          {' '}to see the events in Real-Time reports.
        </p>
        <div className="mt-3 rounded-lg bg-white/5 p-3">
          <p className="text-xs text-white/40">
            💡 Real-time events appear in Google Analytics under "Reports → Real-Time"
          </p>
        </div>
      </div>
    </div>
  );
}
