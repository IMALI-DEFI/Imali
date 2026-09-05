// src/pages/HowItWorks.jsx

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
    FaDatabase,
    FaBullseye,
    FaFire,
    FaBrain,
    FaExclamationTriangle,
    FaTachometerAlt,
    FaWallet,
    FaMicrochip,
    FaSlidersH,
    FaUser,
} from "react-icons/fa";

export default function HowItWorks() {
    const card =
        "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm";

    const SectionTitle = ({ children, icon: Icon }) => (
        <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
                <Icon className="h-5 w-5" />
            </div>

            <h2 className="text-2xl font-bold text-slate-900">
                {children}
            </h2>
        </div>
    );

    const Callout = ({
        type = "info",
        title,
        children,
    }) => {
        const styles = {
            important: "border-amber-400 bg-amber-50",
            info: "border-blue-400 bg-blue-50",
            success: "border-emerald-400 bg-emerald-50",
            warning: "border-rose-400 bg-rose-50",
        };

        const icons = {
            important: (
                <FaExclamationCircle className="h-5 w-5 flex-shrink-0 text-amber-600" />
            ),
            info: (
                <FaQuestionCircle className="h-5 w-5 flex-shrink-0 text-blue-600" />
            ),
            success: (
                <FaCheckCircle className="h-5 w-5 flex-shrink-0 text-emerald-600" />
            ),
            warning: (
                <FaExclamationTriangle className="h-5 w-5 flex-shrink-0 text-rose-600" />
            ),
        };

        return (
            <div
                className={`mt-4 rounded-r-xl border-l-4 p-4 shadow-sm ${
                    styles[type] || styles.info
                }`}
            >
                <div className="flex items-start gap-3">
                    {icons[type] || icons.info}

                    <div>
                        <span className="font-bold text-slate-900">
                            {title}
                        </span>

                        <div className="mt-1 text-sm text-slate-700">
                            {children}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const StepCard = ({
        number,
        title,
        children,
    }) => (
        <div className={card}>
            <div className="mb-2 flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                    {number}
                </span>

                <h3 className="font-bold text-slate-900">
                    {title}
                </h3>
            </div>

            <p className="text-sm leading-relaxed text-slate-600">
                {children}
            </p>
        </div>
    );

    const FeatureCard = ({
        icon: Icon,
        title,
        children,
    }) => (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-2 flex items-center gap-3">
                <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
                    <Icon className="h-4 w-4" />
                </div>

                <h3 className="font-bold text-slate-900">
                    {title}
                </h3>
            </div>

            <div className="text-sm leading-relaxed text-slate-600">
                {children}
            </div>
        </div>
    );

    const StrategyCard = ({
        name,
        description,
        level,
        icon: Icon,
        style,
        badgeStyle,
    }) => (
        <div
            className={`rounded-2xl border p-5 transition hover:shadow-md ${style}`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-white p-2 shadow-sm">
                        <Icon className="h-5 w-5 text-slate-700" />
                    </div>

                    <h3 className="font-bold text-slate-900">
                        {name}
                    </h3>
                </div>

                <span
                    className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${badgeStyle}`}
                >
                    {level}
                </span>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-slate-700">
                {description}
            </p>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
                {/* Hero */}
                <section className="mx-auto mb-14 max-w-3xl text-center">
                    <div className="mb-4 flex justify-center">
                        <div className="rounded-2xl bg-indigo-100 p-3">
                            <FaBolt className="h-8 w-8 text-indigo-600" />
                        </div>
                    </div>

                    <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
                        How{" "}
                        <span className="text-indigo-600">
                            IMALI
                        </span>{" "}
                        Works
                    </h1>

                    <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
                        Connect a supported trading account, choose a
                        strategy and trade size, set your risk preferences,
                        and manage supported automation from one dashboard.
                    </p>

                    <Callout
                        type="important"
                        title="Live trading involves financial risk"
                    >
                        When live execution is supported and enabled, IMALI can place
                        orders using funds held in your connected account. Only trade
                        with capital you can afford to lose.
                    </Callout>
                </section>

                {/* Setup */}
                <section className="mb-16">
                    <SectionTitle icon={FaCog}>
                        Get Started in Four Steps
                    </SectionTitle>

                    <div className="grid gap-4 md:grid-cols-2">
                        <StepCard
                            number="1"
                            title="Create Your Account"
                        >
                            Sign up for IMALI and choose the membership
                            plan that includes the markets and features
                            you want to use.
                        </StepCard>

                        <StepCard
                            number="2"
                            title="Connect an Exchange"
                        >
                            Connect Robinhood Crypto or OKX for cryptocurrency trading, Alpaca for U.S. stocks and ETFs, Kalshi for supported prediction markets, or a supported wallet for DEX trading.
                        </StepCard>

                        <StepCard
                            number="3"
                            title="Choose Your Strategy"
                        >
                            Select Conservative, Balanced AI, Growth,
                            or Aggressive based on your goals and risk
                            tolerance.
                        </StepCard>

                        <StepCard
                            number="4"
                            title="Review and Start"
                        >
                            Confirm your market, account balance,
                            strategy, and risk settings. Then start the
                            bot and monitor activity from your
                            dashboard.
                        </StepCard>
                    </div>
                </section>

                {/* Markets */}
                <section className="mb-16">
                    <SectionTitle icon={FaDatabase}>
                        Supported Markets
                    </SectionTitle>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className={card}>
                            <h3 className="flex items-center gap-2 font-bold text-slate-900">
                                <span className="text-xl">🟢</span>
                                Robinhood Crypto
                            </h3>

                            <p className="mt-2 text-sm leading-relaxed text-slate-600">
                                Connect a Robinhood Crypto Trading API credential and use IMALI as the decision and execution layer for supported crypto orders.
                            </p>

                            <ul className="mt-3 space-y-1 text-xs text-slate-500">
                                <li>• Crypto account and holdings access</li>
                                <li>• Supported crypto market data</li>
                                <li>• Automated order execution</li>
                                <li>• Funds remain with Robinhood</li>
                            </ul>
                        </div>

                        <div className={card}>
                            <h3 className="flex items-center gap-2 font-bold text-slate-900">
                                <span className="text-xl">₿</span>
                                OKX Cryptocurrency Trading
                            </h3>

                            <p className="mt-2 text-sm leading-relaxed text-slate-600">
                                Trade supported cryptocurrency pairs
                                through your connected OKX account.
                                Cryptocurrency markets operate 24 hours
                                a day.
                            </p>

                            <ul className="mt-3 space-y-1 text-xs text-slate-500">
                                <li>• Cryptocurrency spot trading</li>
                                <li>• Supported USDT trading pairs</li>
                                <li>• Futures access on eligible plans</li>
                                <li>• Automated entry and exit rules</li>
                            </ul>
                        </div>

                        <div className={card}>
                            <h3 className="flex items-center gap-2 font-bold text-slate-900">
                                <span className="text-xl">📈</span>
                                Alpaca Stock Trading
                            </h3>

                            <p className="mt-2 text-sm leading-relaxed text-slate-600">
                                Trade supported U.S. stocks and ETFs
                                through your connected Alpaca brokerage
                                account. Robinhood stock automation is handled separately through Robinhood Agentic Trading rather than the Crypto API.
                            </p>

                            <ul className="mt-3 space-y-1 text-xs text-slate-500">
                                <li>• U.S. stocks and ETFs</li>
                                <li>• Fractional-share support</li>
                                <li>• Buying-power validation</li>
                                <li>• Market-hours awareness</li>
                            </ul>
                        </div>

                        <div className={card}>
                            <h3 className="flex items-center gap-2 font-bold text-slate-900">
                                <span className="text-xl">🟣</span>
                                Kalshi Prediction Markets
                            </h3>

                            <p className="mt-2 text-sm leading-relaxed text-slate-600">
                                Connect your Kalshi account so IMALI can scan supported
                                prediction markets, evaluate probability, market quality,
                                confidence, spread, and edge, and submit eligible orders
                                when live execution is enabled.
                            </p>

                            <ul className="mt-3 space-y-1 text-xs text-slate-500">
                                <li>• Prediction-market scanning</li>
                                <li>• Probability and edge evaluation</li>
                                <li>• Automated risk checks</li>
                                <li>• Supported live order execution</li>
                            </ul>
                        </div>

                        <div className={card}>
                            <h3 className="flex items-center gap-2 font-bold text-slate-900">
                                <span className="text-xl">🔗</span>
                                DEX Wallet Trading
                            </h3>

                            <p className="mt-2 text-sm leading-relaxed text-slate-600">
                                Connect a supported wallet to access decentralized trading
                                features. IMALI prepares eligible decentralized transactions
                                while your wallet remains under your control.
                            </p>

                            <ul className="mt-3 space-y-1 text-xs text-slate-500">
                                <li>• Wallet-based trading</li>
                                <li>• Non-custodial architecture</li>
                                <li>• Supported DEX execution flows</li>
                                <li>• Wallet authorization remains with you</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* Bot Systems */}
                <section className="mb-16">
                    <SectionTitle icon={FaMicrochip}>
                        IMALI Trading Systems
                    </SectionTitle>

                    <p className="mb-5 text-sm leading-relaxed text-slate-600">
                        IMALI uses specialized trading systems for
                        different markets. Available systems depend on
                        your subscription plan and connected accounts.
                    </p>

                    <div className="grid gap-4 md:grid-cols-2">
                        <FeatureCard
                            icon={FaChartLine}
                            title="Crypto Spot Bot"
                        >
                            Scans supported OKX spot pairs, evaluates
                            trading signals, calculates position size,
                            and manages entries and exits.
                        </FeatureCard>

                        <FeatureCard
                            icon={FaChartBar}
                            title="Crypto Futures Bot"
                        >
                            Supports eligible perpetual-futures
                            strategies with leverage controls, funding
                            checks, isolated margin, and position-exit
                            protections.
                        </FeatureCard>

                        <FeatureCard
                            icon={FaDatabase}
                            title="Stock Bot"
                        >
                            Trades supported U.S. equities and ETFs
                            through Alpaca while checking market hours,
                            liquidity, spreads, and buying power.
                        </FeatureCard>

                        <FeatureCard
                            icon={FaWallet}
                            title="DEX Trading"
                        >
                            Monitors supported decentralized markets
                            and evaluates liquidity, gas costs,
                            slippage, token behavior, and available
                            on-chain opportunities.
                        </FeatureCard>
                    </div>

                    <Callout
                        type="info"
                        title="Features vary by plan"
                    >
                        Prediction Market Intelligence analyzes supported event markets,
                        external data, market probabilities, edge, and risk filters.
                        Prediction-market order execution is currently disabled.

                        Futures, DEX trading, additional automation,
                        and advanced controls may require an eligible
                        subscription.
                    </Callout>
                </section>

                {/* API Keys */}
                <section className="mb-16">
                    <SectionTitle icon={FaShieldAlt}>
                        Connect Your Exchange Securely
                    </SectionTitle>

                    <p className="mb-5 text-sm text-slate-600">
                        IMALI connects to your exchange using API
                        credentials. These credentials should allow
                        account reading and trading—but never
                        withdrawals.
                    </p>

                    <div className="space-y-3">
                        <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                            <FaCheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500" />

                            <div>
                                <span className="font-bold text-slate-900">
                                    Read Permission
                                </span>

                                <p className="text-sm text-slate-600">
                                    Allows IMALI to view account
                                    balances, positions, market data,
                                    and order history.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                            <FaCheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500" />

                            <div>
                                <span className="font-bold text-slate-900">
                                    Trade Permission
                                </span>

                                <p className="text-sm text-slate-600">
                                    Allows IMALI to place, modify, and
                                    cancel orders according to your
                                    selected automation settings.
                                </p>
                            </div>
                        </div>
                    </div>

                    <Callout
                        type="warning"
                        title="Never enable withdrawals"
                    >
                        IMALI does not need withdrawal permission.
                        Keeping withdrawals disabled prevents the API
                        connection from transferring funds out of your
                        exchange account.
                    </Callout>
                </section>

                {/* Connection Instructions */}
                <section className="mb-16">
                    <SectionTitle icon={FaExternalLinkAlt}>
                        Connecting an Account
                    </SectionTitle>

                    <ol className="list-inside list-decimal space-y-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
                        <li>
                            Open your IMALI{" "}
                            <span className="font-bold">
                                Dashboard
                            </span>
                            .
                        </li>

                        <li>
                            Select{" "}
                            <span className="font-bold">
                                Connect Exchange
                            </span>
                            .
                        </li>

                        <li>
                            Choose <span className="font-bold">Robinhood Crypto</span>, <span className="font-bold">OKX</span>, <span className="font-bold">Alpaca</span>, <span className="font-bold">Kalshi</span>, or <span className="font-bold">DEX Wallet</span>
                            .
                        </li>

                        <li>
                            Enter the API credentials provided by your
                            exchange.
                        </li>

                        <li>
                            Submit the connection and wait for IMALI to
                            verify your credentials.
                        </li>

                        <li>
                            Confirm that your account shows a green{" "}
                            <span className="font-bold">
                                Connected
                            </span>{" "}
                            status.
                        </li>
                    </ol>

                    <Callout type="info" title="Connection problems?">
                        Check that your credentials are correct, trade
                        permission is enabled, withdrawal permission is
                        disabled, and any required OKX passphrase was
                        entered correctly.
                    </Callout>
                </section>

                {/* Dashboard */}
                <section className="mb-16">
                    <SectionTitle icon={FaTachometerAlt}>
                        Your Dashboard
                    </SectionTitle>

                    <p className="mb-5 text-sm text-slate-600">
                        The dashboard gives you one place to review
                        your account, start or stop automation, and
                        monitor trading activity.
                    </p>

                    <div className="grid gap-4 md:grid-cols-2">
                        <FeatureCard
                            icon={FaUser}
                            title="Account Status"
                        >
                            View your membership plan, connected
                            accounts, billing status, notifications,
                            and whether your trading bot is running.
                        </FeatureCard>

                        <FeatureCard
                            icon={FaWallet}
                            title="Account Overview"
                        >
                            Review account value, available balances,
                            open positions, completed trades, win rate,
                            and profit-and-loss information.
                        </FeatureCard>

                        <FeatureCard
                            icon={FaMicrochip}
                            title="Bot Controls"
                        >
                            Select your market and strategy, review
                            position limits, and start or stop the bot
                            from one control panel.
                        </FeatureCard>

                        <FeatureCard
                            icon={FaChartLine}
                            title="Trade Activity"
                        >
                            Review buy and sell orders, execution
                            prices, timestamps, trade results, and exit
                            reasons.
                        </FeatureCard>

                        <FeatureCard
                            icon={FaBullseye}
                            title="Strategy Settings"
                        >
                            Choose the strategy that fits your risk
                            tolerance. Stop the bot before making
                            material strategy changes.
                        </FeatureCard>

                        <FeatureCard
                            icon={FaSlidersH}
                            title="Account Settings"
                        >
                            Manage billing, exchange connections,
                            wallet connections, security,
                            notifications, and automation preferences.
                        </FeatureCard>
                    </div>
                </section>

                {/* Strategies */}
                <section className="mb-16">
                    <SectionTitle icon={FaBullseye}>
                        Choose a Strategy
                    </SectionTitle>

                    <p className="mb-5 text-sm text-slate-600">
                        Each strategy uses different entry thresholds,
                        trade frequency, and risk settings. Higher-risk
                        strategies can produce larger losses as well as
                        more trading activity.
                    </p>

                    <div className="grid gap-3">
                        <StrategyCard
                            name="Conservative"
                            level="Lower Risk"
                            icon={FaShieldAlt}
                            style={{  }}
                            badgeStyle="bg-emerald-100 text-emerald-700"
                            description="Uses stricter entry rules and fewer trades, with an emphasis on measured opportunities and capital preservation."
                        />

                        <StrategyCard
                            name="Balanced AI"
                            level="Moderate Risk"
                            icon={FaBrain}
                            style={{  }}
                            badgeStyle="bg-blue-100 text-blue-700"
                            description="Combines technical indicators, market conditions, and confidence scoring to balance trading opportunities with risk."
                        />

                        <StrategyCard
                            name="Growth"
                            level="Higher Risk"
                            icon={FaChartLine}
                            style={{  }}
                            badgeStyle="bg-amber-100 text-amber-700"
                            description="Focuses on momentum and established market trends, seeking opportunities when market strength is confirmed."
                        />

                        <StrategyCard
                            name="Aggressive"
                            level="High Risk"
                            icon={FaFire}
                            style={{  }}
                            badgeStyle="bg-rose-100 text-rose-700"
                            description="Uses broader entry criteria and seeks more frequent opportunities. Designed for experienced users who understand elevated risk."
                        />
                    </div>

                    <Callout
                        type="important"
                        title="Begin conservatively"
                    >
                        New users should generally begin with
                        Conservative or Balanced AI, use a limited
                        amount of capital, and monitor early activity
                        closely.
                    </Callout>
                </section>

                {/* Decision Process */}
                <section className="mb-16">
                    <SectionTitle icon={FaChartBar}>
                        How Trades Are Evaluated
                    </SectionTitle>

                    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
                        {[
                            {
                                number: 1,
                                title: "Market Scan",
                                description:
                                    "The bot reviews supported markets, prices, volume, volatility, and available trading opportunities.",
                            },
                            {
                                number: 2,
                                title: "Market Condition Check",
                                description:
                                    "Market-regime and volatility filters help determine whether current conditions are suitable for the selected strategy.",
                            },
                            {
                                number: 3,
                                title: "Signal Evaluation",
                                description:
                                    "Technical indicators and confidence rules are evaluated. Signals that do not meet the required threshold are skipped.",
                            },
                            {
                                number: 4,
                                title: "Risk Validation",
                                description:
                                    "The system checks available capital, position limits, minimum order sizes, and configured risk controls.",
                            },
                            {
                                number: 5,
                                title: "Order Execution",
                                description:
                                    "When live execution is supported and enabled for the selected connection, IMALI can submit the order and record the result. Paper, dry-run, and intelligence-only modes do not submit real-money orders.",
                            },
                            {
                                number: 6,
                                title: "Position Monitoring",
                                description:
                                    "Open positions are monitored for stop-loss, take-profit, trailing-stop, time-based, and strategy exit conditions.",
                            },
                        ].map((step) => (
                            <div
                                key={step.number}
                                className="flex items-start gap-3"
                            >
                                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                                    {step.number}
                                </span>

                                <div>
                                    <span className="font-bold text-slate-900">
                                        {step.title}
                                    </span>

                                    <p className="text-sm leading-relaxed text-slate-600">
                                        {step.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Risk */}
                <section className="mb-16">
                    <SectionTitle icon={FaExclamationCircle}>
                        Risk Controls
                    </SectionTitle>

                    <div className="grid gap-4 md:grid-cols-2">
                        <FeatureCard
                            icon={FaSlidersH}
                            title="Position Sizing"
                        >
                            Position sizes are calculated using
                            available account capital, strategy rules,
                            and configured limits.
                        </FeatureCard>

                        <FeatureCard
                            icon={FaExclamationTriangle}
                            title="Stop-Loss Rules"
                        >
                            Strategies use predefined exit logic to
                            reduce exposure when a position moves
                            against the entry.
                        </FeatureCard>

                        <FeatureCard
                            icon={FaChartLine}
                            title="Profit Management"
                        >
                            Supported strategies may use take-profit
                            targets and trailing stops to manage
                            favorable price movements.
                        </FeatureCard>

                        <FeatureCard
                            icon={FaBrain}
                            title="Signal Filtering"
                        >
                            Signals that do not meet the strategy’s
                            confidence, volatility, liquidity, or
                            market-condition requirements are skipped.
                        </FeatureCard>
                    </div>

                    <Callout
                        type="warning"
                        title="Risk controls cannot prevent every loss"
                    >
                        Slippage, gaps, exchange outages, liquidity
                        changes, rejected orders, and sudden market
                        movements can affect execution. Automated
                        trading does not guarantee profits.
                    </Callout>
                </section>

                {/* Security */}
                <section className="mb-16">
                    <SectionTitle icon={FaShieldAlt}>
                        Security
                    </SectionTitle>

                    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
                        <div className="flex items-start gap-3">
                            <FaCheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500" />

                            <div>
                                <span className="text-sm font-bold text-slate-900">
                                    Non-Custodial Connection
                                </span>

                                <p className="text-xs text-slate-600">
                                    Funds remain in your connected
                                    exchange or brokerage account.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <FaCheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500" />

                            <div>
                                <span className="text-sm font-bold text-slate-900">
                                    Encrypted Credentials
                                </span>

                                <p className="text-xs text-slate-600">
                                    Exchange credentials are protected
                                    during transmission and encrypted
                                    when stored.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <FaCheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500" />

                            <div>
                                <span className="text-sm font-bold text-slate-900">
                                    No Withdrawal Access
                                </span>

                                <p className="text-xs text-slate-600">
                                    IMALI only requires read and trade
                                    permissions. Withdrawal access
                                    should always remain disabled.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <FaCheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500" />

                            <div>
                                <span className="text-sm font-bold text-slate-900">
                                    User-Controlled Automation
                                </span>

                                <p className="text-xs text-slate-600">
                                    You can stop the bot, revoke API
                                    credentials, or disconnect an
                                    exchange account at any time.
                                </p>
                            </div>
                        </div>
                    </div>

                    <Callout
                        type="important"
                        title="Protect your account"
                    >
                        Never send your exchange password, API secret,
                        passphrase, or two-factor authentication code
                        through email or social media.
                    </Callout>
                </section>

                {/* Checklist */}
                <section className="mb-16">
                    <SectionTitle icon={FaCheckCircle}>
                        Before Starting the Bot
                    </SectionTitle>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <ul className="space-y-3 text-sm text-slate-700">
                            {[
                                "Your subscription is active.",
                                "Your exchange shows a Connected status.",
                                "Withdrawal permission is disabled.",
                                "Your account has enough available balance for the exchange minimum order size.",
                                "You selected the correct market and strategy.",
                                "You reviewed your position and risk settings.",
                                "You understand that live trading can result in financial losses.",
                            ].map((item) => (
                                <li
                                    key={item}
                                    className="flex items-start gap-3"
                                >
                                    <FaCheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <Callout
                        type="success"
                        title="Start with limited capital"
                    >
                        Begin with an amount that allows you to observe
                        execution, strategy behavior, and dashboard
                        reporting without placing your essential funds
                        at risk.
                    </Callout>
                </section>

                {/* FAQ */}
                <section className="mb-16">
                    <SectionTitle icon={FaQuestionCircle}>
                        Frequently Asked Questions
                    </SectionTitle>

                    <div className="space-y-3">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <h3 className="text-sm font-bold text-slate-900">
                                Can I connect more than one trading
                                account?
                            </h3>

                            <p className="mt-1 text-sm text-slate-600">
                                You can connect supported OKX, Robinhood Crypto, Alpaca, Kalshi, and wallet-based DEX accounts. Available execution modes vary by platform. The exact number of
                                available connections may depend on
                                your plan and current platform
                                configuration.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <h3 className="text-sm font-bold text-slate-900">
                                Does IMALI trade continuously?
                            </h3>

                            <p className="mt-1 text-sm text-slate-600">
                                Cryptocurrency markets operate 24/7.
                                Stock trading follows applicable market
                                hours and any supported extended-hours
                                settings.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <h3 className="text-sm font-bold text-slate-900">
                                Can the bot lose money?
                            </h3>

                            <p className="mt-1 text-sm text-slate-600">
                                Yes. Every trading strategy can
                                experience losing trades and periods of
                                poor performance. Risk controls can
                                limit exposure but cannot guarantee
                                against losses.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <h3 className="text-sm font-bold text-slate-900">
                                Can I stop trading at any time?
                            </h3>

                            <p className="mt-1 text-sm text-slate-600">
                                Yes. You can stop automation from your
                                dashboard and disconnect or revoke your
                                exchange API credentials.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <h3 className="text-sm font-bold text-slate-900">
                                Does IMALI guarantee returns?
                            </h3>

                            <p className="mt-1 text-sm text-slate-600">
                                No. IMALI provides automated trading
                                tools and risk-management features, but
                                it does not guarantee profits,
                                performance, or protection from loss.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Support */}
                <section className="mb-12">
                    <SectionTitle icon={FaEnvelope}>
                        Need Help?
                    </SectionTitle>

                    <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-slate-50 p-6">
                        <p className="mb-4 text-sm text-slate-700">
                            Contact IMALI support for help with account
                            setup, exchange connections, dashboard
                            navigation, or strategy selection.
                        </p>

                        <a
                            href="mailto:imalidefi@gmail.com"
                            className="inline-flex items-center gap-2 text-lg font-bold text-indigo-600 transition hover:text-indigo-800"
                        >
                            <FaEnvelope className="h-5 w-5" />
                            imalidefi@gmail.com
                        </a>

                        <div className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
                            {[
                                "Account setup",
                                "Robinhood Crypto connection",
                                "OKX connection",
                                "Alpaca connection",
                                "Kalshi prediction market connection",
                                "DEX wallet connection",
                                "Strategy selection",
                                "Dashboard navigation",
                                "Security guidance",
                            ].map((item) => (
                                <div
                                    key={item}
                                    className="flex items-center gap-2 text-slate-600"
                                >
                                    <FaCheckCircle className="h-4 w-4 text-emerald-500" />
                                    {item}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <section className="border-t border-slate-200 pb-8 pt-8 text-center">
                    <h2 className="text-2xl font-bold text-slate-900">
                        Ready to set up your account?
                    </h2>

                    <p className="mx-auto mb-5 mt-2 max-w-xl text-sm text-slate-600">
                        Create your IMALI account, connect a supported platform, choose your strategy and risk settings, and activate the execution mode available for that connection.
                    </p>

                    <Link
                        to="/signup"
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-3.5 font-bold text-white shadow-md transition hover:bg-indigo-700 hover:shadow-lg"
                    >
                        <FaBolt className="h-5 w-5" />
                        Get Started with IMALI
                    </Link>
                </section>
            </main>
        </div>
    );
}