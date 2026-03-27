import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock llm-client so no real API calls are made
vi.mock("@/lib/llm-client", () => ({
  glmChat: vi.fn(),
}));

// Mock rate limiter — controlled per test
vi.mock("@/lib/llm-rate-limiter", () => ({
  checkRateLimit: vi.fn(),
}));

import { POST } from "@/app/api/converse/route";
import { glmChat } from "@/lib/llm-client";
import { checkRateLimit } from "@/lib/llm-rate-limiter";

const mockGlmChat = vi.mocked(glmChat);
const mockCheckRateLimit = vi.mocked(checkRateLimit);

function makeRequest(body: unknown, ip = "1.2.3.4"): NextRequest {
  return new NextRequest("http://localhost/api/converse", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
  });
}

function allowedRateLimit() {
  mockCheckRateLimit.mockReturnValue({
    allowed: true,
    remaining: 4,
    resetMs: 3600000,
  });
}

function blockedRateLimit() {
  mockCheckRateLimit.mockReturnValue({
    allowed: false,
    remaining: 0,
    resetMs: 1800000,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  allowedRateLimit();
});

// ---------------------------------------------------------------------------
// turnCount >= 5 — hard cap, no LLM call
// ---------------------------------------------------------------------------

describe("turnCount hard cap", () => {
  it("returns done:true immediately when turnCount === 5", async () => {
    const req = makeRequest({
      intent: "tune my optimizer",
      turns: [],
      turnCount: 5,
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.error).toBeNull();
    expect(json.data.done).toBe(true);
    expect(json.data.components).toEqual(["prepare", "train", "program"]);
    expect(json.data.useCase).toBe("tune my optimizer");
    expect(json.data.confidence).toBe(0.5);
    expect(mockGlmChat).not.toHaveBeenCalled();
  });

  it("returns done:true immediately when turnCount > 5", async () => {
    const req = makeRequest({
      intent: "train a new model",
      turns: [],
      turnCount: 10,
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.done).toBe(true);
    expect(mockGlmChat).not.toHaveBeenCalled();
  });

  it("does not rate-limit check when turnCount >= 5", async () => {
    const req = makeRequest({
      intent: "tune my optimizer",
      turns: [],
      turnCount: 5,
    });

    await POST(req);

    expect(mockCheckRateLimit).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

describe("rate limiting", () => {
  it("returns 429 with resetMs when rate limit exceeded", async () => {
    blockedRateLimit();

    const req = makeRequest({
      intent: "tune my optimizer",
      turns: [],
      turnCount: 0,
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.data).toBeNull();
    expect(json.error).toBe("Too many requests — try again later");
    expect(json.meta.resetMs).toBe(1800000);
  });

  it("passes IP from x-forwarded-for to checkRateLimit", async () => {
    allowedRateLimit();
    mockGlmChat.mockResolvedValueOnce(
      JSON.stringify({
        done: false,
        question: "Which optimizer are you using?",
        options: ["Adam", "SGD", "AdamW", "Something else — I'll describe it"],
      }),
    );

    const req = makeRequest(
      { intent: "tune my optimizer", turns: [], turnCount: 0 },
      "10.0.0.1",
    );

    await POST(req);

    expect(mockCheckRateLimit).toHaveBeenCalledWith("10.0.0.1", "navigate");
  });
});

// ---------------------------------------------------------------------------
// GLM returns valid not-done JSON
// ---------------------------------------------------------------------------

describe("GLM valid not-done response", () => {
  it("returns question and options when GLM says done:false", async () => {
    mockGlmChat.mockResolvedValueOnce(
      JSON.stringify({
        done: false,
        question:
          "Which aspect of the optimizer do you want to change for your Adam setup?",
        options: [
          "Learning rate schedule",
          "Beta1 / Beta2 momentum parameters",
          "Weight decay",
          "Something else — I'll describe it",
        ],
      }),
    );

    const req = makeRequest({
      intent: "tune my optimizer",
      turns: [],
      turnCount: 0,
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.error).toBeNull();
    expect(json.data.done).toBe(false);
    expect(typeof json.data.question).toBe("string");
    expect(Array.isArray(json.data.options)).toBe(true);
    expect(json.data.options.length).toBeGreaterThanOrEqual(2);
  });

  it("last option is always 'Something else — I'll describe it'", async () => {
    mockGlmChat.mockResolvedValueOnce(
      JSON.stringify({
        done: false,
        question: "Which optimizer parameter?",
        options: [
          "Learning rate",
          "Beta values",
          "Something else — I'll describe it",
        ],
      }),
    );

    const req = makeRequest({
      intent: "tune my optimizer",
      turns: [],
      turnCount: 1,
    });

    const res = await POST(req);
    const json = await res.json();

    const opts: string[] = json.data.options;
    expect(opts[opts.length - 1]).toBe("Something else — I'll describe it");
  });

  it("appends 'Something else' if GLM omits it", async () => {
    mockGlmChat.mockResolvedValueOnce(
      JSON.stringify({
        done: false,
        question: "Which optimizer parameter?",
        options: ["Learning rate", "Beta values", "Weight decay"],
      }),
    );

    const req = makeRequest({
      intent: "tune optimizer without else option",
      turns: [],
      turnCount: 0,
    });

    const res = await POST(req);
    const json = await res.json();

    const opts: string[] = json.data.options;
    expect(opts[opts.length - 1]).toBe("Something else — I'll describe it");
  });
});

// ---------------------------------------------------------------------------
// GLM returns valid done JSON
// ---------------------------------------------------------------------------

describe("GLM valid done response", () => {
  it("returns components, useCase, confidence when GLM says done:true", async () => {
    mockGlmChat.mockResolvedValueOnce(
      JSON.stringify({
        done: true,
        components: ["train"],
        useCase: "Tune Adam optimizer learning rate schedule in train.py",
        confidence: 0.92,
      }),
    );

    const req = makeRequest({
      intent: "tune my optimizer",
      turns: [
        {
          q: "Which part of your optimizer?",
          a: "The learning rate schedule",
        },
      ],
      turnCount: 1,
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.error).toBeNull();
    expect(json.data.done).toBe(true);
    expect(json.data.components).toEqual(["train"]);
    expect(json.data.useCase).toBe(
      "Tune Adam optimizer learning rate schedule in train.py",
    );
    expect(json.data.confidence).toBe(0.92);
  });

  it("returns done before turnCount reaches 5 when GLM is confident", async () => {
    mockGlmChat.mockResolvedValueOnce(
      JSON.stringify({
        done: true,
        components: ["train"],
        useCase: "Modify train.py optimizer settings",
        confidence: 0.88,
      }),
    );

    const req = makeRequest({
      intent: "I want to modify train.py optimizer",
      turns: [
        {
          q: "Are you changing the optimizer type?",
          a: "Yes, switching to AdamW",
        },
        { q: "Which parameters?", a: "Weight decay specifically" },
      ],
      turnCount: 2,
    });

    const res = await POST(req);
    const json = await res.json();

    expect(json.data.done).toBe(true);
    expect(json.data.components).toContain("train");
    // Confirmed done before turnCount=5
    expect(mockGlmChat).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// GLM returns malformed JSON — graceful degrade
// ---------------------------------------------------------------------------

describe("GLM malformed JSON — graceful degrade", () => {
  it("returns done:true with all-3 components on invalid JSON", async () => {
    mockGlmChat.mockResolvedValueOnce("this is not json at all");

    const req = makeRequest({
      intent: "improve my data pipeline",
      turns: [],
      turnCount: 0,
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.error).toBeNull();
    expect(json.data.done).toBe(true);
    expect(json.data.components).toEqual(["prepare", "train", "program"]);
    expect(json.data.confidence).toBe(0.3);
  });

  it("degrades when GLM returns partial JSON missing required fields", async () => {
    mockGlmChat.mockResolvedValueOnce(
      JSON.stringify({ done: false, question: "What do you need?" }),
      // missing options array
    );

    const req = makeRequest({
      intent: "debug my model",
      turns: [],
      turnCount: 0,
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.done).toBe(true);
    expect(json.data.components).toEqual(["prepare", "train", "program"]);
  });

  it("degrades when GLM returns done:true but missing components", async () => {
    mockGlmChat.mockResolvedValueOnce(
      JSON.stringify({ done: true, useCase: "something", confidence: 0.9 }),
    );

    const req = makeRequest({
      intent: "improve training",
      turns: [],
      turnCount: 1,
    });

    const res = await POST(req);
    const json = await res.json();

    expect(json.data.done).toBe(true);
    expect(json.data.components).toEqual(["prepare", "train", "program"]);
    expect(json.data.confidence).toBe(0.3);
  });

  it("degrades when GLM wraps response in markdown code fences but content is bad", async () => {
    mockGlmChat.mockResolvedValueOnce("```json\nnot valid json\n```");

    const req = makeRequest({
      intent: "tune optimizer",
      turns: [],
      turnCount: 0,
    });

    const res = await POST(req);
    const json = await res.json();

    expect(json.data.done).toBe(true);
    expect(json.data.components).toEqual(["prepare", "train", "program"]);
  });

  it("handles GLM returning empty string gracefully", async () => {
    mockGlmChat.mockResolvedValueOnce("");

    const req = makeRequest({
      intent: "something",
      turns: [],
      turnCount: 0,
    });

    const res = await POST(req);
    const json = await res.json();

    expect(json.data.done).toBe(true);
    expect(json.data.components).toEqual(["prepare", "train", "program"]);
  });
});

// ---------------------------------------------------------------------------
// GLM unavailable (API key missing or network error)
// ---------------------------------------------------------------------------

describe("GLM unavailable — graceful degrade", () => {
  it("returns done:true (not 503) when glmChat throws", async () => {
    mockGlmChat.mockRejectedValueOnce(new Error("GLM_API_KEY not set"));

    const req = makeRequest({
      intent: "tune my optimizer",
      turns: [],
      turnCount: 0,
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.error).toBeNull();
    expect(json.data.done).toBe(true);
    expect(json.data.components).toEqual(["prepare", "train", "program"]);
    expect(json.data.useCase).toBe("tune my optimizer");
  });

  it("returns done:true (not 503) on network timeout", async () => {
    mockGlmChat.mockRejectedValueOnce(new Error("The operation was aborted"));

    const req = makeRequest({
      intent: "fix data preprocessing",
      turns: [],
      turnCount: 2,
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.done).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Missing / invalid body fields — 400
// ---------------------------------------------------------------------------

describe("invalid body — 400", () => {
  it("returns 400 when body is missing intent", async () => {
    const req = makeRequest({ turns: [], turnCount: 0 });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.data).toBeNull();
    expect(json.error).toContain("Missing required fields");
  });

  it("returns 400 when turns is missing", async () => {
    const req = makeRequest({ intent: "tune optimizer", turnCount: 0 });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.data).toBeNull();
  });

  it("returns 400 when turnCount is missing", async () => {
    const req = makeRequest({ intent: "tune optimizer", turns: [] });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
  });

  it("returns 400 for empty intent string", async () => {
    const req = makeRequest({ intent: "   ", turns: [], turnCount: 0 });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
  });

  it("returns 400 for malformed JSON body", async () => {
    const req = new NextRequest("http://localhost/api/converse", {
      method: "POST",
      body: "not-json{{{",
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Invalid JSON body");
  });
});

// ---------------------------------------------------------------------------
// Last-option invariant — exhaustive check
// ---------------------------------------------------------------------------

describe("last option invariant", () => {
  it("last option is 'Something else — I'll describe it' regardless of GLM output", async () => {
    const responseWithoutElse = JSON.stringify({
      done: false,
      question: "What specifically?",
      options: ["Option A", "Option B", "Option C"],
    });

    mockGlmChat.mockResolvedValueOnce(responseWithoutElse);

    const req = makeRequest({
      intent: "change my agent goals",
      turns: [],
      turnCount: 0,
    });

    const res = await POST(req);
    const json = await res.json();

    const opts: string[] = json.data.options;
    expect(opts[opts.length - 1]).toBe("Something else — I'll describe it");
  });
});
