import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// shouldThrow flag lets us test the constructor-throws branch without a nested vi.mock
const state = vi.hoisted(() => ({ shouldThrow: false }));

vi.mock("@upstash/redis", () => {
  function Redis(this: unknown) {
    if (state.shouldThrow) throw new Error("connection refused");
    Object.assign(this as object, { get: vi.fn(), set: vi.fn() });
  }
  return { Redis };
});

describe("redis-client singleton", () => {
  const ORIG_URL = process.env.UPSTASH_REDIS_REST_URL;
  const ORIG_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

  beforeEach(() => {
    vi.resetModules();
    state.shouldThrow = false;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  afterEach(() => {
    if (ORIG_URL !== undefined) process.env.UPSTASH_REDIS_REST_URL = ORIG_URL;
    else delete process.env.UPSTASH_REDIS_REST_URL;
    if (ORIG_TOKEN !== undefined)
      process.env.UPSTASH_REDIS_REST_TOKEN = ORIG_TOKEN;
    else delete process.env.UPSTASH_REDIS_REST_TOKEN;
    vi.resetModules();
  });

  it("returns a Redis instance when both env vars are present", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";

    const { redisClient } = await import("../redis-client");
    expect(redisClient).not.toBeNull();
  });

  it("returns null when UPSTASH_REDIS_REST_URL is absent", async () => {
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";

    const { redisClient } = await import("../redis-client");
    expect(redisClient).toBeNull();
  });

  it("returns null when UPSTASH_REDIS_REST_TOKEN is absent", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";

    const { redisClient } = await import("../redis-client");
    expect(redisClient).toBeNull();
  });

  it("returns null when both env vars are absent", async () => {
    const { redisClient } = await import("../redis-client");
    expect(redisClient).toBeNull();
  });

  it("returns null and does not throw when Redis constructor throws", async () => {
    state.shouldThrow = true;
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";

    const stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    const { redisClient } = await import("../redis-client");
    expect(redisClient).toBeNull();
    stderrSpy.mockRestore();
  });
});
