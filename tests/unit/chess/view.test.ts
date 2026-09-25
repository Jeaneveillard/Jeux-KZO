import { describe, expect, it } from 'vitest';
import { chessAdapter, fromUci, parseChess, play } from '../../../src/chess/adapter';
import { capturedPieces, chessBoardPieces } from '../../../src/chess/view';

describe('vue des échecs', () => {
  it('donne 32 pièces avec image et libellé', () => {
    const pieces = chessBoardPieces(chessAdapter.initial());
    expect(pieces).toHaveLength(32);
    expect(pieces.find((p) => p.square === 'g1')).toMatchObject({ label: 'Cavalier blanc' });
    expect(pieces.find((p) => p.square === 'g1')?.image).toContain('wN');
  });

  it('liste les pièces capturées de chaque camp', () => {
    expect(capturedPieces(chessAdapter.initial())).toEqual({ white: [], black: [] });
    const pos = ['e2e4', 'd7d5', 'e4d5', 'd8d5'].reduce((p, m) => play(p, fromUci(m)), chessAdapter.initial());
    expect(capturedPieces(pos)).toEqual({ white: ['p'], black: ['p'] });
  });

  it('ne compte pas un pion promu comme une pièce capturée', () => {
    const pos = parseChess('rnbqkbnr/pppppppp/8/8/8/8/1PPPPPPP/RNBQKBNQ w - - 0 1');
    expect(capturedPieces(pos).white).toEqual(['r']);
    expect(capturedPieces(pos).black).toEqual([]);
  });
});
