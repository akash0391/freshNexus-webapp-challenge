import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = url && token ? new Redis({ url, token }) : null;

// Envelope distinguishes a true cache miss from a cached null (e.g. confirmed-404 barcode).
export type Envelope<T> = { v: T };

export async function cacheGet<T>(key: string): Promise<Envelope<T> | null> {
  if (!redis) return null;
  try {
    return (await redis.get<Envelope<T>>(key)) ?? null;
  } catch (err) {
    console.warn("Redis GET failed, falling through:", err);
    return null;
  }
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number,
): Promise<void> {
  if (!redis) return;
  try {
    await redis.set<Envelope<T>>(key, { v: value }, { ex: ttlSeconds });
  } catch (err) {
    console.warn("Redis SET failed, skipping:", err);
  }
}
