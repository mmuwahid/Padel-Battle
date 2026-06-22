/**
 * Capacitor native bridge utilities.
 * Safe to import on web — all calls are guarded by Capacitor.isNativePlatform().
 */
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();
const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'

/** Hide the native splash screen (no-op on web). */
export async function hideNativeSplash() {
  if (!isNative) return;
  const { SplashScreen } = await import('@capacitor/splash-screen');
  await SplashScreen.hide({ fadeOutDuration: 200 });
}

/** Set status bar style for dark theme (no-op on web). */
export async function configureStatusBar() {
  if (!isNative) return;
  const { StatusBar, Style } = await import('@capacitor/status-bar');
  await StatusBar.setStyle({ style: Style.Dark });
  if (platform === 'android') {
    await StatusBar.setBackgroundColor({ color: '#0a0a0f' });
  }
}

let _haptics = null;
/**
 * Fire a short impact haptic (no-op on web; best-effort on native).
 * The @capacitor/haptics module is dynamically imported once and cached so
 * rapid taps don't re-import. Failures (unsupported device) are swallowed.
 */
export async function triggerHaptic(style = 'light') {
  if (!isNative) return;
  try {
    if (!_haptics) _haptics = await import('@capacitor/haptics');
    const { Haptics, ImpactStyle } = _haptics;
    const map = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
    await Haptics.impact({ style: map[style] || ImpactStyle.Light });
  } catch { /* haptics unavailable — ignore */ }
}

/** Register native back button handler (Android). */
export async function registerBackButton(handler) {
  if (!isNative) return () => {};
  const { App } = await import('@capacitor/app');
  const listener = await App.addListener('backButton', handler);
  return () => listener.remove();
}
