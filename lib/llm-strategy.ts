// LLM call type: STRATEGY
// Purpose: generates personalized guidance for the user's specific situation.
// Fires when a user opts into deeper advice beyond the static output template.
// Input: user's free-text + which components were classified.
// Output: { steps, llmPrompt } — tailored to their actual problem, not generic.

import { glmChat } from "@/lib/llm-client";
import { type Component } from "@/lib/questionnaire-schema";

export interface StrategyResult {
  steps: string[];
  llmPrompt: string;
}

const COMPONENT_DESCRIPTIONS: Record<Component, string> = {
  prepare:
    "prepare.py — one-time data prep: dataset download, BPE tokenizer training, DataLoaderLite. Fixed by the agent.",
  train:
    "train.py — GPT-2-style model, Muon optimizer, training loop. The agent edits this to improve val_bpb.",
  program:
    "program.md — plain-text mission briefing for the agent. Human edits this to set research direction.",
};

function buildStrategyPrompt(
  userText: string,
  components: Component[],
): string {
  const componentList = components
    .map((c) => `- ${COMPONENT_DESCRIPTIONS[c]}`)
    .join("\n");

  return `You are an autoresearch advisor helping a non-technical user improve their ML training run.

The user's problem: "${userText}"

Relevant autoresearch components:
${componentList}

Your task:
1. Write 3-5 concrete, actionable steps the user should take for their specific situation.
   Each step must reference the actual component file (prepare.py, train.py, or program.md).
2. Write a copy-paste LLM prompt the user can give directly to Claude or ChatGPT to execute the strategy.
   The prompt should be specific to their problem, not generic.

Respond with ONLY valid JSON:
{
  "steps": ["step 1", "step 2", "step 3"],
  "llmPrompt": "the full prompt text..."
}

Rules:
- steps must be concrete — say exactly what to change, not just "improve the architecture"
- llmPrompt must be ready to paste — no placeholders, no instructions to fill in
- Use plain language — the user is not a researcher`;
}

export async function llmStrategy(
  userText: string,
  components: Component[],
): Promise<StrategyResult | null> {
  if (!process.env.GLM_API_KEY) {
    return null;
  }

  const text = await glmChat([
    {
      role: "user",
      content: buildStrategyPrompt(userText, components),
    },
  ]);

  let parsed: { steps?: unknown[]; llmPrompt?: unknown };
  try {
    parsed = JSON.parse(text.trim()) as {
      steps?: unknown[];
      llmPrompt?: unknown;
    };
  } catch {
    return null;
  }

  const steps = (parsed.steps ?? []).filter(
    (s): s is string => typeof s === "string" && s.length > 0,
  );

  if (steps.length === 0 || typeof parsed.llmPrompt !== "string") {
    return null;
  }

  return { steps, llmPrompt: parsed.llmPrompt };
}
