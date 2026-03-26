// In-memory sliding window rate limiter.
// Serverless note: state resets on cold start. Provides per-instance limiting.
// Upgrade path: replace windowStore with Vercel KV for global enforcement.

interface WindowEntry {
  timestamps: number[];
}

const windowStore = new Map<string, WindowEntry>();

const WINDOW_MS = 60 * 60 * 1000; // 1 hour

const LIMITS: Record<string, number> = {
  navigate: 5, // classification calls per IP per hour
  strategy: 3, // strategy calls per IP per hour
};

function pruneWindow(entry: WindowEntry, now: number): void {
  entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS);
}

export function checkRateLimit(
  ip: string,
  callType: "navigate" | "strategy",
): { allowed: boolean; remaining: number; resetMs: number } {
  const key = `${ip}:${callType}`;
  const now = Date.now();
  const limit = LIMITS[callType];

  if (!windowStore.has(key)) {
    windowStore.set(key, { timestamps: [] });
  }

  const entry = windowStore.get(key)!;
  pruneWindow(entry, now);

  const remaining = limit - entry.timestamps.length;
  const oldest = entry.timestamps[0] ?? now;
  const resetMs = oldest + WINDOW_MS - now;

  if (entry.timestamps.length >= limit) {
    return { allowed: false, remaining: 0, resetMs };
  }

  entry.timestamps.push(now);
  return { allowed: true, remaining: remaining - 1, resetMs };
}
