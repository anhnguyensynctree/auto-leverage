import { NextRequest, NextResponse } from "next/server";
import { glmChat } from "@/lib/llm-client";
import { checkRateLimit } from "@/lib/llm-rate-limiter";
import { buildConverseMessages } from "@/lib/converse-prompt";

const ALL_COMPONENTS = ["prepare", "train", "program"] as const;

const GRACEFUL_DEGRADE = (useCase: string) => ({
  done: true as const,
  components: [...ALL_COMPONENTS] as string[],
  useCase,
  confidence: 0.3,
});

interface ConverseBody {
  intent: string;
  turns: Array<{ q: string; a: string }>;
  turnCount: number;
}

function parseBody(raw: unknown): ConverseBody | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;
  if (typeof b.intent !== "string" || b.intent.trim() === "") return null;
  if (!Array.isArray(b.turns)) return null;
  if (typeof b.turnCount !== "number") return null;
  return {
    intent: b.intent.trim(),
    turns: b.turns,
    turnCount: b.turnCount,
  };
}

function parseGlmJson(raw: string): Record<string, unknown> | null {
  // Strip markdown code fences if present
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isValidNotDone(parsed: Record<string, unknown>): parsed is {
  done: false;
  question: string;
  options: string[];
} {
  return (
    parsed.done === false &&
    typeof parsed.question === "string" &&
    Array.isArray(parsed.options) &&
    parsed.options.length >= 2
  );
}

function isValidDone(parsed: Record<string, unknown>): parsed is {
  done: true;
  components: string[];
  useCase: string;
  confidence: number;
} {
  return (
    parsed.done === true &&
    Array.isArray(parsed.components) &&
    parsed.components.length > 0 &&
    typeof parsed.useCase === "string" &&
    typeof parsed.confidence === "number"
  );
}

export async function POST(request: NextRequest) {
  let bodyRaw: unknown;
  try {
    bodyRaw = await request.json();
  } catch {
    console.error(
      JSON.stringify({
        endpoint: "/api/converse",
        errorType: "InvalidJSON",
        message: "Invalid JSON body",
        timestamp: new Date().toISOString(),
      }),
    );
    return NextResponse.json(
      { data: null, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const body = parseBody(bodyRaw);
  if (!body) {
    console.error(
      JSON.stringify({
        endpoint: "/api/converse",
        errorType: "MissingFields",
        message: "Missing required fields: intent, turns, turnCount",
        timestamp: new Date().toISOString(),
      }),
    );
    return NextResponse.json(
      {
        data: null,
        error: "Missing required fields: intent, turns, turnCount",
      },
      { status: 400 },
    );
  }

  const { intent, turns, turnCount } = body;

  // Hard cap — no LLM call needed
  if (turnCount >= 5) {
    return NextResponse.json({
      data: {
        done: true,
        components: [...ALL_COMPONENTS],
        useCase: intent,
        confidence: 0.5,
      },
      error: null,
    });
  }

  // Rate limit
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rateCheck = checkRateLimit(ip, "navigate");
  if (!rateCheck.allowed) {
    console.error(
      JSON.stringify({
        endpoint: "/api/converse",
        errorType: "RateLimitExceeded",
        message: "Too many requests",
        timestamp: new Date().toISOString(),
      }),
    );
    return NextResponse.json(
      {
        data: null,
        error: "Too many requests — try again later",
        meta: { resetMs: rateCheck.resetMs },
      },
      { status: 429 },
    );
  }

  // Call GLM
  let raw = "";
  try {
    const messages = buildConverseMessages(intent, turns, turnCount);
    raw = await glmChat(messages, { maxTokens: 500, timeoutMs: 15000 });
  } catch {
    // GLM unavailable or API key missing — graceful degrade
    return NextResponse.json({
      data: GRACEFUL_DEGRADE(intent),
      error: null,
    });
  }

  // Parse GLM response
  const parsed = parseGlmJson(raw);
  if (!parsed) {
    return NextResponse.json({
      data: GRACEFUL_DEGRADE(intent),
      error: null,
    });
  }

  if (parsed.done === false) {
    if (!isValidNotDone(parsed)) {
      return NextResponse.json({
        data: GRACEFUL_DEGRADE(intent),
        error: null,
      });
    }
    // Enforce last-option invariant
    const opts = parsed.options;
    const ELSE_OPTION = "Something else — I'll describe it";
    if (opts[opts.length - 1] !== ELSE_OPTION) {
      opts.push(ELSE_OPTION);
    }
    return NextResponse.json({
      data: { done: false, question: parsed.question, options: opts },
      error: null,
    });
  }

  if (parsed.done === true) {
    if (!isValidDone(parsed)) {
      return NextResponse.json({
        data: GRACEFUL_DEGRADE(intent),
        error: null,
      });
    }
    return NextResponse.json({
      data: {
        done: true,
        components: parsed.components,
        useCase: parsed.useCase,
        confidence: parsed.confidence,
      },
      error: null,
    });
  }

  // done field missing or unexpected value
  return NextResponse.json({
    data: GRACEFUL_DEGRADE(intent),
    error: null,
  });
}
