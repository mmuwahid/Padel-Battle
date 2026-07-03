/**
 * SubscriptionProvider — app-wide Pro subscription state, backed by RevenueCat.
 *
 * Configures the SDK once on native startup, exposes the current entitlement
 * (`isPro`), the current offering's packages, and purchase/restore actions.
 * On web (purchases unsupported) it renders children with safe Free defaults so
 * consumers can call `supported` and degrade gracefully. Trust model is
 * client-only for launch (see planning/revenuecat-setup.md).
 */
import { useEffect, useState, useCallback } from 'react';
import { SubscriptionContext } from './SubscriptionContext';
import {
  configurePurchases, fetchOffering, fetchCustomerInfo, buyPackage,
  restorePurchases, onCustomerInfoUpdate, hasProEntitlement, purchasesSupported,
} from '../revenuecat';

export function SubscriptionProvider({ children }) {
  const [isPro, setIsPro] = useState(false);
  const [offering, setOffering] = useState(null);
  const [loading, setLoading] = useState(purchasesSupported);

  useEffect(() => {
    if (!purchasesSupported) return;
    let cancelled = false;
    (async () => {
      try {
        const ok = await configurePurchases();
        if (!ok || cancelled) return;
        await onCustomerInfoUpdate((ci) => { if (!cancelled) setIsPro(hasProEntitlement(ci)); });
        const [info, off] = await Promise.all([fetchCustomerInfo(), fetchOffering()]);
        if (cancelled) return;
        setIsPro(hasProEntitlement(info));
        setOffering(off);
      } catch { /* leave Free defaults on any init failure */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const purchase = useCallback(async (aPackage) => {
    const { customerInfo, cancelled } = await buyPackage(aPackage);
    const nowPro = customerInfo ? hasProEntitlement(customerInfo) : false;
    if (!cancelled && customerInfo) setIsPro(nowPro);
    return { cancelled, isPro: nowPro };
  }, []);

  const restore = useCallback(async () => {
    const customerInfo = await restorePurchases();
    const pro = hasProEntitlement(customerInfo);
    setIsPro(pro);
    return pro;
  }, []);

  const value = { supported: purchasesSupported, isPro, offering, loading, purchase, restore };
  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}
