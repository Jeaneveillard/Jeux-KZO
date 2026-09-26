import type { Cells, Side } from '../movegen';
import { RAYS, colOf, rowOf, squareAt } from '../squares';

export const MAN_VALUE = 100;
export const KING_VALUE = 320;

const CENTER: ReadonlySet<number> = new Set([22, 23, 24, 27, 28, 29]);
/** Cases du bord arrière qui empêchent l'adversaire d'aller à dame. */
const WHITE_GUARDS: ReadonlySet<number> = new Set([47, 48, 49]);
const BLACK_GUARDS: ReadonlySet<number> = new Set([2, 3, 4]);
const ADVANCE_BONUS = 3;
const CENTER_BONUS = 6;
const GUARD_BONUS = 8;
const SUPPORT_BONUS = 3;
const BLOCKED_PENALTY = 4;
const RUNAWAY_BONUS = 30;
const KING_MOBILITY_BONUS = 2;
const KING_MOBILITY_CAP = 15;

/** Aucune pièce adverse ne peut atteindre les cases entre le pion et la dernière rangée. */
function isRunaway(cells: Cells, square: number, color: Side, distance: number): boolean {
  const row = rowOf(square);
  const col = colOf(square);
  const step = color === 1 ? -1 : 1;
  for (let k = 1; k <= distance; k += 1) {
    for (let c = col - k; c <= col + k; c += 1) {
      const target = squareAt(row + step * k, c);
      if (target !== null && cells[target] * color < 0) return false;
    }
  }
  return true;
}

function manBonus(cells: Cells, square: number, color: Side, opponentMen: number, opponentKings: number): number {
  const advance = color === 1 ? 9 - rowOf(square) : rowOf(square);
  let bonus = advance * ADVANCE_BONUS;
  if (CENTER.has(square)) bonus += CENTER_BONUS;
  if (opponentMen > 0 && (color === 1 ? WHITE_GUARDS : BLACK_GUARDS).has(square)) bonus += GUARD_BONUS;
  const [back1, back2, ahead1, ahead2] = color === 1 ? [2, 3, 0, 1] : [0, 1, 2, 3];
  for (const direction of [back1, back2]) {
    const behind = RAYS[square][direction][0];
    if (behind !== undefined && cells[behind] === color) bonus += SUPPORT_BONUS;
  }
  const blocked = [ahead1, ahead2].every((direction) => {
    const next = RAYS[square][direction][0];
    return next === undefined || cells[next] !== 0;
  });
  if (blocked) bonus -= BLOCKED_PENALTY;
  const distance = 9 - advance;
  if (distance <= 3 && opponentKings === 0 && isRunaway(cells, square, color, distance)) bonus += (4 - distance) * RUNAWAY_BONUS;
  return bonus;
}

function kingMobility(cells: Cells, square: number): number {
  let free = 0;
  for (const ray of RAYS[square]) {
    for (const next of ray) {
      if (cells[next] !== 0) break;
      free += 1;
    }
  }
  return Math.min(free, KING_MOBILITY_CAP) * KING_MOBILITY_BONUS;
}

/** Note de la position du point de vue de `side` (pion = 100). */
export function evaluate(cells: Cells, side: Side): number {
  let whiteMen = 0;
  let whiteKings = 0;
  let blackMen = 0;
  let blackKings = 0;
  for (let square = 1; square <= 50; square += 1) {
    const piece = cells[square];
    if (piece === 1) whiteMen += 1;
    else if (piece === 2) whiteKings += 1;
    else if (piece === -1) blackMen += 1;
    else if (piece === -2) blackKings += 1;
  }
  let score = (whiteMen - blackMen) * MAN_VALUE + (whiteKings - blackKings) * KING_VALUE;
  for (let square = 1; square <= 50; square += 1) {
    const piece = cells[square];
    if (piece === 0) continue;
    const color: Side = piece > 0 ? 1 : -1;
    if (piece === 2 || piece === -2) {
      score += color * kingMobility(cells, square);
      continue;
    }
    const opponentMen = color === 1 ? blackMen : whiteMen;
    const opponentKings = color === 1 ? blackKings : whiteKings;
    score += color * manBonus(cells, square, color, opponentMen, opponentKings);
  }
  return side === 1 ? score : -score;
}
