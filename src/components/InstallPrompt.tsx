"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const wasDismissed = sessionStorage.getItem("pwa-install-dismissed");
    if (wasDismissed) {
      setDismissed(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    setShowPrompt(false);
    setDismissed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("pwa-install-dismissed", "1");
    }
  }

  if (!showPrompt || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-80 z-50 animate-fade-in-up">
      <div className="bg-scene-900 border border-accent/30 rounded-2xl p-4 shadow-2xl glow-red">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xl">📱</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm">Instala Page Blox</p>
            <p className="text-white/50 text-xs mt-0.5">
              Acceso rápido desde tu pantalla de inicio
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white/30 hover:text-white text-lg leading-none -mt-1"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDismiss}
            className="flex-1 bg-scene-800 text-white/60 py-2 rounded-lg text-xs font-medium hover:bg-scene-700 transition-colors"
          >
            Ahora no
          </button>
          <button
            onClick={handleInstall}
            className="flex-1 bg-accent text-white py-2 rounded-lg text-xs font-semibold hover:bg-accent-light transition-colors glow-red"
          >
            Instalar
          </button>
        </div>
      </div>
    </div>
  );
}