import type { LessonRules } from '../lessons/types';
import { legalMoves, parseChess, play, setTurn, status, toUci, turnOf } from './adapter';
import type { ChessMove, ChessPos } from './types';

export const chessLessonRules: LessonRules<ChessPos, ChessMove> = {
  parse: (position) => parseChess(position, { allowMissingKings: true }),
  legalMoves,
  play,
  keepTurn: setTurn,
  turn: turnOf,
  status,
  moveId: toUci,
  destination: (move) => move.to,
  isPromotion: (move) => move.promotion !== undefined,
};
