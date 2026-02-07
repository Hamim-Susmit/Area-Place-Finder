import { normalizePlace } from "./normalize";
import type { Category, NormalizedPlace, PlaceDetails } from "./types";

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

const NOMINATIM_BASE =
  process.env.NOMINATIM_BASE_URL ?? "https://nominatim.openstreetmap.org";
const OVERPASS_ENDPOINT =
  process.env.OVERPASS_ENDPOINT ?? "https://overpass-api.de/api/interpreter";
const OVERPASS_TIMEOUT = Number.isFinite(Number(process.env.OVERPASS_TIMEOUT))
  ? Number(process.env.OVERPASS_TIMEOUT)
  : 25;
const OSM_USER_AGENT =
  process.env.OSM_USER_AGENT ?? "AreaPlaceFinder/1.0 (contact not set)";
const NOMINATIM_EMAIL = process.env.OSM_NOMINATIM_EMAIL;

function buildHeaders() {
  const headers: Record<string, string> = {
    "User-Agent": OSM_USER_AGENT,
    Accept: "application/json"
  };
  if (NOMINATIM_EMAIL) {
    headers.From = NOMINATIM_EMAIL;
  }
  return headers;
}

async function fetchJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: { ...buildHeaders(), ...(init?.headers ?? {}) },
    next: { revalidate: 0 }
  });

  if (!response.ok) {
    throw new Error(`OpenStreetMap API error: ${response.status}`);
  }

  return (await response.json()) as T;
}

async function overpassRequest<T>(query: string) {
  const body = `data=${encodeURIComponent(query)}`;
  return fetchJson<T>(OVERPASS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });
}

export async function geocodeAddress(query: string) {
  const params = new URLSearchParams({
    format: "json",
    q: query,
    limit: "1",
    addressdetails: "1"
  });
  if (NOMINATIM_EMAIL) params.set("email", NOMINATIM_EMAIL);
  const url = `${NOMINATIM_BASE}/search?${params.toString()}`;

  const data = await fetchJson<
    Array<{ lat: string; lon: string; display_name: string }>
  >(url);

  if (!data.length) return null;

  return {
    lat: Number(data[0].lat),
    lng: Number(data[0].lon),
    formattedAddress: data[0].display_name
  };
}

function buildOverpassQuery(params: {
  lat: number;
  lng: number;
  radiusMeters: number;
  category: Category;
}) {
  const filters: string[] = [];
  if (params.category === "restaurants") {
    // Include all dining establishments: restaurants, cafes, fast food, pubs, bars, etc.
    filters.push('["amenity"~"^(restaurant|cafe|fast_food|pub|bar|food_court|kebab|pizza|burger|chinese|indian|thai|mexican|japanese|sushi|barbecue|ice_cream|bakery|coffee|tea|wine_bar)$"]');
  } else {
    filters.push('["amenity"~"^(hospital|clinic|doctors|pharmacy|dentist|optician|veterinary|nursing_home)$"]');
    filters.push('["healthcare"]');
  }

  const selectors = filters
    .map((filter) => {
      const around = `(around:${params.radiusMeters},${params.lat},${params.lng})`;
      return [
        `node${filter}${around};`,
        `way${filter}${around};`,
        `relation${filter}${around};`
      ].join("\n");
    })
    .join("\n");

  return `
    [out:json][timeout:${OVERPASS_TIMEOUT}];
    (
      ${selectors}
    );
    out body center;
  `;
}

export async function fetchNearbyPlaces(params: {
  lat: number;
  lng: number;
  radiusMeters: number;
  category: Category;
}): Promise<NormalizedPlace[]> {
  const query = buildOverpassQuery(params);
  const data = await overpassRequest<{ elements?: OverpassElement[] }>(query);
  const elements = data.elements ?? [];

  const deduped = new Map<string, NormalizedPlace>();
  for (const element of elements) {
    const normalized = normalizePlace(element, { lat: params.lat, lng: params.lng });
    if (normalized) {
      deduped.set(normalized.placeId, normalized);
    }
  }

  const results = Array.from(deduped.values());
  results.sort((a, b) => a.distanceMeters - b.distanceMeters);

  return results;
}

export async function placeDetails(placeId: string): Promise<PlaceDetails | null> {
  const [type, rawId] = placeId.split(":");
  if (!type || !rawId) return null;
  if (!["node", "way", "relation"].includes(type)) return null;

  const id = Number(rawId);
  if (!Number.isFinite(id)) return null;

  const query = `
    [out:json][timeout:${OVERPASS_TIMEOUT}];
    ${type}(${id});
    out tags center;
  `;

  const data = await overpassRequest<{ elements?: OverpassElement[] }>(query);
  const element = data.elements?.[0];
  const tags = element?.tags;
  if (!tags) return null;

  const phone = tags.phone || tags["contact:phone"] || tags["contact:mobile"];
  const website = tags.website || tags["contact:website"] || tags.url;
  const openingHours = tags.opening_hours
    ? tags.opening_hours
        .split(";")
        .map((entry) => entry.trim())
        .filter(Boolean)
    : undefined;

  if (!phone && !website && !openingHours) {
    return null;
  }

  return {
    phone,
    website,
    openingHours
  };
}
