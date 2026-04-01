import { Redis } from "@upstash/redis";

function createRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  try {
    return new Redis({ url, token });
  } catch (err) {
    process.stderr.write(
      `[redis-client] Failed to initialise Redis: ${String(err)}\n`,
    );
    return null;
  }
}

export const redisClient: Redis | null = createRedisClient();
