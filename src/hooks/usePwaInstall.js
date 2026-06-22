// PWA install-prompt subsystem extracted from AppContent (Issue #2 refactor).
// Captures the `beforeinstallprompt` event so the app can offer an in-app
// "Install" button, and exposes a trigger to fire the native prompt.
import { useState, useEffect } from "react";

export function usePwaInstall() {
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    const h = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const r = await installPrompt.userChoice;
    if (r.outcome === "accepted") setInstallPrompt(null);
  };

  return { installPrompt, handleInstall };
}
