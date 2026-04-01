import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SimulationResult } from "../simulate-cache";

// vi.hoisted ensures these are available when vi.mock factories run (hoisted to top)
const { mockGet, mockSet, mockRedisClient } = vi.hoisted(() => {
  const mockGet = vi.fn();
  const mockSet = vi.fn();
  const mockRedisClient: { get: typeof mockGet; set: typeof mockSet } | null = {
    get: mockGet,
    set: mockSet,
  };
  return { mockGet, mockSet, mockRedisClient };
});

vi.mock("@upstash/redis", () => ({
  Redis: vi.fn().mockImplementation(() => ({ get: mockGet, set: mockSet })),
}));

vi.mock("../redis-client", () => ({ redisClient: mockRedisClient }));

const CACHED_VALUE: SimulationResult = {
  drafted_input: "test input",
  metric: "conversion",
  experiment_rows: [{ experiment: 1, result: "win", status: "complete" }],
  outcome: "positive",
};

describe("simulate-cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1 — hit: Redis GET returns cached value → getCached returns result", async () => {
    const { getCached } = await import("../simulate-cache");
    mockGet.mockResolvedValueOnce(CACHED_VALUE);

    const result = await getCached("simulate:uc:comp");

    expect(mockGet).toHaveBeenCalledOnce();
    expect(mockGet).toHaveBeenCalledWith("simulate:uc:comp");
    expect(result).toEqual(CACHED_VALUE);
  });

  it("2 — miss: Redis GET returns null → getCached returns null", async () => {
    const { getCached } = await import("../simulate-cache");
    mockGet.mockResolvedValueOnce(null);

    const result = await getCached("simulate:uc:miss");

    expect(result).toBeNull();
  });

  it("3 — Redis GET throws → getCached returns null without propagating", async () => {
    const { getCached } = await import("../simulate-cache");
    mockGet.mockRejectedValueOnce(new Error("network error"));

    await expect(getCached("simulate:uc:err")).resolves.toBeNull();
  });

  it("4 — Redis SET throws → setCached is a silent no-op", async () => {
    const { setCached } = await import("../simulate-cache");
    mockSet.mockRejectedValueOnce(new Error("set error"));

    await expect(
      setCached("simulate:uc:seterr", CACHED_VALUE),
    ).resolves.toBeUndefined();
    expect(mockSet).toHaveBeenCalledOnce();
  });

  it("5 — redisClient null → getCached returns null; setCached is no-op", async () => {
    vi.resetModules();
    vi.doMock("../redis-client", () => ({ redisClient: null }));

    const { getCached: getCachedNull, setCached: setCachedNull } = await import(
      "../simulate-cache"
    );

    const getResult = await getCachedNull("any-key");
    expect(getResult).toBeNull();

    await expect(
      setCachedNull("any-key", CACHED_VALUE),
    ).resolves.toBeUndefined();
    // mockGet/mockSet should not be called — null client short-circuits
    expect(mockGet).not.toHaveBeenCalled();
    expect(mockSet).not.toHaveBeenCalled();

    vi.resetModules();
  });
});
