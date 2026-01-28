"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        console.log("[PWA] Service worker registered:", registration.scope);

        // Check for updates periodically
        const checkUpdate = () => {
          registration.update().catch(() => {});
        };

        // Check for update every 60 seconds
        const interval = setInterval(checkUpdate, 60 * 1000);
        return () => clearInterval(interval);
      })
      .catch((err) => {
        console.warn("[PWA] Service worker registration failed:", err);
      });
  }, []);

  return null;
}
