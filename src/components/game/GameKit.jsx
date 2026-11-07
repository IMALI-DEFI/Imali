// src/components/game/GameKit.jsx
// Video-game layer for IMALI: player level + XP, quests, and Trading School lessons with quizzes.
// Named exports only (new file) — nothing existing depends on it.
import React, { useCallback, useEffect, useState } from "react";
import imaliLogo from "../../assets/imali-logo.png";

const STORE_KEY = "imali_game_v1";
const XP_PER_LEVEL = 100;
const RANKS = ["Rookie", "Explorer", "Trader", "Strategist", "Pro", "Legend"];
const RANK_EMOJI = ["🐣", "🧭", "📈", "🧠", "💎", "👑"];

export const LESSONS = [
  {
    id: "price", emoji: "🛒", title: "Why prices move",
    teach: "A price goes UP when more people want to buy than sell. It goes DOWN when more people want to sell. That's supply and demand.",
    q: "Lots of people suddenly want to buy Bitcoin. What usually happens to the price?",
    options: ["It goes up", "It goes down", "Nothing"], answer: 0,
  },
  {
    id: "profit", emoji: "💰", title: "How a trade makes money",
    teach: "Buy something, then sell it for more than you paid. The difference is your profit. Sell for less, and that's a loss.",
    q: "You buy a coin for $10 and sell it for $12. What happened?",
    options: ["You lost $2", "You made $2", "You made $12"], answer: 1,
  },
  {
    id: "candles", emoji: "🕯️", title: "Reading the chart",
    teach: "Each bar on the chart is a 'candle' for a slice of time. Green means the price ended higher than it started. Red means it ended lower.",
    q: "A red candle means the price…",
    options: ["Went up", "Went down", "Stayed the same"], answer: 1,
  },
  {
    id: "stoploss", emoji: "🛑", title: "Stop-loss: your safety net",
    teach: "A stop-loss tells the robot: 'If the price drops this much, sell and get out.' It keeps a small loss from becoming a big one.",
    q: "What is a stop-loss for?",
    options: ["Making losses smaller", "Buying more when price drops", "Turning the robot off"], answer: 0,
  },
  {
    id: "risk", emoji: "🎢", title: "Risk vs. reward",
    teach: "Bigger possible wins almost always come with bigger possible losses. A careful style wins smaller but steadier. A bold style swings both ways.",
    q: "A strategy promises really big wins. What should you expect?",
    options: ["No risk at all", "Bigger possible losses too", "Guaranteed money"], answer: 1,
  },
  {
    id: "baskets", emoji: "🧺", title: "Don't put all your eggs in one basket",
    teach: "Spreading money across different things (diversifying) means one bad pick doesn't sink everything.",
    q: "Why spread your money across different things?",
    options: ["So one bad pick hurts less", "To pay more fees", "It always doubles your money"], answer: 0,
  },
  {
    id: "fees", emoji: "🧾", title: "Fees add up",
    teach: "Exchanges charge a small fee on every trade. Lots of tiny trades can mean lots of fees, so a win has to beat the fee to really count.",
    q: "You win $1 on a trade but paid $1.20 in fees. Did you come out ahead?",
    options: ["Yes", "No — you're down $0.20", "Fees don't matter"], answer: 1,
  },
  {
    id: "golden", emoji: "⭐", title: "The golden rule",
    teach: "Only trade money you can afford to lose. No robot wins every trade, and past results don't promise future ones. Practice first!",
    q: "Which money should you trade with?",
    options: ["Rent money", "Money you can afford to lose", "Borrowed money"], answer: 1,
  },
];

function readStore() {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return { lessonsDone: Array.isArray(parsed?.lessonsDone) ? parsed.lessonsDone : [] };
  } catch {
    return { lessonsDone: [] };
  }
}

function writeStore(data) {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch {
    // storage blocked: progress lasts this visit only
  }
}

/** Lesson progress (saved in this browser). Each finished lesson = 25 XP. */
export function useGameProgress() {
  const [store, setStore] = useState(() => readStore());
  useEffect(() => { writeStore(store); }, [store]);
  const completeLesson = useCallback((id) => {
    setStore((s) => (s.lessonsDone.includes(id) ? s : { ...s, lessonsDone: [...s.lessonsDone, id] }));
  }, []);
  return { lessonsDone: store.lessonsDone, lessonXp: store.lessonsDone.length * 25, completeLesson };
}

export function levelFromXp(xp) {
  const safe = Math.max(0, Math.floor(Number(xp) || 0));
  const level = Math.floor(safe / XP_PER_LEVEL) + 1;
  const rankIndex = Math.min(RANKS.length - 1, Math.floor((level - 1) / 2));
  return { xp: safe, level, into: safe % XP_PER_LEVEL, need: XP_PER_LEVEL, rank: RANKS[rankIndex], rankEmoji: RANK_EMOJI[rankIndex] };
}

/** Player card: avatar, name, level, XP bar, optional coin counter. */
export function PlayerHUD({ name = "Player", xp = 0, coins, coinsLabel = "Coins", streak = 0 }) {
  const lv = levelFromXp(xp);
  return (
    <section className="fun-hud" aria-label="Player status">
      <div className="fun-hud-avatar" aria-hidden="true">{lv.rankEmoji}</div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-black text-lg truncate">{name}</span>
          <span className="fun-hud-level">LV {lv.level}</span>
          <span className="fun-pill">{lv.rank}</span>
          {streak > 0 && <span className="fun-pill">🔥 {streak} streak</span>}
        </div>
        <div className="fun-xp mt-2" role="progressbar" aria-valuemin={0} aria-valuemax={lv.need} aria-valuenow={lv.into} aria-label="XP to next level">
          <div style={{ width: `${(lv.into / lv.need) * 100}%` }} />
          <span>{lv.into} / {lv.need} XP to level {lv.level + 1}</span>
        </div>
      </div>
      {coins !== undefined && (
        <div className="fun-hud-coins">
          <span className="text-2xl fun-float" aria-hidden="true">🪙</span>
          <div>
            <div className="font-black text-xl leading-none">{coins}</div>
            <div className="text-[11px] font-bold text-white/70">{coinsLabel}</div>
          </div>
        </div>
      )}
    </section>
  );
}

/** Quest checklist. quests: [{ id, emoji, title, done, xp, action?: { label, onClick } }] */
export function QuestList({ title = "🗺️ Quests", quests = [] }) {
  const doneCount = quests.filter((q) => q.done).length;
  return (
    <section className="fun-card" aria-label="Quests">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-black text-xl">{title}</h2>
        <span className="fun-pill">{doneCount}/{quests.length} done</span>
      </div>
      <ul className="space-y-2">
        {quests.map((q) => (
          <li key={q.id} className={`fun-quest ${q.done ? "is-done" : ""}`}>
            <span className="text-2xl" aria-hidden="true">{q.done ? "✅" : q.emoji}</span>
            <span className="flex-1 font-bold">{q.title}</span>
            {!q.done && q.action ? (
              <button type="button" onClick={q.action.onClick} className="fun-btn fun-gold fun-small">{q.action.label}</button>
            ) : (
              <span className="fun-quest-xp">{q.done ? "Done!" : `+${q.xp || 10} XP`}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Trading School: short lesson + one-question quiz, +25 XP each. */
export function TradingSchool({ lessonsDone = [], onComplete }) {
  const [openId, setOpenId] = useState(null);
  const [picked, setPicked] = useState(null);
  const lesson = LESSONS.find((l) => l.id === openId);

  const open = (id) => { setOpenId(id); setPicked(null); };
  const choose = (i) => {
    setPicked(i);
    if (lesson && i === lesson.answer && onComplete) onComplete(lesson.id);
  };
  const nextLesson = LESSONS.find((l) => !lessonsDone.includes(l.id) && l.id !== openId);

  return (
    <section className="fun-card" aria-label="Trading School">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-black text-xl">🎓 Trading School</h2>
        <span className="fun-pill">{lessonsDone.length}/{LESSONS.length} lessons</span>
      </div>
      <p className="fun-help text-sm mb-4">1-minute lessons. Get the question right to earn +25 XP.</p>

      {lesson ? (
        <div className="fun-lesson fun-slide-in">
          <div className="text-5xl" aria-hidden="true"><span className="fun-bounce">{lesson.emoji}</span></div>
          <h3 className="text-2xl font-black mt-2">{lesson.title}</h3>
          <p className="fun-help mt-2">{lesson.teach}</p>
          <p className="font-black mt-4">❓ {lesson.q}</p>
          <div className="grid gap-2 mt-3 sm:grid-cols-3">
            {lesson.options.map((opt, i) => {
              const look = picked === null ? "" : i === lesson.answer && picked === lesson.answer ? "is-right" : i === picked ? "is-wrong" : "";
              return (
                <button key={opt} type="button" disabled={picked === lesson.answer}
                  onClick={() => choose(i)} className={`fun-answer ${look}`}>
                  {opt}
                </button>
              );
            })}
          </div>
          {picked !== null && (
            <p className="mt-3 font-black fun-pop" role="status">
              {picked === lesson.answer ? "🎉 Correct! +25 XP" : "Not quite — try another answer!"}
            </p>
          )}
          <div className="flex flex-wrap gap-2 mt-4">
            {picked === lesson.answer && nextLesson && (
              <button type="button" onClick={() => open(nextLesson.id)} className="fun-btn fun-green fun-small">Next lesson ➡️</button>
            )}
            <button type="button" onClick={() => setOpenId(null)} className="fun-btn fun-ghost fun-small">⬅️ All lessons</button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {LESSONS.map((l, i) => {
            const done = lessonsDone.includes(l.id);
            return (
              <button key={l.id} type="button" onClick={() => open(l.id)}
                className={`fun-tile ${["fun-blue", "fun-green", "fun-purple", "fun-orange"][i % 4]} ${done ? "is-picked" : ""}`}
                style={{ minHeight: 120 }}>
                <span className="fun-emoji" style={{ fontSize: "2.4rem" }} aria-hidden="true">{l.emoji}</span>
                <strong style={{ fontSize: ".95rem" }}>{l.title}</strong>
                <small>{done ? "Done ✓" : "+25 XP"}</small>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------
   Mascot + page hero (uses the IMALI logo instead of an emoji robot)
------------------------------------------------------------------- */

/** The IMALI logo as a floating, glowing mascot. size = CSS size (e.g. 96 or "6rem"). */
export function MascotLogo({ size = 96, bounce = true, className = "" }) {
  return (
    <img
      src={imaliLogo}
      alt="IMALI"
      className={`fun-mascot ${bounce ? "fun-mascot-move" : ""} ${className}`}
      style={{ width: size, height: size }}
      loading="eager"
    />
  );
}

/** Sparkle page header used across the site. */
export function FunHero({ title, subtitle, badge, children, mascot = true, emoji }) {
  return (
    <header className="fun-sparkle p-6 sm:p-10 text-center">
      <div className="fun-sparkles" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
      {badge && <div className="fun-pill mb-3">{badge}</div>}
      {mascot ? (
        <MascotLogo size={92} className="mx-auto" />
      ) : emoji ? (
        <div className="text-6xl"><span className="fun-bounce" aria-hidden="true">{emoji}</span></div>
      ) : null}
      <h1 className="mt-3 text-3xl sm:text-5xl font-black leading-tight fun-shine-text">{title}</h1>
      {subtitle && <p className="fun-help text-lg mt-3 max-w-2xl mx-auto">{subtitle}</p>}
      {children && <div className="mt-6 flex flex-col sm:flex-row flex-wrap justify-center gap-3">{children}</div>}
    </header>
  );
}

/* ------------------------------------------------------------------
   Charts (pure SVG, no extra libraries)
------------------------------------------------------------------- */

/** Area line of a value over time. points: number[] (oldest → newest). */
export function BalanceChart({ points = [], start, height = 180, label = "Balance", money = true }) {
  const id = React.useId().replace(/:/g, "");
  const data = points.length >= 2 ? points : [start ?? points[0] ?? 0, start ?? points[0] ?? 0];
  const W = 600, H = height, padX = 8, padTop = 16, padBottom = 26;
  const min = Math.min(...data, start ?? Infinity);
  const max = Math.max(...data, start ?? -Infinity);
  const span = max - min || 1;
  const x = (i) => padX + (i * (W - padX * 2)) / (data.length - 1);
  const y = (v) => padTop + (1 - (v - min) / span) * (H - padTop - padBottom);
  const line = data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${x(0)},${H - padBottom} ${line} ${x(data.length - 1)},${H - padBottom}`;
  const last = data[data.length - 1];
  const first = start ?? data[0];
  const up = last >= first;
  const color = up ? "#4ff0a0" : "#ff7a80";
  const fmt = (v) => (money ? `$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : Number(v).toLocaleString());
  return (
    <figure className="fun-chart" aria-label={`${label} chart`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} role="img">
        <defs>
          <linearGradient id={`fill-${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity=".45" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={padX} x2={W - padX} y1={padTop + f * (H - padTop - padBottom)} y2={padTop + f * (H - padTop - padBottom)} stroke="#ffffff14" strokeDasharray="4 6" />
        ))}
        {start !== undefined && (
          <line x1={padX} x2={W - padX} y1={y(start)} y2={y(start)} stroke="#ffe07a66" strokeDasharray="6 6" />
        )}
        <polygon points={area} fill={`url(#fill-${id})`} />
        <polyline points={line} fill="none" stroke={color} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" className="fun-chart-line" />
        <circle cx={x(data.length - 1)} cy={y(last)} r="7" fill={color} stroke="#141842" strokeWidth="3" className="fun-chart-dot" />
        <text x={padX} y={H - 6} fill="#aab4ee" fontSize="13" fontWeight="700">Start {fmt(first)}</text>
        <text x={W - padX} y={H - 6} fill={color} fontSize="14" fontWeight="900" textAnchor="end">Now {fmt(last)}</text>
      </svg>
    </figure>
  );
}

/** Donut ring showing wins vs losses with the win rate in the middle. */
export function WinRing({ wins = 0, losses = 0, size = 150 }) {
  const total = wins + losses;
  const pct = total ? wins / total : 0;
  const r = 52, c = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 140 140" style={{ width: size, height: size }} role="img" aria-label={`Win rate ${Math.round(pct * 100)} percent`}>
        <circle cx="70" cy="70" r={r} fill="none" stroke={total ? "#ff7a80" : "#ffffff22"} strokeWidth="16" />
        <circle cx="70" cy="70" r={r} fill="none" stroke="#4ff0a0" strokeWidth="16" strokeLinecap="round"
          strokeDasharray={`${pct * c} ${c}`} transform="rotate(-90 70 70)" style={{ transition: "stroke-dasharray .6s ease" }} />
        <text x="70" y="68" textAnchor="middle" fill="#fff" fontSize="26" fontWeight="900">{Math.round(pct * 100)}%</text>
        <text x="70" y="88" textAnchor="middle" fill="#aab4ee" fontSize="12" fontWeight="700">win rate</text>
      </svg>
      <div className="space-y-2 text-sm font-bold">
        <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[#4ff0a0]" /> 🏆 {wins} wins</div>
        <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[#ff7a80]" /> 💔 {losses} losses</div>
        <div className="flex items-center gap-2 text-white/60"><span className="h-3 w-3 rounded-full bg-white/30" /> 🔢 {total} total</div>
      </div>
    </div>
  );
}
