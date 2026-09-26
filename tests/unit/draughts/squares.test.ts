import { describe, expect, it } from 'vitest';
import { RAYS, colOf, isForward, promotionRow, rowOf, squareAt } from '../../../src/draughts/squares';

describe('cases des dames', () => {
  it('place les 50 cases foncées', () => {
    expect([rowOf(1), colOf(1)]).toEqual([0, 1]);
    expect([rowOf(6), colOf(6)]).toEqual([1, 0]);
    expect([rowOf(46), colOf(46)]).toEqual([9, 0]);
    expect([rowOf(50), colOf(50)]).toEqual([9, 8]);
    for (let square = 1; square <= 50; square += 1) expect(squareAt(rowOf(square), colOf(square))).toBe(square);
    expect(squareAt(0, 0)).toBeNull();
    expect(squareAt(-1, 1)).toBeNull();
    expect(squareAt(10, 1)).toBeNull();
  });

  it('suit les diagonales', () => {
    expect(RAYS[32]).toEqual([[27, 21, 16], [28, 23, 19, 14, 10, 5], [37, 41, 46], [38, 43, 49]]);
    expect(RAYS[46][1]).toEqual([41, 37, 32, 28, 23, 19, 14, 10, 5]);
    expect(RAYS[5][0]).toEqual([]);
  });

  it('sait où est l’avant et où l’on devient dame', () => {
    expect(isForward(0, 1)).toBe(true);
    expect(isForward(2, 1)).toBe(false);
    expect(isForward(3, -1)).toBe(true);
    expect(isForward(1, -1)).toBe(false);
    expect(promotionRow(1)).toBe(0);
    expect(promotionRow(-1)).toBe(9);
  });
});
