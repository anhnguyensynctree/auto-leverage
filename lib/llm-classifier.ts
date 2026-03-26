import { type Component } from "@/lib/questionnaire-schema";

const VALID_COMPONENTS: readonly Component[] = ["prepare", "train", "program"];

const GLM_BASE_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

export interface ClassifyResult {
  components: Component[];
  confidence: number;
}

const FALLBACK_RESULT: ClassifyResult = {
  components: ["prepare", "train", "program"],
  confidence: 0.5,
};

export async function llmClassify(userText: string): Promise<ClassifyResult> {
  const apiKey = process.env.GLM_API_KEY;
  if (!apiKey) {
    return FALLBACK_RESULT;
  }

  const model = process.env.GLM_MODEL ?? "glm-4-flash";

  const prompt = `You are classifying a user's machine learning problem into autoresearch components.

The three components are:
- prepare: data preparation, tokenization, dataset quality issues
- train: model architecture, optimizer settings, learning rate, batch size, training loops
- program: experiment strategy, what the AI agent should try, experiment goals, stopping criteria

User's description: "${userText}"

Respond with ONLY valid JSON, no explanation:
{"components": ["prepare"|"train"|"program"], "confidence": 0.0-1.0}

Rules:
- components must be a non-empty array containing only "prepare", "train", or "program"
- If unclear, include all three and set confidence to 0.5
- confidence should be 0.7-0.95 for clear cases, 0.5-0.69 for uncertain`;

  const response = await fetch(GLM_BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 100,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    return FALLBACK_RESULT;
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content ?? "";
  const parsed = JSON.parse(text.trim()) as {
    components?: unknown[];
    confidence?: unknown;
  };

  const validComponents = (parsed.components ?? []).filter(
    (c): c is Component =>
      typeof c === "string" && VALID_COMPONENTS.includes(c as Component),
  );

  if (validComponents.length === 0) {
    return FALLBACK_RESULT;
  }

  return {
    components: validComponents,
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
  };
}
