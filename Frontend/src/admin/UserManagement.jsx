// src/admin/UserManagement.jsx - REWRITTEN (Mobile-first, shows all users, correct counts)
import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  FaBan, FaCheckCircle, FaEdit, FaEnvelope, FaExclamationTriangle,
  FaEye, FaKey, FaLock, FaPlus, FaSave, FaSearch, FaSpinner,
  FaTimes, FaTrash, FaUserPlus, FaEnvelopeOpenText, FaRobot,
  FaPlug, FaUsers, FaChevronLeft, FaChevronRight,
  FaSquare, FaCheckSquare, FaBuilding, FaUserTag,
} from "react-icons/fa";

const TOKEN_KEY = "imali_token";
const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";

const TIERS = ["starter", "pro", "elite", "enterprise"];
const STRATEGIES = [
  { value: "mean_reversion", label: "Conservative" },
  { value: "ai_weighted", label: "Balanced AI" },
  { value: "momentum", label: "Growth" },
  { value: "aggressive", label: "Aggressive" },
];

// ========== HELPERS ==========
const getToken = () => localStorage.getItem(TOKEN_KEY) || "";
const fmt = (v) => (v === null || v === undefined ? "—" : String(v));
const fmt$ = (v) => { const n = Number(v); return isNaN(n) ? "$0.00" : `$${n.toFixed(2)}`; };
const fmtDate = (v) => { if (!v) return "—"; try { return new Date(v).toLocaleDateString(); } catch { return "—"; } };
const fmtBool = (v) => v === true || v === "true" || v === 1 || v === "1";

const tierBadge = (tier) => {
  const s = { starter: "bg-blue-500/20 text-blue-300", pro: "bg-emerald-500/20 text-emerald-300", elite: "bg-purple-500/20 text-purple-300", enterprise: "bg-amber-500/20 text-amber-300" };
  return s[fmt(tier).toLowerCase()] || s.starter;
};

// ========== MAIN COMPONENT ==========
export default function UserManagement({ apiBase, showToast }) {
  const base = apiBase || API_BASE;
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectedUser, setSelectedUser] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showView, setShowView] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [addForm, setAddForm] = useState({ email: "", password: "", tier: "starter", strategy: "ai_weighted" });
  const [editForm, setEditForm] = useState({});

  const toast = (msg, type = "info") => { if (showToast) showToast(msg, type); else console.log(`[${type}]`, msg); };

  const api = useCallback(async (path, opts = {}) => {
    const token = getToken();
    const res = await fetch(`${base}${path}`, { ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers || {}) } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) throw new Error(data.error || data.message || `Error ${res.status}`);
    return data;
  }, [base]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search.trim()) params.set("search", search.trim());
      const data = await api(`/api/admin/users?${params}`);
      const raw = data.data?.users || [];
      setUsers(raw.map(u => ({
        id: u.id, email: fmt(u.email), tier: fmt(u.tier, "starter"), strategy: fmt(u.strategy, "ai_weighted"),
        trading_enabled: fmtBool(u.trading_enabled), paper_trading_enabled: fmtBool(u.paper_trading_enabled),
        is_admin: fmtBool(u.is_admin), billing_complete: fmtBool(u.billing_complete),
        okx_connected: fmtBool(u.okx_connected), alpaca_connected: fmtBool(u.alpaca_connected),
        created_at: u.created_at, organization_role: u.organization_role || null,
      })));
      setTotalPages(data.data?.pagination?.totalPages || 1);
      setTotalUsers(data.data?.pagination?.total || data.data?.total || raw.length);
    } catch (e) { toast(e.message, "error"); }
    finally { setLoading(false); }
  }, [api, limit, page, search, toast]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const summary = useMemo(() => ({
    total: totalUsers,
    trading: users.filter(u => u.trading_enabled).length,
    admins: users.filter(u => u.is_admin).length,
    enterprise: users.filter(u => u.tier === "enterprise").length,
    billing: users.filter(u => u.billing_complete).length,
  }), [users, totalUsers]);

  const toggleSelect = (id) => setSelectedIds(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelectedIds(selectedIds.size === users.length ? new Set() : new Set(users.map(u => u.id)));

  const createUser = async () => {
    if (!addForm.email.includes("@") || !addForm.password || addForm.password.length < 8) { toast("Valid email and 8+ char password required", "error"); return; }
    setWorking(true);
    try { await api("/api/admin/users", { method: "POST", body: JSON.stringify(addForm) }); toast("Created", "success"); setShowAdd(false); fetchUsers(); }
    catch (e) { toast(e.message, "error"); }
    finally { setWorking(false); }
  };

  const updateUser = async () => {
    setWorking(true);
    try { await api(`/api/admin/users/${selectedUser.id}`, { method: "PUT", body: JSON.stringify(editForm) }); toast("Updated", "success"); setShowEdit(false); fetchUsers(); }
    catch (e) { toast(e.message, "error"); }
    finally { setWorking(false); }
  };

  const deleteUser = async () => {
    if (!window.confirm(`PERMANENTLY DELETE ${selectedUser.email}? This cannot be undone.`)) return;
    setWorking(true);
    try { await api(`/api/admin/users/${selectedUser.id}?permanent=true`, { method: "DELETE" }); toast("Deleted", "success"); setShowDelete(false); setShowEdit(false); fetchUsers(); }
    catch (e) { toast(e.message, "error"); }
    finally { setWorking(false); }
  };

  const bulkDelete = async () => {
    const ids = [...selectedIds];
    if (!ids.length || !window.confirm(`PERMANENTLY DELETE ${ids.length} users?`)) return;
    setWorking(true);
    let ok = 0;
    for (const id of ids) { try { await api(`/api/admin/users/${id}?permanent=true`, { method: "DELETE" }); ok++; } catch {} }
    toast(`Deleted ${ok}/${ids.length}`, ok === ids.length ? "success" : "error");
    setSelectedIds(new Set());
    fetchUsers();
    setWorking(false);
  };

  const toggleTrading = async (u) => {
    setWorking(true);
    try { await api(`/api/admin/users/${u.id}`, { method: "PUT", body: JSON.stringify({ trading_enabled: !u.trading_enabled }) }); fetchUsers(); }
    catch (e) { toast(e.message, "error"); }
    finally { setWorking(false); }
  };

  // ========== RENDER ==========
  if (loading && !users.length) return <div className="flex justify-center py-16"><FaSpinner className="animate-spin text-3xl text-emerald-400" /></div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-lg font-bold mb-1">User Management</h2>
        <p className="text-xs text-white/50 mb-3">{totalUsers} total users · {summary.trading} trading · {summary.admins} admins · {summary.enterprise} enterprise</p>

        <form onSubmit={e => { e.preventDefault(); setPage(1); fetchUsers(); }} className="flex gap-2 mb-2">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by email..." className="w-full rounded-lg border border-white/10 bg-black/40 py-2 pl-9 pr-3 text-sm text-white" />
          </div>
          <button type="submit" className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold">Search</button>
        </form>

        <div className="flex gap-2 flex-wrap">
          <button onClick={() => { setAddForm({ email: "", password: "", tier: "starter", strategy: "ai_weighted" }); setShowAdd(true); }} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold"><FaUserPlus /> Add</button>
          {selectedIds.size > 0 && (
            <button onClick={bulkDelete} className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold"><FaTrash /> Delete ({selectedIds.size})</button>
          )}
          {users.length > 0 && (
            <button onClick={toggleAll} className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60">
              {selectedIds.size === users.length ? <FaCheckSquare className="text-emerald-400" /> : <FaSquare />}
              {selectedIds.size === users.length ? "Deselect All" : "Select All"}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="block lg:hidden space-y-3">
        {users.map(u => (
          <div key={u.id} className={`rounded-xl border p-3 ${selectedIds.has(u.id) ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-white/10 bg-white/5'}`}>
            <div className="flex items-center justify-between mb-2">
              <button onClick={() => toggleSelect(u.id)} className="flex items-center gap-2 text-sm">
                {selectedIds.has(u.id) ? <FaCheckSquare className="text-emerald-400" /> : <FaSquare className="text-white/40" />}
                <span className="font-semibold text-sm truncate max-w-[180px]">{u.email}</span>
              </button>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${tierBadge(u.tier)}`}>{u.tier}</span>
            </div>
            <div className="flex justify-between text-xs text-white/50 mb-2">
              <span>OKX: {u.okx_connected ? "✅" : "✗"}</span>
              <span>Alpaca: {u.alpaca_connected ? "✅" : "✗"}</span>
              <span>Billing: {u.billing_complete ? "✅" : "✗"}</span>
              <span>Trading: {u.trading_enabled ? "✅" : "✗"}</span>
            </div>
            <div className="flex gap-1 flex-wrap">
              <button onClick={() => { setSelectedUser(u); setShowView(true); }} className="text-xs px-2 py-1 rounded bg-white/10"><FaEye className="inline mr-1" />View</button>
              <button onClick={() => { setSelectedUser(u); setEditForm({ email: u.email, tier: u.tier, strategy: u.strategy, trading_enabled: u.trading_enabled, is_admin: u.is_admin }); setShowEdit(true); }} className="text-xs px-2 py-1 rounded bg-white/10"><FaEdit className="inline mr-1" />Edit</button>
              <button onClick={() => toggleTrading(u)} className="text-xs px-2 py-1 rounded bg-white/10">{u.trading_enabled ? <FaBan className="inline mr-1" /> : <FaCheckCircle className="inline mr-1" />}{u.trading_enabled ? "Disable" : "Enable"}</button>
            </div>
          </div>
        ))}
        {!users.length && <div className="text-center py-8 text-white/40">No users found</div>}
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-white/50">
            <tr>
              <th className="p-3 w-10"><button onClick={toggleAll}>{selectedIds.size === users.length ? <FaCheckSquare className="text-emerald-400" /> : <FaSquare className="text-white/30" />}</button></th>
              <th className="p-3">Email</th>
              <th className="p-3">Tier</th>
              <th className="p-3">OKX</th>
              <th className="p-3">Alpaca</th>
              <th className="p-3">Billing</th>
              <th className="p-3">Trading</th>
              <th className="p-3">Admin</th>
              <th className="p-3">Joined</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map(u => (
              <tr key={u.id} className={`hover:bg-white/5 ${selectedIds.has(u.id) ? 'bg-emerald-500/10' : ''}`}>
                <td className="p-3"><button onClick={() => toggleSelect(u.id)}>{selectedIds.has(u.id) ? <FaCheckSquare className="text-emerald-400" /> : <FaSquare className="text-white/30" />}</button></td>
                <td className="p-3 font-medium max-w-[200px] truncate">{u.email}</td>
                <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full ${tierBadge(u.tier)}`}>{u.tier}</span></td>
                <td className="p-3">{u.okx_connected ? "✅" : "—"}</td>
                <td className="p-3">{u.alpaca_connected ? "✅" : "—"}</td>
                <td className="p-3">{u.billing_complete ? "✅" : "—"}</td>
                <td className="p-3">{u.trading_enabled ? <span className="text-emerald-400">On</span> : <span className="text-red-400">Off</span>}</td>
                <td className="p-3">{u.is_admin ? "👑" : "—"}</td>
                <td className="p-3 text-xs">{fmtDate(u.created_at)}</td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <button onClick={() => { setSelectedUser(u); setShowView(true); }} className="p-1.5 rounded hover:bg-white/10"><FaEye className="text-blue-400 text-xs" /></button>
                    <button onClick={() => { setSelectedUser(u); setEditForm({ email: u.email, tier: u.tier, strategy: u.strategy, trading_enabled: u.trading_enabled, is_admin: u.is_admin }); setShowEdit(true); }} className="p-1.5 rounded hover:bg-white/10"><FaEdit className="text-amber-400 text-xs" /></button>
                    <button onClick={() => toggleTrading(u)} className="p-1.5 rounded hover:bg-white/10">{u.trading_enabled ? <FaBan className="text-red-400 text-xs" /> : <FaCheckCircle className="text-emerald-400 text-xs" />}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!users.length && <div className="text-center py-8 text-white/40">No users found</div>}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-sm disabled:opacity-30"><FaChevronLeft /> Prev</button>
          <span className="text-xs text-white/50">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-sm disabled:opacity-30">Next <FaChevronRight /></button>
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <Modal title="Add User" onClose={() => setShowAdd(false)}>
          <Field label="Email"><input type="email" value={addForm.email} onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))} className="input" /></Field>
          <Field label="Password"><input type="password" value={addForm.password} onChange={e => setAddForm(p => ({ ...p, password: e.target.value }))} className="input" /></Field>
          <Field label="Tier"><select value={addForm.tier} onChange={e => setAddForm(p => ({ ...p, tier: e.target.value }))} className="input">{TIERS.map(t => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Strategy"><select value={addForm.strategy} onChange={e => setAddForm(p => ({ ...p, strategy: e.target.value }))} className="input">{STRATEGIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></Field>
          <div className="flex gap-3 mt-4">
            <button onClick={createUser} disabled={working} className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-semibold">{working ? <FaSpinner className="animate-spin inline mr-2" /> : <FaSave className="inline mr-2" />}Create</button>
            <button onClick={() => setShowAdd(false)} className="flex-1 rounded-lg border border-white/10 py-2 text-sm">Cancel</button>
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      {showEdit && selectedUser && (
        <Modal title="Edit User" onClose={() => setShowEdit(false)}>
          <Field label="Email"><input type="email" value={editForm.email || ""} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} className="input" /></Field>
          <Field label="Tier"><select value={editForm.tier || "starter"} onChange={e => setEditForm(p => ({ ...p, tier: e.target.value }))} className="input">{TIERS.map(t => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Strategy"><select value={editForm.strategy || "ai_weighted"} onChange={e => setEditForm(p => ({ ...p, strategy: e.target.value }))} className="input">{STRATEGIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></Field>
          <Toggle label="Trading Enabled" value={editForm.trading_enabled} onChange={() => setEditForm(p => ({ ...p, trading_enabled: !p.trading_enabled }))} />
          <Toggle label="Admin" value={editForm.is_admin} onChange={() => setEditForm(p => ({ ...p, is_admin: !p.is_admin }))} />
          <div className="flex gap-3 mt-4">
            <button onClick={updateUser} disabled={working} className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-semibold">{working ? <FaSpinner className="animate-spin inline mr-2" /> : <FaSave className="inline mr-2" />}Save</button>
            <button onClick={() => setShowDelete(true)} className="rounded-lg bg-red-600 px-3 py-2 text-sm">Delete</button>
          </div>
          {showDelete && (
            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
              <p className="text-sm text-red-300 mb-2">Permanently delete {selectedUser.email}?</p>
              <div className="flex gap-2">
                <button onClick={deleteUser} disabled={working} className="flex-1 rounded bg-red-600 py-1.5 text-sm">Yes, Delete</button>
                <button onClick={() => setShowDelete(false)} className="flex-1 rounded border border-white/10 py-1.5 text-sm">Cancel</button>
              </div>
            </div>
          )}
        </Modal>
      )}

      <style>{`.input { width: 100%; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.4); padding: 0.5rem 0.75rem; color: white; font-size: 0.875rem; outline: none; } .input:focus { border-color: rgba(16,185,129,0.65); }`}</style>
    </div>
  );
}

// ========== SUBCOMPONENTS ==========
function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[85vh] overflow-y-auto w-full max-w-md rounded-2xl border border-white/10 bg-gray-900 p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="text-white/50 hover:text-white"><FaTimes /></button>
        </div>
        <div className="space-y-3">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <label className="block"><div className="mb-1 text-sm text-white/60">{label}</div>{children}</label>;
}

function Toggle({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/30 p-3">
      <span className="text-sm text-white/70">{label}</span>
      <button onClick={onChange} className={`relative inline-flex h-6 w-11 rounded-full transition ${value ? "bg-emerald-600" : "bg-gray-600"}`}>
        <span className={`absolute h-4 w-4 rounded-full bg-white transition ${value ? "right-1" : "left-1"}`} />
      </button>
    </div>
  );
}
