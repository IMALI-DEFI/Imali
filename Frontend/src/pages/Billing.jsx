// imali/Frontend/src/pages/Billing.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BillingDashboard from "./BillingDashboard"; // ✅ Correct path - in pages
import CardUpdateForm from "./CardUpdateForm"; // ✅ Correct path - in pages
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

  // Fetch card status from your API
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
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error</h3>
          <p className="text-red-600">{error}</p>
          <button
            onClick={initializeBilling}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // For enterprise users
  if (tier === 'enterprise') {
    return (
      <div className="max-w-6xl mx-auto p-6">
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
    );
  }

  // Starter tier
  if (tier === 'starter') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Billing</h2>
          
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
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">
                No payment method on file. Please add a card to continue.
              </p>
            </div>
          )}
          
          {showUpdateCard && (
            <div className="mt-6 border-t pt-6">
              <CardUpdateForm
                onSuccess={handleCardUpdateSuccess}
                onCancel={handleCancelUpdate}
                tier={tier}
              />
            </div>
          )}

          {!showUpdateCard && hasCard && (
            <div className="mt-6 border-t pt-6">
              <button
                onClick={handleUpdateCardClick}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Update Payment Method
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default Billing;
