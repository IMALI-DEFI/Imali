import React from "react";
import { Link } from "react-router-dom";
import {
    FaBolt,
    FaShieldAlt,
    FaChartBar,
    FaExclamationCircle,
    FaCheckCircle,
    FaExternalLinkAlt,
    FaQuestionCircle,
    FaEnvelope,
    FaChartLine,
    FaCog,
    FaPlay,
    FaDatabase,
    FaAward,
    FaBullseye,
    FaFire,
    FaBrain,
    FaExclamationTriangle,
    FaTachometerAlt,
    FaWallet,
    FaChartPie,
    FaList,
    FaMicrochip,
    FaSlidersH,
    FaCoins,
    FaUser,
} from "react-icons/fa";

export default function HowItWorks() {
    const card = "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm";

    const SectionTitle = ({ children, icon: Icon }) => (
        <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <Icon className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">{children}</h2>
        </div>
    );

    const Callout = ({ type, title, children }) => {
        const styles = {
            important: "border-amber-400 bg-amber-50",
            info: "border-blue-400 bg-blue-50",
            success: "border-emerald-400 bg-emerald-50",
            warning: "border-rose-400 bg-rose-50",
        };
        const icons = {
            important: <FaExclamationCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />,
            info: <FaQuestionCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />,
            success: <FaCheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />,
            warning: <FaExclamationTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />,
        };
        return (
            <div className={`border-l-4 ${styles[type]} rounded-r-xl p-4 bg-white shadow-sm`}>
                <div className="flex items-start gap-3">
                    {icons[type]}
                    <div>
                        <span className="font-bold text-slate-900">{title}</span>
                        <div className="text-slate-700 text-sm mt-0.5">{children}</div>
                    </div>
                </div>
            </div>
        );
    };

    const StrategyCard = ({ name, description, level, icon: Icon }) => {
        const colors = {
            Conservative: "border-emerald-200 bg-emerald-50/50",
            "Balanced AI": "border-blue-200 bg-blue-50/50",
            Growth: "border-amber-200 bg-amber-50/50",
            Aggressive: "border-rose-200 bg-rose-50/50",
        };
        const levelColors = {
            Conservative: "text-emerald-700 bg-emerald-100",
            "Balanced AI": "text-blue-700 bg-blue-100",
            Growth: "text-amber-700 bg-amber-100",
            Aggressive: "text-rose-700 bg-rose-100",
        };
        return (
            <div className={`rounded-2xl border p-5 ${colors[name]} transition hover:shadow-md`}>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-white shadow-sm">
                            <Icon className="w-5 h-5 text-slate-700" />
                        </div>
                        <h4 className="font-bold text-slate-900">{name}</h4>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${levelColors[name]}`}>
                        {level}
                    </span>
                </div>
                <p className="text-sm text-slate-700 mt-2 leading-relaxed">{description}</p>
            </div>
        );
    };

    return (
        <div className="bg-slate-50 min-h-screen text-slate-900">
            <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6">

                {/* ===== WELCOME ===== */}
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 rounded-2xl bg-indigo-100">
                            <FaBolt className="w-8 h-8 text-indigo-600" />
                        </div>
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
                        Welcome to <span className="text-indigo-600">IMALI</span>
                    </h1>
                    <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
                        Your AI‑assisted trading companion. This guide walks you through everything you need to know — from setup to going live.
                    </p>
                </div>

                {/* ===== HOW IMALI WORKS ===== */}
                <section className="mb-16">
                    <SectionTitle icon={FaCog}>How IMALI Works</SectionTitle>
                    <p className="text-slate-600 mb-6 text-sm">
                        IMALI connects to supported exchange accounts and can execute paper or live trades based on the strategy and mode you choose. Here's what you need to do, and why each step matters:
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className={card}>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold">1</span>
                                <h3 className="font-bold text-slate-900">Connect Your Exchange</h3>
                            </div>
                            <p className="text-sm text-slate-600">Link your OKX or Alpaca account using API keys (read + trade only). This lets IMALI trade on your behalf while keeping your funds secure on the exchange.</p>
                        </div>
                        <div className={card}>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold">2</span>
                                <h3 className="font-bold text-slate-900">Choose a Strategy</h3>
                            </div>
                            <p className="text-sm text-slate-600">Pick a trading style that matches your risk tolerance. Start with conservative or balanced, then adjust as you gain confidence.</p>
                        </div>
                        <div className={card}>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold">3</span>
                                <h3 className="font-bold text-slate-900">Practice with Paper Trading</h3>
                            </div>
                            <p className="text-sm text-slate-600">Use virtual funds to test the bot and learn the dashboard. No real money at risk — it's the safest way to build confidence.</p>
                        </div>
                        <div className={card}>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold">4</span>
                                <h3 className="font-bold text-slate-900">Go Live</h3>
                            </div>
                            <p className="text-sm text-slate-600">When you're comfortable, switch to live trading with an amount you're willing to risk. IMALI handles the rest, with risk management built in.</p>
                        </div>
                    </div>
                </section>

                {/* ===== PAPER VS LIVE ===== */}
                <section className="mb-16">
                    <SectionTitle icon={FaPlay}>Paper Trading vs. Live Trading</SectionTitle>
                    <p className="text-slate-600 text-sm mb-4">
                        Understanding the difference helps you decide when to make the switch.
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
                            <h3 className="font-bold text-emerald-700 flex items-center gap-2">
                                <FaPlay className="w-4 h-4" /> Paper Trading
                            </h3>
                            <p className="text-sm text-slate-700 mt-1 leading-relaxed">
                                Trade with virtual funds. No real money at risk. Perfect for learning the dashboard, testing strategies, and building confidence.
                            </p>
                            <ul className="mt-3 space-y-1 text-xs text-slate-600">
                                <li className="flex items-center gap-2">• Real‑time market data with simulated trades</li>
                                <li className="flex items-center gap-2">• Similar workflow to live trading, without using real funds</li>
                                <li className="flex items-center gap-2">• No financial risk — practice freely</li>
                            </ul>
                            <p className="text-xs text-slate-500 mt-2 italic">What to do: Start here. Use paper trading until you're comfortable with the dashboard and the bot's behavior.</p>
                        </div>
                        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5">
                            <h3 className="font-bold text-blue-700 flex items-center gap-2">
                                <FaBolt className="w-4 h-4" /> Live Trading
                            </h3>
                            <p className="text-sm text-slate-700 mt-1 leading-relaxed">
                                Trade with real funds. Executes actual orders on your exchange accounts. Start only when you're comfortable and confident.
                            </p>
                            <ul className="mt-3 space-y-1 text-xs text-slate-600">
                                <li className="flex items-center gap-2">• Real orders placed on OKX or Alpaca</li>
                                <li className="flex items-center gap-2">• All risk management rules apply</li>
                                <li className="flex items-center gap-2">• Start small, scale as you gain confidence</li>
                            </ul>
                            <p className="text-xs text-slate-500 mt-2 italic">What to do: When you're ready, switch to live with a small amount. Monitor the dashboard regularly.</p>
                        </div>
                    </div>
                    <Callout type="info" title="New to trading?">
                        Start with Paper Trading. Practice using virtual funds until you're comfortable with the dashboard and strategies.
                    </Callout>
                </section>

                {/* ===== CRYPTO VS STOCKS ===== */}
                <section className="mb-16">
                    <SectionTitle icon={FaDatabase}>Crypto (OKX) vs. Stocks (Alpaca)</SectionTitle>
                    <p className="text-slate-600 text-sm mb-4">
                        Choose the market that fits your interests and risk appetite.
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className={card}>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">₿</span>
                                <h3 className="font-bold text-slate-900">OKX — Crypto</h3>
                            </div>
                            <p className="text-sm text-slate-600">Trade cryptocurrencies like BTC, ETH, and more. 24/7 markets with high volatility.</p>
                            <ul className="mt-2 text-xs text-slate-500 space-y-0.5">
                                <li>• Spot and futures trading supported</li>
                                <li>• Wide range of crypto pairs</li>
                                <li>• Higher volatility = more frequent opportunities</li>
                            </ul>
                            <p className="text-xs text-slate-500 mt-2 italic">When to use: If you're comfortable with crypto and want round‑the‑clock trading.</p>
                        </div>
                        <div className={card}>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">📈</span>
                                <h3 className="font-bold text-slate-900">Alpaca — Stocks</h3>
                            </div>
                            <p className="text-sm text-slate-600">Trade US stocks and ETFs. Traditional market hours with extended trading options.</p>
                            <ul className="mt-2 text-xs text-slate-500 space-y-0.5">
                                <li>• US equities and ETFs</li>
                                <li>• Market hours with pre/post market</li>
                                <li>• Lower volatility, more stable trends</li>
                            </ul>
                            <p className="text-xs text-slate-500 mt-2 italic">When to use: If you prefer stocks and want a more predictable trading environment.</p>
                        </div>
                    </div>
                </section>

                {/* ===== THE BOTS BEHIND IMALI ===== */}
                <section className="mb-16">
                    <SectionTitle icon={FaMicrochip}>The Bots Behind IMALI</SectionTitle>
                    <p className="text-slate-600 text-sm mb-4">
                        IMALI isn't a single bot — it's a platform that runs multiple specialised trading engines simultaneously. Each bot targets a different market and has its own adapter for order execution.
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className={card}>
                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                <span className="text-lg">₿</span> Crypto Spot Bot (OKX)
                            </h3>
                            <p className="text-sm text-slate-600 mt-1">
                                Scans supported USDT pairs on OKX at regular intervals. It uses a bulk ticker API to rank symbols by volatility and confidence, then enters trades with a predefined stop‑loss and take‑profit.
                            </p>
                            <ul className="mt-2 text-xs text-slate-500 space-y-0.5">
                                <li>• Hard stop‑loss at 2% below entry</li>
                                <li>• Take‑profit at 2‑4% (strategy dependent)</li>
                                <li>• Trailing stop that locks in gains after a trade moves 2% in profit</li>
                                <li>• Max 72‑hour hold time (exits small profits automatically)</li>
                            </ul>
                        </div>
                        <div className={card}>
                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                <span className="text-lg">📈</span> Crypto Futures Bot (OKX)
                            </h3>
                            <p className="text-sm text-slate-600 mt-1">
                                Trades perpetual swaps with isolated margin. It manages leverage (default 2x), checks funding rates, and uses reduce‑only orders to safely exit positions. Same risk rules as Spot, but with additional liquidation protection.
                            </p>
                            <ul className="mt-2 text-xs text-slate-500 space-y-0.5">
                                <li>• Long‑only by default; short support available</li>
                                <li>• Funding rate filter avoids expensive carry costs</li>
                                <li>• Liquidation distance check before every entry</li>
                            </ul>
                        </div>
                        <div className={card}>
                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                <span className="text-lg">🍎</span> Stock Bot (Alpaca)
                            </h3>
                            <p className="text-sm text-slate-600 mt-1">
                                Trades U.S. equities and ETFs through Alpaca. It respects market hours, checks buying power, and uses notional orders for fractional shares. Works with paper trading by default, live when you're ready.
                            </p>
                            <ul className="mt-2 text-xs text-slate-500 space-y-0.5">
                                <li>• Day‑trading protection (PDT check)</li>
                                <li>• Avoids low‑volume stocks and wide spreads</li>
                                <li>• Can use SPY/QQQ regime to filter entries</li>
                            </ul>
                        </div>
                        <div className={card}>
                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                <span className="text-lg">💧</span> DEX Sniper (On‑Chain)
                            </h3>
                            <p className="text-sm text-slate-600 mt-1">
                                Monitors decentralised exchanges for new token launches and liquidity spikes. When live, it can execute swaps with slippage protection. Paper‑mode logs trades for dashboard visibility without spending gas.
                            </p>
                            <ul className="mt-2 text-xs text-slate-500 space-y-0.5">
                                <li>• Honeypot / token tax detection</li>
                                <li>• Gas cost estimator – skips trades when gas is too high</li>
                                <li>• Auto‑take‑profit ladder (partial exits)</li>
                            </ul>
                        </div>
                    </div>
                    <Callout type="info" title="All bots share the same intelligence layer">
                        Where supported, market data and regime signals can be shared across bot systems. The HMM regime filter helps classify market conditions and can influence confidence thresholds across strategies.
                    </Callout>
                </section>

                {/* ===== CREATING API KEYS ===== */}
                <section className="mb-16">
                    <SectionTitle icon={FaShieldAlt}>Creating API Keys</SectionTitle>
                    <p className="text-slate-600 text-sm mb-4">
                        To connect IMALI to your exchange, you'll need to generate API keys. Follow your exchange's instructions carefully.
                    </p>
                    <div className="space-y-3">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-start gap-4">
                            <FaCheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <span className="font-bold text-slate-900">Read Permission</span>
                                <p className="text-sm text-slate-600">Allows IMALI to view your account balance, positions, and order history.</p>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-start gap-4">
                            <FaCheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <span className="font-bold text-slate-900">Trade Permission</span>
                                <p className="text-sm text-slate-600">Allows IMALI to place, modify, and cancel orders on your behalf.</p>
                            </div>
                        </div>
                    </div>
                    <Callout type="important" title="Never enable withdrawal permissions">
                        IMALI only requires <span className="font-bold">Read</span> and <span className="font-bold">Trade</span> access. Never enable withdrawal permissions on your exchange API keys. When users create exchange API keys correctly with withdrawals disabled, IMALI cannot withdraw funds from the exchange account.
                    </Callout>
                </section>

                {/* ===== CONNECTING EXCHANGE ACCOUNTS ===== */}
                <section className="mb-16">
                    <SectionTitle icon={FaExternalLinkAlt}>Connecting Exchange Accounts</SectionTitle>
                    <p className="text-slate-600 text-sm mb-4">
                        Once you have your API keys, connect your exchange account directly in the IMALI dashboard.
                    </p>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-slate-700 bg-white rounded-2xl border border-slate-200 p-5">
                        <li>Go to the <span className="font-bold">Dashboard</span> and click <span className="font-bold">Connect Exchange</span></li>
                        <li>Select your exchange (OKX or Alpaca)</li>
                        <li>Enter your <span className="font-bold">API Key, Secret Key, and Passphrase if using OKX</span></li>
                        <li>Click <span className="font-bold">Connect</span> — IMALI will verify the connection</li>
                        <li>Once connected, you'll see your account balance and can start trading</li>
                    </ol>
                    <Callout type="info" title="Need help connecting?">
                        If you run into any issues, reach out to us at <span className="font-bold">imalidefi@gmail.com</span> — we'll walk you through it.
                    </Callout>
                </section>

                {/* ===== UNDERSTANDING YOUR DASHBOARD ===== */}
                <section className="mb-16">
                    <SectionTitle icon={FaTachometerAlt}>Understanding Your Dashboard</SectionTitle>
                    <p className="text-slate-600 text-sm mb-4">
                        Your IMALI Dashboard is your trading command center. Everything you need to monitor your account, control your trading bots, and review performance is available in one place.
                    </p>
                    <p className="text-slate-600 text-sm mb-4">
                        Whether you're practicing with paper trading or trading live, the dashboard gives you a real-time view of your account and lets you stay in control of your automation.
                    </p>

                    <div className="space-y-6">
                        {/* Account Status */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-5">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
                                <FaUser className="w-5 h-5 text-indigo-500" /> Account Status
                            </h3>
                            <p className="text-sm text-slate-600 mt-1">
                                The top of the dashboard shows your current membership plan, whether your bot is running or stopped, and whether you're using Paper Trading or Live Trading. It also displays your connected trading accounts and important account notifications.
                            </p>
                            <p className="text-xs text-slate-500 mt-2 italic">What to do: Check this section daily to ensure your bot is active and your account is in good standing.</p>
                        </div>

                        {/* Trading Markets */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-5">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
                                <FaChartLine className="w-5 h-5 text-indigo-500" /> Trading Markets
                            </h3>
                            <p className="text-sm text-slate-600 mt-1">
                                Choose which market you want to trade:
                            </p>
                            <ul className="list-disc list-inside text-sm text-slate-600 mt-1 space-y-0.5">
                                <li><span className="font-bold">Crypto</span> — Trade cryptocurrencies through OKX.</li>
                                <li><span className="font-bold">Futures</span> — Trade crypto futures (Elite Plan).</li>
                                <li><span className="font-bold">DEX</span> — Trade decentralized exchanges and supported DEX strategies (Elite Plan).</li>
                                <li><span className="font-bold">Stocks</span> — Trade U.S. stocks and ETFs through Alpaca.</li>
                            </ul>
                            <p className="text-xs text-slate-500 mt-2 italic">Some trading types require a higher subscription plan.</p>
                        </div>

                        {/* Connected Accounts */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-5">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
                                <FaExternalLinkAlt className="w-5 h-5 text-indigo-500" /> Connected Accounts
                            </h3>
                            <p className="text-sm text-slate-600 mt-1">
                                This section shows whether your OKX, Alpaca, or wallet connections are active. If an account is disconnected, you'll be prompted to reconnect before trading can begin.
                            </p>
                            <p className="text-xs text-slate-500 mt-2 italic">What to do: Ensure all your accounts show a green "Connected" status before starting the bot.</p>
                        </div>

                        {/* Account Overview */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-5">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
                                <FaChartPie className="w-5 h-5 text-indigo-500" /> Account Overview
                            </h3>
                            <p className="text-sm text-slate-600 mt-1">
                                View your portfolio at a glance, including:
                            </p>
                            <ul className="list-disc list-inside text-sm text-slate-600 mt-1 space-y-0.5">
                                <li>Total account value</li>
                                <li>Cash balance</li>
                                <li>USDT balance</li>
                                <li>Open positions</li>
                                <li>Total profit and loss</li>
                                <li>Win rate</li>
                                <li>Number of completed trades</li>
                            </ul>
                            <p className="text-xs text-slate-500 mt-2 italic">What to do: Use this as your primary performance snapshot. Check it regularly to track your bot's impact.</p>
                        </div>

                        {/* Portfolio & Assets */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-5">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
                                <FaWallet className="w-5 h-5 text-indigo-500" /> Portfolio &amp; Assets
                            </h3>
                            <p className="text-sm text-slate-600 mt-1">
                                The Assets section displays everything currently held in your connected trading account, including cryptocurrencies, stocks, cash, and stablecoins. Each asset shows:
                            </p>
                            <ul className="list-disc list-inside text-sm text-slate-600 mt-1 space-y-0.5">
                                <li>Current balance</li>
                                <li>Estimated market value</li>
                                <li>Percentage of your portfolio</li>
                            </ul>
                            <p className="text-xs text-slate-500 mt-2 italic">What to do: Review your asset allocation to understand where your capital is deployed.</p>
                        </div>

                        {/* Live Trade Feed */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-5">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
                                <FaList className="w-5 h-5 text-indigo-500" /> Live Trade Feed
                            </h3>
                            <p className="text-sm text-slate-600 mt-1">
                                Every completed trade appears in the Live Trade Feed. You'll see:
                            </p>
                            <ul className="list-disc list-inside text-sm text-slate-600 mt-1 space-y-0.5">
                                <li>Buy and sell activity</li>
                                <li>Paper or Live indicator</li>
                                <li>Entry and exit prices</li>
                                <li>Profit or loss</li>
                                <li>Time of execution</li>
                            </ul>
                            <p className="text-xs text-slate-500 mt-2 italic">What to do: Use this feed to audit your bot's performance and spot any unusual activity.</p>
                        </div>

                        {/* Active Bot */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-5">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
                                <FaMicrochip className="w-5 h-5 text-indigo-500" /> Active Bot
                            </h3>
                            <p className="text-sm text-slate-600 mt-1">
                                The Active Bot panel shows:
                            </p>
                            <ul className="list-disc list-inside text-sm text-slate-600 mt-1 space-y-0.5">
                                <li>Current strategy</li>
                                <li>Trading market</li>
                                <li>Paper or Live mode</li>
                                <li>Open positions</li>
                                <li>Maximum positions allowed</li>
                                <li>Start and Stop controls</li>
                            </ul>
                            <p className="text-sm text-slate-600 mt-1">
                                From here you can start, pause, or stop your trading bot at any time.
                            </p>
                            <p className="text-xs text-slate-500 mt-2 italic">What to do: Keep this panel in view — it's your main control center for automation.</p>
                        </div>

                        {/* Strategy Selection */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-5">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
                                <FaBullseye className="w-5 h-5 text-indigo-500" /> Strategy Selection
                            </h3>
                            <p className="text-sm text-slate-600 mt-1">
                                Choose the trading style that best matches your goals.
                            </p>
                            <ul className="list-disc list-inside text-sm text-slate-600 mt-1 space-y-0.5">
                                <li><span className="font-bold">Conservative</span> – Lower risk with fewer trades.</li>
                                <li><span className="font-bold">Balanced AI</span> – AI‑assisted strategy designed to balance opportunity and risk.</li>
                                <li><span className="font-bold">Growth</span> – Trend‑following strategy for stronger market momentum.</li>
                                <li><span className="font-bold">Aggressive</span> – Higher‑risk strategy with more frequent trading opportunities.</li>
                            </ul>
                            <p className="text-xs text-slate-500 mt-2 italic">What to do: Start with Conservative or Balanced, then adjust as you become more experienced. You can change strategies whenever the bot is stopped.</p>
                        </div>

                        {/* IMALI Utility */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-5">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
                                <FaCoins className="w-5 h-5 text-indigo-500" /> IMALI Utility
                            </h3>
                            <p className="text-sm text-slate-600 mt-1">
                                If you hold IMALI tokens, you'll be able to view your balance and any eligible platform discounts. Future platform benefits may include reduced subscription costs, exclusive features, governance participation, and early access to new functionality.
                            </p>
                            <p className="text-xs text-slate-500 mt-2 italic">What to do: Check this section to see if you qualify for any perks.</p>
                        </div>

                        {/* Settings */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-5">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
                                <FaSlidersH className="w-5 h-5 text-indigo-500" /> Settings
                            </h3>
                            <p className="text-sm text-slate-600 mt-1">
                                Use the Settings section to manage:
                            </p>
                            <ul className="list-disc list-inside text-sm text-slate-600 mt-1 space-y-0.5">
                                <li>Billing</li>
                                <li>Exchange connections</li>
                                <li>Wallet connections</li>
                                <li>Security</li>
                                <li>API keys</li>
                                <li>Notifications</li>
                                <li>Automation settings</li>
                            </ul>
                            <p className="text-xs text-slate-500 mt-2 italic">What to do: Review this area to keep your account secure and up‑to‑date.</p>
                        </div>
                    </div>
                </section>

                {/* ===== STRATEGIES DETAILED ===== */}
                <section className="mb-16">
                    <SectionTitle icon={FaBullseye}>Choosing a Strategy</SectionTitle>
                    <p className="text-slate-600 text-sm mb-4">
                        IMALI offers four distinct strategies. Pick the one that matches your risk tolerance and trading style.
                    </p>
                    <div className="grid gap-3">
                        <StrategyCard
                            name="Conservative"
                            level="Low Risk"
                            icon={FaShieldAlt}
                            description="Buys after significant pullbacks and looks for price recovery. Focuses on capital preservation with steady, measured entries."
                        />
                        <StrategyCard
                            name="Balanced AI"
                            level="Moderate Risk"
                            icon={FaBrain}
                            description="Combines multiple indicators with AI‑assisted confidence scoring to seek a balance between opportunity and risk. Adaptive to market conditions."
                        />
                        <StrategyCard
                            name="Growth"
                            level="Moderate-High Risk"
                            icon={FaChartLine}
                            description="Follows established trends and attempts to ride market strength. Enters during confirmed breakouts and trends."
                        />
                        <StrategyCard
                            name="Aggressive"
                            level="High Risk"
                            icon={FaFire}
                            description="Designed for more frequent opportunities and higher volatility. Best suited for experienced users who understand market risks."
                        />
                    </div>
                    <Callout type="info" title="You can change strategies anytime">
                        Start with Conservative or Balanced AI, then adjust as you become more comfortable. Your strategy can be changed in the dashboard at any time.
                    </Callout>
                </section>

                {/* ===== HOW TRADING BOTS WORK ===== */}
                <section className="mb-16">
                    <SectionTitle icon={FaChartBar}>How the Trading Bots Work</SectionTitle>
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                        <p className="text-sm text-slate-700 leading-relaxed">
                            IMALI is <span className="font-bold">not</span> a "magic AI." It combines:
                        </p>
                        <ul className="mt-3 space-y-2 text-sm text-slate-700">
                            <li className="flex items-start gap-3">
                                <span className="text-indigo-600 font-bold">•</span>
                                <span><span className="font-bold">Technical indicators</span> — RSI, MACD, moving averages, and more</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-indigo-600 font-bold">•</span>
                                <span><span className="font-bold">Predefined trading rules</span> — structured logic for entry and exit conditions</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-indigo-600 font-bold">•</span>
                                <span><span className="font-bold">AI‑assisted confidence scoring</span> — evaluates opportunity quality</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-indigo-600 font-bold">•</span>
                                <span><span className="font-bold">Risk management</span> — position sizing, stop‑loss, and trailing stops</span>
                            </li>
                        </ul>
                        <p className="text-sm text-slate-600 mt-3 pt-3 border-t border-slate-100">
                            Every trade follows structured strategy logic with safeguards. The AI assists in decision‑making but does not override the strategy's core rules.
                        </p>
                    </div>
                </section>

                {/* ===== HOW THE BOT MAKES DECISIONS ===== */}
                <section className="mb-16">
                    <SectionTitle icon={FaSlidersH}>How the Bot Makes Decisions</SectionTitle>
                    <p className="text-slate-600 text-sm mb-4">
                        Every potential trade passes through multiple filters before an order is placed. Here's the full pipeline:
                    </p>
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                        <div className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">1</span>
                            <div>
                                <span className="font-bold text-slate-900">Market Scan</span>
                                <p className="text-sm text-slate-600">The bot pulls the latest prices and 24‑hour volatility for every available symbol using a single API call (bulk ticker). Symbols with high volatility are prioritised.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">2</span>
                            <div>
                                <span className="font-bold text-slate-900">Regime Check</span>
                                <p className="text-sm text-slate-600">The HMM regime service classifies each symbol as bull trend, bear/choppy, or volatile. In volatile regimes, the trade is skipped entirely. In bear markets, confidence requirements are raised.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">3</span>
                            <div>
                                <span className="font-bold text-slate-900">Confidence Scoring</span>
                                <p className="text-sm text-slate-600">A momentum‑based confidence score is calculated from the 24‑hour price change. Regime and volatility adjustments are applied. The trade only proceeds if the score exceeds the strategy's threshold.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">4</span>
                            <div>
                                <span className="font-bold text-slate-900">Position Sizing &amp; Risk</span>
                                <p className="text-sm text-slate-600">The bot calculates how much to buy based on available capital and the strategy's risk per trade. A stop‑loss is set at 2% below entry. If the account can't afford the minimum trade size, the signal is skipped.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">5</span>
                            <div>
                                <span className="font-bold text-slate-900">Execution</span>
                                <p className="text-sm text-slate-600">The order is placed on the exchange. The trade is recorded in the database with the stop‑loss price and entry score. From that moment, the bot monitors the position on every cycle.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">6</span>
                            <div>
                                <span className="font-bold text-slate-900">Exit Management</span>
                                <p className="text-sm text-slate-600">The bot checks every position every few seconds. It will exit if the stop‑loss is hit, the take‑profit target is reached, the trailing stop triggers, or the maximum hold time expires. All exits are logged with the reason.</p>
                            </div>
                        </div>
                    </div>
                    <Callout type="important" title="The bot never holds a losing position forever">
                        Every live strategy is designed to use predefined exit rules, including stop-loss logic. If the exchange rejects a sell (for example, because the position was already closed), the bot reconciles the database automatically so it doesn't get stuck.
                    </Callout>
                </section>

                {/* ===== AI-ASSISTED DECISION MAKING ===== */}
                <section className="mb-16">
                    <SectionTitle icon={FaBrain}>AI‑Assisted Decision Making</SectionTitle>
                    <p className="text-slate-600 text-sm mb-4">
                        IMALI uses AI to enhance, not replace, its trading logic. Here's how:
                    </p>
                    <div className="grid gap-3 md:grid-cols-2">
                        <div className="bg-white rounded-2xl border border-slate-200 p-4">
                            <h4 className="font-bold text-slate-900 text-sm">Confidence Scoring</h4>
                            <p className="text-xs text-slate-600 mt-1">Each potential trade receives a confidence score based on market conditions, indicator alignment, and historical patterns.</p>
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-200 p-4">
                            <h4 className="font-bold text-slate-900 text-sm">Signal Filtering</h4>
                            <p className="text-xs text-slate-600 mt-1">The AI helps filter out low‑quality signals, reducing false entries and improving overall trade quality.</p>
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-200 p-4">
                            <h4 className="font-bold text-slate-900 text-sm">Adaptive Parameters</h4>
                            <p className="text-xs text-slate-600 mt-1">Strategy parameters can adjust based on market volatility and recent performance to stay relevant.</p>
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-200 p-4">
                            <h4 className="font-bold text-slate-900 text-sm">Transparent Logic</h4>
                            <p className="text-xs text-slate-600 mt-1">The dashboard is designed to show trade reasons, strategy signals, and risk context so users can better understand system behavior.</p>
                        </div>
                    </div>
                </section>

                {/* ===== RISK MANAGEMENT ===== */}
                <section className="mb-16">
                    <SectionTitle icon={FaExclamationCircle}>Risk Management</SectionTitle>
                    <p className="text-slate-600 text-sm mb-4">
                        IMALI incorporates multiple layers of risk protection to help preserve your capital.
                    </p>
                    <div className="grid gap-3 md:grid-cols-2">
                        <div className="bg-white rounded-2xl border border-slate-200 p-4">
                            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                <span className="text-indigo-600">📐</span> Position Sizing
                            </h4>
                            <p className="text-xs text-slate-600 mt-1">Every trade uses a calculated position size based on your account balance and risk settings. No oversized bets.</p>
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-200 p-4">
                            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                <span className="text-rose-500">🛑</span> Stop‑Loss
                            </h4>
                            <p className="text-xs text-slate-600 mt-1">Every trade has a predefined stop‑loss level. If the price moves against you, the bot exits automatically.</p>
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-200 p-4">
                            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                <span className="text-amber-500">📊</span> Trailing Stops
                            </h4>
                            <p className="text-xs text-slate-600 mt-1">Protects profits by adjusting the stop‑loss upward as the trade moves in your favor. Locks in gains.</p>
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-200 p-4">
                            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                <span className="text-emerald-600">🎯</span> Confidence Scoring
                            </h4>
                            <p className="text-xs text-slate-600 mt-1">Trades only execute when confidence scores meet the strategy's threshold. Low‑confidence signals are skipped.</p>
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-200 p-4">
                            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                <span className="text-violet-500">🧠</span> Market Regime Detection
                            </h4>
                            <p className="text-xs text-slate-600 mt-1">
                                IMALI uses a Hidden Markov Model (HMM) to classify each asset as bull trend, bear/choppy, or volatile. In volatile markets, the bot reduces or skips trades entirely, protecting capital during uncertain conditions.
                            </p>
                        </div>
                    </div>
                </section>

                {/* ===== SECURITY & PERMISSIONS ===== */}
                <section className="mb-16">
                    <SectionTitle icon={FaShieldAlt}>Security &amp; Permissions</SectionTitle>
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                        <div className="flex items-start gap-3">
                            <FaCheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <span className="font-bold text-slate-900 text-sm">Read‑Only + Trade Access Only</span>
                                <p className="text-xs text-slate-600">IMALI never requests withdrawal permissions. Your funds stay on your exchange account at all times.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <FaCheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <span className="font-bold text-slate-900 text-sm">Encrypted API Keys</span>
                                <p className="text-xs text-slate-600">All API keys are encrypted at rest and in transit. We never store your keys in plain text.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <FaCheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <span className="font-bold text-slate-900 text-sm">Your Funds Stay Yours</span>
                                <p className="text-xs text-slate-600">IMALI is a trading assistant, not a custodial wallet. Your funds remain on your exchange account.</p>
                            </div>
                        </div>
                    </div>
                    <Callout type="important" title="Security First">
                        Never share your API secret with anyone. IMALI will never ask for your password or 2FA codes. Be cautious of phishing attempts.
                    </Callout>
                </section>

                {/* ===== GETTING STARTED CHECKLIST ===== */}
                <section className="mb-16">
                    <SectionTitle icon={FaCheckCircle}>Getting Started Checklist</SectionTitle>
                    <p className="text-slate-600 text-sm mb-4">
                        For the best experience, complete these steps in order:
                    </p>
                    <ol className="list-decimal list-inside space-y-3 text-sm text-slate-700 bg-white rounded-2xl border border-slate-200 p-5">
                        <li><span className="font-bold">Create your IMALI account.</span> — Sign up and choose your plan.</li>
                        <li><span className="font-bold">Connect your OKX or Alpaca account.</span> — Use the dashboard to link your exchange.</li>
                        <li><span className="font-bold">Generate API keys with Read and Trade permissions only.</span> — Never enable withdrawal.</li>
                        <li><span className="font-bold">Start with Paper Trading</span> to learn the platform without risk.</li>
                        <li><span className="font-bold">Choose a trading strategy</span> that fits your goals.</li>
                        <li><span className="font-bold">Start your bot</span> and monitor your dashboard to see how it performs.</li>
                        <li><span className="font-bold">When you're comfortable, switch to Live Trading</span> and begin with an amount you're comfortable risking.</li>
                    </ol>
                    <Callout type="success" title="Pro Tip">
                        Take your time with paper trading. The more you practice, the more confident you'll be when you go live.
                    </Callout>
                </section>

                {/* ===== FAQ ===== */}
                <section className="mb-16">
                    <SectionTitle icon={FaQuestionCircle}>Frequently Asked Questions</SectionTitle>
                    <div className="space-y-3">
                        <div className="bg-white rounded-2xl border border-slate-200 p-4">
                            <h4 className="font-bold text-slate-900 text-sm">Can I use IMALI with multiple exchanges?</h4>
                            <p className="text-sm text-slate-600 mt-1">Yes! You can connect both OKX and Alpaca simultaneously and switch between them in the dashboard.</p>
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-200 p-4">
                            <h4 className="font-bold text-slate-900 text-sm">Does IMALI trade 24/7?</h4>
                            <p className="text-sm text-slate-600 mt-1">For crypto (OKX), yes — markets are always open. For stocks (Alpaca), trades occur during market hours unless you enable extended hours trading.</p>
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-200 p-4">
                            <h4 className="font-bold text-slate-900 text-sm">What happens if the bot makes a losing trade?</h4>
                            <p className="text-sm text-slate-600 mt-1">Losing trades are part of trading. Risk management rules (stop‑loss, position sizing) are designed to keep losses small and controlled. No strategy wins 100% of the time.</p>
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-200 p-4">
                            <h4 className="font-bold text-slate-900 text-sm">Can I pause or stop the bot?</h4>
                            <p className="text-sm text-slate-600 mt-1">Absolutely. You can pause trading, disable specific strategies, or fully disconnect your exchange at any time from the dashboard.</p>
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-200 p-4">
                            <h4 className="font-bold text-slate-900 text-sm">Is paper trading exactly like live trading?</h4>
                            <p className="text-sm text-slate-600 mt-1">Paper trading uses a similar strategy flow and dashboard experience, but real trading can differ because of slippage, spreads, liquidity, and execution timing.</p>
                        </div>
                    </div>
                </section>

                {/* ===== NEED HELP ===== */}
                <section className="mb-12">
                    <SectionTitle icon={FaEnvelope}>Need Help?</SectionTitle>
                    <div className="bg-gradient-to-br from-indigo-50 to-slate-50 rounded-2xl border border-indigo-200 p-6">
                        <p className="text-slate-700 text-sm mb-4">
                            If you have any questions during setup, our team is here to help. Reach out to us at:
                        </p>
                        <a
                            href="mailto:imalidefi@gmail.com"
                            className="inline-flex items-center gap-2 text-indigo-600 font-bold text-lg hover:text-indigo-800 transition"
                        >
                            <FaEnvelope className="w-5 h-5" />
                            imalidefi@gmail.com
                        </a>
                        <div className="mt-4 grid gap-2 sm:grid-cols-2 text-sm">
                            <div className="flex items-center gap-2 text-slate-600">
                                <FaCheckCircle className="w-4 h-4 text-emerald-500" /> Account setup
                            </div>
                            <div className="flex items-center gap-2 text-slate-600">
                                <FaCheckCircle className="w-4 h-4 text-emerald-500" /> OKX or Alpaca API configuration
                            </div>
                            <div className="flex items-center gap-2 text-slate-600">
                                <FaCheckCircle className="w-4 h-4 text-emerald-500" /> Paper trading guidance
                            </div>
                            <div className="flex items-center gap-2 text-slate-600">
                                <FaCheckCircle className="w-4 h-4 text-emerald-500" /> Strategy selection
                            </div>
                            <div className="flex items-center gap-2 text-slate-600">
                                <FaCheckCircle className="w-4 h-4 text-emerald-500" /> Dashboard navigation
                            </div>
                            <div className="flex items-center gap-2 text-slate-600">
                                <FaCheckCircle className="w-4 h-4 text-emerald-500" /> Live trading readiness
                            </div>
                        </div>
                    </div>
                </section>

                {/* ===== CTA ===== */}
                <div className="text-center pt-4 pb-8 border-t border-slate-200">
                    <p className="text-slate-600 text-sm mb-4">
                        Ready to start your trading journey?
                    </p>
                    <Link
                        to="/signup"
                        className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition shadow-md hover:shadow-lg"
                    >
                        <FaBolt className="w-5 h-5" />
                        Get Started with IMALI
                    </Link>
                </div>

            </div>
        </div>
    );
}