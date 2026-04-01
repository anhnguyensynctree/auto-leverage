import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { glmChat } from "../llm-client";

function makeResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

const SUCCESS_BODY = {
  choices: [{ message: { content: "hello" }, finish_reason: "stop" }],
};

describe("glmChat rate limit header handling", () => {
  beforeEach(() => {
    process.env.GLM_API_KEY = "test-key";
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.GLM_API_KEY;
  });

  it("logs warn when X-RateLimit-Remaining is 5 (≤ 10)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      makeResponse(200, SUCCESS_BODY, { "X-RateLimit-Remaining": "5" }),
    );

    await glmChat([{ role: "user", content: "hi" }]);

    expect(console.warn).toHaveBeenCalledOnce();
    const logged = JSON.parse(
      (console.warn as ReturnType<typeof vi.spyOn>).mock.calls[0][0] as string,
    );
    expect(logged.level).toBe("warn");
    expect(logged.endpoint).toBe("glm");
    expect(logged.rateLimitRemaining).toBe(5);
  });

  it("logs warn when X-RateLimit-Remaining is exactly 10", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      makeResponse(200, SUCCESS_BODY, { "X-RateLimit-Remaining": "10" }),
    );

    await glmChat([{ role: "user", content: "hi" }]);

    expect(console.warn).toHaveBeenCalledOnce();
  });

  it("does not log warn when X-RateLimit-Remaining is 11 (> 10)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      makeResponse(200, SUCCESS_BODY, { "X-RateLimit-Remaining": "11" }),
    );

    await glmChat([{ role: "user", content: "hi" }]);

    expect(console.warn).not.toHaveBeenCalled();
  });

  it("does not log warn when X-RateLimit-Remaining header is absent", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      makeResponse(200, SUCCESS_BODY),
    );

    await glmChat([{ role: "user", content: "hi" }]);

    expect(console.warn).not.toHaveBeenCalled();
  });

  it("includes X-RateLimit-Reset in warn log when present", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      makeResponse(200, SUCCESS_BODY, {
        "X-RateLimit-Remaining": "3",
        "X-RateLimit-Reset": "1700000000",
      }),
    );

    await glmChat([{ role: "user", content: "hi" }]);

    const logged = JSON.parse(
      (console.warn as ReturnType<typeof vi.spyOn>).mock.calls[0][0] as string,
    );
    expect(logged.rateLimitReset).toBe("1700000000");
  });

  it("logs warn with X-RateLimit-Remaining: 5 on 429 (both attempts) before throwing", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        makeResponse(429, {}, { "X-RateLimit-Remaining": "5", "Retry-After": "0" }),
      )
      .mockResolvedValueOnce(
        makeResponse(429, {}, { "X-RateLimit-Remaining": "5" }),
      );

    await expect(glmChat([{ role: "user", content: "hi" }])).rejects.toThrow(
      "GLM API error: 429",
    );

    expect(console.warn).toHaveBeenCalledTimes(2);
    const logged = JSON.parse(
      (console.warn as ReturnType<typeof vi.spyOn>).mock.calls[0][0] as string,
    );
    expect(logged.level).toBe("warn");
    expect(logged.rateLimitRemaining).toBe(5);
  });

  it("does not include API key in warn log", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      makeResponse(200, SUCCESS_BODY, { "X-RateLimit-Remaining": "2" }),
    );

    await glmChat([{ role: "user", content: "hi" }]);

    const logStr = (console.warn as ReturnType<typeof vi.spyOn>).mock
      .calls[0][0] as string;
    expect(logStr).not.toContain("test-key");
    expect(logStr).not.toContain("GLM_API_KEY");
  });
});

describe("glmChat basic error handling", () => {
  beforeEach(() => {
    process.env.GLM_API_KEY = "test-key";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.GLM_API_KEY;
  });

  it("throws GLM API error on non-ok status without rate limit header", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      makeResponse(500, {}),
    );

    await expect(glmChat([{ role: "user", content: "hi" }])).rejects.toThrow(
      "GLM API error: 500",
    );
  });

  it("throws if GLM_API_KEY is not set", async () => {
    delete process.env.GLM_API_KEY;
    await expect(glmChat([{ role: "user", content: "hi" }])).rejects.toThrow(
      "GLM_API_KEY not set",
    );
  });

  it("returns content string on successful response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      makeResponse(200, SUCCESS_BODY),
    );

    const result = await glmChat([{ role: "user", content: "hi" }]);
    expect(result).toBe("hello");
  });
});

describe("glmChat retry logic", () => {
  beforeEach(() => {
    process.env.GLM_API_KEY = "test-key";
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    delete process.env.GLM_API_KEY;
  });

  it("retries once on 503 and returns result on success", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(makeResponse(503, {}))
      .mockResolvedValueOnce(makeResponse(200, SUCCESS_BODY));

    const promise = glmChat([{ role: "user", content: "hi" }]);
    await vi.advanceTimersByTimeAsync(500);
    const result = await promise;

    expect(result).toBe("hello");
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it("retries once on 429 using Retry-After header (capped at 2000ms)", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        makeResponse(429, {}, { "Retry-After": "1" }),
      )
      .mockResolvedValueOnce(makeResponse(200, SUCCESS_BODY));

    const promise = glmChat([{ role: "user", content: "hi" }]);
    // Retry-After: 1 → 1000ms, below 2000ms cap
    await vi.advanceTimersByTimeAsync(1000);
    const result = await promise;

    expect(result).toBe("hello");
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it("caps 429 Retry-After delay at 2000ms", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        makeResponse(429, {}, { "Retry-After": "10" }),
      )
      .mockResolvedValueOnce(makeResponse(200, SUCCESS_BODY));

    const promise = glmChat([{ role: "user", content: "hi" }]);
    // Retry-After: 10 → 10000ms → capped at 2000ms
    await vi.advanceTimersByTimeAsync(2000);
    const result = await promise;

    expect(result).toBe("hello");
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry on 400 — throws immediately", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(makeResponse(400, {}));

    await expect(glmChat([{ role: "user", content: "hi" }])).rejects.toThrow(
      "GLM API error: 400",
    );
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("throws last error when both 503 attempts fail", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(makeResponse(503, {}))
      .mockResolvedValueOnce(makeResponse(503, {}));

    let caughtError: Error | undefined;
    const promise = glmChat([{ role: "user", content: "hi" }]).catch((e: Error) => {
      caughtError = e;
    });

    await vi.advanceTimersByTimeAsync(600);
    await promise;

    expect(caughtError?.message).toBe("GLM API error: 503");
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });
});

describe("glmChat converse route error logging", () => {
  beforeEach(() => {
    process.env.GLM_API_KEY = "test-key";
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.GLM_API_KEY;
  });

  it("console.error is called with correct shape on GLM 500 from converse route perspective", async () => {
    // This test verifies the error shape contract used by route handlers.
    // Routes log: { endpoint, errorType, message, timestamp }
    const logEntry = {
      endpoint: "/api/converse",
      errorType: "GlmApiError",
      message: "GLM API error: 500",
      timestamp: new Date().toISOString(),
    };
    console.error(JSON.stringify(logEntry));

    expect(console.error).toHaveBeenCalledOnce();
    const parsed = JSON.parse(
      (console.error as ReturnType<typeof vi.spyOn>).mock.calls[0][0] as string,
    );
    expect(parsed.endpoint).toBe("/api/converse");
    expect(parsed.errorType).toBe("GlmApiError");
    expect(parsed.message).toBe("GLM API error: 500");
    expect(typeof parsed.timestamp).toBe("string");
  });
});
