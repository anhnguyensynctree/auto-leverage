// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockPush = vi.fn();
const mockRouter = { push: mockPush, back: vi.fn() };

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

const { mockTrack } = vi.hoisted(() => ({ mockTrack: vi.fn() }));
vi.mock("@vercel/analytics/react", () => ({ track: mockTrack }));

const mockFetch = vi.fn();
global.fetch = mockFetch;

import EntryForm from "@/components/EntryForm";

function mockClassifySuccess(components: string[], confidence: number) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ data: { components, confidence }, error: null }),
  });
}

function mockClassifyError() {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    json: async () => ({ data: null, error: "Server error" }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockTrack.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("analytics: questionnaire_start event", () => {
  it("calls track('questionnaire_start') when form submits successfully", async () => {
    mockClassifySuccess(["train"], 0.9);

    render(<EntryForm />);
    const textarea = screen.getByRole("textbox");
    await userEvent.type(textarea, "tune my model learning rate");

    await act(async () => {
      await userEvent.click(screen.getByRole("button", { name: /analyze goal/i }));
    });

    await waitFor(() => expect(mockPush).toHaveBeenCalledOnce());

    expect(mockTrack).toHaveBeenCalledWith("questionnaire_start");
  });

  it("does not call track when API returns an error", async () => {
    mockClassifyError();

    render(<EntryForm />);
    const textarea = screen.getByRole("textbox");
    await userEvent.type(textarea, "tune my model learning rate");

    await act(async () => {
      await userEvent.click(screen.getByRole("button", { name: /analyze goal/i }));
    });

    await waitFor(() =>
      expect(screen.getByText(/server error/i)).toBeInTheDocument(),
    );

    expect(mockTrack).not.toHaveBeenCalled();
  });

  it("does not call track when validation fails (fewer than 3 words)", async () => {
    render(<EntryForm />);
    const textarea = screen.getByRole("textbox");
    await userEvent.type(textarea, "help me");

    await userEvent.click(screen.getByRole("button", { name: /analyze goal/i }));

    expect(mockTrack).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
