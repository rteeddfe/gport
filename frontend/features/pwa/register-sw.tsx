"use client";

import { useEffect } from "react";

/** Registers the passthrough service worker (public/sw.js) so Chrome
 * treats GPort as installable. It caches nothing, so dev/HMR is unaffected. */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Installability is a progressive enhancement — never block the app.
      });
    };
    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
