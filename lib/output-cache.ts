const CACHE_TTL_MS = 60 * 60 * 1000; // 60 minutes

interface CacheEntry {
  result: object;
  expiresAt: number;
}

export const outputCache = new Map<string, CacheEntry>();

export function getCacheKey(
  components: string[],
  useCase: string | null | undefined,
): string {
  const useCasePart = useCase?.trim() || "__no_usecase__";
  return `${[...components].sort().join(",")}:${useCasePart}`;
}

export function getCached(key: string): object | null {
  const cached = outputCache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.result;
  }
  return null;
}

export function setCached(key: string, result: object): void {
  outputCache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
}
