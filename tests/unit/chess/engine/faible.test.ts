import { describe, expect, it } from 'vitest';
import { parseChess } from '../../../../src/chess/adapter';
import { movesKeepingQueen, pickFaibleMove } from '../../../../src/chess/engine/faible';
import type { UciInfo } from '../../../../src/chess/engine/uci';

const line = (move: string, multipv: number): UciInfo => ({ depth: 5, multipv, scoreCp: 0, pv: [move] });
const lines = [line('e2e4', 1), line('d2d4', 2), line('g1f3', 3), line('c2c4', 4)];
const sequence = (...values: number[]) => {
  let index = 0;
  return () => values[index++ % values.length];
};

describe('niveau Faible', () => {
  it('joue parfois un coup au hasard parmi les coups sûrs', () => {
    expect(pickFaibleMove(lines, ['a2a3', 'h2h3'], sequence(0.05, 0.5))).toBe('h2h3');
  });

  it('joue le meilleur coup environ une fois sur deux', () => {
    expect(pickFaibleMove(lines, ['a2a3'], sequence(0.3))).toBe('e2e4');
  });

  it('joue sinon une des variantes suivantes', () => {
    expect(pickFaibleMove(lines, ['a2a3'], sequence(0.8, 0))).toBe('d2d4');
    expect(pickFaibleMove(lines, ['a2a3'], sequence(0.8, 0.99))).toBe('c2c4');
  });

  it('se rabat sur le meilleur coup sans coup sûr ni variante', () => {
    expect(pickFaibleMove(lines, [], sequence(0.05))).toBe('e2e4');
    expect(pickFaibleMove([line('e2e4', 1)], [], sequence(0.9))).toBe('e2e4');
    expect(pickFaibleMove([], [], sequence(0.9))).toBeNull();
  });

  it('écarte les coups qui laissent prendre la dame', () => {
    const safe = movesKeepingQueen(parseChess('4k3/8/8/3p4/8/3Q4/8/4K3 w - - 0 1'));
    expect(safe).not.toContain('d3c4');
    expect(safe).not.toContain('d3e4');
    expect(safe).toContain('d3d4');
    expect(safe).toContain('d3d5');
    expect(safe).toContain('e1f2');
  });
});
