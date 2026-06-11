// src/pages/ConnectOKX.jsx

import React, { useEffect, useState } from "react";
import BotAPI from "../utils/BotAPI";
import {
  FaCheckCircle,
  FaPlug,
  FaExchangeAlt,
  FaSyncAlt,
  FaTrash,
} from "react-icons/fa";

export default function ConnectOKX() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStatus = async () => {
    const integration = await BotAPI.getIntegrationStatus(true);
    const balance = await BotAPI.getExchangeBalance(true);

    setStatus({
      connected: integration.okx_connected,
      mode: integration.okx_mode,
      key: integration.okx_api_key_masked,
      balance: balance.okx_total,
      available: balance.okx_available_usdt,
    });

    setLoading(false);
  };

  useEffect(() => {
    loadStatus();
  }, []);

  if (loading) return <div className="p-10 text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-4xl mx-auto">

        <h1 className="text-4xl font-black mb-6">
          Connect OKX
        </h1>

        <div className="rounded-3xl bg-white/5 p-6 border border-white/10">

          <div className="flex items-center gap-3 mb-6">
            {status.connected ? (
              <FaCheckCircle className="text-emerald-400" />
            ) : (
              <FaPlug className="text-yellow-400" />
            )}

            <span>
              {status.connected
                ? "Connected"
                : "Not Connected"}
            </span>
          </div>

          <div className="space-y-3">
            <p>API Key: {status.key || "Not Connected"}</p>
            <p>Mode: {status.mode}</p>
            <p>Total Balance: ${status.balance?.toFixed(2)}</p>
            <p>Available USDT: ${status.available?.toFixed(2)}</p>
          </div>

          <div className="flex gap-3 mt-8">

            <button
              className="bg-cyan-500 px-5 py-3 rounded-xl font-bold"
            >
              <FaExchangeAlt className="inline mr-2" />
              Update Keys
            </button>

            <button
              onClick={loadStatus}
              className="bg-white/10 px-5 py-3 rounded-xl"
            >
              <FaSyncAlt className="inline mr-2" />
              Test Connection
            </button>

            <button
              className="bg-red-500 px-5 py-3 rounded-xl"
            >
              <FaTrash className="inline mr-2" />
              Disconnect
            </button>

          </div>

        </div>
      </div>
    </div>
  );
}