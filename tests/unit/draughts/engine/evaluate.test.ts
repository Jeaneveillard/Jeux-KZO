import { describe, expect, it } from 'vitest';
import { KING_VALUE, evaluate } from '../../../../src/draughts/engine/evaluate';
import { toCells } from '../../../../src/draughts/movegen';
import { START_FEN, parseFen } from '../../../../src/draughts/notation';

const cellsOf = (fen: string) => toCells(parseFen(fen).board);

describe('évaluation des dames', () => {
  it('trouve la position de départ équilibrée', () => {
    expect(Math.abs(evaluate(cellsOf(START_FEN), 1))).toBe(0);
  });

  it('note du point de vue du camp au trait', () => {
    const cells = cellsOf('W:W31,32,33:B19');
    expect(evaluate(cells, -1)).toBe(-evaluate(cells, 1));
    expect(evaluate(cells, 1)).toBeGreaterThan(150);
  });

  it('compte un pion de plus et une dame comme environ trois pions', () => {
    const withExtra = evaluate(cellsOf('W:W31,32:B19,20'), 1);
    const without = evaluate(cellsOf('W:W31:B19,20'), 1);
    expect(withExtra - without).toBeGreaterThan(80);
    expect(evaluate(cellsOf('W:WK46:B'), 1)).toBeGreaterThanOrEqual(KING_VALUE);
  });

  it('récompense un pion qui file vers la dame', () => {
    expect(evaluate(cellsOf('W:W6:B45'), 1)).toBeGreaterThan(evaluate(cellsOf('W:W36:B45'), 1));
  });
});
