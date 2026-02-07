import { NextResponse } from "next/server";
import { z } from "zod";
import { nearbySearch } from "../../../lib/google";
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
    const cacheKey = `${latKey},${lngKey}:${body.radiusMeters}:${body.category}:${body.pageToken ?? "first"}`;

    const cached = nearbyCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(ok(cached));
    }

    const data = await nearbySearch(body);
    nearbyCache.set(cacheKey, data);
    return NextResponse.json(ok(data));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json(fail("BAD_REQUEST", message), { status: 400 });
  }
}
