// imali/Frontend/src/pages/Billing.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BillingDashboard from "./BillingDashboard";
import CardUpdateForm from "./CardUpdateForm";
import LoadingSpinner from "../components/LoadingSpinner";

const VALID_TIERS = ["starter", "pro", "elite", "enterprise"];

function normalizeTier(value) {
  const tier = String(value || "starter").toLowerCase().trim();
  return VALID_TIERS.includes(tier) ? tier : "starter";
}

export default function Billing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [cardStatus, setCardStatus] = useState({});
  const [activation, setActivation] = useState({});
  const [showUpdateCard, setShowUpdateCard] = useState(false);
  const [error, setError] = useState("");

  const urlTier = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("tier") || params.get("plan");
  }, [location.search]);

  const tier = normalizeTier(
    urlTier ||
      location.state?.tier ||
      user?.tier ||
      activation?.tier ||
      "starter"
  );

  const realHasCard =
    cardStatus?.has_card === true ||
    cardStatus?.has_card_on_file === true ||
    activation?.has_card_on_file === true;

  const fetchJson = async (url) => {
    const response = await fetch(url, {
      credentials: "include",
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || result?.success === false) {
      throw new Error(result?.message || `Failed to load ${url}`);
    }

    return result?.data || result;
  };

  const initializeBilling = useCallback(async () => {
    if (!user) {
      navigate("/login", {
        replace: true,
        state: { from: "/billing" },
      });
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [cardData, activationData] = await Promise.allSettled([
        fetchJson("/api/billing/card-status"),
        fetchJson("/api/activation/status"),
      ]);

      if (cardData.status === "fulfilled") {
        setCardStatus(cardData.value || {});
      } else {
        setCardStatus({});
      }

      if (activationData.status === "fulfilled") {
        setActivation(activationData.value || {});
      } else {
        setActivation({});
      }

      if (location.state?.updateCard === true) {
        setShowUpdateCard(true);
      }
    } catch (err) {
      console.error("[Billing] initialize failed:", err);
      setError(err?.message || "Failed to load billing information.");
    } finally {
      setLoading(false);
    }
  }, [user, navigate, location.state?.updateCard]);

  useEffect(() => {
    initializeBilling();
  }, [initializeBilling]);

  const handleUpdateCardClick = useCallback(() => {
    setShowUpdateCard(true);

    navigate("/billing", {
      replace: true,
      state: {
        updateCard: true,
        tier: tier === "starter" ? "pro" : tier,
      },
    });
  }, [navigate, tier]);

  const handleCancelUpdate = useCallback(() => {
    setShowUpdateCard(false);

    navigate("/billing", {
      replace: true,
      state: {
        tier,
      },
    });
  }, [navigate, tier]);

  const handleCardUpdateSuccess = useCallback(async () => {
    setShowUpdateCard(false);

    await initializeBilling();

    navigate("/billing", {
      replace: true,
      state: {
        tier,
      },
    });
  }, [initializeBilling, navigate, tier]);

  const handleCardRemoved = useCallback(async () => {
    await initializeBilling();
  }, [initializeBilling]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-black">
        <LoadingSpinner
          size="large"
          color="green"
          text="Loading billing information..."
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-red-900/20 border border-red-800/50 rounded-2xl p-6 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-red-300 font-medium text-lg">Billing Error</h3>
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

  const showCardFormTier = tier === "starter" ? "pro" : tier;

  return (
    <div className="min-h-screen bg-black py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {tier === "starter" && !realHasCard && !showUpdateCard ? (
          <div className="bg-gradient-to-br from-gray-900 to-gray-950 rounded-2xl border border-gray-800 p-8 text-center">
            <div className="text-6xl mb-4">🌱</div>

            <h1 className="text-2xl font-bold text-white mb-3">
              Starter Plan
            </h1>

            <p className="text-gray-400 mb-6">
              You are on the Starter plan. No payment method is required.
            </p>

            <div className="flex justify-center gap-3 flex-wrap">
              <button
                onClick={() => navigate("/dashboard")}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
              >
                Go to Dashboard
              </button>

              <button
                onClick={() => navigate("/pricing")}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-lg font-medium transition-all"
              >
                Upgrade Plan
              </button>
            </div>
          </div>
        ) : (
          <BillingDashboard
            cardStatus={cardStatus}
            activation={activation}
            onUpdateCard={handleUpdateCardClick}
            onCardRemoved={handleCardRemoved}
            tier={tier}
          />
        )}

        {showUpdateCard && (
          <CardUpdateForm
            onSuccess={handleCardUpdateSuccess}
            onCancel={handleCancelUpdate}
            tier={showCardFormTier}
          />
        )}
      </div>
    </div>
  );
}
