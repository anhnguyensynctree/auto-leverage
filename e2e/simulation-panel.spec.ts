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

test.describe("Simulation panel", () => {
  test("shows 'See it in action' section with all expected content", async ({
    page,
  }) => {
    // Intercept /api/simulate to avoid real GLM calls
    await page.route("**/api/simulate", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(FIXTURE_RESPONSE),
      });
    });

    // Also intercept /api/output so the page renders without a real API call
    await page.route("**/api/output", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            component_names: ["Model Trainer"],
            guide_steps: [
              "1. Fill in the prompt below and paste it into your AI assistant.",
            ],
            llm_prompt: "This is the prompt.",
          },
          error: null,
        }),
      });
    });

    await page.goto(
      "/output?components=train&useCase=NBA+team+performance+prediction",
    );

    // Section heading
    const heading = page.getByText(/see it in action/i);
    await expect(heading).toBeVisible({ timeout: 10000 });

    // Experiment table rows present
    const rows = page.getByRole("row");
    // header + 4 data rows = 5
    await expect(rows).toHaveCount(5);

    // Outcome text visible
    await expect(page.getByText(/by experiment 3/i)).toBeVisible();
  });
});
