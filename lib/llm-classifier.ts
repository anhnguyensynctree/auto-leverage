import Anthropic from "@anthropic-ai/sdk";
import { type Component } from "@/lib/questionnaire-schema";

const VALID_COMPONENTS: readonly Component[] = ["prepare", "train", "program"];

export interface ClassifyResult {
  components: Component[];
  confidence: number;
}

const FALLBACK_RESULT: ClassifyResult = {
  components: ["prepare", "train", "program"],
  confidence: 0.5,
};

export async function llmClassify(userText: string): Promise<ClassifyResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return FALLBACK_RESULT;
  }

  const client = new Anthropic({ apiKey });

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

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 100,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";
  const parsed = JSON.parse(text.trim());

  const validComponents = (parsed.components as unknown[]).filter(
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
