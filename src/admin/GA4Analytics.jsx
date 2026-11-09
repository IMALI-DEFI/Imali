// src/admin/GA4Analytics.jsx
import React, { useEffect, useState } from 'react';
import {apiFetch} from '../context/AuthContext';

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
  const [portfolio,setPortfolio]=useState(null);
  useEffect(()=>{const load=()=>apiFetch('/api/admin/analytics/portfolio').then(r=>{if(r?.success)setPortfolio(r)}).catch(()=>{});load();const timer=setInterval(load,300000);return()=>clearInterval(timer)},[]);
  const [ga4Status, setGa4Status] = useState('checking');
  const [trackingId, setTrackingId] = useState(null);
  const [showDashboard, setShowDashboard] = useState(true);

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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <span>📡</span> GA4 Analytics Dashboard
          </h3>
          <p className="text-sm text-white/50">
            Google Analytics 4 tracking and Looker Studio dashboard
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDashboard(!showDashboard)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs transition hover:bg-white/10"
          >
            {showDashboard ? 'Hide Dashboard' : 'Show Dashboard'}
          </button>
        </div>
      </div>

      <section className="imali-traffic-dashboard">
        <h3 className="text-xl font-bold text-amber-200">🌐 Traffic by website</h3>
        <p className="imali-traffic-notice">Live Google Analytics reporting · last 30 days · refreshes every 5 minutes. Visitors means active users; sessions means visits.</p>
        <div className="imali-traffic-products mt-4" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,240px),1fr))',gap:12}}>
          {[['🤖 IMALI DeFi','imali-defi.com'],['🏀 Sports Jedi','sportsjedi.com'],['🎮 Black Culture Vault','blackculturevault.com']].map(([name,domain])=>{
            const metrics=portfolio?.sites?.[domain];
            return <div key={domain} className="imali-traffic-product" style={{minWidth:0,overflowWrap:'anywhere'}}>
              <span>{name}</span>
              <strong style={{fontSize:'clamp(20px,4vw,29px)'}}>{metrics ? metrics.sessions.toLocaleString()+' sessions' : 'Loading reporting…'}</strong>
              <small>{metrics ? metrics.visitors.toLocaleString()+' visitors · '+metrics.pageViews.toLocaleString()+' page views' : 'No verified figures available yet'}</small>
              <small>{domain}</small>
            </div>;
          })}
        </div>
        <div className="imali-traffic-panel mt-4"><h4>IMALI traffic sources · saved November 8 snapshot (not live)</h4>
          { [['Direct',253],['Email',146],['Organic Social',85],['AI Assistant',29],['Organic Search',25],['Unassigned',19],['Referral',9]].map(([name,n])=><div key={name} className="imali-traffic-channel"><span>{name}</span><div className="imali-traffic-track"><div style={{width:(n/253*100)+'%'}}/></div><strong>{n}</strong></div>)}
        </div>
      </section>
      <TrafficDefinitions />
      <PartnerReferralTracking />
      <UpgradeAttribution />
      {/* GA4 Status Card */}
      <div className={`rounded-xl border p-4 ${
        ga4Status === 'active' 
          ? 'border-emerald-500/20 bg-emerald-500/10' 
          : 'border-yellow-500/20 bg-yellow-500/10'
      }`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
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
          <div className="flex items-center gap-3">
            <span className={`inline-block rounded-full px-2 py-1 text-xs ${
              ga4Status === 'active'
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-yellow-500/20 text-yellow-300'
            }`}>
              {ga4Status === 'active' ? 'Live' : 'Checking'}
            </span>
            <a
              href="https://analytics.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-cyan-400 hover:text-cyan-300 transition"
            >
              Open GA4 →
            </a>
          </div>
        </div>
        {ga4Status === 'active' && (
          <div className="mt-3 text-xs text-white/40">
            🎯 Events are being sent to Google Analytics in real-time
          </div>
        )}
      </div>

      <section className="rounded-2xl border border-amber-300/40 bg-gradient-to-br from-purple-900/70 to-blue-950/70 p-5">
        <h4 className="text-lg font-bold text-amber-200">📊 IMALI Portfolio Analytics</h4>
        <p className="mt-2 text-sm text-white/80">Track all three websites in one GA4 property, then separate them by the <strong>Host name</strong> dimension in Looker Studio. The report below is your existing Looker report; editing its charts requires Google account access.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[['🤖 IMALI DeFi','imali-defi.com'],['🏀 Sports Jedi','sportsjedi.com'],['🎮 Black Culture Vault','blackculturevault.com']].map(([name,host])=><div key={host} className="rounded-xl border border-white/20 bg-white/10 p-4"><strong className="block text-amber-100">{name}</strong><span className="mt-1 block text-xs text-white/70">{host}</span></div>)}
        </div>
        <p className="mt-4 text-sm text-white/70">Recommended report pages: Portfolio Overview · Visitors &amp; Traffic Sources · Signup Funnel · Upgrades &amp; Revenue · Per-App Performance. Only display conversion or revenue totals after their events are verified in GA4.</p>
        <div className="mt-3 flex flex-wrap gap-3"><a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950">Open GA4</a><a href="https://lookerstudio.google.com/reporting/2e04368f-5882-4e35-83ed-0f54efe5bf83/page/rL0PF" target="_blank" rel="noopener noreferrer" className="rounded-lg border border-white/40 px-4 py-2 text-sm text-white">Edit Looker Report</a></div>
      </section>
      {/* Looker Studio Dashboard Embed */}
      {showDashboard && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-2 overflow-hidden">
          <div className="flex items-center justify-between mb-2 px-2">
            <span className="text-sm font-medium text-white/60">📊 Looker Studio Dashboard</span>
            <a
              href="https://datastudio.google.com/reporting/2e04368f-5882-4e35-83ed-0f54efe5bf83/page/rL0PF"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-cyan-400 hover:text-cyan-300 transition"
            >
              Open Full Screen →
            </a>
          </div>
          <div className="relative w-full" style={{ paddingBottom: '73.83%' }}>
            <iframe
              src="https://datastudio.google.com/embed/reporting/2e04368f-5882-4e35-83ed-0f54efe5bf83/page/rL0PF"
              className="absolute top-0 left-0 w-full h-full rounded-lg"
              frameBorder="0"
              allowFullScreen
              sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
              title="IMALI GA4 Analytics Dashboard"
            />
          </div>
        </div>
      )}

      {/* Tracked Events - Quick Actions */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h4 className="mb-3 font-semibold flex items-center gap-2">
            <span>📋</span> Tracked Events
            <span className="ml-2 text-xs text-white/40 font-normal">
              (Click to test)
            </span>
          </h4>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {events.map((event) => (
              <button
                key={event.name}
                onClick={() => trackTestEvent(event.name)}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-sm transition hover:bg-white/10 hover:border-white/20"
              >
                <span>{event.emoji}</span>
                <span className="flex-1 text-xs">{event.label}</span>
                <span className="text-xs text-white/20">▶</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4">
            <h4 className="mb-2 font-semibold text-cyan-300">🔍 Dashboard Insights</h4>
            <ul className="space-y-2 text-sm text-white/60">
              <li className="flex items-start gap-2">
                <span className="text-cyan-400">•</span>
                <span>Real-time user activity and engagement metrics</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400">•</span>
                <span>Funnel analysis for signup → conversion tracking</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400">•</span>
                <span>Admin panel usage and performance metrics</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400">•</span>
                <span>Custom event tracking for platform actions</span>
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-4">
            <h4 className="mb-2 font-semibold text-purple-300">📈 Funnel Stages</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40">1.</span>
                <span className="text-sm text-white/60">Visitor → Signup</span>
                <span className="ml-auto text-xs text-emerald-400">signup</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40">2.</span>
                <span className="text-sm text-white/60">Signup → Wallet Connect</span>
                <span className="ml-auto text-xs text-emerald-400">wallet_connect</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40">3.</span>
                <span className="text-sm text-white/60">Wallet → Exchange Connect</span>
                <span className="ml-auto text-xs text-emerald-400">exchange_connect</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40">4.</span>
                <span className="text-sm text-white/60">Exchange → Subscription</span>
                <span className="ml-auto text-xs text-emerald-400">subscription_started</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Resources */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
        <h4 className="mb-2 font-semibold text-amber-300">🔗 Quick Links</h4>
        <div className="flex flex-wrap gap-3">
          <a
            href="https://analytics.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-amber-400 hover:text-amber-300 transition"
          >
            📊 Google Analytics Dashboard
          </a>
          <a
            href="https://datastudio.google.com/reporting/2e04368f-5882-4e35-83ed-0f54efe5bf83/page/rL0PF"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-amber-400 hover:text-amber-300 transition"
          >
            📈 Looker Studio Full Dashboard
          </a>
          <a
            href="https://support.google.com/analytics/answer/10089681?hl=en"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-amber-400 hover:text-amber-300 transition"
          >
            📖 GA4 Documentation
          </a>
        </div>
        <div className="mt-3 rounded-lg bg-white/5 p-3">
          <p className="text-xs text-white/40">
            💡 Click any event button above to send a test event to GA4 and see it appear in Real-Time reports.
          </p>
        </div>
      </div>
    </div>
  );
}


function UpgradeAttribution(){
 const [days,setDays]=useState(30),[data,setData]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let alive=true;setBusy(true);apiFetch('/api/admin/marketing/upgrade-attribution?days='+days).then(r=>{if(alive){setData(r);setError('')}}).catch(()=>{if(alive){setError('Paid-upgrade attribution is unavailable.');setData(null)}}).finally(()=>{if(alive)setBusy(false)});return()=>{alive=false}},[days]);
 const rows=data?.rows||[];const paid=rows.reduce((n,r)=>n+(Number(r.paid_upgrades)||0),0),signups=rows.reduce((n,r)=>n+(Number(r.signups)||0),0);
 return <section className="imali-traffic-dashboard" aria-label="Paid upgrade attribution"><div className="imali-traffic-heading"><div><h3>💳 Paid Upgrades · Winning Messages</h3><p>Which ads and posts bring paying customers?</p></div><label>Period <select className="rounded-lg bg-slate-900 p-2" value={days} onChange={e=>setDays(Number(e.target.value))}><option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option></select></label></div><p className="imali-traffic-notice">Based on recorded signup events and Stripe-confirmed purchases. Message = UTM content. Unattributed means the original message was not recorded. This is event-based reporting, not a user cohort or revenue report.</p>{error&&<p role="alert" className="text-amber-200">{error}</p>}{busy&&<p>Refreshing upgrade data…</p>}{data&&<><div className="imali-traffic-metrics"><div className="imali-traffic-metric"><span>Recorded signups</span><strong>{signups}</strong></div><div className="imali-traffic-metric"><span>Recorded paid upgrades</span><strong>{paid}</strong></div><div className="imali-traffic-metric"><span>Tracked messages</span><strong>{rows.filter(r=>r.message!=='unattributed').length}</strong></div></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead><tr className="text-amber-200"><th className="p-2">Product</th><th className="p-2">Source / campaign</th><th className="p-2">Ad or message</th><th className="p-2">Signups</th><th className="p-2">Paid upgrades</th></tr></thead><tbody>{rows.map((r,i)=><tr key={i} className="border-t border-white/20"><td className="p-2">{r.product}</td><td className="p-2">{r.source} / {r.campaign}</td><td className="p-2">{r.message}</td><td className="p-2">{r.signups}</td><td className="p-2 font-bold text-amber-200">{r.paid_upgrades}</td></tr>)}</tbody></table>{rows.length===0&&<p className="p-4 text-white/70">No matching recorded events for this period. New campaigns should include source, campaign and message tags.</p>}</div></>}</section>
}


const TRAFFIC_GLOSSARY=[
 ['Direct','A visit with no known source. The person may have typed your address, used a bookmark, or clicked an untagged link.'],
 ['Email','A visit Google Analytics identifies as coming from an email link or campaign.'],
 ['Organic Social','An unpaid visit from a social network, such as Threads, Instagram, or Facebook.'],
 ['AI Assistant','A visit referred by an AI assistant or chat tool.'],
 ['Organic Search','A visit from unpaid search results, such as Google or Bing.'],
 ['Unassigned','Google Analytics could not fit the visit into a standard traffic category.'],
 ['Referral','A visit from a link on another website. This does NOT necessarily mean an IMALI referral partner.'],
 ['Session','One website visit. The same person can make more than one visit.'],
 ['Active user','A person GA4 counted as active in the chosen period.'],
 ['Paid upgrade','A purchase confirmed by the payment system, not merely a visit or signup.'],
 ['Partner referral','A signup credited to a partner using their unique referral code. Track this separately from GA4 Referral traffic.']
];
function TrafficDefinitions(){return <section className="imali-traffic-dashboard"><h3 className="text-xl font-bold text-amber-200">📖 What these numbers mean</h3><p className="imali-traffic-notice">Tap a term to read its simple definition.</p><div className="grid gap-2 sm:grid-cols-2">{TRAFFIC_GLOSSARY.map(([name,meaning])=><details key={name} className="rounded-xl border border-white/20 bg-white/10 p-3"><summary className="cursor-pointer font-bold text-amber-100">{name}</summary><p className="mt-2 text-sm text-white/80">{meaning}</p></details>)}</div></section>}
function PartnerReferralTracking(){const [data,setData]=useState(null),[error,setError]=useState('');const refresh=()=>apiFetch('/api/admin/referrals/partners').then(r=>{setData(r.data);setError('')}).catch(()=>{setData(null);setError('Partner referrals are unavailable.');});useEffect(()=>{refresh();const t=setInterval(refresh,60000);return()=>clearInterval(t)},[]);const partners=data?.referrals||[];return <section className="imali-traffic-dashboard"><div className="imali-traffic-heading"><div><h3>🤝 Partner Referral Tracking</h3><p>Which partners bring real signups and qualified customers?</p></div><button type="button" className="rounded-lg border border-amber-200/50 px-3 py-2 text-sm" onClick={refresh}>↻ Refresh</button></div><p className="imali-traffic-notice">These figures come from IMALI's referral records, not the GA4 “Referral” traffic category. A partner link looks like imali-defi.com/signup?ref=PARTNERCODE. Existing referral events determine credit.</p>{error&&<p role="alert">{error}</p>}<div className="imali-traffic-metrics"><div className="imali-traffic-metric"><span>Partners with referrals</span><strong>{data?partners.length:'—'}</strong></div><div className="imali-traffic-metric"><span>Referred signups</span><strong>{data?data.stats?.total_referrals??0:'—'}</strong></div><div className="imali-traffic-metric"><span>Qualified referrals</span><strong>{data?data.stats?.qualified_referrals??0:'—'}</strong></div></div>{partners.length>0&&<div className="mt-4 overflow-x-auto"><table className="w-full min-w-[470px] text-left text-sm"><thead><tr className="text-amber-200"><th className="p-2">Partner / code</th><th className="p-2">Signups</th><th className="p-2">Qualified</th></tr></thead><tbody>{partners.map(p=><tr key={p.user_id} className="border-t border-white/20"><td className="p-2">{p.email}<div className="text-xs text-white/60">{p.referral_code}</div></td><td className="p-2">{p.total_referrals}</td><td className="p-2">{p.qualified_referrals}</td></tr>)}</tbody></table></div>}{data&&partners.length===0&&<p className="mt-3 text-sm text-white/70">No partner referral events recorded yet.</p>}<p className="imali-traffic-notice">Paid upgrades by partner require confirmed purchases linked to the referred customer. They are not estimated here.</p></section>}
