// Shared GLM API client — single fetch wrapper used by both LLM call types.

const GLM_BASE_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

export interface GlmMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface GlmResponse {
  choices: Array<{
    message: { content: string; reasoning_content?: string };
    finish_reason: string;
  }>;
}

export async function glmChat(
  messages: GlmMessage[],
  options: { maxTokens?: number; timeoutMs?: number } = {},
): Promise<string> {
  const apiKey = process.env.GLM_API_KEY;
  if (!apiKey) {
    throw new Error("GLM_API_KEY not set");
  }

  const model = process.env.GLM_MODEL ?? "glm-5";
  const { maxTokens = 2000, timeoutMs = 15000 } = options;

  const response = await fetch(GLM_BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`GLM API error: ${response.status}`);
  }

  const data = (await response.json()) as GlmResponse;
  return data.choices?.[0]?.message?.content ?? "";
}
