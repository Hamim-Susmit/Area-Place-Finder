export type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export class LruCache<T> {
  private maxSize: number;
  private ttlMs: number;
  private map = new Map<string, CacheEntry<T>>();
  private label: string;

  constructor({ maxSize, ttlMs, label }: { maxSize: number; ttlMs: number; label: string }) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.label = label;
  }

  get(key: string): T | undefined {
    const entry = this.map.get(key);
    if (!entry) {
      this.log("MISS", key);
      return undefined;
    }
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      this.log("EXPIRED", key);
      return undefined;
    }
    this.map.delete(key);
    this.map.set(key, entry);
    this.log("HIT", key);
    return entry.value;
  }

  set(key: string, value: T) {
    this.map.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    this.evict();
  }

  private evict() {
    while (this.map.size > this.maxSize) {
      const oldestKey = this.map.keys().next().value as string | undefined;
      if (!oldestKey) return;
      this.map.delete(oldestKey);
    }
  }

  private log(event: string, key: string) {
    if (process.env.NODE_ENV === "development") {
      console.info(`[cache:${this.label}] ${event} ${key}`);
    }
  }
}
