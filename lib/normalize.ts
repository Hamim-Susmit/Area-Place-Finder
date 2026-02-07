import { haversineDistanceMeters } from "./haversine";
import type { NormalizedPlace } from "./types";

type GoogleNearbyResult = {
  place_id: string;
  name: string;
  geometry?: { location?: { lat: number; lng: number } };
  vicinity?: string;
  formatted_address?: string;
  rating?: number;
  user_ratings_total?: number;
  opening_hours?: { open_now?: boolean };
  types?: string[];
};

export function normalizePlace(
  place: GoogleNearbyResult,
  center: { lat: number; lng: number }
): NormalizedPlace | null {
  const lat = place.geometry?.location?.lat;
  const lng = place.geometry?.location?.lng;
  if (lat == null || lng == null) return null;

  return {
    placeId: place.place_id,
    name: place.name,
    lat,
    lng,
    address: place.vicinity || place.formatted_address || "",
    rating: place.rating,
    userRatingsTotal: place.user_ratings_total,
    openNow: place.opening_hours?.open_now,
    types: place.types,
    distanceMeters: haversineDistanceMeters(center.lat, center.lng, lat, lng)
  };
}
