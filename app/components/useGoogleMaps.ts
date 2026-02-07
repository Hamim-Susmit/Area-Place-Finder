"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    google?: typeof google;
  }
}

export function useGoogleMaps() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (window.google?.maps) {
      setReady(true);
      return;
    }
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    if (!apiKey) {
      setError("Missing NEXT_PUBLIC_GOOGLE_MAPS_KEY.");
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-google-maps-script]"
    );
    if (existing) {
      existing.addEventListener("load", () => setReady(true));
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMapsScript = "true";
    script.onload = () => setReady(true);
    script.onerror = () => setError("Failed to load Google Maps.");
    document.head.appendChild(script);
  }, []);

  return { ready, error };
}
