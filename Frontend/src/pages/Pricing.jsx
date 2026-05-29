// src/pages/Pricing.jsx - Updated ctaLinks only (rest of file same)
const plans = [
  {
    name: "Free Trial",
    slug: "starter",
    price: "$0",
    period: "7 days",
    priceDetail: "No credit card required",
    badge: <Pill tone="green">Safe Start</Pill>,
    image: StarterNFT,
    bots: ["Paper Trading", "Stocks", "Crypto (OKX)"],
    features: [...],
    fee: `${PERFORMANCE_FEE.starter}% performance fee (none during trial)`,
    cta: "Start Free Trial",
    ctaLink: "/signup?tier=starter&next=demo",  // CHANGED: added next=demo
    highlight: false,
    enterprise: false,
  },
  {
    name: "Pro",
    slug: "pro",
    price: "$19",
    period: "/month",
    priceDetail: "Upgrade when ready",
    badge: <Pill tone="orange">Most Popular</Pill>,
    image: ProNFT,
    bots: ["Live Trading", "Stocks", "Crypto (OKX)", "Crypto Futures"],
    features: [...],
    fee: `${PERFORMANCE_FEE.pro}% performance fee on profits > ${PROFIT_THRESHOLD}%`,
    cta: "Start Pro",
    ctaLink: "/signup?tier=pro&next=billing",  // CHANGED: added next=billing
    highlight: true,
    enterprise: false,
  },
  {
    name: "Elite",
    slug: "elite",
    price: "$49",
    period: "/month",
    priceDetail: "For active traders",
    badge: <Pill tone="purple">Power User</Pill>,
    image: EliteNFT,
    bots: ["Stocks", "Crypto (OKX)", "Crypto Futures", "DEX Trading"],
    features: [...],
    fee: `${PERFORMANCE_FEE.elite}% performance fee on profits > ${PROFIT_THRESHOLD}%`,
    cta: "Start Elite",
    ctaLink: "/signup?tier=elite&next=billing",  // CHANGED: added next=billing
    highlight: false,
    enterprise: false,
  },
  // Enterprise stays same
];