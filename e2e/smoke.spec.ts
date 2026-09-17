import { expect, test } from "@playwright/test";

test("홈 화면이 열리고 시작 화면이 보인다", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("심해 탈출 런");
  await expect(page.getByText("심해 탈출 런")).toBeVisible();
  await expect(page.getByRole("button", { name: "시작" })).toBeVisible();
});
