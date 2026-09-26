import { describe, expect, it } from 'vitest';
import { withKit } from '../../../src/app/games';
import { chessKit } from '../../../src/app/games/chess';
import { parseChess } from '../../../src/chess/adapter';

describe('kits de jeu', () => {
  it('décrit les échecs pour les écrans communs', () => {
    const pos = parseChess('rnbqkbnr/ppp1pppp/8/8/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1');
    expect(chessKit.capturedPieces(pos).black).toEqual([{ image: expect.any(String), label: 'Pion noir' }]);
    expect(chessKit.checkSquare(chessKit.adapter.initial())).toBeNull();
    expect(chessKit.moveSound(chessKit.adapter.initial(), { from: 'e2', to: 'e4' })).toBe('move');
    expect(chessKit.lessons).toHaveLength(17);
    expect(chessKit.geometry('white').size).toBe(8);
    expect(chessKit.explainResult({ kind: 'ongoing' }, null).title).toBe('Partie en cours');
  });

  it('donne le kit du jeu demandé', () => {
    expect(withKit('chess', (kit) => kit.title)).toBe('Échecs');
    expect(withKit('draughts', (kit) => kit.title)).toBeNull();
  });
});
