import { describe, expect, it } from 'vitest';
import { draughtsGeometry } from '../../../src/draughts/geometry';

describe('plateau de dames', () => {
  it('numérote les cases foncées vues des Blancs', () => {
    const geometry = draughtsGeometry('white');
    expect(geometry.size).toBe(10);
    expect(geometry.squareAt({ row: 0, col: 1 })).toBe('1');
    expect(geometry.squareAt({ row: 9, col: 0 })).toBe('46');
    expect(geometry.squareAt({ row: 0, col: 0 })).toBeNull();
    expect(geometry.cellOf('32')).toEqual({ row: 6, col: 3 });
    expect(geometry.isDark({ row: 0, col: 1 })).toBe(true);
    expect(geometry.numbered).toBe(true);
  });

  it('retourne le plateau pour les Noirs', () => {
    const geometry = draughtsGeometry('black');
    expect(geometry.squareAt({ row: 0, col: 1 })).toBe('50');
    expect(geometry.cellOf('1')).toEqual({ row: 9, col: 8 });
  });

  it('refuse une case inconnue', () => {
    const geometry = draughtsGeometry('white');
    expect(() => geometry.cellOf('51')).toThrow('Case inconnue');
    expect(() => geometry.cellOf('e4')).toThrow('Case inconnue');
    expect(() => geometry.cellOf('07')).toThrow('Case inconnue');
  });
});
