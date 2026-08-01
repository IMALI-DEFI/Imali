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
  FaBrain, FaFire, FaBolt, FaWaveSquare, FaGlobe, FaCloud,
  FaPlug, FaCode, FaMobile, FaLaptop, FaPaintBrush,
  FaFileCode, FaBug, FaRocket, FaShieldVirus, FaBars, FaTimes as FaTimesIcon
} from "react-icons/fa";
import BotAPI from "../utils/BotAPI";
import CandlestickChart from "../components/charts/CandlestickChart";
import * as candleGenerator from "../utils/demoCandleGenerator";

// Glass Card Component - Mobile responsive
const GlassCard = ({ children, className = "", gradient = "from-white/5 to-white/5", contentClassName = "p-3 sm:p-4 md:p-6" }) => (
  <div className={`relative overflow-hidden rounded-xl sm:rounded-2xl border border-white/10 bg-gradient-to-br ${gradient} backdrop-blur-xl shadow-xl ${className}`}>
    <div className="absolute inset-0 bg-white/5" />
    <div className={`relative z-10 ${contentClassName}`}>{children}</div>
  </div>
);

// Live Ticker - Mobile responsive
const LiveTicker = ({ activities }) => {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  const messages = activities.length > 0 
    ? activities.map(a => `${a.event} • ${a.details}`)
    : ["Platform ready • Monitoring 24/7"];

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
    <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-purple-400/30 bg-purple-500/10 px-2 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 text-[10px] sm:text-xs text-purple-400 backdrop-blur-sm max-w-[200px] sm:max-w-none">
      <span className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-purple-400 animate-pulse flex-shrink-0" />
      <span className={`transition-opacity duration-300 truncate ${visible ? "opacity-100" : "opacity-0"}`}>
        {messages[index]}
      </span>
    </div>
  );
};

// AI Insights Panel - Mobile responsive
const AIInsightsPanel = ({ data }) => {
  const [insights, setInsights] = useState({
    summary: "Analyzing platform activity...",
    recommendations: [],
    confidence: 87,
    scanning: 48,
    risk: "Low",
    topSignal: "User Activity"
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const signals = [
        { signal: "User Registrations", confidence: 92, action: "GROWING" },
        { signal: "API Usage", confidence: 78, action: "STABLE" },
        { signal: "Subscriptions", confidence: 85, action: "INCREASING" },
        { signal: "Support Tickets", confidence: 63, action: "DECLINING" },
      ];
      const random = signals[Math.floor(Math.random() * signals.length)];
      
      const summaries = [
        `${data?.newSignups || 0} new users today • ${data?.newSubscriptions || 0} new subscriptions`,
        `Most active feature: ${data?.topFeature || 'User Management'} (${data?.featureUsage || 45}%)`,
        `${data?.activeUsers || 0} active users • ${data?.apiCalls || 0} API calls today`,
        `${data?.organizations || 0} organizations • ${data?.integrations || 0} integrations`
      ];
      
      setInsights({
        summary: summaries[Math.floor(Math.random() * summaries.length)],
        recommendations: [
          `${Math.floor(Math.random() * 5) + 1} users haven't completed onboarding`,
          `${Math.floor(Math.random() * 3) + 1} teams near user limit`,
          "AI detected increased engagement on mobile"
        ].slice(0, 2),
        confidence: Math.floor(Math.random() * 30) + 60,
        scanning: Math.floor(Math.random() * 30) + 35,
        risk: ["Low", "Medium", "Low", "Low"][Math.floor(Math.random() * 4)],
        topSignal: random.signal,
        topAction: random.action
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [data]);

  return (
    <GlassCard className="border-purple-500/20" gradient="from-purple-500/10 to-blue-500/10">
      <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
        <FaBrain className="text-purple-400 text-lg sm:text-xl flex-shrink-0" />
        <h3 className="text-base sm:text-lg font-bold text-white">AI Insights</h3>
        <span className="ml-auto text-[10px] sm:text-xs text-emerald-400 animate-pulse">● LIVE</span>
      </div>
      
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div className="bg-white/5 rounded-lg sm:rounded-xl p-2 sm:p-3">
          <p className="text-[10px] sm:text-xs text-white/40 truncate">Top Signal</p>
          <div className="flex items-center gap-1 sm:gap-2 mt-0.5 sm:mt-1">
            <span className="text-sm sm:text-lg font-bold text-white truncate">{insights.topSignal}</span>
            <span className={`text-[10px] sm:text-sm font-bold flex-shrink-0 ${insights.topAction === 'GROWING' ? 'text-emerald-400' : insights.topAction === 'INCREASING' ? 'text-emerald-400' : insights.topAction === 'DECLINING' ? 'text-red-400' : 'text-yellow-400'}`}>
              {insights.topAction}
            </span>
          </div>
        </div>
        <div className="bg-white/5 rounded-lg sm:rounded-xl p-2 sm:p-3">
          <p className="text-[10px] sm:text-xs text-white/40 truncate">Confidence</p>
          <div className="flex items-center gap-1 sm:gap-2 mt-0.5 sm:mt-1">
            <span className="text-sm sm:text-xl font-bold text-white">{insights.confidence}%</span>
            <div className="flex-1 h-1 sm:h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-400 to-emerald-400 rounded-full" style={{ width: `${insights.confidence}%` }} />
            </div>
          </div>
        </div>
        <div className="bg-white/5 rounded-lg sm:rounded-xl p-2 sm:p-3">
          <p className="text-[10px] sm:text-xs text-white/40 truncate">Monitoring</p>
          <p className="text-sm sm:text-lg font-bold text-white">{insights.scanning}</p>
        </div>
        <div className="bg-white/5 rounded-lg sm:rounded-xl p-2 sm:p-3">
          <p className="text-[10px] sm:text-xs text-white/40 truncate">Risk Level</p>
          <p className={`text-sm sm:text-lg font-bold ${insights.risk === 'Low' ? 'text-emerald-400' : insights.risk === 'Medium' ? 'text-yellow-400' : 'text-red-400'}`}>
            {insights.risk}
          </p>
        </div>
      </div>
      
      <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-white/5 rounded-lg sm:rounded-xl">
        <p className="text-xs sm:text-sm text-white/80 truncate">{insights.summary}</p>
      </div>
      
      <div className="mt-1 sm:mt-2 space-y-0.5 sm:space-y-1">
        {insights.recommendations.map((rec, idx) => (
          <div key={idx} className="flex items-start gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-white/60">
            <FaCheckCircle className="text-emerald-400 text-[8px] sm:text-[10px] mt-0.5 flex-shrink-0" />
            <span className="truncate">{rec}</span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
};

// Platform Metrics - Mobile responsive
const PlatformMetrics = ({ data }) => {
  const metrics = [
    { label: "Users", value: data?.totalUsers || 132, color: "text-cyan-400", icon: <FaUsers /> },
    { label: "Organizations", value: data?.organizations || 24, color: "text-emerald-400", icon: <FaBuilding /> },
    { label: "API Calls", value: data?.apiCalls || 42, color: "text-blue-400", icon: <FaCode /> },
    { label: "Integrations", value: data?.integrations || 12, color: "text-purple-400", icon: <FaPlug /> },
  ];

  return (
    <GlassCard>
      <h3 className="text-sm font-semibold text-white mb-3 sm:mb-4">Platform Metrics</h3>
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        {metrics.map((item) => (
          <div key={item.label} className="bg-white/5 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center">
            <div className="text-xl sm:text-2xl text-purple-400 mb-0.5 sm:mb-1">{item.icon}</div>
            <p className="text-lg sm:text-2xl font-bold text-white">{item.value.toLocaleString()}</p>
            <p className="text-[10px] sm:text-xs text-white/40 truncate">{item.label}</p>
          </div>
        ))}
      </div>
    </GlassCard>
  );
};

// Subscription Metrics - Mobile responsive
const SubscriptionMetrics = ({ data }) => {
  const metrics = [
    { label: "Free", value: data?.freeUsers || 132, color: "text-cyan-400" },
    { label: "Pro", value: data?.proUsers || 21, color: "text-blue-400" },
    { label: "Business", value: data?.businessUsers || 9, color: "text-purple-400" },
    { label: "Enterprise", value: data?.enterpriseUsers || 3, color: "text-amber-400" },
  ];

  const maxValue = Math.max(...metrics.map(m => m.value));

  return (
    <GlassCard>
      <h3 className="text-sm font-semibold text-white mb-3 sm:mb-4">Subscription Distribution</h3>
      <div className="space-y-2 sm:space-y-3">
        {metrics.map((item) => (
          <div key={item.label} className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs sm:text-sm text-white/60 w-12 sm:w-16 truncate">{item.label}</span>
            <div className="flex-1 h-1.5 sm:h-2 bg-white/10 rounded-full overflow-hidden">
              <div className={`h-full bg-gradient-to-r ${item.color.replace('text-', 'from-')} to-${item.color.replace('text-', 'to-')}`} 
                   style={{ width: `${(item.value / maxValue) * 100}%` }} />
            </div>
            <span className={`text-xs sm:text-sm font-bold ${item.color}`}>{item.value}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-white/10 flex justify-between">
        <div>
          <p className="text-[10px] sm:text-xs text-white/40">MRR</p>
          <p className="text-base sm:text-lg font-bold text-white">${data?.mrr || 2540}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] sm:text-xs text-white/40">ARR</p>
          <p className="text-base sm:text-lg font-bold text-emerald-400">${data?.arr || 30480}</p>
        </div>
      </div>
    </GlassCard>
  );
};

// Platform Feature Usage - Mobile responsive
const FeatureUsage = ({ data }) => {
  const features = [
    { label: "User Management", usage: 95, color: "bg-purple-500" },
    { label: "Billing", usage: 78, color: "bg-blue-500" },
    { label: "Analytics", usage: 62, color: "bg-emerald-500" },
    { label: "Email", usage: 45, color: "bg-amber-500" },
    { label: "API", usage: 38, color: "bg-cyan-500" },
    { label: "Referrals", usage: 22, color: "bg-pink-500" },
  ];

  return (
    <GlassCard>
      <h3 className="text-sm font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
        <FaChartLine className="text-emerald-400 text-base sm:text-lg" />
        Feature Adoption
      </h3>
      <div className="space-y-1.5 sm:space-y-2.5">
        {features.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2 sm:gap-3">
            <span className="text-[10px] sm:text-xs text-white/40 w-16 sm:w-28 text-right truncate">{item.label}</span>
            <div className="flex-1 h-4 sm:h-5 bg-white/5 rounded-lg overflow-hidden relative">
              <div className={`h-full ${item.color} transition-all duration-1000`} 
                   style={{ width: `${item.usage}%` }} />
              <span className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 text-[8px] sm:text-xs font-bold text-white">
                {item.usage}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
};

// Recent Activity - Mobile responsive
const RecentActivity = ({ activities }) => {
  if (!activities || activities.length === 0) {
    return (
      <GlassCard>
        <h3 className="text-sm font-semibold text-white mb-3 sm:mb-4">Recent Activity</h3>
        <p className="text-sm text-white/40">No recent activity</p>
      </GlassCard>
    );
  }

  const getActivityIcon = (type) => {
    const icons = {
      user: <FaUserPlus className="text-emerald-400" />,
      subscription: <FaCreditCard className="text-blue-400" />,
      api: <FaCode className="text-purple-400" />,
      organization: <FaBuilding className="text-amber-400" />,
      email: <FaEnvelope className="text-red-400" />,
      default: <FaCheckCircle className="text-white/30" />
    };
    return icons[type] || icons.default;
  };

  return (
    <GlassCard>
      <h3 className="text-sm font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
        <FaClock className="text-purple-400 text-base sm:text-lg" />
        Recent Activity
      </h3>
      <div className="space-y-1.5 sm:space-y-2 max-h-48 sm:max-h-60 overflow-y-auto">
        {activities.slice(0, 10).map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="flex items-center gap-1.5 sm:gap-3 p-1.5 sm:p-2 bg-white/5 rounded-lg hover:bg-white/10 transition"
          >
            <span className="text-base sm:text-lg flex-shrink-0">{getActivityIcon(item.type)}</span>
            <span className="text-[10px] sm:text-xs text-white/40 flex-shrink-0">{item.time}</span>
            <span className="text-[10px] sm:text-xs font-medium text-white flex-1 truncate">{item.user}</span>
            <span className={`text-[8px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full flex-shrink-0 ${
              item.type === 'user' ? 'bg-emerald-500/10 text-emerald-400' :
              item.type === 'subscription' ? 'bg-blue-500/10 text-blue-400' :
              item.type === 'api' ? 'bg-purple-500/10 text-purple-400' :
              item.type === 'organization' ? 'bg-amber-500/10 text-amber-400' :
              'bg-white/5 text-white/40'
            }`}>
              {item.action}
            </span>
          </motion.div>
        ))}
      </div>
    </GlassCard>
  );
};

// Stat Card - Mobile responsive
const StatCard = ({ stat, onClick }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: stat.delay || 0 }}
    className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4 hover:border-white/20 transition cursor-pointer"
    onClick={() => onClick(`Viewing ${stat.label}`, "info")}
  >
    <div className="flex items-center justify-between mb-1 sm:mb-2">
      <span className="text-[10px] sm:text-sm text-white/40 truncate">{stat.label}</span>
      <span className="text-base sm:text-xl flex-shrink-0">{stat.icon}</span>
    </div>
    <p className="text-lg sm:text-2xl font-bold">
      <CountUp end={typeof stat.value === 'string' ? parseFloat(stat.value.replace(/[^0-9.]/g, '')) || 0 : stat.value} duration={2} separator="," />
    </p>
    <p className="text-[8px] sm:text-xs text-white/40 mt-0.5 sm:mt-1 truncate">{stat.change}</p>
  </motion.div>
);

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
    features: true,
    activity: true
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const itemsPerPage = 5;

  // Real data states
  const [dashboardData, setDashboardData] = useState({
    totalUsers: 0,
    organizations: 0,
    apiCalls: 0,
    integrations: 0,
    freeUsers: 0,
    proUsers: 0,
    businessUsers: 0,
    enterpriseUsers: 0,
    mrr: 0,
    arr: 0,
    activeUsers: 0,
    newSignups: 0,
    newSubscriptions: 0,
    conversionRate: 0,
    featureUsage: 45,
    topFeature: 'User Management'
  });

  const [users, setUsers] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [liveActivities, setLiveActivities] = useState([]);
  const [featureMetrics, setFeatureMetrics] = useState([]);

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
      
      const [meRes, usersRes, activityRes] = await Promise.allSettled([
        BotAPI.getMe?.(true),
        BotAPI.getOrganizationUsers?.(true),
        BotAPI.getAuditLogs?.({ limit: 50 })
      ]);

      const userData = usersRes.status === 'fulfilled' ? usersRes.value : null;
      if (userData?.users) {
        setUsers(userData.users.map(u => ({
          id: u.id,
          name: u.email?.split('@')[0] || 'User',
          email: u.email || '',
          tier: u.tier || 'Free',
          status: u.trading_enabled ? 'Active' : 'Inactive',
          joined: u.created_at ? new Date(u.created_at).toISOString().split('T')[0] : 'N/A'
        })));
        
        const allUsers = userData.users || [];
        const activeUsers = allUsers.filter(u => u.trading_enabled);
        const freeUsers = allUsers.filter(u => u.tier === 'starter' || u.tier === 'free').length;
        const proUsers = allUsers.filter(u => u.tier === 'pro').length;
        const businessUsers = allUsers.filter(u => u.tier === 'business' || u.tier === 'elite').length;
        const enterpriseUsers = allUsers.filter(u => u.tier === 'enterprise').length;
        const mrr = (proUsers * 19) + (businessUsers * 49) + (enterpriseUsers * 99);
        
        setDashboardData(prev => ({
          ...prev,
          totalUsers: allUsers.length,
          activeUsers: activeUsers.length,
          freeUsers,
          proUsers,
          businessUsers,
          enterpriseUsers,
          mrr,
          arr: mrr * 12
        }));
      }

      if (activityRes.status === 'fulfilled' && activityRes.value?.logs) {
        const logs = activityRes.value.logs || [];
        const formatted = logs.map(log => ({
          action: log.action || 'UNKNOWN',
          user: log.user_email || 'system',
          time: log.created_at ? new Date(log.created_at).toLocaleTimeString() : 'Just now',
          type: log.action?.toLowerCase().includes('signup') ? 'user' :
                log.action?.toLowerCase().includes('subscription') ? 'subscription' :
                log.action?.toLowerCase().includes('api') ? 'api' :
                log.action?.toLowerCase().includes('organization') ? 'organization' :
                'default'
        }));
        setRecentActivity(formatted);
        
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

      const events = [
        { event: "API Request", details: "2.4k requests this hour" },
        { event: "User Activity", details: "48 users online" },
        { event: "System Health", details: "All services operational" },
        { event: "Integration", details: "Stripe sync complete" },
      ];
      setLiveActivities(events);

      const features = [
        { name: "User Management", usage: 95 },
        { name: "Billing", usage: 78 },
        { name: "Analytics", usage: 62 },
        { name: "Email", usage: 45 },
        { name: "API", usage: 38 },
        { name: "Referrals", usage: 22 },
      ];
      setFeatureMetrics(features);

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
      user: "text-emerald-400 bg-emerald-500/10",
      subscription: "text-blue-400 bg-blue-500/10",
      api: "text-purple-400 bg-purple-500/10",
      organization: "text-amber-400 bg-amber-500/10",
      default: "text-gray-400 bg-gray-500/10",
    };
    return colors[type] || colors.default;
  };

  const getTierColor = (tier) => {
    const colors = {
      Enterprise: "text-purple-400 bg-purple-500/10",
      Business: "text-blue-400 bg-blue-500/10",
      Pro: "text-emerald-400 bg-emerald-500/10",
      Free: "text-cyan-400 bg-cyan-500/10",
    };
    return colors[tier] || "text-gray-400 bg-gray-500/10";
  };

  const getStatusColor = (status) => {
    return status === "Active" ? "text-emerald-400 bg-emerald-500/10" : "text-red-400 bg-red-500/10";
  };

  const menuItems = [
    { icon: <FaChartLine />, label: "Dashboard", section: "overview" },
    { icon: <FaUsers />, label: "Users", section: "users" },
    { icon: <FaBuilding />, label: "Organizations", section: "organizations" },
    { icon: <FaCreditCard />, label: "Billing", section: "billing" },
    { icon: <FaCode />, label: "API", section: "api" },
    { icon: <FaShareAlt />, label: "Marketing", section: "marketing" },
    { icon: <FaCog />, label: "Settings", section: "settings" },
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
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-white/5 px-3 sm:px-4 md:px-6 h-14 sm:h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden text-white/60 hover:text-white transition p-1.5"
          >
            <FaBars className="text-lg sm:text-xl" />
          </button>
          
          <Link to="/admin-platform" className="text-base sm:text-xl font-bold flex items-center gap-1.5 sm:gap-2">
            <FaCubes className="text-purple-500 text-sm sm:text-lg" />
            <span className="bg-gradient-to-r from-white to-purple-300 bg-clip-text text-transparent hidden xs:inline">Admin<span className="text-purple-500">Platform</span></span>
          </Link>
          <span className="text-[8px] sm:text-xs text-purple-400 border border-purple-500/20 px-1.5 sm:px-2 py-0.5 rounded-full">LIVE</span>
        </div>
        
        <div className="hidden md:flex items-center gap-3 sm:gap-4">
          <Link to="/" className="text-xs sm:text-sm text-white/60 hover:text-white transition">Home</Link>
          <Link to="/admin-platform" className="text-xs sm:text-sm text-white/60 hover:text-white transition">Back to Landing</Link>
        </div>
        
        <div className="flex items-center gap-1.5 sm:gap-3">
          <div className="hidden sm:block">
            <LiveTicker activities={liveActivities} />
          </div>
          <button 
            onClick={handleRefresh}
            className="text-white/40 hover:text-white transition p-1.5"
            disabled={isRefreshing}
          >
            <FaSync className={`text-xs sm:text-sm ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <FaBell className="text-white/40 hover:text-white cursor-pointer transition text-sm sm:text-base" />
          <FaUserCircle className="text-xl sm:text-2xl text-purple-400 cursor-pointer" />
        </div>
      </nav>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/70 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="pt-14 sm:pt-16 flex">
        {/* Sidebar - Mobile responsive */}
        <div className={`
          fixed lg:static top-14 sm:top-16 left-0 z-40 w-64 sm:w-72 h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] 
          bg-slate-900/95 border-r border-white/5 p-3 sm:p-4 overflow-y-auto transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="flex items-center justify-between lg:hidden mb-4">
            <span className="text-sm font-semibold text-white">Menu</span>
            <button onClick={() => setSidebarOpen(false)} className="text-white/60 hover:text-white">
              <FaTimesIcon />
            </button>
          </div>

          <div className="mb-4 sm:mb-6">
            <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 bg-purple-500/10 rounded-xl border border-purple-500/20">
              <FaUserCircle className="text-xl sm:text-2xl text-purple-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-semibold truncate">Admin User</p>
                <p className="text-[10px] sm:text-xs text-white/40 truncate">admin@platform.com</p>
              </div>
            </div>
          </div>

          <div className="mb-3 sm:mb-4 grid grid-cols-2 gap-1.5 sm:gap-2">
            <div className="bg-white/5 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center hover:bg-white/10 transition cursor-pointer">
              <FaUsers className="text-purple-400 mx-auto text-base sm:text-lg" />
              <p className="text-xs sm:text-sm font-bold mt-0.5 sm:mt-1">{dashboardData.totalUsers}</p>
              <p className="text-[8px] sm:text-[10px] text-white/40">users</p>
            </div>
            <div className="bg-white/5 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center hover:bg-white/10 transition cursor-pointer">
              <FaDollarSign className="text-emerald-400 mx-auto text-base sm:text-lg" />
              <p className="text-xs sm:text-sm font-bold mt-0.5 sm:mt-1">${(dashboardData.mrr || 0).toLocaleString()}</p>
              <p className="text-[8px] sm:text-[10px] text-white/40">MRR</p>
            </div>
          </div>

          <nav className="space-y-0.5 sm:space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  setActiveTab(item.section);
                  showNotification(`Switched to ${item.label}`, "info");
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm transition ${
                  activeTab === item.section
                    ? "bg-purple-500/20 text-purple-400"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="text-base sm:text-lg">{item.icon}</span>
                <span className="truncate">{item.label}</span>
                {item.section === "overview" && (
                  <span className="ml-auto text-[8px] sm:text-[10px] bg-emerald-500/20 text-emerald-400 px-1 sm:px-1.5 py-0.5 rounded-full">Live</span>
                )}
              </button>
            ))}
          </nav>

          <div className="mt-4 sm:mt-6 border-t border-white/5 pt-3 sm:pt-4 space-y-0.5 sm:space-y-1">
            <button 
              onClick={() => showNotification("AI Assistant analyzing...", "info")}
              className="w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm text-white/40 hover:bg-white/5 hover:text-white transition"
            >
              <FaRobot className="text-base sm:text-lg" />
              AI Assistant
            </button>
            <button 
              onClick={() => navigate("/admin-platform")}
              className="w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm text-white/40 hover:bg-white/5 hover:text-white transition"
            >
              <FaArrowRight className="text-base sm:text-lg" />
              Back to Landing
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-3 sm:p-4 md:p-6 overflow-x-hidden">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-2 sm:gap-4">
            <div>
              <h1 className="text-lg sm:text-2xl font-bold">Platform Dashboard</h1>
              <p className="text-xs sm:text-sm text-white/40 truncate">Complete platform oversight and management</p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-3">
              <button 
                onClick={handleRefresh}
                className="px-2 sm:px-4 py-1.5 sm:py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] sm:text-sm hover:bg-white/10 transition flex items-center gap-1.5 sm:gap-2"
                disabled={isRefreshing}
              >
                {isRefreshing ? <FaSpinner className="animate-spin text-xs sm:text-sm" /> : <FaSync className="text-xs sm:text-sm" />}
                <span className="hidden xs:inline">{isRefreshing ? "Refreshing..." : "Refresh"}</span>
              </button>
              <button 
                onClick={() => showNotification("Exporting data...", "info")}
                className="px-2 sm:px-4 py-1.5 sm:py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] sm:text-sm hover:bg-white/10 transition"
              >
                <FaDownload className="inline mr-1 sm:mr-2 text-xs sm:text-sm" />
                <span className="hidden xs:inline">Export</span>
              </button>
            </div>
          </div>

          {/* Live Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
            {[
              { label: "Total Users", value: dashboardData.totalUsers, icon: <FaUsers className="text-purple-400" />, change: `${dashboardData.newSignups || 0} new today`, delay: 0.1 },
              { label: "API Calls", value: dashboardData.apiCalls || 2847, icon: <FaCode className="text-blue-400" />, change: `${dashboardData.activeUsers || 0} active users`, delay: 0.2 },
              { label: "MRR", value: `$${dashboardData.mrr || 0}`, icon: <FaDollarSign className="text-emerald-400" />, change: `${dashboardData.proUsers || 0} Pro • ${dashboardData.businessUsers || 0} Business`, delay: 0.3 },
              { label: "Organizations", value: dashboardData.organizations || 24, icon: <FaBuilding className="text-amber-400" />, change: `${dashboardData.integrations || 0} integrations`, delay: 0.4 },
            ].map((stat, i) => (
              <StatCard key={i} stat={{ ...stat, delay: (i + 1) * 0.1 }} onClick={showNotification} />
            ))}
          </div>

          {/* AI Insights + Candlestick Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="lg:col-span-2">
              <GlassCard>
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <h3 className="text-xs sm:text-sm font-semibold text-white">Market Data (Demo Chart)</h3>
                  <span className="text-[10px] sm:text-xs text-emerald-400 animate-pulse">● LIVE</span>
                </div>
                <div className="rounded-lg sm:rounded-xl border border-white/10 bg-black/30 p-1.5 sm:p-2">
                  <CandlestickChart 
                    data={candles} 
                    liveCandle={liveCandle} 
                    height={window.innerWidth < 640 ? 200 : 300} 
                  />
                </div>
                <p className="text-[8px] sm:text-xs text-white/30 mt-1 sm:mt-2 text-center">Example candlestick chart - Replace with your own data</p>
              </GlassCard>
            </div>
            <AIInsightsPanel data={dashboardData} />
          </div>

          {/* Platform Metrics + Feature Usage */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <PlatformMetrics data={dashboardData} />
            <FeatureUsage data={dashboardData} />
          </div>

          {/* Subscription Metrics + Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <SubscriptionMetrics data={dashboardData} />
            <RecentActivity activities={recentActivity} />
          </div>

          {/* User Management Table */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 overflow-x-hidden">
            <button 
              onClick={() => toggleSection('users')}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <FaUsers className="text-purple-400 text-sm sm:text-base flex-shrink-0" />
                <h3 className="font-semibold text-sm sm:text-base truncate">User Management</h3>
                <span className="text-[10px] sm:text-xs text-white/40 bg-white/5 px-1.5 sm:px-2 py-0.5 rounded-full flex-shrink-0">
                  {users.length} users
                </span>
              </div>
              {expandedSections.users ? <FaChevronUp className="text-white/40 text-xs sm:text-sm flex-shrink-0" /> : <FaChevronDown className="text-white/40 text-xs sm:text-sm flex-shrink-0" />}
            </button>

            <AnimatePresence>
              {expandedSections.users && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <div className="flex-1 min-w-[150px]">
                      <div className="relative">
                        <FaSearch className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-white/30 text-xs sm:text-sm" />
                        <input
                          type="text"
                          placeholder="Search users..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-7 sm:pl-9 pr-2 sm:pr-3 py-1.5 sm:py-2 bg-white/5 border border-white/10 rounded-lg text-xs sm:text-sm text-white placeholder:text-white/30 focus:border-purple-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex gap-1.5 sm:gap-2">
                      <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="px-2 sm:px-3 py-1.5 sm:py-2 bg-white/5 border border-white/10 rounded-lg text-xs sm:text-sm text-white focus:border-purple-500 focus:outline-none"
                      >
                        <option value="all">All Tiers</option>
                        <option value="Enterprise">Enterprise</option>
                        <option value="Business">Business</option>
                        <option value="Pro">Pro</option>
                        <option value="Free">Free</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-3 sm:mt-4 overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm min-w-[600px]">
                      <thead>
                        <tr className="text-left text-white/40 border-b border-white/5">
                          <th className="pb-1.5 sm:pb-2 font-medium">Name</th>
                          <th className="pb-1.5 sm:pb-2 font-medium hidden sm:table-cell">Email</th>
                          <th className="pb-1.5 sm:pb-2 font-medium">Tier</th>
                          <th className="pb-1.5 sm:pb-2 font-medium">Status</th>
                          <th className="pb-1.5 sm:pb-2 font-medium hidden md:table-cell">Joined</th>
                          <th className="pb-1.5 sm:pb-2 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedUsers.map((user) => (
                          <tr key={user.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition">
                            <td className="py-1.5 sm:py-2 font-medium truncate max-w-[60px] sm:max-w-none">{user.name}</td>
                            <td className="py-1.5 sm:py-2 text-white/60 hidden sm:table-cell truncate max-w-[120px]">{user.email}</td>
                            <td className="py-1.5 sm:py-2">
                              <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-xs ${getTierColor(user.tier)}`}>
                                {user.tier}
                              </span>
                            </td>
                            <td className="py-1.5 sm:py-2">
                              <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-xs ${getStatusColor(user.status)}`}>
                                {user.status}
                              </span>
                            </td>
                            <td className="py-1.5 sm:py-2 text-white/40 text-[10px] sm:text-xs hidden md:table-cell">{user.joined}</td>
                            <td className="py-1.5 sm:py-2">
                              <div className="flex gap-1 sm:gap-2">
                                <button 
                                  onClick={() => handleUserAction('view', user)}
                                  className="p-1 sm:p-1.5 bg-blue-500/10 rounded-lg text-blue-400 hover:bg-blue-500/20 transition"
                                >
                                  <FaEye className="text-[10px] sm:text-xs" />
                                </button>
                                <button 
                                  onClick={() => handleUserAction('edit', user)}
                                  className="p-1 sm:p-1.5 bg-amber-500/10 rounded-lg text-amber-400 hover:bg-amber-500/20 transition"
                                >
                                  <FaEdit className="text-[10px] sm:text-xs" />
                                </button>
                                <button 
                                  onClick={() => handleUserAction('delete', user)}
                                  className="p-1 sm:p-1.5 bg-red-500/10 rounded-lg text-red-400 hover:bg-red-500/20 transition"
                                >
                                  <FaTrash className="text-[10px] sm:text-xs" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
                      <p className="text-[10px] sm:text-xs text-white/40">
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} users
                      </p>
                      <div className="flex gap-1.5 sm:gap-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="px-2 sm:px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] sm:text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition"
                        >
                          Previous
                        </button>
                        <span className="px-2 sm:px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg text-[10px] sm:text-sm">
                          {currentPage} / {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="px-2 sm:px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] sm:text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition"
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

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4">
              <p className="text-xs sm:text-sm font-semibold">⚡ Quick Actions</p>
              <p className="text-[10px] sm:text-xs text-white/40 mb-2 sm:mb-3">Common admin tasks</p>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                <button 
                  onClick={handleRefresh}
                  className="px-2 sm:px-3 py-1 sm:py-1.5 bg-purple-600 rounded-lg text-[10px] sm:text-xs hover:bg-purple-500 transition"
                >
                  Refresh Metrics
                </button>
                <button 
                  onClick={() => showNotification("Generating report...", "info")}
                  className="px-2 sm:px-3 py-1 sm:py-1.5 bg-white/10 rounded-lg text-[10px] sm:text-xs hover:bg-white/20 transition"
                >
                  Generate Report
                </button>
                <button 
                  onClick={() => showNotification("Exporting data...", "info")}
                  className="px-2 sm:px-3 py-1 sm:py-1.5 bg-white/10 rounded-lg text-[10px] sm:text-xs hover:bg-white/20 transition"
                >
                  Export Data
                </button>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4">
              <p className="text-xs sm:text-sm font-semibold">⚙️ System Status</p>
              <p className="text-[10px] sm:text-xs text-white/40 mb-2 sm:mb-3">All systems operational</p>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <span className="flex items-center gap-1 text-[10px] sm:text-xs text-emerald-400">
                  <span className="h-1.5 sm:h-2 w-1.5 sm:w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Healthy
                </span>
                <span className="text-[10px] sm:text-xs text-white/40">Uptime: 99.9%</span>
                <button 
                  onClick={() => showNotification("Checking system status...", "info")}
                  className="text-[10px] sm:text-xs text-purple-400 hover:text-purple-300 transition"
                >
                  Check Status
                </button>
              </div>
            </div>
          </div>

          {/* Demo Footer */}
          <div className="p-3 sm:p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <FaRobot className="text-purple-400 text-lg sm:text-xl flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-semibold truncate">Live Platform Preview</p>
                <p className="text-[10px] sm:text-xs text-white/40 truncate">Real data from your platform instance</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <Link to="/admin-platform/signup" className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-purple-600 to-purple-500 rounded-lg text-[10px] sm:text-sm hover:shadow-lg hover:shadow-purple-500/25 transition flex items-center gap-1.5 sm:gap-2">
                <FaArrowRight /> Get Started
              </Link>
              <Link to="/admin-platform" className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] sm:text-sm hover:bg-white/10 transition">
                Back to Landing
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* User Detail Modal - Mobile responsive */}
      <AnimatePresence>
        {showUserModal && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-900 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6"
            >
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-base sm:text-xl font-bold">User Details</h2>
                <button 
                  onClick={() => setShowUserModal(false)}
                  className="text-white/40 hover:text-white transition"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <FaUserCircle className="text-4xl sm:text-6xl text-purple-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold truncate">{selectedUser.name}</h3>
                    <p className="text-xs sm:text-sm text-white/60 truncate">{selectedUser.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  <div className="bg-white/5 rounded-lg sm:rounded-xl p-2 sm:p-4">
                    <p className="text-[10px] sm:text-xs text-white/40">Tier</p>
                    <p className="font-semibold text-sm sm:text-base">{selectedUser.tier}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg sm:rounded-xl p-2 sm:p-4">
                    <p className="text-[10px] sm:text-xs text-white/40">Status</p>
                    <p className={`font-semibold text-sm sm:text-base ${selectedUser.status === 'Active' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {selectedUser.status}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-lg sm:rounded-xl p-2 sm:p-4">
                    <p className="text-[10px] sm:text-xs text-white/40">Joined</p>
                    <p className="font-semibold text-sm sm:text-base">{selectedUser.joined}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg sm:rounded-xl p-2 sm:p-4">
                    <p className="text-[10px] sm:text-xs text-white/40">Role</p>
                    <p className="font-semibold text-sm sm:text-base">Member</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-white/10">
                  <button 
                    onClick={() => {
                      setShowUserModal(false);
                      showNotification(`Editing ${selectedUser.email}`, "info");
                    }}
                    className="flex-1 min-w-[80px] px-2 sm:px-3 py-1.5 sm:py-2 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition text-xs sm:text-sm"
                  >
                    <FaEdit className="inline mr-1 sm:mr-2 text-xs" /> Edit
                  </button>
                  <button 
                    onClick={() => {
                      setShowUserModal(false);
                      showNotification(`Viewing ${selectedUser.email}'s activity`, "info");
                    }}
                    className="flex-1 min-w-[80px] px-2 sm:px-3 py-1.5 sm:py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition text-xs sm:text-sm"
                  >
                    <FaChartLine className="inline mr-1 sm:mr-2 text-xs" /> Activity
                  </button>
                  <button 
                    onClick={() => {
                      setShowUserModal(false);
                      if (window.confirm(`Delete user ${selectedUser.email}?`)) {
                        setUsers(users.filter(u => u.id !== selectedUser.id));
                        showNotification(`User ${selectedUser.email} deleted`, "success");
                      }
                    }}
                    className="flex-1 min-w-[80px] px-2 sm:px-3 py-1.5 sm:py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition text-xs sm:text-sm"
                  >
                    <FaTrash className="inline mr-1 sm:mr-2 text-xs" /> Delete
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