import type { Page } from '@playwright/test';

export async function tap(page: Page, square: string): Promise<void> {
  await page.locator(`rect[data-square="${square}"]`).click();
}

export async function play(page: Page, from: string, to: string): Promise<void> {
  await tap(page, from);
  await tap(page, to);
}

export async function openChess(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /Échecs/ }).click();
}
