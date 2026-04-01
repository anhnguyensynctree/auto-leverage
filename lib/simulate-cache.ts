const CACHE_TTL_MS = 60 * 60 * 1000; // 60 minutes

export interface SimulationResult {
  drafted_input: string;
  metric: string;
  experiment_rows: Array<{
    experiment: number;
    result: string;
    status: string;
  }>;
  outcome: string;
}

interface CacheEntry {
  result: SimulationResult;
  expiresAt: number;
}

export const simulateCache = new Map<string, CacheEntry>();

export function getCacheKey(useCase: string, components: string[]): string {
  return `${useCase}:${[...components].sort().join(",")}`;
}

export function getCached(key: string): SimulationResult | null {
  const cached = simulateCache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.result;
  }
  return null;
}

export function setCached(key: string, result: SimulationResult): void {
  simulateCache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
}
