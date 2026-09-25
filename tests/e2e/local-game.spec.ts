import { expect, test } from '@playwright/test';
import { openChess, play } from './helpers';

test('partie à deux jusqu’au mat', async ({ page }) => {
  await openChess(page);
  await page.getByRole('button', { name: /2 joueurs sur ce téléphone/ }).click();
  await play(page, 'f2', 'f3');
  await play(page, 'e7', 'e5');
  await play(page, 'g2', 'g4');
  await play(page, 'd8', 'h4');
  await expect(page.getByRole('dialog', { name: 'Les Noirs gagnent !' })).toBeVisible();
});

test('reprendre une partie après rechargement', async ({ page }) => {
  await openChess(page);
  await page.getByRole('button', { name: /2 joueurs sur ce téléphone/ }).click();
  await play(page, 'e2', 'e4');
  await expect(page.locator('[data-piece="e4"]')).toHaveAttribute('aria-label', 'Pion blanc');
  await page.reload();
  await expect(page.locator('[data-piece="e4"]')).toHaveAttribute('aria-label', 'Pion blanc');
  await expect(page.getByRole('status')).toHaveText('Au tour des Noirs');
});
