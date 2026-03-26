import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { llmStrategy } from "@/lib/llm-strategy";
import { checkRateLimit } from "@/lib/llm-rate-limiter";
import { type Component } from "@/lib/questionnaire-schema";

const VALID_COMPONENTS = ["prepare", "train", "program"] as const;

const RequestSchema = z.object({
  userText: z.string().min(1).max(2000),
  components: z.array(z.enum(VALID_COMPONENTS)).min(1).max(3) as z.ZodType<
    Component[]
  >,
});

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GLM_API_KEY) {
      return NextResponse.json(
        { data: null, error: "Strategy advisor not available" },
        { status: 503 },
      );
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";

    const rateCheck = checkRateLimit(ip, "strategy");
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

    const body = await request.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: "Invalid request body" },
        { status: 400 },
      );
    }

    const result = await llmStrategy(
      parsed.data.userText,
      parsed.data.components,
    );

    if (!result) {
      return NextResponse.json(
        { data: null, error: "Strategy generation failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: result, error: null });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return NextResponse.json(
        { data: null, error: "Invalid JSON body" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { data: null, error: "Internal server error" },
      { status: 500 },
    );
  }
}
