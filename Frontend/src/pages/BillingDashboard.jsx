// components/Billing/BillingDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

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

  // Fetch subscription details from Stripe (if you have this endpoint)
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

  // Handle card removal - you'll need to add this endpoint
  const handleRemoveCard = async () => {
    if (!window.confirm('Are you sure you want to remove your payment method?')) {
      return;
    }

    setLoading(true);
    try {
      // You need to create this endpoint to remove the card from Stripe
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

      // Notify parent component
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

  // Get card details from your API response
  const getCardDetails = () => {
    // Your API doesn't return card details directly
    // You might need a separate endpoint for this
    // For now, we'll show minimal info
    return null;
  };

  const cardDetails = getCardDetails();

  // Handle update card
  const handleUpdateCard = () => {
    if (onUpdateCard) {
      onUpdateCard();
    }
  };

  // Render card details
  const renderCardDetails = () => {
    if (!hasCard) {
      return (
        <div className="text-sm text-gray-500">
          No payment method on file
        </div>
      );
    }

    // Since your API doesn't return card details, show generic message
    return (
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <span className="font-medium">Card on file</span>
          <span className="text-sm text-gray-500">
            (Contact support for card details)
          </span>
        </div>
        <div className="text-sm text-gray-600">
          Payment method is active
        </div>
      </div>
    );
  };

  // Render subscription info
  const renderSubscriptionInfo = () => {
    if (!subscriptionDetails) return null;

    const { status, plan, amount, currency, interval } = subscriptionDetails;

    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium mb-2">Current Plan</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Plan:</span>
            <span className="font-medium capitalize">{plan || tier}</span>
          </div>
          {amount && (
            <div className="flex justify-between">
              <span className="text-gray-600">Price:</span>
              <span className="font-medium">
                ${(amount / 100).toFixed(2)} / {interval || 'month'}
              </span>
            </div>
          )}
          {status && (
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className={`font-medium capitalize ${
                status === 'active' ? 'text-green-600' :
                status === 'past_due' ? 'text-red-600' :
                status === 'canceled' ? 'text-gray-600' :
                'text-yellow-600'
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
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-start mb-6">
        <h2 className="text-xl font-semibold">Payment Method</h2>
        <div className="flex space-x-3">
          <button
            onClick={handleUpdateCard}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            {hasCard ? 'Update Card' : 'Add Card'}
          </button>
          {hasCard && (
            <button
              onClick={handleRemoveCard}
              disabled={loading}
              className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50 text-sm"
            >
              {loading ? 'Removing...' : 'Remove Card'}
            </button>
          )}
        </div>
      </div>

      {/* Card Status */}
      <div className="mb-6">
        <div className="flex items-center space-x-2">
          <span className={`inline-block w-2 h-2 rounded-full ${
            hasCard ? 'bg-green-500' : 'bg-gray-400'
          }`} />
          <span className="font-medium">
            {hasCard ? '✅ Payment method on file' : 'No payment method on file'}
          </span>
        </div>
        {renderCardDetails()}
      </div>

      {/* Subscription Info */}
      {hasCard && renderSubscriptionInfo()}

      {/* Quick Actions */}
      {hasCard && (
        <div className="mt-6 pt-6 border-t">
          <h4 className="font-medium mb-3">Billing Actions</h4>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/billing/subscription')}
              className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded"
            >
              Manage Subscription
            </button>
            <button
              onClick={() => navigate('/billing/invoices')}
              className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded"
            >
              View Invoices
            </button>
          </div>
        </div>
      )}

      {/* Debug info - remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-6 pt-6 border-t">
          <details className="text-xs text-gray-500">
            <summary>Debug Information</summary>
            <pre className="mt-2 p-2 bg-gray-50 rounded overflow-auto">
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
