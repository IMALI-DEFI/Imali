/**
 * IMALI Portfolio Grader
 * ----------------------
 * Free A–F "portfolio health check" lead magnet.
 * Self-contained: only depends on React. All visuals are SVG/CSS; share card is drawn on <canvas>.
 *
 * Usage (e.g. in a route like /grader):
 *   import PortfolioGrader from "./PortfolioGrader";
 *   import logo from "./assets/imali-logo.png";
 *   <PortfolioGrader />   (uses src/assets/imali-logo.png and REACT_APP_API_BASE_URL by default)
 *
 * Props (all optional):
 *   logoSrc     – IMALI logo used as the mascot + on the share card (fallback: built-in coin mascot)
 *   apiBase     – backend base URL; email leads are POSTed to `${apiBase}/api/grader/lead`
 *                 (default "https://api.imali-defi.com"; pass "" to disable)
 *   onLead      – async (lead) => void, called with the lead payload in addition to / instead of the POST
 *   signupUrl   – free Starter signup link   (default "/signup")
 *   pricingUrl  – plans page link            (default "/pricing")
 *   demoUrl     – demo page link             (default "/demo")
 *   shareUrl    – link printed on share card (default "https://imali-defi.com/grader")
 *
 * Educational tool only — it grades portfolio *structure* and never tells anyone what to buy or sell.
 */
import React, { useState, useMemo, useEffect, useRef } from "react";
import imaliLogo from "../assets/imali-logo.png";

const API_BASE = (process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com").replace(/\/+$/, "");

// ---- engine (pure, no React) ----
const TYPES = {
  cash: { label: "Cash", vol: 0, cls: "safe" },
  stable: { label: "Stablecoin", vol: 1, cls: "safe" },
  bond: { label: "Bond fund", vol: 6, cls: "safe" },
  etf: { label: "Stock index / ETF", vol: 18, cls: "stocks" },
  stock: { label: "Single stock", vol: 35, cls: "stocks" },
  major: { label: "BTC / ETH", vol: 60, cls: "crypto" },
  alt: { label: "Large-cap altcoin", vol: 85, cls: "crypto" },
  small: { label: "Small-cap / meme coin", vol: 110, cls: "crypto" },
};

const KNOWN = {
  cash: ["CASH", "USD", "DOLLARS", "DOLLAR", "SAVINGS"],
  stable: ["USDT", "USDC", "DAI", "BUSD", "TUSD", "FDUSD", "PYUSD", "USDE", "USDD", "FRAX", "STABLECOINS", "STABLES"],
  bond: ["BND", "AGG", "TLT", "SHY", "IEF", "BNDX", "VGIT", "SGOV", "BIL", "BONDS"],
  etf: ["SPY", "VOO", "VTI", "QQQ", "QQQM", "IVV", "SCHD", "VT", "VXUS", "DIA", "IWM", "VUG", "VGT", "SPLG", "XLK", "ARKK", "SP500", "S&P"],
  stock: ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL", "GOOG", "META", "NFLX", "AMD", "COIN", "MSTR", "PLTR", "JPM",
    "DIS", "NKE", "KO", "PEP", "WMT", "COST", "INTC", "BABA", "UBER", "HOOD", "SOFI", "GME", "AMC", "AVGO", "ORCL", "CRM"],
  major: ["BTC", "ETH", "BITCOIN", "ETHEREUM", "WBTC", "IBIT", "FBTC"],
  alt: ["SOL", "BNB", "XRP", "ADA", "AVAX", "DOT", "LINK", "TRX", "TON", "MATIC", "POL", "LTC", "BCH", "ATOM", "NEAR",
    "UNI", "XLM", "SUI", "APT", "ARB", "OP", "HBAR", "ICP", "FIL", "INJ", "AAVE", "OKB", "ETC", "XMR", "RNDR", "RENDER",
    "TAO", "SEI", "TIA", "SOLANA", "CARDANO", "RIPPLE"],
  small: ["DOGE", "SHIB", "PEPE", "BONK", "WIF", "FLOKI", "TRUMP", "POPCAT", "MOG", "BRETT", "DOGECOIN", "MEMECOINS"],
};

function guessType(sym) {
  const s = String(sym || "").toUpperCase();
  for (const [type, list] of Object.entries(KNOWN)) if (list.includes(s)) return { type, guessed: false };
  return { type: "alt", guessed: true };
}

const ALIASES = { DOLLARS: "CASH", DOLLAR: "CASH", USD: "CASH", SAVINGS: "CASH", BITCOIN: "BTC", ETHEREUM: "ETH",
  SOLANA: "SOL", CARDANO: "ADA", RIPPLE: "XRP", DOGECOIN: "DOGE" };
const STOP = new Set(["IN", "OF", "MY", "AND", "THE", "A", "AN", "ON", "AT", "WORTH", "IS", "ARE", "INTO", "PERCENT", "PCT", "I", "HAVE", "HOLD"]);

/** "40% BTC, 30% SOL, 30% cash" | "$4,000 BTC\nETH 2.5k" → [{sym, value, pct}] */
function parseHoldings(text) {
  const chunks = String(text || "").split(/[\n;+]|,(?!\d{3}\b)|\band\b/i).map((s) => s.trim()).filter(Boolean);
  const merged = new Map();
  for (const chunk of chunks) {
    const m = chunk.match(/(\$)?\s*(\d[\d,]*\.?\d*|\.\d+)\s*(?:(k|m)\b)?\s*(%)?/i);
    if (!m) continue;
    let value = parseFloat(m[2].replace(/,/g, ""));
    if (!isFinite(value) || value <= 0) continue;
    const suffix = (m[3] || "").toLowerCase();
    if (suffix === "k") value *= 1e3;
    if (suffix === "m") value *= 1e6;
    const rest = chunk.replace(m[0], " ");
    const words = rest.match(/[A-Za-z][A-Za-z0-9.&]*/g) || [];
    const raw = words.map((w) => w.toUpperCase().replace(/\.$/, "")).find((w) => !STOP.has(w));
    if (!raw) continue;
    const sym = ALIASES[raw] || raw;
    const prev = merged.get(sym);
    merged.set(sym, { sym, value: (prev ? prev.value : 0) + value, pct: !!m[4] && (!prev || prev.pct) });
  }
  return [...merged.values()];
}

function clamp(n, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n));
}
const pct = (w) => `${Math.round(w * 100)}%`;

const GRADES = [[90, "A"], [85, "A-"], [80, "B+"], [75, "B"], [70, "B-"], [65, "C+"], [60, "C"], [55, "C-"], [45, "D"], [0, "F"]];
function letterFor(score) {
  return GRADES.find(([min]) => score >= min)[1];
}
function colorFor(letter) {
  return { A: "#22e3a1", B: "#3cc8ff", C: "#ffd23f", D: "#ff9f43", F: "#ff5c7a" }[letter[0]];
}
const BLURBS = {
  A: "Strong, well-balanced setup. Nice work!",
  B: "Solid base with a couple of things to tighten up.",
  C: "Some real risks hiding in here, but they're fixable.",
  D: "A few big risks are stacking up.",
  F: "This portfolio is running on hope. Let's fix that.",
};

function swingLabel(vol) {
  if (vol < 15) return "very calm";
  if (vol < 35) return "moderate";
  if (vol < 60) return "high";
  if (vol < 85) return "very high";
  return "extreme";
}

const APP_SCORES = { 1: 100, 2: 80, 3: 55, 4: 35, 5: 15 };
const WEIGHTS = { conc: 0.25, div: 0.2, risk: 0.25, cash: 0.15, apps: 0.15 };

/** rows: [{sym, value, type}], apps: 1..5 (5 = "5+") */
function gradePortfolio(rows, apps) {
  const valid = (rows || []).filter((r) => r.sym && Number(r.value) > 0 && TYPES[r.type]);
  const total = valid.reduce((s, r) => s + Number(r.value), 0);
  if (!total || !APP_SCORES[apps]) return null;
  const items = valid.map((r) => ({ sym: r.sym.toUpperCase(), type: r.type, w: Number(r.value) / total, t: TYPES[r.type] }));

  // 1. Concentration — biggest single position (diversified funds / cash count at 40%)
  const exposure = items.map((i) => i.w * (i.t.cls === "crypto" || i.type === "stock" ? 1 : 0.4));
  const largest = Math.max(...exposure);
  const big = items[exposure.indexOf(largest)];
  const conc = clamp(100 - (largest * 100 - 25) * (100 / 75));

  // 2. Diversification — meaningful holdings (funds count as 3) + asset groups covered
  const meaningful = items.filter((i) => i.w >= 0.05);
  const eff = meaningful.reduce((s, i) => s + (i.type === "etf" || i.type === "bond" ? 3 : 1), 0);
  const groups = new Set(meaningful.map((i) => i.t.cls)).size;
  const div = clamp((Math.min(eff, 6) / 6) * 60 + (groups / 3) * 40);

  // 3. Risk level — weighted typical yearly swing
  const vol = items.reduce((s, i) => s + i.w * i.t.vol, 0);
  const risk = clamp(((100 - vol) / 75) * 100);

  // 4. Cash balance — some dry powder is good, a pile sitting still is not
  const c = items.filter((i) => i.type === "cash" || i.type === "stable").reduce((s, i) => s + i.w, 0);
  const cash = c < 0.05 ? 75 : c <= 0.25 ? 100 : clamp(100 - ((c - 0.25) / 0.6) * 100);

  // 5. App juggling
  const appsScore = APP_SCORES[apps];

  const factors = [
    { key: "conc", label: "Concentration", short: "Concentration", score: conc,
      detail: `Your biggest position is ${big.sym} at ${pct(big.w)} of your money.` },
    { key: "div", label: "Spread (diversification)", short: "Spread", score: div,
      detail: `${meaningful.length} meaningful holding${meaningful.length === 1 ? "" : "s"} across ${groups} of 3 groups (crypto, stocks, cash/bonds).` },
    { key: "risk", label: "Risk level", short: "Risk level", score: risk,
      detail: `Expected price swings: ${swingLabel(vol)} (about ±${Math.round(vol)}% in a typical year).` },
    { key: c > 0.25 ? "cashHigh" : c < 0.05 ? "cashLow" : "cash", label: "Cash balance", short: "Cash balance", score: cash,
      detail: `${pct(c)} sits in cash or stablecoins.` },
    { key: "apps", label: "App juggling", short: "App juggling", score: appsScore,
      detail: `You're juggling ${apps >= 5 ? "5 or more" : apps} trading app${apps > 1 ? "s" : ""}.` },
  ];
  const weightOf = (k) => WEIGHTS[k.startsWith("cash") ? "cash" : k];
  const score = factors.reduce((s, f) => s + f.score * weightOf(f.key), 0);
  const letter = letterFor(score);
  return { score, letter, color: colorFor(letter), blurb: BLURBS[letter[0]], factors, items, vol, cashShare: c };
}

const TIPS = {
  conc: { word: "Position sizing", title: "One position is running the show",
    body: "When one coin or stock is most of your money, one bad week can wipe out months of gains. Many traders cap how much any single position can be, so no single drop sinks the whole portfolio.",
    cta: "Practice position sizing free", link: "signup", plan: "Starter · Free" },
  div: { word: "Diversification", title: "Your money isn't spread out much",
    body: "Your money sits in only a few spots. Spreading across different kinds of assets, like crypto, stocks and some cash, means they're less likely to all fall at the same time.",
    cta: "Trade crypto and stocks in one place", link: "pricing", plan: "Pro" },
  risk: { word: "Volatility", title: "Big swings ahead",
    body: "Your mix leans toward assets that can move a lot in a year. That isn't automatically wrong, but it's smart to see how you'd handle a big drop before it happens with real money.",
    cta: "Test strategies with practice money", link: "signup", plan: "Starter · Free" },
  cashHigh: { word: "Idle cash", title: "Lots of cash sitting still",
    body: "A big pile of cash or stablecoins is safe, but it isn't doing any work. IMALI bots trade only the USDT you choose to make available, so you stay in control of the rest.",
    cta: "See auto-trading in the demo", link: "demo", plan: "Pro" },
  cashLow: { word: "Dry powder", title: "No cash ready for dips",
    body: "With almost no cash or stablecoins, you can't act when prices drop. Many traders keep a slice on the side so they're ready when an opportunity shows up.",
    cta: "Learn the basics free", link: "signup", plan: "Starter · Free" },
  apps: { word: "Portfolio tracking", title: "Too many apps to keep track of",
    body: "Jumping between exchanges and brokers makes it easy to lose track of what you own and how it's doing. IMALI connects OKX, Alpaca stocks and DEX trading in one dashboard.",
    cta: "Put it all in one dashboard", link: "pricing", plan: "Pro / Elite" },
  great: { word: "Rebalancing", title: "You're in great shape. Keep it that way",
    body: "Good portfolios drift over time as prices move. Checking and rebalancing on a schedule keeps your grade high, and bots can handle the routine work for you.",
    cta: "See how IMALI bots work", link: "demo", plan: "Pro" },
};

function tipsFor(result) {
  const weak = result.factors.filter((f) => f.score < 75).sort((a, b) => a.score - b.score).slice(0, 3);
  return weak.length ? weak.map((f) => ({ ...TIPS[f.key], factor: f.short })) : [{ ...TIPS.great, factor: "Next level" }];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// ---- end engine ----

const EXAMPLES = [
  { label: "🎯 All-in on one coin", text: "90% SOL, 10% USDT", apps: 2 },
  { label: "🚀 Crypto mix", text: "40% BTC, 30% SOL, 20% PEPE, 10% USDC", apps: 3 },
  { label: "⚖️ Balanced", text: "30% VOO, 20% BTC, 15% ETH, 15% AAPL, 10% BND, 10% cash", apps: 2 },
];

let rowId = 0;
const newRow = (sym = "", value = "", type) => {
  const g = type ? { type, guessed: false } : guessType(sym);
  return { id: ++rowId, sym, value, type: g.type, guessed: !!sym && g.guessed };
};

function track(event, params) {
  try {
    if (typeof window !== "undefined" && typeof window.gtag === "function") window.gtag("event", event, params);
  } catch (e) { /* analytics is optional */ }
}

function storage(key, value) {
  try {
    if (value === undefined) return window.localStorage.getItem(key);
    window.localStorage.setItem(key, value);
  } catch (e) { return null; }
  return null;
}

function useCountUp(target, ms = 1100) {
  const [v, setV] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (target == null) return undefined;
    const start = performance.now();
    const a = from.current;
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / ms);
      const cur = a + (target - a) * (1 - Math.pow(1 - p, 3));
      from.current = cur;
      setV(cur);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

function Mascot({ logoSrc, mood = "ok" }) {
  if (logoSrc) return <img className="ipg-mascot" src={logoSrc} alt="IMALI" />;
  const mouth = mood === "happy" ? "M28 46 Q40 58 52 46" : mood === "worried" ? "M29 52 Q40 43 51 52" : "M30 49 L50 49";
  return (
    <svg className="ipg-mascot" viewBox="0 0 80 80" aria-label="IMALI mascot">
      <defs>
        <linearGradient id="ipgCoin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b6bff" />
          <stop offset="1" stopColor="#22e3a1" />
        </linearGradient>
      </defs>
      <circle cx="40" cy="40" r="36" fill="url(#ipgCoin)" stroke="#ffffff55" strokeWidth="3" />
      <circle cx="29" cy="34" r="5" fill="#0b1030" />
      <circle cx="51" cy="34" r="5" fill="#0b1030" />
      <circle cx="30.5" cy="32.5" r="1.6" fill="#fff" />
      <circle cx="52.5" cy="32.5" r="1.6" fill="#fff" />
      <path d={mouth} stroke="#0b1030" strokeWidth="4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// ---- share card (canvas) ----
function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => resolve(im);
    im.onerror = () => resolve(null);
    im.src = src;
  });
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
async function drawShareCard(result, logoSrc, shareUrl) {
  const S = 1080;
  const cv = document.createElement("canvas");
  cv.width = cv.height = S;
  const ctx = cv.getContext("2d");
  const font = "system-ui, -apple-system, 'Segoe UI', sans-serif";
  const bg = ctx.createLinearGradient(0, 0, S, S);
  bg.addColorStop(0, "#0b1030");
  bg.addColorStop(1, "#2a0f4a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, S, S);
  const glow = ctx.createRadialGradient(S / 2, 470, 40, S / 2, 470, 420);
  glow.addColorStop(0, result.color + "40");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, S, S);

  ctx.textAlign = "center";
  const logo = await loadImage(logoSrc);
  try {
    if (logo) {
      const h = 110, w = (logo.width / logo.height) * h;
      ctx.drawImage(logo, S / 2 - w / 2, 70, w, h);
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.font = `900 64px ${font}`;
      ctx.fillText("IMALI", S / 2, 150);
    }
  } catch (e) { /* tainted or broken logo — skip */ }

  ctx.fillStyle = "#cfd6ff";
  ctx.font = `700 46px ${font}`;
  ctx.fillText("My portfolio got", S / 2, 255);

  ctx.lineWidth = 28;
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(255,255,255,.1)";
  ctx.beginPath();
  ctx.arc(S / 2, 470, 170, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = result.color;
  ctx.beginPath();
  ctx.arc(S / 2, 470, 170, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.02, result.score / 100));
  ctx.stroke();
  ctx.fillStyle = result.color;
  ctx.font = `900 ${result.letter.length > 1 ? 160 : 200}px ${font}`;
  ctx.textBaseline = "middle";
  ctx.fillText(result.letter, S / 2, 482);
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 40px ${font}`;
  ctx.fillText(`${Math.round(result.score)} / 100`, S / 2, 712);

  let y = 778;
  const x0 = 170, labelW = 260, barW = 740 - labelW;
  result.factors.forEach((f) => {
    ctx.textAlign = "left";
    ctx.fillStyle = "#cfd6ff";
    ctx.font = `700 27px ${font}`;
    ctx.fillText(f.short, x0, y);
    ctx.fillStyle = "rgba(255,255,255,.12)";
    roundRect(ctx, x0 + labelW, y - 21, barW, 22, 11);
    ctx.fill();
    ctx.fillStyle = colorFor(letterFor(f.score));
    roundRect(ctx, x0 + labelW, y - 21, Math.max(22, (barW * f.score) / 100), 22, 11);
    ctx.fill();
    y += 42;
  });

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 34px ${font}`;
  ctx.fillText(`Grade yours free → ${shareUrl.replace(/^https?:\/\//, "")}`, S / 2, 1018);
  ctx.fillStyle = "rgba(255,255,255,.5)";
  ctx.font = `500 21px ${font}`;
  ctx.fillText("Educational only. Not financial advice.", S / 2, 1054);
  return cv.toDataURL("image/png");
}

export default function PortfolioGrader({
  logoSrc = imaliLogo,
  apiBase = API_BASE,
  onLead,
  signupUrl = "/signup",
  pricingUrl = "/pricing",
  demoUrl = "/trade-demo",
  shareUrl = "https://imali-defi.com/grader",
}) {
  const [text, setText] = useState("");
  const [rows, setRows] = useState([]);
  const [apps, setApps] = useState(null);
  const [parseErr, setParseErr] = useState("");
  const [graded, setGraded] = useState(false);
  const [email, setEmail] = useState("");
  const [leadErr, setLeadErr] = useState("");
  const [sending, setSending] = useState(false);
  const [unlocked, setUnlocked] = useState(() => storage("imali_grader_unlocked") === "1");
  const [shareImg, setShareImg] = useState("");
  const [copied, setCopied] = useState(false);
  const [barsIn, setBarsIn] = useState(false);
  const resultRef = useRef(null);

  const links = { signup: signupUrl, pricing: pricingUrl, demo: demoUrl };
  const result = useMemo(() => (graded ? gradePortfolio(rows, apps) : null), [graded, rows, apps]);
  const shown = useCountUp(result ? result.score : null);
  const total = rows.reduce((s, r) => s + (Number(r.value) > 0 ? Number(r.value) : 0), 0);
  const canGrade = rows.some((r) => r.sym && Number(r.value) > 0) && apps != null;
  const mood = !result ? "ok" : result.score >= 75 ? "happy" : result.score >= 55 ? "ok" : "worried";

  const resultKey = result ? `${result.letter}-${Math.round(result.score)}` : "";
  useEffect(() => { setShareImg(""); }, [resultKey]);

  function fillFromText(src = text) {
    const parsed = parseHoldings(src);
    if (!parsed.length) {
      setParseErr("Couldn't read that. Try something like: 40% BTC, 30% SOL, 30% cash");
      return [];
    }
    setParseErr("");
    const next = parsed.map((p) => newRow(p.sym, String(+p.value.toFixed(4))));
    setRows(next);
    return next;
  }

  function loadExample(ex) {
    setText(ex.text);
    fillFromText(ex.text);
    setApps(ex.apps);
    setGraded(false);
  }

  function updateRow(id, patch) {
    setRows((rs) => rs.map((r) => {
      if (r.id !== id) return r;
      const next = { ...r, ...patch };
      if (patch.sym !== undefined) {
        const g = guessType(patch.sym);
        if (r.guessed || !r.sym) { next.type = g.type; next.guessed = !!patch.sym && g.guessed; }
      }
      if (patch.type !== undefined) next.guessed = false;
      return next;
    }));
  }

  function grade() {
    let current = rows;
    if (!current.length && text.trim()) current = fillFromText();
    if (!current.length || apps == null) return;
    const r = gradePortfolio(current, apps);
    if (!r) return;
    setGraded(true);
    setBarsIn(false);
    setTimeout(() => setBarsIn(true), 60);
    track("grader_graded", { grade: r.letter, score: Math.round(r.score) });
    setTimeout(() => resultRef.current && resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  async function submitLead(e) {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) { setLeadErr("Please enter a valid email."); return; }
    setLeadErr("");
    setSending(true);
    const lead = {
      email: email.trim(),
      grade: result.letter,
      score: Math.round(result.score),
      factors: Object.fromEntries(result.factors.map((f) => [f.key.startsWith("cash") ? "cash" : f.key, Math.round(f.score)])),
      holdings: result.items.map((i) => ({ sym: i.sym, type: i.type, weight: +i.w.toFixed(4) })),
      apps,
      source: "portfolio-grader",
      ts: new Date().toISOString(),
    };
    try {
      if (onLead) await onLead(lead);
      if (apiBase) {
        const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
        const timer = ctrl && setTimeout(() => ctrl.abort(), 7000);
        await fetch(`${apiBase.replace(/\/$/, "")}/api/grader/lead`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(lead),
          signal: ctrl ? ctrl.signal : undefined,
        });
        if (timer) clearTimeout(timer);
      }
    } catch (err) {
      // never block the user on a network hiccup
      if (typeof console !== "undefined") console.warn("[grader] lead save failed", err);
    }
    setSending(false);
    setUnlocked(true);
    storage("imali_grader_unlocked", "1");
    track("grader_lead", { grade: result.letter });
  }

  async function makeCard() {
    const url = await drawShareCard(result, logoSrc, shareUrl);
    setShareImg(url);
    track("grader_share_card", { grade: result.letter });
  }

  const shareText = result ? `My portfolio got a ${result.letter} on the IMALI Portfolio Grader 👀 Grade yours free: ${shareUrl}` : "";

  async function shareCard() {
    try {
      const blob = await (await fetch(shareImg)).blob();
      const file = new File([blob], `imali-portfolio-grade-${result.letter}.png`, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: shareText });
        return;
      }
    } catch (e) { /* fall through to download */ }
    const a = document.createElement("a");
    a.href = shareImg;
    a.download = `imali-portfolio-grade-${result ? result.letter : ""}.png`;
    a.click();
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) { /* clipboard blocked */ }
  }

  function reset() {
    setText(""); setRows([]); setApps(null); setGraded(false); setShareImg(""); setParseErr("");
    window.scrollTo && window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const R = 92, C = 2 * Math.PI * R;
  const tips = result ? tipsFor(result) : [];

  return (
    <div className="ipg">
      <style>{CSS}</style>
      <div className="ipg-wrap">
        <header className="ipg-hero">
          <Mascot logoSrc={logoSrc} mood={mood} />
          <h1>Portfolio <span>Grader</span></h1>
          <p className="ipg-sub">Get a free A–F grade in 30 seconds. No account, no exchange keys.</p>
        </header>

        <section className="ipg-card ipg-in">
          <div className="ipg-step"><span className="ipg-num">1</span>What do you hold?</div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"Type or paste it however you like:\n40% BTC, 30% SOL, 30% cash"}
            aria-label="Your holdings"
          />
          <div className="ipg-row-actions">
            <button className="ipg-btn" type="button" onClick={() => fillFromText()} disabled={!text.trim()}>Read my list ✨</button>
            <span className="ipg-muted">or try one:</span>
            {EXAMPLES.map((ex) => (
              <button key={ex.label} type="button" className="ipg-chip" onClick={() => loadExample(ex)}>{ex.label}</button>
            ))}
          </div>
          {parseErr && <div className="ipg-err">{parseErr}</div>}

          {rows.length > 0 && (
            <div className="ipg-table">
              <div className="ipg-hrow ipg-hhead ipg-muted"><span>Asset</span><span>Amount (% or $)</span><span>Type</span><span style={{ textAlign: "right" }}>Share</span><span /></div>
              {rows.map((r) => (
                <div className="ipg-hrow" key={r.id}>
                  <input value={r.sym} onChange={(e) => updateRow(r.id, { sym: e.target.value.toUpperCase() })} placeholder="BTC" aria-label="Asset" />
                  <input value={r.value} inputMode="decimal" onChange={(e) => updateRow(r.id, { value: e.target.value.replace(/[^\d.]/g, "") })} placeholder="40" aria-label="Amount" />
                  <select value={r.type} className={r.guessed ? "guess" : ""} title={r.guessed ? "We guessed this type — please check it" : ""}
                    onChange={(e) => updateRow(r.id, { type: e.target.value })} aria-label="Type">
                    {Object.entries(TYPES).map(([k, t]) => <option key={k} value={k}>{r.guessed && k === r.type ? `${t.label} (guess?)` : t.label}</option>)}
                  </select>
                  <span className="ipg-w">{total && Number(r.value) > 0 ? pct(Number(r.value) / total) : "–"}</span>
                  <button className="ipg-x" type="button" aria-label={`Remove ${r.sym}`} onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}>×</button>
                </div>
              ))}
              <div className="ipg-row-actions">
                <button className="ipg-chip" type="button" onClick={() => setRows((rs) => [...rs, newRow()])}>+ Add asset</button>
                <span className="ipg-muted">Use % or dollar amounts, not coin counts. We do the math.</span>
              </div>
            </div>
          )}
        </section>

        <section className="ipg-card ipg-in" style={{ animationDelay: ".1s" }}>
          <div className="ipg-step"><span className="ipg-num">2</span>How many trading apps or exchanges do you use?</div>
          <div className="ipg-row-actions">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" className={`ipg-chip ipg-appchip ${apps === n ? "on" : ""}`} onClick={() => setApps(n)}>
                {n === 5 ? "5+" : n}
              </button>
            ))}
          </div>
        </section>

        <div style={{ textAlign: "center", margin: "22px 0" }}>
          <button className="ipg-btn ipg-btn-main" type="button" onClick={grade} disabled={!canGrade && !(text.trim() && apps != null)}>
            {graded ? "Regrade 🔁" : "Grade my portfolio 🎯"}
          </button>
          {!canGrade && <div className="ipg-muted" style={{ marginTop: 8 }}>Add your holdings and pick how many apps you use.</div>}
        </div>

        {result && (
          <section ref={resultRef} className="ipg-card ipg-result ipg-in">
            <div className="ipg-muted" style={{ fontWeight: 800, letterSpacing: 1 }}>YOUR GRADE</div>
            <div className="ipg-ringwrap">
              <svg width="220" height="220" viewBox="0 0 220 220">
                <circle cx="110" cy="110" r={R} stroke="#ffffff14" strokeWidth="16" fill="none" />
                <circle cx="110" cy="110" r={R} stroke={result.color} strokeWidth="16" fill="none" strokeLinecap="round"
                  strokeDasharray={C} strokeDashoffset={C * (1 - shown / 100)} style={{ filter: `drop-shadow(0 0 8px ${result.color})` }} />
              </svg>
              <div key={result.letter} className="ipg-letter" style={{ color: result.color }}>{result.letter}</div>
            </div>
            <div className="ipg-score">{Math.round(shown)} / 100</div>
            <p className="ipg-blurb">{result.blurb}</p>

            <div className="ipg-factors">
              {result.factors.map((f, i) => {
                const fl = letterFor(f.score);
                return (
                  <div key={f.label}>
                    <div className="ipg-f-top"><span>{f.label}</span><span style={{ color: colorFor(fl) }}>{fl}</span></div>
                    <div className="ipg-bar"><i style={{ width: barsIn ? `${Math.max(3, f.score)}%` : "0%", background: colorFor(fl), transitionDelay: `${i * 0.12}s` }} /></div>
                    <div className="ipg-f-detail">{f.detail}</div>
                  </div>
                );
              })}
            </div>

            <div className="ipg-lockbox">
              <h3 className="ipg-h3">Your action plan</h3>
              <div className={unlocked ? "" : "ipg-locked"} aria-hidden={!unlocked}>
                {tips.map((t) => (
                  <div className="ipg-tip" key={t.title}>
                    <span className="ipg-word">📘 Word to know: {t.word}</span>
                    <h4>{t.title}</h4>
                    <p>{t.body}</p>
                    <a className="ipg-btn ipg-btn-green" href={links[t.link]} onClick={() => track("grader_cta", { cta: t.link, factor: t.factor })}>{t.cta} →</a>
                    <span className="ipg-plan">{t.plan}</span>
                  </div>
                ))}
              </div>
              {!unlocked && (
                <div className="ipg-gate">
                  <div className="ipg-gate-card">
                    <div style={{ fontSize: 30 }}>🔓</div>
                    <strong style={{ fontSize: 18 }}>Unlock your action plan + share card</strong>
                    <div className="ipg-muted" style={{ marginTop: 4 }}>Free. We'll email you your report and beginner trading tips.</div>
                    <form onSubmit={submitLead}>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" aria-label="Email" autoComplete="email" />
                      <button className="ipg-btn ipg-btn-main" type="submit" disabled={sending} style={{ fontSize: 16, padding: "12px 18px" }}>
                        {sending ? "Unlocking…" : "Unlock"}
                      </button>
                    </form>
                    {leadErr && <div className="ipg-err">{leadErr}</div>}
                    <div className="ipg-muted" style={{ fontSize: 11, marginTop: 8 }}>Unsubscribe anytime. We never ask for keys or passwords.</div>
                  </div>
                </div>
              )}
            </div>

            {unlocked && (
              <div className="ipg-share ipg-in">
                <h3 className="ipg-h3">Show off your grade</h3>
                {!shareImg ? (
                  <button className="ipg-btn ipg-btn-main" type="button" onClick={makeCard}>Make my share card 📸</button>
                ) : (
                  <>
                    <img src={shareImg} alt={`Portfolio grade ${result.letter} share card`} />
                    <div className="ipg-muted">On your phone? Press and hold the image to save it.</div>
                    <div className="ipg-row-actions" style={{ justifyContent: "center" }}>
                      <button className="ipg-btn ipg-btn-main" type="button" onClick={shareCard} style={{ fontSize: 16 }}>Share / save</button>
                      <button className="ipg-btn" type="button" onClick={copyText}>{copied ? "Copied ✓" : "Copy caption"}</button>
                      <a className="ipg-btn" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>Post on X</a>
                    </div>
                  </>
                )}
              </div>
            )}

            <details>
              <summary>How we grade</summary>
              <ul>
                <li><b>Concentration (25%)</b>: your biggest single position. Under 25% scores full marks. Index funds, bonds and cash count less because they're already spread out or stable.</li>
                <li><b>Spread (20%)</b>: how many holdings are at least 5% of your money (an index or bond fund counts as 3), and how many of the 3 groups you cover: crypto, stocks, and cash/bonds.</li>
                <li><b>Risk level (25%)</b>: a rough typical yearly swing for each type, from cash (0%) to BTC/ETH (~60%) to meme coins (~110%), averaged by weight.</li>
                <li><b>Cash balance (15%)</b>: 5–25% in cash or stablecoins is ideal. Less leaves no room to buy dips; much more means money sitting still.</li>
                <li><b>App juggling (15%)</b>: one place scores best. Every extra app makes it harder to see the full picture.</li>
              </ul>
              <div>A: 90+ · B: 70–89 · C: 55–69 · D: 45–54 · F: under 45</div>
            </details>

            <div style={{ marginTop: 16 }}>
              <button className="ipg-btn" type="button" onClick={reset}>Grade another portfolio</button>
            </div>
          </section>
        )}

        <p className="ipg-disc">
          Educational tool only, not financial advice. Grades are based on general portfolio-structure rules of thumb and
          estimated volatility, not on predictions. IMALI never asks for your exchange keys to grade a portfolio.
        </p>
      </div>
    </div>
  );
}

const CSS = `
.ipg{--card:rgba(255,255,255,.06);--line:rgba(255,255,255,.13);--txt:#eef1ff;--mut:#a9b1d6;color:var(--txt);
  background:radial-gradient(1100px 560px at 8% -12%,#3a1d8a66,transparent),radial-gradient(900px 500px at 110% 8%,#0aa7ff33,transparent),linear-gradient(160deg,#0b1030,#1d1250);
  min-height:100%;padding:28px 14px 44px;font-family:Nunito,ui-rounded,system-ui,-apple-system,'Segoe UI',sans-serif;box-sizing:border-box;line-height:1.4}
.ipg *{box-sizing:border-box}
.ipg-wrap{max-width:760px;margin:0 auto}
.ipg-hero{text-align:center;margin-bottom:18px}
.ipg-mascot{width:88px;height:88px;object-fit:contain;animation:ipg-float 3.2s ease-in-out infinite;filter:drop-shadow(0 10px 22px #7c5cff77)}
.ipg h1{font-size:clamp(30px,7vw,46px);margin:8px 0 6px;font-weight:900;letter-spacing:-.5px}
.ipg h1 span{background:linear-gradient(90deg,#9b7dff,#22e3a1);-webkit-background-clip:text;background-clip:text;color:transparent}
.ipg-sub{color:var(--mut);font-size:16px;margin:0}
.ipg-card{background:var(--card);border:1px solid var(--line);border-radius:22px;padding:18px;margin:14px 0}
.ipg-step{display:flex;align-items:center;gap:10px;font-weight:800;font-size:18px;margin-bottom:12px}
.ipg-num{flex:0 0 30px;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#7c5cff,#3cc8ff);font-size:15px}
.ipg textarea,.ipg input,.ipg select{width:100%;background:rgba(0,0,0,.35);border:1px solid var(--line);color:var(--txt);border-radius:12px;padding:12px;font:inherit;font-size:16px;outline:none;transition:border-color .2s,box-shadow .2s}
.ipg select option{background:#14183d}
.ipg textarea:focus,.ipg input:focus,.ipg select:focus{border-color:#7c5cff;box-shadow:0 0 0 3px #7c5cff33}
.ipg textarea{min-height:84px;resize:vertical}
.ipg-row-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;align-items:center}
.ipg-btn{border:0;border-radius:999px;padding:11px 18px;font:inherit;font-weight:800;cursor:pointer;color:#fff;background:rgba(255,255,255,.1);transition:transform .15s,background .2s,box-shadow .2s}
.ipg-btn:hover{transform:translateY(-2px) scale(1.03);background:rgba(255,255,255,.16)}
.ipg-btn:active{transform:scale(.96)}
.ipg-btn:disabled{opacity:.45;cursor:not-allowed;transform:none;animation:none}
.ipg-btn-main{background:linear-gradient(135deg,#7c5cff,#3cc8ff);box-shadow:0 10px 30px #7c5cff55;font-size:18px;padding:15px 28px}
.ipg-btn-main:hover{background:linear-gradient(135deg,#8d70ff,#55d2ff);box-shadow:0 14px 36px #7c5cff77}
.ipg-btn-main:not(:disabled){animation:ipg-bob 2.4s ease-in-out infinite}
.ipg-btn-green{background:linear-gradient(135deg,#16c98d,#22e3a1);color:#052018}
.ipg-btn-green:hover{background:linear-gradient(135deg,#1ad89a,#4af0b6)}
.ipg-chip{border:1px solid var(--line);background:rgba(255,255,255,.05);color:var(--txt);border-radius:999px;padding:8px 14px;font:inherit;font-weight:700;font-size:14px;cursor:pointer;transition:all .15s}
.ipg-chip:hover{border-color:#7c5cff;transform:translateY(-2px)}
.ipg-chip.on{background:linear-gradient(135deg,#7c5cff,#3cc8ff);border-color:transparent;transform:scale(1.08);box-shadow:0 6px 18px #7c5cff55}
.ipg-appchip{min-width:58px;font-size:18px;padding:10px 16px}
.ipg-muted{color:var(--mut);font-size:13px}
.ipg-err{color:#ff8fa3;font-size:14px;margin-top:8px}
.ipg-table{margin-top:14px;display:grid;gap:8px}
.ipg-hrow{display:grid;grid-template-columns:1fr 1fr 1.7fr 52px 30px;gap:8px;align-items:center}
.ipg-hrow input,.ipg-hrow select{padding:9px 10px;font-size:15px}
.ipg-hrow select.guess{border-color:#ffd23f99}
.ipg-hhead{font-weight:700}
.ipg-w{font-weight:800;text-align:right;font-size:14px}
.ipg-x{background:none;border:0;color:var(--mut);font-size:22px;cursor:pointer;line-height:1}
.ipg-x:hover{color:#ff8fa3}
@media(max-width:560px){.ipg-hrow{grid-template-columns:1fr 1fr 48px 26px}.ipg-hrow select{grid-column:1/-1;order:5}.ipg-hhead{display:none}}
.ipg-result{text-align:center;padding:24px 18px;scroll-margin-top:16px}
.ipg-ringwrap{position:relative;width:220px;height:220px;margin:4px auto 2px}
.ipg-ringwrap svg{transform:rotate(-90deg);overflow:visible}
.ipg-letter{position:absolute;inset:0;display:grid;place-items:center;font-size:88px;font-weight:900;animation:ipg-pop .9s cubic-bezier(.2,1.6,.4,1) both;text-shadow:0 0 34px currentColor}
.ipg-score{font-size:20px;font-weight:900}
.ipg-blurb{color:var(--mut);margin:6px 0 0;font-size:16px}
.ipg-factors{display:grid;gap:14px;text-align:left;margin-top:20px}
.ipg-f-top{display:flex;justify-content:space-between;font-weight:800;font-size:15px}
.ipg-bar{height:12px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden;margin:6px 0 4px}
.ipg-bar i{display:block;height:100%;border-radius:99px;transition:width 1.1s cubic-bezier(.2,.9,.3,1)}
.ipg-f-detail{font-size:13px;color:var(--mut)}
.ipg-h3{margin:22px 0 10px;font-size:19px;font-weight:900}
.ipg-lockbox{position:relative;min-height:240px}
.ipg-locked{filter:blur(7px);pointer-events:none;user-select:none;opacity:.65}
.ipg-gate{position:absolute;inset:40px 0 0;display:flex;align-items:center;justify-content:center;padding:10px}
.ipg-gate-card{background:rgba(11,16,48,.94);border:1px solid #7c5cff88;border-radius:20px;padding:18px;max-width:430px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.55)}
.ipg-gate form{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}
.ipg-gate input{flex:1 1 190px}
.ipg-tip{background:rgba(255,255,255,.04);border:1px solid var(--line);border-radius:16px;padding:14px;margin-bottom:10px;text-align:left}
.ipg-tip h4{margin:0 0 6px;font-size:17px}
.ipg-tip p{margin:0 0 12px;color:#d6dbf5;font-size:14px;line-height:1.55}
.ipg-word{display:inline-block;font-size:12px;font-weight:800;color:#22e3a1;background:rgba(34,227,161,.12);border-radius:99px;padding:3px 10px;margin-bottom:8px}
.ipg-plan{font-size:12px;color:var(--mut);margin-left:10px;white-space:nowrap}
.ipg-tip a.ipg-btn{text-decoration:none;display:inline-block;font-size:14px;padding:9px 16px}
.ipg-share img{width:100%;max-width:360px;border-radius:16px;margin:6px auto 8px;display:block;box-shadow:0 14px 40px rgba(0,0,0,.5)}
.ipg details{margin-top:20px;color:var(--mut);font-size:14px;text-align:left}
.ipg details summary{cursor:pointer;font-weight:800;color:var(--txt)}
.ipg details li{margin:6px 0}
.ipg-disc{font-size:12px;color:var(--mut);text-align:center;margin-top:18px;line-height:1.5}
.ipg-in{animation:ipg-in .5s ease both}
@keyframes ipg-float{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-8px) rotate(3deg)}}
@keyframes ipg-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
@keyframes ipg-pop{0%{transform:scale(0) rotate(-25deg);opacity:0}60%{transform:scale(1.18) rotate(6deg);opacity:1}100%{transform:scale(1) rotate(0)}}
@keyframes ipg-in{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.ipg *{animation:none!important;transition:none!important}}
`;
