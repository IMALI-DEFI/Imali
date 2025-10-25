import React, { useEffect, useState } from "react";

export default function ImaliBalance() {
  const [bal, setBal] = useState(() => Number(localStorage.getItem("imali_balance") || 0));

  useEffect(() => {
    const id = setInterval(() => {
      // demo tick
      setBal((b) => b);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-5">
      <div className="text-sm opacity-80">IMALI Balance</div>
      <div className="text-2xl font-bold mt-1">{bal.toLocaleString()} IMALI</div>
      <div className="text-xs text-white/70 mt-1">Held across connected wallets</div>
    </div>
  );
}
