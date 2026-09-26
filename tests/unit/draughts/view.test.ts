import { describe, expect, it } from 'vitest';
import { draughtsPieceImage, draughtsPieceLabel } from '../../../src/draughts/pieces';
import type { DraughtsPos } from '../../../src/draughts/types';
import { draughtsBoardPieces, listDraughtsPieces, lostPieceCounts } from '../../../src/draughts/view';

const board = (pieces: Readonly<Record<number, string>>) => Array.from({ length: 50 }, (_, index) => pieces[index + 1] ?? '.').join('');
const pos = (value: string): DraughtsPos => ({ board: value, turn: 'white', keys: [], kingPlies: 0, endgame: null });

describe('pièces de dames', () => {
  it('liste les pièces du plateau', () => {
    expect(listDraughtsPieces(board({ 1: 'b', 28: 'W' }))).toEqual([
      { square: '1', color: 'black', kind: 'man' },
      { square: '28', color: 'white', kind: 'king' },
    ]);
  });

  it('prépare les pièces pour le plateau', () => {
    expect(draughtsBoardPieces(pos(board({ 46: 'w' })))).toEqual([{ square: '46', image: draughtsPieceImage('white', 'man'), label: 'Pion blanc' }]);
  });

  it('compte les pièces perdues', () => {
    expect(lostPieceCounts(pos(board({ 1: 'b', 2: 'b', 46: 'W' })))).toEqual({ white: 19, black: 18 });
  });

  it('nomme et dessine chaque pièce', () => {
    expect(draughtsPieceLabel('black', 'king')).toBe('Dame noire');
    expect(draughtsPieceLabel('white', 'king')).toBe('Dame blanche');
    expect(draughtsPieceLabel('black', 'man')).toBe('Pion noir');
    expect(draughtsPieceImage('white', 'king')).not.toBe(draughtsPieceImage('white', 'man'));
  });
});
