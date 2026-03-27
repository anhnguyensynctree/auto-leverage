/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// -----------------------------------------------------------------------
// Mocks
// -----------------------------------------------------------------------

const mockPush = vi.fn();
const mockBack = vi.fn();
const mockRouter = { push: mockPush, back: mockBack };

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
  useRouter: () => mockRouter,
}));

import { useSearchParams } from "next/navigation";

const mockUseSearchParams = vi.mocked(useSearchParams);

function makeSearchParams(intent: string) {
  return {
    get: (key: string) => (key === "intent" ? intent : null),
  } as ReturnType<typeof useSearchParams>;
}

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

function mockConverseNotDone(question: string, options: string[]) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      data: { done: false, question, options },
      error: null,
    }),
  });
}

function mockConverseDone(
  components: string[],
  useCase: string,
  confidence: number,
) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      data: { done: true, components, useCase, confidence },
      error: null,
    }),
  });
}

function mockConverseError() {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    json: async () => ({ data: null, error: "Server error" }),
  });
}

// -----------------------------------------------------------------------
// Import after mocks
// -----------------------------------------------------------------------

import QuestionnairePage from "@/app/questionnaire/page";

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

const DEFAULT_OPTIONS = [
  "Adjust learning rate",
  "Change batch size",
  "Modify architecture",
  "Something else — I'll describe it",
];

beforeEach(() => {
  vi.clearAllMocks();
  mockUseSearchParams.mockReturnValue(makeSearchParams("tune my model"));
});

// -----------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------

describe("initial load", () => {
  it("renders first question after initial API call completes", async () => {
    mockConverseNotDone(
      "What aspect of training do you need help with?",
      DEFAULT_OPTIONS,
    );

    render(<QuestionnairePage />);

    await waitFor(() => {
      expect(
        screen.getByText("What aspect of training do you need help with?"),
      ).toBeInTheDocument();
    });
  });

  it("renders all options as radio inputs", async () => {
    mockConverseNotDone(
      "What aspect of training do you need help with?",
      DEFAULT_OPTIONS,
    );

    render(<QuestionnairePage />);

    await waitFor(() => {
      expect(screen.getByText("Adjust learning rate")).toBeInTheDocument();
    });

    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(DEFAULT_OPTIONS.length);
  });

  it("posts intent from URL params on initial load", async () => {
    mockConverseNotDone("First question?", DEFAULT_OPTIONS);

    render(<QuestionnairePage />);

    await waitFor(() => expect(mockFetch).toHaveBeenCalledOnce());

    const [, init] = mockFetch.mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body.intent).toBe("tune my model");
    expect(body.turns).toEqual([]);
    expect(body.turnCount).toBe(0);
  });
});

describe("Next button disabled state", () => {
  it("Next button is disabled when no option selected", async () => {
    mockConverseNotDone("What do you need?", DEFAULT_OPTIONS);

    render(<QuestionnairePage />);

    await waitFor(() =>
      expect(screen.getByText("What do you need?")).toBeInTheDocument(),
    );

    const nextBtn = screen.getByRole("button", { name: /next/i });
    expect(nextBtn).toBeDisabled();
  });

  it("Next button is disabled when 'Something else' selected but free text is empty", async () => {
    mockConverseNotDone("What do you need?", DEFAULT_OPTIONS);

    render(<QuestionnairePage />);

    await waitFor(() =>
      expect(screen.getByText("What do you need?")).toBeInTheDocument(),
    );

    const elseRadio = screen.getByDisplayValue(
      "Something else — I'll describe it",
    );
    await userEvent.click(elseRadio);

    const nextBtn = screen.getByRole("button", { name: /next/i });
    expect(nextBtn).toBeDisabled();
  });

  it("Next button is enabled after selecting a regular option", async () => {
    mockConverseNotDone("What do you need?", DEFAULT_OPTIONS);

    render(<QuestionnairePage />);

    await waitFor(() =>
      expect(screen.getByText("What do you need?")).toBeInTheDocument(),
    );

    const radio = screen.getByDisplayValue("Adjust learning rate");
    await userEvent.click(radio);

    const nextBtn = screen.getByRole("button", { name: /next/i });
    expect(nextBtn).not.toBeDisabled();
  });
});

describe("Something else free-text reveal", () => {
  it("reveals free-text input when 'Something else' option is selected", async () => {
    mockConverseNotDone("What aspect of training?", DEFAULT_OPTIONS);

    render(<QuestionnairePage />);

    await waitFor(() =>
      expect(screen.getByText("What aspect of training?")).toBeInTheDocument(),
    );

    expect(
      screen.queryByRole("textbox", { name: /describe/i }),
    ).not.toBeInTheDocument();

    const elseRadio = screen.getByDisplayValue(
      "Something else — I'll describe it",
    );
    await userEvent.click(elseRadio);

    expect(
      screen.getByRole("textbox", { name: /describe/i }),
    ).toBeInTheDocument();
  });

  it("hides free-text input when a different option is re-selected", async () => {
    mockConverseNotDone("What aspect of training?", DEFAULT_OPTIONS);

    render(<QuestionnairePage />);

    await waitFor(() =>
      expect(screen.getByText("What aspect of training?")).toBeInTheDocument(),
    );

    const elseRadio = screen.getByDisplayValue(
      "Something else — I'll describe it",
    );
    await userEvent.click(elseRadio);

    const textarea = screen.getByRole("textbox", { name: /describe/i });
    expect(textarea).toBeInTheDocument();

    const otherRadio = screen.getByDisplayValue("Adjust learning rate");
    await userEvent.click(otherRadio);

    expect(
      screen.queryByRole("textbox", { name: /describe/i }),
    ).not.toBeInTheDocument();
  });

  it("enables Next button when free text is non-empty", async () => {
    mockConverseNotDone("What aspect?", DEFAULT_OPTIONS);

    render(<QuestionnairePage />);

    await waitFor(() =>
      expect(screen.getByText("What aspect?")).toBeInTheDocument(),
    );

    const elseRadio = screen.getByDisplayValue(
      "Something else — I'll describe it",
    );
    await userEvent.click(elseRadio);

    const textarea = screen.getByRole("textbox", { name: /describe/i });
    await userEvent.type(textarea, "custom approach");

    const nextBtn = screen.getByRole("button", { name: /next/i });
    expect(nextBtn).not.toBeDisabled();
  });
});

describe("Back navigation restores prior state", () => {
  it("restores turn 1 question and answer from state when Back is pressed on turn 2", async () => {
    const q1 = "What aspect of training?";
    const q2 = "Which optimizer parameter?";

    mockConverseNotDone(q1, DEFAULT_OPTIONS);

    render(<QuestionnairePage />);

    await waitFor(() => expect(screen.getByText(q1)).toBeInTheDocument());

    // Select an option and advance
    mockConverseNotDone(q2, [
      "Learning rate",
      "Beta values",
      "Something else — I'll describe it",
    ]);

    const radio = screen.getByDisplayValue("Adjust learning rate");
    await userEvent.click(radio);
    const nextBtn = screen.getByRole("button", { name: /next/i });
    await userEvent.click(nextBtn);

    await waitFor(() => expect(screen.getByText(q2)).toBeInTheDocument());

    // Verify we're on turn 2
    expect(mockFetch).toHaveBeenCalledTimes(2);

    // Press Back
    const backBtn = screen.getByRole("button", { name: /back/i });
    await userEvent.click(backBtn);

    // Should show turn 1 question without making an API call
    expect(screen.getByText(q1)).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(2); // no new call
  });

  it("Back on first question calls router.back()", async () => {
    mockConverseNotDone("First question?", DEFAULT_OPTIONS);

    render(<QuestionnairePage />);

    await waitFor(() =>
      expect(screen.getByText("First question?")).toBeInTheDocument(),
    );

    const backBtn = screen.getByRole("button", { name: /back/i });
    await userEvent.click(backBtn);

    expect(mockBack).toHaveBeenCalledOnce();
    expect(mockFetch).toHaveBeenCalledTimes(1); // only initial load
  });
});

describe("done:true navigation", () => {
  it("navigates to /confirm with components, useCase, confidence when done:true received", async () => {
    // First question
    mockConverseNotDone("What aspect of training?", DEFAULT_OPTIONS);

    render(<QuestionnairePage />);

    await waitFor(() =>
      expect(screen.getByText("What aspect of training?")).toBeInTheDocument(),
    );

    // Next answer returns done:true
    mockConverseDone(["train"], "Tune Adam LR schedule", 0.92);

    const radio = screen.getByDisplayValue("Adjust learning rate");
    await userEvent.click(radio);
    const nextBtn = screen.getByRole("button", { name: /next/i });
    await userEvent.click(nextBtn);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledOnce();
    });

    const pushArg: string = mockPush.mock.calls[0][0];
    expect(pushArg).toContain("/confirm");
    const url = new URL(pushArg, "http://localhost");
    expect(url.searchParams.get("components")).toBe("train");
    expect(url.searchParams.get("useCase")).toBe("Tune Adam LR schedule");
    expect(url.searchParams.get("confidence")).toBe("0.92");
  });
});

describe("error state", () => {
  it("shows error message and retry button when API call fails", async () => {
    mockConverseError();

    render(<QuestionnairePage />);

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("retries the API call when Retry button is clicked", async () => {
    mockConverseError();

    render(<QuestionnairePage />);

    await waitFor(() => screen.getByRole("button", { name: /retry/i }));

    // Second attempt succeeds
    mockConverseNotDone("What aspect of training?", DEFAULT_OPTIONS);

    const retryBtn = screen.getByRole("button", { name: /retry/i });
    await userEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText("What aspect of training?")).toBeInTheDocument();
    });
  });
});

describe("turnCount hard cap", () => {
  it("navigates to /confirm when done:true returned at turnCount 5", async () => {
    mockConverseNotDone("Q1?", DEFAULT_OPTIONS);
    render(<QuestionnairePage />);
    await waitFor(() => expect(screen.getByText("Q1?")).toBeInTheDocument());

    // Simulate 4 more turns advancing to turnCount=5
    const questions = ["Q2?", "Q3?", "Q4?", "Q5?"];
    for (let i = 0; i < questions.length - 1; i++) {
      mockConverseNotDone(questions[i], DEFAULT_OPTIONS);
    }
    // Last advance triggers done:true
    mockConverseDone(["prepare", "train", "program"], "full pipeline", 0.5);

    // Advance 4 turns
    for (let i = 0; i < 4; i++) {
      const radio = screen.getAllByRole("radio")[0];
      await act(async () => {
        await userEvent.click(radio);
      });
      const nextBtn = screen.getByRole("button", { name: /next/i });
      await act(async () => {
        await userEvent.click(nextBtn);
      });
      if (i < 3) {
        await waitFor(() =>
          expect(screen.queryByText("Q1?")).not.toBeInTheDocument(),
        );
      }
    }

    await waitFor(() => expect(mockPush).toHaveBeenCalledOnce());

    const pushArg: string = mockPush.mock.calls[0][0];
    expect(pushArg).toContain("/confirm");
  });
});
