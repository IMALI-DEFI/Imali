import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import BotAPI  from "../utils/BotAPI";

export default function Signup() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    tier: "starter",
    strategy: "ai_weighted",
    acceptTerms: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* ----------------------------------------------------
     Redirect if already logged in
  ---------------------------------------------------- */
  useEffect(() => {
    if (BotAPI.isLoggedIn()) {
      nav("/dashboard", { replace: true });
    }
  }, [nav]);

  /* ----------------------------------------------------
     Validation
  ---------------------------------------------------- */
  const validateForm = () => {
    setError("");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.email || !emailRegex.test(form.email)) {
      setError("Please enter a valid email address");
      return false;
    }

    if (!form.password || form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return false;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    if (!form.acceptTerms) {
      setError("You must accept the Terms of Service and Privacy Policy");
      return false;
    }

    return true;
  };

  /* ----------------------------------------------------
     Submit
  ---------------------------------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await BotAPI.signup({
        email: form.email,
        password: form.password,
        tier: form.tier,
        strategy: form.strategy,
      });

      const token = BotAPI.getToken();

      // If token exists, treat signup as successful
      if (token) {
        setSuccess("Account created successfully! Redirecting...");

        // Promo auto-claim (non-blocking)
        try {
          const promoStatus = await BotAPI.promoStatus();
          if (promoStatus?.active || promoStatus?.available) {
            await BotAPI.promoClaim({
              email: form.email,
              tier: form.tier,
            });
          }
        } catch {
          /* promo failure should never block signup */
        }

        setTimeout(() => {
          nav("/billing", {
            replace: true,
            state: { justSignedUp: true },
          });
        }, 1200);

        return;
      }

      // Fallback: account created but no token
      setSuccess("Account created! Please log in.");
      setTimeout(() => {
        nav("/login", {
          state: {
            email: form.email,
            message: "Account created! Please log in.",
          },
        });
      }, 1200);
    } catch (err) {
      let msg = err.message || "Signup failed. Please try again.";

      if (err.status === 409 || msg.toLowerCase().includes("exists")) {
        msg = "An account with this email already exists. Please log in.";
        setTimeout(() => {
          nav("/login", { state: { email: form.email } });
        }, 1500);
      } else if (err.status === 400) {
        if (msg.toLowerCase().includes("email")) {
          msg = "Please enter a valid email address";
        }
        if (msg.toLowerCase().includes("password")) {
          msg = "Password must be at least 8 characters";
        }
      } else if (err.status === 500) {
        msg = "Server error. Please try again later.";
      }

      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------------------------------
     UI (unchanged)
  ---------------------------------------------------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-950 flex items-center justify-center p-4">
      {/* UI unchanged – omitted here for brevity */}
      {/* KEEP YOUR EXISTING JSX EXACTLY AS IS BELOW */}
      {/* ⬇⬇⬇ */}
      {/* (no visual changes were made) */}
    </div>
  );
}
