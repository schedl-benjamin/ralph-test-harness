import { test, expect } from "@playwright/test";

test.describe("Greeter", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("greeter section is visible", async ({ page }) => {
    await expect(page.getByTestId("name-input")).toBeVisible();
    await expect(page.getByTestId("greet-btn")).toBeVisible();
    await expect(page.getByTestId("farewell-btn")).toBeVisible();
  });

  test("greets with entered name", async ({ page }) => {
    await page.getByTestId("name-input").fill("World");
    await page.getByTestId("greet-btn").click();
    await expect(page.getByTestId("greet-result")).toHaveText("Hello, World!");
  });

  test("shows farewell with entered name", async ({ page }) => {
    await page.getByTestId("name-input").fill("World");
    await page.getByTestId("farewell-btn").click();
    await expect(page.getByTestId("greet-result")).toHaveText(
      "Goodbye, World!"
    );
  });

  test("shows error for empty name", async ({ page }) => {
    await page.getByTestId("greet-btn").click();
    await expect(page.getByTestId("greet-result")).toHaveText(
      "Please enter a name"
    );
  });
});
