import { RAYS, SQUARE_COUNT, isForward, promotionRow, rowOf } from './squares';

/** Cases 1 à 50 (index 0 inutilisé) : 0 vide, 1 pion blanc, 2 dame blanche, -1 pion noir, -2 dame noire. */
export type Cells = Int8Array;
/** 1 : Blancs ; -1 : Noirs. */
export type Side = 1 | -1;

export interface RawMove {
  readonly from: number;
  /** Cases d'arrivée successives ; la dernière est la destination. */
  readonly steps: readonly number[];
  readonly captures: readonly number[];
}

const CODES: ReadonlyMap<string, number> = new Map([
  ['.', 0],
  ['w', 1],
  ['W', 2],
  ['b', -1],
  ['B', -2],
]);
const CHARS = 'Bb.wW';

export function toCells(board: string): Cells {
  if (board.length !== SQUARE_COUNT) throw new Error(`Plateau invalide : ${board}`);
  const cells = new Int8Array(SQUARE_COUNT + 1);
  for (let square = 1; square <= SQUARE_COUNT; square += 1) {
    const code = CODES.get(board[square - 1]);
    if (code === undefined) throw new Error(`Plateau invalide : ${board}`);
    cells[square] = code;
  }
  return cells;
}

export function fromCells(cells: Cells): string {
  let board = '';
  for (let square = 1; square <= SQUARE_COUNT; square += 1) board += CHARS[cells[square] + 2];
  return board;
}

export function destination(move: RawMove): number {
  return move.steps[move.steps.length - 1];
}

/** « 32-28 » pour un déplacement, « 28x19x10 » (départ puis cases d'arrivée) pour une prise. */
export function rawMoveId(move: RawMove): string {
  return move.captures.length > 0 ? [move.from, ...move.steps].join('x') : `${move.from}-${destination(move)}`;
}

/** Un pion qui termine son coup sur la dernière rangée devient dame. */
export function promotes(piece: number, to: number): boolean {
  return (piece === 1 || piece === -1) && rowOf(to) === promotionRow(piece > 0 ? 1 : -1);
}

/** Ajoute à `out` toutes les rafles complètes de la pièce en `from`. */
function captureSequences(cells: Cells, from: number, side: Side, out: RawMove[]): void {
  const piece = cells[from];
  const king = piece === 2 * side;
  const captured: number[] = [];
  const steps: number[] = [];

  const explore = (square: number): void => {
    let extended = false;
    for (let direction = 0; direction < 4; direction += 1) {
      const ray = RAYS[square][direction];
      let index = 0;
      if (king) while (index < ray.length && cells[ray[index]] === 0) index += 1;
      if (index >= ray.length - 1) continue;
      const victim = ray[index];
      if (cells[victim] * side >= 0 || captured.includes(victim)) continue;
      for (let landing = index + 1; landing < ray.length && cells[ray[landing]] === 0; landing += 1) {
        captured.push(victim);
        steps.push(ray[landing]);
        extended = true;
        explore(ray[landing]);
        captured.pop();
        steps.pop();
        if (!king) break;
      }
    }
    if (!extended && captured.length > 0) out.push({ from, steps: [...steps], captures: [...captured] });
  };

  // La pièce quitte sa case : elle peut y repasser, voire y revenir, pendant la rafle.
  cells[from] = 0;
  explore(from);
  cells[from] = piece;
}

/** Deux rafles de même départ, même arrivée et mêmes pièces prises sont un seul coup. */
function dedupe(moves: readonly RawMove[]): RawMove[] {
  const seen = new Set<string>();
  return moves.filter((move) => {
    const key = `${move.from}>${destination(move)}:${[...move.captures].sort((a, b) => a - b).join(',')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Coups légaux du camp `side` : prise obligatoire et prise du plus grand nombre de pièces. */
export function generateMoves(cells: Cells, side: Side): RawMove[] {
  const captures: RawMove[] = [];
  for (let square = 1; square <= SQUARE_COUNT; square += 1) {
    if (cells[square] * side > 0) captureSequences(cells, square, side, captures);
  }
  if (captures.length > 0) {
    const most = captures.reduce((best, move) => Math.max(best, move.captures.length), 0);
    return dedupe(captures.filter((move) => move.captures.length === most));
  }
  const moves: RawMove[] = [];
  for (let square = 1; square <= SQUARE_COUNT; square += 1) {
    const piece = cells[square];
    if (piece * side <= 0) continue;
    const king = piece === 2 * side;
    for (let direction = 0; direction < 4; direction += 1) {
      if (!king && !isForward(direction, side)) continue;
      for (const target of RAYS[square][direction]) {
        if (cells[target] !== 0) break;
        moves.push({ from: square, steps: [target], captures: [] });
        if (!king) break;
      }
    }
  }
  return moves;
}

/** Joue le coup sur `cells` : pièces prises retirées à la fin, promotion seulement en fin de coup. */
export function applyRawMove(cells: Cells, move: RawMove): void {
  const piece = cells[move.from];
  cells[move.from] = 0;
  for (const square of move.captures) cells[square] = 0;
  const to = destination(move);
  cells[to] = promotes(piece, to) ? piece * 2 : piece;
}
