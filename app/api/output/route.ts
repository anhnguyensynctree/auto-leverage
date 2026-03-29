import { NextResponse } from "next/server";
import { getTemplate } from "@/lib/output-templates";
import { glmChat } from "@/lib/llm-client";

function buildPersonalizeMessages(
  useCase: string,
  componentNames: string[],
  steps: string[],
) {
  const stepsText = steps.join("\n");
  const componentsText = componentNames.join(", ");
  return [
    {
      role: "user" as const,
      content: `You are helping a non-technical user apply autoresearch to their specific goal.

User's goal: "${useCase}"
Autoresearch parts they are using: ${componentsText}

Below are generic guide steps. Rewrite them to be specific to the user's goal. Replace generic phrases with concrete references to their domain (e.g., for NBA prediction: mention team stats, game outcomes, prediction accuracy). Keep the same number of steps. Use plain English — Grade 8 reading level. No filenames, no code, no jargon. Keep each step under 40 words.

Generic steps:
${stepsText}

Return only valid JSON: {"guide_steps": ["step 1", "step 2", ...]}`,
    },
  ];
}

function parseSteps(raw: string): string[] | null {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (
      parsed &&
      Array.isArray(parsed.guide_steps) &&
      parsed.guide_steps.length > 0 &&
      parsed.guide_steps.every((s: unknown) => typeof s === "string")
    ) {
      return parsed.guide_steps as string[];
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { data: null, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("components" in body) ||
    !Array.isArray((body as Record<string, unknown>).components) ||
    (body as { components: unknown[] }).components.length === 0
  ) {
    return NextResponse.json(
      { data: null, error: "components must be a non-empty array" },
      { status: 400 },
    );
  }

  const { components, useCase } = body as {
    components: string[];
    useCase?: string;
  };

  const template = getTemplate(components);

  if (!template) {
    return NextResponse.json(
      { data: null, error: "Unknown component combination" },
      { status: 400 },
    );
  }

  const trimmedUseCase = typeof useCase === "string" ? useCase.trim() : "";

  if (!trimmedUseCase) {
    return NextResponse.json({ data: template, error: null });
  }

  // Try to personalize guide steps via GLM
  let personalizedSteps: string[] | null = null;
  try {
    const messages = buildPersonalizeMessages(
      trimmedUseCase,
      template.component_names,
      template.guide_steps,
    );
    const raw = await glmChat(messages, { maxTokens: 600, timeoutMs: 12000 });
    personalizedSteps = parseSteps(raw);
  } catch {
    // GLM unavailable — fall through to template
  }

  const guideSteps = personalizedSteps ?? [
    `Based on your goal — ${trimmedUseCase} — here's how to apply autoresearch:`,
    ...template.guide_steps,
  ];

  return NextResponse.json({
    data: { ...template, guide_steps: guideSteps },
    error: null,
  });
}
