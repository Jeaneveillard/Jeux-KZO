export interface MoveShape {
  readonly from: string;
  readonly to: string;
}

export interface InputState {
  readonly selected: string | null;
}

export const EMPTY_INPUT: InputState = { selected: null };

export interface InputResult<M extends MoveShape> {
  readonly state: InputState;
  readonly move: M | null;
  /** Plusieurs coups possibles pour le même trajet (promotion) : il faut choisir. */
  readonly choices: readonly M[] | null;
}

export function targetsOf<M extends MoveShape>(selected: string | null, legal: readonly M[]): string[] {
  if (!selected) return [];
  return [...new Set(legal.filter((move) => move.from === selected).map((move) => move.to))];
}

export function tapSquare<M extends MoveShape>(state: InputState, square: string, legal: readonly M[]): InputResult<M> {
  if (state.selected) {
    const candidates = legal.filter((move) => move.from === state.selected && move.to === square);
    if (candidates.length === 1) return { state: EMPTY_INPUT, move: candidates[0], choices: null };
    if (candidates.length > 1) return { state, move: null, choices: candidates };
    if (square === state.selected) return { state: EMPTY_INPUT, move: null, choices: null };
  }
  const movable = legal.some((move) => move.from === square);
  return { state: movable ? { selected: square } : EMPTY_INPUT, move: null, choices: null };
}

export function dropPiece<M extends MoveShape>(from: string, to: string, legal: readonly M[]): InputResult<M> {
  const result = tapSquare({ selected: from }, to, legal);
  return result.move || result.choices ? result : { state: EMPTY_INPUT, move: null, choices: null };
}
