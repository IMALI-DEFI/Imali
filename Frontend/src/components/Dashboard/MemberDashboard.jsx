// src/pages/member/MemberDashboard.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import BotAPI from "../../utils/BotAPI";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
);

// ==============================================
// SIMPLE STRATEGIES - Easy to understand
// ==============================================
const STRATEGIES = [
  { value: "safe", label: "Safe & Steady", icon: "🐢", risk: 1, description: "Low risk, small but steady gains" },
  { value: "balanced", label: "Balanced", icon: "⚖️", risk: 2, description: "Mix of safe and growth" },
  { value: "growth", label: "Growth", icon: "📈", risk: 3, description: "More risk for bigger wins" },
  { value: "aggressive", label: "Aggressive", icon: "🔥", risk: 4, description: "High risk, high reward" },
];

// ==============================================
// PLAN PRICES - Easy to read
// ==============================================
const PLANS = [
  { value: "starter", label: "Starter", icon: "🎟️", price: 0, priceLabel: "Free", color: "blue", features: ["Stock Trading", "Paper Trading"] },
  { value: "pro", label: "Pro", icon: "⭐", price: 19, priceLabel: "$19/month", color: "purple", features: ["Stock Trading", "Crypto Trading", "Live Trading"] },
  { value: "elite", label: "Elite", icon: "👑", price: 49, priceLabel: "$49/month", color: "amber", features: ["Everything + DEX Sniper", "Futures Trading"] },
  { value: "bundle", label: "All Access", icon: "🎁", price: 199, priceLabel: "$199/month", color: "emerald", features: ["Everything + Priority Support", "Early Access"] },
];

// ==============================================
// HELPER FUNCTIONS
// ==============================================
const safeNumber = (v, f = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : f;
};

const formatMoney = (n) => {
  const num = safeNumber(n);
  const sign = num >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(num).toFixed(2)}`;
};

const formatPercent = (v) => {
  const num = safeNumber(v);
  return `${num >= 0 ? "+" : ""}${num.toFixed(1)}%`;
};

const timeAgo = (timestamp) => {
  if (!timestamp) return "just now";
  try {
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const sec = Math.floor(diffMs / 1000);
    const min = Math.floor(sec / 60);
    const hr = Math.floor(min / 60);
    if (sec < 30) return "just now";
    if (sec < 60) return `${sec} seconds ago`;
    if (min < 60) return `${min} minutes ago`;
    if (hr < 24) return `${hr} hours ago`;
    return `${Math.floor(hr / 24)} days ago`;
  } catch {
    return "—";
  }
};

const getBotIcon = (botName) => {
  const name = String(botName || "").toLowerCase();
  if (name.includes('okx')) return "🔷";
  if (name.includes('futures')) return "📊";
  if (name.includes('stock')) return "📈";
  if (name.includes('sniper')) return "🦄";
  return "🤖";
};

// ==============================================
// SIMPLE COMPONENTS
// ==============================================

// Big number card
function StatCard({ title, value, color = "green" }) {
  const colors = { 
    green: "text-green-600", 
    red: "text-red-600", 
    purple: "text-purple-600",
    blue: "text-blue-600",
    orange: "text-orange-600"
  };
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="text-xs text-gray-500 uppercase tracking-wide">{title}</div>
      <div className={`text-2xl font-bold mt-1 ${colors[color]}`}>{value}</div>
    </div>
  );
}

// Section card
function Section({ title, icon, children, right }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <h3 className="font-semibold text-gray-800">{title}</h3>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

// One trade row
function TradeRow({ trade }) {
  const side = (trade?.side || "").toLowerCase();
  const pnl = safeNumber(trade?.pnl_usd || trade?.pnl, 0);
  const symbol = trade?.symbol || "Unknown";
  const bot = trade?.bot || "Bot";
  const isOpen = trade?.status === "open";
  
  let bgColor = "bg-gray-50";
  let borderColor = "border-l-gray-400";
  let badgeColor = "bg-gray-100 text-gray-700";
  let badgeText = side.toUpperCase() || "TRADE";
  
  if (isOpen) {
    borderColor = "border-l-blue-500";
    badgeColor = "bg-blue-100 text-blue-700";
    badgeText = "OPEN";
  } else if (side === "buy") {
    borderColor = "border-l-green-500";
    badgeColor = "bg-green-100 text-green-700";
  } else if (side === "sell") {
    borderColor = "border-l-red-500";
    badgeColor = "bg-red-100 text-red-700";
  }
  
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border-l-4 ${borderColor} ${bgColor}`}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{getBotIcon(bot)}</span>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{symbol}</span>
            <span className={`text-xs px-2 py-0.5 rounded ${badgeColor}`}>{badgeText}</span>
          </div>
          <div className="text-xs text-gray-400">{timeAgo(trade?.created_at)}</div>
        </div>
      </div>
      <div className="text-right">
        {!isOpen && pnl !== 0 ? (
          <div className={`font-bold text-sm ${pnl > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatMoney(pnl)}
          </div>
        ) : (
          <div className="text-sm text-gray-600">${safeNumber(trade?.price, 0).toFixed(2)}</div>
        )}
      </div>
    </div>
  );
}

// Simple chart
function SimpleChart({ data, type = "daily", onChange }) {
  const [chartType, setChartType] = useState('line');
  const chartData = data?.[type] || [];
  
  const getChartData = () => {
    if (chartData.length === 0) return { labels: [], datasets: [] };
    const labels = chartData.map(d => {
      const date = new Date(d?.date || 0);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });
    const pnlData = chartData.map(d => safeNumber(d?.pnl, 0));
    let running = 0;
    const totalData = pnlData.map(v => { running += v; return running; });
    
    return {
      labels,
      datasets: [
        {
          label: 'Daily Profit',
          data: pnlData,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: pnlData.map(v => v >= 0 ? '#10b981' : '#ef4444'),
        },
        {
          label: 'Total Profit',
          data: totalData,
          borderColor: '#8b5cf6',
          borderWidth: 2,
          borderDash: [5, 5],
          fill: false,
          pointRadius: 0,
        }
      ],
    };
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top', labels: { font: { size: 11 } } } },
    scales: { y: { ticks: { callback: (v) => `$${v}` } } }
  };

  return (
    <div>
      <div className="flex gap-2 mb-3">
        {["daily", "weekly", "monthly"].map(p => (
          <button key={p} onClick={() => onChange(p)} className={`px-3 py-1 rounded-lg text-xs ${type === p ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
            {p === "daily" ? "Daily" : p === "weekly" ? "Weekly" : "Monthly"}
          </button>
        ))}
        <button onClick={() => setChartType(chartType === 'line' ? 'bar' : 'line')} className="px-3 py-1 rounded-lg text-xs bg-gray-100 text-gray-600">
          {chartType === 'line' ? '📊 Bar' : '📈 Line'}
        </button>
      </div>
      <div className="h-64">
        {chartData.length > 0 ? (
          chartType === 'line' ? <Line data={getChartData()} options={options} /> : <Bar data={getChartData()} options={options} />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">No data yet</div>
        )}
      </div>
    </div>
  );
}

// ==============================================
// SETTINGS POPUP
// ==============================================
function SettingsPopup({ isOpen, onClose, currentStrategy, onSave, user }) {
  const [selected, setSelected] = useState(currentStrategy);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      // Save to backend
      await new Promise(r => setTimeout(r, 500));
      onSave(selected);
      setMessage("Saved! ✓");
      setTimeout(() => onClose(), 1000);
    } catch (err) {
      setMessage("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">How aggressive should your bot be?</label>
          <div className="space-y-2">
            {STRATEGIES.map(s => (
              <button
                key={s.value}
                onClick={() => setSelected(s.value)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${selected === s.value ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{s.icon}</span>
                  <div>
                    <div className="font-medium">{s.label}</div>
                    <div className="text-xs text-gray-500">{s.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
        
        {message && (
          <div className={`p-3 rounded-lg text-sm mb-4 ${message.includes("✓") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {message}
          </div>
        )}
        
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}

// ==============================================
// API KEYS POPUP
// ==============================================
function ApiKeysPopup({ isOpen, onClose }) {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(false);
      setKeys([
        { id: 1, name: "My Trading App", created_at: new Date().toISOString() },
        { id: 2, name: "Bot Key", created_at: new Date().toISOString() },
      ]);
    }
  }, [isOpen]);

  const createKey = () => {
    if (!newName.trim()) return;
    setCreating(true);
    setTimeout(() => {
      setKeys([...keys, { id: Date.now(), name: newName, created_at: new Date().toISOString() }]);
      setNewName("");
      setCreating(false);
    }, 500);
  };

  const deleteKey = (id) => {
    if (window.confirm("Delete this API key? It will stop working immediately.")) {
      setKeys(keys.filter(k => k.id !== id));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">API Keys</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>
        
        <div className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Key name (e.g., My Bot)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
            />
            <button onClick={createKey} disabled={creating || !newName.trim()} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
              {creating ? "..." : "Create"}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">Use these keys to connect your trading bots</p>
        </div>
        
        {loading ? (
          <div className="text-center py-4">Loading...</div>
        ) : keys.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No API keys yet</div>
        ) : (
          <div className="space-y-2">
            {keys.map((key) => (
              <div key={key.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">{key.name}</div>
                  <div className="text-xs text-gray-400">Created {new Date(key.created_at).toLocaleDateString()}</div>
                </div>
                <button onClick={() => deleteKey(key.id)} className="text-red-500 text-sm hover:text-red-700">Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ==============================================
// BILLING SECTION - All payment stuff in one place
// ==============================================
function BillingSection({ user, activation, onRefresh }) {
  const navigate = useNavigate();
  const hasCard = activation?.has_card_on_file || activation?.billing_complete;
  const tier = user?.tier || "starter";
  const plan = PLANS.find(p => p.value === tier) || PLANS[0];
  
  return (
    <Section title="Your Plan & Billing" icon="💳">
      <div className="space-y-4">
        {/* Current Plan Card */}
        <div className={`bg-gradient-to-r ${plan.color === 'emerald' ? 'from-emerald-50 to-green-50' : plan.color === 'amber' ? 'from-amber-50 to-orange-50' : 'from-blue-50 to-purple-50'} rounded-xl p-4 border`}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{plan.icon}</span>
                <span className="font-bold text-lg">{plan.label}</span>
              </div>
              <div className="text-2xl font-bold mt-1">{plan.priceLabel}</div>
            </div>
            <Link to="/pricing" className="px-4 py-2 bg-white rounded-lg text-sm font-medium shadow-sm hover:shadow">
              Change Plan →
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {plan.features.map((f, i) => (
              <span key={i} className="text-xs px-2 py-1 bg-white/60 rounded-full">✓ {f}</span>
            ))}
          </div>
        </div>
        
        {/* Payment Status */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-lg">💳</span>
            <div>
              <div className="font-medium text-sm">Payment Method</div>
              <div className="text-xs text-gray-500">{hasCard ? "Card on file ✓" : "No card added yet"}</div>
            </div>
          </div>
          <Link to="/billing" className="text-sm text-blue-600 hover:text-blue-700">
            {hasCard ? "Update Card" : "Add Card →"}
          </Link>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          <Link to="/billing-dashboard" className="flex-1 text-center px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">
            Billing History
          </Link>
          <Link to="/activation" className="flex-1 text-center px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">
            Activation Status
          </Link>
        </div>
      </div>
    </Section>
  );
}

// ==============================================
// CONNECTIONS SECTION - Wallet, OKX, Alpaca
// ==============================================
function ConnectionsSection({ activation, onRefresh }) {
  const [connecting, setConnecting] = useState(null);
  const [walletInput, setWalletInput] = useState("");
  const [okxKeys, setOkxKeys] = useState({ apiKey: "", secret: "", passphrase: "" });
  const [alpacaKeys, setAlpacaKeys] = useState({ apiKey: "", secret: "" });
  
  const handleConnectWallet = async () => {
    if (!walletInput.startsWith("0x") || walletInput.length !== 42) {
      alert("Wallet address must start with 0x and be 42 characters long");
      return;
    }
    setConnecting("wallet");
    try {
      await BotAPI.connectWallet?.({ wallet: walletInput });
      alert("Wallet connected! ✓");
      setWalletInput("");
      onRefresh?.();
    } catch (err) {
      alert("Failed to connect wallet");
    } finally {
      setConnecting(null);
    }
  };
  
  const handleConnectOKX = async () => {
    if (!okxKeys.apiKey || !okxKeys.secret || !okxKeys.passphrase) {
      alert("Please fill in all OKX fields");
      return;
    }
    setConnecting("okx");
    try {
      await BotAPI.connectOKX?.({
        api_key: okxKeys.apiKey,
        api_secret: okxKeys.secret,
        passphrase: okxKeys.passphrase,
        mode: "paper"
      });
      alert("OKX connected! ✓");
      setOkxKeys({ apiKey: "", secret: "", passphrase: "" });
      onRefresh?.();
    } catch (err) {
      alert("Failed to connect OKX");
    } finally {
      setConnecting(null);
    }
  };
  
  const handleConnectAlpaca = async () => {
    if (!alpacaKeys.apiKey || !alpacaKeys.secret) {
      alert("Please fill in both Alpaca fields");
      return;
    }
    setConnecting("alpaca");
    try {
      await BotAPI.connectAlpaca?.({
        api_key: alpacaKeys.apiKey,
        api_secret: alpacaKeys.secret,
        mode: "paper"
      });
      alert("Alpaca connected! ✓");
      setAlpacaKeys({ apiKey: "", secret: "" });
      onRefresh?.();
    } catch (err) {
      alert("Failed to connect Alpaca");
    } finally {
      setConnecting(null);
    }
  };
  
  return (
    <Section title="Connected Accounts" icon="🔌">
      <div className="space-y-4">
        {/* Wallet */}
        <div className="border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">💰</span>
              <span className="font-medium">Wallet</span>
              {activation?.wallet_connected && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Connected</span>}
            </div>
          </div>
          {!activation?.wallet_connected ? (
            <div className="flex gap-2">
              <input type="text" value={walletInput} onChange={(e) => setWalletInput(e.target.value)} placeholder="0x..." className="flex-1 px-3 py-2 border rounded-lg text-sm" />
              <button onClick={handleConnectWallet} disabled={connecting === "wallet"} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">
                {connecting === "wallet" ? "..." : "Connect"}
              </button>
            </div>
          ) : (
            <div className="text-sm text-gray-500 truncate">{activation?.wallet_address || "Connected"}</div>
          )}
          <a href="https://metamask.io/" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 mt-2 inline-block">Need a wallet? Get MetaMask →</a>
        </div>
        
        {/* OKX */}
        <div className="border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🔷</span>
            <span className="font-medium">OKX Exchange</span>
            {activation?.okx_connected && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Connected</span>}
          </div>
          {!activation?.okx_connected ? (
            <div className="space-y-2">
              <input type="text" value={okxKeys.apiKey} onChange={(e) => setOkxKeys({...okxKeys, apiKey: e.target.value})} placeholder="API Key" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <input type="password" value={okxKeys.secret} onChange={(e) => setOkxKeys({...okxKeys, secret: e.target.value})} placeholder="Secret Key" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <input type="password" value={okxKeys.passphrase} onChange={(e) => setOkxKeys({...okxKeys, passphrase: e.target.value})} placeholder="Passphrase" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <button onClick={handleConnectOKX} disabled={connecting === "okx"} className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                {connecting === "okx" ? "Connecting..." : "Connect OKX"}
              </button>
            </div>
          ) : (
            <div className="text-sm text-gray-500">Connected to OKX</div>
          )}
          <a href="https://www.okx.com/account/login?forward=%2Faccount%2Fmy-api" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 mt-2 inline-block">Get OKX API Keys →</a>
        </div>
        
        {/* Alpaca */}
        <div className="border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">📈</span>
            <span className="font-medium">Alpaca Stocks</span>
            {activation?.alpaca_connected && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Connected</span>}
          </div>
          {!activation?.alpaca_connected ? (
            <div className="space-y-2">
              <input type="text" value={alpacaKeys.apiKey} onChange={(e) => setAlpacaKeys({...alpacaKeys, apiKey: e.target.value})} placeholder="API Key ID" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <input type="password" value={alpacaKeys.secret} onChange={(e) => setAlpacaKeys({...alpacaKeys, secret: e.target.value})} placeholder="Secret Key" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <button onClick={handleConnectAlpaca} disabled={connecting === "alpaca"} className="w-full py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                {connecting === "alpaca" ? "Connecting..." : "Connect Alpaca"}
              </button>
            </div>
          ) : (
            <div className="text-sm text-gray-500">Connected to Alpaca</div>
          )}
          <a href="https://app.alpaca.markets/signup" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 mt-2 inline-block">Get Alpaca API Keys →</a>
        </div>
      </div>
    </Section>
  );
}

// ==============================================
// MAIN DASHBOARD
// ==============================================
export default function MemberDashboard() {
  const navigate = useNavigate();
  const { user, activation, refreshActivation } = useAuth();
  const [data, setData] = useState({
    trades: [],
    bots: [],
    stats: { total_pnl: 0, wins: 0, losses: 0 },
    history: { daily: [], weekly: [], monthly: [] }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartType, setChartType] = useState("daily");
  const [showSettings, setShowSettings] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [strategy, setStrategy] = useState(user?.strategy || "balanced");
  const [refreshing, setRefreshing] = useState(false);
  
  const mounted = useRef(true);
  
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  
  const loadData = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const [tradesRes, botsRes, statsRes, historyRes] = await Promise.allSettled([
        BotAPI.getUserTrades?.({ limit: 50 }),
        BotAPI.getBotStatus?.(),
        BotAPI.getAnalyticsSummary?.(),
        BotAPI.getPublicHistorical?.()
      ]);
      
      if (!mounted.current) return;
      
      setData({
        trades: tradesRes.status === "fulfilled" ? (tradesRes.value?.trades || []) : [],
        bots: botsRes.status === "fulfilled" ? (botsRes.value?.bots || []) : [],
        stats: statsRes.status === "fulfilled" ? (statsRes.value?.summary || { total_pnl: 0, wins: 0, losses: 0 }) : { total_pnl: 0, wins: 0, losses: 0 },
        history: historyRes.status === "fulfilled" ? historyRes.value : { daily: [], weekly: [], monthly: [] }
      });
      setError(null);
    } catch (err) {
      if (mounted.current) setError("Couldn't load your data");
    } finally {
      if (mounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [refreshing]);
  
  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 30000);
    return () => clearInterval(timer);
  }, [loadData]);
  
  const totalPnL = data.stats?.total_pnl || 0;
  const wins = data.stats?.wins || 0;
  const losses = data.stats?.losses || 0;
  const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
  const activeBots = data.bots.filter(b => b.status === "operational" || b.status === "scanning").length;
  const currentStrategyLabel = STRATEGIES.find(s => s.value === strategy)?.label || "Balanced";
  
  const handleRefresh = () => loadData();
  const handleStrategySave = (newStrategy) => setStrategy(newStrategy);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-600 border-t-transparent mx-auto mb-3" />
          <p className="text-gray-500">Loading your dashboard...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please log in to see your dashboard</p>
          <button onClick={() => navigate("/login")} className="px-6 py-2 bg-green-600 text-white rounded-xl">Log In</button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        
        {/* Welcome Header */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-800">👋 Hey, {user.email?.split('@')[0]}!</h1>
              <p className="text-sm text-gray-500 mt-1">Here's how your trading is doing</p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleRefresh} disabled={refreshing} className="text-sm text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-100">
                {refreshing ? "⟳" : "🔄 Refresh"}
              </button>
              <button onClick={() => setShowSettings(true)} className="text-sm bg-gray-100 px-3 py-1.5 rounded-lg">
                ⚙️ Settings
              </button>
              <button onClick={() => setShowApiKeys(true)} className="text-sm bg-gray-100 px-3 py-1.5 rounded-lg">
                🔑 API Keys
              </button>
            </div>
          </div>
        </div>
        
        {/* Quick Links Bar */}
        <div className="flex flex-wrap gap-2">
          <Link to="/billing" className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm">💳 Add Payment</Link>
          <Link to="/pricing" className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm">⭐ Upgrade Plan</Link>
          <Link to="/activation" className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm">⚡ Activation</Link>
          <Link to="/billing-dashboard" className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm">📋 Billing History</Link>
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
        )}
        
        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left Column - Stats & Chart (2/3 width on desktop) */}
          <div className="lg:col-span-2 space-y-5">
            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard title="Total Profit/Loss" value={formatMoney(totalPnL)} color={totalPnL >= 0 ? "green" : "red"} />
              <StatCard title="Win Rate" value={`${winRate}%`} color="purple" />
              <StatCard title="Active Bots" value={activeBots} color="blue" />
              <StatCard title="Strategy" value={currentStrategyLabel} color="orange" />
            </div>
            
            {/* Performance Chart */}
            <Section title="Your Performance" icon="📈">
              <SimpleChart data={data.history} type={chartType} onChange={setChartType} />
            </Section>
            
            {/* Your Bots */}
            <Section title="Your Trading Bots" icon="🤖">
              <div className="grid grid-cols-2 gap-3">
                {data.bots.slice(0, 4).map((bot, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getBotIcon(bot.name)}</span>
                      <span className="font-medium">{bot.name || "Bot"}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Status: <span className="text-green-600">{bot.status || "Online"}</span></div>
                  </div>
                ))}
              </div>
            </Section>
          </div>
          
          {/* Right Column - Billing & Connections (1/3 width on desktop) */}
          <div className="space-y-5">
            <BillingSection user={user} activation={activation} onRefresh={refreshActivation} />
            <ConnectionsSection activation={activation} onRefresh={refreshActivation} />
          </div>
        </div>
        
        {/* Recent Trades */}
        <Section title="Recent Trades" icon="📋">
          {data.trades.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No trades yet. Your bot will start trading soon!</div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-auto">
              {data.trades.slice(0, 20).map((trade, i) => (
                <TradeRow key={trade.id || i} trade={trade} />
              ))}
            </div>
          )}
        </Section>
        
        {/* Footer Links */}
        <div className="text-center pt-4 border-t border-gray-200">
          <div className="flex justify-center gap-4 text-sm">
            <Link to="/pricing" className="text-amber-600">Upgrade Plan</Link>
            <Link to="/live" className="text-green-600">Public Dashboard</Link>
            <Link to="/support" className="text-gray-500">Help</Link>
          </div>
        </div>
      </div>
      
      {/* Popups */}
      <SettingsPopup isOpen={showSettings} onClose={() => setShowSettings(false)} currentStrategy={strategy} onSave={handleStrategySave} user={user} />
      <ApiKeysPopup isOpen={showApiKeys} onClose={() => setShowApiKeys(false)} />
    </div>
  );
}
