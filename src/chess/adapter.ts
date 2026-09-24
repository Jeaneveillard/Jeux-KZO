import { Chess, validateFen, type Square } from 'chess.js';
import { opposite, type Color, type GameAdapter, type GameStatus } from '../core/types';
import type { ChessMove, ChessPiece, ChessPos, MoveInfo, PromotionPiece } from './types';

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export interface ParseOptions {
  /** Autorise les positions sans roi (exercices des leçons). */
  readonly allowMissingKings?: boolean;
}

const UCI_PATTERN = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/;

// chess.js est mutable : on crée un objet neuf pour chaque opération.
function load(fen: string): Chess {
  return new Chess(fen, { skipValidation: true });
}

function colorOf(code: 'w' | 'b'): Color {
  return code === 'w' ? 'white' : 'black';
}

function codeOf(color: Color): 'w' | 'b' {
  return color === 'white' ? 'w' : 'b';
}

/** Les 4 premiers champs du FEN identifient une position pour la répétition. */
export function positionKey(fen: string): string {
  return fen.split(' ').slice(0, 4).join(' ');
}

export function parseChess(fen: string, options: ParseOptions = {}): ChessPos {
  const check = validateFen(fen);
  const onlyKingProblem = !check.ok && /king/i.test(check.error ?? '');
  if (!check.ok && !(options.allowMissingKings === true && onlyKingProblem)) {
    throw new Error(`Position invalide : ${check.error ?? 'inconnue'}`);
  }
  const normalized = load(fen).fen();
  return { fen: normalized, keys: [positionKey(normalized)] };
}

export function toUci(move: ChessMove): string {
  return `${move.from}${move.to}${move.promotion ?? ''}`;
}

export function fromUci(uci: string): ChessMove {
  const match = UCI_PATTERN.exec(uci);
  if (!match) {
    throw new Error(`Coup UCI invalide : ${uci}`);
  }
  const [, from, to, promotion] = match;
  return promotion ? { from, to, promotion: promotion as PromotionPiece } : { from, to };
}

export function legalMoves(pos: ChessPos): ChessMove[] {
  return load(pos.fen).moves({ verbose: true }).map((move) => fromUci(move.lan));
}

export function play(pos: ChessPos, move: ChessMove): ChessPos {
  const board = load(pos.fen);
  try {
    board.move({ from: move.from, to: move.to, promotion: move.promotion });
  } catch {
    throw new Error(`Coup illégal : ${toUci(move)}`);
  }
  const fen = board.fen();
  return { fen, keys: [...pos.keys, positionKey(fen)] };
}

export function turnOf(pos: ChessPos): Color {
  return pos.fen.split(' ')[1] === 'b' ? 'black' : 'white';
}

export function status(pos: ChessPos): GameStatus {
  const board = load(pos.fen);
  const toMove = colorOf(board.turn());
  if (board.isCheckmate()) return { kind: 'win', winner: opposite(toMove), reason: 'checkmate' };
  if (board.isStalemate()) return { kind: 'draw', reason: 'stalemate' };
  if (board.isInsufficientMaterial()) return { kind: 'draw', reason: 'insufficient-material' };
  const current = pos.keys[pos.keys.length - 1];
  if (pos.keys.filter((key) => key === current).length >= 3) return { kind: 'draw', reason: 'repetition' };
  if (board.isDrawByFiftyMoves()) return { kind: 'draw', reason: 'fifty-moves' };
  return { kind: 'ongoing' };
}

export function listPieces(pos: ChessPos): ChessPiece[] {
  return load(pos.fen)
    .board()
    .flat()
    .flatMap((cell) => (cell ? [{ square: cell.square, color: colorOf(cell.color), type: cell.type }] : []));
}

export function pieceOn(pos: ChessPos, square: string): ChessPiece | null {
  const piece = load(pos.fen).get(square as Square);
  return piece ? { square, color: colorOf(piece.color), type: piece.type } : null;
}

export function checkedKingSquare(pos: ChessPos): string | null {
  const board = load(pos.fen);
  if (!board.inCheck()) return null;
  const [king] = board.findPiece({ type: 'k', color: board.turn() });
  return king ?? null;
}

/** Donne le trait à `color` (exercices où le joueur enchaîne plusieurs coups). */
export function setTurn(pos: ChessPos, color: Color): ChessPos {
  const fields = pos.fen.split(' ');
  const fen = [fields[0], codeOf(color), fields[2], '-', ...fields.slice(4)].join(' ');
  return { fen, keys: [positionKey(fen)] };
}

export function isAttacked(pos: ChessPos, square: string, by: Color): boolean {
  return load(pos.fen).isAttacked(square as Square, codeOf(by));
}

export function attackersOf(pos: ChessPos, square: string, by: Color): string[] {
  return load(pos.fen).attackers(square as Square, codeOf(by));
}

export function moveInfo(pos: ChessPos, move: ChessMove): MoveInfo {
  const board = load(pos.fen);
  try {
    const played = board.move({ from: move.from, to: move.to, promotion: move.promotion });
    return { piece: played.piece, captured: played.captured, san: played.san, givesCheck: board.inCheck() };
  } catch {
    throw new Error(`Coup illégal : ${toUci(move)}`);
  }
}

export const chessAdapter: GameAdapter<ChessPos, ChessMove> = {
  id: 'chess',
  initial: () => parseChess(START_FEN),
  parse: (text) => parseChess(text),
  serialize: (pos) => pos.fen,
  turn: turnOf,
  legalMoves,
  play,
  status,
};

export const chessMoveCodec = { encode: toUci, decode: fromUci } as const;
