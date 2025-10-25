import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const tier = localStorage.getItem("imali_tier") || "Starter";
  const allowed = ["Pro", "Elite", "pro", "elite"].includes(tier);
  if (!allowed) return <Navigate to="/signup" replace />;
  return children;
}
