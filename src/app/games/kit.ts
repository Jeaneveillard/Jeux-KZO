import type { ComponentType } from 'preact';
import type { BoardPiece } from '../../board/Board';
import type { BoardGeometry } from '../../board/geometry';
import type { MoveShape } from '../../board/move-input';
import type { ResultText } from '../../core/explain';
import type { BlunderVerdict } from '../../core/help';
import type { Color, Engine, Evaluation, GameStatus } from '../../core/types';
import type { Lesson, LessonRules } from '../../lessons/types';
import type { SavedGameSpec } from '../game/saved';

export interface PieceIcon {
  readonly image: string;
  readonly label: string;
}

/** Choix entre plusieurs coups de même trajet (promotion aux échecs, rafles aux dames). */
export interface ChoicePickerProps<Move> {
  readonly color: Color;
  readonly choices: readonly Move[];
  readonly onPick: (move: Move) => void;
  readonly onCancel: () => void;
}

export type MoveSound = 'move' | 'capture' | 'check';

/** Aide du niveau Faible. */
export interface GameHelp<Pos, Move> {
  readonly hintDepth: number;
  readonly blunderDepth: number;
  hintText(pos: Pos, move: Move): string;
  detectBlunder(pos: Pos, move: Move, before: Evaluation, afterForOpponent: Evaluation): BlunderVerdict;
}

/** Tout ce que l'app doit savoir d'un jeu : les écrans communs ne dépendent que de ceci. */
export interface GameKit<Pos, Move extends MoveShape> extends SavedGameSpec<Pos, Move> {
  readonly title: string;
  readonly progressKey: string;
  readonly lessons: readonly Lesson[];
  readonly lessonRules: LessonRules<Pos, Move>;
  readonly help: GameHelp<Pos, Move>;
  engine(): Engine<Pos, Move>;
  geometry(orientation: Color): BoardGeometry;
  boardPieces(pos: Pos): BoardPiece[];
  /** Pièces perdues par chaque camp. */
  capturedPieces(pos: Pos): Readonly<Record<Color, readonly PieceIcon[]>>;
  /** Case du roi en échec ; toujours null pour un jeu sans échec. */
  checkSquare(pos: Pos): string | null;
  moveSound(pos: Pos, move: Move): MoveSound;
  explainResult(status: GameStatus, viewer: Color | null): ResultText;
  readonly ChoicePicker: ComponentType<ChoicePickerProps<Move>>;
}
