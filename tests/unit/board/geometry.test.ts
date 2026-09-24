import { describe, expect, it } from 'vitest';
import { chessGeometry, pointToCell } from '../../../src/board/geometry';

describe('géométrie du plateau', () => {
  it('place a8 en haut à gauche vu des Blancs', () => {
    const g = chessGeometry('white');
    expect(g.squareAt({ row: 0, col: 0 })).toBe('a8');
    expect(g.squareAt({ row: 7, col: 7 })).toBe('h1');
    expect(g.cellOf('e2')).toEqual({ row: 6, col: 4 });
    expect(g.isDark({ row: 7, col: 0 })).toBe(true);
    expect(g.isDark({ row: 0, col: 0 })).toBe(false);
    expect(g.edgeLabels?.bottom(0)).toBe('a');
    expect(g.edgeLabels?.left(0)).toBe('8');
  });

  it('retourne le plateau vu des Noirs', () => {
    const g = chessGeometry('black');
    expect(g.squareAt({ row: 0, col: 0 })).toBe('h1');
    expect(g.cellOf('e2')).toEqual({ row: 1, col: 3 });
    expect(g.edgeLabels?.bottom(0)).toBe('h');
    expect(g.edgeLabels?.left(0)).toBe('1');
  });

  it('refuse les cases hors plateau', () => {
    const g = chessGeometry('white');
    expect(g.squareAt({ row: 8, col: 0 })).toBeNull();
    expect(() => g.cellOf('z9')).toThrow('Case inconnue : z9');
  });

  it('convertit un point écran en case', () => {
    const rect = { left: 10, top: 20, width: 800, height: 800 };
    expect(pointToCell(10, 20, rect, 8)).toEqual({ row: 0, col: 0 });
    expect(pointToCell(809, 819, rect, 8)).toEqual({ row: 7, col: 7 });
    expect(pointToCell(5, 20, rect, 8)).toBeNull();
    expect(pointToCell(50, 50, { left: 0, top: 0, width: 0, height: 0 }, 8)).toBeNull();
  });
});
