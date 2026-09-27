import { useMemo } from 'preact/hooks';
import { Board } from '../../board/Board';
import { targetsOf, type InputState, type MoveShape } from '../../board/move-input';
import { opposite, type Color } from '../../core/types';
import type { GameKit } from '../games/kit';
import { CapturedRow } from './CapturedRow';

interface BoardViewProps<Pos, Move extends MoveShape> {
  readonly kit: GameKit<Pos, Move>;
  readonly position: Pos;
  /** Couleur affichée en bas du plateau. */
  readonly bottom: Color;
  readonly legal: readonly Move[];
  readonly input: InputState;
  readonly last: Move | null;
  readonly arrow?: Move | null;
  readonly choices: readonly Move[] | null;
  readonly onTap: (square: string) => void;
  readonly onDrop: (from: string, to: string) => void;
  readonly onChoose: (move: Move) => void;
  readonly onCancelChoice: () => void;
}

/** Plateau, pièces prises des deux camps et choix entre coups de même trajet : commun au jeu local et en ligne. */
export function BoardView<Pos, Move extends MoveShape>(props: BoardViewProps<Pos, Move>) {
  const { kit, position, bottom, legal, input, last, choices } = props;
  const geometry = useMemo(() => kit.geometry(bottom), [kit, bottom]);
  const captured = kit.capturedPieces(position);
  const ChoicePicker = kit.ChoicePicker;
  return (
    <>
      <CapturedRow color={bottom} pieces={captured[bottom]} />
      <div class="board-wrap">
        <Board
          geometry={geometry}
          pieces={kit.boardPieces(position)}
          selected={input.selected}
          targets={targetsOf(input.selected, legal)}
          highlights={last ? [last.from, last.to] : []}
          check={kit.checkSquare(position)}
          arrows={props.arrow ? [props.arrow] : []}
          animate={last}
          onSquareTap={props.onTap}
          onDrop={props.onDrop}
          canDrag={(square) => legal.some((move) => move.from === square)}
        />
      </div>
      <CapturedRow color={opposite(bottom)} pieces={captured[opposite(bottom)]} />
      {choices && <ChoicePicker color={kit.adapter.turn(position)} choices={choices} onPick={props.onChoose} onCancel={props.onCancelChoice} />}
    </>
  );
}
