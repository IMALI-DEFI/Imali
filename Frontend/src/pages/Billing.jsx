// src/pages/Billing.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { createSetupIntent } from "../utils/billingApi";
import BotAPI from "../utils/BotAPI";

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

function BillingInner() {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!stripe || !elements) return;

    setBusy(true);
    setError("");
    
    try {
      const { error: setupError, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: { 
          return_url: `${window.location.origin}/activation` 
        },
        redirect: "if_required",
      });
      
      if (setupError) throw setupError;
      
      // Success - navigate to activation
      navigate("/activation", { 
        replace: true,
        state: { setupComplete: true }
      });
    } catch (e) {
      console.error('Billing setup error:', e);
      setError(e.message || "Failed to save payment method");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-200 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      
      <PaymentElement />
      
      <button 
        onClick={submit} 
        disabled={busy || !stripe || !elements} 
        className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busy ? "Saving…" : "Save Payment Method"}
      </button>
    </div>
  );
}

export default function Billing() {
  const location = useLocation();
  const navigate = useNavigate();

  const email = location.state?.email || localStorage.getItem("IMALI_EMAIL");
  const tier = location.state?.tier || "starter";

  const [clientSecret, setClientSecret] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication first
  useEffect(() => {
    const checkAuth = async () => {
      const token = BotAPI.getToken();
      
      if (!token) {
        setError("Please log in to add billing");
        setLoading(false);
        return;
      }

      try {
        // Verify token is valid
        const userData = await BotAPI.me();
        if (userData) {
          setIsAuthenticated(true);
        }
      } catch (authError) {
        console.error('Auth check failed:', authError);
        setError("Session expired. Please log in again.");
        // Clear invalid token
        BotAPI.clearToken();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Create setup intent only if authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!email) {
      navigate("/signup", { replace: true });
      return;
    }

    setLoading(true);
    setError("");

    createSetupIntent({ email, tier })
      .then((res) => {
        setClientSecret(res.client_secret);
      })
      .catch((e) => {
        console.error('Setup intent creation failed:', e);
        setError(e.message || "Failed to initialize billing");
        
        // If auth error, redirect to login
        if (e.message.includes('Authentication') || e.message.includes('log in')) {
          setTimeout(() => {
            navigate('/login', { 
              replace: true,
              state: { from: '/billing', email }
            });
          }, 2000);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [email, tier, navigate, isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-emerald-400 mb-2">Loading billing...</div>
          <div className="text-sm text-gray-400">Please wait</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-6">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-red-500/10 border border-red-500/30 text-red-200 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
          
          {error.includes('log in') ? (
            <Link 
              to="/login" 
              state={{ from: '/billing', email }}
              className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              Go to Login
            </Link>
          ) : (
            <Link 
              to="/activation" 
              className="inline-block bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              Continue without billing
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-6">
        <div className="max-w-md mx-auto text-center text-gray-400">
          Initializing billing...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white p-6">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-2">Add Payment Method</h1>
        <p className="text-gray-400 text-sm mb-6">
          Your card will be saved securely with Stripe
        </p>
        
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <Elements 
            stripe={stripePromise} 
            options={{ 
              clientSecret,
              appearance: {
                theme: 'night',
                variables: {
                  colorPrimary: '#10b981',
                  colorBackground: '#1f2937',
                  colorText: '#ffffff',
                  colorDanger: '#ef4444',
                  fontFamily: 'system-ui, sans-serif',
                }
              }
            }}
          >
            <BillingInner />
          </Elements>
        </div>
        
        <div className="mt-4 text-center">
          <Link 
            to="/activation" 
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Skip for now
          </Link>
        </div>
      </div>
    </div>
  );
}
