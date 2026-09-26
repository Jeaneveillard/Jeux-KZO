import { opposite, type Color, type GameAdapter, type GameStatus } from '../core/types';
import type { LessonRules } from '../lessons/types';
import { applyRawMove, destination, fromCells, generateMoves, promotes, rawMoveId, toCells, type Cells, type RawMove, type Side } from './movegen';
import { START_FEN, parseFen, toFen } from './notation';
import type { DraughtsMove, DraughtsPos } from './types';

/** 25 coups de chaque camp. */
const KING_MOVES_LIMIT = 50;

function sideOf(color: Color): Side {
  return color === 'white' ? 1 : -1;
}

function positionKey(board: string, turn: Color): string {
  return `${board}${turn === 'white' ? 'w' : 'b'}`;
}

function countOf(board: string, char: string): number {
  return [...board].filter((cell) => cell === char).length;
}

/**
 * Fins de partie limitées (FMJD) contre une dame seule : 16 coups pour 3 dames, 2 dames + 1 pion ou 1 dame + 2 pions ;
 * 5 coups pour 2 dames, 1 dame + 1 pion ou 1 dame.
 */
export function endgameRule(board: string): 16 | 5 | null {
  const whiteMen = countOf(board, 'w');
  const whiteKings = countOf(board, 'W');
  const blackMen = countOf(board, 'b');
  const blackKings = countOf(board, 'B');
  const strong =
    blackMen === 0 && blackKings === 1
      ? { kings: whiteKings, men: whiteMen }
      : whiteMen === 0 && whiteKings === 1
        ? { kings: blackKings, men: blackMen }
        : null;
  if (!strong || strong.kings === 0) return null;
  const total = strong.kings + strong.men;
  if (total === 3) return 16;
  if (total <= 2) return 5;
  return null;
}

function startPosition(board: string, turn: Color): DraughtsPos {
  const rule = endgameRule(board);
  return { board, turn, keys: [positionKey(board, turn)], kingPlies: 0, endgame: rule === null ? null : { rule, plies: 0 } };
}

export function parseDraughts(text: string): DraughtsPos {
  const { board, turn } = parseFen(text);
  return startPosition(board, turn);
}

function toMove(cells: Cells, raw: RawMove): DraughtsMove {
  const to = destination(raw);
  return {
    from: String(raw.from),
    to: String(to),
    steps: raw.steps.map(String),
    captures: raw.captures.map(String),
    promotes: promotes(cells[raw.from], to),
  };
}

/** « 32-28 » pour un déplacement, « 28x19x10 » pour une prise (départ puis cases d'arrivée). */
export function draughtsMoveId(move: DraughtsMove): string {
  return move.captures.length > 0 ? [move.from, ...move.steps].join('x') : `${move.from}-${move.to}`;
}

export function legalMoves(pos: DraughtsPos): DraughtsMove[] {
  const cells = toCells(pos.board);
  return generateMoves(cells, sideOf(pos.turn)).map((raw) => toMove(cells, raw));
}

export function play(pos: DraughtsPos, move: DraughtsMove): DraughtsPos {
  const cells = toCells(pos.board);
  const id = draughtsMoveId(move);
  const raw = generateMoves(cells, sideOf(pos.turn)).find((candidate) => rawMoveId(candidate) === id);
  if (!raw) throw new Error(`Coup illégal : ${id}`);
  const piece = cells[raw.from];
  const irreversible = raw.captures.length > 0 || piece === 1 || piece === -1;
  applyRawMove(cells, raw);
  const board = fromCells(cells);
  const turn = opposite(pos.turn);
  const key = positionKey(board, turn);
  const rule = endgameRule(board);
  return {
    board,
    turn,
    keys: irreversible ? [key] : [...pos.keys, key],
    kingPlies: irreversible ? 0 : pos.kingPlies + 1,
    // Le compte repart de zéro dès que la configuration change : autre règle, ou pièce prise.
    endgame: rule === null ? null : { rule, plies: raw.captures.length === 0 && pos.endgame?.rule === rule ? pos.endgame.plies + 1 : 0 },
  };
}

export function status(pos: DraughtsPos): GameStatus {
  if (generateMoves(toCells(pos.board), sideOf(pos.turn)).length === 0) {
    return { kind: 'win', winner: opposite(pos.turn), reason: 'no-moves' };
  }
  const current = pos.keys[pos.keys.length - 1];
  if (pos.keys.filter((key) => key === current).length >= 3) return { kind: 'draw', reason: 'repetition' };
  if (pos.kingPlies >= KING_MOVES_LIMIT) return { kind: 'draw', reason: 'king-moves' };
  if (pos.endgame && pos.endgame.plies >= pos.endgame.rule * 2) return { kind: 'draw', reason: 'endgame-limit' };
  return { kind: 'ongoing' };
}

/** Donne le trait à `color` (exercices où le joueur enchaîne plusieurs coups). */
export function setTurn(pos: DraughtsPos, color: Color): DraughtsPos {
  return { ...pos, turn: color, keys: [positionKey(pos.board, color)] };
}

export function decodeDraughtsMove(text: string, pos: DraughtsPos): DraughtsMove {
  const move = legalMoves(pos).find((candidate) => draughtsMoveId(candidate) === text);
  if (!move) throw new Error(`Coup illégal : ${text}`);
  return move;
}

export const draughtsAdapter: GameAdapter<DraughtsPos, DraughtsMove> = {
  id: 'draughts',
  initial: () => parseDraughts(START_FEN),
  parse: parseDraughts,
  serialize: (pos) => toFen(pos.board, pos.turn),
  turn: (pos) => pos.turn,
  legalMoves,
  play,
  status,
};

export const draughtsMoveCodec = { encode: draughtsMoveId, decode: decodeDraughtsMove } as const;

export const draughtsLessonRules: LessonRules<DraughtsPos, DraughtsMove> = {
  parse: parseDraughts,
  legalMoves,
  play,
  keepTurn: setTurn,
  turn: (pos) => pos.turn,
  status,
  moveId: draughtsMoveId,
  destination: (move) => move.to,
  isPromotion: (move) => move.promotes,
};
