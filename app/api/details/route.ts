import { NextResponse } from "next/server";
import { z } from "zod";
import { placeDetails } from "../../../lib/osm";
import { detailsCache } from "../../../lib/cacheInstances";
import { fail, ok } from "../../../lib/response";
import { checkRateLimit, getClientIp } from "../../../lib/rateLimiter";

const schema = z.object({
  placeId: z.string().min(2)
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
    const cached = detailsCache.get(body.placeId);
    if (cached) {
      return NextResponse.json(ok(cached));
    }

    const data = await placeDetails(body.placeId);
    if (!data) {
      return NextResponse.json(fail("NOT_FOUND", "No details found for this place."), {
        status: 404
      });
    }

    detailsCache.set(body.placeId, data);
    return NextResponse.json(ok(data));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json(fail("BAD_REQUEST", message), { status: 400 });
  }
}
