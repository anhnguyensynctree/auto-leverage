import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/output/route";
import { OUTPUT_TEMPLATES } from "@/lib/output-templates";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/output", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

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
