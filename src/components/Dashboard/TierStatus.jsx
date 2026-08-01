import React, { useMemo } from "react";

// TierStatus
// - Displays the user's current tier and the key rules/perks
// - Keeps copy aligned with your latest pricing language

function normalizeTier(t) {
  return String(t || "starter").trim().toLowerCase();
}

const TIER_CARD = {
  starter: {
    label: "Starter (Free)",
    bullets: [
      "Includes: CEX + Stock bots",
      "Profit share: 30% on positive trades only",
      "Trade must clear +3% to count",
      "Hold $100 IMALI → 20% profit share",
      "Cancel any time",
    ],
  },
  pro_stocks: {
    label: "Pro Stocks ($19/mo)",
    bullets: [
      "Includes: Stock bot",
      "Performance fee: 5% on net profits over +3%",
      "Hold $100 IMALI → threshold drops to +2%",
      "Cancel any time",
    ],
  },
  pro: {
    label: "Pro CEX + Stocks ($49/mo)",
    bullets: [
      "Includes: CEX + Stock bots",
      "Performance fee: 5% on net profits over +3%",
      "Hold $100 IMALI → threshold drops to +2%",
      "Cancel any time",
    ],
  },
  crypto_plus: {
    label: "Crypto+ ($99/mo)",
    bullets: [
      "Includes: DEX + (Stock or CEX)",
      "Performance fee: 5% on net profits over +3%",
      "Includes paid RPC + advanced execution reliability",
      "Yield Farming + Staking unlocked with $25 IMALI entry fee",
      "Cancel any time",
    ],
  },
  elite: {
    label: "Elite (DEX + CEX)",
    bullets: [
      "Includes: DEX + CEX (+ Stocks where applicable)",
      "Performance fee: 5% on net profits over +3%",
      "Paid RPC included",
      "Yield Farming + Staking unlocked with $25 IMALI entry fee",
      "Lending included",
      "Cancel any time",
    ],
  },
  bundle: {
    label: "Bundle (All Bots)",
    bullets: [
      "Includes: Stocks + CEX + DEX",
      "Performance fee: 5% on net profits over +3%",
      "Paid RPC included",
      "Yield Farming + Staking unlocked with $25 IMALI entry fee",
      "Lending included",
      "Cancel any time",
    ],
  },
};

// Accept legacy tier names you may already have stored in Firestore
const TIER_ALIASES = {
  starter: "starter",
  free: "starter",
  pro: "pro",
  stocks: "pro_stocks",
  pro_stocks: "pro_stocks",
  elite: "elite",
  bundle: "bundle",
  dex: "crypto_plus",
  crypto: "crypto_plus",
  crypto_plus: "crypto_plus",
  premium: "elite",
};

export default function TierStatus({ tier, showPromo = true }) {
  const key = useMemo(() => {
    const t = normalizeTier(tier);
    return TIER_ALIASES[t] || "starter";
  }, [tier]);

  const card = TIER_CARD[key] || TIER_CARD.starter;

  return (
    <div className="imalicard" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{card.label}</div>
          <div style={{ opacity: 0.8, marginTop: 4 }}>Your access + pricing rules for this tier.</div>
        </div>

        {showPromo && (
          <div
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              padding: "10px 12px",
              maxWidth: 420,
            }}
          >
            <div style={{ fontWeight: 800 }}>First 50 customers promo</div>
            <div style={{ opacity: 0.85, marginTop: 4 }}>
              90 days of <b>5% performance fee</b> on net profits over <b>+3%</b>.
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {card.bullets.map((b) => (
            <li key={b} style={{ marginBottom: 6 }}>
              {b}
            </li>
          ))}
        </ul>
      </div>

      <div style={{ opacity: 0.75, marginTop: 10, fontSize: 13, lineHeight: 1.4 }}>
        Platform / network fees are not included (OKX fees, Alpaca fees, blockchain gas, RPC costs, etc.).
        Performance fees apply only to qualified profitable results per the tier rules.
      </div>
    </div>
  );
}
