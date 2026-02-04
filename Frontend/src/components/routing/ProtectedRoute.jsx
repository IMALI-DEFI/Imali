// src/components/routing/ProtectedRoute.jsx
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

const TOKEN_KEY = "imali_token";

export default function ProtectedRoute() {
  const location = useLocation();

  let token = "";
  try {
    token = localStorage.getItem(TOKEN_KEY) || "";
  } catch {}

  if (!token) {
    return (
      <Navigate
        to="/signup"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return <Outlet />;
}
