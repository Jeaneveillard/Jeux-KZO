import { expect, test, type Page } from '@playwright/test';
import { play } from './helpers';

async function openDraughts(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /Dames/ }).click();
}

test('dames : suivre la première leçon', async ({ page }) => {
  await openDraughts(page);
  await page.getByRole('button', { name: /Apprendre à jouer/ }).click();
  await page.getByRole('button', { name: /1\. Le plateau et les cases foncées/ }).click();
  await page.getByRole('button', { name: 'Commencer' }).click();
  await play(page, '32', '28');
  await expect(page.getByText('Bravo, exercice réussi !')).toBeVisible();
});

test('dames à deux : une prise obligatoire, puis la reprise après rechargement', async ({ page }) => {
  await openDraughts(page);
  await page.getByRole('button', { name: /2 joueurs sur ce téléphone/ }).click();
  await play(page, '32', '28');
  await play(page, '19', '23');
  await play(page, '28', '19');
  await expect(page.locator('[data-piece="19"]')).toHaveAttribute('aria-label', 'Pion blanc');
  await expect(page.locator('[data-piece="23"]')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('[data-piece="19"]')).toHaveAttribute('aria-label', 'Pion blanc');
  await expect(page.getByRole('status')).toHaveText('Au tour des Noirs');
});

test('dames contre l’ordinateur en Faible : réponse et indice', async ({ page }) => {
  await openDraughts(page);
  await page.getByRole('button', { name: 'Faible' }).click();
  await page.getByRole('button', { name: 'Blancs' }).click();
  await page.getByRole('button', { name: 'Jouer', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('À toi de jouer');
  await play(page, '32', '28');
  await expect(page.getByRole('status')).toHaveText('À toi de jouer', { timeout: 30_000 });
  await expect(page.locator('[data-piece]')).toHaveCount(40);
  await page.getByRole('button', { name: 'Indice' }).click();
  await expect(page.locator('line.arrow')).toHaveCount(1);
  await expect(page.getByText(/💡/)).toBeVisible();
});
