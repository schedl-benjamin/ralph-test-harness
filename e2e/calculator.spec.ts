import { test, expect } from "@playwright/test";

test.describe("Calculator", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("qa 1.1 basic layout is visible", async ({ page }) => {
    await expect(page.getByRole("spinbutton", { name: "First number" })).toBeVisible();
    await expect(page.getByRole("spinbutton", { name: "Second number" })).toBeVisible();
    await expect(page.getByLabel("Operation")).toBeVisible();
    await expect(page.getByRole("button", { name: "Calculate" })).toBeVisible();
    await expect(page.getByTestId("calc-result")).toBeVisible();
  });

  test("page loads with calculator section", async ({ page }) => {
    await expect(page.getByTestId("num-a")).toBeVisible();
    await expect(page.getByTestId("num-b")).toBeVisible();
    await expect(page.getByTestId("operation")).toBeVisible();
    await expect(page.getByTestId("calc-btn")).toBeVisible();
    await expect(page.getByTestId("calc-result")).toBeVisible();
  });

  test("adds 2 + 3 = 5", async ({ page }) => {
    await page.getByTestId("num-a").fill("2");
    await page.getByTestId("num-b").fill("3");
    await page.getByTestId("operation").selectOption("add");
    await page.getByTestId("calc-btn").click();
    await expect(page.getByTestId("calc-result")).toHaveText("Result: 5");
  });

  test("subtracts 10 - 4 = 6", async ({ page }) => {
    await page.getByTestId("num-a").fill("10");
    await page.getByTestId("num-b").fill("4");
    await page.getByTestId("operation").selectOption("subtract");
    await page.getByTestId("calc-btn").click();
    await expect(page.getByTestId("calc-result")).toHaveText("Result: 6");
  });

  test("multiplies 3 * 7 = 21", async ({ page }) => {
    await page.getByTestId("num-a").fill("3");
    await page.getByTestId("num-b").fill("7");
    await page.getByTestId("operation").selectOption("multiply");
    await page.getByTestId("calc-btn").click();
    await expect(page.getByTestId("calc-result")).toHaveText("Result: 21");
  });

  test("divides 15 / 3 = 5", async ({ page }) => {
    await page.getByTestId("num-a").fill("15");
    await page.getByTestId("num-b").fill("3");
    await page.getByTestId("operation").selectOption("divide");
    await page.getByTestId("calc-btn").click();
    await expect(page.getByTestId("calc-result")).toHaveText("Result: 5");
  });

  test("shows error for division by zero", async ({ page }) => {
    await page.getByTestId("num-a").fill("10");
    await page.getByTestId("num-b").fill("0");
    await page.getByTestId("operation").selectOption("divide");
    await page.getByTestId("calc-btn").click();
    await expect(page.getByTestId("calc-result")).toHaveText(
      "Cannot divide by zero"
    );
  });

  test("shows error for empty inputs", async ({ page }) => {
    await page.getByTestId("calc-btn").click();
    await expect(page.getByTestId("calc-result")).toHaveText(
      "Both inputs must be numbers"
    );
  });
});
