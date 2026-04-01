import { test, expect } from "@playwright/test";

const FIXTURE_RESPONSE = {
  data: {
    drafted_input:
      "| Game | Home Score | Away Score |\n|---|---|---|\n| 1 | 112 | 108 |\n| 2 | 98 | 105 |",
    metric: "We'd watch prediction accuracy improve over each experiment",
    experiment_rows: [
      { experiment: 1, result: "64.2%", status: "No change" },
      { experiment: 2, result: "67.8%", status: "Improved" },
      { experiment: 3, result: "71.3%", status: "Best so far" },
      { experiment: 4, result: "70.9%", status: "Slightly worse" },
    ],
    outcome:
      "By experiment 3, prediction accuracy reached 71.3% — a meaningful gain over the baseline.",
  },
  error: null,
};

const OUTPUT_FIXTURE = {
  data: {
    component_names: ["Model Trainer"],
    guide_steps: [
      "1. Fill in the prompt below and paste it into your AI assistant.",
    ],
    llm_prompt: "This is the prompt.",
  },
  error: null,
};

test.describe("Simulation panel", () => {
  test("simulation panel is hidden on load and visible after toggle click", async ({
    page,
  }) => {
    let simulateCalled = false;

    await page.route("**/api/simulate", (route) => {
      simulateCalled = true;
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(FIXTURE_RESPONSE),
      });
    });

    await page.route("**/api/output", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(OUTPUT_FIXTURE),
      });
    });

    await page.goto(
      "/output?components=train&useCase=NBA+team+performance+prediction",
    );

    // Toggle button must be present
    const toggle = page.getByTestId("sim-toggle");
    await expect(toggle).toBeVisible({ timeout: 10000 });
    await expect(toggle).toHaveText(/see a worked example/i);

    // Simulation panel must be hidden before toggle
    await expect(page.getByTestId("sim-panel")).not.toBeVisible();

    // /api/simulate must NOT have been called yet
    expect(simulateCalled).toBe(false);

    // Click toggle — panel expands, fetch fires
    await toggle.click();
    await expect(toggle).toHaveText(/hide example/i);
    await expect(page.getByTestId("sim-panel")).toBeVisible();

    // Wait for content to render
    const heading = page.getByText(/see it in action/i);
    await expect(heading).toBeVisible({ timeout: 10000 });

    // Experiment table rows: header + 4 data rows = 5
    const rows = page.getByRole("row");
    await expect(rows).toHaveCount(5);

    // Outcome text visible
    await expect(page.getByText(/by experiment 3/i)).toBeVisible();

    // /api/simulate was called exactly once
    expect(simulateCalled).toBe(true);
  });

  test("subsequent toggles show/hide without re-fetching", async ({ page }) => {
    let callCount = 0;

    await page.route("**/api/simulate", (route) => {
      callCount++;
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(FIXTURE_RESPONSE),
      });
    });

    await page.route("**/api/output", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(OUTPUT_FIXTURE),
      });
    });

    await page.goto(
      "/output?components=train&useCase=NBA+team+performance+prediction",
    );

    const toggle = page.getByTestId("sim-toggle");
    await expect(toggle).toBeVisible({ timeout: 10000 });

    // First expand — triggers fetch
    await toggle.click();
    await expect(page.getByText(/see it in action/i)).toBeVisible({
      timeout: 10000,
    });
    expect(callCount).toBe(1);

    // Collapse
    await toggle.click();
    await expect(page.getByTestId("sim-panel")).not.toBeVisible();

    // Re-expand — no second fetch
    await toggle.click();
    await expect(page.getByTestId("sim-panel")).toBeVisible();
    expect(callCount).toBe(1);
  });
});
