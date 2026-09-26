import type { BoardGeometry } from '../board/geometry';
import type { Color } from '../core/types';
import { BOARD_SIZE, SQUARE_COUNT, colOf, rowOf, squareAt } from './squares';

const LAST = BOARD_SIZE - 1;

export function draughtsGeometry(orientation: Color): BoardGeometry {
  const flipped = orientation === 'black';
  return {
    size: BOARD_SIZE,
    squareAt: ({ row, col }) => {
      const square = flipped ? squareAt(LAST - row, LAST - col) : squareAt(row, col);
      return square === null ? null : String(square);
    },
    cellOf: (name) => {
      const square = Number(name);
      if (!Number.isInteger(square) || square < 1 || square > SQUARE_COUNT || String(square) !== name) {
        throw new Error(`Case inconnue : ${name}`);
      }
      return flipped ? { row: LAST - rowOf(square), col: LAST - colOf(square) } : { row: rowOf(square), col: colOf(square) };
    },
    isDark: ({ row, col }) => (row + col) % 2 === 1,
    numbered: true,
  };
}
