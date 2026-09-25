import { expect, test } from '@playwright/test';
import { openChess, play } from './helpers';

test('contre l’ordinateur en Faible : réponse, indice et annulation', async ({ page }) => {
  await openChess(page);
  await page.getByRole('button', { name: 'Faible' }).click();
  await page.getByRole('button', { name: 'Blancs' }).click();
  await page.getByRole('button', { name: 'Jouer', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('À toi de jouer');
  await play(page, 'e2', 'e4');
  await expect(page.getByText("L'ordinateur réfléchit…")).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('À toi de jouer', { timeout: 30_000 });
  await page.getByRole('button', { name: 'Indice' }).click();
  await expect(page.locator('line.arrow')).toHaveCount(1);
  await expect(page.getByText(/💡/)).toBeVisible();
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(page.locator('[data-piece="e2"]')).toHaveAttribute('aria-label', 'Pion blanc');
});

test('alerte avant une gaffe au niveau Faible', async ({ page }) => {
  const record = {
    setup: { game: 'chess', mode: 'ai', level: 'faible', playerColor: 'white' },
    start: '4k3/8/8/3p4/8/3Q4/8/4K3 w - - 0 1',
    moves: [],
  };
  await page.addInitScript((value) => window.localStorage.setItem('jeux.echecs.partie', value), JSON.stringify(record));
  await page.goto('/#/echecs/reprendre');
  await play(page, 'd3', 'c4');
  const dialog = page.getByRole('dialog', { name: 'Attention !' });
  await expect(dialog).toContainText('ta dame en c4 peut être prise gratuitement par le pion en d5', { timeout: 30_000 });
  await dialog.getByRole('button', { name: 'Choisir un autre coup' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('[data-piece="d3"]')).toHaveAttribute('aria-label', 'Dame blanche');
});

test('Expert répond en quelques secondes', async ({ page }) => {
  await openChess(page);
  await page.getByRole('button', { name: 'Expert' }).click();
  await page.getByRole('button', { name: 'Noirs' }).click();
  await page.getByRole('button', { name: 'Jouer', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('À toi de jouer', { timeout: 30_000 });
  await expect(page.locator('.hl-last')).toHaveCount(2);
});
