/**
 * @vitest-environment jsdom
 *
 * Unit tests for rate limit UX:
 * (a) 429 from /api/converse triggers router.push with correct params
 * (b) rate_limited=1 + resetMs=180000 → "approximately 3 minutes"
 * (c) no rate_limited param → no rate-limit message rendered
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// -----------------------------------------------------------------------
// Shared router mock — stable reference to avoid re-render loops
// -----------------------------------------------------------------------

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockRouter = { push: mockPush, replace: mockReplace, back: vi.fn() };

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
  useRouter: () => mockRouter,
}));

import { useSearchParams } from "next/navigation";

const mockUseSearchParams = vi.mocked(useSearchParams);

function makeSearchParams(entries: Record<string, string>) {
  return {
    get: (key: string) => entries[key] ?? null,
  } as ReturnType<typeof useSearchParams>;
}

// -----------------------------------------------------------------------
// Global fetch mock
// -----------------------------------------------------------------------

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
});

// -----------------------------------------------------------------------
// (a) Questionnaire page: 429 → router.push with rate_limited + resetMs
// -----------------------------------------------------------------------

describe("questionnaire — 429 triggers redirect", () => {
  it("navigates to /output with rate_limited=1 and resetMs when /api/converse returns 429", async () => {
    mockUseSearchParams.mockReturnValue(makeSearchParams({ intent: "tune my model" }));

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({
        data: null,
        error: "Too many requests",
        meta: { resetMs: 120000 },
      }),
    });

    const { default: QuestionnairePage } = await import(
      "@/app/questionnaire/page"
    );

    render(<QuestionnairePage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledOnce();
    });

    const pushArg: string = mockPush.mock.calls[0][0];
    expect(pushArg).toContain("/output");
    const url = new URL(pushArg, "http://localhost");
    expect(url.searchParams.get("rate_limited")).toBe("1");
    expect(url.searchParams.get("resetMs")).toBe("120000");
    expect(url.searchParams.get("components")).toBe("prepare,train,program");
    expect(url.searchParams.get("useCase")).toBe("tune my model");
  });
});

// -----------------------------------------------------------------------
// (b) Output page: rate_limited=1 + resetMs=180000 → "approximately 3 minutes"
// -----------------------------------------------------------------------

describe("output page — rate_limited=1 shows on-call message", () => {
  it("renders 'approximately 3 minutes' when resetMs=180000", async () => {
    mockUseSearchParams.mockReturnValue(
      makeSearchParams({
        components: "prepare,train,program",
        useCase: "tune my model",
        rate_limited: "1",
        resetMs: "180000",
      }),
    );

    const { default: OutputPage } = await import("@/app/output/page");

    render(<OutputPage />);

    await waitFor(() => {
      expect(screen.getByTestId("rate-limit-message")).toBeInTheDocument();
    });

    expect(screen.getByTestId("rate-limit-message")).toHaveTextContent(
      "approximately 3 minutes",
    );
    expect(screen.getByTestId("rate-limit-message")).toHaveTextContent(
      "should be back",
    );

    // /api/output must NOT have been called
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("rounds up to minimum 1 minute when resetMs=0", async () => {
    mockUseSearchParams.mockReturnValue(
      makeSearchParams({
        components: "prepare,train,program",
        useCase: "tune my model",
        rate_limited: "1",
        resetMs: "0",
      }),
    );

    const { default: OutputPage } = await import("@/app/output/page");

    render(<OutputPage />);

    await waitFor(() => {
      expect(screen.getByTestId("rate-limit-message")).toBeInTheDocument();
    });

    expect(screen.getByTestId("rate-limit-message")).toHaveTextContent(
      "approximately 1 minute",
    );
  });
});

// -----------------------------------------------------------------------
// (c) Output page: no rate_limited param → no message
// -----------------------------------------------------------------------

describe("output page — no rate_limited param hides message", () => {
  it("does not render rate-limit message when rate_limited is absent", async () => {
    mockUseSearchParams.mockReturnValue(
      makeSearchParams({
        components: "train",
        useCase: "tune optimizer",
      }),
    );

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          component_names: ["Model Trainer"],
          guide_steps: ["Step 1"],
          llm_prompt: "Some prompt",
        },
        error: null,
      }),
    });

    const { default: OutputPage } = await import("@/app/output/page");

    render(<OutputPage />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledOnce();
    });

    expect(screen.queryByTestId("rate-limit-message")).not.toBeInTheDocument();
  });
});
