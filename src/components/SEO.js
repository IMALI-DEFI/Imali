import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE = "https://imali-defi.com";

const ROUTE_META = {
  "/": {
    title: "IMALI — AI Crypto Trading Assistant & Automated Trading",
    description:
      "IMALI is a non-custodial AI crypto trading assistant for automated trading, market analysis, confidence scoring and connected exchange execution.",
    robots: "index,follow",
  },
  "/how-it-works": {
    title: "How IMALI AI Trading Works",
    description:
      "See how IMALI analyzes markets, scores opportunities and helps automate crypto trading through connected accounts while remaining non-custodial.",
    robots: "index,follow",
  },
  "/pricing": {
    title: "IMALI Pricing | AI Crypto Trading Assistant",
    description:
      "Compare IMALI plans for AI market analysis, automated crypto trading, exchange connections and advanced trading tools.",
    robots: "index,follow",
  },
  "/trade-demo": {
    title: "IMALI Trading Demo | AI Crypto Trading Assistant",
    description:
      "See how IMALI analyzes crypto markets, evaluates trade setups and presents automated trading decisions.",
    robots: "index,follow",
  },
  "/blog": {
    title: "AI Crypto Trading Insights | IMALI",
    description:
      "IMALI insights on AI crypto trading, trading automation, market analysis, trading bots and digital asset strategy.",
    robots: "index,follow",
  },
  "/referrals": {
    title: "IMALI Partner & Referral Program",
    description:
      "Join the IMALI partner program and earn commissions for referring new users.",
    robots: "index,follow",
  },
  "/about-us": {
    title: "About IMALI | Non-Custodial AI Trading Technology",
    description:
      "Learn about IMALI and its mission to make AI-assisted and automated trading more accessible without taking custody of user funds.",
    robots: "index,follow",
  },
  "/ai-crypto-trading-bot": {
    title: "AI Crypto Trading Bot & Automated Trading | IMALI",
    description:
      "AI crypto trading bot for market analysis, confidence scoring and automated execution through connected accounts.",
    robots: "index,follow",
  },
  "/automated-crypto-trading": {
    title: "Automated Crypto Trading Software | IMALI",
    description:
      "Automated crypto trading with AI-assisted market analysis, scoring and non-custodial connected-account execution.",
    robots: "index,follow",
  },
  "/crypto-trading-software": {
    title: "Crypto Trading Software with AI Automation | IMALI",
    description:
      "Crypto trading software combining AI market analysis, automated trading, risk controls and connected exchange execution.",
    robots: "index,follow",
  },
  "/non-custodial-trading-bot": {
    title: "Non-Custodial Crypto Trading Bot | IMALI",
    description:
      "A non-custodial crypto trading bot that helps automate trading while assets remain with supported connected providers.",
    robots: "index,follow",
  },
  "/compare/3commas": {
    title: "IMALI vs 3Commas | AI Crypto Trading Bots Compared",
    description:
      "Compare IMALI and 3Commas for AI crypto trading, automated bots, DCA and grid strategies, connected exchanges and non-custodial workflows.",
    robots: "index,follow",
  },
  "/compare/cryptohopper": {
    title: "IMALI vs Cryptohopper | Crypto Trading Bots Compared",
    description:
      "Compare IMALI and Cryptohopper for AI crypto trading, automation, signals, paper trading, backtesting and connected-account execution.",
    robots: "index,follow",
  },
  "/compare/pionex": {
    title: "IMALI vs Pionex | Crypto Trading Bot Comparison",
    description:
      "Compare IMALI and Pionex for AI-assisted trading, built-in bots, grid and DCA automation, custody model and exchange connectivity.",
    robots: "index,follow",
  },
  "/terms": { title: "Terms of Service | IMALI", description: "IMALI terms of service.", robots: "noindex,follow" },
  "/privacy": { title: "Privacy Policy | IMALI", description: "IMALI privacy policy.", robots: "noindex,follow" },
  "/login": { title: "Sign In | IMALI", description: "Sign in to IMALI.", robots: "noindex,nofollow" },
  "/signup": { title: "Create Account | IMALI", description: "Create an IMALI account.", robots: "noindex,nofollow" },
  "/reset-password": { title: "Reset Password | IMALI", description: "Reset your IMALI password.", robots: "noindex,nofollow" },
  "/dashboard": { title: "Dashboard | IMALI", description: "IMALI member dashboard.", robots: "noindex,nofollow" },
  "/billing": { title: "Billing | IMALI", description: "IMALI billing.", robots: "noindex,nofollow" },
};

function setMeta(name, content) {
  let tag = document.head.querySelector(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function setProperty(property, content) {
  let tag = document.head.querySelector(`meta[property="${property}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("property", property);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

export default function SEO() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    let basePath = path;
    if (path.startsWith("/blog/")) basePath = "/blog";
    else if (path.startsWith("/signup")) basePath = "/signup";
    else if (path.startsWith("/billing")) basePath = "/billing";
    else if (path.startsWith("/admin") || path.startsWith("/connect-") || path.startsWith("/enterprise/")) {
      basePath = "/dashboard";
    }

    const meta = ROUTE_META[basePath] || ROUTE_META["/"];
    const canonicalUrl = `${SITE}${path === "/" ? "/" : path}`;

    document.title = meta.title;
    setMeta("description", meta.description);
    setMeta("robots", meta.robots);

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", canonicalUrl);

    setProperty("og:site_name", "IMALI");
    setProperty("og:title", meta.title);
    setProperty("og:description", meta.description);
    setProperty("og:url", canonicalUrl);
    setProperty("og:type", path.startsWith("/blog/") ? "article" : "website");
    setProperty("og:image", `${SITE}/og-image.png`);

    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", meta.title);
    setMeta("twitter:description", meta.description);
    setMeta("twitter:image", `${SITE}/og-image.png`);
  }, [location.pathname]);

  return null;
}
