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

test.describe("1 — happy path", () => {
  test("panel hidden on load, toggle shows panel and calls /api/simulate once", async ({
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

    const toggle = page.getByTestId("sim-toggle");
    await expect(toggle).toBeVisible({ timeout: 10000 });
    await expect(toggle).toHaveText(/see a worked example/i);

    await expect(page.getByTestId("sim-panel")).not.toBeVisible();
    expect(simulateCalled).toBe(false);

    await page.screenshot({ path: "qa/screenshots/sim-panel-hidden.png" });
    await expect(page).toHaveScreenshot("sim-panel-hidden.png");

    await toggle.click();
    await expect(toggle).toHaveText(/hide example/i);
    await expect(page.getByTestId("sim-panel")).toBeVisible();

    const heading = page.getByText(/see it in action/i);
    await expect(heading).toBeVisible({ timeout: 10000 });

    const rows = page.getByRole("row");
    await expect(rows).toHaveCount(5);

    await expect(page.getByText(/by experiment 3/i)).toBeVisible();
    expect(simulateCalled).toBe(true);

    await page.screenshot({ path: "qa/screenshots/sim-panel-open.png" });
    await expect(page).toHaveScreenshot("sim-panel-open.png");
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

    await toggle.click();
    await expect(page.getByText(/see it in action/i)).toBeVisible({
      timeout: 10000,
    });
    expect(callCount).toBe(1);

    await toggle.click();
    await expect(page.getByTestId("sim-panel")).not.toBeVisible();

    await toggle.click();
    await expect(page.getByTestId("sim-panel")).toBeVisible();
    expect(callCount).toBe(1);
  });
});

// N/A (3 — empty state): API always returns either a result or fails silently — there is no empty render path for this panel.
test.describe("3 — empty state", () => {
  // N/A (3 — empty state): API always returns either a result or fails silently — no empty render path.
});

// N/A (4 — auth edge): no authentication in this product.
test.describe("4 — auth edge", () => {
  // N/A (4 — auth edge): no authentication in this product.
});

test.describe("2 — error states", () => {
  test("500 from /api/simulate — toggle visible, panel hidden, silent fail", async ({
    page,
  }) => {
    await page.route("**/api/simulate", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ data: null, error: "Internal Server Error" }),
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

    await toggle.click();
    await expect(toggle).toBeVisible();
    await expect(page.getByTestId("sim-panel")).not.toBeVisible();
    await expect(page.getByText(/error/i)).not.toBeVisible();

    await page.screenshot({ path: "qa/screenshots/sim-panel-error.png" });
    await expect(page).toHaveScreenshot("sim-panel-error.png");
  });
});

test.describe("5 — input edge", () => {
  test("useCase URL param with 200+ characters — page renders, toggle visible", async ({
    page,
  }) => {
    const longUseCase = "A".repeat(250);

    await page.route("**/api/simulate", (route) => {
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
      `/output?components=train&useCase=${encodeURIComponent(longUseCase)}`,
    );

    const toggle = page.getByTestId("sim-toggle");
    await expect(toggle).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: "qa/screenshots/sim-panel-long-input.png" });
    await expect(page).toHaveScreenshot("sim-panel-long-input.png");
  });

  test("useCase with special characters — page renders without error", async ({
    page,
  }) => {
    const specialUseCase = "NBA<>team&performance=prediction!@#$%^&*()";

    await page.route("**/api/simulate", (route) => {
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
      `/output?components=train&useCase=${encodeURIComponent(specialUseCase)}`,
    );
  });
});
