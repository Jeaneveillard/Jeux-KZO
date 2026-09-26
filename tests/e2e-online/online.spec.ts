import { devices, expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { play } from '../e2e/helpers';

interface Phone {
  readonly page: Page;
  readonly context: BrowserContext;
}

async function phone(browser: Browser): Promise<Phone> {
  const context = await browser.newContext({ ...devices['Pixel 7'], baseURL: 'http://localhost:4174' });
  return { context, page: await context.newPage() };
}

async function choosePseudo(page: Page, pseudo: string, button: string): Promise<void> {
  await page.getByLabel('Ton pseudo').fill(pseudo);
  await page.getByRole('button', { name: button }).click();
}

test('deux amis jouent une partie complète, coupure réseau comprise', async ({ browser }) => {
  const alice = await phone(browser);
  const bob = await phone(browser);

  // Alice crée une partie avec les Blancs et récupère le code.
  await alice.page.goto('/#/echecs/en-ligne');
  await choosePseudo(alice.page, 'Alice', 'Continuer');
  await alice.page.getByRole('button', { name: 'Blancs' }).click();
  await alice.page.getByRole('button', { name: 'Créer la partie' }).click();
  await expect(alice.page.getByRole('status')).toHaveText('En attente de ton ami…');
  const code = ((await alice.page.locator('.invite-code').textContent()) ?? '').trim();
  expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);

  // Bob ouvre le lien d'invitation ; Alice passe directement dans la partie.
  await bob.page.goto(`/#/rejoindre/${code}`);
  await choosePseudo(bob.page, 'Bob', 'Rejoindre la partie');
  await expect(bob.page.getByRole('status')).toHaveText(/^C'est à Alice de jouer/);
  await expect(alice.page.getByRole('status')).toHaveText('À toi de jouer');
  await expect(alice.page.getByRole('img', { name: 'Bob est en ligne' })).toBeVisible();
  await expect(bob.page.getByRole('img', { name: 'Alice est en ligne' })).toBeVisible();

  // Les coups arrivent en direct.
  await play(alice.page, 'e2', 'e4');
  await expect(bob.page.locator('[data-piece="e4"]')).toHaveAttribute('aria-label', 'Pion blanc');
  await play(bob.page, 'e7', 'e5');
  await expect(alice.page.getByRole('status')).toHaveText('À toi de jouer');

  // Coupure réseau de Bob : le coup d'Alice l'attend à son retour.
  await bob.context.setOffline(true);
  await expect(bob.page.getByRole('status')).toHaveText('Connexion perdue, reconnexion…');
  await play(alice.page, 'g1', 'f3');
  await bob.context.setOffline(false);
  await expect(bob.page.locator('[data-piece="f3"]')).toHaveAttribute('aria-label', 'Cavalier blanc');
  await expect(bob.page.getByRole('status')).toHaveText('À toi de jouer');

  // Nulle refusée, puis proposée par Bob et acceptée par Alice.
  await play(bob.page, 'b8', 'c6');
  await expect(alice.page.getByRole('status')).toHaveText('À toi de jouer');
  await alice.page.getByRole('button', { name: 'Proposer la nulle' }).click();
  await bob.page.getByRole('button', { name: 'Refuser' }).click();
  await expect(alice.page.getByText(/Nulle proposée/)).toBeHidden();
  await bob.page.getByRole('button', { name: 'Proposer la nulle' }).click();
  await alice.page.getByRole('button', { name: 'Accepter' }).click();
  await expect(alice.page.getByRole('dialog', { name: 'Partie nulle' })).toBeVisible();
  await expect(bob.page.getByRole('dialog', { name: 'Partie nulle' })).toBeVisible();

  // Revanche : couleurs inversées, les deux arrivent sur la même partie.
  await alice.page.getByRole('button', { name: 'Revanche' }).click();
  await expect(alice.page.getByRole('status')).toHaveText(/^C'est à Bob de jouer/);
  await expect(bob.page.getByText('Alice lance une revanche !')).toBeVisible();
  await bob.page.getByRole('button', { name: 'Jouer la revanche' }).click();
  await expect(bob.page.getByRole('status')).toHaveText('À toi de jouer');
  await play(bob.page, 'd2', 'd4');
  await expect(alice.page.locator('[data-piece="d4"]')).toHaveAttribute('aria-label', 'Pion blanc');
  await expect(alice.page.getByRole('status')).toHaveText('À toi de jouer');

  await alice.context.close();
  await bob.context.close();
});
