// Shared GLM API client — single fetch wrapper used by both LLM call types.

const GLM_BASE_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

const RETRY_STATUS = new Set([502, 503]);
const NO_RETRY_STATUS = new Set([400, 401, 404]);
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 500;
const MAX_RETRY_AFTER_MS = 2000;

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

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

  let lastError: Error | undefined;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const response = await fetch(GLM_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, max_tokens: maxTokens, messages }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    const rateLimitRemaining = response.headers.get("X-RateLimit-Remaining");
    const rateLimitReset = response.headers.get("X-RateLimit-Reset");
    if (rateLimitRemaining !== null) {
      const remaining = parseInt(rateLimitRemaining, 10);
      if (!isNaN(remaining) && remaining <= 10) {
        console.warn(
          JSON.stringify({
            level: "warn",
            endpoint: "glm",
            rateLimitRemaining: remaining,
            rateLimitReset: rateLimitReset ?? undefined,
          }),
        );
      }
    }

    if (response.ok) {
      const data = (await response.json()) as GlmResponse;
      return data.choices?.[0]?.message?.content ?? "";
    }

    const err = new Error(`GLM API error: ${response.status}`);

    // No retry for client errors
    if (NO_RETRY_STATUS.has(response.status)) {
      throw err;
    }

    lastError = err;

    // Only retry if there are attempts remaining
    if (attempt < MAX_ATTEMPTS - 1) {
      if (response.status === 429) {
        const retryAfterHeader = response.headers.get("Retry-After");
        const retryAfterMs = retryAfterHeader
          ? Math.min(parseFloat(retryAfterHeader) * 1000, MAX_RETRY_AFTER_MS)
          : MAX_RETRY_AFTER_MS;
        await delay(retryAfterMs);
      } else if (RETRY_STATUS.has(response.status)) {
        await delay(RETRY_DELAY_MS);
      } else {
        // Unknown 4xx/5xx — throw without retry
        throw err;
      }
    }
  }

  throw lastError!;
}
