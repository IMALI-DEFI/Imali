// imali/Frontend/src/pages/BillingDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const BillingDashboard = ({
  hasCard,
  cardStatus,
  activation,
  onUpdateCard,
  onCardRemoved,
  tier
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [subscriptionDetails, setSubscriptionDetails] = useState(null);

  // Fetch subscription details
  useEffect(() => {
    const fetchSubscriptionDetails = async () => {
      if (!hasCard) return;
      
      try {
        const response = await fetch('/api/billing/subscription', {
          credentials: 'include'
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setSubscriptionDetails(result.data);
          }
        }
      } catch (err) {
        console.error('Error fetching subscription details:', err);
      }
    };

    fetchSubscriptionDetails();
  }, [hasCard]);

  // Handle card removal
  const handleRemoveCard = async () => {
    if (!window.confirm('Are you sure you want to remove your payment method?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/billing/remove-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to remove card');
      }

      if (onCardRemoved) {
        await onCardRemoved();
      }

      alert('Payment method removed successfully');

    } catch (err) {
      console.error('Error removing card:', err);
      alert('Failed to remove payment method. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle update card
  const handleUpdateCard = () => {
    if (onUpdateCard) {
      onUpdateCard();
    }
  };

  // Render subscription info
  const renderSubscriptionInfo = () => {
    if (!subscriptionDetails) return null;

    const { status, plan, amount, currency, interval } = subscriptionDetails;

    return (
      <div className="mt-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
        <h4 className="font-medium mb-2 text-white">Current Plan</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Plan:</span>
            <span className="font-medium capitalize text-white">{plan || tier}</span>
          </div>
          {amount && (
            <div className="flex justify-between">
              <span className="text-gray-400">Price:</span>
              <span className="font-medium text-white">
                ${(amount / 100).toFixed(2)} / {interval || 'month'}
              </span>
            </div>
          )}
          {status && (
            <div className="flex justify-between">
              <span className="text-gray-400">Status:</span>
              <span className={`font-medium capitalize ${
                status === 'active' ? 'text-green-400' :
                status === 'past_due' ? 'text-red-400' :
                status === 'canceled' ? 'text-gray-400' :
                'text-yellow-400'
              }`}>
                {status.replace('_', ' ')}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-950 rounded-2xl border border-gray-800 p-6 shadow-xl">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">💳 Payment Method</h2>
          <p className="text-sm text-gray-400 mt-1">
            {tier === 'starter' ? 'Free tier - no payment required' : `${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan`}
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleUpdateCard}
            disabled={loading}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 text-sm shadow-lg"
          >
            {hasCard ? 'Update Card' : 'Add Card'}
          </button>
          {hasCard && tier !== 'starter' && (
            <button
              onClick={handleRemoveCard}
              disabled={loading}
              className="px-4 py-2 bg-red-900/50 hover:bg-red-800/50 text-red-300 rounded-lg font-medium transition-all disabled:opacity-50 text-sm border border-red-800/50"
            >
              {loading ? 'Removing...' : 'Remove Card'}
            </button>
          )}
        </div>
      </div>

      {/* Card Status */}
      <div className="mb-6 p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
        <div className="flex items-center space-x-3">
          <span className={`inline-block w-3 h-3 rounded-full ${
            hasCard ? 'bg-green-500 shadow-lg shadow-green-500/30' : 'bg-gray-500'
          }`} />
          <span className="font-medium text-white">
            {hasCard ? '✅ Payment method on file' : 'No payment method on file'}
          </span>
        </div>
        
        {hasCard ? (
          <div className="mt-3 text-sm text-gray-300">
            <p>Your card is active and ready for use.</p>
            {cardStatus?.billing_complete && (
              <p className="text-green-400 text-xs mt-1">✓ Billing setup complete</p>
            )}
          </div>
        ) : (
          <div className="mt-3 text-sm text-gray-400">
            <p>Add a payment method to start your subscription.</p>
          </div>
        )}
      </div>

      {/* Subscription Info */}
      {hasCard && renderSubscriptionInfo()}

      {/* Quick Actions */}
      {hasCard && (
        <div className="mt-6 pt-6 border-t border-gray-700/50">
          <h4 className="font-medium mb-3 text-white">Billing Actions</h4>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/billing/subscription')}
              className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors border border-gray-700"
            >
              Manage Subscription
            </button>
            <button
              onClick={() => navigate('/billing/invoices')}
              className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors border border-gray-700"
            >
              View Invoices
            </button>
          </div>
        </div>
      )}

      {/* Debug info - remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-6 pt-6 border-t border-gray-700/50">
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer hover:text-gray-400">Debug Information</summary>
            <pre className="mt-2 p-3 bg-black/50 rounded-lg overflow-auto text-gray-400">
              {JSON.stringify({
                hasCard,
                tier,
                cardStatus,
                activation: {
                  has_card_on_file: activation?.has_card_on_file,
                  billing_complete: activation?.billing_complete,
                  tier: activation?.tier
                },
                userTier: user?.tier
              }, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};

export default BillingDashboard;
