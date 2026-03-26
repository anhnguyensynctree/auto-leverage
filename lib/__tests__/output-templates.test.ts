import { describe, it, expect } from "vitest";
import {
  OUTPUT_TEMPLATES,
  getTemplate,
  type OutputTemplate,
} from "@/lib/output-templates";

const EXPECTED_KEYS = [
  "prepare",
  "train",
  "program",
  "prepare+train",
  "prepare+program",
  "program+train",
  "all",
] as const;

function assertTemplateShape(t: OutputTemplate) {
  expect(Array.isArray(t.component_names)).toBe(true);
  expect(t.component_names.length).toBeGreaterThan(0);
  expect(Array.isArray(t.guide_steps)).toBe(true);
  expect(t.guide_steps.length).toBeGreaterThan(0);
  expect(typeof t.llm_prompt).toBe("string");
  expect(t.llm_prompt.length).toBeGreaterThan(0);
}

describe("OUTPUT_TEMPLATES", () => {
  it("exports exactly 7 template keys", () => {
    expect(Object.keys(OUTPUT_TEMPLATES)).toHaveLength(7);
  });

  EXPECTED_KEYS.forEach((key) => {
    it(`template "${key}" has correct shape`, () => {
      const t = OUTPUT_TEMPLATES[key];
      expect(t).toBeDefined();
      assertTemplateShape(t);
    });
  });

  it("prepare template has component_names ['Data Preparation']", () => {
    expect(OUTPUT_TEMPLATES.prepare.component_names).toEqual([
      "Data Preparation",
    ]);
  });

  it("train template has component_names ['Model Trainer']", () => {
    expect(OUTPUT_TEMPLATES.train.component_names).toEqual(["Model Trainer"]);
  });

  it("program template has component_names ['Experiment Instructions']", () => {
    expect(OUTPUT_TEMPLATES.program.component_names).toEqual([
      "Experiment Instructions",
    ]);
  });

  it("prepare+train template has 2 component_names", () => {
    expect(OUTPUT_TEMPLATES["prepare+train"].component_names).toEqual([
      "Data Preparation",
      "Model Trainer",
    ]);
  });

  it("prepare+program template has 2 component_names", () => {
    expect(OUTPUT_TEMPLATES["prepare+program"].component_names).toEqual([
      "Data Preparation",
      "Experiment Instructions",
    ]);
  });

  it("program+train template has 2 component_names", () => {
    expect(OUTPUT_TEMPLATES["program+train"].component_names).toEqual([
      "Model Trainer",
      "Experiment Instructions",
    ]);
  });

  it("all template has 3 component_names", () => {
    expect(OUTPUT_TEMPLATES.all.component_names).toEqual([
      "Data Preparation",
      "Model Trainer",
      "Experiment Instructions",
    ]);
  });

  it("all template llm_prompt contains all 3 sections", () => {
    const p = OUTPUT_TEMPLATES.all.llm_prompt;
    expect(p).toContain("## Data Preparation");
    expect(p).toContain("## Model Trainer");
    expect(p).toContain("## Experiment Instructions");
  });
});

describe("getTemplate", () => {
  it("returns prepare template for ['prepare']", () => {
    expect(getTemplate(["prepare"])).toBe(OUTPUT_TEMPLATES.prepare);
  });

  it("returns train template for ['train']", () => {
    expect(getTemplate(["train"])).toBe(OUTPUT_TEMPLATES.train);
  });

  it("returns program template for ['program']", () => {
    expect(getTemplate(["program"])).toBe(OUTPUT_TEMPLATES.program);
  });

  it("returns prepare+train for ['prepare','train']", () => {
    expect(getTemplate(["prepare", "train"])).toBe(
      OUTPUT_TEMPLATES["prepare+train"],
    );
  });

  it("returns prepare+train for permuted ['train','prepare']", () => {
    expect(getTemplate(["train", "prepare"])).toBe(
      OUTPUT_TEMPLATES["prepare+train"],
    );
  });

  it("returns prepare+program for ['prepare','program']", () => {
    expect(getTemplate(["prepare", "program"])).toBe(
      OUTPUT_TEMPLATES["prepare+program"],
    );
  });

  it("returns prepare+program for permuted ['program','prepare']", () => {
    expect(getTemplate(["program", "prepare"])).toBe(
      OUTPUT_TEMPLATES["prepare+program"],
    );
  });

  it("returns program+train for ['train','program']", () => {
    expect(getTemplate(["train", "program"])).toBe(
      OUTPUT_TEMPLATES["program+train"],
    );
  });

  it("returns program+train for permuted ['program','train']", () => {
    expect(getTemplate(["program", "train"])).toBe(
      OUTPUT_TEMPLATES["program+train"],
    );
  });

  it("returns all template for ['prepare','train','program']", () => {
    expect(getTemplate(["prepare", "train", "program"])).toBe(
      OUTPUT_TEMPLATES.all,
    );
  });

  it("returns all template for any permutation of all three", () => {
    expect(getTemplate(["train", "prepare", "program"])).toBe(
      OUTPUT_TEMPLATES.all,
    );
    expect(getTemplate(["program", "train", "prepare"])).toBe(
      OUTPUT_TEMPLATES.all,
    );
  });

  it("returns null for unknown single component", () => {
    expect(getTemplate(["unknown"])).toBeNull();
  });

  it("returns null for empty array", () => {
    expect(getTemplate([])).toBeNull();
  });

  it("returns null for unknown combination", () => {
    expect(getTemplate(["prepare", "unknown"])).toBeNull();
  });

  it("returns null for partially valid combination that is not a real key", () => {
    expect(getTemplate(["prepare", "train", "unknown"])).toBeNull();
  });
});
