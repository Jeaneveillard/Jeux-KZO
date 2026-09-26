import { isOneOf, isRecord } from '../../core/guards';
import { GAME_IDS, LEVELS_ORDER, type GameAdapter } from '../../core/types';
import { applyMove, createSession, currentPosition, type GameSetup, type Session } from './session';

export interface MoveCodec<Pos, Move> {
  encode(move: Move): string;
  /** `pos` : position où le coup est joué (les dames en ont besoin pour retrouver les pièces prises). */
  decode(text: string, pos: Pos): Move;
}

export interface GameRecord {
  readonly setup: GameSetup;
  readonly start: string;
  readonly moves: readonly string[];
}

export function toRecord<Pos, Move>(adapter: GameAdapter<Pos, Move>, codec: MoveCodec<Pos, Move>, session: Session<Pos, Move>): GameRecord {
  return { setup: session.setup, start: adapter.serialize(session.positions[0]), moves: session.moves.map((m) => codec.encode(m)) };
}

export function validateSetup(value: unknown): GameSetup | null {
  if (!isRecord(value)) return null;
  const { game, mode, level, playerColor } = value;
  if (!isOneOf(game, GAME_IDS) || !isOneOf(mode, ['ai', 'local'] as const) || !isOneOf(playerColor, ['white', 'black'] as const)) return null;
  const validLevel = level === null ? null : isOneOf(level, LEVELS_ORDER) ? level : undefined;
  if (validLevel === undefined) return null;
  return { game, mode, level: validLevel, playerColor };
}

export function validateRecord(value: unknown): GameRecord | null {
  if (!isRecord(value) || typeof value.start !== 'string' || !Array.isArray(value.moves)) return null;
  const setup = validateSetup(value.setup);
  const moves: unknown[] = value.moves;
  if (!setup || !moves.every((move): move is string => typeof move === 'string')) return null;
  return { setup, start: value.start, moves: [...moves] };
}

/** Rejoue la partie coup par coup ; lève une erreur si un coup est illégal. */
export function restoreSession<Pos, Move>(adapter: GameAdapter<Pos, Move>, codec: MoveCodec<Pos, Move>, record: GameRecord): Session<Pos, Move> {
  return record.moves.reduce(
    (session, text) => applyMove(adapter, session, codec.decode(text, currentPosition(session))),
    createSession(adapter, record.setup, adapter.parse(record.start)),
  );
}
