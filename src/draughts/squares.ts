/** Plateau 10×10 : 50 cases foncées numérotées de 1 (en haut à gauche, côté Noirs) à 50 (en bas à droite). */
export const SQUARE_COUNT = 50;
export const BOARD_SIZE = 10;

/** Directions vues des Blancs : 0 haut-gauche, 1 haut-droite, 2 bas-gauche, 3 bas-droite. */
const DIRECTIONS: readonly (readonly [number, number])[] = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

export function rowOf(square: number): number {
  return Math.floor((square - 1) / 5);
}

export function colOf(square: number): number {
  return 2 * ((square - 1) % 5) + (rowOf(square) % 2 === 0 ? 1 : 0);
}

export function squareAt(row: number, col: number): number | null {
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE || (row + col) % 2 === 0) return null;
  return row * 5 + Math.floor(col / 2) + 1;
}

function ray(square: number, [dRow, dCol]: readonly [number, number]): number[] {
  const squares: number[] = [];
  let next = squareAt(rowOf(square) + dRow, colOf(square) + dCol);
  while (next !== null) {
    squares.push(next);
    next = squareAt(rowOf(next) + dRow, colOf(next) + dCol);
  }
  return squares;
}

/** RAYS[case][direction] : cases rencontrées en partant de la case dans cette direction (index 0 inutilisé). */
export const RAYS: readonly (readonly (readonly number[])[])[] = Array.from({ length: SQUARE_COUNT + 1 }, (_, square) =>
  square === 0 ? [] : DIRECTIONS.map((direction) => ray(square, direction)),
);

/** `side` : 1 pour les Blancs (ils montent), -1 pour les Noirs (ils descendent). */
export function isForward(direction: number, side: 1 | -1): boolean {
  return side === 1 ? direction < 2 : direction >= 2;
}

/** Rangée où un pion devient dame. */
export function promotionRow(side: 1 | -1): number {
  return side === 1 ? 0 : BOARD_SIZE - 1;
}
