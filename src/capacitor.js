/**
 * Capacitor native bridge utilities.
 * Safe to import on web — all calls are guarded by Capacitor.isNativePlatform().
 */
import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'

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

/** Register native back button handler (Android). */
export async function registerBackButton(handler) {
  if (!isNative) return () => {};
  const { App } = await import('@capacitor/app');
  const listener = await App.addListener('backButton', handler);
  return () => listener.remove();
}
