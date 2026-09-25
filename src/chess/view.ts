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

const PROMOTABLE: readonly PieceType[] = ['q', 'r', 'b', 'n'];

/** Pièces perdues par chaque camp par rapport à la position de départ, de la plus forte à la plus faible.
 * Un pion promu n'est pas compté comme capturé : les pièces excédentaires de son type de promotion
 * (par rapport au nombre de départ) sont considérées comme la trace de sa promotion, pas d'une prise. */
export function capturedPieces(pos: ChessPos): Readonly<Record<Color, readonly PieceType[]>> {
  const pieces = listPieces(pos);
  const countOnBoard = (color: Color, type: PieceType): number =>
    pieces.filter((piece) => piece.color === color && piece.type === type).length;

  const lost = (color: Color): PieceType[] => {
    const promotions = PROMOTABLE.reduce(
      (total, type) => total + Math.max(0, countOnBoard(color, type) - START_COUNT[type]),
      0,
    );
    return STRONGEST_FIRST.flatMap((type) => {
      const onBoard = countOnBoard(color, type);
      const missing =
        type === 'p'
          ? Math.max(0, START_COUNT.p - onBoard - promotions)
          : Math.max(0, START_COUNT[type] - onBoard);
      return Array.from({ length: missing }, () => type);
    });
  };
  return { white: lost('white'), black: lost('black') };
}
