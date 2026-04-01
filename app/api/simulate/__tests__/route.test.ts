import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/simulate/route";
import type { SimulationResult } from "@/lib/simulate-cache";

vi.mock("@/lib/simulate-cache", () => ({
  getCacheKey: (useCase: string, components: string[]) =>
    `simulate:${useCase}:${[...components].sort().join(",")}`,
  getCached: vi.fn().mockResolvedValue(null),
  setCached: vi.fn().mockResolvedValue(undefined),
}));

import { getCached, setCached } from "@/lib/simulate-cache";

const FIXTURE: SimulationResult = {
  drafted_input:
    "| Run | Layers | LR |\n|---|---|---|\n| A | 6 | 3e-4 |\n| B | 8 | 3e-4 |",
  metric: "We'd watch val_bpb improve over each experiment",
  experiment_rows: [
    { experiment: 1, result: "0.997", status: "No change" },
    { experiment: 2, result: "0.992", status: "Improved" },
    { experiment: 3, result: "0.985", status: "Best so far" },
    { experiment: 4, result: "0.987", status: "Slightly worse" },
  ],
  outcome:
    "By experiment 3, the model reached its best quality score of 0.985.",
};

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/simulate", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeGlmResponse(fixture: SimulationResult): Response {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content: JSON.stringify(fixture) } }],
    }),
    { status: 200 },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("GLM_API_KEY", "test-key-123");
  vi.mocked(getCached).mockResolvedValue(null);
  vi.mocked(setCached).mockResolvedValue(undefined);
});

describe("POST /api/simulate — success path", () => {
  it("returns SimulationResult when GLM responds with valid JSON", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(makeGlmResponse(FIXTURE));

    const res = await POST(
      makeRequest({
        useCase: "NBA team performance prediction",
        components: ["train"],
      }),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.error).toBeNull();
    expect(json.data).toEqual(FIXTURE);
    expect(json.data.experiment_rows).toHaveLength(4);
  });

  it("passes useCase and components to GLM in request body", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(makeGlmResponse(FIXTURE));
    global.fetch = mockFetch;

    await POST(
      makeRequest({
        useCase: "predict NBA wins",
        components: ["train", "prepare"],
      }),
    );

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(callBody.messages[1].content).toContain("predict NBA wins");
    expect(callBody.messages[1].content).toContain("train, prepare");
  });
});

describe("POST /api/simulate — GLM error paths", () => {
  it("returns { data: null, error } when GLM responds with non-200 status", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "rate limit" }), { status: 429 }),
      );

    const res = await POST(
      makeRequest({ useCase: "test", components: ["train"] }),
    );
    const json = await res.json();

    expect(json.data).toBeNull();
    expect(json.error).toMatch(/GLM API error/);
  });

  it("returns { data: null, error } when GLM returns invalid JSON in content", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: "not valid json {{" } }],
          }),
          { status: 200 },
        ),
      );

    const res = await POST(
      makeRequest({ useCase: "test", components: ["train"] }),
    );
    const json = await res.json();

    expect(json.data).toBeNull();
    expect(typeof json.error).toBe("string");
  });

  it("returns { data: null, error } when fetch throws (network failure)", async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const res = await POST(
      makeRequest({ useCase: "test", components: ["train"] }),
    );
    const json = await res.json();

    expect(json.data).toBeNull();
    expect(json.error).toBe("ECONNREFUSED");
  });

  it("returns 500 when GLM_API_KEY is not set", async () => {
    vi.stubEnv("GLM_API_KEY", "");

    const res = await POST(
      makeRequest({ useCase: "test", components: ["train"] }),
    );
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.data).toBeNull();
    expect(json.error).toMatch(/GLM_API_KEY/);
  });
});

describe("POST /api/simulate — validation", () => {
  it("returns 400 for missing components", async () => {
    const res = await POST(makeRequest({ useCase: "test" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.data).toBeNull();
  });

  it("returns 400 for malformed JSON body", async () => {
    const req = new Request("http://localhost/api/simulate", {
      method: "POST",
      body: "{{bad",
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.data).toBeNull();
  });
});

describe("POST /api/simulate — TTL cache", () => {
  it("cache hit: second identical request returns cached result without calling GLM", async () => {
    const mockFetch = vi.fn().mockResolvedValue(makeGlmResponse(FIXTURE));
    global.fetch = mockFetch;
    // First call: miss → GLM called; second call: hit
    vi.mocked(getCached)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(FIXTURE);

    await POST(makeRequest({ useCase: "rag pipeline", components: ["train", "prepare"] }));
    await POST(makeRequest({ useCase: "rag pipeline", components: ["train", "prepare"] }));

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("cache hit: component order does not affect cache key", async () => {
    const mockFetch = vi.fn().mockResolvedValue(makeGlmResponse(FIXTURE));
    global.fetch = mockFetch;
    vi.mocked(getCached)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(FIXTURE);

    await POST(makeRequest({ useCase: "rag pipeline", components: ["prepare", "train"] }));
    await POST(makeRequest({ useCase: "rag pipeline", components: ["train", "prepare"] }));

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("cache miss: different useCase produces a new GLM call", async () => {
    const mockFetch = vi.fn().mockResolvedValue(makeGlmResponse(FIXTURE));
    global.fetch = mockFetch;
    // Both calls are misses
    vi.mocked(getCached).mockResolvedValue(null);

    await POST(makeRequest({ useCase: "rag pipeline", components: ["train"] }));
    await POST(makeRequest({ useCase: "image classification", components: ["train"] }));

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("cache miss: different components produce a new GLM call", async () => {
    const mockFetch = vi.fn().mockResolvedValue(makeGlmResponse(FIXTURE));
    global.fetch = mockFetch;
    vi.mocked(getCached).mockResolvedValue(null);

    await POST(makeRequest({ useCase: "rag pipeline", components: ["train"] }));
    await POST(makeRequest({ useCase: "rag pipeline", components: ["train", "prepare"] }));

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("cache expiry: stale entry (getCached returns null) triggers a fresh GLM call", async () => {
    const mockFetch = vi.fn().mockResolvedValue(makeGlmResponse(FIXTURE));
    global.fetch = mockFetch;
    // Simulate TTL expiry: both calls return null from getCached
    vi.mocked(getCached).mockResolvedValue(null);

    await POST(makeRequest({ useCase: "rag pipeline", components: ["train"] }));
    await POST(makeRequest({ useCase: "rag pipeline", components: ["train"] }));

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("null useCase: getCached not called, GLM called each time", async () => {
    const mockFetch = vi.fn().mockResolvedValue(makeGlmResponse(FIXTURE));
    global.fetch = mockFetch;

    await POST(makeRequest({ useCase: null, components: ["train"] }));
    await POST(makeRequest({ useCase: null, components: ["train"] }));

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(getCached).not.toHaveBeenCalled();
  });

  it("null useCase: getCached not called when useCase is undefined", async () => {
    const mockFetch = vi.fn().mockResolvedValue(makeGlmResponse(FIXTURE));
    global.fetch = mockFetch;

    await POST(makeRequest({ components: ["train"] }));
    await POST(makeRequest({ components: ["train"] }));

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(getCached).not.toHaveBeenCalled();
  });
});
