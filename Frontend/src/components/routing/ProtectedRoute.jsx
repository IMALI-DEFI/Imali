import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import BotAPI from "../../utils/BotAPI";

export default function ProtectedRoute() {
  const location = useLocation();
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    BotAPI.me()
      .then(() => setStatus("ok"))
      .catch(() => setStatus("fail"));
  }, []);

  if (status === "loading") {
    return <div className="p-8 text-center">Checking session…</div>;
  }

  if (status === "fail") {
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
