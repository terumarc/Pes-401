import { unstable_cache } from "next/cache";

type CacheEntry<T> = { data: T; expiresAt: number };
const memoryCache = new Map<string, CacheEntry<any>>();

export function getFromMemCache<T>(key: string): T | undefined {
  const entry = memoryCache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return undefined;
  }
  return entry.data;
}

export function setInMemCache<T>(key: string, data: T, ttlSeconds = 60): T {
  memoryCache.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 });
  return data;
}

export function invalidateMemCache(tagOrPattern?: string): void {
  if (!tagOrPattern) {
    memoryCache.clear();
    return;
  }
  for (const key of memoryCache.keys()) {
    if (key.includes(tagOrPattern)) {
      memoryCache.delete(key);
    }
  }
}

export function safeCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyParts?: string[],
  options?: { revalidate?: number | false; tags?: string[] }
): T {
  const cacheKey = keyParts ? keyParts.join(":") : fn.name || "cache_fn";
  const ttl = typeof options?.revalidate === "number" ? options.revalidate : 60;

  return (async (...args: Parameters<T>) => {
    const fullKey = `${cacheKey}:${JSON.stringify(args)}`;
    const mem = getFromMemCache<Awaited<ReturnType<T>>>(fullKey);
    if (mem !== undefined) {
      return mem;
    }

    try {
      const cached = unstable_cache(fn, keyParts, options);
      const res = await cached(...args);
      setInMemCache(fullKey, res, ttl);
      return res;
    } catch {
      const res = await fn(...args);
      setInMemCache(fullKey, res, ttl);
      return res;
    }
  }) as T;
}
