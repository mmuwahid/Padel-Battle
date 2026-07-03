/**
 * SubscriptionContext — the context object + `useSubscription` hook.
 * The provider lives in SubscriptionProvider.jsx (kept separate so this module
 * exports no components, satisfying react-refresh/only-export-components — the
 * same split used by LeagueContext).
 */
import { createContext, useContext } from 'react';

export const SubscriptionContext = createContext(null);

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
}
