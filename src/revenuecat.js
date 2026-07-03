/**
 * RevenueCat (in-app purchases / subscriptions) bridge.
 * Native-only — every call is guarded by Capacitor.isNativePlatform() and the
 * @revenuecat/purchases-capacitor plugin is dynamically imported so this module
 * stays safe to import on web (where store purchases are unavailable). Mirrors
 * the guarded-dynamic-import pattern in capacitor.js.
 *
 * Dashboard/store setup lives in planning/revenuecat-setup.md.
 */
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();
const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'

// Public RevenueCat SDK keys — safe to ship client-side (same class as the
// Supabase anon key in supabase.js).
// iOS is wired to the real App Store key. TODO(store-launch): replace the
// Android Test Store key with the real goog_… key once the Play products are
// connected under the RevenueCat dashboard. See Step 4 in
// planning/revenuecat-setup.md.
const API_KEYS = {
  ios: 'appl_oqPyveTwMACTVTdlHUJoArMAdzN',
  android: 'test_AArrvMwTTPacAHxKwRDkUqLsKVE',
};

/** Entitlement identifier configured in the RevenueCat dashboard. */
export const PRO_ENTITLEMENT = 'pro';

/** True only inside the native iOS/Android shells. Purchases can't run on web. */
export const purchasesSupported = isNative;

let _plugin = null;
async function plugin() {
  if (!_plugin) _plugin = await import('@revenuecat/purchases-capacitor');
  return _plugin;
}

let _configured = false;

/** Configure the SDK once on native startup. Returns true when configured. */
export async function configurePurchases() {
  if (!isNative || _configured) return _configured;
  const apiKey = API_KEYS[platform];
  if (!apiKey) return false;
  const { Purchases, LOG_LEVEL } = await plugin();
  if (import.meta.env.DEV) {
    try { await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG }); } catch { /* non-fatal */ }
  }
  await Purchases.configure({ apiKey });
  _configured = true;
  return true;
}

/** True when the customerInfo grants the Pro entitlement. */
export function hasProEntitlement(customerInfo) {
  return !!customerInfo?.entitlements?.active?.[PRO_ENTITLEMENT];
}

/** Current offering (the default configured in RevenueCat), or null. */
export async function fetchOffering() {
  if (!isNative) return null;
  const { Purchases } = await plugin();
  const offerings = await Purchases.getOfferings();
  return offerings?.current ?? null;
}

/** Latest customerInfo, or null on web / error. */
export async function fetchCustomerInfo() {
  if (!isNative) return null;
  const { Purchases } = await plugin();
  const { customerInfo } = await Purchases.getCustomerInfo();
  return customerInfo ?? null;
}

/**
 * Purchase a package. Resolves { customerInfo, cancelled }. A user-cancelled
 * purchase resolves with cancelled:true rather than throwing.
 */
export async function buyPackage(aPackage) {
  const { Purchases } = await plugin();
  try {
    const { customerInfo } = await Purchases.purchasePackage({ aPackage });
    return { customerInfo, cancelled: false };
  } catch (e) {
    if (e?.userCancelled || e?.code === 'PURCHASE_CANCELLED_ERROR' || /cancel/i.test(e?.message || '')) {
      return { customerInfo: null, cancelled: true };
    }
    throw e;
  }
}

/** Restore prior purchases. Resolves customerInfo (or null). */
export async function restorePurchases() {
  const { Purchases } = await plugin();
  const { customerInfo } = await Purchases.restorePurchases();
  return customerInfo ?? null;
}

/** Subscribe to entitlement changes. Best-effort; no-op on web. */
export async function onCustomerInfoUpdate(cb) {
  if (!isNative) return;
  try {
    const { Purchases } = await plugin();
    await Purchases.addCustomerInfoUpdateListener(cb);
  } catch { /* listener unsupported — refresh-on-action still covers it */ }
}
