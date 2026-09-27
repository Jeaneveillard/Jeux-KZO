import { afterEach, describe, expect, it, vi } from 'vitest';
import { shareInvite } from '../../../../src/app/online/share';

const nav = navigator as { share?: unknown; clipboard?: unknown };

afterEach(() => {
  delete nav.share;
  delete nav.clipboard;
});

describe('partage du lien', () => {
  it('ouvre le menu de partage du téléphone', async () => {
    nav.share = vi.fn(async () => undefined);
    expect(await shareInvite('https://x/#/rejoindre/K7M2QX', 'Échecs')).toBe('shared');
  });

  it('copie le lien sans menu de partage', async () => {
    const writeText = vi.fn(async () => undefined);
    nav.clipboard = { writeText };
    expect(await shareInvite('https://x/#/rejoindre/K7M2QX', 'Échecs')).toBe('copied');
    expect(writeText).toHaveBeenCalledWith('https://x/#/rejoindre/K7M2QX');
  });

  it('distingue un partage annulé d’un échec', async () => {
    nav.share = vi.fn(async () => {
      throw new DOMException('annulé', 'AbortError');
    });
    expect(await shareInvite('u', 't')).toBe('cancelled');
    nav.share = vi.fn(async () => {
      throw new Error('refusé');
    });
    expect(await shareInvite('u', 't')).toBe('failed');
  });
});
