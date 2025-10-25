import React, { createContext, useContext, useMemo } from "react";

const Ctx = createContext({ account: null });

export function WalletProvider({ children }) {
  // placeholder wallet address for demo; wire to real wallet later
  const value = useMemo(() => ({ account: "0x1234...ABCD" }), []);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWallet() {
  return useContext(Ctx);
}
