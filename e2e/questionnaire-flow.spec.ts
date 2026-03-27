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

test.describe("questionnaire flow", () => {
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

  test("something else reveals free text", async ({ page }) => {
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
      .locator('input[type="radio"]')
      .check();

    await expect(
      page.locator("textarea[aria-label='Describe your need']"),
    ).toBeVisible();
  });

  test("back on turn 0 — navigates away without API call", async ({ page }) => {
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

    // No additional API call should have been made when Back is clicked at turn 0
    expect(callCount).toBe(callCountBeforeBack);
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
      .locator('input[type="radio"]')
      .check();

    await page.getByRole("button", { name: /next/i }).click();

    await page.waitForURL(/\/confirm/);

    const url = new URL(page.url());
    expect(url.pathname).toBe("/confirm");
    expect(url.searchParams.get("components")).toBe("train");
    expect(url.searchParams.get("useCase")).toBe("tune my optimizer");
  });
});
