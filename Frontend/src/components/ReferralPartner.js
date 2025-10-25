import React from "react";

export default function ReferralPartner() {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-bold">Referral Program</h1>
      <p className="mt-2 text-zinc-400">Invite friends, earn revenue share and NFT badges as your referrals trade.</p>

      <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="text-xl font-semibold">How it works</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-zinc-300">
          <li>Get your unique referral link from the dashboard.</li>
          <li>Share with your audience.</li>
          <li>Earn tiered commissions and XP as they trade.</li>
        </ol>
      </div>
    </div>
  );
}
