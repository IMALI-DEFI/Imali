// src/pages/Signup.jsx - ONLY the handleSubmit function changes
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import BotAPI from "../utils/BotAPI";
import { useAuth } from "../contexts/AuthContext"; // 🔥 ADD THIS

export default function Signup() {
  const navigate = useNavigate();
  const { login } = useAuth(); // 🔥 ADD THIS

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

  const validate = () => {
    if (!form.email.trim()) return "Email is required.";
    if (form.password.length < 8)
      return "Password must be at least 8 characters.";
    if (form.password !== form.confirmPassword)
      return "Passwords do not match.";
    if (!form.acceptTerms)
      return "You must accept the Terms and Privacy Policy.";
    return null;
  };

  // 🔥 FIXED handleSubmit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const email = form.email.trim().toLowerCase();

      // 1️⃣ Create account
      await BotAPI.signup({
        email,
        password: form.password,
        tier: form.tier,
        strategy: form.strategy,
      });

      // 2️⃣ Log in via AuthContext (this will set the user state)
      const loginResult = await login(email, form.password);
      
      if (!loginResult.success) {
        throw new Error(loginResult.error);
      }

      // 3️⃣ Always go to billing (onboarding step 1)
      navigate("/billing", { replace: true });

    } catch (err) {
      console.error("[Signup] Error:", err);

      if (err.response?.status === 409) {
        setError("An account with this email already exists.");
      } else if (err.response?.status === 400) {
        setError("Invalid signup information.");
      } else if (err.code === "ERR_NETWORK") {
        setError("Network error. Please try again.");
      } else {
        setError(err.message || "Signup failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Rest of your component remains exactly the same
  return ( ... );
}
