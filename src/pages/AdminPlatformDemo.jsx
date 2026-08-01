// src/pages/AdminPlatformDemo.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import CountUp from "react-countup";
import toast, { Toaster } from "react-hot-toast";
import { 
  FaUsers, FaChartLine, FaCubes, FaBuilding, FaCreditCard, 
  FaGift, FaEnvelope, FaNewspaper, FaShareAlt, FaShieldAlt, 
  FaServer, FaRobot, FaArrowRight, FaCheck, FaStar,
  FaBell, FaUserCircle, FaSearch, FaTh, FaList, FaCog,
  FaWallet, FaTrophy, FaClock, FaCalendarAlt, FaDownload,
  FaEye, FaEdit, FaTrash, FaPlus, FaFilter, FaSort,
  FaDollarSign, FaChartPie, FaDatabase, FaTerminal,
  FaSpinner, FaTimes, FaChevronDown, FaChevronUp,
  FaExclamationTriangle, FaInfoCircle, FaSync, FaCheckCircle,
  FaTimesCircle, FaUserPlus, FaKey, FaLock, FaUnlock,
  FaSlidersH, FaFileExport, FaFileImport, FaPrint,
  FaBrain, FaFire, FaBolt, FaWaveSquare
} from "react-icons/fa";
import BotAPI from "../utils/BotAPI";
import CandlestickChart from "../components/charts/CandlestickChart";
import * as candleGenerator from "../utils/demoCandleGenerator";

// Glass Card Component
const GlassCard = ({ children, className = "", gradient = "from-white/5 to-white/5" }) => (
  <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${gradient} backdrop-blur-xl shadow-xl ${className}`}>
    <div className="absolute inset-0 bg-white/5" />
    <div className="relative z-10">{children}</div>
  </div>
);

// Live Ticker
const LiveTicker = ({ activities }) => {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  const messages = activities.length > 0 
    ? activities.map(a => `${a.symbol} ${a.action} • ${a.confidence}% confidence`)
    : ["System ready • Monitoring 24/7"];

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % messages.length);
        setVisible(true);
      }, 300);
    }, 3000);
    return () => clearInterval(id);
  }, [messages.length]);

  if (!messages.length) return null;

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-400 backdrop-blur-sm">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
      <span className={`transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}>
        {messages[index]}
      </span>
    </div>
  );
};

// AI Insights Panel
const AIInsightsPanel = ({ data }) => {
  const [insights, setInsights] = useState({
    summary: "Analyzing platform activity...",
    recommendations: [],
    confidence: 87,
    scanning: 48,
    risk: "Low",
    topSignal: "BTC"
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const signals = [
        { symbol: "BTC", confidence: 92, action: "BUY" },
        { symbol: "ETH", confidence: 78, action: "HOLD" },
        { symbol: "SOL", confidence: 85, action: "BUY" },
        { symbol: "AVAX", confidence: 63, action: "SELL" },
      ];
      const random = signals[Math.floor(Math.random() * signals.length)];
      
      const summaries = [
        `${data?.newSignups || 0} new signups today • ${data?.newSubscriptions || 0} upgrades`,
        `Highest converting page: Demo → Pro (${data?.conversionRate || 12}%)`,
        `${data?.activeBots || 0} bots active • ${data?.totalTrades || 0} trades executed`,
        `${data?.apiConnections || 0} API connections • ${data?.activeUsers || 0} active users`
      ];
      
      setInsights({
        summary: summaries[Math.floor(Math.random() * summaries.length)],
        recommendations: [
          `${Math.floor(Math.random() * 5) + 1} demo users haven't traded in 3 days`,
          `${Math.floor(Math.random() * 3) + 1} Pro users near upgrade threshold`,
          "AI detected increased volatility in BTC"
        ].slice(0, 2),
        confidence: Math.floor(Math.random() * 30) + 60,
        scanning: Math.floor(Math.random() * 30) + 35,
        risk: ["Low", "Medium", "Low", "Low"][Math.floor(Math.random() * 4)],
        topSignal: random.symbol,
        topAction: random.action
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [data]);

  return (
    <GlassCard className="p-6 border-purple-500/20" gradient="from-purple-500/10 to-blue-500/10">
      <div className="flex items-center gap-3 mb-4">
        <FaBrain className="text-purple-400 text-xl" />
        <h3 className="text-lg font-bold text-white">AI Insights</h3>
        <span className="ml-auto text-xs text-emerald-400 animate-pulse">● LIVE</span>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/5 rounded-xl p-3">
          <p className="text-xs text-white/40">Market Signal</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-lg font-bold text-white">{insights.topSignal}</span>
            <span className={`text-sm font-bold ${insights.topAction === 'BUY' ? 'text-emerald-400' : insights.topAction === 'SELL' ? 'text-red-400' : 'text-yellow-400'}`}>
              {insights.topAction}
            </span>
          </div>
        </div>
        <div className="bg-white/5 rounded-xl p-3">
          <p className="text-xs text-white/40">Confidence</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xl font-bold text-white">{insights.confidence}%</span>
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-400 to-emerald-400 rounded-full" style={{ width: `${insights.confidence}%` }} />
            </div>
          </div>
        </div>
        <div className="bg-white/5 rounded-xl p-3">
          <p className="text-xs text-white/40">Scanning</p>
          <p className="text-lg font-bold text-white">{insights.scanning} markets</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3">
          <p className="text-xs text-white/40">Risk</p>
          <p className={`text-lg font-bold ${insights.risk === 'Low' ? 'text-emerald-400' : insights.risk === 'Medium' ? 'text-yellow-400' : 'text-red-400'}`}>
            {insights.risk}
          </p>
        </div>
      </div>
      
      <div className="mt-3 p-3 bg-white/5 rounded-xl">
        <p className="text-sm text-white/80">{insights.summary}</p>
      </div>
      
      <div className="mt-2 space-y-1">
        {insights.recommendations.map((rec, idx) => (
          <div key={idx} className="flex items-start gap-2 text-xs text-white/60">
            <FaCheckCircle className="text-emerald-400 text-[10px] mt-0.5 flex-shrink-0" />
            <span>{rec}</span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
};

// Subscription Metrics
const SubscriptionMetrics = ({ data }) => {
  const metrics = [
    { label: "Starter", value: data?.starterUsers || 132, color: "text-cyan-400" },
    { label: "Demo", value: data?.demoUsers || 48, color: "text-emerald-400" },
    { label: "Pro", value: data?.proUsers || 21, color: "text-blue-400" },
    { label: "Elite", value: data?.eliteUsers || 9, color: "text-purple-400" },
  ];

  return (
    <GlassCard className="p-6" gradient="from-white/5 to-white/5">
      <h3 className="text-sm font-semibold text-white mb-4">Subscription Distribution</h3>
      <div className="space-y-3">
        {metrics.map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <span className="text-sm text-white/60">{item.label}</span>
            <div className="flex items-center gap-3 flex-1 mx-4">
              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full bg-gradient-to-r ${item.color.replace('text-', 'from-')} to-${item.color.replace('text-', 'to-')}`} 
                     style={{ width: `${(item.value / Math.max(...metrics.map(m => m.value))) * 100}%` }} />
              </div>
            </div>
            <span className={`font-bold ${item.color}`}>{item.value}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-white/10 flex justify-between">
        <div>
          <p className="text-xs text-white/40">MRR</p>
          <p className="text-lg font-bold text-white">${data?.mrr || 2540}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-white/40">ARR</p>
          <p className="text-lg font-bold text-emerald-400">${data?.arr || 30480}</p>
        </div>
      </div>
    </GlassCard>
  );
};

// Conversion Funnel
const ConversionFunnel = ({ data }) => {
  const steps = [
    { label: "Visitors", value: data?.visitors || 1247, color: "bg-slate-600" },
    { label: "Email Captured", value: data?.emailCaptured || 423, color: "bg-blue-500" },
    { label: "Demo Started", value: data?.demoStarted || 287, color: "bg-cyan-500" },
    { label: "Signup", value: data?.signups || 156, color: "bg-emerald-500" },
    { label: "Billing Added", value: data?.billingAdded || 48, color: "bg-purple-500" },
    { label: "Pro", value: data?.proUsers || 21, color: "bg-amber-500" },
    { label: "Elite", value: data?.eliteUsers || 9, color: "bg-red-500" },
  ];

  const maxValue = Math.max(...steps.map(s => s.value));

  return (
    <GlassCard className="p-6" gradient="from-white/5 to-white/5">
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <FaChartLine className="text-emerald-400" />
        Conversion Funnel
      </h3>
      <div className="space-y-2">
        {steps.map((step, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <span className="text-xs text-white/40 w-24 text-right">{step.label}</span>
            <div className="flex-1 h-6 bg-white/5 rounded-lg overflow-hidden relative">
              <div className={`h-full ${step.color} transition-all duration-1000`} 
                   style={{ width: `${(step.value / maxValue) * 100}%` }} />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-white">
                {step.value}
              </span>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
};

// Recent Signups Ticker
const RecentSignups = ({ signups }) => {
  if (!signups || signups.length === 0) {
    return (
      <GlassCard className="p-6" gradient="from-white/5 to-white/5">
        <h3 className="text-sm font-semibold text-white mb-4">Recent Activity</h3>
        <p className="text-sm text-white/40">No recent activity</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6" gradient="from-white/5 to-white/5">
      <h3 className="text-sm font-semibold text-white mb-4">Recent Activity</h3>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {signups.slice(0, 10).map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="flex items-center gap-3 p-2 bg-white/5 rounded-lg"
          >
            <span className="text-xs text-white/40">{item.time}</span>
            <span className="text-xs font-medium text-white">{item.user}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              item.type === 'signup' ? 'bg-emerald-500/10 text-emerald-400' :
              item.type === 'upgrade' ? 'bg-purple-500/10 text-purple-400' :
              item.type === 'subscription' ? 'bg-blue-500/10 text-blue-400' :
              'bg-amber-500/10 text-amber-400'
            }`}>
              {item.type}
            </span>
          </motion.div>
        ))}
      </div>
    </GlassCard>
  );
};

const AdminPlatformDemo = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notification, setNotification] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    users: true,
    trades: true,
    activity: true
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Real data states
  const [dashboardData, setDashboardData] = useState({
    totalUsers: 0,
    totalTrades: 0,
    totalRevenue: 0,
    organizations: 0,
    starterUsers: 0,
    demoUsers: 0,
    proUsers: 0,
    eliteUsers: 0,
    mrr: 0,
    arr: 0,
    activeBots: 0,
    apiConnections: 0,
    activeUsers: 0,
    newSignups: 0,
    newSubscriptions: 0,
    conversionRate: 0,
    visitors: 1247,
    emailCaptured: 423,
    demoStarted: 287,
    signups: 156,
    billingAdded: 48
  });

  const [users, setUsers] = useState([]);
  const [trades, setTrades] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [recentSignups, setRecentSignups] = useState([]);
  const [liveActivities, setLiveActivities] = useState([]);
  const [botStatus, setBotStatus] = useState([]);

  // Candlestick data
  const [candles] = useState(() => 
    candleGenerator.createInitialCandles({ count: 60, startPrice: 67420, intervalSeconds: 60 })
  );
  const [liveCandle, setLiveCandle] = useState(() => candles[candles.length - 1]);
  const tickRef = useRef(0);

  // Load real data
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [
        meRes,
        botStatusRes,
        statsRes,
        tradesRes,
        usersRes,
        activityRes
      ] = await Promise.allSettled([
        BotAPI.getMe?.(true),
        BotAPI.getTradingBotStatus?.(true),
        BotAPI.getLiveTradingStats?.('okx', true),
        BotAPI.getLiveTradeHistory?.(50, 'okx', true),
        BotAPI.getOrganizationUsers?.(true),
        BotAPI.getAuditLogs?.({ limit: 50 })
      ]);

      // Process user data
      const userData = usersRes.status === 'fulfilled' ? usersRes.value : null;
      if (userData?.users) {
        setUsers(userData.users.map(u => ({
          id: u.id,
          name: u.email?.split('@')[0] || 'User',
          email: u.email || '',
          tier: u.tier || 'Starter',
          status: u.trading_enabled ? 'Active' : 'Inactive',
          trades: u.total_trades || 0,
          pnl: u.total_pnl || 0,
          joined: u.created_at ? new Date(u.created_at).toISOString().split('T')[0] : 'N/A'
        })));
        
        // Update dashboard stats
        const allUsers = userData.users || [];
        const activeUsers = allUsers.filter(u => u.trading_enabled);
        
        setDashboardData(prev => ({
          ...prev,
          totalUsers: allUsers.length,
          activeUsers: activeUsers.length,
          starterUsers: allUsers.filter(u => u.tier === 'starter').length,
          proUsers: allUsers.filter(u => u.tier === 'pro').length,
          eliteUsers: allUsers.filter(u => u.tier === 'elite').length
        }));
      }

      // Process trades
      if (tradesRes.status === 'fulfilled' && tradesRes.value?.trades) {
        const allTrades = tradesRes.value.trades || [];
        setTrades(allTrades.map(t => ({
          id: t.id,
          symbol: t.symbol || 'Unknown',
          type: t.side === 'buy' ? 'Buy' : 'Sell',
          amount: t.qty || 0,
          price: `$${t.price || 0}`,
          pnl: t.pnl_usd ? (t.pnl_usd > 0 ? `+$${t.pnl_usd}` : `-$${Math.abs(t.pnl_usd)}`) : '$0',
          status: t.status === 'closed' ? 'Closed' : 'Open',
          time: t.created_at ? new Date(t.created_at).toLocaleString() : 'N/A'
        })));
        
        // Calculate total trades and revenue
        const total = allTrades.length;
        const revenue = allTrades.reduce((sum, t) => sum + (t.pnl_usd || 0), 0);
        
        setDashboardData(prev => ({
          ...prev,
          totalTrades: total,
          totalRevenue: revenue
        }));
      }

      // Process bot status
      if (botStatusRes.status === 'fulfilled' && botStatusRes.value?.bots) {
        const bots = botStatusRes.value.bots || [];
        const activeBots = bots.filter(b => b.isRunning);
        setBotStatus(activeBots);
        
        // Generate live activities from bot status
        const activities = activeBots.map(b => ({
          symbol: b.exchange?.toUpperCase() || 'BTC',
          action: b.isRunning ? 'ACTIVE' : 'IDLE',
          confidence: Math.floor(Math.random() * 30) + 65
        }));
        setLiveActivities(activities);
        
        setDashboardData(prev => ({
          ...prev,
          activeBots: activeBots.length
        }));
      }

      // Process activity logs
      if (activityRes.status === 'fulfilled' && activityRes.value?.logs) {
        const logs = activityRes.value.logs || [];
        const formatted = logs.map(log => ({
          action: log.action || 'UNKNOWN',
          user: log.user_email || 'system',
          time: log.created_at || new Date().toISOString(),
          type: log.action?.toLowerCase().includes('signup') ? 'signup' :
                log.action?.toLowerCase().includes('login') ? 'login' :
                log.action?.toLowerCase().includes('trade') ? 'trade' : 'admin'
        }));
        setRecentActivity(formatted);
        
        // Extract recent signups
        const signups = logs
          .filter(log => log.action?.toLowerCase().includes('signup'))
          .slice(0, 20)
          .map(log => ({
            user: log.user_email || 'Anonymous',
            time: log.created_at ? new Date(log.created_at).toLocaleTimeString() : 'Just now',
            type: 'signup'
          }));
        setRecentSignups(signups);
        
        // Count new signups
        const today = new Date();
        const todaySignups = logs.filter(log => {
          if (!log.created_at) return false;
          const date = new Date(log.created_at);
          return log.action?.toLowerCase().includes('signup') &&
                 date.getDate() === today.getDate() &&
                 date.getMonth() === today.getMonth() &&
                 date.getFullYear() === today.getFullYear();
        });
        
        setDashboardData(prev => ({
          ...prev,
          newSignups: todaySignups.length
        }));
      }

      // Calculate subscription metrics
      if (userData?.users) {
        const allUsers = userData.users || [];
        const proUsers = allUsers.filter(u => u.tier === 'pro').length;
        const eliteUsers = allUsers.filter(u => u.tier === 'elite').length;
        const mrr = (proUsers * 19) + (eliteUsers * 49);
        
        setDashboardData(prev => ({
          ...prev,
          proUsers,
          eliteUsers,
          mrr,
          arr: mrr * 12
        }));
      }

      // Get conversion funnel data from analytics
      try {
        const analyticsRes = await BotAPI.getAnalytics?.({ type: 'conversion' });
        if (analyticsRes?.data) {
          setDashboardData(prev => ({
            ...prev,
            visitors: analyticsRes.data.visitors || 1247,
            emailCaptured: analyticsRes.data.emailCaptured || 423,
            demoStarted: analyticsRes.data.demoStarted || 287,
            signups: analyticsRes.data.signups || 156,
            billingAdded: analyticsRes.data.billingAdded || 48,
            conversionRate: analyticsRes.data.conversionRate || 12
          }));
        }
      } catch (e) {
        // Use defaults
      }

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Candlestick animation
  useEffect(() => {
    const interval = setInterval(() => {
      tickRef.current += 1;
      setLiveCandle(current => {
        if (!current) return current;
        if (tickRef.current % 6 === 0) {
          return candleGenerator.createNextCandle(current, 60);
        }
        return candleGenerator.updateLiveCandle(current, { volatility: 0.0008 });
      });
    }, 400);
    return () => clearInterval(interval);
  }, []);

  // Initial load
  useEffect(() => {
    loadDashboardData();
    
    // Refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      loadDashboardData();
    }, 30000);
    
    return () => clearInterval(refreshInterval);
  }, [loadDashboardData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDashboardData();
    setIsRefreshing(false);
    toast.success('Dashboard refreshed');
  };

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleUserAction = (action, user) => {
    setSelectedUser(user);
    if (action === "edit") {
      showNotification(`Editing user: ${user.email}`, "info");
    } else if (action === "delete") {
      if (window.confirm(`Delete user ${user.email}?`)) {
        setUsers(users.filter(u => u.id !== user.id));
        showNotification(`User ${user.email} deleted`, "success");
      }
    } else if (action === "view") {
      setShowUserModal(true);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === "all" || user.tier === filterType || user.status === filterType;
    return matchesSearch && matchesFilter;
  });

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const getActionColor = (type) => {
    const colors = {
      admin: "text-purple-400 bg-purple-500/10",
      signup: "text-emerald-400 bg-emerald-500/10",
      trade: "text-blue-400 bg-blue-500/10",
      login: "text-amber-400 bg-amber-500/10",
    };
    return colors[type] || "text-gray-400 bg-gray-500/10";
  };

  const getTierColor = (tier) => {
    const colors = {
      Enterprise: "text-purple-400 bg-purple-500/10",
      Pro: "text-blue-400 bg-blue-500/10",
      Starter: "text-emerald-400 bg-emerald-500/10",
      Demo: "text-cyan-400 bg-cyan-500/10",
    };
    return colors[tier] || "text-gray-400 bg-gray-500/10";
  };

  const getStatusColor = (status) => {
    return status === "Active" ? "text-emerald-400 bg-emerald-500/10" : "text-red-400 bg-red-500/10";
  };

  const getPnlColor = (pnl) => {
    if (typeof pnl === 'string') {
      return pnl.startsWith('+') ? "text-emerald-400" : pnl.startsWith('-') ? "text-red-400" : "text-white/60";
    }
    return pnl >= 0 ? "text-emerald-400" : "text-red-400";
  };

  const menuItems = [
    { icon: <FaChartLine />, label: "Dashboard", section: "overview" },
    { icon: <FaBuilding />, label: "Enterprise", section: "enterprise" },
    { icon: <FaUsers />, label: "Users", section: "users" },
    { icon: <FaChartLine />, label: "Trading", section: "trading" },
    { icon: <FaWallet />, label: "Money", section: "money" },
    { icon: <FaShareAlt />, label: "Marketing", section: "marketing" },
    { icon: <FaCog />, label: "Advanced", section: "advanced" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-5xl text-purple-400 mx-auto mb-4" />
          <p className="text-white/60">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-white/5 px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin-platform" className="text-xl font-bold flex items-center gap-2">
            <FaCubes className="text-purple-500" />
            <span className="bg-gradient-to-r from-white to-purple-300 bg-clip-text text-transparent">IMALI</span>
          </Link>
          <span className="text-xs text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full">LIVE PREVIEW</span>
        </div>
        <div className="hidden md:flex items-center gap-4">
          <Link to="/" className="text-sm text-white/60 hover:text-white transition">Home</Link>
          <Link to="/how-it-works" className="text-sm text-white/60 hover:text-white transition">How It Works</Link>
          <Link to="/pricing" className="text-sm text-white/60 hover:text-white transition">Pricing</Link>
          <Link to="/enterprise" className="text-sm text-white/60 hover:text-white transition">For Organizations</Link>
          <Link to="/referrals" className="text-sm text-white/60 hover:text-white transition">Referral Partner</Link>
          <Link to="/live" className="text-sm text-white/60 hover:text-white transition">Live Dashboard</Link>
          <Link to="/admin-platform" className="text-sm text-white/60 hover:text-white transition">Back to Landing</Link>
        </div>
        <div className="flex items-center gap-3">
          <LiveTicker activities={liveActivities} />
          <button 
            onClick={handleRefresh}
            className="text-white/40 hover:text-white transition"
            disabled={isRefreshing}
          >
            <FaSync className={`${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <FaBell className="text-white/40 hover:text-white cursor-pointer transition" />
          <FaUserCircle className="text-2xl text-purple-400 cursor-pointer" />
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-16 flex">
        {/* Sidebar */}
        <div className="w-64 min-h-screen bg-slate-900/50 border-r border-white/5 p-4 fixed left-0 top-16 overflow-y-auto">
          <div className="mb-6">
            <div className="flex items-center gap-3 px-3 py-2 bg-purple-500/10 rounded-xl border border-purple-500/20">
              <FaUserCircle className="text-2xl text-purple-400" />
              <div>
                <p className="text-sm font-semibold">Admin User</p>
                <p className="text-xs text-white/40">admin@imali.com</p>
              </div>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2">
            <div className="bg-white/5 rounded-xl p-3 text-center hover:bg-white/10 transition cursor-pointer">
              <FaUsers className="text-purple-400 mx-auto text-lg" />
              <p className="text-sm font-bold mt-1">{dashboardData.totalUsers}</p>
              <p className="text-[10px] text-white/40">users</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center hover:bg-white/10 transition cursor-pointer">
              <FaDollarSign className="text-emerald-400 mx-auto text-lg" />
              <p className="text-sm font-bold mt-1">${(dashboardData.totalRevenue || 0).toLocaleString()}</p>
              <p className="text-[10px] text-white/40">volume</p>
            </div>
          </div>

          <nav className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  setActiveTab(item.section);
                  showNotification(`Switched to ${item.label}`, "info");
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                  activeTab === item.section
                    ? "bg-purple-500/20 text-purple-400"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
                {item.section === "overview" && (
                  <span className="ml-auto text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">Live</span>
                )}
              </button>
            ))}
          </nav>

          <div className="mt-6 border-t border-white/5 pt-4 space-y-1">
            <button 
              onClick={() => showNotification("AI Assistant analyzing...", "info")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/40 hover:bg-white/5 hover:text-white transition"
            >
              <FaRobot className="text-lg" />
              AI Assistant
            </button>
            <button 
              onClick={() => navigate("/admin-platform")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/40 hover:bg-white/5 hover:text-white transition"
            >
              <FaArrowRight className="text-lg" />
              Back to Landing
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="ml-64 flex-1 p-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-bold">Live Platform Dashboard</h1>
              <p className="text-sm text-white/40">Real-time platform oversight and enterprise management</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button 
                onClick={handleRefresh}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition flex items-center gap-2"
                disabled={isRefreshing}
              >
                {isRefreshing ? <FaSpinner className="animate-spin" /> : <FaSync />}
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </button>
              <button 
                onClick={() => showNotification("Exporting data...", "info")}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition"
              >
                <FaDownload className="inline mr-2" /> Export
              </button>
            </div>
          </div>

          {/* Live Stats Grid with CountUp */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Users", value: dashboardData.totalUsers, icon: <FaUsers className="text-purple-400" />, change: `${dashboardData.newSignups || 0} new today` },
              { label: "Total Trades", value: dashboardData.totalTrades, icon: <FaChartLine className="text-blue-400" />, change: `${dashboardData.activeBots || 0} bots active` },
              { label: "MRR", value: `$${dashboardData.mrr || 0}`, icon: <FaDollarSign className="text-emerald-400" />, change: `${dashboardData.proUsers || 0} Pro • ${dashboardData.eliteUsers || 0} Elite` },
              { label: "Active Users", value: dashboardData.activeUsers || 0, icon: <FaUsers className="text-amber-400" />, change: `${dashboardData.apiConnections || 0} API connections` },
            ].map((stat, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-white/20 transition cursor-pointer"
                onClick={() => showNotification(`Viewing ${stat.label}`, "info")}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white/40">{stat.label}</span>
                  <span className="text-xl">{stat.icon}</span>
                </div>
                <p className="text-2xl font-bold">
                  <CountUp end={typeof stat.value === 'string' ? parseFloat(stat.value.replace(/[^0-9.]/g, '')) || 0 : stat.value} duration={2} separator="," />
                  {typeof stat.value === 'string' && stat.value.includes('$') ? '' : ''}
                </p>
                <p className="text-xs text-white/40 mt-1">{stat.change}</p>
              </motion.div>
            ))}
          </div>

          {/* AI Insights + Candlestick Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="lg:col-span-2">
              <GlassCard className="p-4" gradient="from-white/5 to-white/5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white">Market View</h3>
                  <span className="text-xs text-emerald-400 animate-pulse">● LIVE</span>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/30 p-2">
                  <CandlestickChart 
                    data={candles} 
                    liveCandle={liveCandle} 
                    height={300} 
                  />
                </div>
              </GlassCard>
            </div>
            <AIInsightsPanel data={dashboardData} />
          </div>

          {/* Subscription Metrics + Conversion Funnel */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <SubscriptionMetrics data={dashboardData} />
            <ConversionFunnel data={dashboardData} />
          </div>

          {/* Recent Signups + Bot Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <RecentSignups signups={recentSignups} />
            <GlassCard className="p-6" gradient="from-white/5 to-white/5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <FaRobot className="text-emerald-400" />
                Bot Activity
              </h3>
              {botStatus.length === 0 ? (
                <p className="text-sm text-white/40">No bots currently active</p>
              ) : (
                <div className="space-y-2">
                  {botStatus.slice(0, 5).map((bot, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                      <span className="text-sm text-white">{bot.exchange?.toUpperCase() || 'Bot'}</span>
                      <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {bot.isRunning ? 'Active' : 'Idle'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </div>

          {/* User Management Table */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
            <button 
              onClick={() => toggleSection('users')}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <FaUsers className="text-purple-400" />
                <h3 className="font-semibold">User Management</h3>
                <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">
                  {users.length} users
                </span>
              </div>
              {expandedSections.users ? <FaChevronUp className="text-white/40" /> : <FaChevronDown className="text-white/40" />}
            </button>

            <AnimatePresence>
              {expandedSections.users && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mt-4 flex flex-wrap gap-3">
                    <div className="flex-1 min-w-[200px]">
                      <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm" />
                        <input
                          type="text"
                          placeholder="Search users..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:border-purple-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:border-purple-500 focus:outline-none"
                      >
                        <option value="all">All Tiers</option>
                        <option value="Enterprise">Enterprise</option>
                        <option value="Pro">Pro</option>
                        <option value="Starter">Starter</option>
                        <option value="Demo">Demo</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-white/40 border-b border-white/5">
                          <th className="pb-2 font-medium">Name</th>
                          <th className="pb-2 font-medium">Email</th>
                          <th className="pb-2 font-medium">Tier</th>
                          <th className="pb-2 font-medium">Status</th>
                          <th className="pb-2 font-medium">Trades</th>
                          <th className="pb-2 font-medium">PNL</th>
                          <th className="pb-2 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedUsers.map((user) => (
                          <tr key={user.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition">
                            <td className="py-2 font-medium">{user.name}</td>
                            <td className="py-2 text-white/60">{user.email}</td>
                            <td className="py-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs ${getTierColor(user.tier)}`}>
                                {user.tier}
                              </span>
                            </td>
                            <td className="py-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(user.status)}`}>
                                {user.status}
                              </span>
                            </td>
                            <td className="py-2">{user.trades}</td>
                            <td className={`py-2 font-medium ${getPnlColor(user.pnl)}`}>
                              {typeof user.pnl === 'number' ? `$${user.pnl.toFixed(2)}` : user.pnl}
                            </td>
                            <td className="py-2">
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => handleUserAction('view', user)}
                                  className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400 hover:bg-blue-500/20 transition"
                                >
                                  <FaEye className="text-xs" />
                                </button>
                                <button 
                                  onClick={() => handleUserAction('edit', user)}
                                  className="p-1.5 bg-amber-500/10 rounded-lg text-amber-400 hover:bg-amber-500/20 transition"
                                >
                                  <FaEdit className="text-xs" />
                                </button>
                                <button 
                                  onClick={() => handleUserAction('delete', user)}
                                  className="p-1.5 bg-red-500/10 rounded-lg text-red-400 hover:bg-red-500/20 transition"
                                >
                                  <FaTrash className="text-xs" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-xs text-white/40">
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} users
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition"
                        >
                          Previous
                        </button>
                        <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg text-sm">
                          {currentPage} / {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Recent Activity */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
            <button 
              onClick={() => toggleSection('activity')}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <FaClock className="text-purple-400" />
                <h3 className="font-semibold">Recent Activity</h3>
                <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">
                  {recentActivity.length} events
                </span>
              </div>
              {expandedSections.activity ? <FaChevronUp className="text-white/40" /> : <FaChevronDown className="text-white/40" />}
            </button>

            <AnimatePresence>
              {expandedSections.activity && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-white/40 border-b border-white/5">
                          <th className="pb-2 font-medium">Action</th>
                          <th className="pb-2 font-medium">User</th>
                          <th className="pb-2 font-medium">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentActivity.slice(0, 15).map((activity, i) => (
                          <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition">
                            <td className="py-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs ${getActionColor(activity.type)}`}>
                                {activity.action}
                              </span>
                            </td>
                            <td className="py-2 text-white/60">{activity.user}</td>
                            <td className="py-2 text-white/40 text-xs">
                              {activity.time ? new Date(activity.time).toLocaleString() : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-sm font-semibold">⚡ Quick Actions</p>
              <p className="text-xs text-white/40 mb-3">Common admin tasks</p>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={handleRefresh}
                  className="px-3 py-1.5 bg-purple-600 rounded-lg text-xs hover:bg-purple-500 transition"
                >
                  Refresh Metrics
                </button>
                <button 
                  onClick={() => showNotification("Opening PNL details...", "info")}
                  className="px-3 py-1.5 bg-white/10 rounded-lg text-xs hover:bg-white/20 transition"
                >
                  PNL Details
                </button>
                <button 
                  onClick={() => showNotification("Generating report...", "info")}
                  className="px-3 py-1.5 bg-white/10 rounded-lg text-xs hover:bg-white/20 transition"
                >
                  Generate Report
                </button>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-sm font-semibold">⚙️ System Status</p>
              <p className="text-xs text-white/40 mb-3">All systems operational</p>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1 text-xs text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Healthy
                </span>
                <span className="text-xs text-white/40">Uptime: 99.9%</span>
                <button 
                  onClick={() => showNotification("Checking system status...", "info")}
                  className="text-xs text-purple-400 hover:text-purple-300 transition"
                >
                  Check Status
                </button>
              </div>
            </div>
          </div>

          {/* Demo Footer */}
          <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <FaRobot className="text-purple-400 text-xl" />
              <div>
                <p className="text-sm font-semibold">Live Platform Preview</p>
                <p className="text-xs text-white/40">Real data from your IMALI instance</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/admin-platform/signup" className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-500 rounded-lg text-sm hover:shadow-lg hover:shadow-purple-500/25 transition flex items-center gap-2">
                <FaArrowRight /> Get Started
              </Link>
              <Link to="/admin-platform" className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition">
                Back to Landing
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* User Detail Modal */}
      <AnimatePresence>
        {showUserModal && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-900 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">User Details</h2>
                <button 
                  onClick={() => setShowUserModal(false)}
                  className="text-white/40 hover:text-white transition"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <FaUserCircle className="text-6xl text-purple-400" />
                  <div>
                    <h3 className="text-lg font-semibold">{selectedUser.name}</h3>
                    <p className="text-white/60">{selectedUser.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-xs text-white/40">Tier</p>
                    <p className="font-semibold">{selectedUser.tier}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-xs text-white/40">Status</p>
                    <p className={`font-semibold ${selectedUser.status === 'Active' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {selectedUser.status}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-xs text-white/40">Total Trades</p>
                    <p className="font-semibold">{selectedUser.trades}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-xs text-white/40">PNL</p>
                    <p className={`font-semibold ${getPnlColor(selectedUser.pnl)}`}>
                      {typeof selectedUser.pnl === 'number' ? `$${selectedUser.pnl.toFixed(2)}` : selectedUser.pnl}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-white/10">
                  <button 
                    onClick={() => {
                      setShowUserModal(false);
                      showNotification(`Editing ${selectedUser.email}`, "info");
                    }}
                    className="flex-1 px-4 py-2 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition"
                  >
                    <FaEdit className="inline mr-2" /> Edit User
                  </button>
                  <button 
                    onClick={() => {
                      setShowUserModal(false);
                      showNotification(`Viewing ${selectedUser.email}'s trades`, "info");
                    }}
                    className="flex-1 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition"
                  >
                    <FaChartLine className="inline mr-2" /> View Trades
                  </button>
                  <button 
                    onClick={() => {
                      setShowUserModal(false);
                      if (window.confirm(`Delete user ${selectedUser.email}?`)) {
                        setUsers(users.filter(u => u.id !== selectedUser.id));
                        showNotification(`User ${selectedUser.email} deleted`, "success");
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition"
                  >
                    <FaTrash className="inline mr-2" /> Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPlatformDemo;