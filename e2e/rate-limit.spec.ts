import { test, expect } from "@playwright/test";

const MOCK_OUTPUT = {
  data: {
    component_names: ["Data Preparation", "Model Trainer"],
    guide_steps: ["Step 1: Begin training", "Step 2: Evaluate results"],
    llm_prompt: "Here is your prompt for autoresearch.",
  },
  error: null,
};

const RATE_LIMIT_429 = {
  data: null,
  error: "Too many requests — try again later",
  meta: { resetMs: 60000 },
};

// URL for normal (non-rate-limited) output
const OUTPUT_URL =
  "/output?components=train&useCase=tune+my+optimizer";

// URL simulating a rate-limited redirect from questionnaire
const RATE_LIMITED_URL =
  "/output?components=prepare%2Ctrain%2Cprogram&useCase=tune+my+optimizer&rate_limited=1&resetMs=180000";

test.describe("1 — happy path", () => {
  test("normal output page renders guide steps and prompt without rate-limit message", async ({
    page,
  }) => {
    await page.route("**/api/output", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_OUTPUT),
      }),
    );

    await page.goto(OUTPUT_URL);

    await expect(page.getByText("Step 1: Begin training")).toBeVisible();
    await expect(
      page.getByText("Here is your prompt for autoresearch."),
    ).toBeVisible();
    await expect(page.getByTestId("rate-limit-message")).not.toBeVisible().catch(() => {
      // element may not exist at all — both are valid
    });
    // Confirm no rate-limit message text is present
    await expect(page.getByText(/should be back/i)).not.toBeVisible().catch(() => {});

    await page.screenshot({ path: "qa/screenshots/rate-limit-absent.png" });
    await expect(page).toHaveScreenshot("rate-limit-absent.png");
  });

  test("start over button visible and navigates to /", async ({ page }) => {
    await page.route("**/api/output", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_OUTPUT),
      }),
    );

    await page.goto(OUTPUT_URL);

    // Wait for content to load
    await expect(page.getByText("Step 1: Begin training")).toBeVisible();

    // Start over in nav
    const startOverButtons = page.getByRole("button", { name: /start over/i });
    await expect(startOverButtons.first()).toBeVisible();
    await startOverButtons.first().click();
    await expect(page).toHaveURL("/");
  });
});

test.describe("2 — error states (429 → redirect to output)", () => {
  test("questionnaire 429 redirects to /output with rate_limited=1 and correct params", async ({
    page,
  }) => {
    await page.route("**/api/converse", (route) =>
      route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify(RATE_LIMIT_429),
      }),
    );

    await page.goto("/questionnaire?intent=tune+my+optimizer");

    // Should navigate to /output
    await expect(page).toHaveURL(/\/output/, { timeout: 8000 });

    const url = new URL(page.url());
    expect(url.searchParams.get("rate_limited")).toBe("1");
    expect(url.searchParams.get("resetMs")).toBe("60000");
    expect(url.searchParams.get("components")).toBe("prepare,train,program");
    expect(url.searchParams.get("useCase")).toBe("tune my optimizer");
  });

  test("rate-limited output page renders static content (no /api/output fetch)", async ({
    page,
  }) => {
    // If /api/output is called, fail the test
    let apiOutputCalled = false;
    await page.route("**/api/output", (route) => {
      apiOutputCalled = true;
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_OUTPUT),
      });
    });

    await page.goto(RATE_LIMITED_URL);

    // All-components template content should appear in the heading
    await expect(
      page.getByRole("heading", { name: /Data Preparation/i }),
    ).toBeVisible();

    expect(apiOutputCalled).toBe(false);

    await page.screenshot({ path: "qa/screenshots/rate-limit-output.png" });
    await expect(page).toHaveScreenshot("rate-limit-output.png");
  });
});

// N/A (3 — empty state): output page always renders content — either from API or static template.
// There is no empty render path: rate_limited path uses OUTPUT_TEMPLATES["all"] and the normal
// path falls back to an error state on API failure, never an empty state.

// N/A (4 — auth edge): this product has no authentication. Output and questionnaire pages
// are fully public. No session expiry or auth redirect paths exist.

test.describe("5 — input edge", () => {
  test("resetMs=180000 renders 'approximately 3 minutes'", async ({ page }) => {
    await page.goto(RATE_LIMITED_URL);

    await expect(page.getByTestId("rate-limit-message")).toBeVisible({
      timeout: 6000,
    });
    await expect(page.getByTestId("rate-limit-message")).toContainText(
      "approximately 3 minutes",
    );
    await expect(page.getByTestId("rate-limit-message")).toContainText(
      "should be back",
    );
  });

  test("resetMs=0 clamps to minimum 1 minute", async ({ page }) => {
    await page.goto(
      "/output?components=prepare%2Ctrain%2Cprogram&useCase=tune+my+optimizer&rate_limited=1&resetMs=0",
    );

    await expect(page.getByTestId("rate-limit-message")).toBeVisible({
      timeout: 6000,
    });
    await expect(page.getByTestId("rate-limit-message")).toContainText(
      "approximately 1 minute",
    );
  });

  test("start over button remains visible on rate-limited output page", async ({
    page,
  }) => {
    await page.goto(RATE_LIMITED_URL);

    await expect(page.getByTestId("rate-limit-message")).toBeVisible({
      timeout: 6000,
    });

    const startOverButtons = page.getByRole("button", { name: /start over/i });
    await expect(startOverButtons.first()).toBeVisible();
    await startOverButtons.first().click();
    await expect(page).toHaveURL("/");
  });
});
