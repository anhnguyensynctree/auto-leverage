import { test, expect } from "@playwright/test";

const MOCK_TURN_0 = {
  data: {
    done: false,
    question: "What are you optimising?",
    options: [
      "Loss function",
      "Learning rate",
      "Something else — I'll describe it",
    ],
  },
  error: null,
};

const MOCK_DONE = {
  data: {
    done: true,
    components: ["train"],
    useCase: "tune my optimizer",
    confidence: 0.85,
  },
  error: null,
};

const BASE_URL = "/questionnaire?intent=tune+my+optimizer";

test.describe("1 — happy path", () => {
  test("initial load — renders question text and radio options", async ({
    page,
  }) => {
    await page.route("**/api/converse", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_TURN_0),
      }),
    );

    await page.goto(BASE_URL);

    await expect(
      page.getByRole("heading", { name: "What are you optimising?" }),
    ).toBeVisible();

    const radios = page.locator('input[type="radio"]');
    await expect(radios).toHaveCount(3);
    await expect(page.getByText("Loss function")).toBeVisible();
    await expect(page.getByText("Learning rate")).toBeVisible();
    await expect(
      page.getByText("Something else — I'll describe it"),
    ).toBeVisible();
  });

  test("done:true — navigates to /confirm with components, useCase params", async ({
    page,
  }) => {
    await page.route("**/api/converse", async (route) => {
      const postData = route.request().postDataJSON() as {
        turns?: unknown[];
      } | null;
      const hasTurns =
        Array.isArray(postData?.turns) && postData.turns.length > 0;
      const body = hasTurns ? MOCK_DONE : MOCK_TURN_0;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    });

    await page.goto(BASE_URL);

    await expect(
      page.getByRole("heading", { name: "What are you optimising?" }),
    ).toBeVisible();

    await page
      .locator("label", { hasText: "Learning rate" })
      .click({ force: true });

    await page.getByRole("button", { name: /next/i }).click();

    await page.waitForURL(/\/confirm/);

    const url = new URL(page.url());
    expect(url.pathname).toBe("/confirm");
    expect(url.searchParams.get("components")).toBe("train");
    expect(url.searchParams.get("useCase")).toBe("tune my optimizer");
  });
});

test.describe("2 — error states", () => {
  test("500 from /api/converse — error message visible on page", async ({
    page,
  }) => {
    await page.route("**/api/converse", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ data: null, error: "Internal Server Error" }),
      }),
    );

    await page.goto(BASE_URL);

    await expect(
      page.getByText(/something went wrong/i),
    ).toBeVisible({ timeout: 10000 });
  });
});

test.describe("3 — empty state", () => {
  test("no intent param — shows 'Please describe your goal first' with link to /", async ({
    page,
  }) => {
    await page.goto("/questionnaire");

    await expect(
      page.getByText(/please describe your goal first/i),
    ).toBeVisible({ timeout: 5000 });

    const link = page.getByRole("link", { name: /start here/i });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/");
  });
});

// N/A (4 — auth edge): no authentication in this product.
test.describe("4 — auth edge", () => {});

test.describe("5 — input edge", () => {
  test("something else — selecting option reveals free text textarea", async ({
    page,
  }) => {
    await page.route("**/api/converse", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_TURN_0),
      }),
    );

    await page.goto(BASE_URL);

    await expect(
      page.getByRole("heading", { name: "What are you optimising?" }),
    ).toBeVisible();

    await page
      .locator("label", { hasText: "Something else — I'll describe it" })
      .click({ force: true });

    await expect(
      page.locator("textarea[aria-label='Describe your need']"),
    ).toBeVisible();
  });

  test("back on turn 0 — navigates away without additional API call", async ({
    page,
  }) => {
    let callCount = 0;

    await page.route("**/api/converse", (route) => {
      callCount++;
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_TURN_0),
      });
    });

    await page.goto(BASE_URL);

    await expect(
      page.getByRole("heading", { name: "What are you optimising?" }),
    ).toBeVisible();

    const callCountBeforeBack = callCount;

    await page.getByRole("button", { name: /back/i }).click();

    await page.waitForFunction(
      () => !location.pathname.startsWith("/questionnaire"),
    );
    expect(new URL(page.url()).pathname).not.toBe("/questionnaire");

    expect(callCount).toBe(callCountBeforeBack);
  });
});

test.describe("visual QA — questionnaire", () => {
  test("question loaded — question text and options visible", async ({ page }) => {
    await page.route("**/api/converse", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_TURN_0),
      }),
    );

    await page.goto(BASE_URL);

    await expect(
      page.getByRole("heading", { name: "What are you optimising?" }),
    ).toBeVisible();
    await expect(page.locator('input[type="radio"]')).toHaveCount(3);

    await page.screenshot({ path: "qa/screenshots/questionnaire-loaded.png" });
    await expect(page).toHaveScreenshot("questionnaire-loaded.png");
  });

  test("after done:true — /confirm URL reached", async ({ page }) => {
    await page.route("**/api/converse", async (route) => {
      const postData = route.request().postDataJSON() as {
        turns?: unknown[];
      } | null;
      const hasTurns =
        Array.isArray(postData?.turns) && postData.turns.length > 0;
      const body = hasTurns ? MOCK_DONE : MOCK_TURN_0;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    });

    await page.goto(BASE_URL);
    await expect(
      page.getByRole("heading", { name: "What are you optimising?" }),
    ).toBeVisible();

    await page.locator("label", { hasText: "Learning rate" }).click({ force: true });
    await page.getByRole("button", { name: /next/i }).click();
    await page.waitForURL(/\/confirm/);

    await page.screenshot({ path: "qa/screenshots/questionnaire-done.png" });
    await expect(page).toHaveScreenshot("questionnaire-done.png");
  });

  test("error state — 500 mock, error message visible", async ({ page }) => {
    await page.route("**/api/converse", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ data: null, error: "Internal Server Error" }),
      }),
    );

    await page.goto(BASE_URL);
    await expect(page.getByText(/something went wrong/i)).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: "qa/screenshots/questionnaire-error.png" });
    await expect(page).toHaveScreenshot("questionnaire-error.png");
  });

  test("empty state — no intent param, redirect or message", async ({ page }) => {
    await page.goto("/questionnaire");
    await expect(
      page.getByText(/please describe your goal first/i),
    ).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: "qa/screenshots/questionnaire-empty.png" });
    await expect(page).toHaveScreenshot("questionnaire-empty.png");
  });
});
