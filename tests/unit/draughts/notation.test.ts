import { describe, expect, it } from 'vitest';
import { START_FEN, parseFen, toFen } from '../../../src/draughts/notation';

describe('notation FEN des dames', () => {
  it('lit la position de départ', () => {
    const { board, turn } = parseFen(START_FEN);
    expect(board).toBe('b'.repeat(20) + '.'.repeat(10) + 'w'.repeat(20));
    expect(turn).toBe('white');
  });

  it('lit les dames, les listes et le trait aux Noirs', () => {
    const { board, turn } = parseFen('B:WK46,31:BK5,19.');
    expect(turn).toBe('black');
    expect(board[45]).toBe('W');
    expect(board[30]).toBe('w');
    expect(board[4]).toBe('B');
    expect(board[18]).toBe('b');
  });

  it('écrit une position relisible', () => {
    const fen = 'W:W31,K46:B1,K50';
    expect(toFen(parseFen(fen).board, 'white')).toBe(fen);
    expect(parseFen('W:W:B').board).toBe('.'.repeat(50));
  });

  it.each(['X:W1:B2', 'W:W31', 'W:W51:B1', 'W:W31,31:B1', 'W:W3:B20', 'W:W31:B48', 'W:Wx:B1', 'W:W35-31:B1'])('refuse « %s »', (fen) => {
    expect(() => parseFen(fen)).toThrow('Position invalide');
  });
});
