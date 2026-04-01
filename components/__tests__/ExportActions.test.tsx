// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import ExportActions from "@/components/ExportActions";

const { mockTrack } = vi.hoisted(() => ({ mockTrack: vi.fn() }));
vi.mock("@vercel/analytics/react", () => ({ track: mockTrack }));

const FIXTURE = {
  guideSteps: ["Step one", "Step two"],
  llmPrompt: "Paste this into your AI tool.",
};

describe("ExportActions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
      writable: true,
    });
    Object.defineProperty(window, "location", {
      value: { href: "https://example.com/guide/abc" },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    mockTrack.mockClear();
  });

  describe("Share this guide button", () => {
    it("renders Share this guide button", () => {
      render(<ExportActions {...FIXTURE} />);
      expect(screen.getByText("Share this guide")).toBeInTheDocument();
    });

    it("calls clipboard.writeText with window.location.href on click", async () => {
      render(<ExportActions {...FIXTURE} />);
      const btn = screen.getByText("Share this guide");
      await act(async () => {
        fireEvent.click(btn);
      });
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "https://example.com/guide/abc",
      );
    });

    it("shows Copied! feedback after click", async () => {
      render(<ExportActions {...FIXTURE} />);
      await act(async () => {
        fireEvent.click(screen.getByText("Share this guide"));
      });
      expect(screen.getByText("Copied!")).toBeInTheDocument();
    });

    it("resets to Share this guide after 2 seconds", async () => {
      render(<ExportActions {...FIXTURE} />);
      await act(async () => {
        fireEvent.click(screen.getByText("Share this guide"));
      });
      expect(screen.getByText("Copied!")).toBeInTheDocument();
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });
      expect(screen.getByText("Share this guide")).toBeInTheDocument();
    });
  });

  describe("Copy to clipboard button", () => {
    it("calls clipboard.writeText with llmPrompt on click", async () => {
      render(<ExportActions {...FIXTURE} />);
      await act(async () => {
        fireEvent.click(screen.getByText("Copy to clipboard"));
      });
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        FIXTURE.llmPrompt,
      );
    });

    it("calls track('output_copy_prompt') when Copy to clipboard is clicked", async () => {
      render(<ExportActions {...FIXTURE} />);
      await act(async () => {
        fireEvent.click(screen.getByText("Copy to clipboard"));
      });
      expect(mockTrack).toHaveBeenCalledWith("output_copy_prompt");
    });

    it("shows Copied! feedback and resets after 2 seconds", async () => {
      render(<ExportActions {...FIXTURE} />);
      await act(async () => {
        fireEvent.click(screen.getByText("Copy to clipboard"));
      });
      expect(screen.getAllByText("Copied!")).toHaveLength(1);
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });
      expect(screen.getByText("Copy to clipboard")).toBeInTheDocument();
    });
  });
});
