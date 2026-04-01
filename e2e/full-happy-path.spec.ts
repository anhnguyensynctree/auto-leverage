import { test, expect } from "@playwright/test";

const MOCK_CLASSIFY = {
  data: { components: ["train"], confidence: 0.9 },
  error: null,
};

const MOCK_CONVERSE_Q1 = {
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

const MOCK_CONVERSE_DONE = {
  data: {
    done: true,
    components: ["train"],
    useCase: "tune my optimizer",
    confidence: 0.9,
  },
  error: null,
};

const MOCK_OUTPUT = {
  data: {
    component_names: ["Model Trainer"],
    guide_steps: ["Step 1: Install the autoresearch repo"],
    llm_prompt: "Your prompt here",
  },
  error: null,
};

test.describe("full happy path", () => {
  test("complete user journey", async ({ page }) => {
    // ── Mocks ──────────────────────────────────────────────────────────────
    await page.route("**/api/classify", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_CLASSIFY),
      }),
    );

    // Serve Q1 for initial load calls (React StrictMode fires effect twice in dev);
    // serve DONE only when the request body contains turns (user has answered).
    await page.route("**/api/converse", async (route) => {
      const postData = route.request().postDataJSON() as {
        turns?: unknown[];
      } | null;
      const hasTurns =
        Array.isArray(postData?.turns) && postData.turns.length > 0;
      const body = hasTurns ? MOCK_CONVERSE_DONE : MOCK_CONVERSE_Q1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    });

    await page.route("**/api/output", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_OUTPUT),
      }),
    );

    // ── Step 1: Home ───────────────────────────────────────────────────────
    await page.goto("/");
    await page
      .getByRole("textbox", { name: "Describe your goal" })
      .fill("I want to tune my optimizer settings");
    await page.getByRole("button", { name: "Analyze Goal" }).click();

    // ── Step 2: Questionnaire ──────────────────────────────────────────────
    await page.waitForURL(/\/questionnaire/);
    expect(new URL(page.url()).pathname).toBe("/questionnaire");

    // Loading spinner shows first; wait for initial converse response to render
    await expect(
      page.getByRole("heading", { name: "What are you optimising?" }),
    ).toBeVisible({ timeout: 15000 });

    await page
      .locator("label", { hasText: "Learning rate" })
      .click({ force: true });

    await page.getByRole("button", { name: /next/i }).click();

    // ── Step 3: Confirm ────────────────────────────────────────────────────
    await page.waitForURL(/\/confirm/);
    expect(new URL(page.url()).pathname).toBe("/confirm");

    await expect(page.getByText("tune my optimizer", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: /yes, this fits/i }).click();

    // ── Step 4: Output ─────────────────────────────────────────────────────
    await expect(page).toHaveURL(/\/output/);
    await expect(page.getByText(/step 1:/i)).toBeVisible();
  });
});
