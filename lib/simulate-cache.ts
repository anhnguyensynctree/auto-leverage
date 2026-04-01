import { redisClient } from "./redis-client";

const CACHE_TTL_SECONDS = 3600; // 60 minutes

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

export function getCacheKey(useCase: string, components: string[]): string {
  return `simulate:${useCase}:${[...components].sort().join(",")}`;
}

export async function getCached(
  key: string,
): Promise<SimulationResult | null> {
  if (!redisClient) return null;
  try {
    return await redisClient.get<SimulationResult>(key);
  } catch {
    return null;
  }
}

export async function setCached(
  key: string,
  result: SimulationResult,
): Promise<void> {
  if (!redisClient) return;
  try {
    await redisClient.set(key, result, { ex: CACHE_TTL_SECONDS });
  } catch {
    // no-op — cache failure is non-fatal
  }
}
