import { describe, expect, it } from 'vitest';
import { withKit } from '../../../src/app/games';
import { chessKit } from '../../../src/app/games/chess';
import { draughtsKit } from '../../../src/app/games/draughts';
import { parseChess } from '../../../src/chess/adapter';
import { parseDraughts } from '../../../src/draughts/rules';

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

  it('décrit les dames pour les écrans communs', () => {
    const start = draughtsKit.adapter.initial();
    const pos = parseDraughts('W:W32:B28');
    const [capture] = draughtsKit.adapter.legalMoves(pos);
    expect(draughtsKit.boardPieces(start)).toHaveLength(40);
    expect(draughtsKit.geometry('white').size).toBe(10);
    expect(draughtsKit.checkSquare(start)).toBeNull();
    expect(draughtsKit.moveSound(pos, capture)).toBe('capture');
    expect(draughtsKit.moveSound(start, draughtsKit.adapter.legalMoves(start)[0])).toBe('move');
    expect(draughtsKit.capturedPieces(pos).white).toHaveLength(19);
    expect(draughtsKit.capturedPieces(pos).black[0]).toEqual({ image: expect.any(String), label: 'Pion noir' });
    expect(draughtsKit.lessons).toHaveLength(12);
    expect(draughtsKit.codec.decode('32x23', pos)).toMatchObject({ captures: ['28'] });
    expect(draughtsKit.explainResult({ kind: 'draw', reason: 'king-moves' }, null).title).toBe('Partie nulle');
  });

  it('donne le kit du jeu demandé', () => {
    expect(withKit('chess', (kit) => kit.title)).toBe('Échecs');
    expect(withKit('draughts', (kit) => kit.title)).toBe('Dames');
  });
});
