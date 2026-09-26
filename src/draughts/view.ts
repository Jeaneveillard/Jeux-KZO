import type { BoardPiece } from '../board/Board';
import type { Color } from '../core/types';
import { draughtsPieceImage, draughtsPieceLabel } from './pieces';
import type { DraughtsPiece, DraughtsPieceKind, DraughtsPos } from './types';

export const PIECES_PER_SIDE = 20;

const PIECE_CODES: ReadonlyMap<string, { readonly color: Color; readonly kind: DraughtsPieceKind }> = new Map([
  ['w', { color: 'white', kind: 'man' }],
  ['W', { color: 'white', kind: 'king' }],
  ['b', { color: 'black', kind: 'man' }],
  ['B', { color: 'black', kind: 'king' }],
]);

export function listDraughtsPieces(board: string): DraughtsPiece[] {
  return [...board].flatMap((char, index) => {
    const piece = PIECE_CODES.get(char);
    return piece ? [{ square: String(index + 1), ...piece }] : [];
  });
}

export function draughtsBoardPieces(pos: DraughtsPos): BoardPiece[] {
  return listDraughtsPieces(pos.board).map((piece) => ({
    square: piece.square,
    image: draughtsPieceImage(piece.color, piece.kind),
    label: draughtsPieceLabel(piece.color, piece.kind),
  }));
}

/** Pièces perdues par chaque camp depuis le départ (une dame perdue compte comme une pièce). */
export function lostPieceCounts(pos: DraughtsPos): Readonly<Record<Color, number>> {
  const pieces = listDraughtsPieces(pos.board);
  const remaining = (color: Color) => pieces.filter((piece) => piece.color === color).length;
  return {
    white: Math.max(0, PIECES_PER_SIDE - remaining('white')),
    black: Math.max(0, PIECES_PER_SIDE - remaining('black')),
  };
}
