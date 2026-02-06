import React, { useEffect, useState } from "react";
import { Tabs, TabList, Tab, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import { useNavigate } from "react-router-dom";

import { BotAPI } from "../../utils/BotAPI";
import { useWallet } from "../../context/WalletContext";
import { short } from "../../getContractInstance";

/* Feature modules - Ensure these components exist in your project */
import ImaliBalance from "./ImaliBalance";
import Staking from "./Staking";
import YieldFarming from "./YieldFarming";
import NFTPreview from "./NFTPreview";
import TierStatus from "./TierStatus";
import RecentTradesTable from "./RecentTradesTable";
import ReferralSystem from "./ReferralSystem";
import TradeDemo from "../../pages/TradeDemo";
import Futures from "./Futures";

/* Tier helpers */
const ORDER = ["starter", "pro", "elite", "bundle"];
const tierAtLeast = (t, need) =>
  ORDER.indexOf(t) >= ORDER.indexOf(need);

export default function MemberDashboard() {
  const nav = useNavigate();
  const wallet = useWallet?.() ?? {};
  const { account, connectWallet, disconnectWallet } = wallet;

  const [user, setUser] = useState(null);
  const [trades, setTrades] = useState([]);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tradingEnabled, setTradingEnabled] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [activationStatus, setActivationStatus] = useState(null);

  /* ---------------- Load User & Activation Status ---------------- */
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // Load user data
        const userData = await BotAPI.me();
        if (!mounted) return;
        
        const userObj = userData?.user || userData || null;
        setUser(userObj);
        
        // Load activation status
        const activationData = await BotAPI.activationStatus();
        if (!mounted) return;
        
        const status = activationData?.status || activationData || {};
        setActivationStatus(status);
        setTradingEnabled(status?.trading_enabled || false);
        
      } catch (err) {
        console.error("Dashboard load error:", err);
        if (err?.status === 401) {
          setError("Session expired. Please log in again.");
          setTimeout(() => nav("/login"), 2000);
        } else {
          setError("Failed to load dashboard data. Please try again.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [nav]);

  /* ---------------- Load Trades ---------------- */
  useEffect(() => {
    if (!user) return;
    
    (async () => {
      try {
        const data = await BotAPI.sniperTrades();
        setTrades(Array.isArray(data?.trades) ? data.trades : []);
      } catch (err) {
        console.error("Failed to load trades:", err);
        // Don't show error for trades, just leave empty
      }
    })();
  }, [user]);

  /* ---------------- Stop Trading ---------------- */
  const stopTrading = async () => {
    if (!window.confirm("⛔ Are you sure you want to STOP ALL trading immediately? This will disable your bot until you re-enable it.")) return;

    try {
      setStopping(true);
      await BotAPI.tradingEnable(false);
      setTradingEnabled(false);
      
      // Update activation status
      const activationData = await BotAPI.activationStatus();
      setActivationStatus(activationData?.status || activationData || {});
      
      alert("✅ Trading has been stopped. Your bot is now disabled.");
    } catch (err) {
      console.error("Stop trading error:", err);
      alert(`❌ Failed to stop trading: ${err.message}`);
    } finally {
      setStopping(false);
    }
  };

  /* ---------------- Start Trading ---------------- */
  const startTrading = async () => {
    try {
      setStopping(true);
      await BotAPI.tradingEnable(true);
      setTradingEnabled(true);
      
      // Update activation status
      const activationData = await BotAPI.activationStatus();
      setActivationStatus(activationData?.status || activationData || {});
      
      alert("✅ Trading has been enabled. Your bot is now active.");
    } catch (err) {
      console.error("Start trading error:", err);
      alert(`❌ Failed to start trading: ${err.message}`);
    } finally {
      setStopping(false);
    }
  };

  /* ---------------- Start Bot ---------------- */
  const startBot = async () => {
    if (!window.confirm("🚀 Start the trading bot? This will begin automated trading based on your strategy.")) return;

    try {
      setStopping(true);
      const result = await BotAPI.botStart({ mode: "live" });
      
      if (result?.started) {
        alert("✅ Bot started successfully!");
      } else {
        alert("⚠️ Bot may not have started. Check the logs.");
      }
    } catch (err) {
      console.error("Start bot error:", err);
      alert(`❌ Failed to start bot: ${err.message}`);
    } finally {
      setStopping(false);
    }
  };

  const tier = (user?.tier || "starter").toLowerCase();
  const email = user?.email || "user@example.com";
  const isActivationComplete = activationStatus?.activation_complete || false;

  /* ---------------- Loading State ---------------- */
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 to-black p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  /* ---------------- Error State ---------------- */
  if (error || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 to-black flex items-center justify-center text-white">
        <div className="text-center space-y-6 max-w-md p-8 bg-gray-900/50 rounded-2xl border border-gray-800">
          <div className="text-red-400 text-2xl mb-2">⚠️</div>
          <h2 className="text-xl font-bold">{error || "Not authenticated"}</h2>
          <p className="text-gray-400">Please log in to access your dashboard.</p>
          <button
            onClick={() => nav("/login")}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 font-medium transition-all"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  /* ---------------- Render Dashboard ---------------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 to-black text-white">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">🚀 Trading Dashboard</h1>
            <p className="text-gray-400">Welcome back, {email}</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-gray-900/50 border border-gray-800 rounded-full text-sm">
              <span className="text-gray-400">Tier: </span>
              <span className="font-medium capitalize">{tier}</span>
            </div>
            {user?.is_admin && (
              <div className="px-3 py-1 bg-purple-600/20 text-purple-400 rounded-full text-xs">
                Admin
              </div>
            )}
          </div>
        </div>

        {/* Activation Status Banner */}
        {!isActivationComplete && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="text-amber-400 text-xl">⚠️</div>
              <div>
                <h3 className="font-semibold text-amber-300">Account Not Fully Activated</h3>
                <p className="text-amber-200/80 text-sm">
                  Complete activation to enable full trading features. 
                  <button 
                    onClick={() => nav("/activation")}
                    className="ml-2 text-amber-400 underline"
                  >
                    Go to Activation
                  </button>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Trading Control Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Trading Status Card */}
          <div className={`rounded-xl p-6 ${
            tradingEnabled
              ? "bg-gradient-to-br from-emerald-900/20 to-emerald-800/10 border border-emerald-500/30"
              : "bg-gradient-to-br from-red-900/20 to-red-800/10 border border-red-500/30"
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  tradingEnabled ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                }`}>
                  {tradingEnabled ? "✓" : "⛔"}
                </div>
                <div>
                  <h3 className="font-bold text-lg">
                    {tradingEnabled ? "Trading Active" : "Trading Stopped"}
                  </h3>
                  <p className="text-sm opacity-80">
                    {tradingEnabled ? "Bot is running" : "Bot is disabled"}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              {tradingEnabled ? (
                <>
                  <button
                    onClick={stopTrading}
                    disabled={stopping}
                    className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {stopping ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Stopping...
                      </span>
                    ) : (
                      "⛔ STOP ALL TRADING"
                    )}
                  </button>
                  <button
                    onClick={startBot}
                    disabled={stopping}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 font-medium transition-colors disabled:opacity-50"
                  >
                    🚀 Restart Bot
                  </button>
                </>
              ) : (
                <button
                  onClick={startTrading}
                  disabled={stopping}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {stopping ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Enabling...
                    </span>
                  ) : (
                    "✅ ENABLE TRADING"
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Wallet Card */}
          <div className="rounded-xl p-6 bg-gray-900/50 border border-gray-800">
            <h3 className="font-bold text-lg mb-4">Wallet Connection</h3>
            {account ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <span className="text-blue-400">₿</span>
                    </div>
                    <div>
                      <p className="font-mono">{short(account)}</p>
                      <p className="text-xs text-gray-500">Connected</p>
                    </div>
                  </div>
                  <button 
                    onClick={disconnectWallet}
                    className="text-sm text-red-400 hover:text-red-300"
                  >
                    Disconnect
                  </button>
                </div>
                <p className="text-sm text-gray-400">
                  Your wallet is connected for on-chain interactions.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-400">Connect your wallet for full features</p>
                <button 
                  onClick={connectWallet}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 font-medium transition-all"
                >
                  Connect Wallet
                </button>
              </div>
            )}
          </div>

          {/* Tier Status Card */}
          <div className="rounded-xl p-6 bg-gray-900/50 border border-gray-800">
            <TierStatus user={user} activationStatus={activationStatus} />
          </div>
        </div>

        {/* Main Content Tabs */}
        <div className="bg-gray-900/30 rounded-2xl border border-gray-800 overflow-hidden">
          <Tabs selectedIndex={tab} onSelect={setTab}>
            <TabList className="flex border-b border-gray-800 bg-gray-900/50">
              {["Overview", "Extras", "Futures", "Analytics"].map((t, i) => (
                <Tab
                  key={t}
                  className={`px-6 py-4 cursor-pointer font-medium transition-colors ${
                    tab === i 
                      ? "text-blue-400 border-b-2 border-blue-400 bg-gray-900/80" 
                      : "text-gray-400 hover:text-gray-300 hover:bg-gray-900/30"
                  }`}
                >
                  {t}
                </Tab>
              ))}
            </TabList>

            {/* Overview Tab */}
            <TabPanel className="p-6">
              <div className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold">Live Trading</h3>
                    <TradeDemo />
                  </div>
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold">Recent Trades</h3>
                    <RecentTradesTable rows={trades} />
                  </div>
                </div>
                
                {trades.length === 0 && (
                  <div className="text-center py-12 border-2 border-dashed border-gray-800 rounded-xl">
                    <div className="text-gray-500 text-4xl mb-4">📊</div>
                    <h4 className="text-lg font-semibold text-gray-400 mb-2">No trades yet</h4>
                    <p className="text-gray-500 mb-6">Start trading to see your activity here</p>
                    <button
                      onClick={startTrading}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 font-medium"
                    >
                      Enable Trading
                    </button>
                  </div>
                )}
              </div>
            </TabPanel>

            {/* Extras Tab */}
            <TabPanel className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="col-span-1">
                  <ImaliBalance />
                </div>
                
                <div className="col-span-1">
                  {tierAtLeast(tier, "pro") ? (
                    <Staking />
                  ) : (
                    <div className="p-6 bg-gray-900/50 border border-gray-800 rounded-xl">
                      <h4 className="font-bold text-lg mb-3">Staking</h4>
                      <p className="text-gray-400 mb-4">Upgrade to Pro tier to access staking features</p>
                      <button
                        onClick={() => nav("/upgrade")}
                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-sm font-medium"
                      >
                        Upgrade to Pro
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="col-span-1">
                  {tierAtLeast(tier, "elite") ? (
                    <YieldFarming />
                  ) : (
                    <div className="p-6 bg-gray-900/50 border border-gray-800 rounded-xl">
                      <h4 className="font-bold text-lg mb-3">Yield Farming</h4>
                      <p className="text-gray-400 mb-4">Elite tier required for yield farming</p>
                      <button
                        onClick={() => nav("/upgrade")}
                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-sm font-medium"
                      >
                        Upgrade to Elite
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="col-span-1 md:col-span-2">
                  <NFTPreview />
                </div>
                
                <div className="col-span-1 md:col-span-2 lg:col-span-1">
                  <ReferralSystem />
                </div>
              </div>
            </TabPanel>

            {/* Futures Tab */}
            <TabPanel className="p-6">
              {tierAtLeast(tier, "elite") ? (
                <Futures />
              ) : (
                <div className="text-center py-16 border-2 border-dashed border-gray-800 rounded-xl">
                  <div className="text-gray-500 text-6xl mb-6">⚡</div>
                  <h4 className="text-2xl font-bold text-gray-300 mb-3">Futures Trading</h4>
                  <p className="text-gray-400 mb-6 max-w-md mx-auto">
                    Access advanced futures trading with leverage, hedging, and more sophisticated strategies.
                  </p>
                  <div className="inline-flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={() => nav("/upgrade")}
                      className="px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 font-bold"
                    >
                      Upgrade to Elite
                    </button>
                    <button
                      onClick={() => nav("/features")}
                      className="px-8 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 font-medium"
                    >
                      View All Features
                    </button>
                  </div>
                </div>
              )}
            </TabPanel>

            {/* Analytics Tab */}
            <TabPanel className="p-6">
              <div className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* P&L Chart Placeholder */}
                  <div className="p-6 bg-gray-900/50 border border-gray-800 rounded-xl">
                    <h4 className="font-bold text-lg mb-4">P&L Performance</h4>
                    <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-800 rounded-lg">
                      <p className="text-gray-500">Chart would display here</p>
                    </div>
                  </div>
                  
                  {/* Win/Loss Stats Placeholder */}
                  <div className="p-6 bg-gray-900/50 border border-gray-800 rounded-xl">
                    <h4 className="font-bold text-lg mb-4">Win/Loss Statistics</h4>
                    <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-800 rounded-lg">
                      <p className="text-gray-500">Stats would display here</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 bg-gray-900/50 border border-gray-800 rounded-xl">
                  <h4 className="font-bold text-lg mb-4">Fee History</h4>
                  <div className="h-48 flex items-center justify-center border-2 border-dashed border-gray-800 rounded-lg">
                    <p className="text-gray-500">Fee history would display here</p>
                  </div>
                </div>
              </div>
            </TabPanel>
          </Tabs>
        </div>

        {/* Footer Status */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-500 pt-8 border-t border-gray-800">
          <div>
            <span className="text-gray-400">Status: </span>
            <span className={isActivationComplete ? "text-emerald-400" : "text-amber-400"}>
              {isActivationComplete ? "Fully Activated" : "Setup Required"}
            </span>
          </div>
          <div className="flex gap-6">
            <button 
              onClick={() => nav("/activation")}
              className="text-blue-400 hover:text-blue-300"
            >
              Activation
            </button>
            <button 
              onClick={() => nav("/billing")}
              className="text-blue-400 hover:text-blue-300"
            >
              Billing
            </button>
            <button 
              onClick={() => nav("/settings")}
              className="text-blue-400 hover:text-blue-300"
            >
              Settings
            </button>
            <button 
              onClick={() => BotAPI.logout() && nav("/login")}
              className="text-red-400 hover:text-red-300"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}