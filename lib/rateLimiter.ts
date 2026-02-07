type RateEntry = {
  windowStart: number;
  count: number;
};

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_LIMIT = 30;

const rateMap = new Map<string, RateEntry>();

export function checkRateLimit(ip: string, limit = DEFAULT_LIMIT, windowMs = DEFAULT_WINDOW_MS) {
  const now = Date.now();
  const entry = rateMap.get(ip);

  if (!entry || now - entry.windowStart > windowMs) {
    rateMap.set(ip, { windowStart: now, count: 1 });
    return { allowed: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count };
}

export function getClientIp(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return headers.get("x-real-ip") ?? "unknown";
}
