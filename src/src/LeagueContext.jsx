import { createContext, useContext } from "react";

export const LeagueContext = createContext(null);

export function useLeague() {
  const ctx = useContext(LeagueContext);
  if (!ctx) throw new Error("useLeague must be used within LeagueContext.Provider");
  return ctx;
}
