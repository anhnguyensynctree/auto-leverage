// LLM call type: NAVIGATE
// Purpose: fires when the static decision tree has low confidence.
// Classifies which autoresearch components apply to the user's problem.
// Input: user's free-text description.
// Output: { components, confidence }

import { glmChat } from "@/lib/llm-client";
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

const NAVIGATE_PROMPT = `You are classifying a user's machine learning problem into autoresearch components.

The three components are:
- prepare: data preparation, tokenization, dataset quality issues
- train: model architecture, optimizer settings, learning rate, batch size, training loops
- program: experiment strategy, what the AI agent should try, experiment goals, stopping criteria

Respond with ONLY valid JSON, no explanation:
{"components": ["prepare"|"train"|"program"], "confidence": 0.0-1.0}

Rules:
- components must be a non-empty array containing only "prepare", "train", or "program"
- If unclear, include all three and set confidence to 0.5
- confidence should be 0.7-0.95 for clear cases, 0.5-0.69 for uncertain`;

export async function llmClassify(userText: string): Promise<ClassifyResult> {
  if (!process.env.GLM_API_KEY) {
    return FALLBACK_RESULT;
  }

  try {
    const text = await glmChat([
      { role: "system", content: NAVIGATE_PROMPT },
      { role: "user", content: userText },
    ]);

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
      confidence:
        typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
    };
  } catch {
    return FALLBACK_RESULT;
  }
}
