import { opposite, type Color, type GameAdapter, type GameStatus, type Level } from '../../core/types';

export type GameMode = 'ai' | 'local';

export interface GameSetup {
  readonly game: 'chess';
  readonly mode: GameMode;
  /** null en mode 2 joueurs. */
  readonly level: Level | null;
  /** Couleur du joueur humain contre l'ordinateur (ignorée en mode 2 joueurs). */
  readonly playerColor: Color;
}

/** Partie immuable : positions[0] est la position de départ, positions[i + 1] suit moves[i]. */
export interface Session<Pos, Move> {
  readonly setup: GameSetup;
  readonly positions: readonly Pos[];
  readonly moves: readonly Move[];
  readonly result: GameStatus;
}

export function createSession<Pos, Move>(adapter: GameAdapter<Pos, Move>, setup: GameSetup, start: Pos): Session<Pos, Move> {
  return { setup, positions: [start], moves: [], result: adapter.status(start) };
}

export function currentPosition<Pos, Move>(session: Session<Pos, Move>): Pos {
  return session.positions[session.positions.length - 1];
}

export function lastMove<Pos, Move>(session: Session<Pos, Move>): Move | null {
  return session.moves.length > 0 ? session.moves[session.moves.length - 1] : null;
}

export function applyMove<Pos, Move>(adapter: GameAdapter<Pos, Move>, session: Session<Pos, Move>, move: Move): Session<Pos, Move> {
  if (session.result.kind !== 'ongoing') throw new Error('La partie est terminée.');
  const next = adapter.play(currentPosition(session), move);
  return {
    ...session,
    positions: [...session.positions, next],
    moves: [...session.moves, move],
    result: adapter.status(next),
  };
}

export function resign<Pos, Move>(session: Session<Pos, Move>, loser: Color): Session<Pos, Move> {
  if (session.result.kind !== 'ongoing') return session;
  return { ...session, result: { kind: 'win', winner: opposite(loser), reason: 'resign' } };
}

export function isHumanTurn<Pos, Move>(adapter: GameAdapter<Pos, Move>, session: Session<Pos, Move>): boolean {
  return session.setup.mode === 'local' || adapter.turn(currentPosition(session)) === session.setup.playerColor;
}

function lastHumanMoveIndex<Pos, Move>(adapter: GameAdapter<Pos, Move>, session: Session<Pos, Move>): number {
  for (let index = session.moves.length - 1; index >= 0; index -= 1) {
    if (adapter.turn(session.positions[index]) === session.setup.playerColor) return index;
  }
  return -1;
}

export function canUndo<Pos, Move>(adapter: GameAdapter<Pos, Move>, session: Session<Pos, Move>): boolean {
  const resigned = session.result.kind === 'win' && session.result.reason === 'resign';
  return session.setup.mode === 'ai' && session.setup.level === 'faible' && !resigned && lastHumanMoveIndex(adapter, session) >= 0;
}

/** Revient juste avant le dernier coup du joueur (retire aussi la réponse de l'ordinateur). */
export function undoLastHumanMove<Pos, Move>(adapter: GameAdapter<Pos, Move>, session: Session<Pos, Move>): Session<Pos, Move> {
  const index = lastHumanMoveIndex(adapter, session);
  if (index < 0) return session;
  const positions = session.positions.slice(0, index + 1);
  return { ...session, positions, moves: session.moves.slice(0, index), result: adapter.status(positions[index]) };
}
