import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// vi.hoisted runs before vi.mock factories — safe to read sync file here
const { QUESTIONNAIRE_RAW } = vi.hoisted(() => {
  const { readFileSync } = require("fs") as typeof import("fs");
  const { join } = require("path") as typeof import("path");
  return {
    QUESTIONNAIRE_RAW: readFileSync(
      join(process.cwd(), "lib", "questionnaire.json"),
      "utf-8",
    ),
  };
});

// Mock fs/promises so the route handler gets the inline questionnaire
vi.mock("fs/promises", () => ({
  readFile: vi.fn().mockResolvedValue(QUESTIONNAIRE_RAW),
}));

// Mock llmClassify so tests never call the real API
vi.mock("@/lib/llm-classifier", () => ({
  llmClassify: vi.fn(),
}));

import { POST } from "@/app/api/classify/route";
import { llmClassify } from "@/lib/llm-classifier";
import { readFile } from "fs/promises";

const mockLlmClassify = vi.mocked(llmClassify);
const mockReadFile = vi.mocked(readFile);

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/classify", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Restore default readFile behaviour after any per-test override
  mockReadFile.mockResolvedValue(QUESTIONNAIRE_RAW as unknown as Uint8Array);
  delete process.env.CONFIDENCE_THRESHOLD;
});

// ---------------------------------------------------------------------------
// Happy-path traversals
// ---------------------------------------------------------------------------

describe("prepare path traversal", () => {
  it("reaches terminal-prepare via q-start → q-p1 → terminal-prepare (direct path)", async () => {
    const req = makeRequest({
      answers: {
        "q-start": "Set up or change data before training starts",
        "q-p1": "I need to change where data is stored on disk",
      },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.error).toBeNull();
    expect(json.data.components).toEqual(["prepare"]);
    expect(json.data.confidence).toBe(1.0);
  });

  it("reaches terminal-prepare via q-start → q-p1 → q-p2 → terminal-prepare", async () => {
    const req = makeRequest({
      answers: {
        "q-start": "Set up or change data before training starts",
        "q-p1": "I want to download more data shards",
        "q-p2": "I want more shards than the default 10",
      },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.components).toEqual(["prepare"]);
  });

  it("reaches terminal-prepare via tokenizer branch q-p3", async () => {
    const req = makeRequest({
      answers: {
        "q-start": "Set up or change data before training starts",
        "q-p1": "I want to adjust the tokenizer or vocabulary size",
        "q-p3": "I want a larger or smaller vocabulary",
      },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.components).toEqual(["prepare"]);
  });
});

describe("train path traversal", () => {
  it("reaches terminal-train via q-start → q-t1 → terminal-train (OOM path)", async () => {
    const req = makeRequest({
      answers: {
        "q-start": "Change how the model trains or is built",
        "q-t1": "The model is crashing with an out-of-memory error",
      },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.components).toEqual(["train"]);
    expect(json.data.confidence).toBe(1.0);
  });

  it("reaches terminal-train via q-t1 → q-t2 (resize model)", async () => {
    const req = makeRequest({
      answers: {
        "q-start": "Change how the model trains or is built",
        "q-t1": "I want the model to be bigger or smaller",
        "q-t2": "Add or remove transformer layers",
      },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.components).toEqual(["train"]);
  });

  it("reaches terminal-train via q-t1 → q-t3 (learning rate)", async () => {
    const req = makeRequest({
      answers: {
        "q-start": "Change how the model trains or is built",
        "q-t1": "I want to change the learning rate or optimizer",
        "q-t3": "The main learning rates (embedding, matrix, output)",
      },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.components).toEqual(["train"]);
  });

  it("reaches terminal-train via q-t1 → q-t4 (internal structure)", async () => {
    const req = makeRequest({
      answers: {
        "q-start": "Change how the model trains or is built",
        "q-t1": "I want to change the model's internal structure",
        "q-t4": "The attention window pattern (how far each layer can see)",
      },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.components).toEqual(["train"]);
  });
});

describe("program path traversal", () => {
  it("reaches terminal-program via q-start → q-e1 → terminal-program", async () => {
    const req = makeRequest({
      answers: {
        "q-start": "Change what the AI agent does or decides",
        "q-e1": "I want to change what counts as a good result",
      },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.components).toEqual(["program"]);
    expect(json.data.confidence).toBe(1.0);
  });

  it("reaches terminal-program via q-e1 → q-e2 (limit agent)", async () => {
    const req = makeRequest({
      answers: {
        "q-start": "Change what the AI agent does or decides",
        "q-e1": "I want to limit what the agent is allowed to try",
        "q-e2": "Block certain types of changes (e.g. no architecture edits)",
      },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.components).toEqual(["program"]);
  });
});

// ---------------------------------------------------------------------------
// "I'm not sure" path → terminal-all
// ---------------------------------------------------------------------------

describe("fallback / I'm not sure path", () => {
  it("follows I'm not sure at q-start → q-fallback-1 → q-fallback-2 → terminal-all", async () => {
    // q-start: "I'm not sure" → q-fallback-1
    // q-fallback-1: "I'm not sure" → q-fallback-2
    // q-fallback-2: "I still don't know" → terminal-all
    // Set threshold below 0.5 so static result is returned directly
    process.env.CONFIDENCE_THRESHOLD = "0.4";
    const req = makeRequest({
      answers: {
        "q-start": "I'm not sure",
        "q-fallback-1": "I'm not sure",
        "q-fallback-2": "I still don't know",
      },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.components).toEqual(["prepare", "train", "program"]);
    expect(json.data.confidence).toBe(0.5);
  });

  it("returns terminal-all for 'I need a full walkthrough' at q-fallback-1", async () => {
    // Set threshold below 0.5 so the static result is returned directly
    process.env.CONFIDENCE_THRESHOLD = "0.4";

    const req = makeRequest({
      answers: {
        "q-start": "I'm not sure",
        "q-fallback-1": "I need a full walkthrough — I'm new to this",
      },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.components).toEqual(["prepare", "train", "program"]);
    expect(json.data.confidence).toBe(0.5);
  });
});

// ---------------------------------------------------------------------------
// low_confidence flag
// ---------------------------------------------------------------------------

describe("low_confidence flag", () => {
  it("invokes llmClassify when confidence < threshold and returns its result", async () => {
    process.env.CONFIDENCE_THRESHOLD = "0.9";
    mockLlmClassify.mockResolvedValueOnce({
      components: ["train"],
      confidence: 0.8,
    });

    // terminal-all has confidence 0.5 which is < 0.9
    const req = makeRequest({
      answers: {
        "q-start": "I'm not sure",
        "q-fallback-1": "I need a full walkthrough — I'm new to this",
      },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.components).toEqual(["train"]);
    expect(json.data.confidence).toBe(0.8);
    expect(mockLlmClassify).toHaveBeenCalledOnce();
  });

  it("degrades gracefully when llmClassify throws — returns static result with low_confidence", async () => {
    process.env.CONFIDENCE_THRESHOLD = "0.9";
    mockLlmClassify.mockRejectedValueOnce(new Error("API error"));

    const req = makeRequest({
      answers: {
        "q-start": "I'm not sure",
        "q-fallback-1": "I need a full walkthrough — I'm new to this",
      },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.components).toEqual(["prepare", "train", "program"]);
    expect(json.data.low_confidence).toBe(true);
  });

  it("does NOT set low_confidence when confidence meets threshold", async () => {
    process.env.CONFIDENCE_THRESHOLD = "0.6";

    const req = makeRequest({
      answers: {
        "q-start": "Set up or change data before training starts",
        "q-p1": "I need to change where data is stored on disk",
      },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.confidence).toBe(1.0);
    expect(json.data.low_confidence).toBeUndefined();
    expect(mockLlmClassify).not.toHaveBeenCalled();
  });

  it("fires low_confidence at exactly the default threshold boundary (0.5 < 0.6)", async () => {
    // Default threshold is 0.6; terminal-all has confidence 0.5 → should trigger
    process.env.CONFIDENCE_THRESHOLD = "0.6";
    mockLlmClassify.mockResolvedValueOnce({
      components: ["prepare", "train", "program"],
      confidence: 0.5,
    });

    const req = makeRequest({
      answers: {
        "q-start": "I'm not sure",
        "q-fallback-1": "I need a full walkthrough — I'm new to this",
      },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(mockLlmClassify).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Error paths
// ---------------------------------------------------------------------------

describe("error paths", () => {
  it("returns 400 for empty answers object", async () => {
    const req = makeRequest({ answers: {} });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("No answers provided");
    expect(json.data).toBeNull();
  });

  it("returns 400 for missing answers key", async () => {
    const req = makeRequest({});

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("No answers provided");
  });

  it("returns 400 for malformed JSON", async () => {
    const req = new NextRequest("http://localhost/api/classify", {
      method: "POST",
      body: "not-json{{{",
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Invalid JSON body");
    expect(json.data).toBeNull();
  });

  it("treats unrecognised answer as I'm not sure and follows fallback branch", async () => {
    // q-start answer doesn't match any option → treated as "I'm not sure" → q-fallback-1
    // provide an explicit answer at q-fallback-1 to terminate
    process.env.CONFIDENCE_THRESHOLD = "0.4";
    const req = makeRequest({
      answers: {
        "q-start": "something completely unrecognised",
        "q-fallback-1": "I need a full walkthrough — I'm new to this",
      },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.components).toEqual(["prepare", "train", "program"]);
  });

  it("returns 400 when traversal hits an unknown node id", async () => {
    const brokenQ = JSON.stringify({
      version: "1.0.0",
      start: "q-broken",
      nodes: [
        {
          id: "q-broken",
          question: "Broken?",
          type: "choice",
          options: [{ label: "yes", next: "node-does-not-exist" }],
        },
      ],
    });
    mockReadFile.mockResolvedValueOnce(brokenQ as unknown as Uint8Array);

    const req = makeRequest({ answers: { "q-broken": "yes" } });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("Unknown node id");
  });

  it("returns 400 when node has no answer and no I'm not sure fallback option", async () => {
    const noFallbackQ = JSON.stringify({
      version: "1.0.0",
      start: "q-strict",
      nodes: [
        {
          id: "q-strict",
          question: "Strict choice?",
          type: "choice",
          options: [{ label: "only option", next: "terminal-node" }],
        },
        {
          id: "terminal-node",
          question: "Done",
          type: "choice",
          terminal: { components: ["prepare"], confidence: 1.0 },
        },
      ],
    });
    mockReadFile.mockResolvedValueOnce(noFallbackQ as unknown as Uint8Array);

    // Provide an answer that doesn't exist AND no "I'm not sure" option
    const req = makeRequest({
      answers: { "q-strict": "unrecognised answer no fallback" },
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("did not match any option");
  });

  it("returns 400 when node has no answer and no I'm not sure fallback option (missing answer path)", async () => {
    const noFallbackQ = JSON.stringify({
      version: "1.0.0",
      start: "q-strict",
      nodes: [
        {
          id: "q-strict",
          question: "Strict choice?",
          type: "choice",
          options: [{ label: "only option", next: "terminal-node" }],
        },
        {
          id: "terminal-node",
          question: "Done",
          type: "choice",
          terminal: { components: ["prepare"], confidence: 1.0 },
        },
      ],
    });
    mockReadFile.mockResolvedValueOnce(noFallbackQ as unknown as Uint8Array);

    // No answer provided for q-strict, no "I'm not sure" option available
    const req = makeRequest({ answers: { placeholder: "force non-empty" } });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("No answer for node");
  });

  it("returns 500 when readFile rejects with unexpected error", async () => {
    mockReadFile.mockRejectedValueOnce(new Error("disk failure"));

    const req = makeRequest({
      answers: { "q-start": "Set up or change data before training starts" },
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Internal server error");
    expect(json.data).toBeNull();
  });
});
