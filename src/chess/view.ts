import type { BoardPiece } from '../board/Board';
import type { Color } from '../core/types';
import { listPieces } from './adapter';
import { pieceLabel } from './names';
import { pieceImage } from './pieces';
import type { ChessPos, PieceType } from './types';

const START_COUNT: Readonly<Record<PieceType, number>> = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };
const STRONGEST_FIRST: readonly PieceType[] = ['q', 'r', 'b', 'n', 'p'];

export function chessBoardPieces(pos: ChessPos): BoardPiece[] {
  return listPieces(pos).map((piece) => ({
    square: piece.square,
    image: pieceImage(piece.color, piece.type),
    label: pieceLabel(piece.color, piece.type),
  }));
}

/** Pièces perdues par chaque camp par rapport à la position de départ, de la plus forte à la plus faible. */
export function capturedPieces(pos: ChessPos): Readonly<Record<Color, readonly PieceType[]>> {
  const pieces = listPieces(pos);
  const lost = (color: Color): PieceType[] =>
    STRONGEST_FIRST.flatMap((type) => {
      const onBoard = pieces.filter((piece) => piece.color === color && piece.type === type).length;
      return Array.from({ length: Math.max(0, START_COUNT[type] - onBoard) }, () => type);
    });
  return { white: lost('white'), black: lost('black') };
}
