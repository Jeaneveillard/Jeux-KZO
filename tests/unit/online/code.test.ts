import { describe, expect, it } from 'vitest';
import { CODE_ALPHABET, inviteLink, normalizeCode } from '../../../src/online/code';

describe('codes de partie', () => {
  it('utilise 32 caractères sans O, 0, I ni 1', () => {
    expect(CODE_ALPHABET).toHaveLength(32);
    expect(CODE_ALPHABET).not.toMatch(/[O0I1]/);
  });

  it('normalise un code tapé à la main', () => {
    expect(normalizeCode('k7m2qx')).toBe('K7M2QX');
    expect(normalizeCode(' K7M 2QX ')).toBe('K7M2QX');
    expect(normalizeCode('K7M-2QX')).toBe('K7M2QX');
  });

  it('refuse un code mal formé', () => {
    expect(normalizeCode('K7M2Q')).toBeNull();
    expect(normalizeCode('K7M2QXA')).toBeNull();
    expect(normalizeCode('K7M2Q0')).toBeNull();
    expect(normalizeCode('')).toBeNull();
  });

  it('fabrique le lien d’invitation', () => {
    expect(inviteLink('https://jeaneveillard.github.io/Jeux-KZO/', 'K7M2QX')).toBe('https://jeaneveillard.github.io/Jeux-KZO/#/rejoindre/K7M2QX');
    expect(inviteLink('http://localhost:5173/#/echecs', 'K7M2QX')).toBe('http://localhost:5173/#/rejoindre/K7M2QX');
  });
});
