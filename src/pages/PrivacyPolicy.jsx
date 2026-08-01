import React from "react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-indigo-950 text-white">
      <div className="mx-auto max-w-4xl px-6 py-14 space-y-6">
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="text-white/80">
          We respect your privacy. This policy explains what data we collect,
          how we use it, and your rights. By using IMALI, you agree to these terms.
        </p>
        <h2 className="text-xl font-semibold">Data We Collect</h2>
        <ul className="list-disc pl-6 text-white/80 space-y-1">
          <li>Account and subscription information</li>
          <li>Wallet addresses and on‑chain interactions</li>
          <li>Usage analytics to improve the product</li>
        </ul>
        <h2 className="text-xl font-semibold">Your Rights</h2>
        <p className="text-white/80">
          You may request access, correction, or deletion of your data by contacting support.
        </p>
      </div>
    </div>
  );
}
