import { normalizePlace } from "./normalize";
import type { Category, NearbyResult, NormalizedPlace, PlaceDetails } from "./types";

const GOOGLE_BASE = "https://maps.googleapis.com/maps/api";

function getServerKey() {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key) {
    throw new Error("Missing GOOGLE_MAPS_SERVER_KEY");
  }
  return key;
}

async function fetchJson<T>(url: string) {
  const response = await fetch(url, { next: { revalidate: 0 } });
  if (!response.ok) {
    throw new Error(`Google API error: ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function geocodeAddress(query: string) {
  const key = getServerKey();
  const url = `${GOOGLE_BASE}/geocode/json?address=${encodeURIComponent(query)}&key=${key}`;
  const data = await fetchJson<{ status: string; results: Array<{ geometry: { location: { lat: number; lng: number } }; formatted_address: string }> }>(
    url
  );

  if (data.status !== "OK" || data.results.length === 0) {
    return null;
  }

  return {
    lat: data.results[0].geometry.location.lat,
    lng: data.results[0].geometry.location.lng,
    formattedAddress: data.results[0].formatted_address
  };
}

function encodePageToken(tokens: Record<string, string | undefined>) {
  const hasToken = Object.values(tokens).some(Boolean);
  if (!hasToken) return undefined;
  return Buffer.from(JSON.stringify(tokens)).toString("base64");
}

function decodePageToken(token?: string) {
  if (!token) return undefined;
  try {
    const decoded = JSON.parse(Buffer.from(token, "base64").toString("utf8")) as Record<string, string>;
    return decoded;
  } catch {
    return undefined;
  }
}

async function nearbyRequest(params: {
  lat: number;
  lng: number;
  radiusMeters: number;
  type?: string;
  pageToken?: string;
}) {
  const key = getServerKey();
  const search = new URLSearchParams({
    location: `${params.lat},${params.lng}`,
    radius: String(params.radiusMeters),
    key
  });
  if (params.type) search.set("type", params.type);
  if (params.pageToken) search.set("pagetoken", params.pageToken);

  const url = `${GOOGLE_BASE}/place/nearbysearch/json?${search.toString()}`;
  const data = await fetchJson<{
    status: string;
    next_page_token?: string;
    results: Array<any>;
  }>(url);

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Google Places status: ${data.status}`);
  }

  return data;
}

export async function nearbySearch(params: {
  lat: number;
  lng: number;
  radiusMeters: number;
  category: Category;
  pageToken?: string;
}): Promise<NearbyResult> {
  if (params.category === "restaurants") {
    const data = await nearbyRequest({
      lat: params.lat,
      lng: params.lng,
      radiusMeters: params.radiusMeters,
      type: "restaurant",
      pageToken: params.pageToken
    });

    return normalizeNearbyResults(data.results, params, data.next_page_token);
  }

  const tokenMap = decodePageToken(params.pageToken);
  const requests = [
    { type: "hospital", pageToken: tokenMap?.hospital },
    { type: "doctor", pageToken: tokenMap?.doctor },
    { type: "pharmacy", pageToken: tokenMap?.pharmacy }
  ];

  const responses = await Promise.all(
    requests.map((request) =>
      nearbyRequest({
        lat: params.lat,
        lng: params.lng,
        radiusMeters: params.radiusMeters,
        type: request.type,
        pageToken: request.pageToken
      })
    )
  );

  const places = responses.flatMap((response) => response.results);
  const deduped = new Map<string, NormalizedPlace>();
  for (const place of places) {
    const normalized = normalizePlace(place, { lat: params.lat, lng: params.lng });
    if (normalized) {
      deduped.set(normalized.placeId, normalized);
    }
  }

  const nextPageToken = encodePageToken({
    hospital: responses[0].next_page_token,
    doctor: responses[1].next_page_token,
    pharmacy: responses[2].next_page_token
  });

  return {
    results: Array.from(deduped.values()),
    nextPageToken
  };
}

function normalizeNearbyResults(
  results: Array<any>,
  center: { lat: number; lng: number },
  nextPageToken?: string
): NearbyResult {
  const normalized = results
    .map((result) => normalizePlace(result, center))
    .filter((place): place is NormalizedPlace => Boolean(place));

  return {
    results: normalized,
    nextPageToken
  };
}

export async function placeDetails(placeId: string): Promise<PlaceDetails | null> {
  const key = getServerKey();
  const search = new URLSearchParams({
    place_id: placeId,
    fields: "formatted_phone_number,website,opening_hours",
    key
  });
  const url = `${GOOGLE_BASE}/place/details/json?${search.toString()}`;
  const data = await fetchJson<{
    status: string;
    result?: {
      formatted_phone_number?: string;
      website?: string;
      opening_hours?: { weekday_text?: string[] };
    };
  }>(url);

  if (data.status !== "OK" || !data.result) {
    return null;
  }

  return {
    phone: data.result.formatted_phone_number,
    website: data.result.website,
    openingHours: data.result.opening_hours?.weekday_text
  };
}
