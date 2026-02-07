import { NextResponse } from "next/server";
import { z } from "zod";
import { geocodeAddress } from "../../../lib/google";
import { geocodeCache } from "../../../lib/cacheInstances";
import { fail, ok } from "../../../lib/response";
import { checkRateLimit, getClientIp } from "../../../lib/rateLimiter";

const schema = z.object({
  query: z.string().min(3)
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
    const key = body.query.trim().toLowerCase();
    const cached = geocodeCache.get(key);
    if (cached) {
      return NextResponse.json(ok(cached));
    }

    const data = await geocodeAddress(body.query);
    if (!data) {
      return NextResponse.json(fail("NOT_FOUND", "No matching address found."), { status: 404 });
    }

    geocodeCache.set(key, data);
    return NextResponse.json(ok(data));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json(fail("BAD_REQUEST", message), { status: 400 });
  }
}
