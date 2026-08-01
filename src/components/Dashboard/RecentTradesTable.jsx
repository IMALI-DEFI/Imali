import React from "react";

function fmtNum(v, { digits = 2, prefix = "", suffix = "" } = {}) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "–";
  return `${prefix}${n.toFixed(digits)}${suffix}`;
}

function fmtInt(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "–";
  return n.toLocaleString();
}

function fmtTime(ts) {
  if (!ts) return "–";
  const n = Number(ts);
  const d = Number.isFinite(n) ? new Date(n) : new Date(ts);
  if (Number.isNaN(d.getTime())) return "–";
  return d.toLocaleString();
}

function getPnlUsd(row) {
  // accept a bunch of possible keys (backend schemas vary)
  return (
    row?.pnlUsd ??
    row?.pnl_usd ??
    row?.pnl ??
    row?.profitUsd ??
    row?.profit_usd ??
    null
  );
}

function getPnlPct(row) {
  return row?.pnlPct ?? row?.pnl_pct ?? row?.roi ?? row?.returnPct ?? null;
}

function getSymbol(row) {
  return row?.symbol || row?.pair || row?.market || row?.token || "–";
}

function getMarket(row) {
  return (row?.marketType || row?.market || row?.venue || row?.source || "").toString();
}

export default function RecentTradesTable({ rows = [], loading = false }) {
  const safeRows = Array.isArray(rows) ? rows : [];

  return (
    <div className="panel">
      <div className="panelHeader">
        <h3>Recent Trades</h3>
        <span className="muted">{loading ? "Loading…" : `${safeRows.length} trades`}</span>
      </div>

      <div className="tableWrap">
        <table className="table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Market</th>
              <th>Symbol</th>
              <th>Side</th>
              <th className="right">Qty</th>
              <th className="right">Entry</th>
              <th className="right">Exit</th>
              <th className="right">PnL</th>
              <th className="right">PnL %</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {safeRows.length === 0 ? (
              <tr>
                <td colSpan={10} className="muted" style={{ padding: 14 }}>
                  {loading ? "Loading trades…" : "No trades yet."}
                </td>
              </tr>
            ) : (
              safeRows.slice(0, 50).map((row, idx) => {
                const pnlUsd = getPnlUsd(row);
                const pnlPct = getPnlPct(row);
                const side = (row?.side || row?.action || "").toString().toUpperCase();
                const status = (row?.status || row?.state || "").toString();

                const entry = row?.entryPrice ?? row?.entry ?? row?.buyPrice ?? row?.priceIn ?? null;
                const exit = row?.exitPrice ?? row?.exit ?? row?.sellPrice ?? row?.priceOut ?? null;
                const qty = row?.qty ?? row?.quantity ?? row?.size ?? row?.amount ?? null;

                return (
                  <tr key={row?.id || row?.tradeId || `${idx}`}
                      className={Number(pnlUsd) < 0 ? "rowLoss" : Number(pnlUsd) > 0 ? "rowWin" : ""}
                  >
                    <td>{fmtTime(row?.ts || row?.timestamp || row?.time || row?.createdAt)}</td>
                    <td>{getMarket(row) || "–"}</td>
                    <td>{getSymbol(row)}</td>
                    <td>{side || "–"}</td>
                    <td className="right">{qty == null ? "–" : fmtInt(qty)}</td>
                    <td className="right">{fmtNum(entry, { digits: 6 })}</td>
                    <td className="right">{fmtNum(exit, { digits: 6 })}</td>
                    <td className="right">{fmtNum(pnlUsd, { prefix: "$" })}</td>
                    <td className="right">{fmtNum(pnlPct, { suffix: "%" })}</td>
                    <td>{status || "–"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Minimal styles (safe defaults). If your app uses global styles, these can be removed. */}
      <style>{`
        .panel{border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px;background:rgba(255,255,255,0.03)}
        .panelHeader{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:10px}
        .muted{opacity:.75;font-size:.9rem}
        .tableWrap{overflow:auto}
        table{width:100%;border-collapse:collapse}
        th,td{padding:10px;border-bottom:1px solid rgba(255,255,255,0.06);white-space:nowrap}
        th{font-weight:600;text-align:left;opacity:.85}
        .right{text-align:right}
        .rowWin td{background:rgba(0,255,0,0.04)}
        .rowLoss td{background:rgba(255,0,0,0.04)}
      `}</style>
    </div>
  );
}
