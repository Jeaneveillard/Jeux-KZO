import { describe, expect, it } from 'vitest';
import { isOneOf, isRecord } from '../../../src/core/guards';
import { opposite } from '../../../src/core/types';

describe('guards', () => {
  it('reconnaît un objet simple', () => {
    expect(isRecord({ a: 1 })).toBe(true);
    expect(isRecord(null)).toBe(false);
    expect(isRecord([1])).toBe(false);
    expect(isRecord('x')).toBe(false);
  });

  it('vérifie une valeur dans une liste', () => {
    expect(isOneOf('b', ['a', 'b'] as const)).toBe(true);
    expect(isOneOf('z', ['a', 'b'] as const)).toBe(false);
    expect(isOneOf(3, ['a'] as const)).toBe(false);
  });

  it('donne la couleur opposée', () => {
    expect(opposite('white')).toBe('black');
    expect(opposite('black')).toBe('white');
  });
});
