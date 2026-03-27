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

test.describe("confirm to output", () => {
  test("component cards — prepare and train titles visible", async ({
    page,
  }) => {
    await page.goto(CONFIRM_URL);
    await expect(page.getByText("Data Preparation")).toBeVisible();
    await expect(page.getByText("Model Trainer")).toBeVisible();
  });

  test("useCase display — tune my model visible", async ({ page }) => {
    await page.goto(CONFIRM_URL);
    await expect(page.getByText(/tune my model/i)).toBeVisible();
  });

  test("start over — navigates to / with no query params", async ({ page }) => {
    await page.goto(CONFIRM_URL);
    await page.getByRole("button", { name: /start over/i }).click();
    await expect(page).toHaveURL("/");
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
