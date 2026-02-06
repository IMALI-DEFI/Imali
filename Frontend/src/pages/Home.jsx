{/* DEMO CARDS */}
<div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl mx-auto">
  {/* Crypto Demo */}
  <div className="rounded-2xl bg-white/10 border border-white/10 p-5 text-left">
    <div className="text-sm uppercase text-indigo-300">Crypto Bot</div>
    <h3 className="text-2xl font-bold mt-1">
      New + Established Crypto
    </h3>
    <p className="mt-2 text-sm text-white/80">
      Try the live demo with simulated trades and real market data.
    </p>
    <div className="mt-4 flex gap-3">
      <Link
        to="/demo"
        className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold hover:bg-indigo-500"
      >
        Launch Demo
      </Link>
      <button
        onClick={() => nav("/how-it-works")}
        className="text-sm underline text-white/80 hover:text-white"
      >
        How it works
      </button>
    </div>
  </div>

  {/* Stock Demo */}
  <div className="rounded-2xl bg-white/10 border border-white/10 p-5 text-left">
    <div className="text-sm uppercase text-emerald-300">Stock Bot</div>
    <h3 className="text-2xl font-bold mt-1">
      Stocks (Alpaca)
    </h3>
    <p className="mt-2 text-sm text-white/80">
      Preview AI-driven stock strategies using paper trading.
    </p>
    <div className="mt-4 flex gap-3">
      <Link
        to="/demo?venue=stocks"
        className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500"
      >
        Launch Demo
      </Link>
      <button
        onClick={() => nav("/pricing")}
        className="text-sm underline text-white/80 hover:text-white"
      >
        Requirements
      </button>
    </div>
  </div>
</div>
