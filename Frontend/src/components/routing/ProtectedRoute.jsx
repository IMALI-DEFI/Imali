// src/components/routing/ProtectedRoute.jsx
import React, { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import BotAPI from "../../utils/BotAPI";

export default function ProtectedRoute() {
  const location = useLocation();
  const [state, setState] = useState({
    loading: true,
    allowed: false,
  });

  useEffect(() => {
    const checkAuth = async () => {
      const token = BotAPI.getToken();

      if (!token) {
        setState({ loading: false, allowed: false });
        return;
      }

      try {
        await BotAPI.me();
        setState({ loading: false, allowed: true });
      } catch {
        BotAPI.clearToken();
        setState({ loading: false, allowed: false });
      }
    };

    checkAuth();
  }, []);

  if (state.loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <p className="text-gray-400 animate-pulse">
          Verifying session…
        </p>
      </div>
    );
  }

  if (!state.allowed) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return <Outlet />;
}
