import { describe, expect, it } from 'vitest';
import { applyRawMove, destination, fromCells, generateMoves, rawMoveId, toCells, type Cells, type Side } from '../../../src/draughts/movegen';
import { START_FEN, parseFen } from '../../../src/draughts/notation';

function setup(fen: string): { cells: Cells; side: Side } {
  const { board, turn } = parseFen(fen);
  return { cells: toCells(board), side: turn === 'white' ? 1 : -1 };
}

function ids(fen: string): string[] {
  const { cells, side } = setup(fen);
  return generateMoves(cells, side).map(rawMoveId).sort();
}

function perft(cells: Cells, side: Side, depth: number): number {
  const moves = generateMoves(cells, side);
  if (depth === 1) return moves.length;
  let total = 0;
  for (const move of moves) {
    const next = cells.slice();
    applyRawMove(next, move);
    total += perft(next, side === 1 ? -1 : 1, depth - 1);
  }
  return total;
}

describe('génération des coups (règles FMJD)', () => {
  it('fait avancer les pions d’une case vers l’avant', () => {
    expect(ids('W:W32:B')).toEqual(['32-27', '32-28']);
    expect(ids('B:W:B19')).toEqual(['19-23', '19-24']);
  });

  it('fait voler la dame sur toute la diagonale', () => {
    expect(ids('W:WK46:B')).toHaveLength(9);
  });

  it('rend la prise obligatoire', () => {
    expect(ids('W:W32,46:B28')).toEqual(['32x23']);
  });

  it('laisse le pion prendre en arrière', () => {
    expect(ids('W:W23:B28')).toEqual(['23x32']);
  });

  it('impose la prise du plus grand nombre de pièces', () => {
    expect(ids('W:W32,36:B28,19,31')).toEqual(['32x23x14']);
  });

  it('laisse la dame s’arrêter où elle veut après la pièce prise', () => {
    expect(ids('W:WK46:B28')).toEqual(['46x10', '46x14', '46x19', '46x23', '46x5']);
  });

  it('oblige la dame à choisir une case d’où la rafle continue', () => {
    expect(ids('W:WK46:B28,13')).toEqual(['46x19x2', '46x19x8']);
  });

  it('ne saute jamais deux fois la même pièce (coup turc)', () => {
    const moves = ids('W:WK23:B28,19');
    expect(moves).toHaveLength(7);
    expect(moves.every((id) => id.split('x').length === 2)).toBe(true);
  });

  it('fusionne deux trajets qui prennent les mêmes pièces', () => {
    const { cells, side } = setup('W:W28:B12,13,22,23');
    const moves = generateMoves(cells, side);
    expect(moves).toHaveLength(1);
    expect(moves[0].captures).toHaveLength(4);
    expect(destination(moves[0])).toBe(28);
  });

  it('ne fait dame qu’en fin de coup', () => {
    const passing = setup('W:W13:B9,10');
    const [rafle] = generateMoves(passing.cells, passing.side);
    expect(rawMoveId(rafle)).toBe('13x4x15');
    applyRawMove(passing.cells, rafle);
    expect(fromCells(passing.cells)[14]).toBe('w');
    expect(fromCells(passing.cells)[8]).toBe('.');
    expect(fromCells(passing.cells)[9]).toBe('.');
    const ending = setup('W:W7:B');
    applyRawMove(ending.cells, generateMoves(ending.cells, ending.side)[0]);
    expect(fromCells(ending.cells)[0]).toBe('W');
  });

  it('refuse un plateau mal formé', () => {
    expect(() => toCells('x')).toThrow('Plateau invalide');
    expect(() => toCells('?'.repeat(50))).toThrow('Plateau invalide');
  });

  it.each([
    [1, 9],
    [2, 81],
    [3, 658],
    [4, 4265],
    [5, 27117],
    [6, 167140],
  ])('perft %i = %i depuis la position de départ', (depth, expected) => {
    const { cells, side } = setup(START_FEN);
    expect(perft(cells, side, depth)).toBe(expected);
  }, 60_000);
});
