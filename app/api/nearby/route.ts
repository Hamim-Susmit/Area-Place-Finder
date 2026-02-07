import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchNearbyPlaces } from "../../../lib/osm";
import type { NormalizedPlace } from "../../../lib/types";
import { nearbyCache } from "../../../lib/cacheInstances";
import { fail, ok } from "../../../lib/response";
import { checkRateLimit, getClientIp } from "../../../lib/rateLimiter";

const schema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusMeters: z.number().min(100).max(10000),
  category: z.enum(["restaurants", "medical"]),
  pageToken: z.string().optional()
});

const PAGE_SIZE = 30;

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);
  const rate = checkRateLimit(ip);
  if (!rate.allowed) {
    return NextResponse.json(fail("RATE_LIMIT", "Too many requests. Please slow down."), {
      status: 429
    });
  }

  try {
    const body = schema.parse(await request.json());
    const latKey = body.lat.toFixed(4);
    const lngKey = body.lng.toFixed(4);
    const cacheKey = `${latKey},${lngKey}:${body.radiusMeters}:${body.category}`;

    let allResults = nearbyCache.get(cacheKey) as NormalizedPlace[] | undefined;
    if (!allResults) {
      allResults = await fetchNearbyPlaces(body);
      nearbyCache.set(cacheKey, allResults);
    }

    const offset = body.pageToken ? Number(body.pageToken) : 0;
    const safeOffset = Number.isFinite(offset) && offset > 0 ? Math.floor(offset) : 0;
    const results = allResults.slice(safeOffset, safeOffset + PAGE_SIZE);
    const nextPageToken =
      safeOffset + PAGE_SIZE < allResults.length ? String(safeOffset + PAGE_SIZE) : undefined;

    return NextResponse.json(
      ok({
        results,
        nextPageToken
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json(fail("BAD_REQUEST", message), { status: 400 });
  }
}
