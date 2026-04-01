import { test, expect } from "@playwright/test";

const MOCK_CLASSIFY = {
  data: { components: ["prepare", "train", "program"], confidence: 0.9 },
  error: null,
};

test.describe("home entry form", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/classify", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_CLASSIFY),
      }),
    );
    await page.goto("/");
  });

  // 1 — happy path
  test.describe("1 — happy path", () => {
    test("submits valid input and navigates to /questionnaire with intent param", async ({
      page,
    }) => {
      const input = "I want to download training data";
      await page.getByRole("textbox", { name: "Describe your goal" }).fill(input);
      await page.getByRole("button", { name: "Analyze Goal" }).click();

      await page.waitForURL(/\/questionnaire/);

      const url = new URL(page.url());
      expect(url.pathname).toBe("/questionnaire");
      expect(url.searchParams.get("intent")).toBe(input);
    });

    test("URL param contract — intent searchParam equals submitted text exactly", async ({
      page,
    }) => {
      const input = "I want to download training data";
      await page.getByRole("textbox", { name: "Describe your goal" }).fill(input);
      await page.getByRole("button", { name: "Analyze Goal" }).click();

      await page.waitForURL(/\/questionnaire/);

      const rawUrl = page.url();
      const url = new URL(rawUrl);

      expect(url.searchParams.get("intent")).toBe(input);

      const encodedIntent = encodeURIComponent(input).replace(/%20/g, "+");
      expect(rawUrl).toContain(`intent=${encodedIntent}`);
    });
  });

  // N/A (2 — error states): home entry form does not call any API — the submit button navigates client-side only; no server error path exists.
  test.describe("2 — error states", () => {});

  // N/A (3 — empty state): page always renders with an empty textarea; there is no missing-data render state.
  test.describe("3 — empty state", () => {});

  // N/A (4 — auth edge): no authentication in this product.
  test.describe("4 — auth edge", () => {});

  // 5 — input edge
  test.describe("5 — input edge", () => {
    test("validation — fewer than 3 words shows inline error and does not navigate", async ({
      page,
    }) => {
      await page.getByRole("textbox", { name: "Describe your goal" }).fill("hi");
      await page.getByRole("button", { name: "Analyze Goal" }).click();

      await expect(page.locator("#entry-error")).toBeVisible();
      await expect(page.locator("#entry-error")).toContainText("at least 3 words");

      expect(new URL(page.url()).pathname).toBe("/");
    });

    test("char limit — textarea value is capped at 500 characters", async ({
      page,
    }) => {
      const textarea = page.getByRole("textbox", { name: "Describe your goal" });
      const base = "a".repeat(500);

      await textarea.fill(base);
      await textarea.pressSequentially("b");

      const length = await textarea.evaluate(
        (el: HTMLTextAreaElement) => el.value.length,
      );
      expect(length).toBe(500);
    });
  });
});
