import { legalMoves, listPieces, play, toUci, turnOf } from '../adapter';
import type { ChessPos } from '../types';
import type { UciInfo } from './uci';

export const FAIBLE_RANDOM_RATE = 0.1;
export const FAIBLE_BEST_RATE = 0.5;

/** Coups légaux (UCI) après lesquels l'adversaire ne peut pas prendre notre dame tout de suite. */
export function movesKeepingQueen(pos: ChessPos): string[] {
  const me = turnOf(pos);
  return legalMoves(pos)
    .filter((move) => {
      const after = play(pos, move);
      const queens = new Set(listPieces(after).filter((p) => p.color === me && p.type === 'q').map((p) => p.square));
      return !legalMoves(after).some((reply) => queens.has(reply.to));
    })
    .map(toUci);
}

/**
 * ~10 % : coup au hasard parmi `safePool` ; ~50 % : meilleur coup ; sinon une des variantes suivantes.
 * `lines` est triée (variante 1 = la meilleure).
 */
export function pickFaibleMove(lines: readonly UciInfo[], safePool: readonly string[], rng: () => number): string | null {
  const candidates = lines.flatMap((line) => (line.pv[0] ? [line.pv[0]] : []));
  const roll = rng();
  if (roll < FAIBLE_RANDOM_RATE && safePool.length > 0) {
    return safePool[Math.floor(rng() * safePool.length)];
  }
  if (candidates.length === 0) return null;
  if (roll < FAIBLE_RANDOM_RATE + FAIBLE_BEST_RATE || candidates.length === 1) return candidates[0];
  return candidates[1 + Math.floor(rng() * (candidates.length - 1))];
}
