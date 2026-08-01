import React, { useState } from "react";

export default function TxActionButton({ label = "Action", onClick }) {
  const [busy, setBusy] = useState(false);

  return (
    <button
      className="rounded-xl bg-emerald-500 px-4 py-2 font-semibold text-black hover:bg-emerald-400 disabled:opacity-60"
      disabled={busy}
      onClick={async () => {
        try {
          setBusy(true);
          await onClick?.();
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Working..." : label}
    </button>
  );
}
