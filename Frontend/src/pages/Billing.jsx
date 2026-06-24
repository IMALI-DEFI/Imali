// imali/Frontend/src/pages/Billing.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BillingDashboard from "./BillingDashboard";
import CardUpdateForm from "./CardUpdateForm";
import LoadingSpinner from "../components/LoadingSpinner";

const Billing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [loading, setLoading] = useState(true);
  const [hasCard, setHasCard] = useState(false);
  const [cardStatus, setCardStatus] = useState(null);
  const [activation, setActivation] = useState(null);
  const [showUpdateCard, setShowUpdateCard] = useState(false);
  const [error, setError] = useState(null);
  const [tier, setTier] = useState(null);

  // Fetch card status
  const fetchCardStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/billing/card-status', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch card status');
      const result = await response.json();
      
      if (result.success) {
        setCardStatus(result.data);
        return result.data;
      }
      return null;
    } catch (err) {
      console.error('Error fetching card status:', err);
      setError('Unable to load payment information');
      return null;
    }
  }, []);

  // Fetch activation status
  const fetchActivationStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/activation/status', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch activation status');
      const result = await response.json();
      if (result.success) {
        setActivation(result.data);
        return result.data;
      }
      return null;
    } catch (err) {
      console.error('Error fetching activation status:', err);
      return null;
    }
  }, []);

  // CRITICAL FIX: Check if card exists using ONLY has_card
  const checkCardExists = useCallback((cardData) => {
    return !!(cardData?.has_card);
  }, []);

  // Initialize billing page
  const initializeBilling = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const cardData = await fetchCardStatus();
      const activationData = await fetchActivationStatus();

      const currentTier = user?.tier || activationData?.tier || 'starter';
      setTier(currentTier);

      const hasValidCard = checkCardExists(cardData);
      setHasCard(hasValidCard);

      if (location.state?.updateCard) {
        setShowUpdateCard(true);
      }

    } catch (err) {
      console.error('Error initializing billing:', err);
      setError('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  }, [user, location.state, fetchCardStatus, fetchActivationStatus, checkCardExists]);

  // Handle card update success
  const handleCardUpdateSuccess = useCallback(async () => {
    setShowUpdateCard(false);
    await initializeBilling();
    navigate('/billing', { replace: true, state: {} });
  }, [initializeBilling, navigate]);

  // Handle card removal
  const handleCardRemoved = useCallback(async () => {
    await initializeBilling();
  }, [initializeBilling]);

  // Handle update card click
  const handleUpdateCardClick = useCallback(() => {
    setShowUpdateCard(true);
  }, []);

  // Handle cancel update
  const handleCancelUpdate = useCallback(() => {
    setShowUpdateCard(false);
    navigate('/billing', { replace: true, state: {} });
  }, [navigate]);

  // Initialize on mount
  useEffect(() => {
    initializeBilling();
  }, [initializeBilling]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-black">
        <LoadingSpinner size="large" color="green" text="Loading billing information..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-red-900/20 border border-red-800/50 rounded-2xl p-6 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-red-300 font-medium text-lg">Error</h3>
          <p className="text-red-300/70 mt-2">{error}</p>
          <button
            onClick={initializeBilling}
            className="mt-4 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Enterprise tier
  if (tier === 'enterprise') {
    return (
      <div className="min-h-screen bg-black py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <BillingDashboard
            hasCard={hasCard}
            cardStatus={cardStatus}
            activation={activation}
            onUpdateCard={handleUpdateCardClick}
            onCardRemoved={handleCardRemoved}
            tier={tier}
          />
          
          {showUpdateCard && (
            <div className="mt-6">
              <CardUpdateForm
                onSuccess={handleCardUpdateSuccess}
                onCancel={handleCancelUpdate}
                tier={tier}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Starter tier
  if (tier === 'starter') {
    return (
      <div className="min-h-screen bg-black py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-gray-900 to-gray-950 rounded-2xl border border-gray-800 p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Billing</h2>
            <p className="text-gray-400 mb-6">
              You're on the Starter plan. No payment required.
            </p>
            
            {hasCard ? (
              <BillingDashboard
                hasCard={hasCard}
                cardStatus={cardStatus}
                activation={activation}
                onUpdateCard={handleUpdateCardClick}
                onCardRemoved={handleCardRemoved}
                tier={tier}
              />
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">💳</div>
                <p className="text-gray-400 mb-4">
                  No payment method on file. Upgrade to Pro or Elite for live trading.
                </p>
                <button
                  onClick={() => navigate('/pricing')}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-lg font-medium transition-all shadow-lg"
                >
                  View Plans
                </button>
              </div>
            )}
            
            {showUpdateCard && (
              <div className="mt-6 border-t border-gray-700 pt-6">
                <CardUpdateForm
                  onSuccess={handleCardUpdateSuccess}
                  onCancel={handleCancelUpdate}
                  tier={tier}
                />
              </div>
            )}

            {!showUpdateCard && hasCard && (
              <div className="mt-6 border-t border-gray-700 pt-6">
                <button
                  onClick={handleUpdateCardClick}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Update Payment Method
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default Billing;
