import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import {
  QuestionnaireSchema,
  type QuestionNode,
  type Terminal,
} from "@/lib/questionnaire-schema";
import { llmClassify } from "@/lib/llm-classifier";
import { checkRateLimit } from "@/lib/llm-rate-limiter";

const NOT_SURE_PATTERN = /i'?m\s+not\s+sure/i;

function findNotSureOption(node: QuestionNode): string | null {
  if (!node.options) return null;
  const opt = node.options.find((o) => NOT_SURE_PATTERN.test(o.label));
  return opt?.next ?? null;
}

function traverseTree(
  nodes: Map<string, QuestionNode>,
  startId: string,
  answers: Record<string, string>,
): Terminal | { error: string } {
  const MAX_DEPTH = 50;
  let currentId = startId;
  const TERMINAL_ALL_FALLBACK: Terminal = {
    components: ["prepare", "train", "program"],
    confidence: 0.5,
  };

  for (let depth = 0; depth < MAX_DEPTH; depth++) {
    const node = nodes.get(currentId);
    if (!node) {
      return { error: `Unknown node id: ${currentId}` };
    }

    if (node.terminal) {
      return node.terminal;
    }

    if (!node.options || node.options.length === 0) {
      return { error: `Non-terminal node ${currentId} has no options` };
    }

    const answer = answers[node.id];

    if (!answer) {
      // No answer provided — follow "I'm not sure" branch
      const fallback = findNotSureOption(node);
      if (!fallback) {
        return TERMINAL_ALL_FALLBACK;
      }
      currentId = fallback;
      continue;
    }

    const matched = node.options.find(
      (o) => o.label.trim().toLowerCase() === answer.trim().toLowerCase(),
    );

    if (!matched) {
      // Answer doesn't match any option label — treat as "I'm not sure"
      const fallback = findNotSureOption(node);
      if (!fallback) {
        return TERMINAL_ALL_FALLBACK;
      }
      currentId = fallback;
      continue;
    }

    currentId = matched.next;
  }

  return {
    error: "Traversal exceeded maximum depth — possible cycle in questionnaire",
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const answers: Record<string, string> = body?.answers ?? {};

    if (Object.keys(answers).length === 0) {
      return NextResponse.json(
        { data: null, error: "No answers provided" },
        { status: 400 },
      );
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";

    const configPath = path.join(process.cwd(), "lib", "questionnaire.json");
    const raw = await readFile(configPath, "utf-8");
    const config = QuestionnaireSchema.parse(JSON.parse(raw));

    const nodeMap = new Map(config.nodes.map((n) => [n.id, n]));

    const result = traverseTree(nodeMap, config.start, answers);

    if ("error" in result) {
      return NextResponse.json(
        { data: null, error: result.error },
        { status: 400 },
      );
    }

    const confidenceThreshold = parseFloat(
      process.env.CONFIDENCE_THRESHOLD ?? "0.6",
    );
    const lowConfidence = result.confidence < confidenceThreshold;

    if (lowConfidence) {
      const userText = answers["q-start"] ?? Object.values(answers)[0] ?? "";
      if (userText) {
        const rateCheck = checkRateLimit(ip, "navigate");
        if (!rateCheck.allowed) {
          return NextResponse.json(
            {
              data: null,
              error: "Too many requests — try again later",
              meta: { resetMs: rateCheck.resetMs },
            },
            { status: 429 },
          );
        }
        try {
          const llmResult = await llmClassify(userText);
          return NextResponse.json({ data: { ...llmResult }, error: null });
        } catch {
          // graceful degrade — return static result
        }
      }
    }

    return NextResponse.json({
      data: {
        components: result.components,
        confidence: result.confidence,
        ...(lowConfidence ? { low_confidence: true } : {}),
      },
      error: null,
    });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return NextResponse.json(
        { data: null, error: "Invalid JSON body" },
        { status: 400 },
      );
    }
    console.error("[classify] unexpected error", err);
    return NextResponse.json(
      { data: null, error: "Internal server error" },
      { status: 500 },
    );
  }
}
