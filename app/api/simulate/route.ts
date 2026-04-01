import { NextResponse } from "next/server";

const CACHE_TTL_MS = 60 * 60 * 1000; // 60 minutes

interface CacheEntry {
  result: SimulationResult;
  expiresAt: number;
}

export const simulateCache = new Map<string, CacheEntry>();

export function getCacheKey(useCase: string, components: string[]): string {
  return `${useCase}:${[...components].sort().join(",")}`;
}

export interface SimulationResult {
  drafted_input: string;
  metric: string;
  experiment_rows: Array<{
    experiment: number;
    result: string;
    status: string;
  }>;
  outcome: string;
}

interface ApiResponse {
  data: SimulationResult | null;
  error: string | null;
}

const SYSTEM_PROMPT = `You generate realistic worked example simulations for AI researchers using autoresearch.
Output ONLY valid JSON — no markdown fences, no explanation.
Generate domain-appropriate, plausible values. Use plain English throughout — no filenames, no variable names, no CLI terms.
The experiment_rows must have 4 rows.`;

function buildUserPrompt(useCase: string, components: string[]): string {
  const compList = components.join(", ");
  return `Use case: "${useCase || "language model training"}"
Components selected: ${compList}

Generate a SimulationResult JSON with these exact fields:
- drafted_input: a markdown table (2-4 rows, 2-3 columns) showing example input data relevant to the use case
- metric: plain English sentence starting with "We'd watch" describing what improves each experiment
- experiment_rows: array of 4 objects with { experiment: number (1-4), result: string (a plausible metric value), status: string ("Improved" | "Best so far" | "No change" | "Slightly worse") }
- outcome: a sentence starting with "By experiment" summarising the best result

Return only the JSON object. No markdown. No explanation.`;
}

export async function POST(
  request: Request,
): Promise<NextResponse<ApiResponse>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    console.error(
      JSON.stringify({
        endpoint: "/api/simulate",
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

  if (
    !body ||
    typeof body !== "object" ||
    !("components" in body) ||
    !Array.isArray((body as Record<string, unknown>).components)
  ) {
    console.error(
      JSON.stringify({
        endpoint: "/api/simulate",
        errorType: "InvalidRequest",
        message: "components must be an array",
        timestamp: new Date().toISOString(),
      }),
    );
    return NextResponse.json(
      { data: null, error: "components must be an array" },
      { status: 400 },
    );
  }

  const { useCase, components } = body as {
    useCase?: string;
    components: string[];
  };

  // Cache lookup — skip if useCase is null/undefined/empty
  const cacheKey = useCase ? getCacheKey(useCase, components) : null;
  if (cacheKey) {
    const entry = simulateCache.get(cacheKey);
    if (entry && Date.now() < entry.expiresAt) {
      return NextResponse.json({ data: entry.result, error: null });
    }
  }

  const apiKey = process.env.GLM_API_KEY;
  if (!apiKey) {
    console.error(
      JSON.stringify({
        endpoint: "/api/simulate",
        errorType: "ConfigError",
        message: "GLM_API_KEY not configured",
        timestamp: new Date().toISOString(),
      }),
    );
    return NextResponse.json(
      { data: null, error: "GLM_API_KEY not configured" },
      { status: 500 },
    );
  }

  let glmResponse: Response;
  try {
    glmResponse = await fetch(
      "https://open.bigmodel.cn/api/paas/v4/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "glm-4-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: buildUserPrompt(useCase ?? "", components),
            },
          ],
          temperature: 0.7,
        }),
      },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error";
    console.error(
      JSON.stringify({
        endpoint: "/api/simulate",
        errorType: "NetworkError",
        message: msg,
        timestamp: new Date().toISOString(),
      }),
    );
    return NextResponse.json({ data: null, error: msg }, { status: 502 });
  }

  if (!glmResponse.ok) {
    console.error(
      JSON.stringify({
        endpoint: "/api/simulate",
        errorType: "GlmApiError",
        message: `GLM API error: ${glmResponse.status}`,
        timestamp: new Date().toISOString(),
      }),
    );
    return NextResponse.json(
      { data: null, error: `GLM API error: ${glmResponse.status}` },
      { status: 502 },
    );
  }

  let raw: unknown;
  try {
    raw = await glmResponse.json();
  } catch {
    console.error(
      JSON.stringify({
        endpoint: "/api/simulate",
        errorType: "ParseError",
        message: "Failed to parse GLM response",
        timestamp: new Date().toISOString(),
      }),
    );
    return NextResponse.json(
      { data: null, error: "Failed to parse GLM response" },
      { status: 502 },
    );
  }

  try {
    const content = (
      raw as { choices: Array<{ message: { content: string } }> }
    ).choices[0].message.content;
    const parsed: SimulationResult = JSON.parse(content);
    if (cacheKey) {
      simulateCache.set(cacheKey, {
        result: parsed,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
    }
    return NextResponse.json({ data: parsed, error: null });
  } catch {
    console.error(
      JSON.stringify({
        endpoint: "/api/simulate",
        errorType: "ParseError",
        message: "Failed to parse simulation JSON",
        timestamp: new Date().toISOString(),
      }),
    );
    return NextResponse.json(
      { data: null, error: "Failed to parse simulation JSON" },
      { status: 502 },
    );
  }
}
