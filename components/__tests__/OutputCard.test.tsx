// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import OutputCard from "@/components/OutputCard";

vi.mock("@/components/ExportActions", () => ({
  default: () => <div data-testid="export-actions" />,
}));

const FIXTURE = {
  guideSteps: ["1. Open your AI tool", "2. Paste the prompt"],
  llmPrompt: "You are a helpful assistant. Help me with my project.",
  componentNames: ["ComponentA", "ComponentB"],
};

describe("OutputCard", () => {
  it('renders "Ready to run this?" CTA heading above prompt block', () => {
    render(<OutputCard {...FIXTURE} />);
    expect(
      screen.getByText(/ready to run this\?/i),
    ).toBeInTheDocument();
  });

  it("CTA text references Claude, ChatGPT, or Gemini", () => {
    render(<OutputCard {...FIXTURE} />);
    expect(
      screen.getByText(/paste the prompt below into claude, chatgpt, or gemini/i),
    ).toBeInTheDocument();
  });

  it("renders the copy/export actions (ExportActions present)", () => {
    render(<OutputCard {...FIXTURE} />);
    expect(screen.getByTestId("export-actions")).toBeInTheDocument();
  });

  it("renders the llm prompt content", () => {
    render(<OutputCard {...FIXTURE} />);
    expect(screen.getByText(FIXTURE.llmPrompt)).toBeInTheDocument();
  });

  it("renders guide steps", () => {
    render(<OutputCard {...FIXTURE} />);
    expect(screen.getByText("Open your AI tool")).toBeInTheDocument();
    expect(screen.getByText("Paste the prompt")).toBeInTheDocument();
  });

  it("renders component names in heading", () => {
    render(<OutputCard {...FIXTURE} />);
    expect(screen.getByText("ComponentA + ComponentB")).toBeInTheDocument();
  });

  it("CTA heading appears before the prompt block in the DOM", () => {
    const { container } = render(<OutputCard {...FIXTURE} />);
    const allText = container.textContent ?? "";
    const ctaIndex = allText.indexOf("Ready to run this?");
    const promptIndex = allText.indexOf(FIXTURE.llmPrompt);
    expect(ctaIndex).toBeLessThan(promptIndex);
  });
});
