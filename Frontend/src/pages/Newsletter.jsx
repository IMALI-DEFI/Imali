// =============================
                <p className="mt-3 font-medium">Platform news</p>
                <p className="mt-1 text-sm text-slate-400">Be first to hear about beta access and new features.</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl sm:p-8">
            <h2 className="text-2xl font-semibold">Subscribe</h2>
            <p className="mt-2 text-sm text-slate-400">
              No spam. Just useful updates, product news, and trading education.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-2 block text-sm text-slate-300">First name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="Wayne"
                  className="w-full rounded-2xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-2xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  What are you most interested in?
                </label>
                <select
                  value={interest}
                  onChange={(event) => setInterest(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none"
                >
                  <option value="all">Everything</option>
                  <option value="stocks">Stocks</option>
                  <option value="crypto">Crypto</option>
                  <option value="defi">DeFi</option>
                  <option value="beginner">Beginner education</option>
                  <option value="product">Platform updates</option>
                </select>
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3.5 font-semibold text-slate-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Subscribing..." : "Join the Newsletter"}
                {!loading ? <FaCheckCircle className="h-4 w-4" /> : null}
              </button>
            </form>

            <p className="mt-4 text-xs text-slate-500">
              By subscribing, you agree to receive emails from Imali. You can unsubscribe anytime.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
