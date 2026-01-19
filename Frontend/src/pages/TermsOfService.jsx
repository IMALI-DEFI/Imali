import React from "react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-indigo-950 text-white">
      <div className="mx-auto max-w-4xl px-6 py-14 space-y-10">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Terms of Service</h1>
          <p className="text-white/60">Last updated: January 18, 2026</p>
        </header>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">1) Important notices</h2>
          <ul className="list-disc pl-6 text-white/80 space-y-2">
            <li>
              <span className="font-semibold">Not financial advice:</span> IMALI provides tools,
              analytics, automation, and/or trade signals. Nothing on the Service is investment,
              tax, or legal advice.
            </li>
            <li>
              <span className="font-semibold">Trading is risky:</span> You can lose some or all of
              your funds. Past performance does not guarantee future results.
            </li>
            <li>
              <span className="font-semibold">Third-party costs are separate:</span> Exchange fees
              (OKX, Alpaca), blockchain gas, RPC provider charges, spreads, slippage, and funding/
              interest are not included in IMALI pricing and may reduce results.
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">2) What you are buying</h2>
          <p className="text-white/80">
            IMALI offers subscription access and/or performance-based fees for trading tools across
            Stocks (Alpaca), CEX (OKX), and DEX (on-chain). Availability varies by tier and may
            change as features roll out.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">3) Auto-execution authorization</h2>
          <p className="text-white/80">
            If you enable auto-execution, you authorize the Service to place orders using the API
            keys, permissions, or wallet approvals you provide. You are responsible for:
          </p>
          <ul className="list-disc pl-6 text-white/80 space-y-2">
            <li>Maintaining secure API keys and wallet access.</li>
            <li>Setting limits (position sizing, max trades, stop conditions) where available.</li>
            <li>Ensuring your exchange account is eligible and compliant in your jurisdiction.</li>
          </ul>
          <p className="text-white/80">
            You can disable auto-execution any time. IMALI cannot guarantee execution quality,
            fill prices, or uptime of third-party services.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">4) Pricing, fees, and promotions</h2>

          <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
            <h3 className="font-semibold">Tier summary (may be updated on the Pricing page)</h3>
            <ul className="list-disc pl-6 text-white/80 space-y-2">
              <li>
                <span className="font-semibold">Free (CEX + Stocks):</span> $0 subscription. A
                performance fee of <span className="font-semibold">30%</span> applies to
                qualifying net profits (see Section 5). If you purchase/hold at least
                <span className="font-semibold"> $100 worth of IMALI each month</span>, the
                performance fee is reduced to <span className="font-semibold">20%</span>.
              </li>
              <li>
                <span className="font-semibold">Stocks (Pro):</span> $19/month plus
                <span className="font-semibold"> 5%</span> performance fee on qualifying net profits.
                Reduced to <span className="font-semibold">2%</span> with $100 IMALI monthly.
              </li>
              <li>
                <span className="font-semibold">CEX + Stocks (Pro+):</span> $49/month plus
                <span className="font-semibold"> 5%</span> performance fee on qualifying net profits.
                Reduced to <span className="font-semibold">2%</span> with $100 IMALI monthly.
              </li>
              <li>
                <span className="font-semibold">DEX + Crypto Pro (Elite):</span> $99/month. Includes
                DEX plus your choice of Stocks or CEX, premium RPC access, and higher-tier modules
                (yield farming, staking, and lending). A
                <span className="font-semibold"> $25 IMALI access fee</span> may be required to
                unlock certain premium crypto modules.
              </li>
              <li>
                <span className="font-semibold">Bundle (All Bots):</span> $199/month. Includes DEX,
                CEX, and Stocks, plus premium crypto modules (yield, staking, lending) and premium
                RPC access. A <span className="font-semibold">$25 IMALI access fee</span> may apply
                to unlock certain premium crypto modules.
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
            <h3 className="font-semibold">First 50 customers promo</h3>
            <p className="text-white/80">
              For the first 50 customers, IMALI may offer a limited-time performance fee of
              <span className="font-semibold"> 5%</span> on qualifying net profits for up to
              <span className="font-semibold"> 90 days</span> (the “Promo Period”). Promo availability,
              eligibility, and start/end dates may be updated on the Pricing page.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">5) How performance fees are calculated</h2>
          <p className="text-white/80">
            “Qualifying net profits” are calculated on a net basis over a billing period (typically
            monthly) using trade records available to IMALI through your connected integrations.
          </p>
          <ul className="list-disc pl-6 text-white/80 space-y-2">
            <li>
              <span className="font-semibold">3% hurdle:</span> A performance fee applies only if the
              period’s net return exceeds <span className="font-semibold">3%</span> (the “Hurdle”).
            </li>
            <li>
              <span className="font-semibold">Net basis:</span> Net results reflect profits and losses.
              Third-party fees (exchange fees, gas, spreads, slippage) still affect net performance.
            </li>
            <li>
              <span className="font-semibold">Anti-gaming:</span> IMALI may use reasonable controls to
              prevent fee avoidance, including requiring results to be computed on realized PnL,
              enforcing a high-water mark, and using period-based accounting rather than single-trade
              cherry-picking.
            </li>
            <li>
              <span className="font-semibold">Cancellation:</span> If you cancel mid-period, calculations
              may be time-adjusted through the cancellation date and finalized after positions settle.
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">6) Suggested minimum funding</h2>
          <p className="text-white/80">
            Trading with very small balances can increase the impact of fees and slippage. IMALI may
            display a suggested minimum (for example, $150) for a better test experience. This is a
            suggestion only; you control your funding.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">7) Billing, refunds, and chargebacks</h2>
          <ul className="list-disc pl-6 text-white/80 space-y-2">
            <li>Subscriptions renew monthly unless canceled.</li>
            <li>Performance fees (if applicable) may be invoiced or collected after a period closes.</li>
            <li>Refunds are not guaranteed and are evaluated case-by-case.</li>
            <li>Chargebacks or fraudulent disputes may result in account restriction.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">8) Service availability and changes</h2>
          <p className="text-white/80">
            The Service may be unavailable at times due to maintenance or third-party outages. IMALI
            may add, remove, or modify features, tiers, and integrations.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">9) Acceptable use</h2>
          <p className="text-white/80">
            You agree not to misuse the Service, attempt to bypass access controls, interfere with
            system operation, or use the Service for unlawful activity.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">10) Limitation of liability</h2>
          <p className="text-white/80">
            To the maximum extent permitted by law, IMALI and its operators are not liable for losses
            arising from trading, market conditions, third-party outages, exchange restrictions,
            blockchain events, or user configuration.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">11) Contact</h2>
          <p className="text-white/80">
            Questions? Use the Support page or email the address listed there.
          </p>
        </section>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <p className="text-white/70 text-sm">
            This page is provided for general information and product clarity. It does not replace
            professional legal advice. If you are operating a paid automated trading service, consult
            a qualified attorney regarding regulatory and compliance requirements in your jurisdiction.
          </p>
        </div>
      </div>
    </div>
  );
}
