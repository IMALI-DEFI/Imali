// src/admin/UserManagement.jsx
import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  FaBan,
  FaCheckCircle,
  FaEdit,
  FaEnvelope,
  FaExclamationTriangle,
  FaEye,
  FaKey,
  FaLock,
  FaPlus,
  FaSave,
  FaSearch,
  FaSpinner,
  FaTimes,
  FaTrash,
  FaUserPlus,
  FaEnvelopeOpenText,
  FaRobot,
  FaCreditCard,
  FaPlug,
  FaCalendarAlt,
  FaChartLine,
  FaWallet,
  FaExchangeAlt,
  FaUsers,
  FaChevronLeft,
  FaChevronRight,
  FaArrowUp,
  FaArrowDown,
  FaCheck,
  FaSquare,
  FaCheckSquare,
} from "react-icons/fa";

const TOKEN_KEY = "imali_token";

const TIERS = ["starter", "common", "rare", "epic", "legendary"];
const STRATEGIES = [
  { value: "mean_reversion", label: "Conservative / Mean Reversion" },
  { value: "ai_weighted", label: "Balanced / AI Weighted" },
  { value: "momentum", label: "Aggressive / Momentum" },
  { value: "arbitrage", label: "Arbitrage" },
  { value: "futures", label: "Futures Engine" },
  { value: "alpha", label: "Alpha Sniper" },
];

const DEFAULT_ADD_FORM = {
  email: "",
  password: "",
  tier: "starter",
  strategy: "ai_weighted",
  is_admin: false,
};

// ========== SAFE RENDER HELPERS ==========
const safeString = (value, fallback = "—") => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (React.isValidElement(value)) return value;
  if (typeof value === "object") {
    if (value.label) return String(value.label);
    if (value.value) return String(value.value);
    if (value.name) return String(value.name);
    if (value.email) return String(value.email);
    return fallback;
  }
  return fallback;
};

const safeBool = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "object") {
    return value.enabled === true || 
           value.active === true || 
           value.connected === true ||
           value.status === "active" ||
           value.status === "connected";
  }
  if (typeof value === "string") {
    return value === "true" || value === "active" || value === "connected";
  }
  return fallback;
};

const safeNumber = (value, fallback = 0) => {
  const num = Number(value);
  return isNaN(num) ? fallback : num;
};

const getToken = () => localStorage.getItem(TOKEN_KEY) || "";

const formatMoney = (value) => {
  const num = safeNumber(value);
  return `$${num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (value) => {
  if (!value) return "—";
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString();
  } catch {
    return "—";
  }
};

const getTierBadgeClass = (tier) => {
  const tierValue = safeString(tier, "starter").toLowerCase();
  const styles = {
    starter: "bg-blue-500/20 text-blue-300",
    common: "bg-emerald-500/20 text-emerald-300",
    rare: "bg-purple-500/20 text-purple-300",
    epic: "bg-amber-500/20 text-amber-300",
    legendary: "bg-yellow-500/20 text-yellow-300",
  };
  return styles[tierValue] || styles.starter;
};

// ========== HELPER COMPONENTS ==========

const SummaryCard = ({ label, value, icon }) => {
  const displayValue = safeString(value);
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
      <div className="mb-1 text-lg">{icon}</div>
      <div className="text-[10px] text-white/50 uppercase tracking-wide">{label}</div>
      <div className="mt-1 text-lg font-bold">{displayValue}</div>
    </div>
  );
};

const ActionButton = ({ title, icon, onClick, color, variant = "icon", disabled = false }) => {
  if (variant === "text") {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg ${color} hover:bg-white/10 transition-colors disabled:opacity-50`}
      >
        {icon}
        <span className="hidden sm:inline">{title}</span>
      </button>
    );
  }
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`${color} p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50`}
      type="button"
    >
      {icon}
    </button>
  );
};

const UserModal = ({ title, children, onClose, wide = false }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4">
      <div
        className={`max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-gray-900 p-4 sm:p-6 shadow-2xl ${
          wide ? "w-full max-w-3xl" : "w-full max-w-lg"
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg sm:text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="text-white/50 hover:text-white p-1">
            <FaTimes />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const Field = ({ label, icon, children }) => {
  return (
    <label className="block">
      <div className="mb-1 flex items-center gap-2 text-xs sm:text-sm text-white/70">
        <span className="text-xs">{icon}</span>
        {label}
      </div>
      {children}
    </label>
  );
};

const Toggle = ({ label, value, onChange }) => {
  const isEnabled = safeBool(value);
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/30 p-3">
      <span className="text-xs sm:text-sm text-white/80">{label}</span>
      <button
        type="button"
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
          isEnabled ? "bg-emerald-600" : "bg-gray-600"
        }`}
      >
        <span
          className={`absolute h-4 w-4 rounded-full bg-white transition ${
            isEnabled ? "right-1" : "left-1"
          }`}
        />
      </button>
    </div>
  );
};

const ModalActions = ({ primaryLabel, onPrimary, onCancel, working }) => {
  return (
    <div className="mt-6 flex gap-3">
      <button
        onClick={onPrimary}
        disabled={working}
        className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-50"
      >
        {working ? (
          <>
            <FaSpinner className="mr-2 inline animate-spin" />
            Working...
          </>
        ) : (
          <>
            <FaSave className="mr-2 inline" />
            {primaryLabel}
          </>
        )}
      </button>
      <button
        onClick={onCancel}
        disabled={working}
        className="flex-1 rounded-lg border border-white/10 py-2 text-sm hover:bg-white/10 disabled:opacity-50"
      >
        Cancel
      </button>
    </div>
  );
};

const DeleteConfirmModal = ({ user, onConfirm, onCancel, working }) => {
  const userEmail = safeString(user?.email);
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
        <div className="mb-2 flex items-center gap-2 font-bold text-red-300 text-sm">
          <FaExclamationTriangle />
          Permanent Delete
        </div>
        <p className="text-xs sm:text-sm text-white/80">This will permanently delete:</p>
        <p className="mt-2 rounded bg-black/40 p-2 font-mono text-xs break-all">{userEmail}</p>
        <p className="mt-3 text-xs text-red-300/80">This action cannot be undone.</p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onConfirm}
          disabled={working}
          className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold hover:bg-red-500 disabled:opacity-50"
        >
          {working ? "Deleting..." : "Confirm Delete"}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 rounded-lg border border-white/10 py-2 text-sm hover:bg-white/10"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

const Info = ({ label, value, mono = false }) => {
  const displayValue = safeString(value);
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="text-[10px] text-white/50 uppercase tracking-wide">{label}</div>
      <div className={`mt-1 break-all font-medium text-sm ${mono ? "font-mono text-xs" : ""}`}>
        {displayValue}
      </div>
    </div>
  );
};

const UserFormFields = ({ form, setForm, includePassword = false, includeEmail = false }) => {
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-4">
      {(includeEmail || form.email !== undefined) && (
        <Field label="Email Address" icon={<FaEnvelope />}>
          <input
            type="email"
            value={safeString(form.email, "")}
            onChange={(e) => update("email", e.target.value)}
            placeholder="user@example.com"
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white text-sm"
          />
        </Field>
      )}

      {includePassword && (
        <Field label="Password" icon={<FaLock />}>
          <input
            type="password"
            value={safeString(form.password, "")}
            onChange={(e) => update("password", e.target.value)}
            placeholder="At least 8 characters"
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white text-sm"
          />
        </Field>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Plan">
          <select
            value={safeString(form.tier, "starter")}
            onChange={(e) => update("tier", e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white text-sm"
          >
            {TIERS.map((tier) => (
              <option key={tier} value={tier}>
                {tier.toUpperCase()}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Strategy">
          <select
            value={safeString(form.strategy, "ai_weighted")}
            onChange={(e) => update("strategy", e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white text-sm"
          >
            {STRATEGIES.map((strategy) => (
              <option key={strategy.value} value={strategy.value}>
                {strategy.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Toggle
        label="Enable Live Trading"
        value={safeBool(form.trading_enabled)}
        onChange={() => update("trading_enabled", !safeBool(form.trading_enabled))}
      />

      {"paper_trading_enabled" in form && (
        <Toggle
          label="Enable Practice Trading (7-Day Trial)"
          value={safeBool(form.paper_trading_enabled)}
          onChange={() => update("paper_trading_enabled", !safeBool(form.paper_trading_enabled))}
        />
      )}

      <Toggle
        label="Admin Access"
        value={safeBool(form.is_admin)}
        onChange={() => update("is_admin", !safeBool(form.is_admin))}
      />
    </div>
  );
};

// Mobile User Card Component
const UserCard = ({ user, selected, onSelect, onView, onEdit, onConnections, onNewsletter, onAutoResponder, onRevokeApiKey, onToggleTrading, onTogglePaperTrading, working }) => {
  const practiceActive = user.trial_status === "trial" && user.paper_trading_enabled;
  const billingComplete = user.has_card_on_file || user.billing_complete;
  const alpacaConnected = user.alpaca_connected;
  const okxConnected = user.okx_connected;

  return (
    <div className={`rounded-xl border p-4 mb-3 transition-colors ${selected ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-white/10 bg-white/5'}`}>
      {/* Selection Checkbox */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => onSelect(user.id)}
          className="flex items-center gap-2 text-sm text-white/70"
        >
          {selected ? <FaCheckSquare className="text-emerald-400" /> : <FaSquare className="text-white/40" />}
          <span className="text-xs">Select</span>
        </button>
        <div className="flex gap-1">
          <ActionButton title="View" onClick={() => onView(user)} icon={<FaEye className="text-sm" />} color="text-blue-400" />
          <ActionButton title="Edit" onClick={() => onEdit(user)} icon={<FaEdit className="text-sm" />} color="text-amber-400" />
        </div>
      </div>

      {/* User Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 font-bold text-emerald-300">
          {user.email?.charAt(0)?.toUpperCase() || "U"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm break-all">{user.email}</div>
          <div className="text-xs text-white/40">{user.id?.slice(0, 10)}...</div>
        </div>
      </div>

      {/* User Stats Row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center">
          <div className="text-[10px] text-white/50">Tier</div>
          <select
            value={user.tier}
            onChange={(e) => onEdit({ ...user, tier: e.target.value })}
            className={`text-xs rounded-full px-1 py-0.5 ${getTierBadgeClass(user.tier)} bg-transparent cursor-pointer w-full text-center`}
            disabled={working}
          >
            {TIERS.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
          </select>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-white/50">Paper</div>
          {practiceActive ? (
            <span className="text-xs text-emerald-400">Active</span>
          ) : (
            <button onClick={() => onTogglePaperTrading(user)} disabled={working} className="text-xs text-blue-400">Enable</button>
          )}
        </div>
        <div className="text-center">
          <div className="text-[10px] text-white/50">Live</div>
          {user.trading_enabled ? (
            <span className="text-xs text-emerald-400">On</span>
          ) : (
            <span className="text-xs text-red-400">Off</span>
          )}
        </div>
      </div>

      {/* Status Icons Row */}
      <div className="flex justify-around mb-3 py-2 border-y border-white/5">
        <div className="text-center">
          <div className="text-sm">{billingComplete ? "💳✓" : "💳✗"}</div>
          <div className="text-[9px] text-white/40">Billing</div>
        </div>
        <div className="text-center">
          <div className="text-sm">{alpacaConnected ? "🦙✓" : "🦙✗"}</div>
          <div className="text-[9px] text-white/40">Alpaca</div>
        </div>
        <div className="text-center">
          <div className="text-sm">{okxConnected ? "🟢✓" : "🔴✗"}</div>
          <div className="text-[9px] text-white/40">OKX</div>
        </div>
        <div className="text-center">
          <div className="text-sm">{user.strategy?.slice(0, 3) || "AI"}</div>
          <div className="text-[9px] text-white/40">Strat</div>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="flex flex-wrap justify-center gap-1">
        <ActionButton title="Connections" onClick={() => onConnections(user)} icon={<FaPlug className="text-xs" />} color="text-cyan-400" variant="text" />
        <ActionButton title="Newsletter" onClick={() => onNewsletter(user)} icon={<FaEnvelopeOpenText className="text-xs" />} color="text-green-400" variant="text" />
        <ActionButton title="Auto-Responder" onClick={() => onAutoResponder(user)} icon={<FaRobot className="text-xs" />} color="text-purple-400" variant="text" />
        <ActionButton title="Revoke API" onClick={() => onRevokeApiKey(user)} icon={<FaKey className="text-xs" />} color="text-orange-400" variant="text" />
        <ActionButton
          title={user.trading_enabled ? "Disable Trading" : "Enable Trading"}
          onClick={() => onToggleTrading(user)}
          icon={user.trading_enabled ? <FaBan className="text-xs" /> : <FaCheckCircle className="text-xs" />}
          color={user.trading_enabled ? "text-red-400" : "text-emerald-400"}
          variant="text"
        />
      </div>
    </div>
  );
};

// Bulk Delete Modal
const BulkDeleteModal = ({ count, onConfirm, onCancel, working }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="max-w-md w-full rounded-2xl border border-red-500/30 bg-gray-900 p-5 shadow-2xl">
        <h3 className="text-lg font-bold mb-3 text-red-400">Bulk Delete Users</h3>
        <p className="text-sm text-white/80 mb-3">
          Are you sure you want to delete <span className="font-bold text-red-400">{count}</span> selected user(s)?
        </p>
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
          <p className="text-xs text-red-300">⚠️ This action cannot be undone. All user data will be permanently deleted.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onConfirm} disabled={working} className="flex-1 bg-red-600 hover:bg-red-700 py-2 rounded-lg font-semibold text-sm">
            {working ? "Deleting..." : `Delete ${count} User${count !== 1 ? 's' : ''}`}
          </button>
          <button onClick={onCancel} className="flex-1 border border-white/10 py-2 rounded-lg text-sm hover:bg-white/10">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// ========== MAIN COMPONENT ==========
export default function UserManagement({ apiBase = "", showToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserIds, setSelectedUserIds] = useState(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showNewsletterModal, setShowNewsletterModal] = useState(false);
  const [showAutoResponderModal, setShowAutoResponderModal] = useState(false);
  const [showConnectionsModal, setShowConnectionsModal] = useState(false);
  const [showBatchConfirm, setShowBatchConfirm] = useState(false);

  const [addForm, setAddForm] = useState(DEFAULT_ADD_FORM);
  const [editForm, setEditForm] = useState({});
  const [autoResponderRules, setAutoResponderRules] = useState([]);
  const [autoResponderForm, setAutoResponderForm] = useState({ rule_id: "", event_type: "signup", delay_minutes: 0 });

  // Scroll container ref for smooth scrolling
  const usersContainerRef = useRef(null);

  const toast = useCallback((message, type = "info") => {
    if (typeof showToast === "function") showToast(message, type);
    else console.log(`[${type}] ${message}`);
  }, [showToast]);

  const apiRequest = useCallback(async (path, options = {}) => {
    const token = getToken();
    if (!token) throw new Error("No authentication token found");

    const response = await fetch(`${apiBase}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.success === false) {
      throw new Error(data.error || data.message || `Request failed: ${response.status}`);
    }
    return data;
  }, [apiBase]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search.trim()) params.set("search", search.trim());

      const data = await apiRequest(`/api/admin/users?${params.toString()}`);
      const fetchedUsers = data.data?.users || [];
      
      const normalizedUsers = fetchedUsers.map(user => ({
        id: user.id,
        email: safeString(user.email),
        tier: safeString(user.tier, "starter"),
        strategy: safeString(user.strategy, "ai_weighted"),
        trading_enabled: safeBool(user.trading_enabled),
        paper_trading_enabled: safeBool(user.paper_trading_enabled),
        is_admin: safeBool(user.is_admin),
        has_card_on_file: safeBool(user.has_card_on_file),
        billing_complete: safeBool(user.billing_complete),
        alpaca_connected: safeBool(user.alpaca_connected),
        okx_connected: safeBool(user.okx_connected),
        trial_status: safeString(user.trial_status, "trial"),
        portfolio_value: safeNumber(user.portfolio_value),
        wallet_addresses: user.wallet_addresses || [],
        created_at: user.created_at,
      }));
      
      setUsers(normalizedUsers);
      setTotalPages(data.data?.pagination?.totalPages || 1);
      setTotalUsers(data.data?.pagination?.total || 0);
      // Clear selections when page changes
      setSelectedUserIds(new Set());
    } catch (error) {
      console.error("Fetch users failed:", error);
      toast(error.message || "Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  }, [apiRequest, limit, page, search, toast]);

  const fetchAutoResponderRules = useCallback(async () => {
    try {
      const data = await apiRequest("/api/admin/autoresponder/rules");
      setAutoResponderRules(data.data?.rules || []);
    } catch (error) {
      console.error("Fetch auto-responder rules failed:", error);
    }
  }, [apiRequest]);

  useEffect(() => {
    fetchUsers();
    fetchAutoResponderRules();
  }, [fetchUsers, fetchAutoResponderRules]);

  const summary = useMemo(() => ({
    total: totalUsers,
    active: users.filter(u => u.trading_enabled).length,
    admins: users.filter(u => u.is_admin).length,
    trialActive: users.filter(u => u.trial_status === "trial" && u.paper_trading_enabled).length,
    paperDisabled: users.filter(u => !u.paper_trading_enabled).length,
    hasBilling: users.filter(u => u.has_card_on_file).length,
    hasAlpaca: users.filter(u => u.alpaca_connected).length,
    hasOkx: users.filter(u => u.okx_connected).length,
  }), [users, totalUsers]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  // Selection handlers
  const toggleSelectUser = (userId) => {
    setSelectedUserIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.size === users.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(users.map(u => u.id)));
    }
  };

  const clearSelections = () => {
    setSelectedUserIds(new Set());
  };

  // Bulk delete users
  const bulkDeleteUsers = async () => {
    const userIds = Array.from(selectedUserIds);
    if (userIds.length === 0) return;

    setWorking(true);
    try {
      // Delete each user
      for (const userId of userIds) {
        await apiRequest(`/api/admin/users/${userId}`, { method: "DELETE" });
      }
      
      toast(`Deleted ${userIds.length} user(s) successfully`, "success");
      setSelectedUserIds(new Set());
      setShowBulkDeleteConfirm(false);
      
      // Refresh current page or go to previous page if needed
      if (users.length === userIds.length && page > 1) {
        setPage(p => p - 1);
      } else {
        fetchUsers();
      }
    } catch (error) {
      toast(error.message || "Failed to delete users", "error");
    } finally {
      setWorking(false);
    }
  };

  const openAddUser = () => {
    setAddForm(DEFAULT_ADD_FORM);
    setShowAddModal(true);
  };

  const openViewUser = async (user) => {
    setSelectedUser(user);
    setShowViewModal(true);
    try {
      const data = await apiRequest(`/api/admin/users/${user.id}`);
      const detailedUser = data.data?.user || user;
      setSelectedUser({
        ...detailedUser,
        email: safeString(detailedUser.email),
        tier: safeString(detailedUser.tier, "starter"),
        strategy: safeString(detailedUser.strategy, "ai_weighted"),
        trading_enabled: safeBool(detailedUser.trading_enabled),
        paper_trading_enabled: safeBool(detailedUser.paper_trading_enabled),
        is_admin: safeBool(detailedUser.is_admin),
        has_card_on_file: safeBool(detailedUser.has_card_on_file),
        billing_complete: safeBool(detailedUser.billing_complete),
        alpaca_connected: safeBool(detailedUser.alpaca_connected),
        okx_connected: safeBool(detailedUser.okx_connected),
        trial_status: safeString(detailedUser.trial_status, "trial"),
        portfolio_value: safeNumber(detailedUser.portfolio_value),
        created_at: detailedUser.created_at,
      });
    } catch (error) {
      console.error("View user failed:", error);
      toast("Loaded basic user details only", "warning");
    }
  };

  const openEditUser = (user) => {
    setSelectedUser(user);
    setEditForm({
      email: user.email,
      tier: user.tier,
      strategy: user.strategy,
      trading_enabled: user.trading_enabled,
      paper_trading_enabled: user.paper_trading_enabled,
      trial_status: user.trial_status,
      is_admin: user.is_admin,
    });
    setShowEditModal(true);
  };

  const openConnectionsModal = (user) => {
    setSelectedUser(user);
    setShowConnectionsModal(true);
  };

  const openNewsletterModal = (user) => {
    setSelectedUser(user);
    setShowNewsletterModal(true);
  };

  const openAutoResponderModal = (user) => {
    setSelectedUser(user);
    setShowAutoResponderModal(true);
  };

  const createUser = async () => {
    if (!addForm.email.includes("@")) {
      toast("Enter a valid email address", "error");
      return;
    }
    if (!addForm.password || addForm.password.length < 8) {
      toast("Password must be at least 8 characters", "error");
      return;
    }

    setWorking(true);
    try {
      await apiRequest("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          email: addForm.email,
          password: addForm.password,
          tier: addForm.tier,
          strategy: addForm.strategy,
          is_admin: addForm.is_admin,
        }),
      });
      toast("User created successfully", "success");
      setShowAddModal(false);
      fetchUsers();
    } catch (error) {
      toast(error.message || "Failed to create user", "error");
    } finally {
      setWorking(false);
    }
  };

  const updateUser = async () => {
    if (!selectedUser?.id) return;
    setWorking(true);
    try {
      await apiRequest(`/api/admin/users/${selectedUser.id}`, {
        method: "PUT",
        body: JSON.stringify({
          email: editForm.email,
          tier: editForm.tier,
          strategy: editForm.strategy,
          trading_enabled: safeBool(editForm.trading_enabled),
          is_admin: safeBool(editForm.is_admin),
        }),
      });
      toast("User updated successfully", "success");
      setShowEditModal(false);
      fetchUsers();
    } catch (error) {
      toast(error.message || "Failed to update user", "error");
    } finally {
      setWorking(false);
    }
  };

  const updateTier = async (userId, newTier) => {
    setWorking(true);
    try {
      await apiRequest(`/api/admin/users/${userId}/tier`, {
        method: "PATCH",
        body: JSON.stringify({ tier: newTier }),
      });
      toast(`Tier updated to ${newTier}`, "success");
      fetchUsers();
    } catch (error) {
      toast(error.message || "Failed to update tier", "error");
    } finally {
      setWorking(false);
    }
  };

  const toggleTrading = async (user) => {
    setWorking(true);
    try {
      await apiRequest(`/api/admin/users/${user.id}`, {
        method: "PUT",
        body: JSON.stringify({ trading_enabled: !user.trading_enabled }),
      });
      toast(`Trading ${!user.trading_enabled ? "enabled" : "disabled"}`, "success");
      fetchUsers();
    } catch (error) {
      toast(error.message || "Failed to update trading", "error");
    } finally {
      setWorking(false);
    }
  };

  const togglePaperTrading = async (user) => {
    setWorking(true);
    try {
      await apiRequest(`/api/admin/users/${user.id}`, {
        method: "PUT",
        body: JSON.stringify({ paper_trading_enabled: !user.paper_trading_enabled }),
      });
      toast(`Paper trading ${!user.paper_trading_enabled ? "enabled" : "disabled"}`, "success");
      fetchUsers();
    } catch (error) {
      toast(error.message || "Failed to update paper trading", "error");
    } finally {
      setWorking(false);
    }
  };

  const enablePaperTradingForAll = async () => {
    setWorking(true);
    try {
      const allUsersData = await apiRequest("/api/admin/users?page=1&limit=1000");
      const allUsers = allUsersData.data?.users || [];
      const userIds = allUsers.map(u => u.id);
      
      await apiRequest("/api/admin/users/batch", {
        method: "POST",
        body: JSON.stringify({
          action: "enable_paper_trading",
          user_ids: userIds,
        }),
      });
      
      toast(`Paper trading enabled for ${userIds.length} users`, "success");
      fetchUsers();
    } catch (error) {
      toast(error.message || "Failed to enable paper trading for all users", "error");
    } finally {
      setWorking(false);
      setShowBatchConfirm(false);
    }
  };

  const reactivateTrial = async (user) => {
    setWorking(true);
    try {
      await apiRequest(`/api/admin/users/${user.id}/reactivate-trial`, {
        method: "POST",
        body: JSON.stringify({ trial_days: 7 }),
      });
      toast("Practice trading reactivated for 7 days", "success");
      fetchUsers();
    } catch (error) {
      toast(error.message || "Failed to reactivate practice trading", "error");
    } finally {
      setWorking(false);
    }
  };

  const revokeApiKey = async (user) => {
    if (!window.confirm(`Revoke API key for ${user.email}?`)) return;
    setWorking(true);
    try {
      await apiRequest(`/api/admin/users/${user.id}/revoke-api-key`, { method: "POST" });
      toast("API key revoked. New key will be generated on next login.", "success");
      fetchUsers();
    } catch (error) {
      toast(error.message || "Failed to revoke API key", "error");
    } finally {
      setWorking(false);
    }
  };

  const addToNewsletter = async () => {
    if (!selectedUser?.id) return;
    setWorking(true);
    try {
      await apiRequest("/api/admin/newsletter/subscribers", {
        method: "POST",
        body: JSON.stringify({
          email: selectedUser.email,
          first_name: selectedUser.email.split('@')[0],
          interest: "all",
        }),
      });
      toast(`Added ${selectedUser.email} to newsletter`, "success");
      setShowNewsletterModal(false);
    } catch (error) {
      toast(error.message || "Failed to add to newsletter", "error");
    } finally {
      setWorking(false);
    }
  };

  const addToAutoResponder = async () => {
    if (!selectedUser?.id || !autoResponderForm.rule_id) return;
    setWorking(true);
    try {
      await apiRequest(`/api/admin/autoresponder/users/${selectedUser.id}/add`, {
        method: "POST",
        body: JSON.stringify({
          rule_id: autoResponderForm.rule_id,
          event_type: autoResponderForm.event_type,
          delay_minutes: autoResponderForm.delay_minutes,
        }),
      });
      toast(`Added ${selectedUser.email} to auto-responder rule`, "success");
      setShowAutoResponderModal(false);
    } catch (error) {
      toast(error.message || "Failed to add to auto-responder", "error");
    } finally {
      setWorking(false);
    }
  };

  const deleteUser = async () => {
    if (!selectedUser?.id) return;
    setWorking(true);
    try {
      await apiRequest(`/api/admin/users/${selectedUser.id}`, { method: "DELETE" });
      toast("User deleted successfully", "success");
      setShowEditModal(false);
      setShowDeleteConfirm(false);
      setSelectedUser(null);
      
      // Refresh current page or go to previous page if needed
      if (users.length === 1 && page > 1) {
        setPage(p => p - 1);
      } else {
        fetchUsers();
      }
    } catch (error) {
      toast(error.message || "Failed to delete user", "error");
    } finally {
      setWorking(false);
    }
  };

  // Scroll to top of users list when page changes
  useEffect(() => {
    if (usersContainerRef.current) {
      usersContainerRef.current.scrollTop = 0;
    }
  }, [page]);

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-white">
        <FaSpinner className="mr-3 animate-spin text-3xl text-emerald-400" />
        Loading users...
      </div>
    );
  }

  const selectedCount = selectedUserIds.size;

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="mb-3">
          <h2 className="text-lg font-bold">User Management</h2>
          <p className="text-xs text-white/60">Manage user accounts, tiers, and trading permissions.</p>
        </div>

        <div className="flex flex-col gap-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users by email..."
                className="w-full rounded-lg border border-white/10 bg-black/40 py-2 pl-9 pr-3 text-white text-sm placeholder:text-white/30 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500">
              Search
            </button>
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(""); setPage(1); fetchUsers(); }}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
              >
                Clear
              </button>
            )}
          </form>

          <div className="flex gap-2">
            <button
              onClick={openAddUser}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500"
            >
              <FaUserPlus className="text-sm" /> Add User
            </button>
            <button
              onClick={() => setShowBatchConfirm(true)}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500"
            >
              <FaUsers className="text-sm" /> Bulk Paper
            </button>
            {selectedCount > 0 && (
              <button
                onClick={() => setShowBulkDeleteConfirm(true)}
                className="flex items-center justify-center gap-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-500"
              >
                <FaTrash className="text-sm" />
                <span className="hidden sm:inline">Delete ({selectedCount})</span>
                <span className="sm:hidden">{selectedCount}</span>
              </button>
            )}
          </div>

          {/* Selection Controls */}
          {users.length > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-xs text-white/60 hover:text-white"
              >
                {selectedUserIds.size === users.length ? <FaCheckSquare className="text-emerald-400" /> : <FaSquare />}
                {selectedUserIds.size === users.length ? "Deselect All" : "Select All"}
              </button>
              {selectedCount > 0 && (
                <span className="text-xs text-emerald-400">{selectedCount} selected</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats Summary - Horizontal Scroll on Mobile */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="flex gap-3 min-w-max pb-1">
          <div className="w-24"><SummaryCard label="Total" value={summary.total} icon="👥" /></div>
          <div className="w-24"><SummaryCard label="Trading" value={summary.active} icon="📈" /></div>
          <div className="w-24"><SummaryCard label="Paper" value={summary.trialActive} icon="📝" /></div>
          <div className="w-24"><SummaryCard label="Admins" value={summary.admins} icon="👑" /></div>
          <div className="w-24"><SummaryCard label="Billing" value={summary.hasBilling} icon="💳" /></div>
          <div className="w-24"><SummaryCard label="Connected" value={summary.hasAlpaca + summary.hasOkx} icon="🔌" /></div>
        </div>
      </div>

      {/* Users List - Mobile Cards with Scrolling */}
      <div 
        ref={usersContainerRef}
        className="space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto pr-1"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {users.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
            <p className="text-white/50">No users found.</p>
            {search && (
              <button
                onClick={() => { setSearch(""); setPage(1); fetchUsers(); }}
                className="mt-3 text-sm text-emerald-400 hover:text-emerald-300"
              >
                Clear search and show all users
              </button>
            )}
          </div>
        ) : (
          users.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              selected={selectedUserIds.has(user.id)}
              onSelect={toggleSelectUser}
              onView={openViewUser}
              onEdit={openEditUser}
              onConnections={openConnectionsModal}
              onNewsletter={openNewsletterModal}
              onAutoResponder={openAutoResponderModal}
              onRevokeApiKey={revokeApiKey}
              onToggleTrading={toggleTrading}
              onTogglePaperTrading={togglePaperTrading}
              working={working}
            />
          ))
        )}
      </div>

      {/* Pagination with Load More / Infinite Scroll style */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-sm disabled:opacity-40"
          >
            <FaChevronLeft className="text-xs" /> Prev
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/60">
              Page {page} of {totalPages}
            </span>
            <select
              value={page}
              onChange={(e) => setPage(parseInt(e.target.value))}
              className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
            >
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map(p => (
                <option key={p} value={p}>Go to {p}</option>
              ))}
              {totalPages > 10 && page > 10 && (
                <option value={page}>Current {page}</option>
              )}
            </select>
          </div>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-sm disabled:opacity-40"
          >
            Next <FaChevronRight className="text-xs" />
          </button>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && (
        <BulkDeleteModal
          count={selectedCount}
          onConfirm={bulkDeleteUsers}
          onCancel={() => setShowBulkDeleteConfirm(false)}
          working={working}
        />
      )}

      {/* Batch Confirm Modal */}
      {showBatchConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="max-w-md w-full rounded-2xl border border-blue-500/30 bg-gray-900 p-5 shadow-2xl">
            <h3 className="text-lg font-bold mb-3">Enable Paper Trading for All</h3>
            <p className="text-sm text-white/80 mb-3">This will enable paper trading for all {totalUsers} users in the system.</p>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
              <p className="text-xs text-blue-300">Paper trading allows users to practice with $1000 virtual funds.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={enablePaperTradingForAll} disabled={working} className="flex-1 bg-emerald-600 hover:bg-emerald-700 py-2 rounded-lg font-semibold text-sm">
                {working ? "Enabling..." : "Yes, Enable All"}
              </button>
              <button onClick={() => setShowBatchConfirm(false)} className="flex-1 border border-white/10 py-2 rounded-lg text-sm hover:bg-white/10">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <UserModal title="Add New User" onClose={() => setShowAddModal(false)}>
          <UserFormFields form={addForm} setForm={setAddForm} includePassword />
          <ModalActions primaryLabel="Create User" onPrimary={createUser} onCancel={() => setShowAddModal(false)} working={working} />
        </UserModal>
      )}

      {/* View User Modal */}
      {showViewModal && selectedUser && (
        <UserModal title="User Details" onClose={() => setShowViewModal(false)} wide>
          <div className="grid gap-3 sm:grid-cols-2">
            <Info label="Email" value={selectedUser.email} />
            <Info label="User ID" value={selectedUser.id} mono />
            <Info label="Plan" value={selectedUser.tier} />
            <Info label="Strategy" value={selectedUser.strategy} />
            <Info label="Portfolio" value={formatMoney(selectedUser.portfolio_value)} />
            <Info label="Joined" value={formatDate(selectedUser.created_at)} />
            <Info label="Paper Trading" value={selectedUser.paper_trading_enabled ? "Enabled" : "Disabled"} />
            <Info label="Live Trading" value={selectedUser.trading_enabled ? "Enabled" : "Disabled"} />
            <Info label="Admin" value={selectedUser.is_admin ? "Yes" : "No"} />
            <Info label="Billing" value={selectedUser.has_card_on_file ? "Yes" : "No"} />
            <Info label="Alpaca" value={selectedUser.alpaca_connected ? "Yes" : "No"} />
            <Info label="OKX" value={selectedUser.okx_connected ? "Yes" : "No"} />
          </div>
          <div className="mt-5 flex gap-3">
            <button onClick={() => { setShowViewModal(false); openEditUser(selectedUser); }} className="flex-1 rounded-lg bg-amber-600 py-2 text-sm font-semibold hover:bg-amber-500">Edit User</button>
            <button onClick={() => { setShowViewModal(false); reactivateTrial(selectedUser); }} className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-semibold hover:bg-emerald-500">Reactivate</button>
          </div>
        </UserModal>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <UserModal title="Edit User" onClose={() => setShowEditModal(false)}>
          {!showDeleteConfirm ? (
            <>
              <UserFormFields form={editForm} setForm={setEditForm} includeEmail />
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button onClick={() => reactivateTrial(selectedUser)} disabled={working} className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 py-2 text-sm text-emerald-300 hover:bg-emerald-500/20">Reactivate (7 days)</button>
                <button onClick={() => setShowDeleteConfirm(true)} className="rounded-lg border border-red-500/40 bg-red-500/10 py-2 text-sm text-red-300 hover:bg-red-500/20">Delete User</button>
              </div>
              <ModalActions primaryLabel="Save Changes" onPrimary={updateUser} onCancel={() => setShowEditModal(false)} working={working} />
            </>
          ) : (
            <DeleteConfirmModal user={selectedUser} onConfirm={deleteUser} onCancel={() => setShowDeleteConfirm(false)} working={working} />
          )}
        </UserModal>
      )}

      {/* Connections Modal */}
      {showConnectionsModal && selectedUser && (
        <UserModal title="User Connections" onClose={() => setShowConnectionsModal(false)} wide>
          <div className="grid gap-3 sm:grid-cols-2">
            <Info label="Card on File" value={selectedUser.has_card_on_file ? "Yes" : "No"} />
            <Info label="Billing Complete" value={selectedUser.billing_complete ? "Yes" : "Pending"} />
            <Info label="Alpaca" value={selectedUser.alpaca_connected ? "Connected" : "Not Connected"} />
            <Info label="OKX" value={selectedUser.okx_connected ? "Connected" : "Not Connected"} />
            <Info label="Live Trading" value={selectedUser.trading_enabled ? "Enabled" : "Disabled"} />
            <Info label="Paper Trading" value={selectedUser.paper_trading_enabled ? "Active" : "Inactive"} />
            <Info label="Strategy" value={selectedUser.strategy} />
            <Info label="Trial Status" value={selectedUser.trial_status || "trial"} />
          </div>
          {selectedUser.wallet_addresses?.length > 0 && (
            <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3 max-h-32 overflow-y-auto">
              <h4 className="text-sm font-semibold mb-2">Wallets</h4>
              {selectedUser.wallet_addresses.map((addr, idx) => <div key={idx} className="text-xs font-mono text-white/60 break-all">{addr}</div>)}
            </div>
          )}
          <div className="mt-5 flex gap-3">
            <button onClick={() => setShowConnectionsModal(false)} className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-semibold hover:bg-emerald-500">Close</button>
          </div>
        </UserModal>
      )}

      {/* Newsletter Modal */}
      {showNewsletterModal && selectedUser && (
        <UserModal title="Add to Newsletter" onClose={() => setShowNewsletterModal(false)}>
          <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-4 text-center">
            <FaEnvelopeOpenText className="mx-auto text-3xl text-green-400 mb-2" />
            <h3 className="font-semibold break-all">{selectedUser.email}</h3>
            <p className="text-xs text-white/60 mt-1">Will be added to newsletter subscribers</p>
          </div>
          <ModalActions primaryLabel="Add to Newsletter" onPrimary={addToNewsletter} onCancel={() => setShowNewsletterModal(false)} working={working} />
        </UserModal>
      )}

      {/* Auto-Responder Modal */}
      {showAutoResponderModal && selectedUser && (
        <UserModal title="Add to Auto-Responder" onClose={() => setShowAutoResponderModal(false)}>
          <div className="rounded-lg border border-purple-500/20 bg-purple-500/10 p-4 text-center mb-4">
            <FaRobot className="mx-auto text-3xl text-purple-400 mb-2" />
            <h3 className="font-semibold break-all">{selectedUser.email}</h3>
            <p className="text-xs text-white/60">Will receive automated emails</p>
          </div>
          <select value={autoResponderForm.rule_id} onChange={(e) => setAutoResponderForm({ ...autoResponderForm, rule_id: e.target.value })} className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white text-sm mb-3">
            <option value="">Select a rule...</option>
            {autoResponderRules.map(rule => <option key={rule.id} value={rule.id}>{rule.name}</option>)}
          </select>
          <select value={autoResponderForm.event_type} onChange={(e) => setAutoResponderForm({ ...autoResponderForm, event_type: e.target.value })} className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white text-sm mb-3">
            <option value="signup">Signup</option><option value="first_trade">First Trade</option><option value="deposit">Deposit</option>
          </select>
          <input type="number" value={autoResponderForm.delay_minutes} onChange={(e) => setAutoResponderForm({ ...autoResponderForm, delay_minutes: parseInt(e.target.value) || 0 })} placeholder="Delay (minutes)" className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white text-sm mb-4" />
          <ModalActions primaryLabel="Add to Auto-Responder" onPrimary={addToAutoResponder} onCancel={() => setShowAutoResponderModal(false)} working={working} />
        </UserModal>
      )}
    </div>
  );
}