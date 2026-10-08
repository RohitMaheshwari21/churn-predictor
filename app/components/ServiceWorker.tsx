"use client";

import { useEffect } from "react";

/** Registers the offline-capable service worker (production only). */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* offline support is a progressive enhancement; the app works without it */
      });
    }
  }, []);
  return null;
}
