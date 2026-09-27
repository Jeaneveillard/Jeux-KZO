import { expect, test, type Page } from '@playwright/test';

async function boxes(page: Page) {
  const board = await page.locator('.board').boundingBox();
  const status = await page.getByRole('status').first().boundingBox();
  if (!board || !status) throw new Error('plateau ou état introuvable');
  return { board, status };
}

test.describe('sur ordinateur', () => {
  test.use({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 });

  test('le plateau remplit la hauteur et les informations sont à côté', async ({ page }) => {
    await page.goto('/#/echecs/partie/deux-joueurs');
    const { board, status } = await boxes(page);
    expect(board.width).toBeGreaterThan(640);
    expect(board.y + board.height).toBeLessThanOrEqual(900);
    expect(status.x).toBeGreaterThan(board.x + board.width);
  });

  test('les leçons de dames aussi', async ({ page }) => {
    await page.goto('/#/dames/lecons');
    await page.getByRole('list').getByRole('button').first().click();
    await page.getByRole('button', { name: 'Commencer' }).click();
    const board = await page.locator('.board').boundingBox();
    const instruction = await page.locator('.game-info .card').boundingBox();
    if (!board || !instruction) throw new Error('plateau ou consigne introuvable');
    expect(board.width).toBeGreaterThan(640);
    expect(instruction.x).toBeGreaterThan(board.x + board.width);
  });
});

test('sur téléphone, les informations restent sous le plateau', async ({ page }) => {
  await page.goto('/#/echecs/partie/deux-joueurs');
  const { board, status } = await boxes(page);
  expect(status.y).toBeGreaterThan(board.y + board.height);
  expect(board.width).toBeLessThanOrEqual(page.viewportSize()?.width ?? 0);
});
