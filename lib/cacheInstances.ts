import { LruCache } from "./cache";

export const geocodeCache = new LruCache<{ lat: number; lng: number; formattedAddress: string }>(
  {
    maxSize: 200,
    ttlMs: 24 * 60 * 60 * 1000,
    label: "geocode"
  }
);

export const nearbyCache = new LruCache<any>({
  maxSize: 300,
  ttlMs: 10 * 60 * 1000,
  label: "nearby"
});

export const detailsCache = new LruCache<any>({
  maxSize: 300,
  ttlMs: 24 * 60 * 60 * 1000,
  label: "details"
});
