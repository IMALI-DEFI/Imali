// imali/Frontend/src/pages/CardUpdateForm.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const CardUpdateForm = ({ onSuccess, onCancel, tier }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [setupIntentId, setSetupIntentId] = useState(null);
  const stripeRef = useRef(null);
  const elementsRef = useRef(null);
  const cardElementRef = useRef(null);

  // Load Stripe.js
  useEffect(() => {
    if (window.Stripe) {
      stripeRef.current = window.Stripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);
    } else {
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.onload = () => {
        stripeRef.current = window.Stripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);
      };
      document.body.appendChild(script);
    }
  }, []);

  // Create setup intent
  useEffect(() => {
    if (!stripeRef.current) return;

    const createSetupIntent = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/billing/setup-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            email: user?.email,
            tier: tier || user?.tier
          }),
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || 'Failed to create setup intent');
        }

        setClientSecret(result.data.client_secret);
        setSetupIntentId(result.data.setup_intent_id);

        const elements = stripeRef.current.elements({
          clientSecret: result.data.client_secret,
        });

        const cardElement = elements.create('card', {
          style: {
            base: {
              fontSize: '16px',
              color: '#e5e7eb',
              '::placeholder': {
                color: '#6b7280',
              },
              backgroundColor: 'transparent',
            },
          },
        });

        cardElement.mount('#card-element');
        cardElementRef.current = cardElement;
        elementsRef.current = elements;

      } catch (err) {
        console.error('Error creating setup intent:', err);
        setError(err.message || 'Failed to initialize payment form');
      } finally {
        setLoading(false);
      }
    };

    createSetupIntent();

    return () => {
      if (cardElementRef.current) {
        cardElementRef.current.destroy();
      }
      if (elementsRef.current) {
        elementsRef.current = null;
      }
    };
  }, [user, tier]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripeRef.current || !cardElementRef.current || !clientSecret) {
      setError('Payment system not ready');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: stripeError, setupIntent } = await stripeRef.current.confirmSetup({
        elements: elementsRef.current,
        clientSecret: clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/billing?setup_success=true`,
        },
        redirect: 'if_required',
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (setupIntent.status === 'succeeded') {
        const confirmResponse = await fetch('/api/billing/confirm-card', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            setup_intent_id: setupIntent.id,
          }),
        });

        const confirmResult = await confirmResponse.json();
        if (!confirmResult.success) {
          throw new Error(confirmResult.error || 'Failed to confirm card');
        }

        if (onSuccess) {
          onSuccess();
        }
      } else {
        throw new Error('Setup intent not successful');
      }

    } catch (err) {
      console.error('Error confirming card:', err);
      setError(err.message || 'Failed to save card');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-950 rounded-2xl border border-gray-800 p-6 max-w-md mx-auto">
      <h3 className="text-xl font-semibold text-white mb-4">
        {tier === 'starter' ? 'Add Payment Method' : 'Update Payment Method'}
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div id="card-element" className="py-2 text-white">
            {/* Stripe card element will be mounted here */}
          </div>
          <div className="text-xs text-gray-500 mt-2 flex items-center gap-2">
            <span>🔒</span>
            Secure payment powered by Stripe
          </div>
        </div>

        {error && (
          <div className="text-red-400 text-sm bg-red-900/20 border border-red-800/50 p-3 rounded-lg">
            ⚠️ {error}
          </div>
        )}

        <div className="flex space-x-3">
          <button
            type="submit"
            disabled={loading || !clientSecret}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 shadow-lg"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              'Save Card'
            )}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg font-medium transition-all disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default CardUpdateForm;
