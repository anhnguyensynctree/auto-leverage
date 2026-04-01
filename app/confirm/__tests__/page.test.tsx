// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockRouter = { push: mockPush, replace: mockReplace };

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
  useRouter: () => mockRouter,
}));

const { mockTrack } = vi.hoisted(() => ({ mockTrack: vi.fn() }));
vi.mock("@vercel/analytics/react", () => ({ track: mockTrack }));

import { useSearchParams } from "next/navigation";

const mockUseSearchParams = vi.mocked(useSearchParams);

function makeSearchParams(params: Record<string, string>) {
  return {
    get: (key: string) => params[key] ?? null,
  } as ReturnType<typeof useSearchParams>;
}

import ConfirmPage from "@/app/confirm/page";

beforeEach(() => {
  vi.clearAllMocks();
  mockTrack.mockClear();
  // Mock sessionStorage
  Object.defineProperty(window, "sessionStorage", {
    value: { getItem: vi.fn().mockReturnValue(null), setItem: vi.fn() },
    configurable: true,
    writable: true,
  });
  mockUseSearchParams.mockReturnValue(
    makeSearchParams({ components: "train", confidence: "0.9", useCase: "tune model" }),
  );
});

describe("analytics: confirm_proceed event", () => {
  it("calls track('confirm_proceed') when 'Yes, this fits' is clicked", async () => {
    render(<ConfirmPage />);

    await waitFor(() =>
      expect(screen.getByText("Yes, this fits")).toBeInTheDocument(),
    );

    await userEvent.click(screen.getByText("Yes, this fits"));

    expect(mockTrack).toHaveBeenCalledWith("confirm_proceed");
  });

  it("navigates to /output after tracking confirm_proceed", async () => {
    render(<ConfirmPage />);

    await waitFor(() =>
      expect(screen.getByText("Yes, this fits")).toBeInTheDocument(),
    );

    await userEvent.click(screen.getByText("Yes, this fits"));

    expect(mockPush).toHaveBeenCalledOnce();
    const pushArg: string = mockPush.mock.calls[0][0];
    expect(pushArg).toContain("/output");
  });

  it("does not call track when Start over is clicked", async () => {
    render(<ConfirmPage />);

    await waitFor(() =>
      expect(screen.getByText("Start over")).toBeInTheDocument(),
    );

    await userEvent.click(screen.getByText("Start over"));

    expect(mockTrack).not.toHaveBeenCalled();
  });
});
