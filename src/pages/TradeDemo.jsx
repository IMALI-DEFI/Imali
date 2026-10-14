import React from "react";
import { Link } from "react-router-dom";
import MultiServiceDemo from "../components/demo/MultiServiceDemo";

export default function TradeDemo(){
 return <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6">
  <div className="mx-auto max-w-6xl">
   <Link to="/" className="mb-6 inline-block text-sm font-semibold text-emerald-300">← IMALI homepage</Link>
   <MultiServiceDemo />
   <p className="mt-4 text-center text-sm text-slate-400">Educational simulation only. Prices are illustrative, not live market quotes. No real broker connections or orders.</p>
  </div>
 </main>;
}
