// src/components/routing/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import BotAPI from "../../utils/BotAPI";

export default function ProtectedRoute() {
  const location = useLocation();

  if (!BotAPI.isLoggedIn()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
