import type { Color } from '../core/types';

export interface Cell {
  readonly row: number;
  readonly col: number;
}

/** Correspondance entre cases logiques (« e4 », « 32 ») et cellules affichées (ligne 0 = haut). */
export interface BoardGeometry {
  readonly size: number;
  squareAt(cell: Cell): string | null;
  cellOf(square: string): Cell;
  isDark(cell: Cell): boolean;
  /** Affiche le nom de chaque case jouable (numéros des dames). */
  readonly numbered?: boolean;
  readonly edgeLabels?: {
    bottom(col: number): string;
    left(row: number): string;
  };
}

const FILES = 'abcdefgh';

export function chessGeometry(orientation: Color): BoardGeometry {
  const flipped = orientation === 'black';
  return {
    size: 8,
    squareAt: ({ row, col }) => {
      if (row < 0 || row > 7 || col < 0 || col > 7) return null;
      const file = flipped ? 7 - col : col;
      const rank = flipped ? row + 1 : 8 - row;
      return `${FILES[file]}${rank}`;
    },
    cellOf: (square) => {
      const file = FILES.indexOf(square[0] ?? '');
      const rank = Number(square.slice(1));
      if (square.length !== 2 || file < 0 || !(rank >= 1 && rank <= 8)) {
        throw new Error(`Case inconnue : ${square}`);
      }
      return flipped ? { row: rank - 1, col: 7 - file } : { row: 8 - rank, col: file };
    },
    isDark: ({ row, col }) => (row + col) % 2 === 1,
    edgeLabels: {
      bottom: (col) => FILES[flipped ? 7 - col : col],
      left: (row) => String(flipped ? row + 1 : 8 - row),
    },
  };
}

export interface RectLike {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** Cellule sous un point écran, ou null si le point est hors du plateau. */
export function pointToCell(x: number, y: number, rect: RectLike, size: number): Cell | null {
  if (rect.width <= 0 || rect.height <= 0) return null;
  const col = Math.floor(((x - rect.left) / rect.width) * size);
  const row = Math.floor(((y - rect.top) / rect.height) * size);
  if (row < 0 || row >= size || col < 0 || col >= size) return null;
  return { row, col };
}
