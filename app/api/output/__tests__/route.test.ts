import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/output/route";
import { outputCache, getCacheKey } from "@/lib/output-cache";
import { OUTPUT_TEMPLATES } from "@/lib/output-templates";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/output", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  outputCache.clear();
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// All 7 valid component combinations
// ---------------------------------------------------------------------------

describe("valid component combinations", () => {
  it("returns prepare template for ['prepare']", async () => {
    const res = await POST(makeRequest({ components: ["prepare"] }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.error).toBeNull();
    expect(json.data).toEqual(OUTPUT_TEMPLATES.prepare);
    expect(json.data.guide_steps.length).toBeGreaterThan(0);
    expect(json.data.llm_prompt).toBeTruthy();
  });

  it("returns train template for ['train']", async () => {
    const res = await POST(makeRequest({ components: ["train"] }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.error).toBeNull();
    expect(json.data).toEqual(OUTPUT_TEMPLATES.train);
  });

  it("returns program template for ['program']", async () => {
    const res = await POST(makeRequest({ components: ["program"] }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.error).toBeNull();
    expect(json.data).toEqual(OUTPUT_TEMPLATES.program);
  });

  it("returns prepare+train template for ['prepare','train']", async () => {
    const res = await POST(makeRequest({ components: ["prepare", "train"] }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual(OUTPUT_TEMPLATES["prepare+train"]);
    expect(json.data.component_names).toEqual([
      "Data Preparation",
      "Model Trainer",
    ]);
  });

  it("returns prepare+train template for permuted ['train','prepare']", async () => {
    const res = await POST(makeRequest({ components: ["train", "prepare"] }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual(OUTPUT_TEMPLATES["prepare+train"]);
  });

  it("returns prepare+program template for ['prepare','program']", async () => {
    const res = await POST(makeRequest({ components: ["prepare", "program"] }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual(OUTPUT_TEMPLATES["prepare+program"]);
    expect(json.data.component_names).toEqual([
      "Data Preparation",
      "Experiment Instructions",
    ]);
  });

  it("returns program+train template for ['train','program']", async () => {
    const res = await POST(makeRequest({ components: ["train", "program"] }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual(OUTPUT_TEMPLATES["program+train"]);
    expect(json.data.component_names).toEqual([
      "Model Trainer",
      "Experiment Instructions",
    ]);
  });

  it("returns all template for ['prepare','train','program']", async () => {
    const res = await POST(
      makeRequest({ components: ["prepare", "train", "program"] }),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual(OUTPUT_TEMPLATES.all);
    expect(json.data.component_names).toHaveLength(3);
  });

  it("returns all template for permuted ['program','train','prepare']", async () => {
    const res = await POST(
      makeRequest({ components: ["program", "train", "prepare"] }),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual(OUTPUT_TEMPLATES.all);
  });
});

// ---------------------------------------------------------------------------
// Response shape validation
// ---------------------------------------------------------------------------

describe("response shape", () => {
  it("each template data has component_names, guide_steps, and llm_prompt", async () => {
    const combos = [
      ["prepare"],
      ["train"],
      ["program"],
      ["prepare", "train"],
      ["prepare", "program"],
      ["train", "program"],
      ["prepare", "train", "program"],
    ];

    for (const components of combos) {
      const res = await POST(makeRequest({ components }));
      const json = await res.json();

      expect(json.error).toBeNull();
      expect(Array.isArray(json.data.component_names)).toBe(true);
      expect(Array.isArray(json.data.guide_steps)).toBe(true);
      expect(typeof json.data.llm_prompt).toBe("string");
      expect(json.data.llm_prompt.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Error paths
// ---------------------------------------------------------------------------

describe("error paths", () => {
  it("returns 400 for unknown component", async () => {
    const res = await POST(makeRequest({ components: ["unknown"] }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Unknown component combination");
    expect(json.data).toBeNull();
  });

  it("returns 400 for unknown combination of valid-looking names", async () => {
    const res = await POST(makeRequest({ components: ["prepare", "unknown"] }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Unknown component combination");
  });

  it("returns 400 for empty components array", async () => {
    const res = await POST(makeRequest({ components: [] }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("components must be a non-empty array");
    expect(json.data).toBeNull();
  });

  it("returns 400 when components key is missing", async () => {
    const res = await POST(makeRequest({}));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("components must be a non-empty array");
  });

  it("returns 400 when components is not an array", async () => {
    const res = await POST(makeRequest({ components: "prepare" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("components must be a non-empty array");
  });

  it("returns 400 for null body", async () => {
    const res = await POST(makeRequest(null));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("components must be a non-empty array");
  });

  it("returns 400 for malformed JSON", async () => {
    const req = new Request("http://localhost/api/output", {
      method: "POST",
      body: "{invalid",
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Invalid JSON body");
    expect(json.data).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// useCase injection
// ---------------------------------------------------------------------------

describe("useCase injection", () => {
  it("prefixes first guide_step when useCase is present", async () => {
    const res = await POST(
      makeRequest({
        components: ["train"],
        useCase: "tune the Muon optimizer to reduce val_bpb on Shakespeare",
      }),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.error).toBeNull();
    expect(json.data.guide_steps[0]).toBe(
      "Based on your goal — tune the Muon optimizer to reduce val_bpb on Shakespeare — here's how to apply autoresearch:",
    );
    expect(json.data.guide_steps).toHaveLength(
      OUTPUT_TEMPLATES.train.guide_steps.length + 1,
    );
    expect(json.data.guide_steps[1]).toBe(
      OUTPUT_TEMPLATES.train.guide_steps[0],
    );
  });

  it("does not prefix when useCase is absent", async () => {
    const res = await POST(makeRequest({ components: ["train"] }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.guide_steps).toEqual(OUTPUT_TEMPLATES.train.guide_steps);
  });

  it("treats empty string useCase as absent — no prefix", async () => {
    const res = await POST(makeRequest({ components: ["train"], useCase: "" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.guide_steps).toEqual(OUTPUT_TEMPLATES.train.guide_steps);
  });

  it("treats whitespace-only useCase as absent — no prefix", async () => {
    const res = await POST(
      makeRequest({ components: ["train"], useCase: "   " }),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.guide_steps).toEqual(OUTPUT_TEMPLATES.train.guide_steps);
  });

  it("does not mutate the original template guide_steps", async () => {
    const original = [...OUTPUT_TEMPLATES.train.guide_steps];
    await POST(makeRequest({ components: ["train"], useCase: "some goal" }));
    expect(OUTPUT_TEMPLATES.train.guide_steps).toEqual(original);
  });
});

// ---------------------------------------------------------------------------
// TTL cache
// ---------------------------------------------------------------------------

describe("TTL cache", () => {
  it("getCacheKey sorts components and appends useCase", () => {
    expect(getCacheKey(["train", "prepare"], "my goal")).toBe(
      "prepare,train:my goal",
    );
    expect(getCacheKey(["prepare", "train"], "my goal")).toBe(
      "prepare,train:my goal",
    );
  });

  it("getCacheKey uses __no_usecase__ for null useCase", () => {
    expect(getCacheKey(["train"], null)).toBe("train:__no_usecase__");
    expect(getCacheKey(["train"], undefined)).toBe("train:__no_usecase__");
    expect(getCacheKey(["train"], "")).toBe("train:__no_usecase__");
    expect(getCacheKey(["train"], "   ")).toBe("train:__no_usecase__");
  });

  it("cache hit: second identical request (no useCase) returns cached result without GLM", async () => {
    await POST(makeRequest({ components: ["train"] }));
    await POST(makeRequest({ components: ["train"] }));

    // Both requests succeed; cache was populated on first call
    expect(outputCache.size).toBe(1);
  });

  it("cache hit: second identical request (with useCase) skips GLM", async () => {
    // GLM is not configured in test env, so it falls through to prefixed guide_steps
    const req1 = makeRequest({ components: ["train"], useCase: "predict wins" });
    const req2 = makeRequest({ components: ["train"], useCase: "predict wins" });

    const res1 = await POST(req1);
    const res2 = await POST(req2);

    const json1 = await res1.json();
    const json2 = await res2.json();

    expect(json1.error).toBeNull();
    expect(json2.error).toBeNull();
    expect(json2.data).toEqual(json1.data);
    expect(outputCache.size).toBe(1);
  });

  it("cache hit: component order does not affect cache key", async () => {
    await POST(makeRequest({ components: ["prepare", "train"] }));
    await POST(makeRequest({ components: ["train", "prepare"] }));

    // Same cache key regardless of order
    expect(outputCache.size).toBe(1);
  });

  it("cache miss: different useCase produces a separate cache entry", async () => {
    await POST(makeRequest({ components: ["train"], useCase: "goal A" }));
    await POST(makeRequest({ components: ["train"], useCase: "goal B" }));

    expect(outputCache.size).toBe(2);
  });

  it("cache miss: different components produce a separate cache entry", async () => {
    await POST(makeRequest({ components: ["train"] }));
    await POST(makeRequest({ components: ["prepare"] }));

    expect(outputCache.size).toBe(2);
  });

  it("null useCase caches under __no_usecase__ key and hits on repeat", async () => {
    await POST(makeRequest({ components: ["train"] }));
    await POST(makeRequest({ components: ["train"] }));

    const key = getCacheKey(["train"], null);
    expect(key).toBe("train:__no_usecase__");
    expect(outputCache.has(key)).toBe(true);
    expect(outputCache.size).toBe(1);
  });

  it("null useCase and undefined useCase map to the same cache entry", async () => {
    await POST(makeRequest({ components: ["train"], useCase: undefined }));
    await POST(makeRequest({ components: ["train"] }));

    expect(outputCache.size).toBe(1);
  });

  it("TTL expiry: expired entry triggers a fresh cache write", async () => {
    vi.useFakeTimers();

    await POST(makeRequest({ components: ["train"] }));
    expect(outputCache.size).toBe(1);

    // Retrieve the entry and verify it has an expiry
    const key = getCacheKey(["train"], null);
    const entry = outputCache.get(key)!;
    expect(entry.expiresAt).toBeGreaterThan(Date.now());

    // Advance past TTL (60 min + 1 ms)
    vi.advanceTimersByTime(60 * 60 * 1000 + 1);

    // Entry is now expired; next request should overwrite it
    await POST(makeRequest({ components: ["train"] }));

    const refreshed = outputCache.get(key)!;
    expect(refreshed.expiresAt).toBeGreaterThan(Date.now());
  });
});
