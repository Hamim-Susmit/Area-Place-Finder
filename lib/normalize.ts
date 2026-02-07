import { haversineDistanceMeters } from "./haversine";
import type { NormalizedPlace } from "./types";

type OsmElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

function titleize(value: string) {
  return value
    .split(/[_-]/)
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}

function formatAddress(tags: Record<string, string>) {
  const full = tags["addr:full"];
  if (full) return full;

  const street = [tags["addr:housenumber"], tags["addr:street"]]
    .filter(Boolean)
    .join(" ")
    .trim();
  const locality = [tags["addr:city"], tags["addr:state"], tags["addr:postcode"]]
    .filter(Boolean)
    .join(", ");
  const country = tags["addr:country"];

  const parts = [street, locality, country].filter(Boolean);
  return parts.join(", ");
}

function extractTypes(tags: Record<string, string>) {
  const types: string[] = [];
  const keys = ["amenity", "healthcare", "shop", "tourism", "leisure", "office"];
  keys.forEach((key) => {
    const value = tags[key];
    if (value) types.push(`${key}:${value}`);
  });
  if (tags.cuisine) types.push(`cuisine:${tags.cuisine}`);
  return types;
}

export function normalizePlace(
  place: OsmElement,
  center: { lat: number; lng: number }
): NormalizedPlace | null {
  const lat = place.lat ?? place.center?.lat;
  const lng = place.lon ?? place.center?.lon;
  if (lat == null || lng == null) return null;

  const tags = place.tags ?? {};
  const fallback = tags.amenity || tags.shop || tags.healthcare || "place";
  const name = tags.name || tags["name:en"] || tags.brand || titleize(fallback);
  const address = formatAddress(tags);

  return {
    placeId: `${place.type}:${place.id}`,
    name,
    lat,
    lng,
    address,
    types: extractTypes(tags),
    distanceMeters: haversineDistanceMeters(center.lat, center.lng, lat, lng)
  };
}
