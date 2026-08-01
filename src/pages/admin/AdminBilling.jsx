// Frontend/src/pages/admin/AdminBilling.jsx
import React, { useState, useEffect } from 'react';
import { 
  FaCreditCard, FaHistory, FaDownload, FaEye, FaPlus,
  FaSpinner, FaCheck, FaTimes, FaCalendar, FaDollarSign,
  FaFileInvoice, FaPrint, FaSync, FaBan, FaUnlock
} from 'react-icons/fa';
import BotAPI from '../../utils/BotAPI';

const AdminBilling = () => {
  const [subscription, setSubscription] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    const fetchBilling = async () => {
      try {
        const [sub, billing] = await Promise.all([
          BotAPI.getSubscriptionDetails(),
          BotAPI.getBillingSummary(),
        ]);
        setSubscription(sub);
        setInvoices(billing?.invoices || []);
        setPaymentMethods(billing?.paymentMethods || [
          { id: '1', brand: 'Visa', last4: '4242', expMonth: '12', expYear: '2026', isDefault: true },
          { id: '2', brand: 'Mastercard', last4: '8888', expMonth: '08', expYear: '2025', isDefault: false },
        ]);
      } catch (error) {
        console.error('Failed to fetch billing:', error);
        setSubscription({ 
          plan: 'Business', 
          status: 'active', 
          nextBilling: '2026-02-15',
          amount: 99,
          billingPeriod: 'monthly',
          trialEnd: null
        });
        setInvoices([
          { id: 'inv_001', date: '2026-01-15', amount: 99.00, status: 'paid', description: 'Business Plan - January 2026' },
          { id: 'inv_002', date: '2025-12-15', amount: 99.00, status: 'paid', description: 'Business Plan - December 2025' },
          { id: 'inv_003', date: '2025-11-15', amount: 99.00, status: 'paid', description: 'Business Plan - November 2025' },
          { id: 'inv_004', date: '2025-10-15', amount: 99.00, status: 'pending', description: 'Business Plan - October 2025' },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchBilling();
  }, []);

  const handlePaymentAction = async (action) => {
    setActionLoading(prev => ({ ...prev, [action]: true }));
    try {
      // if (action === 'update') await BotAPI.updatePaymentMethod();
      // if (action === 'cancel') await BotAPI.cancelSubscription();
      // if (action === 'reactivate') await BotAPI.reactivateSubscription();
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Failed to ${action}:`, error);
    } finally {
      setActionLoading(prev => ({ ...prev, [action]: false }));
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      active: { color: 'bg-emerald-500/20 text-emerald-400', icon: <FaCheck className="inline mr-1" /> },
      pending: { color: 'bg-amber-500/20 text-amber-400', icon: <FaSpinner className="inline mr-1 animate-spin" /> },
      canceled: { color: 'bg-red-500/20 text-red-400', icon: <FaTimes className="inline mr-1" /> },
      paid: { color: 'bg-emerald-500/20 text-emerald-400', icon: <FaCheck className="inline mr-1" /> },
      unpaid: { color: 'bg-red-500/20 text-red-400', icon: <FaTimes className="inline mr-1" /> },
    };
    const s = map[status] || map.pending;
    return <span className={`px-2 py-0.5 rounded-full text-xs ${s.color}`}>{s.icon} {status || 'pending'}</span>;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Billing & Subscriptions</h2>
          <p className="text-sm text-white/40">Manage your payment methods and billing history</p>
        </div>
        <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition flex items-center gap-2">
          <FaSync /> Refresh
        </button>
      </div>

      {/* Current Plan */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-2xl font-bold">{subscription?.plan || 'Professional'}</h3>
              {getStatusBadge(subscription?.status)}
            </div>
            <p className="text-white/40 mt-1">
              ${subscription?.amount || 0}/month • Next billing: {formatDate(subscription?.nextBilling)}
            </p>
            {subscription?.trialEnd && (
              <p className="text-sm text-amber-400">Trial ends: {formatDate(subscription.trialEnd)}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-3 mt-4 md:mt-0">
            <button 
              onClick={() => setShowPaymentModal(true)}
              className="px-4 py-2 bg-purple-600 rounded-lg text-sm hover:bg-purple-500 transition flex items-center gap-2"
            >
              <FaCreditCard /> Update Payment
            </button>
            {subscription?.status === 'active' ? (
              <button 
                onClick={() => handlePaymentAction('cancel')}
                disabled={actionLoading.cancel}
                className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 hover:bg-red-500/20 transition flex items-center gap-2"
              >
                {actionLoading.cancel ? <FaSpinner className="animate-spin" /> : <FaBan />}
                Cancel Subscription
              </button>
            ) : (
              <button 
                onClick={() => handlePaymentAction('reactivate')}
                disabled={actionLoading.reactivate}
                className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-400 hover:bg-emerald-500/20 transition flex items-center gap-2"
              >
                {actionLoading.reactivate ? <FaSpinner className="animate-spin" /> : <FaUnlock />}
                Reactivate
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <FaCreditCard /> Payment Methods
        </h3>
        <div className="space-y-3">
          {paymentMethods.map((method) => (
            <div key={method.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <FaCreditCard className="text-purple-400" />
                </div>
                <div>
                  <p className="font-medium">{method.brand} •••• {method.last4}</p>
                  <p className="text-sm text-white/40">Expires {method.expMonth}/{method.expYear}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {method.isDefault && (
                  <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">Default</span>
                )}
                <button className="text-sm text-white/40 hover:text-white transition">Edit</button>
                <button className="text-sm text-red-400/60 hover:text-red-400 transition">Remove</button>
              </div>
            </div>
          ))}
          <button className="w-full p-3 border border-dashed border-white/10 rounded-lg text-sm text-white/40 hover:text-white hover:border-white/20 transition flex items-center justify-center gap-2">
            <FaPlus /> Add Payment Method
          </button>
        </div>
      </div>

      {/* Invoice History */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <FaHistory /> Invoice History
          </h3>
          <span className="text-sm text-white/40">{invoices.length} invoices</span>
        </div>
        <div className="divide-y divide-white/5">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-white/5 transition">
              <div>
                <p className="font-medium">{invoice.description || invoice.id}</p>
                <div className="flex items-center gap-3 text-sm text-white/40">
                  <span>{formatDate(invoice.date)}</span>
                  <span>•</span>
                  <span>${invoice.amount.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {getStatusBadge(invoice.status)}
                <button className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition" title="Download">
                  <FaDownload />
                </button>
                <button className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition" title="Print">
                  <FaPrint />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-gray-950 p-6">
            <h3 className="text-xl font-bold mb-4">Update Payment Method</h3>
            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <div className="text-4xl mb-2">💳</div>
                <p className="text-sm text-white/40">Secure payment information will be collected</p>
                <p className="text-xs text-white/30 mt-2">Powered by Stripe</p>
              </div>
              <button className="w-full px-4 py-3 bg-purple-600 rounded-lg text-sm hover:bg-purple-500 transition flex items-center justify-center gap-2">
                <FaCreditCard /> Add Credit Card
              </button>
              <button className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition flex items-center justify-center gap-2">
                <FaDollarSign /> Connect Bank Account
              </button>
            </div>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBilling;
