"use client";

import { useEffect, useState } from "react";

export type LeafletModule = typeof import("leaflet");

export function useLeaflet() {
  const [leaflet, setLeaflet] = useState<LeafletModule | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    import("leaflet")
      .then((module) => {
        if (active) setLeaflet(module);
      })
      .catch(() => {
        if (active) setError("Failed to load the map library.");
      });
    return () => {
      active = false;
    };
  }, []);

  return { leaflet, ready: Boolean(leaflet), error };
}
