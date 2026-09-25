import { expect, test } from '@playwright/test';
import { play } from './helpers';

test('fonctionne hors ligne après le premier chargement, ordinateur compris', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Échecs & Dames' })).toBeVisible();
  await page.getByRole('button', { name: /Échecs/ }).click();
  await page.getByRole('button', { name: 'Moyen' }).click();
  await page.getByRole('button', { name: 'Blancs' }).click();
  await page.getByRole('button', { name: 'Jouer', exact: true }).click();
  await play(page, 'e2', 'e4');
  await expect(page.getByText("L'ordinateur réfléchit…")).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('À toi de jouer', { timeout: 30_000 });
});
