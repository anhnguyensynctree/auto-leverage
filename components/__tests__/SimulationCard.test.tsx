// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import SimulationCard from "@/components/SimulationCard";
import type { SimulationResult } from "@/app/api/simulate/route";

const FIXTURE: SimulationResult = {
  drafted_input:
    "| Run | Layers | LR |\n|---|---|---|\n| A | 6 | 3e-4 |\n| B | 8 | 3e-4 |",
  metric: "We'd watch val_bpb improve over each experiment",
  experiment_rows: [
    { experiment: 1, result: "0.997", status: "No change" },
    { experiment: 2, result: "0.992", status: "Improved" },
    { experiment: 3, result: "0.985", status: "Best so far" },
    { experiment: 4, result: "0.987", status: "Slightly worse" },
  ],
  outcome:
    "By experiment 3, the model reached its best quality score of 0.985.",
};

describe("SimulationCard", () => {
  it('renders "See it in action" section heading', () => {
    render(<SimulationCard {...FIXTURE} />);
    expect(screen.getByText(/see it in action/i)).toBeInTheDocument();
  });

  it('renders "Example input" sub-section with drafted_input', () => {
    render(<SimulationCard {...FIXTURE} />);
    expect(screen.getByText(/example input/i)).toBeInTheDocument();
    // Pre/code block may split text across nodes — check by container
    const codeEl = document.querySelector("pre code");
    expect(codeEl).not.toBeNull();
    expect(codeEl!.textContent).toBe(FIXTURE.drafted_input);
  });

  it('renders "What gets tracked" sub-section with metric', () => {
    render(<SimulationCard {...FIXTURE} />);
    expect(screen.getByText(/what gets tracked/i)).toBeInTheDocument();
    expect(screen.getByText(FIXTURE.metric)).toBeInTheDocument();
  });

  it("renders experiment table with correct columns", () => {
    render(<SimulationCard {...FIXTURE} />);
    expect(
      screen.getByRole("columnheader", { name: /experiment/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /result/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /status/i }),
    ).toBeInTheDocument();
  });

  it("renders all 4 experiment rows", () => {
    render(<SimulationCard {...FIXTURE} />);
    const rows = screen.getAllByRole("row");
    // 1 header + 4 data rows
    expect(rows).toHaveLength(5);
  });

  it("renders experiment row data correctly", () => {
    render(<SimulationCard {...FIXTURE} />);
    const table = screen.getByRole("table");
    expect(within(table).getByText("0.985")).toBeInTheDocument();
    expect(within(table).getByText("Best so far")).toBeInTheDocument();
    expect(within(table).getByText("0.997")).toBeInTheDocument();
    expect(within(table).getByText("No change")).toBeInTheDocument();
  });

  it("renders outcome sentence", () => {
    render(<SimulationCard {...FIXTURE} />);
    expect(screen.getByText(FIXTURE.outcome)).toBeInTheDocument();
  });
});
