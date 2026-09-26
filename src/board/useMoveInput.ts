import { useState } from 'preact/hooks';
import { EMPTY_INPUT, dropPiece, tapSquare, type InputResult, type InputState, type MoveShape } from './move-input';

export interface MoveInput<Move> {
  readonly input: InputState;
  /** Plusieurs coups pour le même trajet (promotion, rafles) : il faut choisir. */
  readonly choices: readonly Move[] | null;
  tap(square: string): void;
  drop(from: string, to: string): void;
  choose(move: Move): void;
  cancelChoice(): void;
}

/** Saisie d'un coup au toucher ou au glisser ; `onMove` reçoit le coup choisi. */
export function useMoveInput<Move extends MoveShape>(legal: readonly Move[], onMove: (move: Move) => void): MoveInput<Move> {
  const [input, setInput] = useState<InputState>(EMPTY_INPUT);
  const [choices, setChoices] = useState<readonly Move[] | null>(null);

  const handle = (result: InputResult<Move>) => {
    if (result.choices) {
      setInput(result.state);
      setChoices(result.choices);
      return;
    }
    setInput(result.move ? EMPTY_INPUT : result.state);
    if (result.move) onMove(result.move);
  };

  return {
    input,
    choices,
    tap: (square) => {
      if (choices === null) handle(tapSquare(input, square, legal));
    },
    drop: (from, to) => {
      if (choices === null) handle(dropPiece(from, to, legal));
    },
    choose: (move) => {
      setChoices(null);
      setInput(EMPTY_INPUT);
      onMove(move);
    },
    cancelChoice: () => {
      setChoices(null);
      setInput(EMPTY_INPUT);
    },
  };
}
