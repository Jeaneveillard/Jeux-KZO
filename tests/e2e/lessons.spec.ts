import { expect, test } from '@playwright/test';
import { openChess, play } from './helpers';

test('suivre la première leçon jusqu’au bout', async ({ page }) => {
  await openChess(page);
  await page.getByRole('button', { name: /Apprendre à jouer/ }).click();
  await page.getByRole('button', { name: /1\. Le plateau et le but du jeu/ }).click();
  await page.getByRole('button', { name: 'Commencer' }).click();
  await play(page, 'e1', 'e8');
  await expect(page.getByText('Bravo, exercice réussi !')).toBeVisible();
  await page.getByRole('button', { name: 'Terminer la leçon' }).click();
  await expect(page.getByText('Leçon terminée ! 🎉')).toBeVisible();
  await page.getByRole('button', { name: 'Retour aux leçons' }).click();
  await expect(page.getByText('1 / 17 leçons terminées')).toBeVisible();
});
