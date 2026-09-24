export type Color = 'white' | 'black';
export type Level = 'faible' | 'moyen' | 'expert';
export const LEVELS_ORDER: readonly Level[] = ['faible', 'moyen', 'expert'];

export type WinReason = 'checkmate' | 'resign' | 'no-moves';
export type DrawReason = 'stalemate' | 'repetition' | 'fifty-moves' | 'insufficient-material';

export type GameStatus =
  | { readonly kind: 'ongoing' }
  | { readonly kind: 'win'; readonly winner: Color; readonly reason: WinReason }
  | { readonly kind: 'draw'; readonly reason: DrawReason };

export const ONGOING: GameStatus = { kind: 'ongoing' };

/** Règles d'un jeu. Les positions sont immuables : `play` renvoie toujours un nouvel objet. */
export interface GameAdapter<Pos, Move> {
  readonly id: 'chess' | 'draughts';
  initial(): Pos;
  parse(text: string): Pos;
  serialize(pos: Pos): string;
  turn(pos: Pos): Color;
  legalMoves(pos: Pos): Move[];
  play(pos: Pos, move: Move): Pos;
  status(pos: Pos): GameStatus;
}

/**
 * Évaluation du point de vue du camp au trait.
 * `mateIn` > 0 : le camp au trait mate en n coups ; < 0 : il est maté en n coups.
 */
export interface Evaluation {
  readonly scoreCp: number;
  readonly mateIn?: number;
}

export interface Engine<Pos, Move> {
  bestMove(pos: Pos, level: Level, signal: AbortSignal): Promise<Move>;
  analyse(pos: Pos, depth: number): Promise<{ readonly best: Move } & Evaluation>;
}

export function opposite(color: Color): Color {
  return color === 'white' ? 'black' : 'white';
}
