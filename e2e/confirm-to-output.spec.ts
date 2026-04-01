import { test, expect } from "@playwright/test";

const CONFIRM_URL =
  "/confirm?components=prepare%2Ctrain&useCase=tune+my+model&confidence=0.8";

const MOCK_OUTPUT = {
  data: {
    component_names: ["Data Preparation", "Model Trainer"],
    guide_steps: [
      "Step 1: Install the autoresearch repo",
      "Step 2: Edit train.py",
    ],
    llm_prompt: "Here is your copy-paste prompt for autoresearch...",
  },
  error: null,
};

test.describe("1 — happy path", () => {
  test("component cards — Data Preparation and Model Trainer titles visible", async ({
    page,
  }) => {
    await page.goto(CONFIRM_URL);
    await expect(page.getByText("Data Preparation")).toBeVisible();
    await expect(page.getByText("Model Trainer")).toBeVisible();
  });

  test("useCase display — tune my model visible on confirm page", async ({
    page,
  }) => {
    await page.goto(CONFIRM_URL);
    await expect(page.getByText("tune my model", { exact: true })).toBeVisible();
  });

  test("confirm to output — navigates, shows guide steps and prompt", async ({
    page,
  }) => {
    await page.route("**/api/output", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_OUTPUT),
      }),
    );

    await page.goto(CONFIRM_URL);
    await page.getByRole("button", { name: /yes, this fits/i }).click();

    await expect(page).toHaveURL(/\/output/);
    await expect(page.getByText(/step 1:/i)).toBeVisible();
    await expect(
      page.getByText(/here is your copy-paste prompt for autoresearch/i),
    ).toBeVisible();
  });
});

test.describe("2 — error states", () => {
  test("500 from /api/output — error message visible on output page", async ({
    page,
  }) => {
    await page.route("**/api/output", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ data: null, error: "Internal Server Error" }),
      }),
    );

    await page.goto(CONFIRM_URL);
    await page.getByRole("button", { name: /yes, this fits/i }).click();

    await expect(page).toHaveURL(/\/output/);
    // Output page renders the error string from the API response
    await expect(
      page.getByText(/something went wrong|internal server error/i),
    ).toBeVisible({ timeout: 10000 });
  });
});

test.describe("3 — empty state", () => {
  test("no components param — redirects to / or shows start-over message", async ({
    page,
  }) => {
    await page.goto("/confirm");

    // confirm/page.tsx calls router.replace("/") when components is empty
    await expect(page).toHaveURL("/", { timeout: 5000 });
  });
});

// N/A (4 — auth edge): no authentication in this product.
test.describe("4 — auth edge", () => {});

test.describe("5 — input edge", () => {
  test("start over button — navigates to / with no query params", async ({
    page,
  }) => {
    await page.goto(CONFIRM_URL);
    await page.getByRole("button", { name: /start over/i }).click();
    await expect(page).toHaveURL("/");
  });

  test("useCase with special characters — page renders without error", async ({
    page,
  }) => {
    const specialUseCase = encodeURIComponent("improve loss & accuracy — fast");
    await page.goto(
      `/confirm?components=train&useCase=${specialUseCase}&confidence=0.8`,
    );

    await expect(page.getByText("Model Trainer")).toBeVisible();
    await expect(page.getByText(/improve loss/i).first()).toBeVisible();
  });
});
