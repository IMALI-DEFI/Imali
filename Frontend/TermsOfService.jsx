import React from "react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-indigo-950 text-white">
      <div className="mx-auto max-w-4xl px-6 py-14 space-y-6">
        <h1 className="text-3xl font-bold">Terms of Service</h1>
        <p className="text-white/80">
          By using IMALI, you agree to these terms. Trading and DeFi activities
          carry risk. Nothing herein is financial advice.
        </p>
        <h2 className="text-xl font-semibold">Use of Service</h2>
        <ul className="list-disc pl-6 text-white/80 space-y-1">
          <li>Follow all applicable laws.</li>
          <li>Do not misuse or abuse platform features.</li>
          <li>We may update terms; continued use implies acceptance.</li>
        </ul>
        <h2 className="text-xl font-semibold">Limitation of Liability</h2>
        <p className="text-white/80">
          IMALI is not liable for losses incurred through trading or smart‑contract interactions.
        </p>
      </div>
    </div>
  );
}
