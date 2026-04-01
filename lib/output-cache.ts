import { redisClient } from "./redis-client";

const CACHE_TTL_SECONDS = 3600; // 60 minutes

export function getCacheKey(
  components: string[],
  useCase: string | null | undefined,
): string {
  const useCasePart = useCase?.trim() || "__no_usecase__";
  return `output:${[...components].sort().join(",")}:${useCasePart}`;
}

export async function getCached(key: string): Promise<object | null> {
  if (!redisClient) return null;
  try {
    return await redisClient.get<object>(key);
  } catch {
    return null;
  }
}

export async function setCached(key: string, result: object): Promise<void> {
  if (!redisClient) return;
  try {
    await redisClient.set(key, result, { ex: CACHE_TTL_SECONDS });
  } catch {
    // no-op — cache failure is non-fatal
  }
}
