// src/pages/Upgrade.jsx
import React from "react";
import { Link } from "react-router-dom";

import { MascotLogo } from "../components/game/GameKit";
export default function Upgrade() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 px-6">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center">
            <span className="text-3xl">🚀</span>
          </div>

          <MascotLogo size={84} className="block mx-auto mb-3" />
          <h1 className="text-2xl font-extrabold text-gray-900">
            Unlock Live Trading
          </h1>

          <p className="text-gray-600 mt-2">
            You’re currently in demo mode. Upgrade to trade live and earn real
            rewards.
          </p>
        </div>

        <ul className="space-y-3 mb-6 text-sm text-gray-700">
          <li>✅ Live trading access</li>
          <li>🏆 Achievements & streak tracking</li>
          <li>🧬 NFT tier boosts & fee reductions</li>
          <li>📈 Performance analytics</li>
          <li>📲 Telegram trade alerts</li>
        </ul>

        <div className="space-y-3">
          <Link
            to="/billing"
            className="block w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white py-3 font-semibold text-center"
          >
            Upgrade Now
          </Link>

          <Link
            to="/trade-demo"
            className="block w-full rounded-xl border border-gray-300 py-3 text-center text-gray-700 hover:bg-gray-50"
          >
            Stay in Demo
          </Link>
        </div>

        <p className="mt-6 text-xs text-gray-400 text-center">
          You can upgrade at any time. No lock-ins.
        </p>
      </div>
    </div>
  );
}
